// ==========================================================================
//              DG.VarReferenceError, DG.FuncReferenceError
//                DG.HierReferenceError,DG.FuncArgsError
//
//  Author:   Kirk Swenson
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

DG.UNICODE = {

  PLUS_SIGN: '+',
  MINUS_SIGN: '\u2212',
  MULTIPLICATION_SIGN: '\u00D7',
  DIVISION_SIGN: '\u00F7',

  EQUALS_SIGN: '=',
  NOT_EQUAL_TO: '\u2260',
  LESS_THAN_OR_EQUAL_TO: '\u2264',
  GREATER_THAN_OR_EQUAL_TO: '\u2265',

  GREEK_SMALL_LETTER_ALPHA: '\u03B1',
  GREEK_SMALL_LETTER_BETA: '\u03B2',
  GREEK_SMALL_LETTER_GAMMA: '\u03B3',
  GREEK_SMALL_LETTER_DELTA: '\u03B4',
  GREEK_SMALL_LETTER_EPSILON: '\u03B5',
  GREEK_SMALL_LETTER_ZETA: '\u03B6',
  GREEK_SMALL_LETTER_ETA: '\u03B7',
  GREEK_SMALL_LETTER_THETA: '\u03B8',
  GREEK_SMALL_LETTER_IOTA: '\u03B9',
  GREEK_SMALL_LETTER_KAPPA: '\u03BA',
  GREEK_SMALL_LETTER_LAMDA: '\u03BB',
  GREEK_SMALL_LETTER_MU: '\u03BC',
  GREEK_SMALL_LETTER_NU: '\u03BD',
  GREEK_SMALL_LETTER_XI: '\u03BE',
  GREEK_SMALL_LETTER_OMICRON: '\u03BF',
  GREEK_SMALL_LETTER_PI: '\u03C0',
  GREEK_SMALL_LETTER_RHO: '\u03C1',
  GREEK_SMALL_LETTER_FINAL_SIGMA: '\u03C2',
  GREEK_SMALL_LETTER_SIGMA: '\u03C3',
  GREEK_SMALL_LETTER_TAU: '\u03C4',
  GREEK_SMALL_LETTER_UPSILON: '\u03C5',
  GREEK_SMALL_LETTER_PHI: '\u03C6',
  GREEK_SMALL_LETTER_CHI: '\u03C7',
  GREEK_SMALL_LETTER_PSI: '\u03C8',
  GREEK_SMALL_LETTER_OMEGA: '\u03C9',

  INFINITY: '\u221E'
};

DG.SimpleMap = function(object) {
  this.map = object || {};
};
DG.SimpleMap.prototype.toString = function() {
  var str = '',
      kStrLengthThreshold = 16;
  for (var key in this.map) { // jshint ignore:line
    var ellipsize = str.length >= kStrLengthThreshold,
        keyToAdd = ellipsize ? '...' : key;
    str += (str ? ', ' : '') + keyToAdd;
    if (ellipsize) break;
  }
  return '{' + str + '}';
};

DG.BoundaryMap = function(object) {
  DG.SimpleMap.call(this, object);
};
DG.BoundaryMap.prototype = new DG.SimpleMap();
DG.BoundaryMap.prototype.constructor = DG.BoundaryMap;

// Error class definition follows pattern from
// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Error

/** @class DG.TypeError

  Error class for type errors.

  @extends Error
*/
DG.TypeError = function(iOperator) {
  this.name = 'DG.Formula.TypeError.name'.loc();
  this.message = 'DG.Formula.TypeError.message'.loc(iOperator);
  this.description = 'DG.Formula.TypeError.description'.loc(iOperator);
};
DG.TypeError.prototype = new Error();
DG.TypeError.prototype.constructor = DG.TypeError;

/** @class DG.VarReferenceError

  Error class for variable reference errors.

  @extends Error
*/
DG.VarReferenceError = function( iName) {
  this.name = 'DG.Formula.VarReferenceError.name'.loc();
  this.message = 'DG.Formula.VarReferenceError.message'.loc( iName);
  this.description = 'DG.Formula.VarReferenceError.description'.loc( iName);
  this.reference = iName;
};
DG.VarReferenceError.prototype = new Error();
DG.VarReferenceError.prototype.constructor = DG.VarReferenceError;

/** @class DG.HierReferenceError

  Error class for hierarchical variable reference errors.

  @extends Error
*/
DG.HierReferenceError = function( iName) {
  this.name = 'DG.Formula.HierReferenceError.name'.loc();
  this.message = 'DG.Formula.HierReferenceError.message'.loc( iName);
  this.description = 'DG.Formula.HierReferenceError.description'.loc( iName);
  this.reference = iName;
};
DG.HierReferenceError.prototype = new Error();
DG.HierReferenceError.prototype.constructor = DG.HierReferenceError;

/** @class DG.FuncReferenceError

  Error class for function reference errors.

  @extends Error
*/
DG.FuncReferenceError = function( iName) {
  this.name = 'DG.Formula.FuncReferenceError.name'.loc();
  this.message = 'DG.Formula.FuncReferenceError.message'.loc( iName);
  this.description = 'DG.Formula.FuncReferenceError.description'.loc( iName);
  this.reference = iName;
};
DG.FuncReferenceError.prototype = new Error();
DG.FuncReferenceError.prototype.constructor = DG.FuncReferenceError;

/** @class DG.FuncArgsError

  Error class for function argument errors.

  @extends Error
*/
DG.FuncArgsError = function( iName, iRequiredArgs) {
  var minArgs = iRequiredArgs && iRequiredArgs.min,
      maxArgs = iRequiredArgs && iRequiredArgs.max;

  this.name = 'DG.Formula.FuncArgsError.name'.loc();
  if( (minArgs === 1) && (minArgs === maxArgs)) {
    this.message = 'DG.Formula.FuncArgsErrorSingle.message'.loc( iName, minArgs);
    this.description = 'DG.Formula.FuncArgsErrorSingle.description'.loc( iName, minArgs);
  }
  else if( (minArgs >= 0) && !SC.none( maxArgs) && (minArgs !== maxArgs)) {
    this.message = 'DG.Formula.FuncArgsErrorRange.message'.loc( iName, minArgs, maxArgs);
    this.description = 'DG.Formula.FuncArgsErrorRange.description'.loc( iName, minArgs, maxArgs);
  }
  else {
    this.message = 'DG.Formula.FuncArgsErrorPlural.message'.loc( iName, minArgs);
    this.description = 'DG.Formula.FuncArgsErrorPlural.description'.loc( iName, minArgs);
  }
  this.reference = iName;
};
DG.FuncArgsError.prototype = new Error();
DG.FuncArgsError.prototype.constructor = DG.FuncArgsError;

