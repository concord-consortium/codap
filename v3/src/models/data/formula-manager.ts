import { makeObservable, observable, reaction } from "mobx"
import { IFormula } from "./formula"
import { IDataSet } from "./data-set"
import { getFormulaMathjsContext } from "./formula-mathjs-context"
import { compile, e } from "mathjs"
import { ICase } from "./data-set-types"
import { onAnyAction } from "../../utilities/mst-utils"
import { AddCasesAction, SetCaseValuesAction } from "./data-set-actions"
import { getFormulaDependencies } from "./formula-utils"
import { IGlobalValueManager } from "../global/global-value-manager"
import {
  DisplayNameMap, IFormulaDependency, GLOBAL_VALUE, LOCAL_ATTR, ILocalAttributeDependency, IGlobalValueDependency
} from "./formula-types"

type IFormulaMetadata = {
  formula: IFormula
  registeredCanonical: string
  attributeId: string
  dataSetId: string
  dispose?: () => void
}

// TODO: global module-level instance of formula manager is a temporary solution.
// We need to find another wa to give access to formula manager
let gGlobalFormulaMangerInstance: FormulaManager
export const initializeFormulaManager = (dataSets: Map<string, IDataSet>, globalValueManager: IGlobalValueManager) => {
  gGlobalFormulaMangerInstance = new FormulaManager(dataSets, globalValueManager)
  gGlobalFormulaMangerInstance.registerAllFormulas()
}

export const getFormulaManager = () => gGlobalFormulaMangerInstance

export class FormulaManager {
  @observable dataSets = new Map<string, IDataSet>()
  formulaMetadata = new Map<string, IFormulaMetadata>()
  globalValueManager: IGlobalValueManager

  constructor(dataSets: Map<string, IDataSet>, globalValueManager: IGlobalValueManager) {
    this.dataSets = dataSets
    this.globalValueManager = globalValueManager
    makeObservable(this)
  }

  // Retrieves formula context like its attribute, dataset, etc. It also validates correctness of the formula
  // and its context.
  getFormulaContext(formulaId: string) {
    const formulaMetadata = this.formulaMetadata.get(formulaId)
    if (!formulaMetadata) {
      throw new Error(`Formula ${formulaId} not registered`)
    }
    const dataSet = this.dataSets.get(formulaMetadata.dataSetId)
    if (!dataSet) {
      throw new Error(`Dataset ${formulaMetadata.dataSetId} not available`)
    }
    if (!dataSet.attrFromID(formulaMetadata.attributeId)) {
      throw new Error(`Attribute ${formulaMetadata.attributeId} not available in dataset ${formulaMetadata.dataSetId}`)
    }
    return { dataSet, ...formulaMetadata }
  }

  recalculateFormula(formulaId: string, casesToRecalculateDesc: ICase[] | "ALL_CASES" = "ALL_CASES") {
    const { formula, attributeId, dataSet } = this.getFormulaContext(formulaId)

    let casesToRecalculate: ICase[] = []
    if (casesToRecalculateDesc === "ALL_CASES") {
      // When casesToRecalculate is not provided, recalculate all cases.
      casesToRecalculate = dataSet.getCasesForAttributes([attributeId])
    } else {
      casesToRecalculate = casesToRecalculateDesc
    }
    if (casesToRecalculate.length === 0) {
      return
    }
    console.log(`[formula] recalculate "${formula.canonical}" for ${casesToRecalculate.length} cases`)

    const compiledFormula = compile(formula.canonical)
    const formulaScope = getFormulaMathjsContext(dataSet, this.globalValueManager)

    const casesToUpdate = casesToRecalculate.map((c) => {
      formulaScope.setCaseId(c.__id__)
      const formulaValue = compiledFormula.evaluate(formulaScope)
      return {
        __id__: c.__id__,
        [attributeId]: formulaValue
      }
    })
    dataSet.setCaseValues(casesToUpdate)
  }

  registerAllFormulas() {
    reaction(() => {
      // Observe all the formulas (their canonical form in fact)
      const result: string[] = []
      this.dataSets.forEach(dataSet => {
        dataSet.attributes.forEach(attr => {
          if (attr.formula.valid && attr.formula.canonical) {
            result.push(attr.formula.canonical)
          }
        })
      })
      return result
    }, () => {
      // Register formulas. For simplicity, we unregister all formulas and register them again when canonical form is
      // updated. Note that even empty formulas are registered, so the metadata is always available when cycle detection
      // is executed.
      this.dataSets.forEach(dataSet => {
        dataSet.attributes.forEach(attr => {
          if (this.formulaMetadata.has(attr.formula.id)) {
            if (this.formulaMetadata.get(attr.formula.id)?.registeredCanonical !== attr.formula.canonical) {
              this.unregisterFormula(attr.formula.id)
              this.registerFormula(attr.formula, attr.id, dataSet)
            }
          } else {
            this.registerFormula(attr.formula, attr.id, dataSet)
          }
        })
      })
    })
  }

  unregisterFormula(formulaId: string) {
    const formulaMetadata = this.formulaMetadata.get(formulaId)
    if (formulaMetadata) {
      formulaMetadata.dispose?.() // dispose MST observers
      this.formulaMetadata.delete(formulaId)
    }
  }

  registerFormula(formula: IFormula, attributeId: string, dataSet: IDataSet) {
    const formulaMetadata: IFormulaMetadata = {
      formula,
      registeredCanonical: formula.canonical,
      attributeId,
      dataSetId: dataSet.id
    }
    this.formulaMetadata.set(formula.id, formulaMetadata)

    if (!formula.valid) {
      // Nothing else to do, formula is empty.
      return
    }

    // Check if there is a dependency cycle. Note that it needs to happen after formula is registered, so that
    // the dependency check can access all the metadata in the formula registry.
    if (this.isDependencyCyclePresent(formula.id)) {
      window.alert(`Dependency cycle detected for "${formula.canonical}". Formula will not be evaluated.`)
      console.error(`[formula] dependency cycle detected for "${formula.canonical}". Formula will not be evaluated.`)
      return
    }

    const formulaDependencies = getFormulaDependencies(formula.canonical)
    const disposeLocalAttributeObserver = this.observeLocalAttributes(formula.id, formulaDependencies)
    const disposeGlobalValueObservers = this.observeGlobalValues(formula.id, formulaDependencies)

    this.formulaMetadata.set(formula.id, {
      ...formulaMetadata,
      dispose: () => {
        disposeLocalAttributeObserver()
        disposeGlobalValueObservers.forEach(disposeGlobalValObserver => disposeGlobalValObserver())
      },
    })

    // Initial call of formula evaluation.
    this.recalculateFormula(formula.id)
  }

  getDisplayNameMapForFormula(formulaId: string) {
    const { dataSet } = this.getFormulaContext(formulaId)

    const displayNameMap: DisplayNameMap = {}

    dataSet.attributes.forEach(attr => {
      displayNameMap[attr.name] = `${LOCAL_ATTR}${attr.id}`
    })

    this.globalValueManager.globals.forEach(global => {
      displayNameMap[global.name] = `${GLOBAL_VALUE}${global.id}`
    })

    return displayNameMap
  }

  observeLocalAttributes(formulaId: string, formulaDependencies: IFormulaDependency[]) {
    const { dataSet } = this.getFormulaContext(formulaId)

    const regularDatasetAttributeDependencies: ILocalAttributeDependency[] =
      formulaDependencies.filter(d => d.type === "localAttribute" && !d.aggregate) as ILocalAttributeDependency[]
    const aggregateDatasetAttributeDependencies: ILocalAttributeDependency[] =
      formulaDependencies.filter(d => d.type === "localAttribute" && d.aggregate) as ILocalAttributeDependency[]

    const getCasesToRecalculate = (cases: ICase[]) => {
      const aggregateDependencyPresent = !!cases.find(c => {
        for (const dependency of aggregateDatasetAttributeDependencies) {
          if (c[dependency.attrId] !== undefined) {
            return true
          }
        }
        return false
      })
      if (aggregateDependencyPresent) {
        return "ALL_CASES"
      }

      // Otherwise, check all the updated cases if they have any of the dependency attributes. Each case that
      // includes one of the regular dependency attributes needs to be recalculated.
      return cases.filter(c => {
        for (const dependency of regularDatasetAttributeDependencies) {
          if (c[dependency.attrId]) {
            return true
          }
        }
        return false
      })
    }

    // Observe local dataset attribute changes
    const disposeDatasetObserver = onAnyAction(dataSet, mstAction => {
      let casesToRecalculate: ICase[] | "ALL_CASES" = []
      switch (mstAction.name) {
        case "addCases": {
          // recalculate all new cases
          casesToRecalculate = (mstAction as AddCasesAction).args[0] || []
          break
        }
        case "setCaseValues": {
          // recalculate cases with dependency attribute updated
          const cases = (mstAction as SetCaseValuesAction).args[0] || []
          casesToRecalculate = getCasesToRecalculate(cases)
          break
        }
        default:
          break
      }

      this.recalculateFormula(formulaId, casesToRecalculate)
    })

    return disposeDatasetObserver
  }

  // Observe global value changes. In theory, we could use MobX reaction to watch global value (after checking if it's
  // synchronous or async). onAnyAction is guaranteed to be synchronous, so this might work better with undo-redo logic.
  observeGlobalValues(formulaId: string, formulaDependencies: IFormulaDependency[]) {
    const globalValueDependencies =
      formulaDependencies.filter(d => d.type === "globalValue") as IGlobalValueDependency[]

    const disposeGlobalValueObservers = globalValueDependencies.map(dependency =>
      onAnyAction(this.globalValueManager.getValueById(dependency.globalId), mstAction => {
        if (mstAction.name === "setValue") {
          this.recalculateFormula(formulaId)
        }
      })
    )

    return disposeGlobalValueObservers
  }

  // Simple DFS algorithm to detect dependency cycles.
  isDependencyCyclePresent(formulaId: string) {
    const visitedFormulas: Record<string, boolean> = {}
    const stack: string[] = [formulaId]

    while (stack.length > 0) {
      const currentFormula = stack.pop() as string

      if (visitedFormulas[currentFormula]) {
        return true // cycle detected
      }
      visitedFormulas[currentFormula] = true

      const { dataSet } = this.getFormulaContext(currentFormula)
      const formulaDependencies = getFormulaDependencies(currentFormula)
      const localDatasetAttributeDependencies: ILocalAttributeDependency[] =
        formulaDependencies.filter(d => d.type === "localAttribute") as ILocalAttributeDependency[]

      for (const dependency of localDatasetAttributeDependencies) {
        const dependencyAttribute = dataSet.attrFromID(dependency.attrId)
        if (dependencyAttribute?.formula.valid) {
          stack.push(dependencyAttribute.formula.id)
        }
      }
    }
    return false // no cycle detected
  }
}
