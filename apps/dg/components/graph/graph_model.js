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

sc_require('components/graph_map_common/data_layer_model');

/** @class  DG.GraphModel - The model for a graph.

 @extends DG.DataLayerModel
 */
DG.GraphModel = DG.DataLayerModel.extend(
  /** @scope DG.GraphModel.prototype */
  {
    autoDestroyProperties: [ 'plot', 'xAxis', 'yAxis', 'y2Axis' ],

    dataConfigurationClass: function() {
      return DG.GraphDataConfiguration;
    }.property(),

    isTransparent: false, // part of model state that determines whether plot views are transparent
    plotBackgroundColor: null, // part of model state that specifies color of plot background. Default is white
    plotBackgroundOpacity: 1, // part of model state that specifies opacity of plot background. Default is 1
    plotBackgroundImage: null,  // to be displayed by the view as part of the background
    plotBackgroundImageLockInfo: null,  // null if image not locked to axes

    /**
     * @property {DG.NumberToggleModel}
     */
    numberToggle: null,

    /**
     * @property {Boolean}
     */
    enableMeasuresForSelection: null,

    /**
     @property { DG.AxisModel }
     */
    xAxis: null,

    /**
     @property { DG.AxisModel }
     */
    yAxis: null,

    /**
     * This second axis is only instantiated when the user has indicated a desire to plot an attribute on an axis
     * to the right of the plot.
     * @property { DG.AxisModel }
     */
    y2Axis: null,

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
          this.removePlotObserver( iPlot);
          iPlot.destroy();
        }.bind( this));
        this._plots = [ iPlot];
        // TODO: Figure out a more elegant way to observe this property
        iPlot.addObserver('connectingLine', this, this.connectingLineChanged);
        iPlot.set('enableMeasuresForSelection', this.get('enableMeasuresForSelection'));
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
     * If not already present, adds the given plot to my array.
     * @param iPlot
     */
    addPlot: function( iPlot) {
      if( !this._plots.contains( iPlot)) {
        var tFirstPlot = this.get('plot');
        // TODO: Clumsy way to transfer setting for connectingLine. Fix it!
        if( tFirstPlot.isAdornmentVisible('connectingLine'))
          iPlot.toggleAdornmentVisibility('connectingLine');
        if( iPlot.get('verticalAxisIsY2')) {
          this._plots.push( iPlot);
        }
        else {
          var tYAttrIndex = iPlot.get('yAttributeIndex');
          this._plots.splice(tYAttrIndex, 0, iPlot);
        }
        iPlot.set('enableMeasuresForSelection', this.get('enableMeasuresForSelection'));
      }
    },

    removePlot: function( iPlot) {
      var tIndex = this._plots.indexOf( iPlot);
      if( tIndex >= 0)
        this.removePlotAtIndex( tIndex);
    },

    /**
     * In addition to removing the plot, synchronize the remaining plots' yAttributeIndex
     * @param iPlotIndex {Number}
     */
    removePlotAtIndex: function( iPlotIndex) {
      DG.assert( iPlotIndex < this._plots.length,
        'Attempt to remove non-existent plot');
      var tPlot = this._plots[ iPlotIndex];
      this._plots.splice( iPlotIndex, 1);
      this.removePlotObserver( tPlot);
      tPlot.destroy();
      var tActualYIndex = 0;
      this._plots.forEach( function( iPlot, iIndex) {
        // Only plots for attributes on regular y-axis need their yAttributeIndex updated
        if( !iPlot.get('verticalAxisIsY2')) {
          iPlot.setIfChanged('yAttributeIndex', tActualYIndex);
          tActualYIndex++;
        }
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
     Keep plot axis in synch
     */
    y2AxisChanged: function() {
      var tPlot = this.get( 'plot' );
      if( !SC.none( tPlot ) )
        tPlot.set( 'y2Axis', this.get( 'y2Axis' ) );
    }.observes( 'y2Axis' ),

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
      sc_super();

      function getAxisClassFromType( iType) {
        if( iType === DG.Analysis.EAttributeType.eNumeric || iType === DG.Analysis.EAttributeType.eDateTime)
          return DG.CellLinearAxisModel;
        else if( iType === DG.Analysis.EAttributeType.eCategorical)
          return DG.CellAxisModel;
        else
          return DG.AxisModel;
      }

      var configureAttributeDescription = function( iKey) {
        var tAttributeName = this.get(iKey + 'AttributeName'),
            tAttribute,
            tDefaults = DG.currDocumentController().collectionDefaults(),
            tCollectionClient = tDefaults.collectionClient;
        if( tAttributeName) {
          delete this[iKey + 'AttributeName'];  // Because that was how it was passed in
          tAttribute = tDataContext ? tDataContext.getAttributeByName(tAttributeName) :
              (tCollectionClient ? tCollectionClient.getAttributeByName(tAttributeName) : null);
          if( tAttribute) {
            if (tDataContext && !tCollectionClient)
              tCollectionClient = tDataContext.getCollectionForAttribute(tAttribute);
            this.get('dataConfiguration').setAttributeAndCollectionClient( iKey + 'AttributeDescription',
                { collection: tCollectionClient, attributes: [ tAttribute]});
          }
        }
      }.bind(this);
      function getExtraYAttributes (model) {
        var yAttrName =  model.get('yAttributeName');
        if (Array.isArray(yAttrName)) {
          model.set('yAttributeName', yAttrName[0]);
          return yAttrName.slice(1);
        } else {
          return [];
        }
      }

      // Beginning of init
      // Set up data configuration
      var tConfiguration = this.get('dataConfigurationClass').create(),
          tContext = tConfiguration.get('dataContext');
      // If the context has been discovered in the init of the configuration, we take this opportunity
      // to hook up our observer to it.
      if( tContext) {
        tContext.addObserver('changeCount', this, 'handleDataContextNotification');
      }
      this.set( 'dataConfiguration', tConfiguration);

      var tLegendDescription = tConfiguration.get('legendAttributeDescription');

      this.set('legend', DG.LegendModel.create( { dataConfiguration: tConfiguration }));
      this.setPath('legend.attributeDescription', tLegendDescription);

      var tDataContext = this.initialDataContext;
      var extraYAttributes = getExtraYAttributes(this);
      if( tDataContext) {
        this.setPath('dataConfiguration.initialDataContext');
        delete this.initialDataContext;  // It was passed in this way, but it's not one of our legitimate properties
      }

      this._plots = [];

      ['x', 'y', 'y2', 'legend'].forEach(function (iKey) {
        configureAttributeDescription(iKey);
        if( iKey !== 'legend') {
          var tDescription = this.getPath(
              'dataConfiguration.' + (iKey + 'AttributeDescription'));
          this.set(iKey + 'Axis',
              getAxisClassFromType(tDescription.get('attributeType')).create(
                  {dataConfiguration: this.dataConfiguration}));
          this.setPath(iKey + 'Axis.attributeDescription', tDescription);
        }
      }.bind(this));

      this.synchPlotWithAttributes();

      // Set additional Y Attributes, if present
      extraYAttributes.forEach(function (iAttrName) {
        if (!tDataContext) {
          DG.log('Cannot place y attribute: no Data Context: ' + iAttrName);
          return;
        }
        var attr = tDataContext.getAttributeByName(iAttrName);
        if (!attr) {
          DG.log('Cannot place y attribute: not found: ' + iAttrName);
          return;
        }
        var attrRef = {
          collection: tDataContext.getCollectionForAttribute(attr),
          attributes: [attr]
        };
        this.addAttributeToAxis(tDataContext, attrRef);
      }.bind(this));

      // Set Y2 Attribute if present
      var tY2AttributeDescription = this.getPath('dataConfiguration.y2AttributeDescription');
      if (tY2AttributeDescription && tY2AttributeDescription.get('attributes').length && tDataContext) {
        this.changeAttributeForY2Axis(tDataContext, {
          collection: tY2AttributeDescription.get('collectionClient'),
          attributes: tY2AttributeDescription.get('attributes')
        });
      }

      // GraphModel calls init() on itself (cf. reset()) so we need to handle init() and re-init()
      var showNumberToggle = DG.get('IS_INQUIRY_SPACE_BUILD') || this.get('enableNumberToggle'),
          numberToggle = this.get('numberToggle'),
          dataConfiguration = this.get('dataConfiguration');
      if (!numberToggle) {
        numberToggle = DG.NumberToggleModel.create({ dataConfiguration: dataConfiguration,
                                                      isEnabled: showNumberToggle });
        this.set('numberToggle', numberToggle);
      }
      else {
        numberToggle.set('dataConfiguration', dataConfiguration);
      }
      this.set('enableNumberToggle', showNumberToggle);

      // We might already have some data, so let's adapt to it. But it would seem that we can't
      // possibly have data, so it's a mystery why we have to call rescaleAxesFromData
      // TODO: Understand this better
      this.invalidate();
      this.rescaleAxesFromData( true /* allow scale shrinkage */,
                                true /* animate points */ );

      this.addObserver('dataConfiguration.hiddenCases', this.hiddenCasesDidChange);
    },

    destroy: function() {
      this.removeObserver('dataConfiguration.hiddenCases', this.hiddenCasesDidChange);

      sc_super();
    },

    enableNumberToggleDidChange: function() {
      this.setPath('numberToggle.isEnabled', this.get('enableNumberToggle'));
    }.observes('enableNumberToggle'),

    enableMeasuresForSelectionDidChange: function() {
      var tEnabled = this.get('enableMeasuresForSelection');
      this.get('plots').forEach( function( iPlot) {
        iPlot.set('enableMeasuresForSelection', tEnabled);
      });
    }.observes('enableMeasuresForSelection'),

    /** Submenu items for hiding selected or unselected cases, or showing all cases */
    createHideShowSelectionMenuItems: function() {

      var menuItems = sc_super(),

          isNumberToggleEnabled = this.get('enableNumberToggle'),
          enableNumberToggleItemText = isNumberToggleEnabled
                                        ? 'DG.DataDisplayMenu.disableNumberToggle'
                                        : 'DG.DataDisplayMenu.enableNumberToggle',
          isMeasuresForSelectionEnabled = this.get('enableMeasuresForSelection'),
          enableMeasuresForSelectionItemText = isMeasuresForSelectionEnabled
                                        ? 'DG.DataDisplayMenu.disableMeasuresForSelection'
                                        : 'DG.DataDisplayMenu.enableMeasuresForSelection',
          self = this;

      function toggleCapability( iCapability) {
        var isEnabled = self.get('enable' + iCapability);
        DG.UndoHistory.execute(DG.Command.create({
          name: isEnabled ? 'graph.display.disable' + iCapability : 'graph.display.enable' + iCapability,
          undoString: isEnabled ? 'DG.Undo.disable' + iCapability : 'DG.Undo.enable' + iCapability,
          redoString: isEnabled ? 'DG.Redo.disable' + iCapability : 'DG.Redo.enable' + iCapability,
          log: isEnabled ? "Disable" + iCapability : "Enable" + iCapability,
          execute: function() {
            this._undoData = !!self.get('enable' + iCapability);
            self.set('enable' + iCapability, !isEnabled);
          },
          undo: function() {
            self.set('enable' + iCapability, this._undoData);
          }
        }));
      }

      function toggleNumberToggle() {
        toggleCapability('NumberToggle');
      }

      function toggleMeasuresForSelection() {
        toggleCapability('MeasuresForSelection');
      }

      menuItems.push({ title: enableNumberToggleItemText, isEnabled: true,
                        target: this, action: toggleNumberToggle });
      menuItems.push({ title: enableMeasuresForSelectionItemText, isEnabled: true,
                        target: this, action: toggleMeasuresForSelection });
      return menuItems;
    },

    /**
      Gets the attribute for the specified axis.
      @param  {String}              iOrientation -- identifies the axis ('horizontal' or 'vertical')
     */
    getAttributeForAxis: function(iOrientation) {
      var tDescKey;
      switch( iOrientation) {
        case 'horizontal':
          tDescKey = 'xAttributeDescription';
          break;
        case 'vertical':
          tDescKey = 'yAttributeDescription';
          break;
        case 'vertical2':
          tDescKey = 'y2AttributeDescription';
          break;
      }

      return this.getPath('dataConfiguration.' + tDescKey + '.attribute');
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
      var this_ = this,
          tTargetDescKey, tTargetAxisKey, tOtherDim;

      function switchAxes() {

        function synchAxis( iDescKey, iAxisKey, iAxisClass) {
          var tCurrentAxisClass = this_.get( iAxisKey).constructor,
              tAxisModelParams = { dataConfiguration: tDataConfiguration };

          // If the variable and axis are incompatible, we'll have to change the axis
          if( iAxisClass !== tCurrentAxisClass ) {
            var tAxisToDestroy = this_.get( iAxisKey ),
                tNewAxis = iAxisClass.create(tAxisModelParams);
            tNewAxis.set( 'attributeDescription', tDataConfiguration.get( iDescKey ) );
            this_.set( iAxisKey, tNewAxis );
            tAxisToDestroy.destroy();
          }
        }

        // We want to reconfigure the graph without triggering any of the responses to the
        // changes until we're done. Note that while the axes may change, the plot type should not.
        var tSourceDescKey = tOtherDim + 'AttributeDescription',
            tTargetRole = tDataConfiguration.getPath( tSourceDescKey + '.role'),
            tTargetType = tDataConfiguration.getPath( tSourceDescKey + '.attributeStats.attributeType'),
            tSourceRole = tDataConfiguration.getPath( tTargetDescKey + '.role'),
            tSourceType = tDataConfiguration.getPath( tTargetDescKey + '.attributeStats.attributeType'),
            tSourceAxisKey = tOtherDim + 'Axis',
            tTargetAxisClass = this_.get( tSourceAxisKey).constructor,
            tSourceAxisClass = this_.get( tTargetAxisKey).constructor,
            tAttrsForSource = SC.none(tCurrentAttribute) ? [] : [tCurrentAttribute],
            tCollClientForSource = tDataConfiguration.getPath(tSourceDescKey + '.collectionClient'),
            tAttrRefsForSource = {
              attributes: tAttrsForSource,
              collection: tCollClientForSource
            };
        tDataConfiguration.setAttributeAndCollectionClient(tTargetDescKey, iAttrRefs,
            tTargetRole, tTargetType);
        tDataConfiguration.setAttributeAndCollectionClient(tSourceDescKey, tAttrRefsForSource,
            tSourceRole, tSourceType);
        synchAxis(tTargetDescKey, tTargetAxisKey, tTargetAxisClass);
        synchAxis(tSourceDescKey, tSourceAxisKey, tSourceAxisClass);
        this_.invalidate();
        this_.rescaleAxesFromData(true, true);
      }

      switch (iOrientation) {
        case 'horizontal':
          tTargetDescKey = 'xAttributeDescription';
          tTargetAxisKey = 'xAxis';
          tOtherDim = 'y';
          break;
        case 'vertical':
          tTargetDescKey = 'yAttributeDescription';
          tTargetAxisKey = 'yAxis';
          tOtherDim = 'x';
          break;
        case 'vertical2':
          tTargetDescKey = 'y2AttributeDescription';
          tTargetAxisKey = 'y2Axis';
          tOtherDim = 'x';
          break;
      }

      this.set('aboutToChangeConfiguration', true); // signals dependents to prepare

      var tDataConfiguration = this.get('dataConfiguration'),
          tCurrentAttribute = tDataConfiguration.getPath(tTargetDescKey + '.attribute'),
          tOtherAttribute = tDataConfiguration.getPath(tOtherDim + 'AttributeDescription.attribute'),
          tIsAxisSwitch = iAttrRefs.attributes[0] === tOtherAttribute;
      if (tIsAxisSwitch) {
        switchAxes();
      }
      else {
        tDataConfiguration.set('dataContext', iDataContext);
        tDataConfiguration.setAttributeAndCollectionClient(tTargetDescKey, iAttrRefs);

        // Make sure correct kind of axis is installed
        this.privSyncAxisWithAttribute(tTargetDescKey, tTargetAxisKey);
        this.privSyncOtherAxisWithAttribute(tOtherDim);
        this.invalidate();
      }
      this.set('aboutToChangeConfiguration', false); // reset for next time
    },

    /**
      Sets the attribute for the specified axis.
      @param  {DG.DataContext}      iDataContext -- The data context for this graph
      @param  {Object}              iAttrRefs -- The attribute to set for the axis
             {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
             {DG.Attribute}        iAttrRefs.attributes -- The array of attributes to set for the axis
      @param  {String}              iOrientation -- identifies the axis ('horizontal' or 'vertical')
     */
    addAttributeToAxis: function( iDataContext, iAttrRefs) {
      DG.logUser("addAxisAttribute: { attribute: %@ }", iAttrRefs.attributes[0].get('name'));

      var tYAttrDescription = this.getPath('dataConfiguration.yAttributeDescription' ),
          tAttrIndex = tYAttrDescription.get('attributes' ).length;

      if( tAttrIndex === 0) {
        // We aren't adding after all. Happens when foreign context is brought to multi-attribute place
        this.changeAttributeForAxis( iDataContext, iAttrRefs, 'vertical');
        return;
      }

      tYAttrDescription.addAttribute( iAttrRefs.attributes[0]);

      // The only plot we can currently make with multiple attributes is a scatterplot
      var tPlot = DG.ScatterPlotModel.create(this.getModelPointStyleAccessors());
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
     * Return the plot whose yAxis property is our y2Axis.
     * @returns {DG.PlotModel}
     */
    getY2Plot: function() {
      var tY2Plot,
          tY2Axis = this.get('y2Axis');
      this.get('plots').forEach( function( iPlot) {
        if( iPlot.get('yAxis') === tY2Axis)
          tY2Plot = iPlot;
      });
      return tY2Plot;
    },

    /**
      Sets the attribute for the specified axis.
      @param  {DG.DataContext}      iDataContext -- The data context for this graph
      @param  {Object}              iAttrRefs -- The attribute to set for the axis
             {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
             {DG.Attribute}        iAttrRefs.attributes -- The array of attributes to set for the axis
      @param  {String}              iOrientation -- identifies the axis ('horizontal' or 'vertical')
     */
    changeAttributeForY2Axis: function( iDataContext, iAttrRefs) {

      if( this.getPath('dataConfiguration.yAttributeDescription.attributes').length === 0) {
        // We aren't adding after all. Happens when foreign context is brought to multi-attribute place
        this.changeAttributeForAxis( iDataContext, iAttrRefs, 'vertical');
        return;
      }

      var setNewBounds = function() {
        var tAxis = this.get('y2Axis');
        if( !tAxis || !tAxis.get('isNumeric'))
          return;

        var tDataConfiguration = this.get('dataConfiguration'),
            tMinMax = tDataConfiguration && tDataConfiguration.getDataMinAndMaxForDimension( DG.GraphTypes.EPlace.eY2);
        tAxis.setDataMinAndMax( tMinMax.min, tMinMax.max, true);
      }.bind(this);

      var tY2AttrDescription = this.getPath('dataConfiguration.y2AttributeDescription' );
      tY2AttrDescription.removeAllAttributes();
      tY2AttrDescription.addAttribute( iAttrRefs.attributes[0]);
      tY2AttrDescription.set('collectionClient', iAttrRefs.collection);

      this.privSyncAxisWithAttribute( 'y2AttributeDescription', 'y2Axis' );

      if( !this.getY2Plot()) {
        // The only plot we can currently make with Y2 axis is a scatterplot
        var tProperties = $.extend( this.getModelPointStyleAccessors(), { verticalAxisIsY2: true }),
            tPlot = DG.ScatterPlotModel.create( tProperties);
        tPlot.beginPropertyChanges();
        tPlot.setIfChanged('dataConfiguration', this.get('dataConfiguration'));
        tPlot.setIfChanged('xAxis', this.get('xAxis'));
        tPlot.setIfChanged('yAxis', this.get('y2Axis'));
        tPlot.endPropertyChanges();

        this.addPlot(tPlot);
      }

      setNewBounds();

      this.notifyPropertyChange('y2AttributeAdded');
    },

    /**
     * Useful for knowing whether we can rescale.
     * @return {Boolean}
     */
    hasNumericAxis: function() {
      return this.getPath('xAxis.isNumeric') || this.getPath('yAxis.isNumeric');
    }.property('xAxis', 'yAxis'),

    /**
     * @return {Boolean}
     */
    canRescale: function() {
      return this.get('hasNumericAxis') || (this.get('plot') && this.get('plot').mixUp);
    }.property('hasNumericAxis', 'plot'),

    /**
     * @return {Boolean}
     */
    canMixUp: function() {
      var tPlot = this.get('plot');
      return tPlot && tPlot.mixUp;
    }.property('plot'),

    /**
     * Pass down to plot
     * @property {Boolean}
     */
    canSupportConfigurations: function() {
      return this.getPath('plot.canSupportConfigurations');
    }.property('plot'),

    rescaleAxesFromData: function( iShrink, iAnimate) {
      var tPlot = this.get('plot');
      if( tPlot)
        tPlot.rescaleAxesFromData( iShrink, iAnimate);
    },

    /**
     * Sychronize the axis model to a new attribute or attribute description, to sure correct kind of axis is installed.
     * @param{String} iDescKey - key to the desired attribute description (x...|yAttributeDescription)
     * @param{String} iAxisKey - key to the axis to be changed (x...|yAxis)
     */
    privSyncAxisWithAttribute: function( iDescKey, iAxisKey ) {
      var tDataConfiguration = this.get('dataConfiguration'),
          tVarIsNumeric = tDataConfiguration.getPath( iDescKey + '.isNumeric'),
          tDesiredAxisClass = tVarIsNumeric ? DG.CellLinearAxisModel : DG.CellAxisModel,
          tCurrentAxisClass = this.get( iAxisKey).constructor,
          tAxisModelParams = { dataConfiguration: tDataConfiguration };

      // If the variable and axis are incompatible, we'll have to change the axis
      if( tDesiredAxisClass !== tCurrentAxisClass ) {
        var tAxisToDestroy = this.get( iAxisKey ),
            tNewAxis = tDesiredAxisClass.create(tAxisModelParams);
        tNewAxis.set( 'attributeDescription', tDataConfiguration.get( iDescKey ) );
        this.set( iAxisKey, tNewAxis );
        tAxisToDestroy.destroy();

        this.synchPlotWithAttributes();
      }
    },

    /**
     * Usually we don't have to worry about the other axis, but if there is no attribute on that axis, and if
     * that dimension does not have an attribute, we have to make sure the axis is DG.AxisModel. A bar chart
     * may have previously installed a DG.CountAxisModel that we get rid of.
     * @param{String} iDim - 'x' or 'y'
     */
    privSyncOtherAxisWithAttribute: function( iDim ) {
      var tDataConfiguration = this.get('dataConfiguration'),
          tHasNoAttribute = tDataConfiguration.getPath(iDim + 'AttributeDescription.isNull'),
          tAxisClass = this.getPath(iDim + 'Axis').constructor,
          tWantsOtherAxis = this.getPath('plot.wantsOtherAxis');

      if( tHasNoAttribute && !tWantsOtherAxis && tAxisClass !== DG.AxisModel) {
        var tAxisToDestroy = this.get(iDim + 'Axis'),
            tNewAxis = DG.AxisModel.create( { dataConfiguration: tDataConfiguration});
        tNewAxis.set( 'attributeDescription', tDataConfiguration.get( iDim + 'AttributeDescription' ) );
        this.set( iDim + 'Axis', tNewAxis );
        tAxisToDestroy.destroy();
      }
      else if( tWantsOtherAxis) {
        // We've changed the attribute on the primary axis. Give the 'other' axis a chance to rescale
        this.rescaleAxesFromData( true /* allow shrinkage */, true /* allow animation */);
      }
    },

    /**
     * Dot charts and bar charts have a property, displayAsBarChart, which, when toggled, amounts to request
     * to swap one for the other.
     * @param iPlot {DG.PlotModel}
     */
    addPlotObserver: function( iPlot) {
      switch( iPlot.constructor) {
        case DG.DotChartModel:
        case DG.BarChartModel:
          iPlot.addObserver('displayAsBarChart', this, this.swapChartType);
          break;
      }
    },

    /**
     * Called before we destroy a plot.
     * @param iPlot {DG.PlotModel}
     */
    removePlotObserver: function( iPlot) {
      switch( iPlot.constructor) {
        case DG.DotChartModel:
        case DG.BarChartModel:
          iPlot.removeObserver('displayAsBarChart', this, this.swapChartType);
          break;
      }
    },

    /**
     * We swap out the given plot model for its alternate. A BarChart gets a count axis and, if we're making a
     * dot chart, we must remove the count axis.
     * @param iChartPlot {DG.DotChartModel | DG.BarChartModel }
     * @param iKey {String} Should be 'displayAsBarChart'
     * @param iValue {Boolean}
     */
    swapChartType: function( iChartPlot, iKey, iValue) {
      var doSwap = function ()
      {
        var tOldPlot = this.get('plot'),
            tConfig = this.get('dataConfiguration'),
            tNewPlotClass = tOldPlot.constructor === DG.DotChartModel ?
                DG.BarChartModel : DG.DotChartModel,
            tNewPlot, tAdornmentModels;
        this.set('aboutToChangeConfiguration', true); // signal to prepare
        tNewPlotClass.configureRoles(tConfig);
        tNewPlot = tNewPlotClass.create(this.getModelPointStyleAccessors());
        this.addPlotObserver(tNewPlot);

        tAdornmentModels = tOldPlot.copyAdornmentModels(tNewPlot);

        tNewPlot.beginPropertyChanges();
        tNewPlot.setIfChanged('dataConfiguration', tConfig);
        tNewPlot.setIfChanged('xAxis', this.get('xAxis'));
        tNewPlot.setIfChanged('yAxis', this.get('yAxis'));
        for (var tProperty in tAdornmentModels) {
          if (tAdornmentModels.hasOwnProperty(tProperty)) {
            var tModel = tAdornmentModels[tProperty];
            tNewPlot.setIfChanged(tProperty, tModel);
          }
        }
        tNewPlot.endPropertyChanges();

        this.setIfChanged('plot', tNewPlot);

        this.removePlotObserver(tOldPlot);
        tOldPlot.destroy();
        this.set('aboutToChangeConfiguration', false);  // all done
      }.bind( this);

      var tInitialValue = iChartPlot.get('displayAsBarChart'),
          tUndo = tInitialValue ? ('DG.Undo.graph.showAsBarChart') : ('DG.Undo.graph.showAsDotChart'),
          tRedo = tInitialValue ? ('DG.Redo.graph.showAsBarChart') : ('DG.Redo.graph.showAsDotChart');
      DG.UndoHistory.execute(DG.Command.create({
        name: "graph.toggleBarChart",
        undoString: tUndo,
        redoString: tRedo,
        log: ("toggleShowAs: %@").fmt(tInitialValue ? "DotChart" : "BarChart"),
        execute: function() {
          doSwap();
        }.bind(this),
        undo: function() {
          doSwap();
        }.bind(this)
      }));
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
      // DateTime types are treated as numeric for the purposes of synching with a plot
      tXType = (tXType === DG.Analysis.EAttributeType.eDateTime) ? DG.Analysis.EAttributeType.eNumeric : tXType;
      tYType = (tYType === DG.Analysis.EAttributeType.eDateTime) ? DG.Analysis.EAttributeType.eNumeric : tYType;
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
      if( SC.none( tCurrentPlot ) || (tNewPlotClass !== tCurrentPlot.constructor) ) {
        tNewPlot = tOperativePlot = tNewPlotClass.create( this.getModelPointStyleAccessors());
        this.addPlotObserver( tNewPlot);
      }
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
          var tModel = tAdornmentModels[tProperty];
          tOperativePlot.setIfChanged( tProperty, tModel);
        }
      }
      tOperativePlot.endPropertyChanges();

      this.setIfChanged('plot', tOperativePlot);

      if( !SC.none(tNewPlot) && !SC.none(tCurrentPlot)) {
        this.removePlotObserver( tCurrentPlot);
        tCurrentPlot.destroy();
      }
    },

    /**
     Remove the attribute on the axis described by the given key.
     @param{String} key to the desired attribute description
     @param{String} key to the axis whose attribute is to be removed
     @param{Number} index of attribute in the list
     */
    removeAttribute: function (iDescKey, iAxisKey, iAttrIndex) {

      var
          /**
           * This is the normal case - there's one attribute assigned to the axis, and we remove it.
           * When we remove the last attribute, we have to do some plot reconfiguration. When it's not
           * the last attribute, we assume that the plot configuration remains the same.
           */
          removeLastAttribute = function () {
            var tAxisToDestroy = this.get(iAxisKey),
                tNewAxis = DG.AxisModel.create( { dataConfiguration: tConfig }),
                tOtherDesc = (iDescKey === 'xAttributeDescription') ? 'yAttributeDescription' : 'xAttributeDescription',
                tY2Plot = (iAxisKey === 'y2Axis') ? this.getY2Plot() : null,
                tSecondaryRole, tPrimaryRole;

            this.set('aboutToChangeConfiguration', true); // signals dependents to prepare

            tNewAxis.set('attributeDescription', tConfig.get(iDescKey));
            this.set(iAxisKey, tNewAxis);
            tAxisToDestroy.destroy();

            tConfig.setAttributeAndCollectionClient(iDescKey, null,
                DG.Analysis.EAnalysisRole.eNone, DG.Analysis.EAttributeType.eNone);
            // The role of the attribute placement description on the axis whose attribute is removed must be secondary
            // and the other axis role must now be primary
            switch (this.getPath('dataConfiguration.' + tOtherDesc + '.attributeType')) {
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
            tConfig.get(iDescKey).set('role', tSecondaryRole);
            tConfig.get(tOtherDesc).set('role', tPrimaryRole);

            if (iAxisKey === 'y2Axis') {
              if (tY2Plot) {
                this.removePlot(tY2Plot);
                this.notifyPropertyChange('attributeRemoved');
              }
            }
            else {
              this.synchPlotWithAttributes();
            }

            this.invalidate();
            this.set('aboutToChangeConfiguration', false); // reset for next time
          }.bind(this),

          /**
           * We're removing one of 2 or more attributes. The axis will stay the same. One plot will be removed.
           */
          removeIndexedAttribute = function () {
            var tAttrDesc = tConfig.get(iDescKey);
            tAttrDesc.removeAttributeAtIndex(iAttrIndex);
            this.removePlotAtIndex(iAttrIndex);

            this.notifyPropertyChange('attributeRemoved');
          }.bind(this);

      iAttrIndex = iAttrIndex || 0;
      var tConfig = this.get('dataConfiguration'),
          tAttributes = tConfig.getPath(iDescKey + '.attributes');

      if( tAttributes.length === 0)
        return;
      if (tAttributes.length === 1) {
        if( iAxisKey === 'xAxis')
          tConfig.get('yAttributeDescription').removeAllAttributesButFirst();

        // If we are removing the last x or y-axis attribute and there is a y2-axis attribute, remove the latter first.
        if( ((iAxisKey === 'yAxis') || (iAxisKey === 'xAxis')) && this.getY2Plot())
          this.removeAttribute( 'y2AttributeDescription', 'y2Axis', 0);

        removeLastAttribute();
      }
      else
        removeIndexedAttribute();
    },

    hiddenCasesDidChange: function() {
      if( !this._isBeingRestored) {
        this.invalidate();
        this.rescaleAxesFromData( false, /* no shrinkage allowed */ true /* animate */);
        this.get('plots').forEach(function(plot) {
          plot.invalidateAggregateAdornments();
        });
      }
    },

    /**
     * Use the properties of the given object to restore my plot, axes, and legend.
     * @param iStorage {Object}
     */
    restoreStorage: function( iStorage) {
      var tDataConfig = this.get('dataConfiguration'),
          tYAttrIndex = 0,
          tY2AttrIndex = 0;

      this._isBeingRestored = true;

      var instantiateArrayOfPlots = function( iPlots) {
        iPlots.forEach( function( iModelDesc, iIndex) {
          if( !iModelDesc.plotClass)
            return;
          var tPlot = DG.Core.classFromClassName( iModelDesc.plotClass ).create( this.getModelPointStyleAccessors()),
          tActualYAttrIndex = iModelDesc.plotModelStorage.verticalAxisIsY2 ? tY2AttrIndex++ : tYAttrIndex++;
          tPlot.beginPropertyChanges();
          tPlot.set('enableMeasuresForSelection', this.get('enableMeasuresForSelection'));
          tPlot.setIfChanged( 'dataConfiguration', tDataConfig);
          tPlot.setIfChanged( 'xAxis', this.get( 'xAxis' ) );
          tPlot.setIfChanged( 'yAxis', this.get( 'yAxis' ) );
          tPlot.setIfChanged( 'y2Axis', this.get( 'y2Axis' ) );
          tPlot.setIfChanged( 'yAttributeIndex', tActualYAttrIndex);
          tPlot.restoreStorage(iModelDesc.plotModelStorage);
          tPlot.endPropertyChanges();
          this.addPlotObserver( tPlot);
          if( iIndex === 0)
            this.set('plot', tPlot);
          else
            this.addPlot( tPlot);
        }.bind( this));
      }.bind( this);

      sc_super();

      // Start the plots from scratch
      while( this._plots.length > 0) {
        var tPlot = this._plots.pop();
        this.removePlotObserver( tPlot);
        tPlot.destroy();
      }

      if( !SC.none( iStorage.isTransparent))
        this.set('isTransparent', iStorage.isTransparent);
      if( !SC.none( iStorage.plotBackgroundColor))
        this.set('plotBackgroundColor', iStorage.plotBackgroundColor);
      if( !SC.none( iStorage.plotBackgroundOpacity))
        this.set('plotBackgroundOpacity', iStorage.plotBackgroundOpacity);
      if( !SC.none( iStorage.plotBackgroundImage))
        this.set('plotBackgroundImage', iStorage.plotBackgroundImage);
      if( !SC.none( iStorage.plotBackgroundImageLockInfo))
        this.set('plotBackgroundImageLockInfo', iStorage.plotBackgroundImageLockInfo);
      if( !SC.none( iStorage.enableNumberToggle))
        this.set('enableNumberToggle', iStorage.enableNumberToggle);
      if( iStorage.enableNumberToggle && !SC.none( iStorage.numberToggleLastMode))
        this.setPath('numberToggle.lastMode', iStorage.numberToggleLastMode);
      if( !SC.none( iStorage.enableMeasuresForSelection))
        this.set('enableMeasuresForSelection', iStorage.enableMeasuresForSelection);

      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      ['x', 'y', 'y2', 'legend'].forEach( function( iKey) {
        var tAttrRef = this.instantiateAttributeRefFromStorage(iStorage, iKey + 'Coll', iKey + 'Attr');
        tDataConfig.setAttributeAndCollectionClient(iKey + 'AttributeDescription', tAttrRef,
            iStorage[iKey + 'Role'], iStorage[iKey + 'AttributeType']);
      }.bind( this));

      this.set('aboutToChangeConfiguration', false ); // We're done

      ['x', 'y', 'y2'].forEach( function( iKey) {
        var tAxisClassName = iStorage[iKey + 'AxisClass'],
            tAxisClass = tAxisClassName && DG[tAxisClassName.substring(3)], // convert string to axis class
            tPrevAxis = this.get( iKey + 'Axis'),
            tCurrentAxisClass = tPrevAxis.constructor;
        if( tAxisClass && tAxisClass !== tCurrentAxisClass) {
          var tNewAxis = tAxisClass.create({ dataConfiguration: tDataConfig});
          tNewAxis.set('attributeDescription', tDataConfig.get(iKey + 'AttributeDescription'));
          this.set(iKey + 'Axis', tNewAxis);
          tPrevAxis.destroy();
        }
      }.bind( this));

      instantiateArrayOfPlots( (iStorage.plotClass ? [ {plotClass: iStorage.plotClass }] : null) ||
                                  iStorage.plotModels ||
                                  []);
      this._isBeingRestored = false;
    },

    checkboxDescriptions: function() {
      return this.getPath('plot.checkboxDescriptions');
    }.property('plot'),

    configurationDescriptions: function() {
      return this.getPath('plot.configurationDescriptions');
    }.property('plot'),

    lastValueControls: function() {
      return this.getPath('plot.lastValueControls');
    }.property('plot'),

    lastConfigurationControls: function() {
      return this.getPath('plot.lastConfigurationControls');
    }.property('plot'),

    /**
     * My plot model and my axes may have animations going on. If so, stop them.
     */
    stopAnimation: function() {
      this.get('plot').stopAnimation();
      this.get('xAxis').stopAnimation();
      this.get('yAxis').stopAnimation();
      var tY2Axis = this.get('y2Axis');
      tY2Axis && tY2Axis.stopAnimation();
    },

    isParentCase: function( iCase) {
      var parent = iCase.get('parent');
      return SC.none( parent);
    },

    handleDroppedContext: function( iContext) {
      if( this.get('dataContext') !== iContext) {
        this.reset();
      }
    },

    isPlotAffectedByChange: function(iChange) {
      var plotModel = this.get('plot'),
          toggleModel = this.get('enableNumberToggle') && this.get('numberToggle');
      return (plotModel && plotModel.isAffectedByChange(iChange)) ||
              (toggleModel && toggleModel.isAffectedByChange(iChange));
    },

    handleOneDataContextChange: function( iNotifier, iChange) {
      sc_super();

      var plotModel = this.get('plot'),
          operation = iChange && iChange.operation;

      // No response necessary if the change doesn't affect us.
      if( plotModel && !this.isPlotAffectedByChange( iChange))
        return;

      // The GraphModel response is operation-specific.
      switch( operation) {
        case 'deleteCases':
          this.get('dataConfiguration').synchHiddenCases();
          this.dataDidChange( null, null, iChange);
          break;
        case 'createCase':
        case 'createCases':
        case 'createCollection':
        case 'deleteCollection':
        case 'resetCollections':
        case 'moveAttribute':   // Will only get here if the move is from one collection to another
          this.dataDidChange( null, null, iChange);
          break;
        case 'updateCases':
        case 'dependentCases':
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
      // Forward the notification to the number toggle, so it can respond as well.
      var numberToggleModel = this.get('numberToggle');
      if(numberToggleModel) {
        numberToggleModel.handleDataContextNotification(iNotifier, iChange);
      }
    },

    /**
     * One or more of the attributes used on this graph has been changed; e.g. by having its name changed.
     * We pass responsibility for dealing with the change to the appropriate sub-model.
     * @override
     * @param iChange {Object}
     */
    handleUpdateAttributes: function( iChange) {
      var tDataConfiguration = this.get('dataConfiguration'),
          tChangedAttrIDs = iChange && iChange.result && iChange.result.attrIDs;
      if( SC.isArray( tChangedAttrIDs)) {
        tChangedAttrIDs.forEach( function( iAttrID) {
          ['x', 'y', 'y2', 'legend'].forEach( function( iKey) {
            var tAssignedAttrs = tDataConfiguration.getPath( iKey + 'AttributeDescription.attributes'),
                tAssignedAttrIDs = tAssignedAttrs && tAssignedAttrs.map(function (iAttr) {
                  return iAttr.get('id');
                });
            if( tAssignedAttrIDs && tAssignedAttrIDs.indexOf( iAttrID) >= 0) {
              var tSubModel = (iKey === 'legend') ? this.get( iKey) : this.get( iKey + 'Axis');
              if( tSubModel)
                tSubModel.handleUpdateAttribute( iAttrID);
            }
          }.bind( this));
        }.bind( this));
      }
    },

    /**
     @private
     */
    dataDidChange: function( iSource, iKey, iChange ) {

      var caseLiesOutsideBounds = function( iCase) {
        return ['x', 'y', 'y2'].some( function( iDim) {
          var tFound = false,
              tAxis = this.get( iDim + 'Axis');
          if( tAxis && tAxis.get('isNumeric')) {
            var tLower = tAxis.get('lowerBound'),
                tUpper = tAxis.get('upperBound');
            tFound = this.getPath('dataConfiguration.' + iDim + 'AttributeDescription.attributes').some(function( iAttr) {
              var tValue = iCase.getNumValue( iAttr.get('id'));
              return isFinite( tValue) && (tValue < tLower || tValue > tUpper);
            });
          }
          return tFound;
        }.bind( this));
      }.bind( this);

      var tPlot = this.get('plot');
      if( tPlot && tPlot.isAffectedByChange( iChange)) {
        this.invalidate( iChange);  // So that when we ask for cases we get the right ones
        var dataConfig = this.get('dataConfiguration'),
            cases = dataConfig && dataConfig.get('cases'),
            tDataLength = cases ? cases.length() : 0;
        if( tDataLength !== this._oldNumberOfCases ) {
          var isAddingCases = (tDataLength > this._oldNumberOfCases);
          if( tPlot && isAddingCases) {
            var newCase = cases.at( tDataLength-1);
            if( this.isParentCase( newCase))
              tPlot.set('openParentCaseID', newCase.get('id'));
            if( caseLiesOutsideBounds( newCase)) {
              // We always rescale the axes on new data. Previously, we rescaled
              // for child cases but skipped rescale on parent cases because in
              // most cases the parent case values aren't filled in until the end
              // when the closeCase command is issued. Some games provide all their
              // parent-level case values at createCase-time, however, and then
              // don't trigger any updateCase notifications at closeCase time.
              // Therefore, we always rescale here even though that could lead to
              // rescaling at openCase and again at closeCase under some circumstances.
              tPlot.rescaleAxesFromData(false /* don't allow scale shrinkage */,
                  false /* don't animate points */);
            }
          }
          this._oldNumberOfCases = tDataLength;
        }
        return;
      }
      // Must redraw everything if there are aggregate functions
      // Should be able to refine this to only changes that affect the plot
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

