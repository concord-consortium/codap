// ==========================================================================
//                            DG.GraphModel
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

sc_require('components/graph_map_common/data_display_model');

/** @class  DG.GraphModel - The model for a graph.

 @extends DG.DataDisplayModel
 */
DG.GraphModel = DG.DataDisplayModel.extend(
  /** @scope DG.GraphModel.prototype */
  {
    autoDestroyProperties: [ 'plot', 'xAxis', 'yAxis' ],

    dataConfigurationClass: function() {
      return DG.GraphDataConfiguration;
    }.property(),
    
    /**
     * @property {DG.NumberToggleModel}
     */
    numberToggle: null,

    /**
     @property { DG.AxisModel }
     */
    xAxis: null,

    /**
     @property { DG.AxisModel }
     */
    yAxis: null,

    /**
     * Returns the first plot in _plots, if any. When used to set,
     * wipes out the current array and replaces it with a new array
     * containing just iValue
     * TODO: This function property may not be used any more. If so, get rid of it.
     *
     * @param iKey
     * @param iPlot
     * @return {DG.Plot}
     */
    plot: function( iKey, iPlot) {
      if( !SC.none( iPlot)) {
        this._plots.forEach( function( iPlot) {
          iPlot.removeObserver('connectingLine', this, this.connectingLineChanged);
          iPlot.destroy();
        });
        this._plots = [ iPlot];
        // TODO: Figure out a more elegant way to observe this property
        iPlot.addObserver('connectingLine', this, this.connectingLineChanged);
      }
      return (this._plots.length < 1) ? null : this._plots[0];
    }.property(),

    _plots: null,

    plots: function() {
      return this._plots;
    }.property(),

    lastPlot: function() {
      var tNumPlots = this._plots.length;
      return ( tNumPlots > 0) ? this._plots[ tNumPlots - 1] : null;
    }.property(),

    /**
     * Return the plot at the given index, null if out of bounds
     * @param iIndex
     * @return {DG.Plot}
     */
    getPlotAtIndex: function( iIndex) {
      if( iIndex < this._plots.length) {
        return this._plots[ iIndex];
      }
      return null;
    },

    /**
     * If not already present, adds the given attribute to my array.
     * @param iPlot
     */
    addPlot: function( iPlot) {
      if( !this._plots.contains( iPlot)) {
        var tFirstPlot = this.get('plot');
        // TODO: Clumsy way to transfer setting for connectingLine. Fix it!
        if( tFirstPlot.isAdornmentVisible('connectingLine'))
          iPlot.toggleAdornmentVisibility('connectingLine');
        this._plots.push( iPlot);
      }
    },

    /**
     * In addition to removing the plot, synchronize the remaining plots' yAttributeIndex
     * @param iIndex {Number}
     */
    removePlotAtIndex: function( iIndex) {
      DG.assert( iIndex < this._plots.length);
      var tPlot = this._plots[ iIndex];
      this._plots.splice( iIndex, 1);
      tPlot.destroy();
      this._plots.forEach( function( iPlot, iIndex) {
        iPlot.setIfChanged( 'yAttributeIndex', iIndex);
      });
    },

    /**
     Observers can use this property to know when to get ready for a change; e.g. to set up a cache of current
     point positions for an animation.
     @property {Boolean}
     */
    aboutToChangeConfiguration: false,

    /**
     Keep plot axis in synch
     */
    xAxisChanged: function() {
      var tPlot = this.get( 'plot' );
      if( !SC.none( tPlot ) )
        tPlot.set( 'xAxis', this.get( 'xAxis' ) );
    }.observes( 'xAxis' ),

    /**
     Keep plot axis in synch
     */
    yAxisChanged: function() {
      var tPlot = this.get( 'plot' );
      if( !SC.none( tPlot ) )
        tPlot.set( 'yAxis', this.get( 'yAxis' ) );
    }.observes( 'yAxis' ),

    /**
     * The menu item applies to the zeroth plot. We pass this command along to any other
     * plots as well.
     */
    connectingLineChanged: function() {
      var tPlots = this.get('plots' ),
          tVisible = (tPlots.length > 0) ? tPlots[0].getAdornmentModel('connectingLine' ).get('isVisible') : false;
      this.get('plots' ).forEach( function( iPlot, iIndex) {
        if( iIndex > 0)
          iPlot.setAdornmentVisibility( 'connectingLine', tVisible);
      });
    },

    /**
     Prepare dependencies.
     */
    init: function() {
      var tXDescription, tYDescription;

      sc_super();
      
      function getAxisClassFromType( iType) {
        if( iType === DG.Analysis.EAttributeType.eNumeric)
          return DG.CellLinearAxisModel;
        else if( iType === DG.Analysis.EAttributeType.eCategorical)
          return DG.CellAxisModel;
        else
          return DG.AxisModel;
      }

      this._plots = [];

      if( DG.IS_INQUIRY_SPACE_BUILD) {
        this.set('numberToggle', DG.NumberToggleModel.create( { dataConfiguration: this.get('dataConfiguration')}));
      }
      tXDescription = this.dataConfiguration.get( 'xAttributeDescription' );
      tYDescription = this.dataConfiguration.get( 'yAttributeDescription' );

      this.set( 'xAxis', getAxisClassFromType( tXDescription.get('attributeType')).create() );
      this.setPath('xAxis.attributeDescription', tXDescription);
      this.set( 'yAxis', getAxisClassFromType( tYDescription.get('attributeType')).create() );
      this.setPath('yAxis.attributeDescription', tYDescription);

      this.synchPlotWithAttributes();

      // We might already have some data, so let's adapt to it. But it would seem that we can't
      // possibly have data, so it's a mystery why we have to call rescaleAxesFromData
      // TODO: Understand this better
      this.invalidate();
      this.rescaleAxesFromData( true /* allow scale shrinkage */,
                                true /* animate points */ );
    },

    destroy: function() {
      sc_super();
    },

    /**
      Sets the attribute for the specified axis.
      @param  {DG.DataContext}      iDataContext -- The data context for this graph
      @param  {Object}              iAttrRefs --
              {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
              {DG.Attribute}        iAttrRefs.attributes -- The array of attributes to set for the axis
      @param  {String}              iOrientation -- identifies the axis ('horizontal' or 'vertical')
     */
    changeAttributeForAxis: function( iDataContext, iAttrRefs, iOrientation) {
      var tDescKey = (iOrientation === 'horizontal') ?
                         'xAttributeDescription' : 'yAttributeDescription',
          tAxisKey = (iOrientation === 'horizontal') ? 'xAxis' : 'yAxis';

      DG.logUser("plotAxisAttributeChange: { orientation: %@, attribute: %@ }", 
                  iOrientation, iAttrRefs.attributes[0].get('name'));
      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      var dataConfiguration = this.get('dataConfiguration');
      dataConfiguration.set('dataContext', iDataContext);
      dataConfiguration.setAttributeAndCollectionClient( tDescKey, iAttrRefs);

      // Make sure correct kind of axis is installed
      this.privSyncAxisWithAttribute( tDescKey, tAxisKey );
      this.invalidate();
      this.set('aboutToChangeConfiguration', false ); // reset for next time
    },

    /**
      Sets the attribute for the specified axis.
      @param  {DG.DataContext}      iDataContext -- The data context for this graph
      @param  {Object}              iAttrRef -- The attribute to set for the axis
              {DG.CollectionClient} iAttrRef.collection -- The collection that contains the attribute
              {DG.Attribute}        iAttrRef.attribute -- The attribute to set for the axis
      @param  {String}              iOrientation -- identifies the axis ('horizontal' or 'vertical')
     */
    addAttributeToAxis: function( iDataContext, iAttrRef) {
      DG.logUser("addAxisAttribute: { attribute: %@ }", iAttrRef.attribute.get('name'));

      var tYAttrDescription = this.getPath('dataConfiguration.yAttributeDescription' ),
          tAttrIndex = tYAttrDescription.get('attributes' ).length;
      tYAttrDescription.addAttribute( iAttrRef.attribute);

      // The only plot we can currently make with multiple attributes is a scatterplot
      var tPlot = DG.ScatterPlotModel.create();
      tPlot.beginPropertyChanges();
      tPlot.setIfChanged( 'dataConfiguration', this.get('dataConfiguration') );
      tPlot.setIfChanged( 'xAxis', this.get( 'xAxis' ) );
      tPlot.setIfChanged( 'yAxis', this.get( 'yAxis' ) );
      tPlot.set('yAttributeIndex', tAttrIndex);
      tPlot.endPropertyChanges();

      this.addPlot( tPlot);

      this.notifyPropertyChange('attributeAdded');
    },
    /**
     * Useful for knowing whether we can rescale.
     * @return {Boolean}
     */
    hasNumericAxis: function() {
      return this.getPath('xAxis.isNumeric') || this.getPath('yAxis.isNumeric');
    }.property(),

    rescaleAxesFromData: function( iShrink, iAnimate) {
      var tPlot = this.get('plot');
      if( tPlot)
        tPlot.rescaleAxesFromData( iShrink, iAnimate);
    },

    /**
     * Change the attribute type (EAttributeType) on the axis described by the given key,
     * to treat a Numeric attribute as Categorical.
     * @param{String} iDescKey - key to the desired attribute description (x...|y...|legendAttributeDescription)
     * @param{String} iAxisKey - key to the axis whose attribute is to be removed (x...|yAxis)
     * @param{Boolean} true if we want to treat the attribute as numeric (else categorical).
     */
    changeAttributeType: function( iDescKey, iAxisKey, iTreatAsNumeric ) {
      var tDataConfiguration = this.get('dataConfiguration');

      DG.logUser("plotAxisAttributeChangeType: { axis: %@, attribute: %@ }",
          iAxisKey, tDataConfiguration.getPath( iDescKey + '.attribute.name'));
      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      tDataConfiguration.setAttributeType( iDescKey, iTreatAsNumeric );

      if( iDescKey === 'xAttributeDescription' || iDescKey === 'yAttributeDescription')
        this.privSyncAxisWithAttribute( iDescKey, iAxisKey );
      this.invalidate( null, true /* also invalidate plot caches */);
      this.set('aboutToChangeConfiguration', false ); // reset for next time
    },

    /**
     * Sychronize the axis model to a new attribute or attribute description, to sure correct kind of axis is installed.
     * @param{String} iDescKey - key to the desired attribute description (x...|yAttributeDescription)
     * @param{String} iAxisKey - key to the axis to be changed (x...|yAxis)
     */
    privSyncAxisWithAttribute: function( iDescKey, iAxisKey ) {
      var tDataConfiguration = this.get('dataConfiguration'),
          tVarIsNumeric = tDataConfiguration.getPath( iDescKey + '.isNumeric'),
          tAxisIsNumeric = this.getPath( iAxisKey + '.isNumeric' );

      // If the variable and axis are incompatible, we'll have to change the axis
      if( tAxisIsNumeric !== tVarIsNumeric ) {
        var tAxisToDestroy = this.get( iAxisKey ),
            tNewAxis = tVarIsNumeric ? DG.CellLinearAxisModel.create() :
                       DG.CellAxisModel.create();
        tNewAxis.set( 'attributeDescription', tDataConfiguration.get( iDescKey ) );
        this.set( iAxisKey, tNewAxis );
        tAxisToDestroy.destroy();

        this.synchPlotWithAttributes();
      }
    },

    /**
     Figure out the appropriate plot for the current attribute configuration. If it is not
     the current plot, switch.
     We have need of three local variables that point to a plot.
       tCurrentPlot is the plot instance (possibly null) when we start
       tNewPlot is any new plot we create
       tOperativePlot is the actual plot with which we proceed. It may be the same as tCurrentPlot or tNewPlot.
       At the end, we figure out whether tCurrentPlot has to be destroyed or not based on whether there was a
         current plot and whether we made a new plot.
     */
    synchPlotWithAttributes: function() {
      var tConfig = this.get( 'dataConfiguration' ),
        tXType = tConfig.get( 'xType' ),
        tYType = tConfig.get( 'yType' ),
        tCurrentPlot = this.get( 'plot' ),
        tNewPlotClass, tNewPlot, tOperativePlot,
        tPlotTable,
        tAdornmentModels = {};
      // The elements of this table are the classes for the new plot under each of the 9
      //  possible pairs for x and y attribute types.
      tPlotTable = [
        [ // x has no attribute
          DG.CasePlotModel /* y has none */, DG.DotPlotModel /* y is numeric */, DG.DotChartModel /* y is categorical */
        ],
        [ // x is numeric
          DG.DotPlotModel /* y has none */, DG.ScatterPlotModel /* y is numeric */, DG.DotPlotModel /* y is categorical */
        ],
        [ // x is categorical
          DG.DotChartModel /* y has none */, DG.DotPlotModel /* y is numeric */, DG.DotChartModel /* y is categorical */
        ]
      ];

      tNewPlotClass = tPlotTable[ tXType][ tYType];
      if( SC.none( tNewPlotClass ) )
        tNewPlotClass = DG.PlotModel;

      tNewPlotClass.configureRoles( tConfig );
      if( SC.none( tCurrentPlot ) || (tNewPlotClass !== tCurrentPlot.constructor) )
        tNewPlot = tOperativePlot = tNewPlotClass.create();
      else
        tOperativePlot = tCurrentPlot;

      if( tCurrentPlot && tOperativePlot !== tCurrentPlot ) {
        // copy adornments that work across plot types
        tAdornmentModels = tCurrentPlot.copyAdornmentModels( tOperativePlot );
      }

      tOperativePlot.beginPropertyChanges();
      tOperativePlot.setIfChanged( 'dataConfiguration', tConfig );
      tOperativePlot.setIfChanged( 'xAxis', this.get( 'xAxis' ) );
      tOperativePlot.setIfChanged( 'yAxis', this.get( 'yAxis' ) );
      for( var tProperty in tAdornmentModels ) {
        if( tAdornmentModels.hasOwnProperty( tProperty )) {
          tOperativePlot.setIfChanged( tProperty, tAdornmentModels[tProperty] );
        }
      }
      tOperativePlot.endPropertyChanges();

      this.setIfChanged('plot', tOperativePlot);

      if( !SC.none(tNewPlot) && !SC.none(tCurrentPlot))
        tCurrentPlot.destroy();
    },

    /**
     Remove the attribute on the axis described by the given key.
     @param{String} key to the desired attribute description
     @param{String} key to the axis whose attribute is to be removed
     @param{Number} index of attribute in the list
     */
    removeAttribute: function( iDescKey, iAxisKey, iAttrIndex ) {

      var
        /**
         * This is the normal case - there's one attribute assigned to the axis, and we remove it.
         * When we remove the last attribute, we have to do some plot reconfiguration. When it's not
         * the last attribute, we assume that the plot configuration remains the same.
         */
        removeLastAttribute = function() {
          var tName = tConfig.getPath( iDescKey + '.attribute' + '.name'),
              tAxisToDestroy = this.get( iAxisKey ),
              tNewAxis = DG.AxisModel.create(),
              tOtherDesc = (iDescKey === 'xAttributeDescription') ? 'yAttributeDescription' : 'xAttributeDescription',
              tSecondaryRole, tPrimaryRole;

          DG.logUser("attributeRemoved: %@", tName);

          this.set( 'aboutToChangeConfiguration', true ); // signals dependents to prepare

          tNewAxis.set( 'attributeDescription', tConfig.get( iDescKey ) );
          this.set( iAxisKey, tNewAxis );
          tAxisToDestroy.destroy();

          tConfig.setAttributeAndCollectionClient( iDescKey, null);
          // The role of the attribute placement description on the axis whose attribute is removed must be secondary
          // and the other axis role must now be primary
          switch( this.getPath( 'dataConfiguration.' + tOtherDesc + '.attributeType' ) ) {
            case DG.Analysis.EAttributeType.eNumeric:
              tSecondaryRole = DG.Analysis.EAnalysisRole.eSecondaryNumeric;
              tPrimaryRole = DG.Analysis.EAnalysisRole.ePrimaryNumeric;
              break;
            case DG.Analysis.EAttributeType.eCategorical:
              tSecondaryRole = DG.Analysis.EAnalysisRole.eSecondaryCategorical;
              tPrimaryRole = DG.Analysis.EAnalysisRole.ePrimaryCategorical;
              break;
            default:
              tSecondaryRole = DG.Analysis.EAnalysisRole.eNone;
              tPrimaryRole = DG.Analysis.EAnalysisRole.eNone;
          }
          tConfig.get( iDescKey ).set( 'role', tSecondaryRole );
          tConfig.get( tOtherDesc ).set( 'role', tPrimaryRole );

          this.synchPlotWithAttributes();

          this.invalidate();
          this.set( 'aboutToChangeConfiguration', false ); // reset for next time
        }.bind(this),

        /**
         * We're removing one of 2 or more attributes. The axis will stay the same. One plot will be removed.
         */
        removeIndexedAttribute = function() {
          var tAttrDesc = tConfig.get( iDescKey);
          tAttrDesc.removeAttributeAtIndex( iAttrIndex);
          this.removePlotAtIndex( iAttrIndex);

          this.notifyPropertyChange('attributeRemoved');
        }.bind(this);

      iAttrIndex = iAttrIndex || 0;
      var tConfig = this.get( 'dataConfiguration' ),
          tAttributes = tConfig.getPath( iDescKey + '.attributes');

      if( tAttributes.length === 1)
        removeLastAttribute();
      else
        removeIndexedAttribute();
    },

    /**
     * Use the properties of the given object to restore my plot, axes, and legend.
     * @param iStorage {Object}
     */
    restoreStorage: function( iStorage) {
      var xAttrRef, yAttrRef, legendAttrRef,
          tXAxisClass = DG.Core.classFromClassName( iStorage.xAxisClass),
          tPrevXAxis = this.get('xAxis'),
          tYAxisClass = DG.Core.classFromClassName( iStorage.yAxisClass),
          tPrevYAxis = this.get('yAxis'),
          tCurrentXAxisClass = tPrevXAxis.constructor,
          tCurrentYAxisClass = tPrevYAxis.constructor,
          tDataConfig = this.get('dataConfiguration');

      var instantiateArrayOfPlots = function( iPlots) {
        iPlots.forEach( function( iModelDesc, iIndex) {
          if( !iModelDesc.plotClass)
            return;
          var tPlot = DG.Core.classFromClassName( iModelDesc.plotClass ).create(
            { _isBeingRestored: true }  // So that rescaling won't happen
          );
          tPlot.beginPropertyChanges();
          tPlot.setIfChanged( 'dataConfiguration', tDataConfig);
          tPlot.setIfChanged( 'xAxis', this.get( 'xAxis' ) );
          tPlot.setIfChanged( 'yAxis', this.get( 'yAxis' ) );
          tPlot.setIfChanged( 'yAttributeIndex', iIndex);
          tPlot.endPropertyChanges();
          if( iIndex === 0)
            this.set('plot', tPlot);
          else
            this.addPlot( tPlot);
        }.bind( this));
      }.bind( this);

      sc_super();

      // Instantiate the attribute references
      xAttrRef = this.instantiateAttributeRefFromStorage(iStorage, 'xColl', 'xAttr');
      yAttrRef = this.instantiateAttributeRefFromStorage(iStorage, 'yColl', 'yAttr');
      legendAttrRef = this.instantiateAttributeRefFromStorage(iStorage, 'legendColl', 'legendAttr');

      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      // Set the collection(s) and attribute(s)
      // TO_DO: Consider adding some validation to iStorage values before use,
      //    methods like storageToRole(iStorage.xRole), storageToAttributeType(iStorage.xAttributeType).
      tDataConfig.setAttributeAndCollectionClient('xAttributeDescription', xAttrRef, iStorage.xRole, iStorage.xAttributeType);
      tDataConfig.setAttributeAndCollectionClient('yAttributeDescription', yAttrRef, iStorage.yRole, iStorage.yAttributeType);
      tDataConfig.setAttributeAndCollectionClient('legendAttributeDescription', legendAttrRef, iStorage.legendRole, iStorage.legendAttributeType);

      this.set('aboutToChangeConfiguration', false ); // We're done

      if( tXAxisClass && tXAxisClass !== tCurrentXAxisClass) {
        var tNewXAxis = tXAxisClass.create();
        tNewXAxis.set('attributeDescription', tDataConfig.get('xAttributeDescription'));
        this.set('xAxis', tNewXAxis);
        tPrevXAxis.destroy();
      }
      if( tYAxisClass && tYAxisClass !== tCurrentYAxisClass) {
        var tNewYAxis = tYAxisClass.create();
        tNewYAxis.set('attributeDescription', tDataConfig.get('yAttributeDescription'));
        this.set('yAxis', tNewYAxis);
        tPrevYAxis.destroy();
      }
      instantiateArrayOfPlots( (iStorage.plotClass ? [ {plotClass: iStorage.plotClass }] : null) ||
                                  iStorage.plotModels ||
                                  []);

      this.get('plots' ).forEach( function( iPlot) {
        iPlot._isBeingRestored = null;  // Reenable rescaling
      });
    },

    /**
     Return the plot's notion of gear menu items concatenated with mine.
     @return {Array of menu items}
     */
    getGearMenuItems: function() {
      var this_ = this,
        tPlot = this.get( 'plot' );
        //kIsForSubmenu = true;
      if( SC.none( tPlot ) )  // Can happen if we can't handle a particular configuration
        return [];

      var getGraphMenuItems = function () {
        var tSelection = this_.get( 'selection' ),
            tDeleteIsEnabled = tSelection && tSelection.get( 'length' ) !== 0;
        return [
          { title:"Select All", target:this_, itemAction:this_.selectAll, isEnabled:true },
          { title:"Delete Selected Cases", target:this_, itemAction:this_.deleteSelectedCases, isEnabled:tDeleteIsEnabled },
          { title:"Delete Unselected Cases", target:this_, itemAction:this_.deleteUnselectedCases, isEnabled:tDeleteIsEnabled }
        ];
      };

      return tPlot.getGearMenuItems(). // plot specific menu items
          concat( getGraphMenuItems()). // then menu items for all plots...
          concat( [{ isSeparator: YES }]).
          concat( this.createHideShowAttributeSubMenuItems());
    },

    /** Submenu items for hiding selected or unselected cases, or showing all cases */
    createHideShowAttributeSubMenuItems: function() {
      var tSelection = this.getPath('dataConfiguration.selection' ).toArray(),
          tSomethingIsSelected = tSelection && tSelection.get('length') !== 0,
          tCases = this.getPath('dataConfiguration.cases' ),
          tSomethingIsUnselected = tSelection && tCases && (tSelection.get('length') < tCases.length),
          tSomethingHidden = this.getPath('dataConfiguration.hiddenCases' ).length > 0,
          tHideSelectedNumber = (tSelection && tSelection.length > 1) ? 'Plural' : 'Sing',
          tHideUnselectedNumber = (tSelection && tCases &&
                                   (tCases.length - tSelection.length > 1)) ? 'Plural' : 'Sing';

      function hideSelectedCases() {
        DG.logUser("Hide %@ selected cases", tSelection.length);
        this.get('dataConfiguration' ).hideCases( tSelection);
      }

      function hideUnselectedCases() {
        var tUnselected = DG.ArrayUtils.subtract( tCases, tSelection,
                                                            function( iCase) {
                                                              return iCase.get('id');
                                                            });
        DG.logUser("Hide %n selected cases", tUnselected.length);
        this.get('dataConfiguration' ).hideCases( tUnselected);
      }

      function showAllCases() {
        DG.logUser("Show all cases");
        this.get('dataConfiguration' ).showAllCases();
      }

      return [
        // Note that these 'built' string keys will have to be specially handled by any
        // minifier we use
                  { title: ('DG.GraphMenu.hideSelected' + tHideSelectedNumber), isEnabled: tSomethingIsSelected,
                                      target: this, itemAction: hideSelectedCases },
                  { title: ('DG.GraphMenu.hideUnselected' + tHideUnselectedNumber), isEnabled: tSomethingIsUnselected,
                                      target: this, itemAction: hideUnselectedCases },
                  { title: 'DG.GraphMenu.showAll', isEnabled: tSomethingHidden,
                                      target: this, itemAction: showAllCases }
              ];
    },

    /**
     * My plot model and my axes may have animations going on. If so, stop them.
     */
    stopAnimation: function() {
      this.get('plot').stopAnimation();
      this.get('xAxis').stopAnimation();
      this.get('yAxis').stopAnimation();
    },

    isParentCase: function( iCase) {
      var parent = iCase.get('parent');
      return SC.none( parent);
    },

    handleOneDataContextChange: function( iNotifier, iChange) {
      var plotModel = this.get('plot'),
          operation = iChange && iChange.operation;

      // No response necessary if the change doesn't affect us.
      if( plotModel && !plotModel.isAffectedByChange( iChange))
        return;

      // The GraphModel response is operation-specific.
      switch( operation) {
        case 'createCase':
        case 'createCases':
        case 'deleteCases':
          this.dataDidChange( null, null, iChange);
          break;
        case 'updateCases':
        case 'createAttributes':
        case 'updateAttributes':
          // We must invalidate before we build indices because the change may
          // have affected the set of included cases, which affects indices.
          // It would be better not to be dealing with indices at all, but
          // that refactoring is left for another day.
          this.get('dataConfiguration').invalidateCaches( null, iChange);
          iChange.indices = this.buildIndices( iChange);
          this.dataRangeDidChange( this, 'revision', this, iChange.indices);
          break;
        case 'selectCases':
          //this.selectionDidChange();
          break;
      }

      // Forward the notification to the plots, so they can respond as well.
      this.get('plots' ).forEach( function( iPlot) {
        iPlot.handleDataContextNotification( iNotifier, iChange);
      });
    },

    /**
      Responder for notifications from the DataContext.
     */
    handleDataContextNotification: function( iNotifier) {
      sc_super(); // Bulk of work will be done in calls to handleOneDataContextChange

      if( this.get('numberToggle')) {
        // The numberToggle does not need to respond to individual notifications
        this.get('numberToggle' ).handleDataContextNotification( iNotifier);
      }
    },
    
    /**
     @private
     */
    dataDidChange: function( iSource, iKey, iChange ) {
      var tPlot = this.get('plot');
      if( tPlot && tPlot.isAffectedByChange( iChange)) {
        this.invalidate( iChange);  // So that when we ask for cases we get the right ones
        var dataConfig = this.get('dataConfiguration'),
            cases = dataConfig && dataConfig.get('cases'),
            tDataLength = cases ? cases.length : 0;
        if( tDataLength !== this._oldNumberOfCases ) {
          var isAddingCases = (tDataLength > this._oldNumberOfCases);
          if( tPlot && isAddingCases) {
            var newCase = cases[ tDataLength-1];
            if( this.isParentCase( newCase))
              tPlot.set('openParentCaseID', newCase.get('id'));

            // We always rescale the axes on new data. Previously, we rescaled
            // for child cases but skipped rescale on parent cases because in
            // most cases the parent case values aren't filled in until the end
            // when the closeCase command is issued. Some games provide all their
            // parent-level case values at createCase-time, however, and then
            // don't trigger any updateCase notifications at closeCase time.
            // Therefore, we always rescale here even though that could lead to
            // rescaling at openCase and again at closeCase under some circumstances.
            tPlot.rescaleAxesFromData( false /* don't allow scale shrinkage */,
                                       false /* don't animate points */ );
          }
          this._oldNumberOfCases = tDataLength;
        }
      }
      // Must redraw everything if there are aggregate functions
      if( this.getPath('dataConfiguration.hasAggregates'))
        this.invalidate();
    },

    /**
     @private
     */
    invalidate: function( iChange, iInvalidatePlotCaches) {
      var tPlot = this.get( 'plot' );
      sc_super();

      if( iInvalidatePlotCaches && !SC.none( tPlot ) )
        tPlot.invalidateCaches();
    }

  } );

