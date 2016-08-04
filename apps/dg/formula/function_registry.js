// ==========================================================================
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

sc_require('utilities/object_map');

/** @class DG.FunctionRegistry
 *
 * A registry of the functions available in CODAP.
 */

DG.FunctionRegistry = SC.Object.extend((function() // closure
/** @scope DG.FunctionRegistry.prototype */ {

      // queue of function modules ready to be processed
  var fnModuleQueue = [],
      // map of category names -> arrays of function names
      fnNamesMap = {},
      // array of uncategorized function names
      fnNamesArray = [],
      // flag indicating whether function names are currently sorted
      fnNamesSorted = true,
      // aggregate functions
      aggFns = {};

  /**
    Adds the names of the functions in iModule to the fnNames property,
    for use in creating the function popup menu. The properties of the
    iModule object are assumed to be functions, and the names are taken
    from the names of the properties. This will need some adjustment when
    localization is taken into account.
    @param  {Object}  iModule -- Properties are functions
   */
  function processFnModule(iModule) {
    DG.ObjectMap.forEach(iModule, function(iName, iProps) {
      // add it to the categorized map
      var rawCategory = iProps.category || 'DG.Formula.FuncCategoryOther',
          category = rawCategory.loc();
      if (!fnNamesMap[category]) fnNamesMap[category] = [];
      fnNamesMap[category].push(iName);
      // add it to the uncategorized array
      fnNamesArray.push(iName);
      // mark it as needing to be sorted
      fnNamesSorted = false;
    });
  };

  function prepareFunctionNames() {
    if (fnModuleQueue.length) {
      fnModuleQueue.forEach(function(iModule) {
                              processFnModule(iModule);
                            });
      fnModuleQueue = [];
    }

    if (!fnNamesSorted) {
      DG.ObjectMap.forEach(fnNamesMap,
                            function(iCategory, iFnNames) {
                              iFnNames.sort();
                            });
      fnNamesArray.sort();
      fnNamesSorted = true;
    }
  };

  return {
    /**
      Return the function names map, which maps category strings to
      arrays of function names for use in building menus, browsers, etc.
      @type {object}
     */
    namesMap: function() {
      prepareFunctionNames();
      return fnNamesMap;
    }.property(),

    /**
      Return the function names map, which maps category strings to
      arrays of function names for use in building menus, browsers, etc.
      @type {string[]}
     */
    namesArray: function() {
      prepareFunctionNames();
      return fnNamesArray;
    }.property(),

    namesWithParentheses: function() {
      var fns = this.get('namesArray');
      return fns.map(function(iName) {
                      return iName + "()";
                    });
    }.property(),

    /**
      Register the specified functions.
     */
    registerFunctions: function(iFunctions) {
      fnModuleQueue.push(iFunctions);
    },

    /**
      Register the specified aggregate functions.
     */
    registerAggregates: function(iFunctions) {
      this.registerFunctions(iFunctions);
      DG.ObjectMap.copy(aggFns, iFunctions);
    },

    isAggregate: function(iFnName) {
      return iFnName && (aggFns[iFnName] != null);
    },

    getAggregate: function(iFnName) {
      return iFnName && aggFns[iFnName];
    }

  };
})());

/**
  Singleton instance
 */
DG.functionRegistry = DG.FunctionRegistry.create();
