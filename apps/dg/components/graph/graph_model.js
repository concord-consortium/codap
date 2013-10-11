// ==========================================================================
//                            DG.GraphModel
//
//  Author:   William Finzer
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

sc_require('alpha/destroyable');

/** @class  DG.GraphModel - The model for a graph.

 @extends SC.Object
 */
DG.GraphModel = SC.Object.extend( DG.Destroyable,
  /** @scope DG.GraphModel.prototype */
  {
    autoDestroyProperties: [ 'dataConfiguration', 'plot', 'xAxis', 'yAxis', 'legend' ],
    
    /**
     @property { DG.GraphDataConfiguration }
     */
    dataConfiguration: null,

    /**
      @property { DG.CollectionClient }
    */
    collectionClient: null,
    collectionClientBinding: '*dataConfiguration.collectionClient',

    /**
      The plot model needs access to the cases controller that is stored in my dataConfiguration's
        collection client.
      @property { SC.ArrayController }
    */
    casesController: null,
    casesControllerBinding: '*dataConfiguration.collectionClient.casesController',

    /**
     * @property {Array} of DG.Case
     */
    cases: null,
    casesBinding: '*dataConfiguration.cases',

    /**
      @property { SC.SelectionSet }
    */
    selection: function() {
      return this.getPath('dataConfiguration.selection');
    }.property('dataConfiguration.selection'),

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
     @property { DG.LegendModel }
     */
    legend: null,

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
     Work around current notification bug whereby we get notified that number of cases has
     changed even when it hasn't.
     @property {Number}
     */
    _oldNumberOfCases: 0,

    /**
     Prepare dependencies.
     */
    init: function() {
      var tXDescription, tYDescription, tLegendDescription;

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

      this.set( 'dataConfiguration', DG.GraphDataConfiguration.create() );
      if( DG.IS_INQUIRY_SPACE_BUILD) {
        this.set('numberToggle', DG.NumberToggleModel.create( { dataConfiguration: this.get('dataConfiguration')}));
      }
      tXDescription = this.dataConfiguration.get( 'xAttributeDescription' );
      tYDescription = this.dataConfiguration.get( 'yAttributeDescription' );
      tLegendDescription = this.dataConfiguration.get('legendAttributeDescription');

      this.set( 'xAxis', getAxisClassFromType( tXDescription.get('attributeType')).create() );
      this.setPath('xAxis.attributeDescription', tXDescription);
      this.set( 'yAxis', getAxisClassFromType( tYDescription.get('attributeType')).create() );
      this.setPath('yAxis.attributeDescription', tYDescription);

      this.set('legend', DG.LegendModel.create());
      this.setPath('legend.attributeDescription', tLegendDescription);

      this.synchPlotWithAttributes();

      // We might already have some data, so let's adapt to it. But it would seem that we can't
      // possibly have data, so it's a mystery why we have to call rescaleAxesFromData
      // TODO: Understand this better
      this.invalidate();
      this.get('plot').rescaleAxesFromData( true /* allow scale shrinkage */,
                                               true /* animate points */ );
    },

    destroy: function() {
      if( this._dataContext)
         this._dataContext.removeObserver('changeCount', this, 'handleDataContextNotification');
      sc_super();
    },

    /**
      The data context for the graph. Set by caller after construction initially and
      reset for graphs restored from document to point to the restored data context.
      @property   {DG.DataContext}
     */
    _dataContext: null,
    dataContext: function( iKey, iValue) {
      // We use a computed property so that we can add/remove observers when necessary.
      if( iValue) {
        if( iValue !== this._dataContext) {
          if( this._dataContext){
             this._dataContext.removeObserver('changeCount', this, 'handleDataContextNotification');
          }
          this._dataContext = iValue;
          if( this._dataContext) {
            this._dataContext.addObserver('changeCount', this, 'handleDataContextNotification');
          }
        }
        return this;
      }
      return this._dataContext;
    }.property(),

    /**
      Called when the 'dataContext' property is changed.
     */
    dataContextDidChange: function() {
      var dataConfiguration = this.get('dataConfiguration');
      if( dataConfiguration)
        dataConfiguration.set('dataContext', this.get('dataContext'));
    }.observes('dataContext'),

    /**
      Delete the currently selected cases.
      Passes the request on to the data context to do the heavy lifting.
     */
    deleteSelectedCases: function() {
      var tChange = {
            operation: 'deleteCases',
            cases: DG.copy( this.get('selection'))
          };
      this.get('dataContext').applyChange( tChange);
    },

    /**
      Select/deselect all of the points in all the plots.
      @param  {Boolean}   iSelect -- True to select all points, false to deselect all.
                                      Defaults to true (select all) if undefined/null.
     */
    selectAll: function( iSelect) {
      var tSelect = SC.none( iSelect) ? true : !!iSelect,
          tCases = tSelect ? this.get('cases') : null,  // null means all cases, even hidden ones
          tChange = {
            operation: 'selectCases',
            collection: this.get('collectionClient'),
            cases: tCases,
            select: tSelect
          };
      this.get('dataContext').applyChange( tChange);
      DG.logUser( iSelect ? "selectAll" : "deselectAll");
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
      Sets the attribute for the legend.
      @param  {DG.DataContext}      iDataContext -- The data context for this graph
      @param  {Object}              iAttrRefs -- The attribute to set for the axis
              {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
              {DG.Attribute}        iAttrRefs.attribute -- Array of attributes to set for the legend
     */
    changeAttributeForLegend: function( iDataContext, iAttrRefs) {
      var tAttribute = iAttrRefs && iAttrRefs.attributes[0];
      if( tAttribute)
        DG.logUser("legendAttributeChange: { to attribute %@ }", tAttribute.get('name'));
      else
        DG.logUser("legendAttributeRemoved:");

      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      var dataConfiguration = this.get('dataConfiguration');
      if( iDataContext)
        dataConfiguration.set('dataContext', iDataContext);
      dataConfiguration.setAttributeAndCollectionClient('legendAttributeDescription', iAttrRefs);

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
     * Removing the attribute is just changing with null arguments
     */
    removeLegendAttribute: function() {
      this.changeAttributeForLegend( null, null);
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
      var tDataContext = this.getPath('dataConfiguration.dataContext'),
          xAttrRef, yAttrRef, legendAttrRef,
          tXAxisClass = DG.Core.classFromClassName( iStorage.xAxisClass),
          tPrevXAxis = this.get('xAxis'),
          tYAxisClass = DG.Core.classFromClassName( iStorage.yAxisClass),
          tPrevYAxis = this.get('yAxis'),
          tCurrentXAxisClass = tPrevXAxis.constructor,
          tCurrentYAxisClass = tPrevYAxis.constructor,
          tDataConfig = this.get('dataConfiguration');

      function instantiateAttributeRef( iCollLinkName, iAttrLinkName) {
        var kNullResult = { collection: null, attributes: [] };
        if( SC.empty( iCollLinkName) || SC.empty( iAttrLinkName) || !iStorage || !iStorage._links_)
          return kNullResult;
          
        var collLink = iStorage._links_[ iCollLinkName],
            coll = collLink && collLink.id && tDataContext.getCollectionByID( collLink.id),
            attrs = [],
            tLinkCount = DG.ArchiveUtils.getLinkCount( iStorage, iAttrLinkName ),
            tIndex;
        if( !coll)
          return kNullResult;

        for( tIndex = 0; tIndex < tLinkCount; tIndex++) {
          var tAttr = coll.getAttributeByID( DG.ArchiveUtils.getLinkID( iStorage, iAttrLinkName, tIndex));
          if( tAttr)
            attrs.push(tAttr);
        }
        return { collection: coll, attributes: attrs };
      }

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

      // Instantiate the attribute references
      xAttrRef = instantiateAttributeRef('xColl', 'xAttr');
      yAttrRef = instantiateAttributeRef('yColl', 'yAttr');
      legendAttrRef = instantiateAttributeRef('legendColl', 'legendAttr');

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

      tDataConfig.restoreHiddenCases( iStorage.hiddenCases);
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
        tPlot = this.get( 'plot' ),
        kIsForSubmenu = true;
      if( SC.none( tPlot ) )  // Can happen if we can't handle a particular configuration
        return [];

      var getGraphMenuItems = function () {
        var tSelection = this_.get( 'selection' ),
          tDeleteIsEnabled = tSelection && tSelection.get( 'length' ) !== 0,
          tShowHideCountTitle = (tPlot.get( 'isPlottedCountVisible' ) ?
                                 'DG.PlotModel.hideCount' :
                                 'DG.PlotModel.showCount').loc();
        return [
          { title:"Select All", target:this_, itemAction:this_.selectAll, isEnabled:true },
          { title:"Delete Selected Cases", target:this_, itemAction:this_.deleteSelectedCases,
            isEnabled:tDeleteIsEnabled },
          { title:tShowHideCountTitle, target:tPlot, itemAction:tPlot.togglePlottedCount }
        ];
      };

      return tPlot.getGearMenuItems().concat(getGraphMenuItems())
        .concat(
          [
            { isSeparator: YES },
            { title: 'DG.GraphMenu.remove'.loc(), subMenu: [
              this.createRemoveAttributeMenuItem( 'x', kIsForSubmenu),
              this.createRemoveAttributeMenuItem( 'y', kIsForSubmenu),
              this.createRemoveAttributeMenuItem( 'legend', kIsForSubmenu)
            ]},
            { title: 'DG.GraphMenu.hide'.loc(), subMenu: this.createHideShowAttributeSubMenuItems() }
          ] );
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

    /** create a menu item that removes the attribute on the given axis/legend */
    createRemoveAttributeMenuItem: function( iXYorLegend, isForSubmenu, iAttrIndex ) {
      iAttrIndex = iAttrIndex || 0;
      var tDescKey = iXYorLegend + 'AttributeDescription',
          tAxisKey = iXYorLegend + 'Axis', // not used by removeLegendAttribute()
          tAttributes = this.getPath( 'dataConfiguration.' + tDescKey + '.attributes'),
          tAttribute = (SC.isArray( tAttributes) && iAttrIndex < tAttributes.length) ?
                            tAttributes[ iAttrIndex] : DG.Analysis.kNullAttribute,
          tName = (tAttribute === DG.Analysis.kNullAttribute) ? '' : tAttribute.get( 'name'),
          tResourceName = isForSubmenu ? 'attribute_' : 'removeAttribute_',
          tTitle = ('DG.GraphMenu.' + tResourceName + iXYorLegend).loc( tName ),
          tAction = ((iXYorLegend==='x'||iXYorLegend==='y') ? this.removeAttribute : this.removeLegendAttribute );
      return {
        title: tTitle,
        target: this,
        itemAction: tAction,
        isEnabled: (tAttribute !== DG.Analysis.kNullAttribute),
        args: [ tDescKey, tAxisKey, iAttrIndex ] };
    },

    /** create a menu item that changes the attribute type on the given axis/legend */
    createChangeAttributeTypeMenuItem: function( iXYorLegend ) {
      var tDescKey = iXYorLegend + 'AttributeDescription',
          tAxisKey = iXYorLegend + 'Axis',
          tDescription = this.getPath( 'dataConfiguration.' + tDescKey),
          tAttribute = tDescription && tDescription.get( 'attribute'),
          tIsNumeric = tDescription && tDescription.get( 'isNumeric'),
          tTitle =( tIsNumeric ? 'DG.GraphMenu.treatAsCategorical' : 'DG.GraphMenu.treatAsNumeric').loc();
      return {
        title: tTitle,
        target: this,
        itemAction: this.changeAttributeType, // call with args, toggling 'numeric' setting
        isEnabled: (tAttribute !== DG.Analysis.kNullAttribute),
        args: [ tDescKey, tAxisKey, !tIsNumeric ] };
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

    /**
      Responder for notifications from the DataContext.
     */
    handleDataContextNotification: function( iNotifier) {
      var newChanges = iNotifier.get('newChanges');
      
      /**
        Returns an array of indices corresponding to the indices
        of the cases affected by the specified change.
       */
      var buildIndices = function( iChange) {
        var srcCases = this.getPath('dataConfiguration.cases');
        if( (iChange.operation === 'updateCases') &&
            srcCases && !SC.none( iChange.cases) &&
            !this.getPath('dataConfiguration.hasAggregates')) {
          var updatedCasesByID = {},
              indices = SC.IndexSet.create();
          // Build a map of IDs for affected cases
          iChange.cases.forEach( function( iCase) {
                                  updatedCasesByID[ iCase.get('id')] = iCase;
                                 });
          // Loop through source cases to determine indices for the affected cases
          srcCases.forEach( function( iCase, iIndex) {
                              var caseID = iCase.get('id');
                              if( updatedCasesByID[ caseID])
                                indices.add( iIndex);
                            });
          return indices;
        }
        return SC.IndexSet.create( 0, this.getPath('dataConfiguration.cases.length'));
      }.bind( this);

      var handleOneDataContextChange = function( iChange) {
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
            iChange.indices = buildIndices( iChange);
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
      }.bind( this);
      
      // Process all data context changes
      if( newChanges.length) {
        newChanges.forEach( handleOneDataContextChange);
        if( this.get('numberToggle')) {
          // The numberToggle does not need to respond to individual notifications
          this.get('numberToggle' ).handleDataContextNotification( iNotifier);
        }
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
    dataRangeDidChange: function( iSource, iKey, iObject, iIndices) {
      this.invalidate();
    },

    /**
     @private
     */
    invalidate: function( iChange, iInvalidatePlotCaches) {
      var tDataConfiguration = this.get( 'dataConfiguration' ),
          tPlot = this.get( 'plot' );
      tDataConfiguration.invalidateCaches( null, iChange);
      if( iInvalidatePlotCaches && !SC.none( tPlot ) )
        tPlot.invalidateCaches();
    }

  } );

