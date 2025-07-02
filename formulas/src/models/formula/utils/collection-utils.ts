import { getFormulaDependencies } from "./formula-dependency-utils"
import type { IDataSet } from "../../data/data-set"

// Set of utility functions for working with formulas that support concept of hierarchical data (attribute formulas).

export const getExtremeCollectionDependency =
  (formulaCanonical: string, dataSet: IDataSet, options: { order: "max" | "min", aggregate: boolean }) => {
  const dependencies = getFormulaDependencies(formulaCanonical)
  const startValue = options.order === "max" ? -Infinity : Infinity
  const compareFn = options.order === "max" ? (a: number, b: number) => a > b : (a: number, b: number) => a < b
  let extremeCollectionIndex = startValue
  let extremeAttrId: string | null = null
  for (const dep of dependencies) {
    if (dep.type === "localAttribute" && !!dep.aggregate === options.aggregate) {
      const depCollectionId = dataSet.getCollectionForAttribute(dep.attrId)?.id
      const depCollectionIndex = dataSet.getCollectionIndex(depCollectionId || "")
      if (compareFn(depCollectionIndex, extremeCollectionIndex)) {
        extremeCollectionIndex = depCollectionIndex
        extremeAttrId = dep.attrId
      }
    }
  }
  return extremeAttrId
}

// This function returns the index of the child collection that contains the cases required for evaluating the given
// formula. If the formula should only be evaluated against cases from its own collection, it returns `null`.
// In practice, the formula needs to be evaluated against cases from child collections only in scenarios where it
// contains aggregate functions. In such cases, the formula needs to be evaluated for cases in the child-most collection
// that contains one of the arguments used in the aggregate functions.
export const getFormulaChildMostAggregateCollectionIndex = (formulaCanonical: string, dataSet: IDataSet) => {
  const attrId = getExtremeCollectionDependency(formulaCanonical, dataSet, { order: "max", aggregate: true })
  const collectionId = dataSet.getCollectionForAttribute(attrId || "")?.id
  const collectionIndex = dataSet.getCollectionIndex(collectionId || "")
  return collectionIndex >= 0 ? collectionIndex : null
}

export const getIncorrectParentAttrReference =
  (formulaCanonical: string, formulaCollectionIndex: number, dataSet: IDataSet) => {
  const attrId = getExtremeCollectionDependency(formulaCanonical, dataSet, { order: "min", aggregate: true })
  const collectionId = dataSet.getCollectionForAttribute(attrId || "")?.id
  const collectionIndex = dataSet.getCollectionIndex(collectionId || "")
  if (collectionIndex >= 0 && collectionIndex < formulaCollectionIndex) {
    return attrId
  }
  return false
}

export const getIncorrectChildAttrReference =
  (formulaCanonical: string, formulaCollectionIndex: number, dataSet: IDataSet) => {
  const attrId = getExtremeCollectionDependency(formulaCanonical, dataSet, { order: "max", aggregate: false })
  const collectionId = dataSet.getCollectionForAttribute(attrId || "")?.id
  const collectionIndex = dataSet.getCollectionIndex(collectionId || "")
  if (collectionIndex >= 0 && collectionIndex > formulaCollectionIndex) {
    return attrId
  }
  return false
}
