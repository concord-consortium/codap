import { comparer, makeObservable, observable, reaction } from "mobx"
import { EvalFunction } from "mathjs"
import { FormulaMathJsScope } from "./formula-mathjs-scope"
import { CaseGroup, ICase, IGroupedCase, symParent } from "./data-set-types"
import { onAnyAction } from "../../utilities/mst-utils"
import {
  getFormulaDependencies, formulaError, getFormulaChildMostAggregateCollectionIndex, getIncorrectChildAttrReference,
  getIncorrectParentAttrReference, safeSymbolName, reverseDisplayNameMap
} from "./formula-utils"
import {
  DisplayNameMap, IFormulaDependency, GLOBAL_VALUE, LOCAL_ATTR, ILocalAttributeDependency, IGlobalValueDependency,
  ILookupDependency, NO_PARENT_KEY, FValue, CASE_INDEX_FAKE_ATTR_ID
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
  isInitialized: boolean
  dispose?: () => void
}

type IDataSetMetadata = {
  dispose: () => void
}

export class FormulaManager {
  @observable dataSets = new Map<string, IDataSet>()
  dataSetMetadata = new Map<string, IDataSetMetadata>()
  formulaMetadata = new Map<string, IFormulaMetadata>()
  globalValueManager?: IGlobalValueManager

  constructor() {
    makeObservable(this)
    this.registerAllFormulas()
  }

  addDataSet(dataSet: IDataSet) {
    this.removeDataSet(dataSet.id)
    this.observeDatasetChanges(dataSet)
    this.dataSets.set(dataSet.id, dataSet)
  }

  removeDataSet(dataSetId: string) {
    const metadata = this.dataSetMetadata.get(dataSetId)
    if (metadata) {
      metadata.dispose()
      this.dataSetMetadata.delete(dataSetId)
    }
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

  // Retrieves formula context like its attribute, dataset, etc. It also validates correctness of the formula
  // and its context.
  getFormulaContext(formulaId: string) {
    const formulaMetadata = this.getFormulaMetadata(formulaId)
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
    const { formula, attributeId, dataSet, isInitialized } = this.getFormulaContext(formulaId)
    if (!isInitialized) {
      return
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
    const childMostCollectionCaseIds = childMostCollectionGroup
      ? childMostCollectionGroup.groups.map((group: CaseGroup) => group.pseudoCase.__id__) || []
      : dataSet.childCases().map(c => c.__id__)

    const formulaScope = new FormulaMathJsScope({
      localDataSet: dataSet,
      dataSets: this.dataSets,
      globalValueManager: this.globalValueManager,
      formulaAttrId: attributeId,
      formulaCollectionIndex: collectionIndex,
      childMostAggregateCollectionIndex,
      caseIds: casesToRecalculate.map(c => c.__id__),
      childMostCollectionCaseIds,
      caseGroupId: this.getCaseGroupMap(formulaId),
      caseChildrenCount: this.getCaseChildrenCountMap(formulaId)
    })

    let compiledFormula: EvalFunction
    try {
      compiledFormula = math.compile(formula.canonical)
    } catch (e: any) {
      return this.setFormulaError(formulaId, formulaError(e.message))
    }

    dataSet.setCaseValues(casesToRecalculate.map((c, idx) => {
      formulaScope.setCasePointer(idx)
      let formulaValue: FValue
      try {
        formulaValue = compiledFormula.evaluate(formulaScope)
        // This is necessary for functions like `prev` that need to know the previous result when they reference
        // its own attribute.
        formulaScope.savePreviousResult(formulaValue)
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
      const result: Record<string, string> = {}
      this.dataSets.forEach(dataSet => {
        dataSet.attributes.forEach(attr => {
          result[attr.formula.id] = attr.formula.display
        })
      })
      return result
    }, () => {
      // Register formulas. For simplicity, we unregister all formulas and register them again when canonical form is
      // updated. Note that even empty formulas are registered, so the metadata is always available when cycle detection
      // is executed.
      const updatedFormulas: string[] = []
      this.dataSets.forEach(dataSet => {
        dataSet.attributes.forEach(attr => {
          const metadata = this.formulaMetadata.get(attr.formula.id)
          if (!metadata || metadata.registeredDisplay !== attr.formula.display) {
            this.unregisterFormula(attr.formula.id)
            this.registerFormula(attr.formula, attr.id, dataSet)
            attr.formula.updateCanonicalFormula()
            if (!attr.formula.empty) {
              updatedFormulas.push(attr.formula.id)
            }
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
    }, { equals: comparer.structural, fireImmediately: true })
  }

  recalculateAllFormulas() {
    this.formulaMetadata.forEach((metadata, formulaId) => {
      this.recalculateFormula(formulaId)
    })
  }

  updateDisplayFormulas() {
    this.formulaMetadata.forEach(({ formula }) => {
      formula.updateDisplayFormula()
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
      registeredDisplay: formula.display,
      attributeId,
      dataSetId: dataSet.id,
      isInitialized: false
    }
    this.formulaMetadata.set(formula.id, formulaMetadata)
  }

  registerFormulaErrors(formulaId: string) {
    const { formula } = this.getFormulaContext(formulaId)

    if (formula.syntaxError) {
      this.setFormulaError(formulaId, formulaError("DG.Formula.SyntaxErrorMiddle", [ formula.syntaxError ]))
      return true
    }
    // Check if there is a dependency cycle. Note that it needs to happen after formula is registered, so that
    // the dependency check can access all the metadata in the formula registry.
    if (this.isDependencyCyclePresent(formulaId)) {
      this.setFormulaError(formulaId, formulaError("V3.formula.error.cycle"))
      return true
    }
    return false
  }

  setupFormulaObservers(formulaId: string) {
    const formulaMetadata = this.getFormulaMetadata(formulaId)
    const { formula } = formulaMetadata

    const formulaDependencies = getFormulaDependencies(formula.canonical, formulaMetadata.attributeId)
    const disposeLocalAttributeObserver = this.observeLocalAttributes(formulaId, formulaDependencies)
    const disposeGlobalValueObservers = this.observeGlobalValues(formulaId, formulaDependencies)
    const disposeLookupObservers = this.observeLookup(formulaId, formulaDependencies)

    this.formulaMetadata.set(formulaId, {
      ...formulaMetadata,
      dispose: () => {
        disposeLocalAttributeObserver()
        disposeGlobalValueObservers.forEach(disposeGlobalValObserver => disposeGlobalValObserver())
        disposeLookupObservers.forEach(disposeLookupObserver => disposeLookupObserver())
      },
    })
  }

  getDisplayNameMapForFormula(formulaId: string, options?: { useSafeSymbolNames: boolean }) {
    const { dataSet: localDataSet } = this.getFormulaContext(formulaId)
    const { useSafeSymbolNames } = options || { useSafeSymbolNames: true }

    const displayNameMap: DisplayNameMap = {
      localNames: {},
      dataSet: {}
    }

    const mapAttributeNames = (dataSet: IDataSet, prefix: string, _useSafeSymbolNames: boolean) => {
      const result: Record<string, string> = {}
      dataSet.attributes.forEach(attr => {
        result[_useSafeSymbolNames ? safeSymbolName(attr.name) : attr.name] = `${prefix}${attr.id}`
      })
      return result
    }

    displayNameMap.localNames = {
      ...mapAttributeNames(localDataSet, LOCAL_ATTR, useSafeSymbolNames),
      // caseIndex is a special name supported by formulas. It essentially behaves like a local data set attribute
      // that returns the current, 1-based index of the case in its collection group.
      caseIndex: `${LOCAL_ATTR}${CASE_INDEX_FAKE_ATTR_ID}`
    }

    this.globalValueManager?.globals.forEach(global => {
      const key = useSafeSymbolNames ? safeSymbolName(global.name) : global.name
      displayNameMap.localNames[key] = `${GLOBAL_VALUE}${global.id}`
    })

    this.dataSets.forEach(dataSet => {
      if (dataSet.name) {
        displayNameMap.dataSet[dataSet.name] = {
          id: dataSet.id,
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

  observeDatasetChanges(dataSet: IDataSet) {
    // When any collection is added or removed, or attribute is moved between collections,
    // we need to recalculate all formulas.
    const disposeAttrCollectionReaction = reaction(
      () => Object.fromEntries(dataSet.collections.map(c => [ c.id, c.attributes.map(a => a?.id) ])),
      () => this.recalculateAllFormulas(),
      {
        equals: comparer.structural,
        name: "FormulaManager.observeDatasetChanges.reaction [collections]"
      }
    )
    // When any attribute name is updated, we need to update display formulas. We could make this more granular,
    // and observe only dependant attributes, but it doesn't seem necessary for now.
    const disposeAttrNameReaction = reaction(
      () => dataSet.attrNameMap,
      () => this.updateDisplayFormulas(),
      {
        equals: comparer.structural,
        name: "FormulaManager.observeDatasetChanges.reaction [attrNameMap]"
      }
    )
    const dispose = () => {
      disposeAttrCollectionReaction()
      disposeAttrNameReaction()
    }
    this.dataSetMetadata.set(dataSet.id, { dispose })
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

  observeGlobalValues(formulaId: string, formulaDependencies: IFormulaDependency[]) {
    const globalValueDependencies =
      formulaDependencies.filter(d => d.type === "globalValue") as IGlobalValueDependency[]

    const disposeGlobalValueObservers = globalValueDependencies.map(dependency =>
      [
        // Recalculate formula when global value dependency is updated.
        reaction(
          () => this.globalValueManager?.getValueById(dependency.globalId)?.value,
          () => this.recalculateFormula(formulaId),
          { name: "FormulaManager.observeGlobalValues.reaction [globalValue]" }
        ),
        // Update display form of the formula when global value name is updated.
        reaction(
          () => this.globalValueManager?.getValueById(dependency.globalId)?.name,
          () => this.getFormulaContext(formulaId).formula.updateDisplayFormula(),
          { name: "FormulaManager.observeGlobalValues.reaction [globalValueName]" }
        ),
      ]
    ).flat()

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
