import { comparer, makeObservable, observable, reaction, action } from "mobx"
import { addDisposer } from "mobx-state-tree"
import { parse } from "mathjs"
import { uniqueId } from "../../utilities/js-utils"
import { boundaryManager, BoundaryManager } from "../boundaries/boundary-manager"
import { IDataSet } from "../data/data-set"
import { ICase } from "../data/data-set-types"
import { IGlobalValueManager } from "../global/global-value-manager"
import { IFormula } from "./formula"
import {
  IFormulaExtraMetadata, IFormulaManagerAdapter, IFormulaMetadata, IFormulaManager, CaseList
} from "./formula-manager-types"
import { IFormulaAdapterApi } from "./formula-manager-adapter"
import {
  observeBoundaries, observeGlobalValues, observeLocalAttributes, observeLookupDependencies, observeSymbolNameChanges
} from "./formula-observers"
import { canonicalToDisplay, displayToCanonical, preprocessDisplayFormula } from "./utils/canonicalization-utils"
import { getFormulaDependencies } from "./utils/formula-dependency-utils"
import { formulaError, isRandomFunctionPresent } from "./utils/misc"
import { getCanonicalNameMap, getDisplayNameMap } from "./utils/name-mapping-utils"

export class FormulaManager implements IFormulaManager {
  formulaMetadata = new Map<string, IFormulaMetadata>()
  extraMetadata = new Map<string, IFormulaExtraMetadata>()

  @observable.shallow dataSets = new Map<string, IDataSet>()

  boundaryManager?: BoundaryManager
  globalValueManager?: IGlobalValueManager

  adapters: IFormulaManagerAdapter[] = []

  @observable
  areAdaptersInitialized = false

  // Unique identifier of this formula manager instance, useful for debugging.
  id = uniqueId()

  constructor() {
    makeObservable(this)
    this.boundaryManager = boundaryManager
  }

  getAdapterApi(): IFormulaAdapterApi {
    return {
      getDatasets: () => this.dataSets,
      getBoundaryManager: () => this.boundaryManager,
      getGlobalValueManager: () => this.globalValueManager,
      getFormulaContext: (formulaId: string) => this.getFormulaContext(formulaId),
      getFormulaExtraMetadata: (formulaId: string) => this.getExtraMetadata(formulaId)
    }
  }

  @action addAdapters(adapters: IFormulaManagerAdapter[]) {
    this.adapters.push(...adapters)
    this.registerActiveFormulas()
    this.areAdaptersInitialized = true
  }

  @action addDataSet(dataSet: IDataSet) {
    this.dataSets.set(dataSet.id, dataSet)
    // remove the DataSet if it is destroyed
    addDisposer(dataSet, () => this.removeDataSet(dataSet.id))
  }

  @action removeDataSet(dataSetId: string) {
    // unregister all formulas associated with the removed DataSet
    const formulasToUnregister: string[] = []
    this.extraMetadata.forEach((extraMetadata, formulaId) => {
      if (extraMetadata.dataSetId === dataSetId) {
        formulasToUnregister.push(formulaId)
      }
    })
    formulasToUnregister.forEach(formulaId => this.unregisterFormula(formulaId))

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

  updateFormulaCanonicalExpression(formulaId: string) {
    const { formula } = this.getFormulaContext(formulaId)
    // This action will be called by formula manager when it detects that the display formula has changed.
    // It can happen either as a result of user editing the formula, or when a document with display formulas is loaded.
    formula.setCanonicalExpression("") // reset canonical formula immediately, in case of errors that are handled below
    if (formula.empty || !formula.valid) {
      return
    }
    const displayNameMap = this.getDisplayNameMap(formulaId)
    formula.setCanonicalExpression(displayToCanonical(formula.display, displayNameMap))
  }

  updateFormulaDisplayExpression(formulaId: string) {
    const { formula } = this.getFormulaContext(formulaId)
    // This action should be called when one of the attributes is renamed. The canonical form is still valid, while
    // display form needs to be updated. The old display form is used to preserve the user's whitespace / formatting.
    if (formula.empty || !formula.valid) {
      return
    }
    const canonicalNameMap = this.getCanonicalNameMap(formulaId)
    try {
      formula.setDisplayExpression(canonicalToDisplay(formula.canonical, formula.display, canonicalNameMap))
    } catch {
      // If the canonical formula can't be converted to display formula, it usually means there are some unresolved
      // canonical names. It usually happens when an attribute is removed. Nothing to do here, just keep the original
      // display form.
    }
  }

  getActiveFormulas() {
    return this.adapters.flatMap(a => a.getActiveFormulas())
  }

  recalculateActiveFormulas() {
    this.getActiveFormulas().forEach(({ formula }) => {
      this.recalculateFormula(formula.id)
    })
  }

  registerActiveFormulas() {
    reaction(() => {
      // Observe all the formulas
      return this.getActiveFormulas().map(({ formula, extraMetadata }) => (
        { id: formula.id, formula: formula.display, extraMetadata }
      ))
    }, () => {
      const activeFormulas = new Set<string>()
      // Register formulas. For simplicity, we unregister all formulas and register them again when canonical form is
      // updated. Note that even empty formulas are registered, so the metadata is always available when cycle detection
      // is executed.
      const updatedFormulas: string[] = []
      this.adapters.forEach(adapter => {
        adapter.getActiveFormulas().forEach(({ formula, extraMetadata }) => {
          activeFormulas.add(formula.id)
          const metadata = this.formulaMetadata.get(formula.id)
          const prevExtraMetadata = this.extraMetadata.get(formula.id)
          // Formula is considered to be updated by user when its display form changes, or when its extra metadata
          // is updated (e.g. default argument might have changed and the formula needs to be re-registered and
          // re-calculated).
          const isFormulaUpdated = !metadata || metadata.registeredDisplay !== formula.display ||
            !comparer.structural(prevExtraMetadata, extraMetadata)
          if (isFormulaUpdated) {
            this.unregisterFormula(formula.id)
            this.registerFormula(formula, adapter, extraMetadata)
            this.updateFormulaCanonicalExpression(formula.id)
            // Note that we need to delay processing of updated formulas until all the formulas are registered.
            // This is necessary for the dependency cycle detection to work correctly.
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
      // Note that formula doesn't need to be deleted from MST tree to be considered deleted or "unregistered".
      // It's enough for the adapter not to return given formula from getActiveFormulas() method to consider it deleted.
      // Graph formulas do that when the adornment is hidden by user.
      this.unregisterInactiveFormulas(activeFormulas)
    }, {
      equals: comparer.structural,
      fireImmediately: true,
      name: "FormulaManager.registerActiveFormulas.reaction"
    })
  }

  unregisterInactiveFormulas(activeFormulas: Set<string>) {
    this.formulaMetadata.forEach((metadata, formulaId) => {
      if (!activeFormulas.has(formulaId)) {
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
    // unregister formulas when they're destroyed
    addDisposer(formula, () => this.unregisterFormula(formula.id))
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

  getDisplayNameMap(formulaId: string) {
    const { dataSet: localDataSet } = this.getFormulaContext(formulaId)
    return getDisplayNameMap({
      localDataSet,
      dataSets: this.dataSets,
      boundaryManager: this.boundaryManager,
      globalValueManager: this.globalValueManager,
    })
  }

  getCanonicalNameMap(formulaId: string) {
    const { dataSet: localDataSet } = this.getFormulaContext(formulaId)
    return getCanonicalNameMap({
      localDataSet,
      dataSets: this.dataSets,
      globalValueManager: this.globalValueManager,
    })
  }

  setupFormulaObservers(formulaId: string) {
    const formulaContext = this.getFormulaContext(formulaId)
    const formulaMetadata = this.getFormulaMetadata(formulaId)
    const extraMetadata = this.getExtraMetadata(formulaId)
    const { dataSet } = formulaContext
    const { formula, adapter } = formulaMetadata
    const { defaultArgument } = extraMetadata

    if (formula.empty) {
      return
    }
    const dependencies = getFormulaDependencies(formula.canonical, extraMetadata.attributeId, defaultArgument)

    const recalculate = (casesToRecalculate: CaseList) => {
      this.recalculateFormula(formulaId, casesToRecalculate)
    }
    const updateDisplay = () => {
      this.updateFormulaDisplayExpression(formulaId)
      // Note that when attribute is removed or renamed, this can also affect the formula's canonical form.
      // 1. Attribute is removed - its ID needs to be removed from the canonical form and the formula should be
      //    recalculated (usually to show the error about undefined symbol).
      // 2. Attribute is renamed - if the previous display form had undefined symbols, they might now be resolved
      //    to the renamed attribute. This means that the canonical form needs to be updated.
      const oldCanonical = formula.canonical
      this.updateFormulaCanonicalExpression(formulaId)
      if (oldCanonical !== formula.canonical) {
        this.recalculateFormula(formula.id)
      }
    }

    const disposeLocalAttributeObservers = observeLocalAttributes(dependencies, dataSet, recalculate)
    const disposeBoundaryObservers = observeBoundaries(dependencies, this.boundaryManager, recalculate)
    const disposeGlobalValueObservers = observeGlobalValues(dependencies, this.globalValueManager, recalculate)
    const disposeLookupObservers = observeLookupDependencies(dependencies, this.dataSets, recalculate)
    const disposeNameChangeObservers = observeSymbolNameChanges(this.dataSets, this.globalValueManager, updateDisplay)
    const disposeAdapterSpecificObservers = adapter.setupFormulaObservers?.(formulaContext, extraMetadata)

    this.formulaMetadata.set(formulaId, {
      ...formulaMetadata,
      dispose: () => {
        disposeLocalAttributeObservers()
        disposeBoundaryObservers()
        disposeGlobalValueObservers()
        disposeLookupObservers()
        disposeNameChangeObservers()
        disposeAdapterSpecificObservers?.()
      }
    })
  }

  getSyntaxError(displayString: string) {
    try {
      parse(preprocessDisplayFormula(displayString))
    } catch (error: any) {
      return error.message
    }
    return null
  }

  isRandomFunctionPresent(canonicalString: string) {
    return isRandomFunctionPresent(canonicalString)
  }

  rerandomize(formulaId: string) {
    this.recalculateFormula(formulaId)
  }

}
