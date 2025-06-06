// ==========================================================================
//                          DG.StringUtilities
//
//  Author:   William Finzer
//
//  Copyright ©2014 Concord Consortium
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

DG.StringUtilities = {

  // from http://stackoverflow.com/a/6969486
  escapeRegExpRE: /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,

  escapeRegExp: function(str) {
    return str.replace(DG.StringUtilities.escapeRegExpRE, "\\$&");
  },

  createEscapedRegExp: function(str, flags) {
    return new RegExp(DG.StringUtilities.escapeRegExp(str), flags);
  },

  /**
   * The returned string is guaranteed to begin with iPrefix.
   * @param iString {String}
   * @param iPrefix {String}
   * @returns  {String}
   */
  guaranteePrefix: function( iString, iPrefix) {
    return (iString.indexOf(iPrefix) === 0) ? iString : iPrefix + iString;
  },

  /**
   * Returns a set of regexp results arrays from matches within the string.
   * If iResultsMapper is defined, then it returns a set of return values from that function.
   * @param iString {String}
   * @param iRegexp {RegExp}
   * @param iResultsMapper {Function} (optional)
   */
  scan: function ( iString, iRegexp, iResultsMapper ) {
    if (!iRegexp.global) throw "regexp must have global flag set";
    var m, results = [];
    while ((m = iRegexp.exec(iString)) !== null) {
      if (iResultsMapper === null) {
        results.push(m);
      } else {
        results.push(iResultsMapper.call(window, m));
      }
    }
    return results;
  }
};

