import { comparer, makeObservable, observable, reaction } from "mobx"
import { isAlive } from "mobx-state-tree"
import { ICase } from "./data-set-types"
import {
  getFormulaDependencies, formulaError, safeSymbolName, reverseDisplayNameMap
} from "./formula-utils"
import {
  DisplayNameMap, GLOBAL_VALUE, LOCAL_ATTR, CASE_INDEX_FAKE_ATTR_ID, CANONICAL_NAME, CaseList
} from "./formula-types"
import { IDataSet } from "./data-set"
import { IGlobalValueManager } from "../global/global-value-manager"
import { IFormula } from "./formula"
import { AttributeFormulaAdapter } from "./attribute-formula-adapter"
import { PlottedValueFormulaAdapter } from "./plotted-value-formula-adapter"
import {
  observeGlobalValues, observeLocalAttributes, observeLookupDependencies, observeSymbolNameChanges
} from "./formula-observers"

export interface IFormulaMetadata {
  formula: IFormula
  registeredDisplay: string
  isInitialized: boolean
  adapter: IFormulaManagerAdapter
  dispose?: () => void
}

// Note that specific formula adapters might extend this interface and provide more information.
// `dataSetId` is the required minimum, as each formula is always associated with a single data set that is considered
// to be the "local one" (e.g. any formula's symbol is resolved to an attribute of this data set).
export interface IFormulaExtraMetadata {
  dataSetId: string
  attributeId?: string
}

export interface IFormulaContext {
  formula: IFormula
  dataSet: IDataSet
}

export interface IFormulaAdapterApi {
  getDatasets: () => Map<string, IDataSet>
  getGlobalValueManager: () => IGlobalValueManager | undefined
  getFormulaContext(formulaId: string): IFormulaContext
  getFormulaExtraMetadata(formulaId: string): IFormulaExtraMetadata
}

export interface IFormulaManagerAdapter {
  type: string
  getAllFormulas: () => ({ formula: IFormula, extraMetadata?: any })[]
  recalculateFormula: (formulaContext: IFormulaContext, extraMetadata: any,
    casesToRecalculateDesc?: CaseList) => void
  setupFormulaObservers: (formulaContext: IFormulaContext, extraMetadata: any) => () => void
  getFormulaError: (formulaContext: IFormulaContext, extraMetadata: any) => undefined | string
  setFormulaError: (formulaContext: IFormulaContext, extraMetadata: any, errorMsg: string) => void
}

export class FormulaManager {
  formulaMetadata = new Map<string, IFormulaMetadata>()
  extraMetadata = new Map<string, IFormulaExtraMetadata>()

  @observable.shallow dataSets = new Map<string, IDataSet>()
  globalValueManager?: IGlobalValueManager

  adapters: IFormulaManagerAdapter[] = [
    new AttributeFormulaAdapter(this.getAdapterApi()),
    new PlottedValueFormulaAdapter(this.getAdapterApi())
  ]

  constructor() {
    makeObservable(this)
    this.registerAllFormulas()
  }

  getAdapterApi() {
    return {
      getDatasets: () => this.dataSets,
      getGlobalValueManager: () => this.globalValueManager,
      getFormulaContext: (formulaId: string) => this.getFormulaContext(formulaId),
      getFormulaExtraMetadata: (formulaId: string) => this.getExtraMetadata(formulaId)
    }
  }

  addDataSet(dataSet: IDataSet) {
    this.dataSets.set(dataSet.id, dataSet)
  }

  removeDataSet(dataSetId: string) {
    this.dataSets.delete(dataSetId)
  }

  addGlobalValueManager(globalValueManager: IGlobalValueManager) {
    this.globalValueManager = globalValueManager
  }

  getFormulaMetadata(formulaId: string) {
    const formulaMetadata = this.formulaMetadata.get(formulaId)
    if (!formulaMetadata) {
      throw new Error(`Formula ${formulaId} not registered`)
    }
    return formulaMetadata
  }

  updateFormulaMetadata(formulaId: string, metadata: Partial<IFormulaMetadata>) {
    const prevMetadata = this.getFormulaMetadata(formulaId)
    this.formulaMetadata.set(formulaId, { ...prevMetadata, ...metadata })
  }

  getExtraMetadata(formulaId: string) {
    const extraMetadata = this.extraMetadata.get(formulaId)
    if (!extraMetadata) {
      throw new Error(`Formula ${formulaId} not registered`)
    }
    return extraMetadata
  }

  // Retrieves formula context like its attribute, dataset, etc. It also validates correctness of the formula
  // and its context.
  getFormulaContext(formulaId: string) {
    const formulaMetadata = this.getFormulaMetadata(formulaId)
    const extraMetadata = this.getExtraMetadata(formulaId)
    const dataSet = this.dataSets.get(extraMetadata.dataSetId)
    if (!dataSet) {
      throw new Error(`Dataset ${extraMetadata.dataSetId} not available`)
    }
    return { dataSet, ...formulaMetadata }
  }

  recalculateFormula(formulaId: string, casesToRecalculate?: ICase[] | "ALL_CASES") {
    const formulaContext = this.getFormulaContext(formulaId)
    const { adapter, isInitialized } = formulaContext
    if (!isInitialized) {
      return
    }
    const extraMetadata = this.getExtraMetadata(formulaId)
    adapter.recalculateFormula(formulaContext, extraMetadata, casesToRecalculate)
  }

  getAllFormulas() {
    return this.adapters.flatMap(a => a.getAllFormulas())
  }

  registerAllFormulas() {
    reaction(() => {
      // Observe all the formulas
      const result: Record<string, string> = {}
      this.getAllFormulas().forEach(({ formula }) => {
        result[formula.id] = formula.display
      })
      return result
    }, () => {
      this.unregisterDeletedFormulas()
      // Register formulas. For simplicity, we unregister all formulas and register them again when canonical form is
      // updated. Note that even empty formulas are registered, so the metadata is always available when cycle detection
      // is executed.
      const updatedFormulas: string[] = []
      this.adapters.forEach(adapter => {
        adapter.getAllFormulas().forEach(({ formula, extraMetadata }) => {
          const metadata = this.formulaMetadata.get(formula.id)
          if (!metadata || metadata.registeredDisplay !== formula.display) {
            this.unregisterFormula(formula.id)
            this.registerFormula(formula, adapter, extraMetadata)
            formula.updateCanonicalFormula()
            updatedFormulas.push(formula.id)
          }
        })
      })
      updatedFormulas.forEach(formulaId => {
        const errorPresent = this.registerFormulaErrors(formulaId)
        if (!errorPresent) {
          this.updateFormulaMetadata(formulaId, { isInitialized: true })
          this.setupFormulaObservers(formulaId)
          this.recalculateFormula(formulaId)
        }
      })
    }, {
      equals: comparer.structural,
      fireImmediately: true,
      name: "FormulaManager.registerAllFormulas.reaction"
    })
  }

  unregisterDeletedFormulas() {
    this.formulaMetadata.forEach((metadata, formulaId) => {
      if (!isAlive(metadata.formula)) {
        this.unregisterFormula(formulaId)
      }
    })
  }

  unregisterFormula(formulaId: string) {
    const formulaMetadata = this.formulaMetadata.get(formulaId)
    if (formulaMetadata) {
      formulaMetadata.dispose?.() // dispose MST observers
      this.formulaMetadata.delete(formulaId)
    }
    this.extraMetadata.delete(formulaId)
  }

  registerFormula(formula: IFormula, adapter: IFormulaManagerAdapter, extraMetadata: IFormulaExtraMetadata) {
    this.formulaMetadata.set(formula.id, {
      formula,
      adapter,
      registeredDisplay: formula.display,
      isInitialized: false
    })
    this.extraMetadata.set(formula.id, extraMetadata)
  }

  registerFormulaErrors(formulaId: string) {
    const formulaContext = this.getFormulaContext(formulaId)
    const extraMetadata = this.getExtraMetadata(formulaId)
    const { adapter, formula } = formulaContext
    // Generic errors that can be applied to all the formulas:
    if (formula.syntaxError) {
      adapter.setFormulaError(
        formulaContext, extraMetadata, formulaError("DG.Formula.SyntaxErrorMiddle", [ formula.syntaxError ])
      )
      return true
    }
    // Errors specific to given formula context (e.g. attribute formulas can have dependency cycle):
    const formulaTypeSpecificError = adapter.getFormulaError(formulaContext, extraMetadata)
    if (formulaTypeSpecificError) {
      adapter.setFormulaError(formulaContext, extraMetadata, formulaTypeSpecificError)
      return true
    }
    return false
  }

  getDisplayNameMapForFormula(formulaId: string, options?: { useSafeSymbolNames: boolean }) {
    const { dataSet: localDataSet } = this.getFormulaContext(formulaId)
    const { useSafeSymbolNames } = options || { useSafeSymbolNames: true }

    const displayNameMap: DisplayNameMap = {
      localNames: {},
      dataSet: {}
    }

    const mapAttributeNames = (dataSet: IDataSet, localPrefix: string, _useSafeSymbolNames: boolean) => {
      const result: Record<string, string> = {}
      dataSet.attributes.forEach(attr => {
        const key = _useSafeSymbolNames ? safeSymbolName(attr.name) : attr.name
        result[key] = `${CANONICAL_NAME}${localPrefix}${attr.id}`
      })
      return result
    }

    displayNameMap.localNames = {
      ...mapAttributeNames(localDataSet, LOCAL_ATTR, useSafeSymbolNames),
      // caseIndex is a special name supported by formulas. It essentially behaves like a local data set attribute
      // that returns the current, 1-based index of the case in its collection group.
      caseIndex: `${CANONICAL_NAME}${LOCAL_ATTR}${CASE_INDEX_FAKE_ATTR_ID}`
    }

    this.globalValueManager?.globals.forEach(global => {
      const key = useSafeSymbolNames ? safeSymbolName(global.name) : global.name
      displayNameMap.localNames[key] = `${CANONICAL_NAME}${GLOBAL_VALUE}${global.id}`
    })

    this.dataSets.forEach(dataSet => {
      if (dataSet.name) {
        displayNameMap.dataSet[dataSet.name] = {
          id: `${CANONICAL_NAME}${dataSet.id}`,
          // No prefix is necessary for external attributes. They always need to be resolved manually by custom
          // mathjs functions (like "lookupByIndex"). Also, it's never necessary to use safe names, as these names
          // are string constants, not a symbols, so MathJS will not care about special characters there.
          attribute: mapAttributeNames(dataSet, "", false)
        }
      }
    })

    return displayNameMap
  }

  getCanonicalNameMap(formulaId: string) {
    const displayNameMap = this.getDisplayNameMapForFormula(formulaId, { useSafeSymbolNames: false })
    return reverseDisplayNameMap(displayNameMap)
  }

  setupFormulaObservers(formulaId: string) {
    const formulaContext = this.getFormulaContext(formulaId)
    const formulaMetadata = this.getFormulaMetadata(formulaId)
    const extraMetadata = this.getExtraMetadata(formulaId)
    const { formula, adapter } = formulaMetadata
    const { dataSet } = formulaContext
    if (formula.empty) {
      return
    }
    const dependencies = getFormulaDependencies(formula.canonical, extraMetadata.attributeId)

    const recalculate = (casesToRecalculate: CaseList) => {
      this.recalculateFormula(formulaId, casesToRecalculate)
    }
    const updateDisplay = () => {
      formula.updateDisplayFormula()
      // Note that when attribute is removed or renamed, this can also affect the formula's canonical form.
      // 1. Attribute is removed - its ID needs to be removed from the canonical form and the formula should be
      //    recalculated (usually to show the error about undefined symbol).
      // 2. Attribute is renamed - if the previous display form had undefined symbols, they might now be resolved
      //    to the renamed attribute. This means that the canonical form needs to be updated.
      const oldCanonical = formula.canonical
      formula.updateCanonicalFormula()
      if (oldCanonical !== formula.canonical) {
        this.recalculateFormula(formula.id)
      }
    }

    const disposeLocalAttributeObservers = observeLocalAttributes(dependencies, dataSet, recalculate)
    const disposeGlobalValueObservers = observeGlobalValues(dependencies, this.globalValueManager, recalculate)
    const disposeLookupObservers = observeLookupDependencies(dependencies, this.dataSets, recalculate)
    const disposeNameChangeObservers = observeSymbolNameChanges(this.dataSets, this.globalValueManager, updateDisplay)
    const disposeAdapterSpecificObservers = adapter.setupFormulaObservers(formulaContext, extraMetadata)

    this.formulaMetadata.set(formulaId, {
      ...formulaMetadata,
      dispose: () => {
        disposeLocalAttributeObservers()
        disposeGlobalValueObservers()
        disposeLookupObservers()
        disposeNameChangeObservers()
        disposeAdapterSpecificObservers()
      },
    })
  }
}
