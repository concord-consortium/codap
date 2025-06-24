import { TreeCursor } from "@lezer/common"
import { parse, MathNode, isFunctionNode } from "mathjs"
import { DisplayNameMap, CanonicalNameMap } from "../formula-types"
import { typedFnRegistry } from "../functions/math"
import { parser } from "../lezer/parser"
import { isCanonicalName, safeSymbolName } from "./name-mapping-utils"
import { isConstantStringNode, isNonFunctionSymbolNode } from "./mathjs-utils"
import {
  escapeBacktickString, escapeDoubleQuoteString, escapeSingleQuoteString, unescapeBacktickString
} from "./string-utils"

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

interface IReplacement {
  from: number
  to: number
  replacement: string
}

type CustomizationFn = (formula: string, cursor: TreeCursor) => Maybe<IReplacement>

const customizations: Record<string, CustomizationFn> = {
  ArithOp: (formula, cursor) => {
    const nodeText = formula.substring(cursor.from, cursor.to)
    const replaceMap: Record<string, string> = {
      "×": "*",
      "÷": "/"
    }
    const replacement = replaceMap[nodeText]
    return replacement ? { from: cursor.from, to: cursor.to, replacement } : undefined
  },
  BlockComment: (formula, cursor) => {
    // replace comments with a single space
    return { from: cursor.from, to: cursor.to, replacement: " " }
  },
  CompareOp: (formula, cursor) => {
    const nodeText = formula.substring(cursor.from, cursor.to)
    const replaceMap: Record<string, string> = {
      "=": "==",
      "≠": "!=",
      "≤": "<=",
      "≥": ">="
    }
    const replacement = replaceMap[nodeText]
    return replacement ? { from: cursor.from, to: cursor.to, replacement } : undefined
  },
  LineComment: (formula, cursor) => {
    // replace comments with a single space
    return { from: cursor.from, to: cursor.to, replacement: " " }
  },
  LogicOp: (formula, cursor) => {
    const nodeText = formula.substring(cursor.from, cursor.to)
    const replaceMap: Record<string, string> = {
      "&": "and",
      "AND": "and",
      "|": "or",
      "OR": "or"
    }
    const replacement = replaceMap[nodeText]
    return replacement ? { from: cursor.from, to: cursor.to, replacement } : undefined
  },
  VariableName: (formula, cursor) => {
    const nodeText = formula.substring(cursor.from, cursor.to)
    const replaceMap: Record<string, string> = {
      "π": "pi",
      "∞": "Infinity"
    }
    const replacement = replaceMap[nodeText]
    return replacement ? { from: cursor.from, to: cursor.to, replacement } : undefined
  }
}

export const customizeDisplayFormula = (formula: string) => {
  // use lezer parser to parse the formula for canonicalization
  const tree = parser.parse(formula)
  const replacements: IReplacement[] = []
  let hasNext = tree != null
  // identify required string replacements
  for (let cursor = tree.cursor(); hasNext; hasNext = cursor.next()) {
    const replacement = customizations[cursor.type.name]?.(formula, cursor)
    if (replacement) replacements.push(replacement)
  }
  // sort replacements so they are applied back-to-front
  replacements.sort((a, b) => b.from - a.from)
  // apply replacements
  replacements.forEach(({ from, to, replacement }) => {
    formula = formula.substring(0, from) + replacement + formula.substring(to)
  })
  // replace EOL chars with spaces
  return formula.replace(/[\n\r]+/g, " ")
}

export const preprocessDisplayFormula = (formula: string) => customizeDisplayFormula(makeDisplayNamesSafe(formula))

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
