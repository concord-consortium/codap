import { makeObservable, observable, reaction } from "mobx"
import { FormulaMathJsScope } from "./formula-mathjs-scope"
import { CaseGroup, ICase, IGroupedCase, symParent } from "./data-set-types"
import { onAnyAction } from "../../utilities/mst-utils"
import { getFormulaDependencies } from "./formula-utils"
import {
  DisplayNameMap, IFormulaDependency, GLOBAL_VALUE, LOCAL_ATTR, ILocalAttributeDependency, IGlobalValueDependency,
  ILookupDependency
} from "./formula-types"
import { math } from "./formula-fn-registry"
import { IDataSet } from "./data-set"
import { AddCasesAction, SetCaseValuesAction } from "./data-set-actions"
import { IGlobalValueManager } from "../global/global-value-manager"
import { IFormula } from "./formula"

type IFormulaMetadata = {
  formula: IFormula
  registeredCanonical: string
  attributeId: string
  dataSetId: string
  dispose?: () => void
}

export class FormulaManager {
  @observable dataSets = new Map<string, IDataSet>()
  formulaMetadata = new Map<string, IFormulaMetadata>()
  globalValueManager?: IGlobalValueManager

  constructor() {
    makeObservable(this)
    this.registerAllFormulas()
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

    const collectionId = dataSet.getCollectionForAttribute(attributeId)?.id
    const collectionGroup = dataSet.getCollectionGroupForAttributes([attributeId])

    const caseIdToChildCaseIds: Record<string, string[]> = {}
    const caseIdToParentId: Record<string, string> = {}
    const parentIdToGroupIds: Record<string, string[]> = {}
    const sameLevelCaseIds: string[] = []

    const processCase = (c: IGroupedCase) => {
      const parent = c[symParent]
      if (parent) {
        if (!parentIdToGroupIds[parent]) {
          parentIdToGroupIds[parent] = []
        }
        parentIdToGroupIds[parent].push(c.__id__)
        caseIdToParentId[c.__id__] = parent
      }
      sameLevelCaseIds.push(c.__id__)
    }

    if (collectionGroup) {
      collectionGroup.groups.forEach((group: CaseGroup) => {
        caseIdToChildCaseIds[group.pseudoCase.__id__] = group.childCaseIds
        processCase(group.pseudoCase)
      })
    } else {
      dataSet.childCases().forEach(childCase => processCase(childCase))
    }

    let casesToRecalculate: ICase[] = []
    if (casesToRecalculateDesc === "ALL_CASES") {
      // When casesToRecalculate is not provided, recalculate all cases.
      casesToRecalculate = dataSet.getCasesForAttributes([attributeId])
    } else {
      casesToRecalculate = casesToRecalculateDesc
    }
    if (!casesToRecalculate || casesToRecalculate.length === 0) {
      return
    }
    console.log(`[formula] recalculate "${formula.canonical}" for ${casesToRecalculate.length} cases`)

    const compiledFormula = math.compile(formula.canonical)
    const formulaScope = new FormulaMathJsScope({
      localDataSet: dataSet,
      dataSets: this.dataSets,
      globalValueManager: this.globalValueManager,
      formulaAttributeCollectionId: collectionId
    })

    const casesToUpdate = casesToRecalculate.map((c) => {
      formulaScope.setCaseId(c.__id__)
      const parentId = caseIdToParentId[c.__id__]
      formulaScope.setSameLevelGroupIds(parentIdToGroupIds[parentId] || sameLevelCaseIds)
      if (collectionGroup) {
        // We're dealing with hierarchical data, so we need to provide child case ids to the formula scope for each
        // case.
        formulaScope.setChildCaseIds(caseIdToChildCaseIds[c.__id__])
      }

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
    const disposeLookupObservers = this.observeLookup(formula.id, formulaDependencies)

    this.formulaMetadata.set(formula.id, {
      ...formulaMetadata,
      dispose: () => {
        disposeLocalAttributeObserver()
        disposeGlobalValueObservers.forEach(disposeGlobalValObserver => disposeGlobalValObserver())
        disposeLookupObservers.forEach(disposeLookupObserver => disposeLookupObserver())
      },
    })

    // Initial call of formula evaluation.
    this.recalculateFormula(formula.id)
  }

  getDisplayNameMapForFormula(formulaId: string) {
    const { dataSet: localDataSet } = this.getFormulaContext(formulaId)

    const displayNameMap: DisplayNameMap = {
      localNames: {},
      dataSet: {}
    }

    const mapAttributeNames = (dataSet: IDataSet, prefix: string) => {
      const result: Record<string, string> = {}
      dataSet.attributes.forEach(attr => {
        result[attr.name] = `${prefix}${attr.id}`
      })
      return result
    }

    displayNameMap.localNames = {
      ...mapAttributeNames(localDataSet, LOCAL_ATTR)
    }

    this.globalValueManager?.globals.forEach(global => {
      displayNameMap.localNames[global.name] = `${GLOBAL_VALUE}${global.id}`
    })

    this.dataSets.forEach(dataSet => {
      if (dataSet.name) {
        displayNameMap.dataSet[dataSet.name] = {
          id: dataSet.id,
          // No prefix is necessary for external attributes. They always need to be resolved manually by custom
          // mathjs functions (like "lookupByIndex").
          attribute: mapAttributeNames(dataSet, "")
        }
      }
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
      onAnyAction(this.globalValueManager?.getValueById(dependency.globalId), mstAction => {
        if (mstAction.name === "setValue") {
          this.recalculateFormula(formulaId)
        }
      })
    )

    return disposeGlobalValueObservers
  }

  observeLookup(formulaId: string, formulaDependencies: IFormulaDependency[]) {
    const lookupDependencies: ILookupDependency[] =
      formulaDependencies.filter(d => d.type === "lookup") as ILookupDependency[]

    const disposeLookupObservers = lookupDependencies.map(dependency => {
      const externalDataSet = this.dataSets.get(dependency.dataSetId)
      if (!externalDataSet) {
        throw new Error(`External dataSet with id "${dependency.dataSetId}" not found`)
      }

      const getCasesToRecalculate = (cases: ICase[]) => {
        return cases.find(c =>
          c[dependency.attrId] !== undefined || (dependency.keyAttrId && c[dependency.keyAttrId] !== undefined)
        ) ? "ALL_CASES" : []
      }

      return onAnyAction(externalDataSet, mstAction => {
        let casesToRecalculate: ICase[] | "ALL_CASES" = []
        switch (mstAction.name) {
          // TODO: these rules are very broad, think if there are some ways to optimize and narrow them down.
          case "addCases": {
            casesToRecalculate = "ALL_CASES"
            break
          }
          case "removeCases": {
            casesToRecalculate = "ALL_CASES"
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
    })

    return disposeLookupObservers
  }

  // Simple DFS (depth first search) algorithm to detect dependency cycles.
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

      const lookupDependencies: ILookupDependency[] =
        formulaDependencies.filter(d => d.type === "lookup") as ILookupDependency[]
      for (const dependency of lookupDependencies) {
        const externalDataSet = this.dataSets.get(dependency.dataSetId)
        if (!externalDataSet) {
          throw new Error(`External dataSet with id "${dependency.dataSetId}" not found`)
        }
        const dependencyAttribute = externalDataSet.attrFromID(dependency.attrId)
        if (dependencyAttribute?.formula.valid) {
          stack.push(dependencyAttribute.formula.id)
        }
        if (dependency.keyAttrId) {
          const dependencyKeyAttribute = externalDataSet.attrFromID(dependency.keyAttrId)
          if (dependencyKeyAttribute?.formula.valid) {
            stack.push(dependencyKeyAttribute.formula.id)
          }
        }
      }
    }
    return false // no cycle detected
  }
}
