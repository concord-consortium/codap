import { comparer, reaction } from "mobx"
import { mstReaction } from "../../utilities/mst-reaction"
import { onAnyAction } from "../../utilities/mst-utils"
import { BoundaryManager } from "../boundaries/boundary-manager"
import { IDataSet } from "../data/data-set"
import { SetCaseValuesAction } from "../data/data-set-actions"
import { ICase } from "../data/data-set-types"
import { IGlobalValueManager } from "../global/global-value-manager"
import {
  IFormulaDependency, ILocalAttributeDependency, ILookupDependency
} from "./formula-types"
import { CaseList } from "./formula-manager-types"

export const isAttrDefined = (dataSetCase: ICase, attributeId?: string) =>
  !!attributeId && Object.prototype.hasOwnProperty.call(dataSetCase, attributeId)

export const getLocalAttrCasesToRecalculate = (cases: ICase[], formulaDependencies: ILocalAttributeDependency[]) => {
  const regularAttrDeps = formulaDependencies.filter(d => d.type === "localAttribute" && !d.aggregate)
  const aggregateAttrDeps = formulaDependencies.filter(d => d.type === "localAttribute" && d.aggregate)

  return cases.some(c => aggregateAttrDeps.some(d => isAttrDefined(c, d.attrId)))
    ? "ALL_CASES"
    : cases.filter(c => regularAttrDeps.some(d => isAttrDefined(c, d.attrId)))
}

export const observeLocalAttributes = (formulaDependencies: IFormulaDependency[], localDataSet: IDataSet,
  recalculateCallback: (casesToRecalculate: CaseList) => void) => {
  const localAttrDependencies =
    formulaDependencies.filter(d => d.type === "localAttribute")

  // Observe local dataset items changes (add, remove, set aside, undo/redo)
  // The MobX reaction doesn't provide enough information to determine which cases need to be recalculated
  // in the absence of aggregate functions, but it works for addition, removal, set aside, undo/redo, etc.
  // If we needed to optimize the non-aggregate case, we could cache the items and then determine which ones
  // were added/removed ourselves, but it's not clear that it will be worth it.
  const disposeDatasetItemsObserver = mstReaction(
    // This recomputes all formulas when the order of items changes, which is only strictly necessary
    // for order-dependent functions like first, last, prev, next, etc., but we don't currently have
    // a way to track which formulas are order-dependent, so we just recalculate all of them.
    () => localDataSet.itemIdsOrderedHash,
    () => recalculateCallback("ALL_CASES"),
    { name: "FormulaObservers.itemsReaction" }, localDataSet
  )

  // Observe local dataset attribute value changes
  const disposeDatasetValuesObserver = onAnyAction(localDataSet, mstAction => {
    let casesToRecalculate: CaseList = []
    switch (mstAction.name) {
      case "setCaseValues": {
        // Recalculate cases with dependency attribute updated.
        const cases = (mstAction as SetCaseValuesAction).args[0] || []
        casesToRecalculate = getLocalAttrCasesToRecalculate(cases, localAttrDependencies)
        break
      }
      default:
        break
    }

    if (casesToRecalculate.length > 0) {
      recalculateCallback(casesToRecalculate)
    }
  })

  return () => {
    disposeDatasetItemsObserver()
    disposeDatasetValuesObserver()
  }
}

export const getLookupCasesToRecalculate = (cases: ICase[], dependency: ILookupDependency) => {
  console.log(`--- cases`, cases)
  console.log(` -- dependency`, dependency)
  return cases.some(c => isAttrDefined(c, dependency.attrId) || isAttrDefined(c, dependency.otherAttrId))
    ? "ALL_CASES" : []
}

export const observeLookupDependencies = (formulaDependencies: IFormulaDependency[], dataSets: Map<string, IDataSet>,
  recalculateCallback: (casesToRecalculate: CaseList) => void) => {
  const lookupDependencies: ILookupDependency[] =
    formulaDependencies.filter(d => d.type === "lookup")

  const disposeLookupObserver = lookupDependencies.map(dependency => {
    const externalDataSet = dataSets.get(dependency.dataSetId)
    if (!externalDataSet) {
      return
    }
    return onAnyAction(externalDataSet, mstAction => {
      let casesToRecalculate: CaseList = []
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
          casesToRecalculate = getLookupCasesToRecalculate(cases, dependency)
          break
        }
        default:
          break
      }

      if (casesToRecalculate.length > 0) {
        recalculateCallback(casesToRecalculate)
      }
    })
  })

  return () => disposeLookupObserver.forEach(dispose => dispose?.())
}

export const observeBoundaries = (formulaDependencies: IFormulaDependency[],
  boundaryManager: BoundaryManager | undefined, recalculateCallback: (casesToRecalculate: CaseList) => void) => {
  const boundaryDependencies = formulaDependencies.filter(d => d.type === "boundary")
  const disposeBoundaryObserver = boundaryDependencies.map(dependency =>
    // Recalculate formula when boundary dependency is updated.
    reaction(
      () => boundaryManager?.hasBoundaryData(dependency.boundarySet),
      () => recalculateCallback("ALL_CASES"),
      { name: "observeBoundaries reaction"  }
    )
  )
  return () => disposeBoundaryObserver.forEach(dispose => dispose())
}

export const observeGlobalValues = (formulaDependencies: IFormulaDependency[],
  globalValueManager: IGlobalValueManager | undefined, recalculateCallback: (casesToRecalculate: CaseList) => void) => {
  const globalValueDependencies = formulaDependencies.filter(d => d.type === "globalValue")
  const disposeGlobalValueObserver = globalValueDependencies.map(dependency =>
    // Recalculate formula when global value dependency is updated.
    reaction(
      () => globalValueManager?.getValueById(dependency.globalId)?.value,
      () => recalculateCallback("ALL_CASES"),
      { name: "observeGlobalValues reaction"  }
    )
  )
  return () => disposeGlobalValueObserver.forEach(dispose => dispose())
}

export const observeSymbolNameChanges = (dataSets: Map<string, IDataSet>,
  globalValueManager: IGlobalValueManager | undefined, nameUpdateCallback: () => void) => {
  // When any attribute name is updated, we need to update display formulas. We could make this more granular,
  // and observe only dependant attributes, but it doesn't seem necessary for now.
  const disposeAttrNameReaction = reaction(
    () => Array.from(dataSets.values()).map(ds => ds.attrNameMap.toJSON()),
    () => nameUpdateCallback(),
    {
      equals: comparer.structural,
      name: "observeSymbolNameChanges attribute name reaction"
    }
  )
  const disposeGlobalValueManagerReaction = reaction(
    () => Array.from(globalValueManager?.globals.values() || []).map(g => g.name),
    () => nameUpdateCallback(),
    {
      equals: comparer.structural,
      name: "observeSymbolNameChanges global value name reaction"
    }
  )

  return () => {
    disposeAttrNameReaction()
    disposeGlobalValueManagerReaction()
  }
}

export const observeDatasetHierarchyChanges = (dataSet: IDataSet,
  recalculateCallback: (casesToRecalculate?: CaseList) => void) => {
  // When any collection is added or removed, or attribute is moved between collections,
  // we need to recalculate the formula.
  const disposeAttrCollectionReaction = reaction(
    () => Object.fromEntries(dataSet.collections.map(c => [ c.id, c.attributes.map(a => a?.id) ])),
    () => recalculateCallback("ALL_CASES"),
    {
      equals: comparer.structural,
      name: "observeDatasetHierarchyChanges dataset collections reaction"
    }
  )

  return disposeAttrCollectionReaction
}
