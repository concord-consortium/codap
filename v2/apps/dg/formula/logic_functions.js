// ==========================================================================
//                          Basic Functions
//
//  Author:   William Finzer
//
//  Copyright (c) 2021 by The Concord Consortium, Inc. All rights reserved.
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

  return {
    /**
      Coerces its argument to a boolean value.
      @param    {Object}  x The argument to be coerced to boolean
      @returns  {Boolean} The converted boolean value
     */
    'boolean': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryLogic',
      evalFn: function(x) {
        return SC.empty(x) ? '' :
            !(x === false || (typeof x === 'string' && x.toLowerCase() === 'false') || x === 0 || x === '0');
      }
    },

    'isBoolean': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryLogic',
      evalFn: function(x) {
        if (typeof x === 'string') {
          x = x.toLowerCase();
        }
        return [true, false, 'true', 'false'].indexOf(x) >=0;
      }
    },

    'isBoundary': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryLogic',
      evalFn: function(x) {
        return typeof x === 'object' && x.hasOwnProperty('jsonBoundaryObject');
      }
    },

    'isColor': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryLogic',
      evalFn: function(x) {
        return DG.ColorUtilities.isColorSpecString(x);
      }
    },

    'isDate': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryLogic',
      evalFn: function(x) {
        return DG.isDateString(x) || DG.isDate(x);
      }
    },

    'isFinite': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryLogic',
      evalFn: function(x) { return DG.isFinite(x); }
    },

    'isMissing': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryLogic',
      evalFn: function(x) { return x==='' || SC.none(x); }
    },

    'isNumber': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryLogic',
      evalFn: function(x) { return DG.isNumeric(x); }
    }
  };
})());
