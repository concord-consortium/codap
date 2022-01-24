// ==========================================================================
//                            DG.PlotModel
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

sc_require('alpha/destroyable');
/* global Set:true */

/** @class  DG.PlotModel - The model for a graph's plot.

 @extends SC.Object
 */
DG.PlotModel = SC.Object.extend(DG.Destroyable,
    /** @scope DG.PlotModel.prototype */
    {
      /**
       Assigned by the graph model that owns me.
       @property { DG.GraphDataConfiguration }
       */
      dataConfiguration: null,

      /**
       * @property {Number}
       */
      splitPlotRowIndex: 0,

      /**
       * @property {Number}
       */
      splitPlotColIndex: 0,

      /**
       * The zeroth plot in a graph that has been split has siblings. When things change
       * that should be reflected in these siblings, the zeroth plot explicitly tells sibs
       * to make the change.
       * @property {[{DG.PlotModel}]}
       */
      siblingPlots: null,

      /**
       @property { DG.DataContext }  The data context
       */
      dataContext: function () {
        return this.getPath('dataConfiguration.dataContext');
      }.property(),

      dataContextDidChange: function () {
        this.notifyPropertyChange('dataContext');
      }.observes('*dataConfiguration.dataContext'),

      /**
       Note: There is an ambiguity about which is the collection client when
       the plot has attributes from different collections.
       @property { DG.CollectionClient }  The collection client
       */
      collectionClient: function () {
        return this.getPath('dataConfiguration.collectionClient');
      }.property(),

      collectionClientDidChange: function () {
        this.notifyPropertyChange('collectionClient');
      }.observes('*dataConfiguration.collectionClient'),

      /**
       * Only used if we are one plot in an array of split plots.
       @property { [{DG.Case}] }
       */
      _casesCache: null,

      /**
       @property { [{DG.Case}] }
       */
      cases: function () {
        var tCases;
        if( this.getPath('dataConfiguration.hasSplitAttribute')) {
          if( !this._casesCache) {
            var tRowAttrDescription = this.getPath('dataConfiguration.rightAttributeDescription'),
                tColAttrDescription = this.getPath('dataConfiguration.topAttributeDescription'),
                tRowAttrID = tRowAttrDescription.getPath('attribute.id'),
                tColAttrID = tColAttrDescription.getPath('attribute.id'),
                tRowValue = (tRowAttrID === DG.Attribute.kNullAttribute) ? null :
                  tRowAttrDescription.getPath('attributeStats.cellNames')[ this.get('splitPlotRowIndex')],
                tColValue = (tColAttrID === DG.Attribute.kNullAttribute) ? null :
                  tColAttrDescription.getPath('attributeStats.cellNames')[ this.get('splitPlotColIndex')];
            this._casesCache = this.getPath('dataConfiguration.cases').filter( function( iCase) {
              var tRowCaseValue = iCase.getValue( tRowAttrID),
                  tColCaseValue = iCase.getValue( tColAttrID);
              if( ['boolean', 'number'].includes(typeof tRowCaseValue))
                tRowCaseValue = String(tRowCaseValue);
              if( ['boolean', 'number'].includes(typeof tColCaseValue))
                tColCaseValue = String(tColCaseValue);
              return (tRowValue === null || tRowCaseValue === tRowValue) &&
                  (tColValue === null || tColCaseValue === tColValue);
            });
          }
          tCases = this._casesCache;
        }
        else {
          tCases = this.getPath('dataConfiguration.cases');
          this._casesCache = null;
        }
        return tCases;
      }.property(),

      casesDidChange: function () {
        this.notifyPropertyChange('cases');
      }.observes('*dataConfiguration.collectionClient', '*dataConfiguration.cases'),

      /**
       The plot model needs access to the cases controller that is stored in my dataConfiguration's
       collection client.
       @property { SC.ArrayController }
       */
      casesController: function () {
        return this.getPath('dataConfiguration.collectionClient.casesController');
      }.property(),

      casesControllerDidChange: function () {
        this.notifyPropertyChange('casesController');
      }.observes('*dataConfiguration.collectionClient.casesController'),

      /**
       @property { SC.SelectionSet }
       */
      selection: function () {
        var tSelection = this.getPath('dataConfiguration.selection'),
            tCases = this.get('cases').toArray();
        tSelection = tSelection.filter(function (iCase) {
          return tCases.indexOf(iCase) >= 0;
        });
        return tSelection;
      }.property(),

      selectionDidChange: function () {
        this.notifyPropertyChange('selection');
      }.observes('*dataConfiguration.selection'),

      /**
       @property { Number }
       */
      xVarID: function () {
        return this.getPath('dataConfiguration.xAttributeID');
      }.property(),

      xVarIDDidChange: function () {
        this.notifyPropertyChange('xVarID');
      }.observes('*dataConfiguration.xAttributeID'),

      /**
       * A scatterplot may index into an array of attributes held by the y-attribute-description
       */
      yAttributeIndex: 0,

      /**
       @property { Number }
       */
      yVarID: function () {
        var tConfig = this.get('dataConfiguration');
        return tConfig ? tConfig.yAttributeIDAt(this.yAttributeIndex) : null;
      }.property(),

      yVarIDDidChange: function () {
        this.notifyPropertyChange('yVarID');
      }.observes('*dataConfiguration.yAttributeID'),

      /**
       @property { Number }
       */
      y2VarID: function () {
        var tConfig = this.get('dataConfiguration');
        return tConfig ? tConfig.y2AttributeIDAt(this.yAttributeIndex) : null;
      }.property(),

      y2VarIDDidChange: function () {
        this.notifyPropertyChange('y2VarID');
      }.observes('*dataConfiguration.y2AttributeID'),

      /**
       @property { Number }
       */
      legendVarID: function () {
        return this.getPath('dataConfiguration.legendAttributeID');
      }.property(),

      legendVarIDDidChange: function () {
        this.notifyPropertyChange('legendVarID');
      }.observes('*dataConfiguration.legendAttributeID'),

      /**
       @property {Number}  The variable ID of the attribute assigned to the numeric axis
       */
      primaryVarID: function () {
        switch (this.get('primaryAxisPlace')) {
          case DG.GraphTypes.EPlace.eX:
            return this.get('xVarID');
          case DG.GraphTypes.EPlace.eY:
            return this.get('yVarID');
          default:
            return null;
        }
      }.property('xVarID', 'yVarID'),

      /**
       @property {Number}  The variable ID of the attribute assigned to the numeric axis
       */
      secondaryVarID: function () {
        switch (this.get('secondaryAxisPlace')) {
          case DG.GraphTypes.EPlace.eX:
            return this.get('xVarID');
          case DG.GraphTypes.EPlace.eY:
            return this.get('yVarID');
          default:
            return null;
        }
      }.property('xVarID', 'yVarID'),

      /**
       @property { DG.AxisModel }
       */
      xAxis: null,

      /**
       @property { DG.AxisModel }
       */
      yAxis: null,

      /**
       * True if this plot is using the 2nd vertical axis.
       @property { DG.Boolean }
       */
      verticalAxisIsY2: false,

      autoDestroyProperties: ['plotAnimator', 'caseValueAnimator'],

      /**
       @property { DG.GraphAnimator }
       */
      plotAnimator: null,

      /**
       @property { DG.CaseValueAnimator }
       */
      caseValueAnimator: null,

      /**
       * This function is set by the graph that owns me.
       * @property{Function}
       */
      getPointColor: null,

      /**
       * This function is set by the graph that owns me.
       * @property{Function}
       */
      getStrokeColor: null,

      strokeColor: function () {
        return this.getStrokeColor();
      }.property(),

      /**
       * This function is set by the graph that owns me.
       * @property{Function}
       */
      getStrokeTransparency: null,

      strokeTransparency: function () {
        return this.getStrokeTransparency();
      }.property(),

      /**
       * This function is set by the graph that owns me.
       * @property{Function}
       */
      getStrokeSameAsFill: null,

      strokeSameAsFill: function () {
        return this.getStrokeSameAsFill();
      }.property(),

      /**
       * This function is set by the graph that owns me.
       * @property{Function}
       */
      getPointSizeMultiplier: null,

      /**
       * This function is set by the graph that owns me.
       * @property{Function}
       */
      getTransparency: null,

      /**
       * Some plots can. Override as desired
       * @property {Boolean}
       */
      canSupportConfigurations: function () {
        return false;
      }.property(),

      /**
       Key-value pairs for adornment models,
       e.g. _adornmentModels['plottedValue'] = plottedValueModel.
       @property   {Object}
       */
      _adornmentModels: null,

      /**
       * @property {[DG.PlotAdornmentModel]}
       */
      adornmentModelsAsArray: function() {
        var tResult = [];
        DG.ObjectMap.forEach(this._adornmentModels, function( iKey, iAdornmentModel) {
          tResult.push( iAdornmentModel);
        });
        return tResult;
      }.property(),

      /**
       @property { DG.PlottedCountModel }
       */
      _plottedCountModel: null,
      plottedCount: function (key, value) {
        // if we are called with a new value, or have no Plotted Count Model
        if (value || !this._plottedCountModel) {
          if (value) {
            this._plottedCountModel = value;
          } else {
            this._plottedCountModel = DG.PlottedCountModel.create({plotModel: this});
          }
          this.setAdornmentModel('plottedCount', this._plottedCountModel); // Add to list of adornments
          this._plottedCountModel.setComputingNeeded(); // initialize
        }
        return this._plottedCountModel;
      }.property(),

      /**
       * May be overridden, e.g. by DotPlotModel
       * @property {Boolean}
       */
      wantsPercentCheckbox: false,

      /**
       * Generally false. But some plots, like a bar chart, will require an 'other' axis; e.g. for count.
       * @property {Boolean}
       */
      wantsOtherAxis: false,

      /**
       * Set by GraphModel. Passed down to relevant adornments.
       * @property {Boolean}
       */
      enableMeasuresForSelection: false,

      enableMeasuresForSelectionDidChange: function(){
        var tEnable = this.get('enableMeasuresForSelection');
        this.get('adornmentModelsAsArray').forEach( function( iAdornmentModel) {
          iAdornmentModel.set('enableMeasuresForSelection', tEnable);
        });
      }.observes('enableMeasuresForSelection'),

      /**
       @return { Boolean }
       */
      shouldPlottedCountBeChecked: function (iWhat) {
        return this.getPath('plottedCount.isShowing' + iWhat);
      },

      /**
       * If we need to make a plotted Value, do so. In any event toggle its visibility.
       * This method gets used by both DotPlotModel and ScatterPlotModel.
       */
      togglePlotValue: function () {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            iPlot.toggleAdornmentVisibility('plottedValue', 'togglePlotValue');
          }

          this_.get('siblingPlots').forEach( doToggle);
          doToggle( this_);
        }

        function connectFunctions() {
          var tSiblingPlots = this_.get('siblingPlots'),
              tMasterPlottedValue = this_.getAdornmentModel('plottedValue');
          tMasterPlottedValue.set('siblingPlottedFunctions',
              tSiblingPlots.map( function( iPlot) {
                return iPlot.getAdornmentModel( 'plottedValue');
              }));
        }

        var willShow = !this.isAdornmentVisible('plottedValue');
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.togglePlotValue",
          undoString: (willShow ? 'DG.Undo.graph.showPlotValue' : 'DG.Undo.graph.hidePlotValue'),
          redoString: (willShow ? 'DG.Redo.graph.showPlotValue' : 'DG.Redo.graph.hidePlotValue'),
          log: "togglePlotValue: %@".fmt(willShow ? "show" : "hide"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle plotted value',
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
            connectFunctions();
          },
          undo: function () {
            toggle();
            this_.getAdornmentModel('plottedValue').set('siblingPlottedFunctions', null);
          }
        }));
      },

      /**
       If we need to make a count model, do so. In any event toggle its visibility.
       */
      togglePlottedCount: function (iWhat) {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            var tCurrentValue = iPlot.getPath('plottedCount.isShowing' + iWhat);
            iPlot.setPath('plottedCount.isShowing' + iWhat, !tCurrentValue);
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        var tInitialValue = this_.getPath('plottedCount.isShowing' + iWhat),
            tUndo = tInitialValue ? ('DG.Undo.graph.hide' + iWhat) : ('DG.Undo.graph.show' + iWhat),
            tRedo = tInitialValue ? ('DG.Redo.graph.hide' + iWhat) : ('DG.Redo.graph.show' + iWhat);
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleCount",
          undoString: tUndo,
          redoString: tRedo,
          log: ("togglePlotted" + iWhat + ": %@").fmt(tInitialValue ? "hide" : "show"),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'toggle plotted ' + iWhat,
              type: 'DG.GraphView'
            }
          },
          execute: function () {
            toggle();
          }.bind(this),
          undo: function () {
            toggle();
          }.bind(this)
        }));
      },

      /**
       Initialization method
       */
      init: function () {
        sc_super();

        this._adornmentModels = {};
        this.siblingPlots = [];

        this.addObserver('dataConfiguration', this, 'dataConfigurationDidChange');
        this.addObserver('xAxis', this, 'xAxisDidChange');
        this.addObserver('yAxis', this, 'yAxisDidChange');

        this.addObserver('dataConfiguration.xAttributeDescription.attribute.categoryMap',
            this, 'colorMapDidChange');
        this.addObserver('dataConfiguration.yAttributeDescription.attribute.categoryMap',
            this, 'colorMapDidChange');
        this.addObserver('dataConfiguration.legendAttributeDescription.attribute.categoryMap',
            this, 'colorMapDidChange');
      },

      /**
       Destruction method
       */
      destroy: function () {
        // Detach the axes
        this.removeObserver('xAxis', this, 'xAxisDidChange');
        this.removeObserver('yAxis', this, 'yAxisDidChange');
        this.removeObserver('dataConfiguration.xAttributeDescription.attribute.categoryMap',
            this, 'colorMapDidChange');
        this.removeObserver('dataConfiguration.yAttributeDescription.attribute.categoryMap',
            this, 'colorMapDidChange');
        this.removeObserver('dataConfiguration.legendAttributeDescription.attribute.categoryMap',
            this, 'colorMapDidChange');
        // Detach the data Configuration
        this.removeObserver('dataConfiguration', this, 'dataConfigurationDidChange');

        // Destroy the adornment models
        DG.ObjectMap.forEach(this._adornmentModels,
            function (iKey, iModel) {
              if (iModel && iModel.destroy)
                iModel.destroy();
            });
        this._adornmentModels = null;
        this.siblingPlots = null;

        sc_super();

        this.set('xAxis', null);
        this.set('yAxis', null);
        this.set('dataConfiguration', null);
      },

      _observedXAxis: null,
      _observedYAxis: null,

      /**
       Observer function triggered when the 'xAxis' property changes.
       */
      xAxisDidChange: function () {
        if (this._observedXAxis) {
          this._observedXAxis.removeObserver('lowerBound', this, 'axisBoundsDidChange');
          this._observedXAxis.removeObserver('upperBound', this, 'axisBoundsDidChange');
          this._observedXAxis = null;
        }

        var xAxis = this.get('xAxis');
        if (xAxis) {
          xAxis.addObserver('lowerBound', this, 'axisBoundsDidChange');
          xAxis.addObserver('upperBound', this, 'axisBoundsDidChange');
          this._observedXAxis = xAxis;
        }
      },

      /**
       Observer function triggered when the 'yAxis' property changes.
       */
      yAxisDidChange: function () {
        if (this._observedYAxis) {
          this._observedYAxis.removeObserver('lowerBound', this, 'axisBoundsDidChange');
          this._observedYAxis.removeObserver('upperBound', this, 'axisBoundsDidChange');
          this._observedYAxis = null;
        }

        var yAxis = this.get('yAxis');
        if (yAxis) {
          yAxis.addObserver('lowerBound', this, 'axisBoundsDidChange');
          yAxis.addObserver('upperBound', this, 'axisBoundsDidChange');
          this._observedYAxis = yAxis;
        }
      },

      addSibling: function( iPlotModel) {
        this.get('siblingPlots').push( iPlotModel);
      },

      /**
       @property { SC.Array } of SC.Array
       */
      dataArrays: function () {
        return this.getPath('dataConfiguration.arrangedObjectArrays');
      }.property('dataConfiguration'/*,'dataConfiguration.arrangedObjectArrays'*/),
      // Inexplicably, dependent key seems not to work here.
      // We use explicit observers instead.

      /**
       A view will typically observe this property. When it switches to true, the view should
       animate its elements to the currently computable coordinates, and, until the property
       switches back, it should suspend subsequent computation of coordinates for plotted
       elements.
       @property {Boolean}
       */
      isAnimating: false,

      /**
       Return the specified adornment model.
       @param    {String}    iAdornmentKey -- The key for the adornment, e.g. 'plottedValue'
       @returns  {DG.AdornmentModel} Returns the specified adornment model (or undefined).
       */
      getAdornmentModel: function (iAdornmentKey) {
        return iAdornmentKey && this._adornmentModels && this._adornmentModels[iAdornmentKey];
      },

      /**
       Sets the specified adornment model.
       @param    {String}            iAdornmentKey -- The key for the adornment, e.g. 'plottedValue'
       @param    {DG.AdornmentModel} iAdornmentModel -- the specified adornment model
       */
      setAdornmentModel: function (iAdornmentKey, iAdornmentModel) {
        if( !this._adornmentModels)
          this._adornmentModels = {};
        DG.assert(iAdornmentKey);
        this._adornmentModels[iAdornmentKey] = iAdornmentModel;
        this.notifyPropertyChange(iAdornmentKey);
      },

      /**
       Return whether the specified adornment is currently visible.
       @param    {String}    iAdornmentKey -- The key for the adornment, e.g. 'plottedValue'
       @returns  {Boolean}   True if the adornment is visible, false otherwise
       */
      isAdornmentVisible: function (iAdornmentKey) {
        var model = this.getAdornmentModel(iAdornmentKey);
        return model ? model.get('isVisible') : false;
      },

      /**
       Hides/shows the specified adornment.
       Constructs the adornment model if it doesn't already exist
       If the visibility changes, calls notifyPropertyChange( iAdornmentKey).
       @param    {String}    iAdornmentKey -- e.g. 'plottedValue', 'plottedFunction'
       @param    {Boolean}   iVisibility -- true to show, false to hide
       @return   {DG.PlotAdornmentModel}
       */
      setAdornmentVisibility: function (iAdornmentKey, iVisibility) {
        var model = this.getAdornmentModel(iAdornmentKey);
        if (!model) {
          var modelClass = DG.PlotAdornmentModel.registry[iAdornmentKey];
          DG.assert(modelClass, "No model class registered for '%@'".fmt(iAdornmentKey));
          model = modelClass && modelClass.create({
            plotModel: this,
            adornmentKey: iAdornmentKey,
            enableMeasuresForSelection: this.get('enableMeasuresForSelection')
          });
          if (model)
            this.setAdornmentModel(iAdornmentKey, model);
        }
        if (model && (this.isAdornmentVisible(iAdornmentKey) !== iVisibility)) {
          model.set('isVisible', iVisibility);
          this.notifyPropertyChange(iAdornmentKey);
        }
        return model;
      },

      /**
       Toggle the visibility of the specified adornment.
       Will create the adornment the first time it's shown.
       @param    {String}    iAdornmentKey -- e.g. 'plottedValue', 'plottedFunction'
       @param    {String}    iToggleLogString -- Name of action logged to server
       @returns  {DG.PlotAdornmentModel}   The specified adornment model
       */
      toggleAdornmentVisibility: function (iAdornmentKey, iToggleLogString) {
        DG.assert(!SC.empty(iAdornmentKey));
        var adornmentModel = this.getAdornmentModel(iAdornmentKey),
            tIsVisible = adornmentModel && adornmentModel.get('isVisible');
        return this.setAdornmentVisibility(iAdornmentKey, !tIsVisible);
      },

      /**
       @property {DG.AxisModel}
       */
      getAxisForPlace: function (iPlace) {
        switch (iPlace) {
          case DG.GraphTypes.EPlace.eX:
            return this.get('xAxis');
          case DG.GraphTypes.EPlace.eY:
            return this.get('yAxis');
          case DG.GraphTypes.EPlace.eY2:
            return this.get('y2Axis');
          default:
            return null;
        }
      },

      /**
       *
       * @param iPlace {DG.GraphTypes.EPlace}
       * @return { class }
       */
      getDesiredAxisClassFor: function( iPlace) {
        return DG.AxisModel;
      },

      /**
       * @param iKey {String} If present, the property that changed to bring about this call
       Subclasses may override
       Called when attribute configuration changes occur, for instance.
       */
      invalidateCaches: function ( iKey) {
        this._casesCache = null;
        this.invalidateAggregateAdornments();
        this.notifyPropertyChange('plotConfiguration');
      },

      /**
       Subclasses may override
       @param { DG.GraphTypes.EPlace }
       @return{ {min:{Number}, max:{Number} isDataInteger:{Boolean}} }
       */
      getDataMinAndMaxForDimension: function (iPlace) {
        var tDataConfiguration = this.get('dataConfiguration');
        return tDataConfiguration && tDataConfiguration.getDataMinAndMaxForDimension(iPlace);
      },

      updateAdornmentModels: function() {
        var tPrimaryAxisModel = this.get('primaryAxisModel');
        this.get('adornmentModelsAsArray').forEach( function( iAdornmentModel) {
            iAdornmentModel.setComputingNeeded();
            iAdornmentModel.recomputeValueIfNeeded( tPrimaryAxisModel);
        });
      },

      /**
       Subclasses may override
       */
      handleDataConfigurationChange: function () {
      },

      /**
       Subclasses may override
       */
      rescaleAxesFromData: function (iAllowScaleShrinkage, iAnimatePoints, iLogIt) {
      },

      invalidateAggregateAdornments: function () {
        // TODO: use more robust ID
        var id = DG.Debug.scObjectID(this),
            depMgr = this.getPath('dataConfiguration.dataContext.dependencyMgr');
        if (depMgr)
          depMgr.invalidateDependentsOf([{type: DG.DEP_TYPE_PLOT, id: id, name: 'plot-' + id}]);
      },

      /**
       Observer function triggered when the visible bounds of the axes are changed.
       */
      axisBoundsDidChange: function () {
        this.notifyPropertyChange('axisBounds');
      },

      /**
       * For selected cases, the values given by the array of attribute IDs will be animated by the amounts
       * specified in the array of deltas.
       * @param iAttrIDs {[Number]}
       * @param iDeltas {[Number]}
       * @param iSelectedCases? {{}[]}
       */
      animateSelectionBackToStart: function (iAttrIDs, iDeltas, iSelectedCases) {
        if(iDeltas.every(function(iDelta) { return iDelta === 0;}))
          return;
        if (SC.none(this.caseValueAnimator))
          this.caseValueAnimator = DG.CaseValueAnimator.create();
        else  // We must end the animation before setting animator properties
          this.caseValueAnimator.endAnimation();

        this.caseValueAnimator.set('dataContext', this.get('dataContext'));
        this.caseValueAnimator.set('cases', iSelectedCases || DG.copy(this.get('selection')));
        this.caseValueAnimator.set('attributeIDs', iAttrIDs);
        this.caseValueAnimator.set('deltas', iDeltas);

        this.caseValueAnimator.animate();
      },

      checkboxDescriptions: function () {
        var this_ = this,
            tXHasCells = this.get('xAxis').numberOfCells() > 1,
            tYHasCells = this.get('yAxis').numberOfCells() > 1,
            tPlotWantsPercents = this.get('wantsPercentCheckbox'),
            tDescriptions = [
              {
                title: 'DG.Inspector.graphCount',
                value: this_.shouldPlottedCountBeChecked('Count'),
                classNames: 'dg-graph-count-check'.w(),
                valueDidChange: function () {
                  this_.togglePlottedCount('Count');
                }.observes('value')
              }
            ];
        if (tPlotWantsPercents || tXHasCells || tYHasCells) {
          tDescriptions.push({
            title: 'DG.Inspector.graphPercent',
            value: this_.shouldPlottedCountBeChecked('Percent'),
            classNames: 'dg-graph-percent-check'.w(),
            handlingMovableValueChange: false,
            valueDidChange: function () {
              if (!this.handlingMovableValueChange)
                this_.togglePlottedCount('Percent');
            }.observes('value'),
            init: function () {
              sc_super();
              this_.addObserver('movableValueChange', this, 'handleMovableValueChange');
            },
            destroy: function () {
              this_.removeObserver('movableValueChange', this, 'handleMovableValueChange');
              sc_super();
            },
            handleMovableValueChange: function () {
              this.handlingMovableValueChange = true;
              this.set('value', this_.shouldPlottedCountBeChecked('Percent'));
              this.set('isEnabled', this_.get('wantsPercentCheckbox'));
              this.handlingMovableValueChange = false;
            }
          });
        }
        return tDescriptions;
      }.property(),

      configurationDescriptions: function () {
        return [];
      }.property(),

      lastValueControls: function () {
        return [];
      }.property(),

      lastConfigurationControls: function () {
        return [];
      }.property(),

      /**
       Call the given function once for each case that has a value for each axis.
       Given function should have the signature (iCase, iCaseIndex)
       */
      forEachCaseDo: function (iDoF) {
        var tCases = this.get('cases');
        if (!SC.none(tCases))
          tCases.forEach(iDoF);
      },

      /**
       Returns an array of collection IDs corresponding to the collections that
       are currently being plotted by the graph.
       @returns  {Array of {Number}}
       */
      getPlottedCollectionIDs: function () {
        return this.getPath('dataConfiguration.plottedCollectionIDs') || [];
      },

      getPlottedCollectionIDsIncludesIDs: function(iCollectionIDs) {
        var tPlottedCollectionIDs = this.getPlottedCollectionIDs();
        return iCollectionIDs.some(function (iID) {
          return tPlottedCollectionIDs.indexOf(iID) >= 0;
        });
      },
      /**
       Returns an array of attribute IDs corresponding to the attributes that
       are currently being plotted by the graph.
       @returns  {Array of {Number}}
       */
      getPlottedAttributeIDs: function () {
        var plottedAttributeIDs = [],
            dataConfiguration = this.get('dataConfiguration'),
            attrDescriptions = dataConfiguration.get('attributesByPlace');
        if (!dataConfiguration) return plottedAttributeIDs;
        attrDescriptions.forEach(function (iDescArray) {
          iDescArray.forEach( function( iDesc) {
            iDesc.get('attributes').forEach( function( iAttr) {
              var tID = iAttr.get('id');
              if( !SC.none(tID) && tID !== DG.Analysis.kNullAttribute &&
                  plottedAttributeIDs.indexOf(tID) < 0)
                plottedAttributeIDs.push(tID);
            });
          });
        });
        return plottedAttributeIDs;
      },

      /**
       *
       * @param iAttributeIDs {(string|number)[]}
       * @return {boolean}
       */
      getPlottedAttributesIncludeIDs: function (iAttributeIDs) {
        var plottedAttrIDs = this.getPlottedAttributeIDs();
        return iAttributeIDs.some(function(iAttributeID) {
          return plottedAttrIDs.indexOf(Number(iAttributeID)) >= 0;
        });
      },

      /**
       Returns true if any of the plotted attributes contain formulas, false otherwise.
       @returns  {Boolean}
       */
      getPlottedAttributesContainFormulas: function () {
        var tDataConfiguration = this.get('dataConfiguration');
        return tDataConfiguration && tDataConfiguration.atLeastOneFormula();
      },

      /**
       * Called directly by GraphModel so that anything that needs to be done special for
       * a change in x or y attribute, as opposed to legend, can be done. See BinnedPlotModel.
       * @parameter {String}  Either 'xAxis' or 'yAxis'
       */
      xOrYAttributeDidChange: function( iAxisKey) {
        // subclasses may override
      },

      /**
       Returns true if the plot is affected by the specified change such that
       a redraw is required, false otherwise. Used to avoid redrawing when
       attribute values that aren't being plotted are changed, for instance.
       @param    {Object}    iChange -- The change request to/from the DataContext
       @returns  {Boolean}   True if the plot must redraw, false if it is unaffected
       */
      isAffectedByChange: function (iChange) {
        var isAffected = false;
        if (!iChange || !iChange.operation) return false;
        switch (iChange.operation) {
          case 'dependentCases':
            var i, change, changeCount = (iChange.changes && iChange.changes.length) || 0;
            for (i = 0; i < changeCount; ++i) {
              change = iChange.changes[i];
              if (change.attributeIDs && this.getPlottedAttributesIncludeIDs(change.attributeIDs))
                isAffected = true;
            }
            break;
          case 'updateCases':
            var changedAttrIDs = Array.isArray(iChange.attributeIDs) ?  iChange.attributeIDs : [];
            // only if the attributes involved are being plotted OR
            // if there are formulas such that the plotted attributes
            // are affected indirectly.
              // An updateCases from a plugin can be missing the an attributeIDs property. In that case
              // the changes are in a values array of objects each of which consists of attribute name as
              // key and the new value as value of that key. We look up the id of attributes.
              if( SC.none( iChange.attributeID) && Array.isArray(iChange.values) && iChange.collection) {
                var tCollection = iChange.collection.collection,
                    tAttrSet = new Set();
                iChange.values.forEach( function(iChangeObject) {
                  DG.ObjectMap.keys(iChangeObject).forEach(function( iKey) {
                    tAttrSet.add(iKey);
                  });
                });
                tAttrSet.forEach(function(iKey) {
                  changedAttrIDs.push(tCollection.getAttributeByName(iKey).get('id'));
                });
              }
            else if( !SC.none( iChange.attributeID))
              changedAttrIDs.push( iChange.attributeID);
            isAffected = this.getPlottedAttributesIncludeIDs(changedAttrIDs);
            break;
            /* jshint -W086 */  // Expected a 'break' statement before 'case'. (W086)
            // fall through intentional -- w/o attribute IDs, rely on collection
          case 'createCase':
          case 'createCases':
            // Only if the case(s) created are in a collection that is being plotted
            var changedCollectionID = iChange.collection && iChange.collection.get('id'),
                plottedCollectionIDs = this.getPlottedCollectionIDs();
            isAffected = !changedCollectionID || (plottedCollectionIDs.indexOf(changedCollectionID) >= 0);
            break;
          case 'deleteCases':
          case 'selectCases':
          case 'moveCases':
            // We could do a collection test if that information were reliably
            // available in the change request, but that's not currently so.
            isAffected = true;
            break;
          case 'createCollection':
            var tAttributes = iChange.attributes,
                tIDs = tAttributes && tAttributes.map( function( iAttribute) {
                  // sometimes the attributes object is a plain, not sproutcore, object
                  return iAttribute.get && iAttribute.get('id');
                });
            // if we did not see attributes with ids, we assume we are affected
              if(!SC.none( tIDs)) {
                if (tIDs.length > 0 && SC.none(tIDs[0])) {
                  isAffected = true;
                } else {
                  isAffected = this.getPlottedAttributesIncludeIDs(tIDs);
                }
              }
            break;
          case 'moveAttribute':
            var tFromID = iChange.fromCollection && iChange.fromCollection.get('id'),
                tToID = iChange.toCollection && iChange.toCollection.get('id');
            isAffected = this.getPlottedCollectionIDsIncludesIDs([tFromID, tToID]) &&
                            tFromID !== tToID;
            break;
        }
        return isAffected;
      },

      /**
       Responder for DataContext notifications. The PlotModel does not
       receive DataContext notifications directly, however. Instead, it
       receives them from the GraphModel, which receives them directly
       from the DataContext.
       */
      handleDataContextNotification: function (iNotifier, iChange) {
        this.invalidateCaches();
        // Currently, much of the handling is in the PlotViews.
        // Some of it would fit better in the model, but for now we
        // leave things the way they are and simply make the change
        // available for the PlotViews to respond to.
        this.set('lastChange', iChange);
      },

      _observedDataConfiguration: null,

      /**
       Responder method for dataConfiguration changes.
       */
      dataConfigurationDidChange: function (iSource, iKey) {
        if (this._observedDataConfiguration && (iKey === 'dataConfiguration')) {
          this._observedDataConfiguration.removeObserver('cases', this, 'dataConfigurationDidChange');
          this._observedDataConfiguration.removeObserver('attributeAssignment', this, 'dataConfigurationDidChange');
          this._observedDataConfiguration.removeObserver('arrangedObjectArrays', this, 'sourceArraysDidChange');
          this._observedDataConfiguration.removeObserver('hiddenCases', this, 'dataConfigurationDidChange');
          this._observedDataConfiguration.removeObserver('displayOnlySelected', this, 'dataConfigurationDidChange');
          this._observedDataConfiguration.removeObserver('hasSplitAttribute', this, 'dataConfigurationDidChange');
          this._observedDataConfiguration = null;
        }

        var dataConfiguration = this.get('dataConfiguration');
        if (dataConfiguration) {
          this.get('siblingPlots').concat([this]).forEach( function( iPlot) {
            iPlot.invalidateCaches(iKey);
            iPlot.handleDataConfigurationChange(iKey);
          });

          if (iKey === 'dataConfiguration') {
            dataConfiguration.addObserver('cases', this, 'dataConfigurationDidChange');
            dataConfiguration.addObserver('attributeAssignment', this, 'dataConfigurationDidChange');
            dataConfiguration.addObserver('arrangedObjectArrays', this, 'sourceArraysDidChange');
            dataConfiguration.addObserver('hiddenCases', this, 'dataConfigurationDidChange');
            dataConfiguration.addObserver('displayOnlySelected', this, 'dataConfigurationDidChange');
            dataConfiguration.addObserver('hasSplitAttribute', this, 'dataConfigurationDidChange');
            this._observedDataConfiguration = dataConfiguration;
            dataConfiguration.set('sortCasesByLegendCategories', true); // subclasses may override to false
          }
        }
      },

      /**
       Observer function triggered when the underlying arrays are changed.
       */
      sourceArraysDidChange: function (iSource, iKey) {
        this.invalidateCaches();
        this.notifyPropertyChange('dataArrays');
      },

      colorMapDidChange: function () {
        this.invalidateCaches();
        this.propertyDidChange('colorMap');
      },

      /**
       * Select the cases whose indices appear in the given array
       * @param iIDs {[Integer]}
       * @param iExtend {Boolean}
       */
      selectCasesWithIndices: function (iIndices, iExtend) {
        var tCases = this.get('cases'),
            tCasesToSelect = [];
        iIndices.forEach(function (iCaseIndex) {
          if (iCaseIndex < tCases.get('length')) {
            tCasesToSelect.push(tCases.unorderedAt(iCaseIndex));
          }
        });
        this.get('dataContext').applyChange({
          operation: 'selectCases',
          collection: this.get('collectionClient'),
          cases: tCasesToSelect,
          select: true,
          extend: iExtend
        });
      },

      /**
       @param {Number} The index of the case to be selected.
       @param {Boolean} Should the current selection be extended?
       */
      selectCaseByIndex: function (iIndex, iExtend) {
        var tCases = this.get('cases'),
            tCase = tCases.unorderedAt(iIndex),
            tSelection = this.get('selection'),
            tChange = {
              operation: 'selectCases',
              collection: this.get('collectionClient'),
              cases: [tCase],
              select: true,
              extend: iExtend
            };

        if (tSelection.get('length') !== 0) {
          if (tSelection.contains(tCase)) {  // Case is already selected
            if (iExtend) {
              tChange.select = false;
            }
            // clicking on a selected case leaves it selected
            else return;
          }
          else {
            tChange.select = true;
          }
        }

        this.get('dataContext').applyChange(tChange);
        if (tChange.select)
          DG.logUser("caseSelected: %@", iIndex);
        else
          DG.logUser("caseDeselected: %@", iIndex);
      },

      /**
       * If I have an animation, end it.
       */
      stopAnimation: function () {
        var tPlotAnimator = this.get('plotAnimator'),
            tCaseValueAnimator = this.get('caseValueAnimator');
        if (!SC.none(tPlotAnimator))
          tPlotAnimator.endAnimation();
        if (!SC.none(tCaseValueAnimator))
          tCaseValueAnimator.endAnimation();
      },

      /**
       * When making a copy of a plot (e.g. for use in split) the returned object
       * holds those properties that should be assigned to the copy.
       * @return {{}}
       */
      getPropsForCopy: function() {
        return {
          dataConfiguration: this.get('dataConfiguration'),
          verticalAxisIsY2: this.get('verticalAxisIsY2')
        };
      },

      /**
       * Create the model data to save with document.
       * Derived plot models will add to this storage.
       * @return {Object} the saved data.
       */
      createStorage: function () {
        var tStorage = {verticalAxisIsY2: this.get('verticalAxisIsY2')};

        // Store any adornment models
        if (DG.ObjectMap.length(this._adornmentModels) > 0) {
          tStorage.adornments = {};
          DG.ObjectMap.forEach(this._adornmentModels,
              function (iAdornmentKey, iAdornmentModel) {
                var adornmentStorage = iAdornmentModel.createStorage &&
                    iAdornmentModel.createStorage();
                if (DG.ObjectMap.length(adornmentStorage))
                  tStorage.adornments[iAdornmentKey] = adornmentStorage;
              });
        }
        return tStorage;
      },

      /**
       Utility function for simplified support of adornments in legacy documents.
       Used to move adornment storage objects down into the plot model's 'adornments'
       section, where it can be handled generically by PlotModel's restoreStorage().
       @param    {Object}    iModelStorage -- Storage object passed to plot's restoreStorage()
       @param    {String}    iAdornmentKey -- e.g. 'plottedValue', 'plottedFunction'
       @param    {Object}    iAdornmentStorage -- Storage object for adornment's restoreStorage()
       */
      moveAdornmentStorage: function (iModelStorage, iAdornmentKey, iAdornmentStorage) {
        if (iAdornmentStorage) {
          if (!iModelStorage.adornments) iModelStorage.adornments = {};
          iModelStorage.adornments[iAdornmentKey] = iAdornmentStorage;
        }
      },

      /**
       * Restore our model after opening document.
       * Derived plot models will also restore plot-specific parameters
       * @param iStorage
       */
      restoreStorage: function (iStorage) {
        // I have my axes, but until now I can't take care of changing my yAxis to the y2Axis
        this.verticalAxisIsY2 = iStorage.verticalAxisIsY2;
        if (this.verticalAxisIsY2) {
          this.set('yAxis', this.get('y2Axis'));
        }

        // Remove adornment models not found in storage

        // Restore any adornment models
        DG.ObjectMap.forEach(iStorage.adornments,
            function (iAdornmentKey, iAdornmentStorage) {
              var modelClass = DG.PlotAdornmentModel.registry[iAdornmentKey],
                  adornmentModel = modelClass && modelClass.create({plotModel: this});
              if (adornmentModel) {
                adornmentModel.restoreStorage(iAdornmentStorage);
                this.setAdornmentModel(iAdornmentKey, adornmentModel);
                // TODO: Get rid of this next line
                this.set(iAdornmentKey, adornmentModel);
              }
            }.bind(this));
      },

      /**
       * Create a copy of adornment models to be transferred to a new plot type.
       * We *don't* change the new plot model, but instead return an array of new properties,
       * so that the caller can control when the new plot model is changed, for example
       * inside a beginPropertyChanges()...endPropertyChanges() set.
       * @param {Object} iNewPlotModel
       * @returns {Object} array of properties to use for new model.
       */
      copyAdornmentModels: function (iNewPlotModel) {
        DG.assert((typeof iNewPlotModel === "object") && (iNewPlotModel instanceof DG.PlotModel));
        var tAdornmentModels = {},
            tPlottedCount = this.get('plottedCount');

        if (tPlottedCount) {  // copy plottedCount for all PlotModel types
          tAdornmentModels.plottedCount = tPlottedCount;
          tPlottedCount.set('plotModel', iNewPlotModel);
          this._plottedCountModel = null; // So we don't destroy the one we're passing to the new plot
          this._adornmentModels.plottedCount = null;
        }

        return tAdornmentModels;
      },

      /**
       *
       * @param {Object} iAdornments
       */
      installAdornmentModels: function( iAdornments) {
        var this_ = this;
        DG.ObjectMap.forEach( iAdornments, function( iKey, iValue) {
          this_.set( iKey, iValue);
        });
      },

      /**
       * Return a list of objects { key, class, storage }
       * Subclasses should override calling sc_super first.
       * @return {[Object]}
       */
      getAdornmentSpecs: function() {
        var tSpecs = [],
            tPlottedCount = this.get('plottedCount');
        if( tPlottedCount)
          tSpecs.push( {
            key: 'plottedCount',
            "class": tPlottedCount.constructor,
            storage: tPlottedCount.createStorage()
          });
        return tSpecs;
      },

      /**
       * For each adornment in source, make a corresponding adornment for me.
       * @param {DG.PlotModel} iSourcePlot
       */
      installAdornmentModelsFrom: function( iSourcePlot) {
        var this_ = this,
            tAdornmentSpecs = iSourcePlot.getAdornmentSpecs();
        tAdornmentSpecs.forEach( function( iSpec) {
          var tAdornmentModel = iSpec["class"].create({ plotModel: this_ });
          tAdornmentModel.restoreStorage( iSpec.storage);
          if( iSpec.useAdornmentModelsArray)
            this_.setAdornmentModel( iSpec.key, tAdornmentModel);
          else
            this_.set( iSpec.key, tAdornmentModel);
        });
      },

      /**
       * Get an array of non-missing case counts in each axis cell.
       * Also cell index on primary and secondary axis, with primary axis as major axis.
       * @return {Array} [{count, primaryCell, secondaryCell},...] (all values are integers 0+).
       */
      getCellCaseCounts: function () {
        DG.assert(false, "derived classes must override getCellCaseCounts()");
        return [];
      }

    });

/**
 class (static) method called before plot creation to make sure roles are correct
 @param {DG.GraphDataConfiguration}
 */
DG.PlotModel.configureRoles = function (iConfig) {

};
