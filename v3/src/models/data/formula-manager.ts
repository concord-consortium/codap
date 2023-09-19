import { makeObservable, observable, reaction } from "mobx"
import { EvalFunction } from "mathjs"
import { FormulaMathJsScope } from "./formula-mathjs-scope"
import { CaseGroup, ICase, IGroupedCase, symParent } from "./data-set-types"
import { onAnyAction } from "../../utilities/mst-utils"
import {
  getFormulaDependencies, formulaError, getFormulaChildMostAggregateCollectionIndex, getIncorrectChildAttrReference,
  getIncorrectParentAttrReference, safeSymbolName
} from "./formula-utils"
import {
  DisplayNameMap, IFormulaDependency, GLOBAL_VALUE, LOCAL_ATTR, ILocalAttributeDependency, IGlobalValueDependency,
  ILookupDependency, NO_PARENT_KEY, FValue
} from "./formula-types"
import { math } from "./formula-fn-registry"
import { IDataSet } from "./data-set"
import { AddCasesAction, SetCaseValuesAction } from "./data-set-actions"
import { IGlobalValueManager } from "../global/global-value-manager"
import { IFormula } from "./formula"

type IFormulaMetadata = {
  formula: IFormula
  registeredDisplay: string
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

  getCaseGroupMap(formulaId: string) {
    const { attributeId, dataSet } = this.getFormulaContext(formulaId)

    const collectionId = dataSet.getCollectionForAttribute(attributeId)?.id
    const collectionIndex = dataSet.getCollectionIndex(collectionId || "")
    const caseGroupId: Record<string, string> = {}

    const processCase = (c: IGroupedCase) => {
      const parentId = c[symParent] || NO_PARENT_KEY
      caseGroupId[c.__id__] = caseGroupId[parentId] || parentId
    }

    const calculateChildCollectionGroups = () => {
      for (let i = collectionIndex + 1; i < dataSet.collections.length; i++) {
        const collectionGroup = dataSet.collectionGroups[i]
        collectionGroup.groups.forEach((group: CaseGroup) => processCase(group.pseudoCase))
      }
      // Note that the child cases are never in any collection and they require separate processing.
      dataSet.childCases().forEach(childCase => processCase(childCase))
    }

    const calculateSameLevelGroups = () => {
      const formulaCollection = dataSet.collectionGroups[collectionIndex]
      if (formulaCollection) {
        dataSet.collectionGroups[collectionIndex].groups.forEach((group: CaseGroup) =>
          processCase(group.pseudoCase)
        )
      }
    }

    // Note that order of execution of these functions is critical. First, we need to calculate child collection groups,
    // as child collection cases are grouped using the pseudo cases from the collection where the formula attribute is.
    // Next, we can calculate grouping for the formula attribute collection (same-level grouping). These will be parents
    // of the formula attribute collection cases. If we reversed the order, the child collection cases would be
    // grouped incorrectly (using a collection too high in the collections hierarchy).
    calculateChildCollectionGroups()
    calculateSameLevelGroups()

    return caseGroupId
  }

  getCaseChildrenCountMap(formulaId: string) {
    const { attributeId, dataSet } = this.getFormulaContext(formulaId)

    const collectionId = dataSet.getCollectionForAttribute(attributeId)?.id
    const collectionIndex = dataSet.getCollectionIndex(collectionId || "")
    const caseChildrenCount: Record<string, number> = {}

    const formulaCollection = dataSet.collectionGroups[collectionIndex]
    if (formulaCollection) {
      dataSet.collectionGroups[collectionIndex].groups.forEach((group: CaseGroup) =>
        caseChildrenCount[group.pseudoCase.__id__] =
          group.childPseudoCaseIds ? group.childPseudoCaseIds.length : group.childCaseIds.length
      )
    }

    return caseChildrenCount
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
    if (!casesToRecalculate || casesToRecalculate.length === 0) {
      return
    }
    console.log(`[formula] recalculate "${formula.canonical}" for ${casesToRecalculate.length} cases`)

    const collectionId = dataSet.getCollectionForAttribute(attributeId)?.id
    const collectionIndex = dataSet.getCollectionIndex(collectionId || "")

    const incorrectParentAttrId = getIncorrectParentAttrReference(formula.canonical, collectionIndex, dataSet)
    if (incorrectParentAttrId) {
      const attrName = dataSet.attrFromID(incorrectParentAttrId).name
      return this.setFormulaError(formulaId, formulaError("V3.formula.error.invalidParentAttrRef", [ attrName ]))
    }

    const incorrectChildAttrId = getIncorrectChildAttrReference(formula.canonical, collectionIndex, dataSet)
    if (incorrectChildAttrId) {
      const attrName = dataSet.attrFromID(incorrectChildAttrId).name
      return this.setFormulaError(formulaId, formulaError("DG.Formula.HierReferenceError.message", [ attrName ]))
    }

    const childMostAggregateCollectionIndex =
      getFormulaChildMostAggregateCollectionIndex(formula.canonical, dataSet) ?? collectionIndex
    const childMostCollectionGroup = dataSet.collectionGroups[childMostAggregateCollectionIndex]
    const childMostCollectionCases = childMostCollectionGroup
      ? childMostCollectionGroup.groups.map((group: CaseGroup) => group.pseudoCase) || []
      : dataSet.childCases()

    const formulaScope = new FormulaMathJsScope({
      formulaAttrId: attributeId,
      localDataSet: dataSet,
      dataSets: this.dataSets,
      globalValueManager: this.globalValueManager,
      // There are two separate kinds of aggregate cases grouping:
      // - Same-level grouping, which is used when the table is flat or when the aggregate function is referencing
      //   attributes only from the same collection.
      // - Parent-child grouping, which is used when the table is hierarchical and the aggregate function is
      //   referencing attributes from child collections.
      useSameLevelGrouping: collectionIndex === childMostAggregateCollectionIndex,
      childMostCollectionCases,
      caseGroupId: this.getCaseGroupMap(formulaId),
      caseChildrenCount: this.getCaseChildrenCountMap(formulaId)
    })

    let compiledFormula: EvalFunction
    try {
      compiledFormula = math.compile(formula.canonical)
    } catch (e: any) {
      return this.setFormulaError(formulaId, formulaError(e.message))
    }

    dataSet.setCaseValues(casesToRecalculate.map((c) => {
      formulaScope.setCaseId(c.__id__)
      let formulaValue: FValue
      try {
        formulaValue = compiledFormula.evaluate(formulaScope)
        // This is necessary for functions like `prev` that need to know the previous result when they reference
        // its own attribute.
        formulaScope.setPreviousResult(formulaValue)
      } catch (e: any) {
        formulaValue = formulaError(e.message)
      }
      return {
        __id__: c.__id__,
        [attributeId]: formulaValue
      }
    }))
  }

  // Error message is set as formula output, similarly as in CODAP V2.
  setFormulaError(formulaId: string, errorMsg: string) {
    const { attributeId, dataSet } = this.getFormulaContext(formulaId)
    const allCases = dataSet.getCasesForAttributes([attributeId])
    dataSet.setCaseValues(allCases.map(c => ({
      __id__: c.__id__,
      [attributeId]: errorMsg
    })))
  }

  registerAllFormulas() {
    reaction(() => {
      // Observe all the formulas
      let result = ""
      this.dataSets.forEach(dataSet => {
        dataSet.attributes.forEach(attr => {
          result += `${attr.formula.id}-${attr.formula.display}`
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
            if (this.formulaMetadata.get(attr.formula.id)?.registeredDisplay !== attr.formula.display) {
              this.unregisterFormula(attr.formula.id)
              this.registerFormula(attr.formula, attr.id, dataSet)
            }
          } else {
            this.registerFormula(attr.formula, attr.id, dataSet)
          }
        })
      })
    }, { fireImmediately: true })
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
      registeredDisplay: formula.display,
      attributeId,
      dataSetId: dataSet.id
    }
    this.formulaMetadata.set(formula.id, formulaMetadata)

    if (formula.empty) {
      // Nothing else to do, formula is empty.
      return
    }

    if (formula.syntaxError) {
      return this.setFormulaError(formula.id, formulaError("DG.Formula.SyntaxErrorMiddle", [ formula.syntaxError ]))
    }

    // Check if there is a dependency cycle. Note that it needs to happen after formula is registered, so that
    // the dependency check can access all the metadata in the formula registry.
    if (this.isDependencyCyclePresent(formula.id)) {
      return this.setFormulaError(formula.id, formulaError("V3.formula.error.cycle"))
    }

    const formulaDependencies = getFormulaDependencies(formula.canonical, attributeId)
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
        result[safeSymbolName(attr.name)] = `${prefix}${attr.id}`
      })
      return result
    }

    displayNameMap.localNames = {
      ...mapAttributeNames(localDataSet, LOCAL_ATTR)
    }

    this.globalValueManager?.globals.forEach(global => {
      displayNameMap.localNames[safeSymbolName(global.name)] = `${GLOBAL_VALUE}${global.id}`
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

      const { formula, dataSet, attributeId } = this.getFormulaContext(currentFormula)
      const formulaDependencies = getFormulaDependencies(formula.canonical, attributeId)

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
