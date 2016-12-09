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
      // map of category names -> { map of function names -> function info objects }
      fnInfoMap = {},
      // array of uncategorized function names
      fnNamesArray = [],
      // flag indicating whether function names are currently sorted
      fnNamesSorted = true,
      // simple functions
      fns = {},
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
      if (!fnInfoMap[category]) fnInfoMap[category] = {};
      fnInfoMap[category][iName] = {
        name: iName,
        displayName: iName,
        category: category,
        minArgs: iProps.requiredArgs ? iProps.requiredArgs.min : iProps.minArgs,
        maxArgs: iProps.requiredArgs ? iProps.requiredArgs.max : iProps.maxArgs
      };
      // add it to the uncategorized array
      fnNamesArray.push(iName);
      // mark it as needing to be sorted
      fnNamesSorted = false;
    });
  }

  /**
    Process the objects in the fnModuleQueue to map function names.
    Create a sorted array of categories from the function names.
   */
  function prepareFunctionNames() {
    if (fnModuleQueue.length) {
      fnModuleQueue.forEach(function(iModule) {
                              processFnModule(iModule);
                            });
      fnModuleQueue = [];
    }

    if (!fnNamesSorted) {
      fnNamesArray.sort();
      fnNamesSorted = true;
    }
  }

  return {
    /**
      Returns the function names map, which maps category strings to
      arrays of function names for use in building menus, browsers, etc.
      @type {object}
     */
    categorizedFunctionInfo: function() {
      prepareFunctionNames();
      return fnInfoMap;
    }.property(),

    /**
      Returns a flat array of function names.
      @type {string[]}
     */
    namesArray: function() {
      prepareFunctionNames();
      return fnNamesArray;
    }.property(),

    /**
      Returns a flat array of function names with parentheses added.
      @type {string[]}
     */
    namesWithParentheses: function() {
      var fns = this.get('namesArray');
      return fns.map(function(iName) {
                      return iName + "()";
                    });
    }.property(),

    /**
      Returns the internal non-aggregate function objects map (currently
      still required by DG.FormulaContext for compiled evaluation).
      @returns  {object}  map of function names to function objects
     */
    functions: function() {
      return fns;
    }.property(),

    /**
      Register the specified functions.
      @param    {object}  iFunctions - map of function name to aggregate function objects
     */
    registerFunctions: function(iFunctions) {
      fnModuleQueue.push(iFunctions);
      DG.ObjectMap.copy(fns, iFunctions);
    },

    /**
      Register the specified aggregate functions.
      @param    {object}  iFunctions - map of function name to aggregate function objects
     */
    registerAggregates: function(iFunctions) {
      fnModuleQueue.push(iFunctions);
      DG.ObjectMap.copy(aggFns, iFunctions);
    },

    /**
      Return the function object for the specified function name.
      @param    {string}  iFnName - the name of the function
      @returns  {object}  the requested function object
     */
    getFunction: function(iFnName) {
      return iFnName && fns[iFnName];
    },

    /**
      Return whether the specified function name corresponds to
      an aggregate function.
      @param    {string}  iFnName - the name of the function
      @returns  {boolean} whether the function is an aggregate function
     */
    isAggregate: function(iFnName) {
      return iFnName && (aggFns[iFnName] != null);
    },

    /**
      Returns the aggregate function object for the specified
      function name.
      @param    {string}  iFnName - the name of the function
      @returns  {object}  the requested function object
     */
    getAggregate: function(iFnName) {
      return iFnName && aggFns[iFnName];
    }

  };
})());

/**
  Singleton instance
 */
DG.functionRegistry = DG.FunctionRegistry.create();
