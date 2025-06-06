// ==========================================================================
//                          DG.FormulaContext
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

sc_require('formula/function_registry');

/** @class DG.FormulaContext

  DG.FormulaContext objects support DG.Formula objects by providing identifier
  binding and evaluation, function binding and evaluation, etc.

  @extends SC.Object
*/
DG.FormulaContext = SC.Object.extend( (function() {

  /**
    Utility function for check argument count.
    @param    {String}    iName -- The name of the function
    @param    {Array}     iArgs -- The arguments to the function
    @param    {Object}    iFnProps -- An object which contains argument specs for
                            multiple functions, e.g. iArgsSpecs[iName] is the
                            specification for the 'iName' function. The specification
                            is an object with 'minArgs' and 'maxArgs' properties.
   */
  function checkArgs( iName, iArgs, iFnProps) {
    var fArgs = iFnProps && iFnProps[iName];
    if( fArgs && (iArgs.length < fArgs.minArgs))
      throw new DG.FuncArgsError( iName, fArgs);
  }

  return {

  /**
    During compilation, a stack of function contexts indicating the functions
    being processed, e.g. in the expression mean(count(round(x))), when x is
    compiled there are three function contexts on the stack.
    @type {object[]}
   */
  _functionContextStack: null,

  /**
    Initialization function
   */
  init: function() {
    this._functionContextStack = [];

    // need access to functions locally for compiled evaluation
    this._fns = DG.functionRegistry.get('functions');
  },

  /**
    Adds a function context to the top of stack
    @param  {object}  iFunctionContext
   */
  beginFunctionContext: function(iFunctionContext) {
    this._functionContextStack.push(iFunctionContext);
  },

  /**
    Pops a function context from the top of the stack
    @param  {object}  iFunctionContext
   */
  endFunctionContext: function(iFunctionContext) {
    var endName = iFunctionContext && iFunctionContext.name,
        stackSize = this._functionContextStack.length,
        topName = stackSize ? this._functionContextStack[stackSize - 1].name : '';
    if (endName === topName)
      -- this._functionContextStack.length;
    else
      DG.logError("Error: DG.FormulaContext.endFunctionContext -- attempt to end incorrect function context");
  },

  /**
    Returns an array of aggregate function indices representing the aggregate
    functions that are on the _functionContextStack at the moment.
    @returns {number[]}
   */
  getAggregateFunctionIndices: function() {
    return [];
  },

    /**
     * Determine whether the given case should be included in any evaluation. Default is to return true.
     * Subclasses such as DG.PlottedFunctionContext will evaluate based on the cases currently showing.
     *
     * @param  {Object}              iEvalContext -- { _case_: , _id_: }
     * @return {boolean}
     */
  filterCase: function (iEvalContext) {
    return true;
  },

  /**
    Called when a dependency is identified during compilation.
    @param {object}   iDependency
    @param {object}   .dependentSpec - the specs of the node that is dependant
    @param {string}     .type - the type of the node that is dependant
    @param {string}     .id - the id of the node that is dependant
    @param {string}     .name - the name of the node that is dependant
                        defaults to the ownerSpec of the current context
    @param {object}   .independentSpec - the specs of the node being depended upon
    @param {string}     .type - the type of the node being depended upon
    @param {string}     .id - the id of the node being depended upon
    @param {string}     .name - the name of the node being depended upon
    @param {number[]} .aggFnIndices - array of aggregate function indices
                          defaults to the aggregate functions on the stack
                          at compile time when the variable is bound
    @param {object}   .dependentContext - the formula context for the dependent node
   */
  registerDependency: function(iDependency) {
  },

  invalidateNamespace: function() {
    this.notifyPropertyChange('namespaceChange');
  },

  /**
    Invalidation function for use with the dependency manager.
    Called by the dependency manager when invalidating nodes as a result
    of tracked dependencies.
    @param {object}     ioResult
    @param {object}     iDependent
    @param {object}     iDependency
    @param {DG.Case[]}  iCases - array of cases affected
                                 if no cases specified, all cases are affected
    @param {boolean}    iForceAggregate - treat the dependency as an aggregate dependency
   */
  invalidateDependent: function(ioResult, iDependent, iDependency, iCases, iForceAggregate) {
  },

  /**
    Returns true if the specified function name refers to an aggregate function.
    Derived classes may override as appropriate.
   */
  isAggregate: function(iName) {
    return false;
  },

  /**
    Clear any cached bindings for this formula. Called before compiling.
    Derived classes may override as appropriate.
   */
  clearCaches: function() {
  },

  /**
    Called when the formula is about to be recompiled to clear any cached data.
    Derived classes may override as appropriate.
   */
  willCompile: function() {
    this.clearCaches();
  },

  /**
    Called when the formula has been recompiled to clear any stale dependencies.
    Derived classes may override as appropriate.
   */
  didCompile: function() {
  },

  /**
    Called when the formula has been recompiled to clear any stale dependencies.
    Derived classes may override as appropriate.
   */
  completeCompile: function() {
  },

  /**
    Called when dependents change to clear function caches.
    Derived classes may override as appropriate.
   */
  invalidateFunctions: function(iFunctionIndices) {
  },

  /**
    Compiles a variable reference into the JavaScript code for accessing
    the appropriate value. For the base FormulaContext, this means
    binding to global constants such as 'pi' and 'e'.
    @param    {String}    iName -- The variable name to be bound
    @returns  {String}    The JavaScript code for accessing the value
    @throws   {VarReferenceError} Base class throws VarReferenceError for
                                  variable names that are not recognized.
   */
  compileVariable: function( iName) {
    switch( iName) {
    case 'pi':
    case 'π':
      return 'Math.PI';
    case 'e':
      return 'Math.E';
    default:
      var eVars = this.get('eVars');
      if( eVars && (eVars[iName] !== undefined))
        return 'e.' + iName;

      var vars = this.get('vars');
      if( vars && (vars[iName] !== undefined))
        return 'c.vars["' + iName + '"]';
    }
    this.registerDependency({ independentSpec: {
                                type: DG.DEP_TYPE_UNDEFINED,
                                id: iName,
                                name: iName
                            }});
    return '(function(){throw new DG.VarReferenceError(\'' + iName + '\');})()';
  },

  /**
    Direct evaluation of the variable without an intervening compilation.
    For the base FormulaContext, this means binding to global constants such as 'pi' and 'e'.
    @param    {String}    iName -- The variable name to be bound
    @returns  {Object}    Return value can be a Number, String, Boolean, error object, etc.
    @throws   {DG.VarReferenceError}  Throws VarReferenceError for variable
                                      names that are not recognized.
   */
  evaluateVariable: function( iName, iEvalContext) {
    switch( iName) {
    case 'pi':
    case 'π':
      return Math.PI;
    case 'e':
      return Math.E;
    default:
      var eValue = iEvalContext && iEvalContext[ iName];
      if( eValue !== undefined)
        return eValue;
      var vars = this.get('vars');
      if( vars && (vars[iName] !== undefined))
        return vars[iName];
    }
    throw new DG.VarReferenceError( iName);
  },

  /**
    Returns true if this context's formula contains aggregate functions, false otherwise.
    @property {Boolean}
   */
  hasAggregates: false,

  /**
    Compiles a function reference into the JavaScript code for evaluating
    the appropriate function. For the base FormulaContext, this means
    binding to global functions such as ln(), log(), round(), etc. as well
    as the standard JavaScript Math functions (sin(), cos(), atan()), etc.
    @param    {String}    iName -- The name of the function to be called.
    @param    {String[]}  iArgs -- array of arguments to the function
    @param    {Number[]}  iAggFnIndices -- array of aggregate function indices
                            indicating the aggregate function call stack, which
                            determines the aggregates that must be invalidated
                            when a dependent changes.
    @returns  {String}    The JavaScript code for calling the specified function
    @throws   {DG.FuncReferenceError} Throws DG.FuncReferenceError for function
                                      names that are not recognized.
   */
  compileFunction: function( iName, iArgs, iAggFnIndices) {

    var checkArgsAndRandom = function(iFn, iArgs) {
      var isRandom = iFn && iFn.isRandom;
      // validate arguments
      checkArgs(iName, iArgs, iFn);
      if (isRandom) {
        // register the 'random' dependency for invalidation
        this.registerDependency({ independentSpec: {
                                    type: DG.DEP_TYPE_SPECIAL,
                                    id: 'random',
                                    name: 'random'
                                  },
                                  aggFnIndices: iAggFnIndices
                                });
      }
    }.bind(this);

    // Functions provided by built-in '_fns' property of context
    var _fn = this._fns && this._fns[iName];
    if (_fn) {
      checkArgsAndRandom(_fn, iArgs);
      return 'c._fns.' + iName + '.evalFn(' + iArgs + ')';
    }

    // Functions provided by client-provided 'fns' property of context
    // Currently only used in unit tests. If continued support is
    // desired should refactor to work with DG.FunctionRegistry.
    var fns = this.get('fns');
    if( fns && typeof fns[iName] === 'function') {
      //checkArgsAndRandom( iName, iArgs, this.get('fnsProps'));
      return 'c.fns.' + iName + '(' + iArgs + ')';
    }

    return '(function(){throw new DG.FuncReferenceError(\'' + iName + '\');})()';
  },

  /**
    Evaluates a function reference directly without compilation. For the base
    FormulaContext, this means binding to global functions such as ln(), log(),
    round(), etc. as well as the standard JavaScript Math functions (sin(), cos(),
    atan(), etc.).
    @param    {String}    iName -- The name of the function to be called.
    @param    {Array}     iArgs -- the arguments to the function
    @returns  {String}    The JavaScript code for calling the specified function
    @throws   {DG.FuncReferenceError} Throws DG.FuncReferenceError for function
                                      names that are not recognized.
   */
  evaluateFunction: function( iName, iArgs) {

    // Functions provided by built-in '_fns' property of context
    var _fn = DG.functionRegistry.getFunction(iName);
    if (_fn) {
      checkArgs(iName, iArgs, this._fns);
      return _fn.evalFn.apply(this._fns, iArgs);
    }

    // Functions provided by client-provided 'fns' property of context
    // Currently only used in unit tests. If continued support is
    // desired should refactor to work with DG.FunctionRegistry.
    var fns = this.get('fns');
    if( fns && typeof fns[iName] === 'function') {
      checkArgs( iName, iArgs, this.get('fnsProps'));
      return fns[iName].apply( fns, iArgs);
    }

    throw new DG.FuncReferenceError( iName);
  }

  }; // end of closure return statement

}()));

/**
  Returns an evaluable JavaScript function that returns the value
  of the specified expression. The function created is of the form:
    function( c, e) { return iExpression };
  where c is the formula context/compile context and e is the evaluation context.
  @returns  {Function}  The evaluable function
 */
DG.FormulaContext.createContextFunction = function( iExpression) {
  /* jslint evil:true */  // allow use of the Function constructor
  return new Function('c', 'e', 'return ' + iExpression);
};
