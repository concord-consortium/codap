// ==========================================================================
//                    DG.CollectionFormulaContext
//  
//  Author:   Kirk Swenson
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

sc_require('formula/formula_common');
sc_require('utilities/object_map');

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
    @param    {Object}    iArgSpecs -- An object which contains argument specs
                            for multiple functions, e.g. iArgsSpecs[iName] is
                            the specification for the 'iName' function. The
                            specification is an object with 'min' and 'max' properties.
   */
  var checkArgs = function( iName, iArgs, iArgSpecs) {
        var fArgs = iArgSpecs && iArgSpecs[iName];
        if( fArgs && (iArgs.length < fArgs.min))
          throw new DG.FuncArgsError( iName, fArgs);
      };

  return {
  
  /**
    Called when the formula is recompiled to clear any cached data.
    Derived classes may override as appropriate.
   */
  clearCaches: function() {
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
        return 'c.vars.' + iName;
    }
    return '(function(){throw new DG.VarReferenceError(' + iName + ');})()';
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
    List of function names for use in the Functions popup menu.
    Will need to become hierarchical as the number of functions increases
    beyond the capacity of a simple flat popup menu.
    @property   {Array of String}   Names of functions, e.g. ["abs","acos", ...]
   */
  fnNames: [],
  
  /**
    Property which provides implementation of functions supported by the FormulaContext.
    @property   {Object}  Map of function name {String} to function implementations {Function}.
   */
  _fns: {
    
    /**
      Coerces its argument to a boolean value.
      @param    {Object}  The argument to be coerced to boolean
      @returns  {Boolean} The converted boolean value
     */
    'boolean': function(x) {
      return Boolean(x);
    },
    
    /**
      Returns the fractional part of its argument.
      @param    {Number}  The numeric value whose fractional part is to be returned
      @returns  {Number}  The fractional part of its numeric argument
     */
    'frac': function(x) {
      return x - this.trunc(x);
    },
    
    /**
      Returns the natural logarithm (base e) of its argument.
      @param    {Number}  The numeric value whose natural log is to be returned
      @returns  {Number}  The natural log of its numeric argument
     */
    'ln': function(x) {
      return Math.log(x);
    },
    
    /**
      Returns the base 10 logarithm of its argument. Note: We override Math.log
      to provide the base 10 log here. Use ln() for the natural log.
      @param    {Number}  The numeric value base 10 log is to be returned
      @returns  {Number}  The base 10 log of its numeric argument
     */
    'log': function(x) {
      return Math.log(x) / Math.LN10;
    },
    
    /**
      Coerces its argument to a numeric value.
      @param    {Object}  The argument to be coerced to a number
      @returns  {Number}  The converted numeric value
     */
    'number': function(x) {
      return Number(x);
    },
    
    /**
      Random number generator. Override of Math.random() to provide more flexibility.
      random()        -- Generates a random number in the range [0,1).
      random(max)     -- Generates a random number in the range [0,max).
      random(min,max) -- Generates a random number in the range [min,max).
      @param    {Number}  x1 -- If present alone, the maximum value of the random number.
                                If first of two argument, the minimum value of the random number.
      @param    {Number}  x2 -- The maximum value of the random number.
      @returns  {Number}  The generated random number
     */
    'random': function(x1,x2) {
      // random()
      if( SC.none(x1))
        return Math.random();
      // random(max)
      if( SC.none(x2))
        return x1 * Math.random();
      // random(min,max)
      return x1 + (x2 - x1) * Math.random();
    },
    
    /**
      Rounds a number to the nearest integer or specified decimal place.
      @param    {Number}  x -- The number to be rounded
      @param    {Number}  n -- {optional} The number of decimal places to round to (default 0).
      @returns  {Number}  The rounded result
     */
    'round': function(x,n) {
      if( SC.none(n))
        return Math.round(x);
      var npow = Math.pow(10, this.trunc(n));
      return Math.round(npow * x) / npow;
    },
    
    /**
      Coerces its argument to a string value.
      @param    {Object}  The argument to be coerced to a string
      @returns  {String}  The converted string value
     */
    'string': function(x) {
      return String(x);
    },
    
    /**
      Returns the integer part of its argument.
      @param    {Number}  The numeric value whose integer part is to be returned
      @returns  {Number}  The integer part of its numeric argument
     */
    'trunc': function(x) {
      return x < 0 ? Math.ceil(x) : Math.floor(x);
    }
  },
  
  /**
    Property which provides meta-data about the functions supported by the '_fns' property.
    @property   {Object}  Map of name {String} to {Object}.
   */
  _fnsArgs: {
    'boolean': { min:1, max:1 },
    'frac': { min:1, max:1 },
    'ln': { min:1, max:1 },
    'log': { min:1, max:1 },
    'number': { min:1, max:1 },
    'random': { min:0, max:2 },
    'round': { min:1, max:2 },
    'string': { min:1, max:1 },
    'trunc': { min:1, max:1 }
  },
  
  /**
    Property which provides meta-data about the functions supported by the JavaScript Math class.
    @property   {Object}  Map of name {String} to {Object}.
   */
  _MathArgs: {
    'abs': { min:1, max:1 },
    'acos': { min:1, max:1 },
    'asin': { min:1, max:1 },
    'atan': { min:1, max:1 },
    'atan2': { min:2, max:2 },
    'ceil': { min:1, max:1 },
    'cos': { min:1, max:1 },
    'exp': { min:1, max:1 },
    'floor': { min:1, max:1 },
    //'log': { min:1, max:1 },    // replaced by DG version
    'max': { min:1, max:'n' },
    'min': { min:1, max:'n' },
    'pow': { min:2, max:2 },
    //'random': { min:0, max:0 }, // replaced by DG version
    //'round': { min:1, max:1 },  // replaced by DG version
    'sin': { min:1, max:1 },
    'sqrt': { min:1, max:1 },
    'tan': { min:1, max:1 }
  },
  
  /**
    Compiles a function reference into the JavaScript code for evaluating
    the appropriate function. For the base FormulaContext, this means
    binding to global functions such as ln(), log(), round(), etc. as well
    as the standard JavaScript Math functions (sin(), cos(), atan()), etc.
    @param    {String}    iName -- The name of the function to be called.
    @param    {Array}     iArgs -- the arguments to the function
    @returns  {String}    The JavaScript code for calling the specified function
    @throws   {DG.FuncReferenceError} Throws DG.FuncReferenceError for function
                                      names that are not recognized.
   */
  compileFunction: function( iName, iArgs) {
    
    // Functions provided by built-in '_fns' property of context
    var _fns = this.get('_fns');
    if( _fns && typeof _fns[iName] === 'function') {
      checkArgs( iName, iArgs, this.get('_fnsArgs'));
      return 'c._fns.' + iName + '(' + iArgs + ')';
    }

    // Other functions of JavaScript Math object
    if( typeof Math[iName] === 'function') {
      checkArgs( iName, iArgs, this._MathArgs);
      return 'Math.' + iName + '(' + iArgs + ')';
    }

    // Functions provided by client-provided 'fns' property of context
    var fns = this.get('fns');
    if( fns && typeof fns[iName] === 'function') {
      checkArgs( iName, iArgs, this.get('fnsArgs'));
      return 'c.fns.' + iName + '(' + iArgs + ')';
    }

    return '(function(){throw new DG.FuncReferenceError(' + iName + ');})()';
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
    var _fns = this.get('_fns');
    if( _fns && typeof _fns[iName] === 'function') {
      checkArgs( iName, iArgs, this.get('_fnsArgs'));
      return _fns[iName].apply( _fns, iArgs);
    }

    // Other functions of JavaScript Math object
    if( typeof Math[iName] === 'function') {
      checkArgs( iName, iArgs, this._MathArgs);
      return Math[iName].apply( Math, iArgs);
    }

    // Functions provided by client-provided 'fns' property of context
    var fns = this.get('fns');
    if( fns && typeof fns[iName] === 'function') {
      checkArgs( iName, iArgs, this.get('fnsArgs'));
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

/**
  Adds the names of the functions in iModule to the fnNames property,
  for use in creating the function popup menu. The properties of the
  iModule object are assumed to be functions, and the names are taken
  from the names of the properties. This will need some adjustment when
  localization is taken into account.
  @param  {Object}  iModule -- Properties are functions
 */
DG.FormulaContext.registerFnModule = function( iModule) {
  var fnNames = DG.FormulaContext.prototype.fnNames;
  // Use push.apply() to push the array elements instead of the array.
  fnNames.push.apply( fnNames, DG.ObjectMap.keys( iModule));
  fnNames.sort();
};

/**
  Register the base function modules built into the context.
 */
DG.FormulaContext.registerFnModule( DG.FormulaContext.prototype._fns);
DG.FormulaContext.registerFnModule( DG.FormulaContext.prototype._MathArgs);

/**
  Returns an array of function names for all the supported functions,
  along with empty parentheses after the function name.
  @returns  {Array of String}   The array of function names (with parentheses)
 */
DG.FormulaContext.getFunctionNamesWithParentheses = function() {
  var names = DG.FormulaContext.prototype.fnNames;
  return names.map( function( iName) {
                      return iName + "()";
                    });
};

