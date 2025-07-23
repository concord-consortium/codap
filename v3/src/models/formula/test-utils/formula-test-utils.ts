import { IDataSet as IFormulaDataSet } from "@concord-consortium/codap-formulas/models/data/data-set"
import {
  IGlobalValueManager as IFormulaGlobalValueManager
} from "@concord-consortium/codap-formulas/models/global/global-value-manager"
import { getDisplayNameMap } from "@concord-consortium/codap-formulas/models/formula/utils/name-mapping-utils"
import { displayToCanonical } from "@concord-consortium/codap-formulas/models/formula/utils/canonicalization-utils"
import { boundaryManager } from "../../boundaries/boundary-manager"
import { createCodapDocument } from "../../codap/create-codap-document"
import { IDataSet } from "../../data/data-set"
import { getGlobalValueManager } from "../../global/global-value-manager"
import { getSharedDataSets } from "../../shared/shared-data-utils"
import { getSharedModelManager } from "../../tiles/tile-environment"
import { FormulaMathJsScope, IFormulaMathjsScopeContext } from "../formula-mathjs-scope"
import { math } from "../functions/math"
import testDoc from "./test-doc.json"

// Because formulas largely depend on the document context and data structures, it's not trivial to mock them in each
// unit test. Therefore, these helpers are provided to make it easier to write tests for formulas.

// They are based on test-doc.json, which has the following structure:
// - Mammals (data set)
// - Cats (data set)
// - v1 slider / global value with a value of 0.5
// - v2 slider / global value with a value of 2

// While it may be opinionated and potentially more than most unit tests require, I believe that working
// with real data is preferable to mocking it every time. Coming up with values that make sense for each particular
// test file is a task in itself, and these helpers can significantly reduce that effort. Even the test expressions are
// easier to validate when they are based on real data. Additionally, test-file.json can be opened in a browser, and
// results can be easily compared or inspected. It's also possible to replicate the same document in V2 by dragging the
// 'mammals.csv' and 'cats.csv' CSV files from the 'sample-data' directory into CODAP V2 workspace and adding two
// sliders.

export const getFormulaTestEnv = () => {
  const doc = createCodapDocument(testDoc as any)
  const dataSets = getSharedDataSets(doc).map(sharedDs => sharedDs.dataSet)

  const mammals = dataSets.find(dataSet => dataSet.name === "Mammals")
  if (!mammals) {
    throw new Error("Mammals data set not found in testdoc.json")
  }
  const cats = dataSets.find(dataSet => dataSet.name === "Cats")
  if (!cats) {
    throw new Error("Cats data set not found in testdoc.json")
  }
  return {
    dataSetsByName: {
      Mammals: mammals as IFormulaDataSet,
      Cats: cats as IFormulaDataSet,
    },
    boundaryManager,
    globalValueManager: getGlobalValueManager(getSharedModelManager(doc)) as IFormulaGlobalValueManager,
    dataSets: new Map(dataSets.map(dataSet => [dataSet.id, dataSet as IFormulaDataSet])),
  }
}

// When casePointer is provided, evaluation will support case-dependant formulas.
export const evaluate = (displayFormula: string, casePointer?: number) => {
  const { dataSetsByName, dataSets, globalValueManager } = getFormulaTestEnv()
  const localDataSet = dataSetsByName.Mammals
  const caseIds = localDataSet.items.map(c => c.__id__)
  const scope = new FormulaMathJsScope({
    localDataSet,
    dataSets,
    boundaryManager,
    globalValueManager,
    caseIds: casePointer !== undefined ? caseIds : undefined,
    childMostCollectionCaseIds: caseIds
  })
  if (casePointer !== undefined) {
    scope.setCasePointer(casePointer)
  }
  const displayNameMap = getDisplayNameMap({
    localDataSet,
    dataSets,
    boundaryManager,
    globalValueManager
  })
  const formula = displayToCanonical(displayFormula, displayNameMap)
  return math.evaluate(formula, scope)
}

export interface IEvaluateForAllCasesOptions {
  formulaAttrName?: string
  // can modify the data set and return additional context to be passed to the scope
  amendContext?: (data: IFormulaDataSet) => Partial<IFormulaMathjsScopeContext>
}

export const evaluateForAllCases = (displayFormula: string, options?: IEvaluateForAllCasesOptions) => {
  const { formulaAttrName, amendContext } = options || {}
  const { dataSetsByName, dataSets, globalValueManager } = getFormulaTestEnv()
  const localDataSet = dataSetsByName.Mammals
  const amendments = amendContext?.(localDataSet)
  const caseIds = localDataSet.items.map(c => c.__id__)
  const formulaAttrId = formulaAttrName ? localDataSet.attrIDFromName(formulaAttrName) : undefined
  const formulaCollectionIndex = formulaAttrId
                                  ? (localDataSet as IDataSet).getCollectionIndexForAttribute(formulaAttrId)
                                  : undefined
  const scope = new FormulaMathJsScope({
    localDataSet,
    dataSets,
    boundaryManager,
    globalValueManager,
    caseIds,
    childMostCollectionCaseIds: caseIds,
    formulaAttrId,
    formulaCollectionIndex,
    ...amendments
  })

  const displayNameMap = getDisplayNameMap({
    localDataSet,
    dataSets,
    boundaryManager,
    globalValueManager
  })
  const formula = displayToCanonical(displayFormula, displayNameMap)
  const compiledFormula = math.compile(formula)

  return caseIds.map((caseId, idx) => {
    scope.setCasePointer(idx)
    const formulaValue = compiledFormula.evaluate(scope)
    scope.savePreviousResult(formulaValue)
    return formulaValue
  })
}
