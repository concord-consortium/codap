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
    xAxis: function( iKey, iValue) {
      if( iValue) {
        this.get('axisCoordinator').setAxis('x', 0, iValue);
      }
      return this.get('xAxisArray')[0];
    }.property(),

    /**
     @property { DG.AxisModel }
     */
    yAxis: function( iKey, iValue) {
      if( iValue) {
        this.get('axisCoordinator').setAxis('y', 0, iValue);
      }
      return this.get('yAxisArray')[0];
    }.property(),

    /**
     * This second axis is only instantiated when the user has indicated a desire to plot an attribute on an axis
     * to the right of the plot.
     * @property { DG.AxisModel }
     */
    y2Axis: function( iKey, iValue) {
      if( iValue) {
        this.get('axisCoordinator').setAxis('y2', 0, iValue);
      }
      return this.get('y2AxisArray')[0];
    }.property(),

    /**
     * For numeric axes in each dimension, receives notification of bounds change and synchs the other
     * axes' bounds with the bounds belonging to the notifying axis.
     * @property {DG.AxisCoordinator}
     */
    axisCoordinator: null,

    /*
     * With the possibility of splitting plots, we have arrays of each of the axes
     */
    xAxisArray: function() {
      return this.getPath('axisCoordinator.xAxisArray');
    }.property('axisCoordinator.xAxisArray'),
    yAxisArray: function() {
      return this.getPath('axisCoordinator.yAxisArray');
    }.property('axisCoordinator.yAxisArray'),
    y2AxisArray: function() {
      return this.getPath('axisCoordinator.y2AxisArray');
    }.property('axisCoordinator.y2AxisArray'),

    // When plots are split, we have top and right axis
    topAxis: null,
    rightAxis: null,

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
          iPlot.removeObserver('canSupportConfigurations', this, this.canSupportConfigurationsChanged);
          this.removePlotObserver( iPlot);
          iPlot.destroy();
        }.bind( this));
        this._plots[0] = iPlot;
        this._plots.length = 1;
        // TODO: Figure out a more elegant way to observe this property
        iPlot.addObserver('connectingLine', this, this.connectingLineChanged);
        iPlot.addObserver('canSupportConfigurations', this, this.canSupportConfigurationsChanged);
        iPlot.set('enableMeasuresForSelection', this.get('enableMeasuresForSelection'));
      }
      return (this._plots.length < 1) ? null : this._plots[0];
    }.property(),

    _plots: null,

    plots: function() {
      return this._plots;
    }.property(),

    allPlots: function() {
      var tResult = [];
      this._plots.forEach( function( iPlot) {
        tResult = tResult.concat( [iPlot].concat( iPlot.get('siblingPlots')));
      });
      return tResult;
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
          iPlot.setAdornmentVisibility('connectingLine', true);
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
      var tPlot = this._plots[ iPlotIndex];
      if( tPlot) {
        this._plots.splice(iPlotIndex, 1);
        this.removePlotObserver(tPlot);
        tPlot.destroy();
        var tActualYIndex = 0;
        this._plots.forEach(function (iPlot, iIndex) {
          // Only plots for attributes on regular y-axis need their yAttributeIndex updated
          if (!iPlot.get('verticalAxisIsY2')) {
            iPlot.setIfChanged('yAttributeIndex', tActualYIndex);
            tActualYIndex++;
          }
        });
      }
    },

    /**
     * This is a 3-dim array of PlotModels. The innermost dimension allows for multiple overlaid scatterplots.
     * [row][column][overlay]
     * @property {[[DG.PlotModel]]}
     */
    splitPlotArray: null,

    /**
     * @property {Boolean}
     */
    isSplit: function() {
      return this.getPath('dataConfiguration.hasSplitAttribute');
    }.property(),
    isSplitDidChange: function() {
      this.propertyDidChange('isSplit');
    }.observes('dataConfiguration.hasSplitAttribute'),

    numSplitRows: function() {
      return this.getPath('dataConfiguration.rightAttributeDescription.attributeStats.numberOfCells') || 1;
    }.property(),

    numSplitColumns: function() {
      return this.getPath('dataConfiguration.topAttributeDescription.attributeStats.numberOfCells') || 1;
    }.property(),

    /**
     Observers can use this property to know when to get ready for a change; e.g. to set up a cache of current
     point positions for an animation.
     @property {Boolean}
     */
    aboutToChangeConfiguration: false,
    /**
     * Whenever we're done changing configuration, make sure the plot background image lock state
     * is consistent with axis configuration. We can only lock background image if both axes are numeric.
     */
    setProperBackgroundLockInfo: function() {
      if( !this.get('aboutToChangeConfiguration')) {
        if(!this.bothAxesAreNumeric())
          this.set('plotBackgroundImageLockInfo', null);
      }
    }.observes('aboutToChangeConfiguration'),

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

      var configureAttributeDescription = function (iKey, iDataContext) {
            var tAttributeName = this.get(iKey + 'AttributeName'),
                tAttribute,
                tDefaults = iDataContext?iDataContext.collectionDefaults():DG.currDocumentController().collectionDefaults(),
                tCollectionClient = tDefaults.collectionClient;
            if (tAttributeName) {
              delete this[iKey + 'AttributeName'];  // Because that was how it was passed in
              tAttribute = iDataContext ? iDataContext.getAttributeByName(tAttributeName) :
                  (tCollectionClient ? tCollectionClient.getAttributeByName(tAttributeName) : null);
              if (tAttribute) {
                if (iDataContext && !tCollectionClient)
                  tCollectionClient = iDataContext.getCollectionForAttribute(tAttribute);
                this.get('dataConfiguration').setAttributeAndCollectionClient(iKey + 'AttributeDescription',
                    {collection: tCollectionClient, attributes: [tAttribute]});
              }
            }
          }.bind(this),
          configureSplitAxis = function (iPrefix) {
            // The top and right axes are always DG.CellAxis, so we might as well create them here
            // Note that if they already exist, we need to leave them in place or they get disconnected
            // from their axis views. This happens during reset when we change contexts
            var tAxis = this.get(iPrefix + 'Axis'),
                tDescription = tConfiguration.get(iPrefix + 'AttributeDescription');
            if( !tAxis) {
              tAxis = DG.CellAxisModel.create();
              this.set(iPrefix + 'Axis', tAxis);
            }
            tAxis.set('dataConfiguration', tConfiguration);
            tAxis.set('attributeDescription', tDescription);
          }.bind( this);

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
        this.setPath('dataConfiguration.dataContext', tDataContext);
        delete this.initialDataContext;  // It was passed in this way, but it's not one of our legitimate properties
      }

      this._plots = [];
      this.splitPlotArray = [[this._plots]];

      this.axisCoordinator = DG.AxisCoordinator.create();

      ['x', 'y', 'y2', 'legend', 'right', 'top'].forEach(function (iKey) {
        configureAttributeDescription(iKey, tDataContext);
        if( ['x', 'y', 'y2'].indexOf( iKey) >= 0) {
          var tDescription = this.getPath(
              'dataConfiguration.' + (iKey + 'AttributeDescription')),
              tAxisClass = getAxisClassFromType(tDescription.get('attributeType')),
              tAxis = tAxisClass.create(
                  {dataConfiguration: this.dataConfiguration});
          this.set(iKey + 'Axis', tAxis);
          this.passGetPointColorToAxis(iKey, tAxis);
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

      configureSplitAxis( 'top');
      configureSplitAxis( 'right');

      var showNumberToggle = DG.get('IS_INQUIRY_SPACE_BUILD') || this.get('enableNumberToggle'),
          numberToggle = this.get('numberToggle'),
          numberToggleLastMode = this.get('numberToggleLastMode'),
          dataConfiguration = this.get('dataConfiguration');
      if (!numberToggle) {
        numberToggle = DG.NumberToggleModel.create({ dataConfiguration: dataConfiguration,
                                                      isEnabled: showNumberToggle });
        if (numberToggle && numberToggleLastMode) {
          numberToggle.set('lastMode', numberToggleLastMode);
        }
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

      this.addObserver('dataConfiguration.hiddenCasesWillChange', this.displayedCasesWillChange);
      this.addObserver('dataConfiguration.hiddenCases', this.displayedCasesDidChange);
      this.addObserver('dataConfiguration.displayOnlySelected', this.displayedCasesDidChange);
    },

    destroy: function() {
      this.removeObserver('dataConfiguration.hiddenCasesWillChange', this.displayedCasesWillChange);
      this.removeObserver('dataConfiguration.hiddenCases', this.displayedCasesDidChange);
      this.removeObserver('dataConfiguration.displayOnlySelected', this.displayedCasesDidChange);
      this.axisCoordinator.destroy();

      sc_super();
    },

    enableNumberToggleDidChange: function() {
      this.setPath('numberToggle.isEnabled', this.get('enableNumberToggle'));
    }.observes('enableNumberToggle'),

    numberToggleLastModeDidChange: function() {
      this.setPath('numberToggle.lastMode', this.get('numberToggleLastMode'));
    }.observes('numberToggleLastMode'),

    enableMeasuresForSelectionDidChange: function() {
      var tEnabled = this.get('enableMeasuresForSelection');
      this.get('allPlots').forEach( function( iPlot) {
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
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle ' + iCapability,
              type: 'DG.GraphView'
            }
          },
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
        case DG.GraphTypes.EOrientation.kHorizontal:
          tDescKey = 'xAttributeDescription';
          break;
        case DG.GraphTypes.EOrientation.kVertical:
          tDescKey = 'yAttributeDescription';
          break;
        case DG.GraphTypes.EOrientation.kVertical2:
          tDescKey = 'y2AttributeDescription';
          break;
      }

      return this.getPath('dataConfiguration.' + tDescKey + '.attribute');
    },

    /**
      Sets the attribute for the specified axis.
     Note that prior to the "split at top or right" feature we only had to worry about the "zeroth" plot.
     But with splitting, we have to take into account that all the plots may need to be swapped out for new
     ones. We accomplish that by detecting that the new attribute is not of the same nominal/numeric type and,
     if so, wiping out all the sibling plots so we can start over.
      @param  {DG.DataContext}      iDataContext -- The data context for this graph
      @param  {Object}              iAttrRefs --
              {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
              {DG.Attribute}        iAttrRefs.attributes -- The array of attributes to set for the axis
      @param  {String}              iOrientation -- identifies the axis ('horizontal' or 'vertical')
     */
    changeAttributeForAxis: function( iDataContext, iAttrRefs, iOrientation) {
      var this_ = this,
          tTargetDescKey, tTargetAxisKey, tOtherDim,
          tIsXorYChange = false,
          tIsSplit = this.get('isSplit');

      function switchAxes() {

        function synchAxis( iDescKey, iAxisKey, iAxisClass, iScaleType) {
          var tCurrentAxisClass = this_.get( iAxisKey).constructor,
              tAxisModelParams = { dataConfiguration: tDataConfiguration };

          // If the variable and axis are incompatible, we'll have to change the axis
          if( iAxisClass !== tCurrentAxisClass ) {
            var tAxisToDestroy = this_.get( iAxisKey ),
                tNewAxis = iAxisClass.create(tAxisModelParams);
            tNewAxis.set( 'attributeDescription', tDataConfiguration.get( iDescKey ) );
            tNewAxis.setLinkToPlotIfDesired( this_.get('plot'));
            tNewAxis.set('scaleType', iScaleType);
            this_.passGetPointColorToAxis(iAxisKey, tNewAxis);
            this_.set( iAxisKey, tNewAxis );
            tAxisToDestroy.destroy();
            this_.setPath('plot.' + iAxisKey, tNewAxis);
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
            tTargetAxisScaleType = this_.getPath( tSourceAxisKey + '.scaleType'),
            tSourceAxisClass = this_.get( tTargetAxisKey).constructor,
            tSourceAxisScaleType = this_.getPath( tTargetAxisKey + '.scaleType'),
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
        this_.beginPropertyChanges();
        synchAxis(tTargetDescKey, tTargetAxisKey, tTargetAxisClass, tTargetAxisScaleType);
        synchAxis(tSourceDescKey, tSourceAxisKey, tSourceAxisClass, tSourceAxisScaleType);
        this_.endPropertyChanges();
        this_.invalidate();
        this_.rescaleAxesFromData(true, true);
      }

      function removeAllButZerothAttribute() {
        var tNumAttributes = tDataConfiguration.getPath(tTargetDescKey + '.attributes').length;
        while( tNumAttributes > 1) {
          this_.removeAttribute(tTargetDescKey, tTargetAxisKey, --tNumAttributes);
        }
      }

      if( tIsSplit) {
        this.removeAllSplitPlotsAndAxes();
      }
      switch (iOrientation) {
        case DG.GraphTypes.EOrientation.kHorizontal:
          tTargetDescKey = 'xAttributeDescription';
          tTargetAxisKey = 'xAxis';
          tOtherDim = 'y';
          tIsXorYChange = true;
          break;
        case DG.GraphTypes.EOrientation.kVertical:
          tTargetDescKey = 'yAttributeDescription';
          tTargetAxisKey = 'yAxis';
          tOtherDim = 'x';
          tIsXorYChange = true;
          break;
        case DG.GraphTypes.EOrientation.kVertical2:
          tTargetDescKey = 'y2AttributeDescription';
          tTargetAxisKey = 'y2Axis';
          tOtherDim = 'x';
          break;
        case DG.GraphTypes.EOrientation.kTop:
        case DG.GraphTypes.EOrientation.kRight:
          tTargetDescKey = iOrientation + 'AttributeDescription';
          tTargetAxisKey = iOrientation + 'Axis';
          break;
      }

      this.set('aboutToChangeConfiguration', true); // signals dependents to prepare

      var tDataConfiguration = this.get('dataConfiguration'),
          tCurrentAttribute = tDataConfiguration.getPath(tTargetDescKey + '.attribute'),
          tOtherAttribute = tDataConfiguration.getPath(tOtherDim + 'AttributeDescription.attribute'),
          tNewAttribute = iAttrRefs.attributes[0],
          tIsAxisSwitch = tNewAttribute === tOtherAttribute;

      tDataConfiguration.beginPropertyChanges();

      if (tIsAxisSwitch) {
        switchAxes();
      }
      else {
        if( tTargetAxisKey === 'yAxis')
          removeAllButZerothAttribute();
        tDataConfiguration.set('dataContext', iDataContext);
        tDataConfiguration.setAttributeAndCollectionClient(tTargetDescKey, iAttrRefs);

        this.synchPlotWithAttributes();
        this.synchAxes();

        if( tIsXorYChange) {
          // Plots (e.g. BinnedPlotModel) need to know this directly so that can act differently
          //  than for other attribute changes
          this.get('allPlots').forEach(function (iPlot) {
            iPlot.xOrYAttributeDidChange(tTargetAxisKey);
          });
        }

        this.invalidate();
      }

      tDataConfiguration.endPropertyChanges();
      this.set('aboutToChangeConfiguration', false); // reset for next time
      if( tIsSplit) {
        this.updateAxisArrays();
        this.updateSplitPlotArray();
        this.notifyPropertyChange('splitPlotChange');
      }
    },

    /**
      Sets the attribute for the specified axis.
      @param  {DG.DataContext}      iDataContext -- The data context for this graph
      @param  {Object}              iAttrRefs -- The attribute to set for the axis
             {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
             {DG.Attribute}        iAttrRefs.attributes -- The array of attributes to set for the axis
     */
    addAttributeToAxis: function( iDataContext, iAttrRefs) {
      DG.logUser("addAxisAttribute: { attribute: %@ }", iAttrRefs.attributes[0].get('name'));

      var tYAttrDescription = this.getPath('dataConfiguration.yAttributeDescription' ),
          tAttrIndex = tYAttrDescription.get('attributes' ).length,
          tIsSplit = this.get('isSplit');

      if( tIsSplit) {
        this.removeAllSplitPlotsAndAxes();
      }

      if( tAttrIndex === 0) {
        // We aren't adding after all. Happens when foreign context is brought to multi-attribute place
        this.changeAttributeForAxis( iDataContext, iAttrRefs, DG.GraphTypes.EOrientation.kVertical);
        return;
      }

      tYAttrDescription.addAttribute( iAttrRefs.attributes[0]);

      var tRootPlot = this.get('plot'),
          tProperties = $.extend(this.getModelPointStyleAccessors(),
              tRootPlot.getPropsForCopy(),
              {
                xAxis: this.get('xAxis'),
                yAxis: this.get('yAxis'),
                y2Axis: this.get('y2Axis'),
                yAttributeIndex: tAttrIndex
              }),
      // The only plot we can currently make with multiple attributes is a scatterplot
          tPlot = DG.ScatterPlotModel.create(tProperties);

      this.addPlot( tPlot);
      tPlot.installAdornmentModelsFrom(tRootPlot);
      var tConnectingLineModel = tRootPlot.getAdornmentModel('connectingLine');
      if( tConnectingLineModel)
        tPlot.setAdornmentVisibility('connectingLine', tConnectingLineModel.get('isVisible'));

      this.notifyPropertyChange('attributeAdded');

      if( tIsSplit) {
        this.updateAxisArrays();
        this.updateSplitPlotArray();
        this.notifyPropertyChange('splitPlotChange');
      }
    },

    /**
     * Subclasses will override
     */
    removeSplitAttribute: function( iDescKey, iAxisKey, iIndex) {
      this.removeAllSplitPlotsAndAxes();
      this.get('dataConfiguration').setAttributeAndCollectionClient(iDescKey, null,
          DG.Analysis.EAnalysisRole.eNone, DG.Analysis.EAttributeType.eNone);

      this.updateAxisArrays();
      this.updateSplitPlotArray();
      this.notifyPropertyChange('splitPlotChange');
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
        this.changeAttributeForAxis( iDataContext, iAttrRefs, DG.GraphTypes.EOrientation.kVertical);
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

      var tY2AttrDescription = this.getPath('dataConfiguration.y2AttributeDescription' ),
          tIsSplit = this.get('isSplit');
      if( tIsSplit) {
        this.removeAllSplitPlotsAndAxes();
      }
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

      if( tIsSplit) {
        this.updateAxisArrays();
        this.updateSplitPlotArray();
        this.notifyPropertyChange('splitPlotChange');
      }
    },

    /**
     * Change the attribute type (EAttributeType) on the axis described by the given key,
     * to treat a Numeric attribute as Categorical.
     * @param{String} iDescKey - key to the desired attribute description (x...|y...|legendAttributeDescription)
     * @param{String} iAxisKey - key to the axis whose attribute is to be removed (x...|yAxis)
     * @param{Boolean} true if we want to treat the attribute as numeric (else categorical).
     */
    changeAttributeType: function( iDescKey, iAxisKey, iTreatAsNumeric ) {
      sc_super();

      if( iDescKey === 'xAttributeDescription' || iDescKey === 'yAttributeDescription') {
        this.synchPlotWithAttributes();
        this.synchAxes();
        this.rescaleAxesFromData(true /*allowShrinkage*/, true /*animatePoints*/);
        this.updateAxisArrays();
        this.updateSplitPlotArray();
        this.notifyPropertyChange('splitPlotChange');
      }
    },

    /**
     * The top or right "axis view" has accepted the drop of a nominal attribute
     * @param iDataContext {DG.DataContext}
     * @param iAttrRefs { {attributes: [{DG.Attribute}], collection: {DG.Collection}}}
     * @param iSplitPosition { 'top' | 'right' }
     */
    splitByAttribute: function( iDataContext, iAttrRefs, iSplitPosition) {

      function replaceOtherWithCurrent() {
        this_.removeAllSplitPlotsAndAxes();
        var tCurrentAttribute = tDataConfiguration.getPath( tTargetDescKey + '.attribute'),
            tCurrentCollection = tDataConfiguration.getPath( tTargetDescKey + '.collection');
        tDataConfiguration.setAttributeAndCollectionClient( tOtherDescKey, {
          attributes: [ tCurrentAttribute ], collection: tCurrentCollection
        });
        this_.notifyPropertyChange('removedAllSplitPlotsAndAxes');
      }

      this.set('aboutToChangeConfiguration', true); // signals dependents to prepare

      var this_ = this,
          tDataConfiguration = this.get('dataConfiguration'),
          tOtherSplitPosition = iSplitPosition === 'top' ? 'right' : 'top',
          tTargetDescKey = iSplitPosition + 'AttributeDescription',
          tOtherDescKey = tOtherSplitPosition + 'AttributeDescription',
          tDroppedAttribute = iAttrRefs.attributes[0],
          tOtherAttribute = tDataConfiguration.getPath( tOtherDescKey + '.attribute');
      if( tDroppedAttribute === tOtherAttribute) {
        replaceOtherWithCurrent();
      }
      if( this.get('isSplit'))
        this.removeAllSplitPlotsAndAxes();
      tDataConfiguration.set('dataContext', iDataContext);
      tDataConfiguration.setAttributeAndCollectionClient(tTargetDescKey, iAttrRefs);

      this.invalidate();

      this.updateAxisArrays();

      this.updateSplitPlotArray();

      this.set('aboutToChangeConfiguration', false); // reset for next time

      this.notifyPropertyChange('splitPlotChange');
    },

    /**
     * A category map for an attribute on either the top or right axis has changed.
     * By invalidating all split plots the correct points will be drawn on the next redraw.
     */
    splitCategoriesDidChange: function() {
      this.forEachSplitPlotElementDo( function( iPlotArray) {
        iPlotArray.forEach( function( iPlot) {
          iPlot.invalidateCaches();
        });
      });
    }.observes('dataConfiguration.categoryMap'),

    /**
     * Useful for knowing whether we can rescale.
     * @return {Boolean}
     */
    hasNumericAxis: function() {
      return this.getPath('xAxis.isNumeric') || this.getPath('yAxis.isNumeric');
    }.property('xAxis', 'yAxis'),

    /**
     * Useful for knowing whether we can lock background.
     * @return {Boolean}
     */
    bothAxesAreNumeric: function() {
      return this.getPath('xAxis.isNumeric') && this.getPath('yAxis.isNumeric');
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
    canSupportConfigurationsChanged: function() {
      this.notifyPropertyChange('canSupportConfigurations');
    },

    /**
     * If there are no cases, don't do anything
     * @param iShrink {boolean}
     * @param iAnimate {boolean}
     * @param iLogIt {boolean}
     * @param iUserAction {boolean}
     */
    rescaleAxesFromData: function( iShrink, iAnimate, iLogIt, iUserAction) {
        this.forEachSplitPlotElementDo(function (iPlotArray) {
          if (iPlotArray[0])  // During some transitions, we may temporarily not have any plots in this cell
            iPlotArray[0].rescaleAxesFromData(iShrink, iAnimate, iLogIt, iUserAction);
        });
    },

    mixUp: function() {
      this.forEachSplitPlotElementDo( function( iPlotArray) {
        var tZeroPlot = iPlotArray[0];
        if( tZeroPlot && tZeroPlot.mixUp)  // During some transitions, we may temporarily not have any plots in this cell
          tZeroPlot.mixUp();
      });
    },

    /**
     * This is a bit awkward, but if the axis is a DG.CellLinearAxisModel and the key is for a y-axis
     * we pass our getPointColor accessor to the axis so it can be passed on to the appropriate label
     * node to keep the 0th label color synched to the 0th scatterplot point color.
     * @param iKey {string}
     * @param iAxis {DG.AxisModel}
     */
    passGetPointColorToAxis: function( iKey, iAxis) {
      if( iKey.charAt(0) === 'y' && (iKey.length === 1 || iKey.charAt(1) !== '2') &&
          iAxis.constructor === DG.CellLinearAxisModel)
        iAxis.set('getPointColor', this.getPointColor.bind(this));
    },

    /**
     * Attribute and plot assignment together determine what class of axis should appear on each dimension.
     * We query the plot for each dimension and, if the axis class is not currently present, we construct
     * the desired axis and destroy the old one, being careful to let everyone know of the change.
     */
    synchAxes: function() {
      var this_ = this,
          tDataConfiguration = this.get('dataConfiguration'),
          tPlot = this.get('plot');
      [{place: DG.GraphTypes.EPlace.eX, dim: 'x'}, {place: DG.GraphTypes.EPlace.eY, dim: 'y'},
        {place: DG.GraphTypes.EPlace.eY2, dim: 'y2'}].forEach( function( iObj) {
        var tDesiredAxisClass = tPlot.getDesiredAxisClassFor( iObj.place),
            tCurrentAxis = this_.get( iObj.dim + 'Axis');
        if( tDesiredAxisClass && tCurrentAxis.constructor !== tDesiredAxisClass) {
          var tNewAxis = tDesiredAxisClass.create( {
                dataConfiguration: tDataConfiguration,
                attributeDescription: tDataConfiguration.get( iObj.dim + 'AttributeDescription')
              });
          this_.passGetPointColorToAxis(iObj.dim, tNewAxis);
          this_.set( iObj.dim + 'Axis', tNewAxis);
          tPlot.set( iObj.dim + 'Axis', tNewAxis);
          tCurrentAxis.destroy();
        }
      });
      if( tDataConfiguration.getPath('xAttributeDescription.isCategorical') &&
          tDataConfiguration.getPath('yAttributeDescription.isNumeric') &&
          tDataConfiguration.getPath('yAttributeDescription.attributes').length > 1) {
        // Make sure there is only one attribute assigned to y-axis
        var tNumAttributes = tDataConfiguration.getPath('yAttributeDescription.attributes').length;
        while( tNumAttributes > 1) {
          this.removeAttribute('yAttributeDescription', 'yAxis', --tNumAttributes);
        }

      }
    },

    /**
     * Sychronize the axis model to a new attribute or attribute description, to sure correct kind of axis is installed.
     * @param{String} iDescKey - key to the desired attribute description (x...|yAttributeDescription)
     * @param{String} iAxisKey - key to the axis to be changed (x...|yAxis)
     */
    privSyncAxisWithAttribute: function( iDescKey, iAxisKey ) {
      var tDataConfiguration = this.get('dataConfiguration'),
          tVarIsNumeric = tDataConfiguration.getPath( iDescKey + '.isNumeric'),
          tPossibleNumericClasses = [DG.CellLinearAxisModel, DG.BinnedAxisModel],
          tDesiredAxisClass = tVarIsNumeric ? DG.CellLinearAxisModel : DG.CellAxisModel,
          tCurrentAxisClass = this.get( iAxisKey).constructor,
          tAxisModelParams = { dataConfiguration: tDataConfiguration };

      // If the variable and axis are incompatible, we'll have to change the axis
      // Note that there are two possible numeric axes
      if( tDesiredAxisClass !== tCurrentAxisClass &&
          !(tVarIsNumeric && tPossibleNumericClasses.indexOf( tCurrentAxisClass) >= 0)) {
        var tAxisToDestroy = this.get( iAxisKey ),
            tNewAxis = tDesiredAxisClass.create(tAxisModelParams);
        tNewAxis.set( 'attributeDescription', tDataConfiguration.get( iDescKey ) );
        this.passGetPointColorToAxis( iAxisKey, tNewAxis);
        this.set( iAxisKey, tNewAxis );
        tAxisToDestroy.destroy();
      }
    },

    /**
     * Dot charts and bar charts have a property, displayAsBarChart, which, when toggled, amounts to request
     * to swap one for the other.
     * @param iPlot {DG.PlotModel}
     */
    addPlotObserver: function( iPlot) {
      switch( iPlot.constructor) {
        case DG.BarChartModel:
        case DG.ComputedBarChartModel:
          iPlot.addObserver('isBarHeightComputed', this, this.swapComputedBarChartType);
          if (iPlot.constructor === DG.BarChartModel)
            iPlot.addObserver('breakdownType', this, this.propagateBreakdownType);
          /* falls through */
        case DG.DotChartModel:
          iPlot.addObserver('displayAsBarChart', this, this.swapChartType);
          break;
        case DG.BinnedPlotModel:
          iPlot.addObserver('dotsAreFused', this, this.dotsAreFusedDidChange);
          /* falls through */
        case DG.DotPlotModel:
        case DG.LinePlotModel:
          iPlot.addObserver('displayAsBinned', this, this.changePlotModelType);
          if( iPlot.constructor === DG.DotPlotModel)
            iPlot.addObserver('showMeasureLabels', this, this.propagateShowMeasuresLabels);
          break;
      }
    },

    /**
     * Called before we destroy a plot.
     * @param iPlot {DG.PlotModel}
     */
    removePlotObserver: function( iPlot) {
      iPlot.removeObserver('connectingLine', this, this.connectingLineChanged);
      switch( iPlot.constructor) {
        case DG.BarChartModel:
        case DG.ComputedBarChartModel:
          iPlot.removeObserver('isBarHeightComputed', this, this.swapComputedBarChartType);
          if (iPlot.constructor === DG.BarChartModel)
            iPlot.removeObserver('breakdownType', this, this.propagateBreakdownType);
          /* falls through */
        case DG.DotChartModel:
          iPlot.removeObserver('displayAsBarChart', this, this.swapChartType);
          break;
        case DG.BinnedPlotModel:
          iPlot.removeObserver('dotsAreFused', this, this.dotsAreFusedDidChange);
          /* falls through */
        case DG.DotPlotModel:
        case DG.LinePlotModel:
          iPlot.removeObserver('displayAsBinned', this, this.changePlotModelType);
          if( iPlot.constructor === DG.DotPlotModel)
            iPlot.removeObserver('showMeasureLabels', this, this.propagateShowMeasuresLabels);
          break;
      }
    },

    swapPlotForNewPlot: function( iNewPlotClass)       {
      var tOldPlot = this.get('plot'),
          tConfig = this.get('dataConfiguration'),
          tIsSplit = this.get('isSplit'),
          tNewPlot, tAdornmentModels;
      if( tIsSplit) {
        this.removeAllSplitPlotsAndAxes();
      }
      this.set('aboutToChangeConfiguration', true); // signal to prepare
      iNewPlotClass.configureRoles(tConfig);
      var tPlotProps = this.getModelPointStyleAccessors();
      if (tOldPlot.kindOf(DG.BarChartBaseModel))
        tPlotProps.breakdownType = tOldPlot.get('breakdownType');
      tNewPlot = iNewPlotClass.create(tPlotProps);
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
      tNewPlot.set('isAnimating', false); // Gets set by rescaleAxesFromData, but it's too early to set it

      this.setIfChanged('plot', tNewPlot);

      this.removePlotObserver(tOldPlot);
      tOldPlot.destroy();

      // allow for switching axis type, e.g. CellLinearAxis <=> CountAxis for bar charts with/without formulas
      this.synchAxes();
      tNewPlot.rescaleAxesFromData(true /*iAllowAxisShrinkage*/);

      this.set('aboutToChangeConfiguration', false);  // all done
      if( tIsSplit) {
        this.updateAxisArrays();
        this.updateSplitPlotArray();
        this.notifyPropertyChange('splitPlotChange');
      }
    },

    /**
     * We swap out the given plot model for its alternate. A BarChart gets a count axis and, if we're making a
     * dot chart, we must remove the count axis.
     * @param iChartPlot {DG.BarChartModel | DG.ComputedBarChartModel }
     * @param iKey {String} Should be 'isBarHeightComputed'
     * @param iValue {Boolean}
     */
    swapComputedBarChartType: function( iChartPlot, iKey, iValue) {
      var this_ = this,
          tInitialValue = iChartPlot.get('isBarHeightComputed'),
          tOldPlotClass = iChartPlot.constructor,
          tNewPlotClass = tOldPlotClass === DG.ComputedBarChartModel ?
              DG.BarChartModel : DG.ComputedBarChartModel,
          tUndo = tInitialValue ? 'DG.Undo.graph.showAsComputedBarChart' : 'DG.Undo.graph.showAsStandardBarChart',
          tRedo = tInitialValue ? 'DG.Redo.graph.showAsComputedBarChart' : 'DG.Redo.graph.showAsStandardBarChart';
      DG.UndoHistory.execute(DG.Command.create({
        name: "graph.toggleComputedBarChart",
        undoString: tUndo,
        redoString: tRedo,
        log: ("toggleShowAs: %@").fmt(tInitialValue ? "ComputedBarChart" : "BarChart"),
        _beforeStorage: null,
        _afterStorage: null,
        _componentId: this.get('componentID'),
        _controller: function () {
          return DG.currDocumentController().componentControllersMap[this._componentId];
        },
        execute: function() {
          this._beforeStorage = this._controller().createComponentStorage();
          this_.swapPlotForNewPlot(tNewPlotClass);
        },
        undo: function() {
          this._afterStorage = this._controller().createComponentStorage();
          this._controller().restoreComponentStorage(this._beforeStorage);
        },
        redo: function () {
          this._controller().restoreComponentStorage(this._afterStorage);
          this._afterStorage = null;
        }
      }));
    },

    /**
     * We swap out the given plot model for its alternate. A BarChart gets a count axis and, if we're making a
     * dot chart, we must remove the count axis.
     * @param iChartPlot {DG.DotChartModel | DG.BarChartModel }
     * @param iKey {String} Should be 'displayAsBarChart'
     * @param iValue {Boolean}
     */
    swapChartType: function( iChartPlot, iKey, iValue) {
      var tInitialValue = iChartPlot.get('displayAsBarChart'),
          tOldPlotClass = iChartPlot.constructor,
          tNewPlotClass = tOldPlotClass === DG.DotChartModel ?
              DG.BarChartModel : DG.DotChartModel,
          tUndo = tInitialValue ? ('DG.Undo.graph.showAsBarChart') : ('DG.Undo.graph.showAsDotChart'),
          tRedo = tInitialValue ? ('DG.Redo.graph.showAsBarChart') : ('DG.Redo.graph.showAsDotChart');
      DG.UndoHistory.execute(DG.Command.create({
        name: "graph.toggleBarChart",
        undoString: tUndo,
        redoString: tRedo,
        log: ("toggleShowAs: %@").fmt(tInitialValue ? "DotChart" : "BarChart"),
        executeNotification: {
          action: 'notify',
          resource: 'component',
          values: {
            operation: 'switch bar and dot',
            type: 'DG.GraphView'
          }
        },
        execute: function() {
          this.swapPlotForNewPlot(tNewPlotClass);
        }.bind(this),
        undo: function() {
          this.swapPlotForNewPlot( tOldPlotClass);
        }.bind(this)
      }));
    },

    /**
     * We swap out the given plot model for its alternate. Note that the primary axis of a binned plot is a
     * binned numeric axis while that for a normal dot plot is a cell linear axis.
     * @param iDotPlot {DG.DotPlotModel | DG.BinnedPlotModel }
     * @param iKey {String} Should be 'displayAsBinned'
     * @param iValue {Boolean | "bars"}
     */
    changePlotModelType: function(iPlotModel, iKey, iValue) {
      var tValue = iPlotModel.get('displayAsBinned'),
          tPlotTypeMap = {
            "false": {
              constructor: DG.DotPlotModel,
              logLabel: "DotPlot",
              undo: 'DG.Undo.graph.showAsDotPlot',
              redo: 'DG.Redo.graph.showAsDotPlot'
            },
            "true": {
              constructor: DG.BinnedPlotModel,
              logLabel: "BinnedPlot",
              undo: 'DG.Undo.graph.showAsBinnedPlot',
              redo: 'DG.Redo.graph.showAsBinnedPlot'
            },
            bars: {
              constructor: DG.LinePlotModel,
              logLabel: "LinePlot",
              undo: 'DG.Undo.graph.showAsLinePlot',
              redo: 'DG.Redo.graph.showAsLinePlot'
            }
          },
          tOldPlotClass = iPlotModel.constructor;
      var tPlotTypeEntry = tPlotTypeMap[tValue];
      if (!tPlotTypeEntry) return;
      DG.UndoHistory.execute(DG.Command.create({
        name: "graph.changeDotPlotModelType",
        undoString: tPlotTypeEntry.undo,
        redoString: tPlotTypeEntry.redo,
        log: ("toggleShowAs: %@").fmt(tPlotTypeEntry.logLabel),
        executeNotification: {
          action: 'notify',
          resource: 'component',
          values: {
            operation: 'toggle show as %@'.fmt(tPlotTypeEntry.logLabel),
            type: 'DG.GraphView'
          }
        },
        execute: function() {
          this.swapPlotForNewPlot(tPlotTypeEntry.constructor);
        }.bind(this),
        undo: function() {
          this.swapPlotForNewPlot(tOldPlotClass);
        }.bind(this)
      }));
    },

    /**
     * We need to adjust the axes since we're flipping between a histogram with CellLinearAxisModel plus CountAxisModel,
     * and a binned plot with BinnedAxisModel plus AxisModel.
     * Note that undo/redo is taken care of before we get here.
     * @param iBinnedPlot {DG.BinnedPlotModel }
     */
    dotsAreFusedDidChange: function( iBinnedPlot) {
      var tDataConfiguration = this.get('dataConfiguration'),
          tPrimaryAxisPlace = iBinnedPlot.get('primaryAxisPlace'),
          tPrimaryKey = tPrimaryAxisPlace === DG.GraphTypes.EPlace.eX ? 'x' : 'y',
          tSecondaryAxisPlace = iBinnedPlot.get('secondaryAxisPlace'),
          tSecondaryKey = tSecondaryAxisPlace === DG.GraphTypes.EPlace.eX ? 'x' : 'y';
      this.set('aboutToChangeConfiguration', true); // signals dependents to prepare
      this.get('xAxis').destroy();
      this.get('yAxis').destroy();
      // this.beginPropertyChanges();
      iBinnedPlot.invalidateComputationContext(); // because we're changing its axes
      if( iBinnedPlot.get('dotsAreFused')) {
        // Transitioning to Histogram
        this.set(tPrimaryKey + 'Axis', DG.CellLinearAxisModel.create({
          dataConfiguration: tDataConfiguration,
          attributeDescription: this.getPath('dataConfiguration.' + tPrimaryKey + 'AttributeDescription')
        }));
        this.set(tSecondaryKey + 'Axis', DG.CountAxisModel.create({
          dataConfiguration: tDataConfiguration
        }));
      }
      else {
        // Transitioning to binned dot plot
        this.set(tPrimaryKey + 'Axis', DG.BinnedAxisModel.create({
          dataConfiguration: tDataConfiguration,
          attributeDescription: this.getPath('dataConfiguration.' + tPrimaryKey + 'AttributeDescription'),
          binnedPlotModel: iBinnedPlot
        }));
        this.set(tSecondaryKey + 'Axis', DG.AxisModel.create({
          dataConfiguration: tDataConfiguration,
          attributeDescription: iBinnedPlot.get(tSecondaryKey + 'AxisDescription')
        }));
      }
      this.propertyDidChange('plot'); // Let view know plot has changed (even though class has not)
      this.set('aboutToChangeConfiguration', false); // reset for next time
    },

    /**
     * The root plot's breakdown type (count or percent) has changed. Propagate this change to split plots if any.
     */
    propagateBreakdownType: function() {
      var tNewBound = this.getPath('plot.naturalUpperBound');
      if( this.get('isSplit')) {
        var tType = this.getPath('plot.breakdownType');
        this.forEachSplitPlotElementDo( function( iPlotArray, iRow, iCol) {
          if( iRow !== 0 || iCol !== 0) {
            iPlotArray[0].set('breakdownType', tType);
            tNewBound = Math.max( tNewBound, iPlotArray[0].get('naturalUpperBound'));
          }
        });
      }
      this.getPath('plot.secondaryAxisModel').setLowerAndUpperBounds(0, tNewBound, true /* with animation */);
    },

    /**
     * The root plot's showMeasureLabels flag has changed. Propagate this change to split plots if any.
     */
    propagateShowMeasuresLabels: function() {
      var tShowing = this.getPath('plot.showMeasureLabels');
      if( this.get('isSplit')) {
        this.forEachSplitPlotElementDo( function( iPlotArray, iRow, iCol) {
          if( iRow !== 0 || iCol !== 0) {
            iPlotArray[0].set('showMeasureLabels', tShowing);
          }
        });
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

      var tBothAxesCategorical = tXType === DG.Analysis.EAttributeType.eCategorical &&
                                  tYType === DG.Analysis.EAttributeType.eCategorical;
      // If the current plot is a BinnedPlotModel, it is compatible with needing a DotPlotModel
      if( tNewPlotClass === DG.DotPlotModel && tCurrentPlot &&
          tCurrentPlot.constructor === DG.BinnedPlotModel) {
        tNewPlotClass = DG.BinnedPlotModel;
        // In the presence of a categorical attribute, a binned plot model cannot have fused dots
        // because we can't yet combine count axis with categorical axis.
        if( tXType === DG.Analysis.EAttributeType.eCategorical || tYType === DG.Analysis.EAttributeType.eCategorical)
          tCurrentPlot.set('dotsAreFused', false);
      }
      else if(tNewPlotClass === DG.DotPlotModel && tCurrentPlot && tCurrentPlot.constructor === DG.LinePlotModel) {
        // We're allowed to keep the line/bar plot
        tNewPlotClass = DG.LinePlotModel;
      }
      else if( tNewPlotClass === DG.DotChartModel && tCurrentPlot && tCurrentPlot.constructor === DG.BarChartModel &&
                !tBothAxesCategorical) {
        // We're allowed to keep the bar chart
        tNewPlotClass = DG.BarChartModel;
      }

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
      tOperativePlot.setIfChanged( 'dataConfiguration', tConfig );
      tOperativePlot.setIfChanged( 'xAxis', this.get( 'xAxis' ) );
      tOperativePlot.setIfChanged( 'yAxis', this.get( 'yAxis' ) );
      tOperativePlot.installAdornmentModels( tAdornmentModels);

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

            tNewAxis.set('attributeDescription', tConfig.get(iDescKey));
            this.set(iAxisKey, tNewAxis);
            tAxisToDestroy.destroy();

            if (iAxisKey === 'y2Axis') {
              if (tY2Plot) {
                this.removePlot(tY2Plot);
                this.notifyPropertyChange('attributeRemoved');
              }
            }
            else {
              this.synchPlotWithAttributes();
              this.synchAxes();
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
          tAttributes = tConfig.getPath(iDescKey + '.attributes'),
          tIsSplit = this.get('isSplit');

      if( tIsSplit) {
        this.removeAllSplitPlotsAndAxes();
      }

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

      if(tIsSplit) {
        this.updateAxisArrays();
        this.updateSplitPlotArray();
        this.notifyPropertyChange('splitPlotChange');
      }
    },

    displayedCasesWillChange: function() {
      if (!this._isBeingRestored && this.get('isSplit')) {
        this.removeAllSplitPlotsAndAxes();
      }
    },

    displayedCasesDidChange: function() {
      if( !this._isBeingRestored) {
        this.invalidate();
        this.rescaleAxesFromData( false, /* no shrinkage allowed */ true /* animate */);
        this.get('plots').forEach(function(plot) {
          plot.invalidateAggregateAdornments();
        });
        if( this.get('isSplit')) {
          this.updateAxisArrays();
          this.updateSplitPlotArray();
          this.notifyPropertyChange('splitPlotChange');
        }
      }
    },

    /**
     *
     */
    updateAxisArrays: function() {
      var this_ = this;

      function configureAxisSlot( iKey, iIndex, iClass, iAttrDesc) {
        var tArray = this_.get(iKey + 'AxisArray'),
            tRootAxis = tArray[0],
            tCurrentAxis = tArray[iIndex],
            tNewAxis;
        if (!tCurrentAxis || tCurrentAxis.constructor !== iClass) {
          tNewAxis = iClass.create({
            dataConfiguration: tDataConfig,
            attributeDescription: tDataConfig.get(iAttrDesc)
          });
          if( tRootAxis.get('isNumeric')) {
            tNewAxis.setLowerAndUpperBounds(tRootAxis.get( 'lowerBound'), tRootAxis.get( 'upperBound'));
          }
          this_.get('axisCoordinator').setAxis( iKey, iIndex, tNewAxis);
        }
      }

      var tDataConfig = this.get('dataConfiguration'),
          tXAxisClass = this.get('xAxis').constructor,
          tYAxisClass = this.get('yAxis').constructor,
          tY2AxisClass = this.get('y2Axis').constructor;
      this.forEachRowDo( function( iRow) {
        configureAxisSlot( 'y', iRow, tYAxisClass, 'yAttributeDescription');
        configureAxisSlot( 'y2', iRow, tY2AxisClass, 'y2AttributeDescription');
      });
      this.forEachColumnDo( function( iColumn) {
        configureAxisSlot( 'x', iColumn, tXAxisClass, 'xAttributeDescription');
      });
    },

    /**
     * Make sure there are the right number of plot elements in the array and that
     * they are configured properly
     */
    updateSplitPlotArray: function() {
      var this_ = this,
          tRootPlotArray = this.get('splitPlotArray')[0][0],
          tNumPlotsPerCell = tRootPlotArray.length,
          tPlotClass = tRootPlotArray[0].constructor;  // All plots will be of this class

      this.forEachSplitPlotElementDo( function( iPlotArray, iRow, iCol) {
        var tAttrIndex = 0;
        for( var tPlotIndex = 0; tPlotIndex < tNumPlotsPerCell; tPlotIndex++) {
          var tRootPlot = tRootPlotArray[ tPlotIndex],
              tCurrentPlot = iPlotArray[tPlotIndex],
              tXAxis = this_.get('xAxisArray')[iCol],
              tYAxis = this_.get('yAxisArray')[iRow],
              tNewPlot;
          if( !tCurrentPlot || tCurrentPlot.constructor !== tPlotClass) {
            var tProperties = $.extend(this_.getModelPointStyleAccessors(),
                tRootPlot.getPropsForCopy(),
                {
                  splitPlotRowIndex: iRow,
                  splitPlotColIndex: iCol,
                  xAxis: tXAxis,
                  yAxis: tYAxis,
                  y2Axis: this_.get('y2AxisArray')[0],
                  yAttributeIndex: tRootPlot.get('verticalAxisIsY2') ? 0 : tAttrIndex++
                });
            tNewPlot = tPlotClass.create(tProperties);
            tXAxis.setLinkToPlotIfDesired( tNewPlot);
            tYAxis.setLinkToPlotIfDesired( tNewPlot);
            tNewPlot.installAdornmentModelsFrom(tRootPlot);
            if( tPlotIndex === 0) {
              tRootPlot.addSibling(tNewPlot);
              tNewPlot.set('enableMeasuresForSelection', this_.get('enableMeasuresForSelection'));
            }
            iPlotArray[tPlotIndex] = tNewPlot;
            if (tCurrentPlot) {
              this_.removePlotObserver(tCurrentPlot);
            }
          }
          else {
            tCurrentPlot.set('splitPlotRowIndex', iRow);
            tCurrentPlot.set('splitPlotColIndex', iCol);
            if( !tCurrentPlot.get('verticalAxisIsY2')) {
              tCurrentPlot.set('yAttributeIndex', tAttrIndex++);
            }
            tCurrentPlot.invalidateCaches();
            tCurrentPlot.updateAdornmentModels();
          }
        }
      });
      this.propagateShowMeasuresLabels();
      this.rescaleAxesFromData( true, false);
    },

    /**
     * Called when an x or y attribute has changed type so that we can update the splitting from scratch
     * once the new attribute is installed.
     */
    removeAllSplitPlotsAndAxes: function() {

      function wipeOutAxisArray( iAxisArray) {
        iAxisArray.forEach( function( iAxis, iIndex) {
          if( iIndex !== 0)
            iAxis.destroy();
        });
        iAxisArray.length = 1;
      }

      var this_ = this,
          tSplitPlotArray = this.get('splitPlotArray'),
          tRootPlot = tSplitPlotArray[0][0][0];
      this.forEachSplitPlotElementDo( function( iPlotArray, iRow, iColumn) {
        if( iRow !== 0 || iColumn !== 0) {
          iPlotArray.forEach(function (iPlot) {
            this_.removePlotObserver(iPlot);
            iPlot.destroy();
          });
        }
      });
      tSplitPlotArray.length = 1;
      tSplitPlotArray[0].length = 1;
      tRootPlot.set('siblingPlots', []);

      wipeOutAxisArray( this.get('xAxisArray'));
      wipeOutAxisArray( this.get('yAxisArray'));
      wipeOutAxisArray( this.get('y2AxisArray'));

      this.notifyPropertyChange('removedAllSplitPlotsAndAxes');
    },

    forEachRowDo: function( iFunc) {
      var tRowAttrDescription = this.getPath('dataConfiguration.rightAttributeDescription'),
          tRowLength = tRowAttrDescription.getPath('attributeStats.numberOfCells') || 1,
          tRowIndex;
      for( tRowIndex = 0; tRowIndex < tRowLength; tRowIndex++) {
        iFunc( tRowIndex);
      }
    },

    forEachColumnDo: function( iFunc) {
      var tColAttrDescription = this.getPath('dataConfiguration.topAttributeDescription'),
          tColLength = tColAttrDescription.getPath('attributeStats.numberOfCells') || 1,
          tColIndex;
      for( tColIndex = 0; tColIndex < tColLength; tColIndex++) {
        iFunc( tColIndex);
      }
    },

    /**
     * Cause the given functor to operate on each of the split plot elements using
     * the template iFunc(<[DG.PlotModel]>, iRow, iColumn)
     * @param iFunc {Function}
     */
    forEachSplitPlotElementDo: function( iFunc) {
      var tSplitPlotArray = this.get('splitPlotArray'),
          tRowAttrDescription = this.getPath('dataConfiguration.rightAttributeDescription'),
          tRowLength = tRowAttrDescription.getPath('attributeStats.numberOfCells') || 1,
          tColAttrDescription = this.getPath('dataConfiguration.topAttributeDescription'),
          tColLength = tColAttrDescription.getPath('attributeStats.numberOfCells') || 1,
          tRowIndex, tColIndex;
      for( tRowIndex = 0; tRowIndex < tRowLength; tRowIndex++) {
        if( !tSplitPlotArray[ tRowIndex]) {
          tSplitPlotArray[ tRowIndex] = [];
        }
        for( tColIndex = 0; tColIndex < tColLength; tColIndex++) {
          if( !tSplitPlotArray[tRowIndex][tColIndex]) {
            tSplitPlotArray[tRowIndex][tColIndex] = [];
          }
          iFunc( tSplitPlotArray[tRowIndex][tColIndex], tRowIndex, tColIndex);
        }
      }

    },

    /**
     * Return an array of all the selected cases over all split plots
     * @return number[]
     */
    selection: function() {
      var tResult = [];
      this.forEachSplitPlotElementDo( function( iPlot) {
        var tSelection = iPlot[0].get('selection');
        if( Array.isArray(tSelection))
          tResult = tResult.concat( tSelection);
      });
      return tResult;
    }.property(),

    /**
     * Use the properties of the given object to restore my plot, axes, and legend.
     * @param iStorage {Object}
     */
    restoreStorage: function( iStorage) {
      var this_ = this,
          tDataConfig = this.get('dataConfiguration'),
          tYAttrIndex = 0,
          tY2AttrIndex = 0,
          tStartsOutSplit = this.get('isSplit'),
          tEndsUpSplit;
      if( tStartsOutSplit)
        this.removeAllSplitPlotsAndAxes();

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
          ['xAxis', 'yAxis', 'y2Axis'].forEach( function( iAxisKey) {
            var tAxis = this.get(iAxisKey);
            tPlot.setIfChanged( iAxisKey, tAxis);
            tAxis.setLinkToPlotIfDesired( tPlot);
          }.bind( this));
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
      tDataConfig.set('displayOnlySelected', iStorage.displayOnlySelected);

      ['isTransparent', 'plotBackgroundColor', 'plotBackgroundOpacity', 'plotBackgroundImage',
      'plotBackgroundImageLockInfo', 'enableMeasuresForSelection'].forEach( function( iKey) {
        if( !SC.none( iStorage[iKey]))
          this_.set(iKey, iStorage[iKey]);
      });
      // Special case
      if( iStorage.enableNumberToggle && !SC.none( iStorage.numberToggleLastMode))
        this.setPath('numberToggle.lastMode', iStorage.numberToggleLastMode);

      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      ['x', 'y', 'y2', 'legend', 'top', 'right'].forEach( function( iKey) {
        var tAttrRef = this.instantiateAttributeRefFromStorage(iStorage, iKey + 'Coll', iKey + 'Attr');
        tDataConfig.setAttributeAndCollectionClient(iKey + 'AttributeDescription', tAttrRef,
            iStorage[iKey + 'Role'], iStorage[iKey + 'AttributeType']);
      }.bind( this));

      ['x', 'y', 'y2', 'top', 'right'].forEach( function( iKey) {
        var tAxisClassName = iStorage[iKey + 'AxisClass'],
            tAxisClass = tAxisClassName && DG[tAxisClassName.substring(3)], // convert string to axis class
            tPrevAxis = this.get( iKey + 'Axis'),
            tCurrentAxisClass = tPrevAxis.constructor;
        if( tAxisClass && tAxisClass !== tCurrentAxisClass) {
          var tNewAxis = tAxisClass.create({ dataConfiguration: tDataConfig});
          tNewAxis.set('attributeDescription', tDataConfig.get(iKey + 'AttributeDescription'));
          this.passGetPointColorToAxis( iKey, tNewAxis);
          this.set(iKey + 'Axis', tNewAxis);
          tPrevAxis.destroy();
        }
      }.bind( this));

      instantiateArrayOfPlots( (iStorage.plotClass ? [ {plotClass: iStorage.plotClass }] : null) ||
                                  iStorage.plotModels ||
                                  []);
      this._isBeingRestored = false;

      this.set('aboutToChangeConfiguration', false ); // We're done. View layer can adapt

      tEndsUpSplit = this.get('isSplit');
      if( tEndsUpSplit) {
        this.updateAxisArrays();
        this.updateSplitPlotArray();
      }
      if( tStartsOutSplit || tEndsUpSplit)
        this.notifyPropertyChange('splitPlotChange');

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
          this.get('dataConfiguration').updateCaptionAttribute();
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
          if( this.getPath('dataConfiguration.displayOnlySelected')) {
            this.dataDidChange(null, null, iChange);
          }
          if( this.get('enableMeasuresForSelection')) {
            this.get('allPlots').forEach( function( iPlot) {
              iPlot.updateAdornmentModels();
            });
          }
          break;
      }

      // Forward the notification to the plots, so they can respond as well.
      this.get('allPlots').forEach(function (iPlot) {
        iPlot.handleDataContextNotification(iNotifier, iChange);
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

      var aCaseLiesOutsideBounds = function (iCollectionClient, iCaseIDs) {
        // ensure we have a collectionClient and not a Collection
        iCollectionClient = this.get('dataContext').getCollectionByID(iCollectionClient.get('id'));
        return iCaseIDs.some(function (iCaseID) {
          var tCase = iCollectionClient.getCaseByID( iCaseID);
          if (!tCase) { return false; }
          return ['x', 'y', 'y2'].some(function (iDim) {
            var tFound = false,
                tAxis = this.get(iDim + 'Axis');
            if (tAxis && tAxis.get('isNumeric')) {
              var tLower = tAxis.get('lowerBound'),
                  tUpper = tAxis.get('upperBound');
              tFound = this.getPath('dataConfiguration.' + iDim + 'AttributeDescription.attributes').some(function (iAttr) {
                var tValue = tCase.getNumValue(iAttr.get('id'));
                return isFinite(tValue) && (tValue < tLower || tValue > tUpper);
              });
            }
            return tFound;
          }.bind(this));
        }.bind(this));
      }.bind(this);

      var tPlot = this.get('plot');
      if( tPlot && tPlot.isAffectedByChange( iChange)) {
        this.invalidate( iChange);  // So that when we ask for cases we get the right ones
        var dataConfig = this.get('dataConfiguration'),
            tAllCases = dataConfig && dataConfig.get('cases'),
            tNewCaseIDs = iChange.result.caseIDs,
            tDataLength = tAllCases ? tAllCases.length() : 0,
            tCollections = iChange.collection?[iChange.collection]:iChange.collections?iChange.collections:[];
        if( tDataLength !== this._oldNumberOfCases ) {
          var isAddingCases = (tDataLength > this._oldNumberOfCases);
          if( tPlot && isAddingCases) {
            var newCase = tAllCases.at( tDataLength-1);
            if( this.isParentCase( newCase))
              tPlot.set('openParentCaseID', newCase.get('id'));
            if( tNewCaseIDs && tCollections.some(function (collection) {
                return aCaseLiesOutsideBounds(collection, tNewCaseIDs);
              })) {
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
