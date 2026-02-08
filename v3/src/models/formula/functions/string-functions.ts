import escapeStringRegexp from "escape-string-regexp"
import type { MathNode } from "mathjs"
import { valueToString } from "../../../utilities/data-utils"
import { t } from "../../../utilities/translation/translate"
import { CurrentScope, DisplayNameMap, FValue, ILookupDependency, LookupStringConstantArg } from "../formula-types"
import { isConstantStringNode } from "../utils/mathjs-utils"
import { rmCanonicalPrefix } from "../utils/name-mapping-utils"
import { unescapeBacktickString } from "../utils/string-utils"
import { evaluateNode, getRootScope } from "./function-utils"

type TWordListMatchesArgs = [MathNode, LookupStringConstantArg, LookupStringConstantArg, Maybe<LookupStringConstantArg>]

export const stringFunctions = {
  // beginsWith(text, prefix) Returns true if text begins with prefix, otherwise false.
  beginsWith: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const text = valueToString(args[0]), prefix = valueToString(args[1])
      if (!prefix) return true
      if (!text) return false
      return text.indexOf(prefix) === 0
    }
  },
  // charAt(text, index) Returns the character at the specified 1-based index in the text.
  charAt: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const text = valueToString(args[0]), index = Number(args[1])
      if (!Number.isInteger(index)) {
        throw new Error(t("DG.Formula.TypeError.description", { vars: [ index ] }))
      }
      return text.charAt(index - 1) // 1-based index for CODAP string functions
    }
  },
  // combine(text) Returns the concatenation of text all the values of the attribute. This is an aggregate function.
  combine: {
    numOfRequiredArguments: 1,
    evaluate: (...args: FValue[]) => {
      // todo: Implement this function
      return "NYI"
    }
  },
  // concat(string1, string2, …) Returns a string that is the concatenation of the string arguments.
  // If 0 arguments are given, the result is the empty string. If 1 argument is given, the result is that argument.
  concat: {
    numOfRequiredArguments: 0,
    evaluate: (...args: FValue[]) => {
      return args.map(valueToString).join("")
    }
  },
  // endsWith(text, suffix) Returns true if text ends with suffix, otherwise false.
  endsWith: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const text = valueToString(args[0]), suffix = valueToString(args[1])
      if (!suffix) return true
      if (!text) return false
      return text.endsWith(suffix)
    }
  },
  // findString(stringToLookIn, stringToFind, start) Takes three arguments, returning the position of
  // stringToFind in stringToLookIn starting from start. The first character of stringToLookIn is numbered 1.
  // Returns 0 if stringToFind is not found. The third argument need not be present and defaults to 1.
  findString: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      const stringToLookIn = valueToString(args[0]),
        stringToFind = valueToString(args[1]),
        start = Number(args[2]) || 1
      if (!Number.isInteger(start)) {
        throw new Error(t("DG.Formula.TypeError.description", { vars: [ start ] }))
      }
      return stringToLookIn.indexOf(stringToFind, start - 1) + 1
    }
  },
  // includes(stringToLookIn, stringToFind) Takes two arguments and returns true if the second argument
  // is a substring of the first (also treated as a string).
  includes: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const stringToLookIn = valueToString(args[0]),
        stringToFind = valueToString(args[1])
      return stringToLookIn.includes(stringToFind)
    }
  },
  // join(delimiter, string1, string2, …) Returns the string formed by concatenating its string arguments, each
  // separated by its delimiter argument.
  join: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const delimiter = valueToString(args[0])
      return args.slice(1).map(valueToString).join(delimiter)
    }
  },
  // patternMatches(stringToLookIn, pattern) Returns the number of times in string_to_look_in the string or
  // regular expression represented by pattern occurs. The search is case-insensitive.
  patternMatches: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const stringToLookIn = valueToString(args[0]),
        pattern = valueToString(args[1])
      // TODO We should really run escapeStringRegexp on the pattern we receive for security reasons,
      // but that won't work for patterns received from the StoryQ plugin. We need to reconcile this.
      // FWIW v2 does no processing on patterns it receives.
      const matches = stringToLookIn.match(new RegExp(unescapeBacktickString(pattern), "gmi"))
      return (matches || []).length
    }
  },
  // repeatString(aString, numRepetitions) Takes two arguments, the first a string and the second an integer ≥ 0.
  // Returns the result of concatenating aString numRepetitions times.
  repeatString: {
    numOfRequiredArguments: 2,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0]),
        numRepetitions = Number(args[1])
      if (!Number.isInteger(numRepetitions)) {
        throw new Error(t("DG.Formula.TypeError.description", { vars: [ numRepetitions ] }))
      }
      return aString.repeat(numRepetitions)
    }
  },
  // replaceChars(aString, start, numChars, substituteString) Takes four arguments. The first is the original string.
  // The second is an integer > 0 specifying the starting location for the substitution. The third is the number of
  // characters to be replaced, and the last is the string that is to be substituted.
  // If numChars is 0, substituteString is inserted.
  replaceChars: {
    numOfRequiredArguments: 4,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0]),
        start = Number(args[1]),
        numChars = Number(args[2]),
        substituteString = valueToString(args[3])
      if (!Number.isInteger(start) || start < 0) {
        throw new Error(t("DG.Formula.TypeError.description", { vars: [ start ] }))
      }
      if (!Number.isInteger(numChars) || numChars < 0) {
        throw new Error(t("DG.Formula.TypeError.description", { vars: [ numChars ] }))
      }
      return aString.substring(0, start - 1) + substituteString + aString.substring(start + numChars - 1)
    }
  },
  // replaceString(aString, stringToFind, substituteString) Takes three string arguments and substitutes the third
  // for all occurrences of the second in the first.
  replaceString: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0]),
        stringToFind = valueToString(args[1]),
        substituteString = valueToString(args[2])
      return aString.replace(new RegExp(escapeStringRegexp(stringToFind), "g"), substituteString)
    }
  },
  // sortItems(aString, delimiter) Treats the given string as a list. The default delimiter is ','.
  // The returned string has the items in the list in sorted order.
  // If the delimiter is '', the characters of the given string are sorted.
  // Spaces between items are ignored except so far as they are part of the delimiter.
  sortItems: {
    numOfRequiredArguments: 1,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0]),
        rawDelimiter = args[1],
        delimiter = rawDelimiter === undefined ? "," : valueToString(rawDelimiter)
      if (delimiter === "") {
        return aString.split("").sort().join("")
      } else {
        // split by delimiter, sort, trim and join by delimiter
        return aString.split(delimiter).map(item => item.trim()).sort().join(delimiter)
      }
    }
  },
  // split(aString, separator, index) Returns the string formed by splitting a string by the specified separator
  // and then returning the element at the specified index.
  split: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0]),
        separator = valueToString(args[1]),
        index = Number(args[2])
      if (!Number.isInteger(index)) {
        throw new Error(t("DG.Formula.TypeError.description", { vars: [ index ] }))
      }
      return aString.split(separator)[index - 1]
    }
  },
  // stringLength(aString) Returns the number of characters in the string representation of the argument.
  stringLength: {
    numOfRequiredArguments: 1,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0])
      return aString.length
    }
  },
  // subString(string, position, length) Returns a substring of the specified string, determined by its position
  // and length arguments.
  subString: {
    numOfRequiredArguments: 3,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0]),
        position = Number(args[1]),
        length = Number(args[2])
      if (!Number.isInteger(position) || position < 0) {
        throw new Error(t("DG.Formula.TypeError.description", { vars: [ position ] }))
      }
      if (!Number.isInteger(length) || length < 0) {
        throw new Error(t("DG.Formula.TypeError.description", { vars: [ length ] }))
      }
      return aString.substring(position - 1, position + length - 1)
    }
  },
  // toLower(string) Converts upper-case characters in its argument to lower-case.
  toLower: {
    numOfRequiredArguments: 1,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0])
      return aString.toLowerCase()
    }
  },
  // toUpper(string) Converts lower-case characters in its argument to upper-case.
  toUpper: {
    numOfRequiredArguments: 1,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0])
      return aString.toUpperCase()
    }
  },
  // trim(string) Removes leading, trailing, and redundant white space characters from its argument.
  // (e.g. double spaces are converted to single spaces).
  trim: {
    numOfRequiredArguments: 1,
    evaluate: (...args: FValue[]) => {
      const aString = valueToString(args[0])
      // trim and remove redundant spaces
      return aString.trim().replace(/\s+/g, " ")
    }
  },
  // wordListMatches(string_to_look_in, "datasetName", "wordListAttributeName", "ratingsAttributeName" (optional))
  // Returns the total number of times any of the words in a given word list is found in the given strToLookIn.
  // If the (optional) name of a numeric rating attribute is specified, the sum of the ratings for the found words
  // is returned. Note that the search is performed with case insensitivity. If an entry in the word list begins and
  // ends with "/" it is treated as a regular expression and searched for with case sensitivity.
  wordListMatches: {
    numOfRequiredArguments: 3,
    getDependency: (args: MathNode[]): ILookupDependency => {
      const [_textRefArg, dataSetNameArg, wordListAttrNameArg, ratingsAttrNameArg] = args as TWordListMatchesArgs
      return {
        type: "lookup",
        dataSetId: rmCanonicalPrefix(dataSetNameArg?.value),
        attrId: rmCanonicalPrefix(wordListAttrNameArg?.value),
        otherAttrId: rmCanonicalPrefix(ratingsAttrNameArg?.value)
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const [_textRefArg, dataSetNameArg, wordListAttrNameArg, ratingsAttrNameArg] = args as TWordListMatchesArgs
      const dataSetName = dataSetNameArg?.value || ""
      if (dataSetNameArg) {
        dataSetNameArg.value = displayNameMap.dataSet[dataSetName]?.id || dataSetName
      }
      const wordListAttrName = wordListAttrNameArg?.value || ""
      if (wordListAttrNameArg) {
        wordListAttrNameArg.value = displayNameMap.dataSet[dataSetName]?.attribute[wordListAttrName] || wordListAttrName
      }
      const ratingsAttrName = ratingsAttrNameArg?.value || ""
      if (ratingsAttrNameArg) {
        ratingsAttrNameArg.value = displayNameMap.dataSet[dataSetName]?.attribute[ratingsAttrName] || ratingsAttrName
      }
    },
    evaluateRaw: (args: MathNode[], _mathjs: any, currentScope: CurrentScope) => {
      const scope = getRootScope(currentScope)
      const functionName = "wordListMatches"
      const numOfReqArgs = stringFunctions.wordListMatches.numOfRequiredArguments
      if (args.length < numOfReqArgs) {
        throw new Error(t("DG.Formula.FuncArgsErrorPlural.description", { vars: [ functionName, numOfReqArgs ] }))
      }
      [1, 2].forEach(i => {
        if (!isConstantStringNode(args[i])) {
          throw new Error(t("V3.formula.error.stringConstantArg", { vars: [ functionName, i + 1 ] }))
        }
      })
      const [textRefArg] = args as TWordListMatchesArgs
      const { dataSetId, attrId, otherAttrId } = stringFunctions.wordListMatches.getDependency(args)
      const text = String(evaluateNode(textRefArg, scope))
      const dataSet = scope.getDataSet(dataSetId)
      if (!dataSet) {
        throw new Error(t("DG.Formula.LookupDataSetError.description", { vars: [ dataSetId ] }))
      }

      const wordAttribute = dataSet.attrFromID(attrId)
      if (!wordAttribute) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ attrId, dataSet.title || "" ] }))
      }

      const ratingsAttribute = otherAttrId ? dataSet.attrFromID(otherAttrId) : undefined

      const wordRatingMap: Record<string, number> = {}
      wordAttribute.strValues.forEach((word, index) => wordRatingMap[word] = ratingsAttribute?.numValue(index) ?? 1)

      let result = 0
      wordAttribute.strValues.forEach(word => {
        if (word) {
          const isRegEx = word.startsWith("/") && word.endsWith("/")
          const pattern = isRegEx ? word.substring(1, word.length - 1) : `\\b${escapeStringRegexp(word)}\\b`
          const flags = isRegEx ? "g" : "gi"
          const regEx = new RegExp(pattern, flags)
          const match = text.match(regEx)
          result += wordRatingMap[word] * (match?.length ?? 0)
        }
      })

      return result
    }
  },
}
