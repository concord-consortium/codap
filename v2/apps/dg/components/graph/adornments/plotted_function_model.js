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

sc_require('formula/collection_formula_context');
sc_require('components/graph/adornments/plot_adornment_model');

/** @class  The formula context used by the PlottedFunctionModel

 @extends DG.GlobalFormulaContext
 */
DG.PlottedFunctionContext = DG.CollectionFormulaContext.extend((function () {

  return {

    /**
     Set on construction: ['plottedValue' | 'plottedFunction']
     @type {string}
     */
    adornmentKey: null,

    /**
     Set on construction
     @type {DG.PlotModel}
     */
    plotModel: null,

    /**
     Utility function for identifying the name of the primary attribute.
     @returns  {String}  the name of the variable on the primary axis
     */
    primaryVarName: function () {
      var xVarID = this.getPath('plotModel.primaryVarID') || this.getPath('plotModel.xVarID'),
          xVarAttr = xVarID && DG.Attribute.getAttributeByID(xVarID),
          xVarName = xVarAttr && xVarAttr.get('name');
      return !SC.empty(xVarName) ? xVarName : null;
    }.property('plotModel'),

    /**
     Utility function for identifying the name of the X-axis attribute.
     @param    {String}    iName -- The name of the identifier being matched
     @returns  {Boolean}   True if the identifier matches the name of the
     x-axis attribute, false otherwise.
     */
    isPrimaryVarName: function (iName) {
      if (SC.empty(iName)) return false;
      if (iName === this.get('primaryVarName')) return true;
      if ((iName === 'x') && (this.get('adornmentKey') === 'plottedFunction')) return true;
      return false;
    }.property('primaryVarName'),

    /**
     Utility function for identifying the ID of the secondary/split attribute.
     @returns  {String}  the ID of the variable on the secondary axis
     */
    groupVarID: function () {
      // for plotted values/functions, we always want to override the default
      // grouping by collection; therefore, if we don't have a split attribute
      // we specify a non-falsy 'groupVarID' which will prevent the default
      // grouping but won't actually generate values that would split into groups.
      return this.getPath('plotModel.secondaryVarID') || -1;
    }.property('plotModel'),

    /**
     * Return true if the given case is currently among those being plotted.
     *
     * @param  {Object}              iEvalContext -- { _case_: , _id_: }
     * @return {boolean}
     */
    filterCase: function (iEvalContext) {
      var tResult = sc_super(),
          tCases = this.getPath('plotModel.enableMeasuresForSelection') ?
              this.getPath('plotModel.selection') : this.getPath('plotModel.cases');
      return tResult && tCases.indexOf(iEvalContext._case_) >= 0;
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
    compileVariable: function (iName) {

      // Plotted functions can always refer to 'x' or the name of the attribute
      // on the x-axis, either of which correspond to the value of the x-axis
      // for the point being evaluated. For compilation purposes, we assume
      // that the value is passed in by the client as part
      // of the evaluation context.
      if (this.isPrimaryVarName(iName)) {
        if (this.get('adornmentKey') === 'plottedValue') {
          // let base class handle it by attribute name
          // cf. http://sproutcore-gyan.blogspot.com/2010/03/modify-argument-value-before-calling.html
          iName = this.get('primaryVarName');
        }
        else {
          return 'e.x';
        }
      }

      // If we don't match any variables we're in charge of,
      // let the base class have a crack at it.
      return sc_super();
    },

    /**
     Called when the formula has been recompiled to clear any stale dependencies.
     Derived classes may override as appropriate.
     */
    didCompile: function () {
      sc_super();

      // register the 'plot' dependency for invalidation
      var plotModel = this.get('plotModel'),
          // TODO: use a more robust ID
          plotID = DG.Debug.scObjectID(plotModel);
      this.registerDependency({
        independentSpec: {
          type: DG.DEP_TYPE_PLOT,
          id: plotID,
          name: 'plot-' + plotID
        },
        aggFnIndices: this.ALL_FUNCTIONS
      });
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
    evaluateVariable: function (iName, iEvalContext) {

      // Plotted functions can always refer to 'x' or the name of the attribute
      // on the x-axis, either of which correspond to the value of the x-axis
      // for the point being evaluated. For compilation purposes, we assume
      // that the value is passed in by the client as part
      // of the evaluation context.
      if (this.isPrimaryVarName(iName)) {
        if (this.get('adornmentKey') === 'plottedValue') {
          // let base class handle it by attribute name
          // cf. http://sproutcore-gyan.blogspot.com/2010/03/modify-argument-value-before-calling.html
          iName = this.get('primaryVarName');
        }
        else {
          return iEvalContext.x;
        }
      }

      // If we don't match any variables we're in charge of,
      // let the base class have a crack at it.
      return sc_super();
    },

    /**
     Builds the array of argument expressions.
     */
    marshalArguments: function (iAggregateFn, iEvalContext, iInstance) {
      sc_super();

      var reqArgs = iAggregateFn.get('requiredArgs'),
          argCount = iInstance.args.length;
      // if not enough arguments were specified, make a reference to the primary
      // univariate variable available, since some functions will use it
      if ((argCount < reqArgs.min) && (this.get('adornmentKey') === 'plottedValue')) {
        var uniVarName = this.get('primaryVarName'),
            uniVarExpr = uniVarName
                && this.compileVariable(uniVarName, iInstance.aggFnIndices);
        if (uniVarExpr)
          iInstance.argFns.unshift(DG.FormulaContext.createContextFunction(uniVarExpr));
      }
    },

    /**
     Called by the DependencyMgr to invalidate dependent nodes.
     @param {object}     ioResult
     @param {object}     iDependent
     @param {object}     iDependency
     @param {DG.Case[]}  iCases - array of cases affected
     if no cases specified, all cases are affected
     @param {boolean}    iForceAggregate - treat the dependency as an aggregate dependency
     */
    invalidateDependent: function (ioResult, iDependent, iDependency, iCases, iForceAggregate) {
      // invalidate affected aggregate functions
      if (iDependency.aggFnIndices)
        this.invalidateFunctions(iDependency.aggFnIndices);
      // Note that there is a redundancy between this notification, which indicates when
      // any dependent has changed, and the DG.GlobalFormulaContext sending of the same
      // notification when a global value changes. Ultimately, the GlobalFormulaContext
      // mechanism should be disabled, but we leave that for another day.
      this.notifyPropertyChange('dependentChange');
    }

  }; // return from function closure
}())); // function closure


/** @class  The model for a plotted function.

 @extends DG.PlotAdornmentModel
 */
DG.PlottedFunctionModel = DG.PlotAdornmentModel.extend(
    /** @scope DG.PlottedFunctionModel.prototype */
    {
      /**
       The algebraic expression to plot.
       @property {DG.Formula}
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
      expression: function (iKey, iValue) {
        if (iValue !== undefined) {
          var tSiblings = this.get('siblingPlottedFunctions');
          if( tSiblings)
            tSiblings.forEach( function( iPlottedFunctionModel) {
              iPlottedFunctionModel.set('expression', iValue);
            });
          if (SC.empty(iValue))
            this._expression = null;
          else {
            if (SC.none(this._expression)) {
              this.createDGFormula(iValue);
            }
            else
              this._expression.set('source', iValue);
          }
          return this;  // for chaining
        }
        return (this._expression && this._expression.get('source')) || '';
      }.property(),

      /**
       * In the context of split plots, one plotted function drives the equations of all others
       * @property {[DG.PlottedFunctionModel]}
     */
      siblingPlottedFunctions: null,

      /**
       Destruction function.
       */
      destroy: function () {
        if (this._expression)
          this.destroyDGFormula();
        DG.PlottedFormulaEditContext.destroyFormulaEditContext( this.get('id'));
        sc_super();
      },

      /**
       Utility function for creating the DG.Formula.
       */
      createDGFormula: function (iSource) {
        var adornmentKey = this.get('adornmentKey'),
            id = this.get('id'),
            owner = {type: adornmentKey, id: id, name: adornmentKey + id},
            context = DG.PlottedFunctionContext
                .create({
                  ownerSpec: owner,
                  adornmentKey: adornmentKey,
                  plotModel: this.get('plotModel'),
                  collection: this.get('primaryCollection')
                });
        this._expression = DG.Formula.create({context: context, source: iSource});
        this._expression.addObserver('dependentChange', this, 'dependentDidChange');
      },

      /**
       Utility function for destroying the DG.Formula.
       */
      destroyDGFormula: function () {
        this._expression.removeObserver('dependentChange', this, 'dependentDidChange');
        this._expression.destroy();
        this._expression = null;
      },

      /**
       Utility function to return the collection represented by the attribute on the
       "primary" axis (X for scatter plots, could be X or Y for univariate plots)
       */
      primaryCollection: function () {
        var attrID = this.getPath('plotModel.primaryVarID') || this.getPath('plotModel.xVarID'),
            attribute = attrID && DG.Attribute.getAttributeByID(attrID),
            collection = attribute && attribute.get('collection');
        return collection;
      }.property('plotModel'),

      /**
       Utility function to return the split axis, i.e. the categorical attribute
       on the secondary axis, if any.
       */
      splitAxisModel: function () {
        if (!this.getPath('plotModel.yAxis.isNumeric'))
          return this.getPath('plotModel.yAxis');
        if (!this.getPath('plotModel.xAxis.isNumeric'))
          return this.getPath('plotModel.xAxis');
        return null;
      }.property('plotModel'),

      /**
       Observer function called when the formula indicates that
       a dependent has changed. This method merely propagates the
       notification to clients.
       */
      dependentDidChange: function (iNotifier, iKey) {
        this.notifyPropertyChange(iKey);
      },

      /**
       Observer function which invalidates the intermediate compile results
       for the formula when global value names are added, removed, or changed.
       These changes can affect the bindings of the formula, so a recompilation
       is required when they occur.
       */
      globalNamesDidChange: function () {
        // Name changes require recompilation
        this.invalidateExpression();
      }.observes('DG.globalsController.globalNameChanges'),

      /**
       Recompilation will force us to pay attention to changed cases
       */
      enableMeasuresForSelectionDidChange: function () {
        // Requires recompilation
        this.invalidateExpression();
      }.observes('enableMeasuresForSelection'),

      /**
       Invalidate the expression so it gets recompiled/evaluated.
       */
      invalidateExpression: function () {
        if (this._expression)
          this._expression.invalidate();
      },

      /**
       Evaluates the plotted function at the specified x value.
       @param    {Object}            The set of values available to the expression the expression
       @returns  {Number|undefined}  The evaluated result
       */
      evaluate: function (iEvalContext) {
        if (!this._expression) return;

        // Note that this will propagate any exceptions thrown.
        return this._expression.evaluate(iEvalContext);
      },

      /**
       * @return { Object }
       */
      createStorage: function () {
        var storage = sc_super();

        storage.adornmentKey = this.get('adornmentKey');
        storage.expression = this.get('expression');

        return storage;
      },

      /**
       * @param { Object }
       */
      restoreStorage: function (iStorage) {
        sc_super();
        this.set('adornmentKey', iStorage.adornmentKey);
        this.set('expression', iStorage.expression);
      }

    });

DG.PlotAdornmentModel.registry.plottedValue = DG.PlottedFunctionModel;
DG.PlotAdornmentModel.registry.plottedFunction = DG.PlottedFunctionModel;
