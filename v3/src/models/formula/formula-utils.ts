import { parse, MathNode, isFunctionNode } from "mathjs"
import {
  LOCAL_ATTR, GLOBAL_VALUE, DisplayNameMap, CanonicalNameMap, IFormulaDependency, isConstantStringNode,
  isNonFunctionSymbolNode, CANONICAL_NAME, CASE_INDEX_FAKE_ATTR_ID, isCanonicalName, rmCanonicalPrefix
} from "./formula-types"
import { typedFnRegistry } from "./functions/math"
import t from "../../utilities/translation/translate"
import type { IDataSet } from "../data/data-set"
import type{ IGlobalValueManager } from "../global/global-value-manager"

// Set of formula helpers that can be used outside FormulaManager context. It should make them easier to test.

export const formulaError = (message: string, vars?: string[]) => `❌ ${t(message, { vars })}`

// Currently, canonical names can be "basic": they can refer to local attributes or global values.
// Or they can be custom, like ones used by lookup functions. This helper parses basic canonical names.
export const parseBasicCanonicalName = (canonicalName: string): IFormulaDependency | undefined => {
  if (!isCanonicalName(canonicalName)) {
    return undefined
  }
  canonicalName = rmCanonicalPrefix(canonicalName)
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

export const unescapeBacktickString = (name: string) =>
  name.replace(/\\`/g, "`").replace(/\\\\/g, "\\")

export const escapeBacktickString = (name: string) =>
  name.replace(/\\/g, "\\\\").replace(/`/g, "\\`")

export const escapeDoubleQuoteString = (constant: string) =>
  constant.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

export const escapeSingleQuoteString = (constant: string) =>
  constant.replace(/\\/g, "\\\\").replace(/'/g, "\\'")

export const safeSymbolName = (name: string) =>
  name
    // Math.js does not allow to use symbols that start with a number, so we need to add a prefix.
    .replace(/^(\d+)/, '_$1')
    // We also need to escape all the symbols that are not allowed in Math.js.
    .replace(/[^a-zA-Z0-9_]/g, "_")


export const safeSymbolNameFromDisplayFormula = (name: string) =>
  // Replace escaped backslash and backticks in user-generated string with a single character, so they're not replaced
  // by two underscores by safeSymbolName.
  safeSymbolName(unescapeBacktickString(name))

export const makeDisplayNamesSafe = (formula: string) => {
  // Names between `` are symbols that require special processing, as otherwise they could not be parsed by Mathjs,
  // eg. names with spaces or names that start with a number. Also, it's necessary to ignore escaped backticks.
  return formula
    .replace(/(?<!\\)`((?:[^`\\]|\\.)+)`/g, (_, match) => safeSymbolNameFromDisplayFormula(match))
}

export const customizeDisplayFormula = (formula: string) => {
  // Over time, this function might grow significantly and require more advanced parsing of the formula.
  // Replace all the assignment operators with equality operators, as CODAP v2 uses a single "=" for equality check.
  return formula.replace(/(?<!!)=(?!=)/g, "==")
}

export const preprocessDisplayFormula = (formula: string) => customizeDisplayFormula(makeDisplayNamesSafe(formula))

export const localAttrIdToCanonical = (attrId: string) => `${CANONICAL_NAME}${LOCAL_ATTR}${attrId}`

export const globalValueIdToCanonical = (globalId: string) => `${CANONICAL_NAME}${GLOBAL_VALUE}${globalId}`

export const idToCanonical = (id: string) => `${CANONICAL_NAME}${id}`

export interface IDisplayNameMapOptions {
  localDataSet: IDataSet
  dataSets: Map<string, IDataSet>
  globalValueManager?: IGlobalValueManager
}

// useSafeSymbolNames should be set to false only when display map is generated to be reversed into canonical map.
export const getDisplayNameMap = (options: IDisplayNameMapOptions, useSafeSymbolNames = true) => {
  const { localDataSet, dataSets, globalValueManager } = options

  const displayNameMap: DisplayNameMap = {
    localNames: {},
    dataSet: {}
  }

  const nonEmptyName = (name: string) => name || "_empty_symbol_name_"

  const key = (name: string, _useSafeSymbolNames = useSafeSymbolNames) =>
    nonEmptyName(_useSafeSymbolNames ? safeSymbolName(name) : name)

  // When localNames are generated, the order of processing various sources of names is important.
  // The last last source would provide the final canonical name for the symbol. So, currently the global values
  // have the lowest priority, then local attributes, and finally the reserved symbols like `caseIndex`.
  globalValueManager?.globals.forEach(global => {
    displayNameMap.localNames[key(global.name)] = `${CANONICAL_NAME}${GLOBAL_VALUE}${global.id}`
  })

  localDataSet.attributes.forEach(attr => {
    displayNameMap.localNames[key(attr.name)] = localAttrIdToCanonical(attr.id)
  })

  // caseIndex is a special name supported by formulas. It essentially behaves like a local data set attribute
  // that returns the current, 1-based index of the case in its collection group.
  displayNameMap.localNames.caseIndex = localAttrIdToCanonical(CASE_INDEX_FAKE_ATTR_ID)

  dataSets.forEach(dataSet => {
    if (dataSet.name) {
      // No LOCAL_ATTR prefix is necessary for external attributes. They always need to be resolved manually by custom
      // mathjs functions (like "lookupByIndex"). Also, it's never necessary to use safe names, as these names
      // are string constants, not a symbols, so MathJS will not care about special characters there.
      const dataSetKey = key(dataSet.name, false)
      displayNameMap.dataSet[dataSetKey] = {
        id: idToCanonical(dataSet.id),
        attribute: {}
      }
      dataSet.attributes.forEach(attr => {
        displayNameMap.dataSet[dataSetKey].attribute[key(attr.name, false)] = idToCanonical(attr.id)
      })
    }
  })

  return displayNameMap
}

export const getCanonicalNameMap = (options: IDisplayNameMapOptions) => {
  const displayNameMap = getDisplayNameMap(options, false) // useSafeSymbolNames = false
  return reverseDisplayNameMap(displayNameMap)
}

export const reverseDisplayNameMap = (displayNameMap: DisplayNameMap): CanonicalNameMap => {
  return Object.fromEntries([
    ...Object.entries(displayNameMap.localNames).map(([attrName, attrId]) => [attrId, attrName]),
    ...Object.entries(displayNameMap.dataSet).map(([dataSetName, dataSet]) => [dataSet.id, dataSetName]),
    ...Object.entries(displayNameMap.dataSet).flatMap(([dataSetName, dataSet]) =>
      Object.entries(dataSet.attribute).map(([attrName, attrId]) => [attrId, attrName])
    )
  ])
}

// "Names" in formula can refer to symbols, constants or function names. Symbols and function names are easy, nothing
// special to do there. String constants become tricky, as MathJS parser stores only string constant, but it doesn't
// store the string delimiter. So we need to determine the original string delimiter, as it affects necessary escaping.
// It'd be easier if MathJS stored the string delimiter / kind of string constant, but currently it doesn't
// See: https://github.com/josdejong/mathjs/issues/3073#issuecomment-1758267336
export const formulaIndexOf = (formula: string, name: string, isStringConstant: boolean) => {
  if (!isStringConstant) {
    return { stringDelimiter: null, nameIndex: formula.indexOf(name), finalName: name }
  }
  const doubleQuoteString = `"${escapeDoubleQuoteString(name)}"`
  const singleQuoteString = `'${escapeSingleQuoteString(name)}'`
  const dQuoteIndex = formula.indexOf(doubleQuoteString)
  const sQuoteIndex = formula.indexOf(singleQuoteString)

  // We need to check both indices, as formula can contain both "foobar" and 'foobar'. In such case, we need to
  // pick the first one.
  if (dQuoteIndex >= 0 && (sQuoteIndex < 0 || dQuoteIndex < sQuoteIndex)) {
    return { stringDelimiter: '"', nameIndex: dQuoteIndex, finalName: doubleQuoteString }
  }
  if (sQuoteIndex >= 0 && (dQuoteIndex < 0 || sQuoteIndex < dQuoteIndex)) {
    return { stringDelimiter: "'", nameIndex: sQuoteIndex, finalName: singleQuoteString }
  }
  return { stringDelimiter: null, nameIndex: -1, finalName: name }
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
  const getDisplayNameFromSymbol = (name: string) => {
    if (isCanonicalName(name)) {
      if (!canonicalNameMap[name]) {
        // It'll happen when attribute has been deleted and it's no longer available.
        throw new Error("canonicalToDisplay: canonical name not found in canonicalNameMap")
      }
      return canonicalNameMap[name]
    }
    // Not a canonical symbol (e.g. regular string or math symbol like Pi).
    return name
  }
  // Wrap in backticks if it's not a (MathJS) safe symbol name.
  const wrapInBackticksIfNecessary = (name: string) => name !== safeSymbolName(name) ? `\`${name}\`` : name

  const namesToReplace: string[] = []
  const newNames: string[] = []
  const isStringConstantNode: boolean[] = []

  parse(originalDisplay).traverse((node: MathNode, path: string, parent: MathNode) => {
    if (isNonFunctionSymbolNode(node, parent)) {
      namesToReplace.push(node.name)
      isStringConstantNode.push(false)
    }
    if (isConstantStringNode(node)) {
      namesToReplace.push(node.value)
      isStringConstantNode.push(true)
    }
    if (isFunctionNode(node)) {
      namesToReplace.push(node.fn.name)
      isStringConstantNode.push(false)
    }
  })
  parse(canonical).traverse((node: MathNode, path: string, parent: MathNode) => {
    // Symbol with nonstandard characters need to be wrapped in backticks, while constants don't (as they're already
    // wrapped in string quotes).
    isNonFunctionSymbolNode(node, parent) && newNames.push(
      wrapInBackticksIfNecessary(escapeBacktickString(getDisplayNameFromSymbol(node.name)))
    )
    isConstantStringNode(node) && newNames.push(getDisplayNameFromSymbol(node.value))
    isFunctionNode(node) && newNames.push(node.fn.name)
  })

  let result = ""
  let formulaToProcess = originalDisplay
  while (newNames.length > 0) {
    const name = namesToReplace.shift()!
    const isStringConstant = isStringConstantNode.shift()!
    const { nameIndex, stringDelimiter, finalName } = formulaIndexOf(formulaToProcess, name, isStringConstant)
    if (nameIndex < 0) {
      throw new Error(`canonicalToDisplay: name ${name} not found in formula`)
    }
    let newName = newNames.shift()!
    if (stringDelimiter === "'") {
      newName = `'${escapeSingleQuoteString(newName)}'`
    }
    if (stringDelimiter === '"') {
      newName = `"${escapeDoubleQuoteString(newName)}"`
    }
    result += formulaToProcess.substring(0, nameIndex) + newName
    formulaToProcess = formulaToProcess.substring(nameIndex + finalName.length)
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
      const canonicalName = displayNameMap.localNames[node.name]
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
// defaultArg should be in a canonical form too.
export const getFormulaDependencies = (formulaCanonical: string, formulaAttributeId?: string, defaultArg?: string) => {
  const formulaTree = parse(formulaCanonical)
  interface IExtendedMathNode extends MathNode {
    isDescendantOfAggregateFunc?: boolean
    isSelfReferenceAllowed?: boolean
  }
  const defaultArgNode = defaultArg ? parse(defaultArg) : undefined
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
      const dependency = parseBasicCanonicalName(node.name)
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

    const functionInfo = isFunctionNode(node) && typedFnRegistry[node.fn.name]
    if (functionInfo) {
      // Some functions have special kind of dependencies that need to be calculated in a custom way
      // (eg. lookupByIndex, lookupByKey).
      if (functionInfo.getDependency) {
        const dependency = functionInfo.getDependency(node.args)
        if (dependency) {
          result.push(dependency)
        }
      }
      // When default argument is provided and the function has less arguments than required, we need to visit the
      // the default arg node so it can become a dependency.
      if (defaultArgNode && functionInfo.numOfRequiredArguments > node.args.length) {
        visitNode(defaultArgNode, "", node)
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
