// ==========================================================================
//                        String Functions
//  
//  Author:   Kirk Swenson
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

sc_require('formula/function_registry');
sc_require('utilities/data_utilities');

/**
  Implements the basic builtin functions and registers them with the FunctionRegistry.
 */
DG.functionRegistry.registerFunctions((function() {
  var kDefaultSortItemsDelimiter = ',';

  return {
    /**
      Returns true if the specified string contains the specified target string
      as its initial characters.
      @param    {String}  iString - the string to search within
      @param    {String}  iTarget - the string to search for
      @returns  {Boolean} true if the string begins with the target string, false otherwise
     */
    'beginsWith': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iTarget) {
        var string = DG.DataUtilities.toString(iString), target = DG.DataUtilities.toString(iTarget);
        if (!target) return true;
        if (!string) return false;
        return string.indexOf(target) === 0;
      }
    },

    /**
      Returns the character at the specified position.
      @param    {String}  iString - the string from which a character is to be extracted
      @param    {Number}  iPosition - the position of the character to be extracted
      @returns  {String}  the character at the specified position
     */
    'charAt': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iPosition) {
        var string = DG.DataUtilities.toString(iString);
        if (iPosition < 0) iPosition += string.length + 1;
        return string.charAt(iPosition - 1);
      }
    },

    /**
      Returns the string formed by concatenating/joining its string arguments.
      @param    {String, ...}  iStr1, iStr2, ... - the strings to concatenate
      @returns  {String}  the joined string
     */
    'concat': {
      minArgs:1, maxArgs:99, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(/* iStr1, iStr2, ... */) {
        var args = Array.prototype.slice.call(arguments);
        return args.length ? args.join("") : "";
      }
    },

    /**
      Returns true if the specified string contains the specified target string
      as its final characters.
      @param    {String}  iString - the string to search within
      @param    {String}  iTarget - the string to search for
      @returns  {Boolean} true if the string ends with the target string, false otherwise
     */
    'endsWith': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iTarget) {
        var string = DG.DataUtilities.toString(iString), target = DG.DataUtilities.toString(iTarget);
        if (!target) return true;
        if (!string) return false;
        if (target.length > string.length) return false;
        var ending = string.substr(-target.length);
        return ending && ending.indexOf(target) === 0;
      }
    },

    /**
      Searches the first string argument (optionally starting at
      the specified position) for the specified target string.
      If found, returns the (1-based) position at which the
      match was found. Returns 0 if not found.
      @param    {String}  iString - the string to search within
      @param    {String}  iTarget - the string to search for
      @param    {Number}  iPosition - the offset of the first character to return
      @returns  {Number}  (1-based) position of the match if found, 0 otherwise
     */
    'findString': {
      minArgs:2, maxArgs:3, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iTarget, iPosition) {
        var string = DG.DataUtilities.toString(iString), target = DG.DataUtilities.toString(iTarget),
            position = iPosition || 0;
        if (!DG.isNumeric(position)) return 0;
        if (!target) return 1;
        if (!string) return 0;
        if (position < 0) position += string.length;
        var ending = iPosition ? string.substr(position) : string,
            found = ending.indexOf(target);
        return found >= 0 ? position + found + 1 : 0;
      }
    },

    /**
      Searches the first string argument the specified regular expression.
      Returns the number of matches found.
      @param    {String}  iString - the string to search within
      @param    {String}  iPattern - the pattern to search for
      @returns  {Number}  the number of matches found
     */
    'patternMatches': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iTarget, iPattern) {
        var target = DG.DataUtilities.toString(iTarget),
            pattern = DG.DataUtilities.toString(iPattern);
        if (!pattern || !target)
          return 0;
        var re = new RegExp(pattern, 'gmi'),
            result = target.match(re);
        return !result ? 0 : result.length;
      }
    },

    /**
      Returns true if the string first argument contains the second string argument.
      @param    {String}  iString - the string to search within
      @param    {String}  iTarget - the string to search for
      @returns  {Boolean} true if the target string was found, false otherwise
     */
    'includes': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iTarget) {
        var string = DG.DataUtilities.toString(iString), target = DG.DataUtilities.toString(iTarget);
        if (!target) return true;
        if (!string) return false;
        // case insensitive
        return string.toLowerCase().indexOf(target.toLowerCase()) >= 0;
      }
    },

    /**
      Returns the string formed by concatenating/joining its string arguments,
      each separated by the specified iSeparator argument.
      @param    {String}  iSeparator - the string to use between joined arguments
      @param    {String, ...}  iStr1, iStr2, ... - the strings to concatenate
      @returns  {String}  the joined string
     */
    'join': {
      minArgs:1, maxArgs:99, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iSeparator /*, iStr1, iStr2, ... */) {
        var args = Array.prototype.slice.call(arguments, 1),
            separator = iSeparator != null ? iSeparator : " ";
        return args.length ? args.join(separator) : "";
      }
    },

    /**
      Returns the string formed by repeating its first string argument
      the number of times specified by its second string argument.
      @param    {String}  iString - the string to repeat
      @param    {Number}  iCount - the number of times to repeat
      @returns  {String}  the resulting string
     */
    'repeatString': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iCount) {
        var string = DG.DataUtilities.toString(iString);
        if (!string || !iCount) return "";
        var i, result = "";
        for (i = 0; i < iCount; ++i) {
          result += string;
        }
        return result;
      }
    },

    /**
      Returns the string formed by replacing the specified characters
      with the specified replacement string.
      @param    {String}  iString - the string on which to perform the replacement
      @param    {Number}  iPosition - the position of the first character to replace
      @param    {Number}  iLength - the number of characters to replace
      @param    {String}  iReplace - the string to replace with
      @returns  {String}  the resulting string
     */
    'replaceChars': {
      minArgs:4, maxArgs:4, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iPosition, iLength, iReplace) {
        var string = DG.DataUtilities.toString(iString);
        if (!string) return "";
        var position;
        if (!iPosition) {
          position = 0;
        }
        else if (iPosition >= 1) {
          position = iPosition - 1;
        }
        else if (iPosition < 0) {
          position = iPosition + string.length;
        }
        else {
          return iString;
        }
        var left = string.substr(0, position),
            right = string.substr(position + iLength);
        return left + iReplace + right;
      }
    },

    /**
      Returns the string formed by replacing the specified substring
      with the specified replacement string.
      @param    {String}  iString - the string on which to perform the replacement
      @param    {String}  iTarget - the substring to be replaced
      @param    {String}  iReplace - the string to replace with
      @returns  {String}  the resulting string
     */
    'replaceString': {
      minArgs:3, maxArgs:3, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iTarget, iReplace) {
        var string = DG.DataUtilities.toString(iString), target = DG.DataUtilities.toString(iTarget);
        if (!target) return string;
        var re = DG.StringUtilities.createEscapedRegExp(target, 'g');
        return string.replace(re, iReplace);
      }
    },

    /**
      Treats the given string as a list. The default delimiter is ','.
      The returned string has the items in the list in sorted order.
      If the delimiter is '', the characters of the given string are sorted.
      Spaces between items are ignored except so far as they are part of the delimiter.
      @param    {String}  iString - the string containing the list to be sorted
      @param    {String}  iDelimiter - the character(s) that separates items in the list
      @returns  {String}  the resulting sorted list
     */
    'sortItems': {
      minArgs:1, maxArgs:2, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iDelimiter) {
        var tList = DG.DataUtilities.toString(iString),
            tResult;
        if (iDelimiter === undefined || iDelimiter === null) {
          iDelimiter = kDefaultSortItemsDelimiter;
        }
        tResult = tList.split(iDelimiter).sort();

        return tResult.join( iDelimiter);
      }
    },

    /**
      Returns the string formed by splitting the specified string by the
      specified separator and then returning the element at the specified index.
      @param    {String}  iString - the string on which to perform the replacement
      @param    {String}  iSeparator - the separator by which to split the string
      @param    {Number}  iIndex - the index of the element to be returned
      @returns  {String}  the resulting string
     */
    'split': {
      minArgs:2, maxArgs:3, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iSeparator, iIndex) {
        var string = DG.DataUtilities.toString(iString),
            index = iIndex ? iIndex : 1,
            results = string.split(iSeparator);
        return ((index >= 1) && (index <= results.length))
                  ? results[index - 1]
                  : "";
      }
    },

    /**
      Returns a substring of the specified string, determined by its position and
      length arguments.
      @param    {String}  iString - the string to search within
      @param    {Number}  iPosition - the offset of the first character to return
      @param    {Number}  iLength - the number of characters to return
      @returns  {String}  the specified substring
     */
    'subString': {
      minArgs:2, maxArgs:3, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iPosition, iLength) {
        var string = DG.DataUtilities.toString(iString);
        if (!string) return '';
        if (!iPosition) iPosition = 1;
        var position = iPosition >= 1 ? iPosition - 1 : iPosition + string.length,
            length = iLength != null ? iLength : string.length;
        return string.substr(position, length);
      }
    },

    /**
      Returns the number of characters in the specified string.
      @param    {String}  iString - the string whose characters are to be counted
      @returns  {Number}  the number of characters in the string
     */
    'stringLength': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString) { return DG.DataUtilities.toString(iString).length; }
    },

    /**
      Converts all characters in the string to lowercase.
      @param    {String}  iString - the string whose characters are to be lower-cased
      @returns  {String}  the resulting lowercase string
     */
    'toLower': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString) { return DG.DataUtilities.toString(iString).toLowerCase(); }
    },

    /**
      Converts all characters in the string to uppercase.
      @param    {String}  iString - the string whose characters are to be upper-cased
      @returns  {String}  the resulting uppercase string
     */
    'toUpper': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString) { return DG.DataUtilities.toString(iString).toUpperCase(); }
    },

    /**
      Converts all characters in the string to uppercase.
      @param    {String}  iString - the string whose characters are to be upper-cased
      @returns  {String}  the resulting uppercase string
     */
    'trim': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString) {
        return DG.DataUtilities.toString(iString)
                .trim()
                .replace(/[\s\uFEFF\xA0][\s\uFEFF\xA0]*/g, " ");
      }
    }

  };
})());
