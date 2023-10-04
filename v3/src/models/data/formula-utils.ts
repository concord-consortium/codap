import { parse, MathNode, isFunctionNode } from "mathjs"
import {
  LOCAL_ATTR, GLOBAL_VALUE, DisplayNameMap, CanonicalNameMap, IFormulaDependency, isConstantStringNode,
  isNonFunctionSymbolNode,
} from "./formula-types"
import { typedFnRegistry } from "./formula-fn-registry"
import type { IDataSet } from "./data-set"
import t from "../../utilities/translation/translate"

// Set of formula helpers that can be used outside FormulaManager context. It should make them easier to test.

export const formulaError = (message: string, vars?: string[]) => `❌ ${t(message, { vars })}`

export const generateCanonicalSymbolName = (name: string, displayNameMap: DisplayNameMap) =>
  displayNameMap.localNames[name] || null

export const parseCanonicalSymbolName = (canonicalName: string): IFormulaDependency | undefined => {
  if (canonicalName.startsWith(LOCAL_ATTR)) {
    const attrId = canonicalName.substring(LOCAL_ATTR.length)
    return { type: "localAttribute", attrId }
  }
  if (canonicalName.startsWith(GLOBAL_VALUE)) {
    const globalId = canonicalName.substring(GLOBAL_VALUE.length)
    return { type: "globalValue", globalId }
  }
  return undefined
}

export const unescapeCharactersInSafeSymbolName = (name: string) =>
  name.replace(/\\`/g, "`").replace(/\\\\/g, "\\")

export const escapeCharactersInSafeSymbolName = (name: string) =>
  name.replace(/\\/g, "\\\\").replace(/`/g, "\\`")

export const safeSymbolName = (name: string, unescape = false) => {
  if (unescape) {
    // Replace escaped backslash and backticks with a single character, so they're not replaced by two underscores.
    name = unescapeCharactersInSafeSymbolName(name)
  }
  return name
    // Math.js does not allow to use symbols that start with a number, so we need to add a prefix.
    .replace(/^(\d+)/, '_$1')
    // We also need to escape all the symbols that are not allowed in Math.js.
    .replace(/[^a-zA-Z0-9_]/g, "_")
}

export const makeDisplayNamesSafe = (formula: string) => {
  // Names between `` are symbols that require special processing, as otherwise they could not be parsed by Mathjs,
  // eg. names with spaces or names that start with a number. Also, it's necessary to ignore escaped backticks.
  return formula
    .replace(/(?<!\\)`((?:[^`\\]|\\.)+)`/g, (_, match) => safeSymbolName(match, true))
}

export const customizeDisplayFormula = (formula: string) => {
  // Over time, this function might grow significantly and require more advanced parsing of the formula.
  // Replace all the assignment operators with equality operators, as CODAP v2 uses a single "=" for equality check.
  return formula.replace(/(?<!!)=(?!=)/g, "==")
}

export const preprocessDisplayFormula = (formula: string) => customizeDisplayFormula(makeDisplayNamesSafe(formula))

export const reverseDisplayNameMap = (displayNameMap: DisplayNameMap): CanonicalNameMap => {
  return Object.fromEntries([
    ...Object.entries(displayNameMap.localNames).map(([attrName, attrId]) => [attrId, attrName]),
    ...Object.entries(displayNameMap.dataSet).map(([dataSetName, dataSet]) => [dataSet.id, dataSetName]),
    ...Object.entries(displayNameMap.dataSet).flatMap(([dataSetName, dataSet]) =>
      Object.entries(dataSet.attribute).map(([attrName, attrId]) => [attrId, attrName])
    )
  ])
}

export const canonicalToDisplay = (canonical: string, originalDisplay: string, canonicalNameMap: CanonicalNameMap) => {
  // Algorithm is as follows:
  // 1. Parse original display formula and get all the names that need to be replaced.
  // 2. Parse canonical formula and get all the names that will replace the original names.
  // 3. Replace the names in the original formula with the new names, one by one in order.
  // This will guarantee that we maintain white spaces and other formatting in the original formula.
  // Note that by names we mean symbols, constants and function names. Function names and constants are necessary, as
  // function names and constants might be identical to the symbol name. E.g. 'mean(mean) + "mean"' is a valid formula
  // if there's attribute called "mean". If we process function names and constants, it'll be handled correctly.
  originalDisplay = makeDisplayNamesSafe(originalDisplay) // so it can be parsed by MathJS
  const getNameFromId = (id: string, wrapInBackTicks: boolean) => {
    let name = canonicalNameMap[id]
    // Wrap in backticks if it's not a (MathJS) safe symbol name.
    if (wrapInBackTicks && name && name !== safeSymbolName(name)) {
      // Escape special characters in the name. It reverses the process done by safeSymbolName.
      name = escapeCharactersInSafeSymbolName(name)
      // Finally, wrap in backticks.
      name = `\`${name}\``
    }
    return name || id
  }
  const namesToReplace: string[] = []
  const newNames: string[] = []

  parse(originalDisplay).traverse((node: MathNode, path: string, parent: MathNode) => {
    isNonFunctionSymbolNode(node, parent) && namesToReplace.push(node.name)
    isConstantStringNode(node) && namesToReplace.push(node.value)
    isFunctionNode(node) && namesToReplace.push(node.fn.name)
  })
  parse(canonical).traverse((node: MathNode, path: string, parent: MathNode) => {
    // Symbol with nonstandard characters need to be wrapped in backticks, while constants don't (as they're already
    // wrapped in string quotes).
    isNonFunctionSymbolNode(node, parent) && newNames.push(getNameFromId(node.name, true))
    isConstantStringNode(node) && newNames.push(getNameFromId(node.value, false))
    isFunctionNode(node) && newNames.push(node.fn.name)
  })

  let result = ""
  let formulaToProcess = originalDisplay
  while (newNames.length > 0) {
    const name = namesToReplace.shift()!
    const newName = newNames.shift()!
    const nameIndex = formulaToProcess.indexOf(name)
    if (nameIndex < 0) {
      throw new Error(`canonicalToDisplay: name ${name} not found in formula`)
    }
    result += formulaToProcess.substring(0, nameIndex) + newName
    formulaToProcess = formulaToProcess.substring(nameIndex + name.length)
  }
  return result + formulaToProcess
}

export const ifSelfReference = (dependency?: IFormulaDependency, formulaAttributeId?: string) =>
  formulaAttributeId && dependency?.type === "localAttribute" && dependency.attrId === formulaAttributeId

// Function replaces all the symbol names typed by user (display names) with the symbol canonical names that
// can be resolved by formula context and do not rely on user-based display names.
export const displayToCanonical = (displayExpression: string, displayNameMap: DisplayNameMap) => {
  const formulaTree = parse(preprocessDisplayFormula(displayExpression))
  const visitNode = (node: MathNode, path: string, parent: MathNode) => {
    if (isNonFunctionSymbolNode(node, parent)) {
      const canonicalName = generateCanonicalSymbolName(node.name, displayNameMap)
      if (canonicalName) {
        node.name = canonicalName
      }
    }
    // Some functions have special kind of dependencies that need to be canonicalized in a custom way
    // (eg. lookupByIndex, lookupByKey).
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]) {
      // Note that parseArguments will modify args array in place, because we're passing canonicalizeWith option.
      typedFnRegistry[node.fn.name].canonicalize?.(node.args, displayNameMap)
    }
  }
  formulaTree.traverse(visitNode)
  return formulaTree.toString()
}

export const isRandomFunctionPresent = (formulaCanonical: string) => {
  const formulaTree = parse(formulaCanonical)
  let result = false
  const visitNode = (node: MathNode) => {
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.isRandomFunction) {
      result = true
    }
  }
  formulaTree.traverse(visitNode)
  return result
}

// When formulaAttributeId is provided, dependencies will not include self references for functions that allow that.
// In practice, it's only prev() at the moment. Self-reference is sometimes used in V2 to calculate cumulative value.
export const getFormulaDependencies = (formulaCanonical: string, formulaAttributeId?: string) => {
  const formulaTree = parse(formulaCanonical)

  interface IExtendedMathNode extends MathNode {
    isDescendantOfAggregateFunc?: boolean
    isSelfReferenceAllowed?: boolean
  }
  const result: IFormulaDependency[] = []
  const visitNode = (node: IExtendedMathNode, path: string, parent: IExtendedMathNode) => {
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.isAggregate || parent?.isDescendantOfAggregateFunc) {
      node.isDescendantOfAggregateFunc = true
    }
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.isSemiAggregate) {
      // Current semi-aggregate functions usually have the following signature:
      // fn(expression, defaultValue, filter)
      // Symbols used in `expression` and `filter` arguments should be treated as aggregate symbols.
      // In this case, `isSemiAggregate` would be equal to [true, false, true].
      typedFnRegistry[node.fn.name].isSemiAggregate?.forEach((isAggregateArgument, index) => {
        if (node.args[index] && isAggregateArgument) {
          (node.args[index] as IExtendedMathNode).isDescendantOfAggregateFunc = true
        }
      })
    }
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]?.selfReferenceAllowed || parent?.isSelfReferenceAllowed) {
      node.isSelfReferenceAllowed = true
    }
    const isDescendantOfAggregateFunc = !!node.isDescendantOfAggregateFunc
    const isSelfReferenceAllowed = !!node.isSelfReferenceAllowed
    if (isNonFunctionSymbolNode(node, parent)) {
      const dependency = parseCanonicalSymbolName(node.name)
      if (dependency?.type === "localAttribute" && isDescendantOfAggregateFunc) {
        dependency.aggregate = true
      }
      const isSelfReference = ifSelfReference(dependency, formulaAttributeId)
      // Note that when self reference is allowed, we should NOT add the attribute to the dependency list.
      // This would create cycle in observers and trigger an error even earlier, when we check for this scenario.
      if (dependency && (!isSelfReference || !isSelfReferenceAllowed)) {
        result.push(dependency)
      }
    }
    // Some functions have special kind of dependencies that need to be calculated in a custom way
    // (eg. lookupByIndex, lookupByKey).
    if (isFunctionNode(node) && typedFnRegistry[node.fn.name]) {
      const dependency = typedFnRegistry[node.fn.name].getDependency?.(node.args)
      if (dependency) {
        result.push(dependency)
      }
    }
  }
  formulaTree.traverse(visitNode)
  return result
}

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
