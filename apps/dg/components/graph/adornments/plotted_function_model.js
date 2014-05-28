// ==========================================================================
//                      DG.PlottedFunctionModel
//
//  Author:   William Finzer
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

sc_require('formula/global_formula_context');
sc_require('components/graph/adornments/plot_adornment_model');

/** @class  The formula context used by the PlottedFunctionModel

  @extends DG.GlobalFormulaContext
*/
DG.PlottedFunctionContext = DG.GlobalFormulaContext.extend({

  /**
    Utility function for identifying the name of the X-axis attribute.
    @param    {String}    iName -- The name of the identifier being matched
    @returns  {Boolean}   True if the identifier matches the name of the
                            x-axis attribute, false otherwise.
   */
  isXAxisName: function( iName) {
    var xName = this.getPath('dataConfiguration.xAttributeDescription.attribute.name');
    return !SC.empty( xName) && (iName === xName);
  },

  /**
    Compiles a variable reference into the JavaScript code for accessing
    the appropriate value. For the PlottedFunctionContext, this means
    binding to 'x' and any global values (e.g. sliders).
    @param    {String}    iName -- The variable name to be bound
    @returns  {String}    The JavaScript code for accessing the value
    @throws   {VarReferenceError} Base class throws VarReferenceError for
                                  variable names that are not recognized.
   */
  compileVariable: function( iName) {
  
    // Plotted functions can always refer to 'x' or the name of the attribute
    // on the x-axis, either of which correspond to the value of the x-axis 
    // for the point being evaluated. For compilation purposes, we assume 
    // that the value is passed in by the client as part
    // of the evaluation context.
    if( (iName === 'x') || this.isXAxisName( iName))
      return 'e.x';
    
    // If we don't match any variables we're in charge of,
    // let the base class have a crack at it.
    return sc_super();
  },
  
  /**
    Direct evaluation of the expression without an intervening compilation.
    This is unlikely to be used for plotted funtions where the expression is
    generally evaluated enough times to make compilation to JavaScript
    worthwhile, but we support it for consistency and completeness.
    @param    {String}    iName -- The variable name to be bound
    @returns  {Number}            The value of the specified variable or global
    @throws   {VarReferenceError} Base class throws VarReferenceError for
                                  variable names that are not recognized.
   */
  evaluateVariable: function( iName, iEvalContext) {

    // Plotted functions can always refer to 'x' or the name of the attribute
    // on the x-axis, either of which correspond to the value of the x-axis 
    // for the point being evaluated. For compilation purposes, we assume 
    // that the value is passed in by the client as part
    // of the evaluation context.
    if( (iName === 'x') || this.isXAxisName( iName))
      return iEvalContext && iEvalContext.x;
    
    // If we don't match any variables we're in charge of,
    // let the base class have a crack at it.
    return sc_super();
  }
  
 });

/** @class  The model for a plotted function.

  @extends DG.PlotAdornmentModel
*/
DG.PlottedFunctionModel = DG.PlotAdornmentModel.extend(
/** @scope DG.PlottedFunctionModel.prototype */ 
{
  /**
    The algebraic expression to plot.
    @property { DG.Formula }
  */
  _expression: null,
  
  /**
    Computed property: Returns the source string for the expression.
    Intended to be used with .get('expression')/.set('expression') to
    get or set the string representation for the formula expression.
    
    For get('expression'):
    @returns  {String}    the formula string used for the expression
    
    For set('expression'):
    @param    {String}    iKey -- Passed by SproutCore (generall 'expression')
    @param    {String}    iValue -- The formula string to use for the expression
    @returns  {Object}    this -- so that methods can be chained
   */
  expression: function( iKey, iValue) {
    if( iValue !== undefined) {
      if( SC.empty( iValue))
        this._expression = null;
      else {
        if( SC.none( this._expression)) {
          this.createDGFormula( iValue);
        }
        else
          this._expression.set('source', iValue);
      }
      return this;  // for chaining
    }
    return (this._expression && this._expression.get('source')) || '';
  }.property(),
  
  /**
    Destruction function.
   */
  destroy: function() {
    if( this._expression)
      this.destroyDGFormula();
    sc_super();
  },
  
  /**
    Utility function for creating the DG.Formula.
   */
  createDGFormula: function( iSource) {
    this._expression = DG.Formula.create({
                                    context: DG.PlottedFunctionContext.create(),
                                    source: iSource });
    this._expression.setPath('context.dataConfiguration', this.get('dataConfiguration'));
    this._expression.addObserver('dependentChange', this, 'dependentDidChange');
  },
  
  /**
    Utility function for destroying the DG.Formula.
   */
  destroyDGFormula: function() {
    this._expression.removeObserver('dependentChange', this, 'dependentDidChange');
    this._expression.destroy();
    this._expression = null;
  },
  
  /**
    Observer function called when the formula indicates that
    a dependent has changed. This method merely propagates the
    notification to clients.
   */
  dependentDidChange: function( iNotifier, iKey) {
    this.notifyPropertyChange( iKey);
  },
  
  /**
    Observer function which invalidates the intermediate compile results
    for the formula when global value names are added, removed, or changed.
    These changes can affect the bindings of the formula, so a recompilation
    is required when they occur.
   */
  globalNamesDidChange: function() {
    // Name changes require recompilation
    if( this._expression)
      this._expression.invalidate();
  }.observes('DG.globalsController.globalNameChanges'),
  
  /**
    Evaluates the plotted function at the specified x value.
    @param    {Number}            The x value at which to evaluated the expression
    @returns  {Number|undefined}  The evaluated result
   */
  evaluate: function( x) {
    if( !this._expression) return;
    // Note that this will propagate any exceptions thrown.
    return this._expression.evaluate({ x: x });
  },

  /**
   * @return { Object }
   */
  createStorage: function() {
    var storage = sc_super();
    
    storage.expression = this.get('expression');

    return storage;
  },

  /**
   * @param { Object } 
   */
  restoreStorage: function( iStorage) {
    sc_super();
    this.set('expression', iStorage.expression);
  }

});

DG.PlotAdornmentModel.registry.plottedValue = DG.PlottedFunctionModel;
DG.PlotAdornmentModel.registry.plottedFunction = DG.PlottedFunctionModel;
