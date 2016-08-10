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

/**
  Implements the basic builtin functions and registers them with the FunctionRegistry.
 */
DG.functionRegistry.registerFunctions((function() {

  // from http://stackoverflow.com/a/6969486
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

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
        if (!iTarget) return true;
        if (!iString) return false;
        return iString.indexOf(iTarget) === 0;
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
        if (iPosition < 0) iPosition += iString.length + 1;
        return String(iString).charAt(iPosition - 1);
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
        if (!iTarget) return true;
        if (!iString) return false;
        if (iTarget.length > iString.length) return false;
        var ending = iString.substr(-iTarget.length);
        return ending && ending.indexOf(iTarget) === 0;
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
        var position = iPosition || 0;
        if (!DG.isNumeric(position)) return 0;
        if (!iTarget) return 1;
        if (!iString) return 0;
        if (position < 0) position += iString.length;
        var ending = iPosition ? iString.substr(position) : iString,
            found = ending.indexOf(iTarget);
        return found >= 0 ? position + found + 1 : 0;
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
        if (!iTarget) return true;
        if (!iString) return false;
        return iString.indexOf(iTarget) >= 0;
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
        if (!iString || !iCount) return "";
        var i, result = "";
        for (i = 0; i < iCount; ++i) {
          result += iString;
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
        if (!iString) return "";
        var position;
        if (!iPosition) {
          position = 0;
        }
        else if (iPosition >= 1) {
          position = iPosition - 1;
        }
        else if (iPosition < 0) {
          position = iPosition + iString.length;
        }
        else {
          return iString;
        }
        var left = iString.substr(0, position),
            right = iString.substr(position + iLength);
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
        if (!iTarget) return iString;
        var re = new RegExp(escapeRegExp(iTarget), 'g');
        return iString.replace(re, iReplace);
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
      minArgs:3, maxArgs:3, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iSeparator, iIndex) {
        var results = iString.split(iSeparator);
        return ((iIndex >= 1) && (iIndex <= results.length))
                  ? results[iIndex - 1]
                  : "";
      }
    },

    /**
      Returns the first part of the specified string, to the number of characters specified.
      @param    {String}  iString - the string to search within
      @param    {Number}  iPosition - the offset of the first character to return
      @param    {Number}  iLength - the number of characters to return
      @returns  {String}  the specified substring
     */
    'subString': {
      minArgs:2, maxArgs:3, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString, iPosition, iLength) {
        if (!iString) return '';
        if (!iPosition) iPosition = 1;
        var position = iPosition >= 1 ? iPosition - 1 : iPosition + iString.length,
            length = iLength != null ? iLength : iString.length;
        return iString.substr(position, length);
      }
    },

    /**
      Returns the number of characters in the specified string.
      @param    {String}  iString - the string whose characters are to be counted
      @returns  {Number}  the number of characters in the string
     */
    'stringLength': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString) { return String(iString).length; }
    },

    /**
      Converts all characters in the string to lowercase.
      @param    {String}  iString - the string whose characters are to be lower-cased
      @returns  {String}  the resulting lowercase string
     */
    'toLower': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString) { return String(iString).toLowerCase(); }
    },

    /**
      Converts all characters in the string to uppercase.
      @param    {String}  iString - the string whose characters are to be upper-cased
      @returns  {String}  the resulting uppercase string
     */
    'toUpper': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString) { return String(iString).toUpperCase(); }
    },

    /**
      Converts all characters in the string to uppercase.
      @param    {String}  iString - the string whose characters are to be upper-cased
      @returns  {String}  the resulting uppercase string
     */
    'trim': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryString',
      evalFn: function(iString) {
        return String(iString)
                .trim()
                .replace(/[\s\uFEFF\xA0][\s\uFEFF\xA0]*/g, " ");
      }
    }

  };
})());
