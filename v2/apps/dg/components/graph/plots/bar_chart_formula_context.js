sc_require('formula/collection_formula_context');

/** @class  The formula context used by the PlottedFunctionModel

 @extends DG.GlobalFormulaContext
 */
DG.BarChartFormulaContext = DG.CollectionFormulaContext.extend((function () {

  return {

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
      var varID = this.getPath('plotModel.primaryVarID'),
          varAttr = varID && DG.Attribute.getAttributeByID(varID),
          varName = varAttr && varAttr.get('name');
      return varName || null;
    }.property('plotModel'),

    /**
     Utility function for identifying the name of the X-axis attribute.
     @param    {String}    iName -- The name of the identifier being matched
     @returns  {Boolean}   True if the identifier matches the name of the
     x-axis attribute, false otherwise.
     */
    isPrimaryVarName: function (iName) {
      return !!iName && (iName === this.get('primaryVarName'));
    }.property('primaryVarName'),

    /**
     Utility function for identifying the ID of the primary categorical attribute.
     @returns  {String}  the ID of the primary categorical variable
     */
    groupVarID: function () {
      // we always want to override the default
      return this.getPath('plotModel.primaryVarID') || -1;
    }.property('plotModel'),

    /**
     * Return true if the given case is currently among those being plotted.
     *
     * @param  {Object}              iEvalContext -- { _case_: , _id_: }
     * @return {boolean}
     */
    filterCase: function (iEvalContext) {
      var tResult = sc_super(),
          tCases = this.getPath('plotModel.cases');
      return tResult && tCases.indexOf(iEvalContext._case_) >= 0;
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
     Called by the DependencyMgr to invalidate dependent nodes.
     @param {object}     ioResult
     @param {object}     iDependent
     @param {object}     iDependency
     @param {DG.Case[]}  iCases - array of cases affected
     if no cases specified, all cases are affected
     @param {boolean}    iForceAggregate - treat the dependency as an aggregate dependency
     */
    invalidateDependent: function (ioResult, iDependent, iDependency, iCases, iForceAggregate) {
      sc_super();

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
