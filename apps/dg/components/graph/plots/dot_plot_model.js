// ==========================================================================
//                            DG.DotPlotModel
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

sc_require('components/graph/plots/plot_model');
sc_require('components/graph/plots/numeric_plot_model_mixin');

/** @class  DG.DotPlotModel The model for a dot plot.

 @extends SC.PlotModel
 */
DG.DotPlotModel = DG.PlotModel.extend(DG.NumericPlotModelMixin,
    /** @scope DG.DotPlotModel.prototype */
    {
      /**
       @property{Number}
       */
      primaryVarID: function () {
        return (this.get('primaryAxisPlace') === DG.GraphTypes.EPlace.eX) ?
            this.get('xVarID') : this.get('yVarID');
      }.property('primaryAxisPlace', 'xVarID', 'yVarID')/*.cacheable()*/,

      /**
       @property{DG.GraphTypes.EPlace}
       */
      primaryAxisPlace: function () {
        var dataConfiguration = this.get('dataConfiguration');
        return dataConfiguration && dataConfiguration.getPlaceForRole(DG.Analysis.EAnalysisRole.ePrimaryNumeric);
      }.property('xVarID', 'yVarID')/*.cacheable()*/,

      /**
       @property{DG.GraphTypes.EPlace}
       */
      secondaryAxisPlace: function () {
        var dataConfiguration = this.get('dataConfiguration');
        return dataConfiguration && dataConfiguration.getPlaceForRole(DG.Analysis.EAnalysisRole.eSecondaryCategorical);
      }.property('xVarID', 'yVarID')/*.cacheable()*/,

      /**
       @property{DG.CellLinearAxisModel}
       */
      primaryAxisModel: function () {
        return this.getAxisForPlace(this.get('primaryAxisPlace'));
      }.property('primaryAxisPlace', 'xAxis', 'yAxis')/*.cacheable()*/,

      /**
       @property{DG.CellLinearAxisModel}
       */
      secondaryAxisModel: function () {
        return this.getAxisForPlace(this.get('secondaryAxisPlace'));
      }.property('secondaryAxisPlace', 'xAxis', 'yAxis')/*.cacheable()*/,

      /**
       'vertical' means the stacks of dots are vertical, while 'horizontal' means they are horizontal
       @property{String}
       */
      orientation: function () {
        return (this.get('primaryAxisPlace') === DG.GraphTypes.EPlace.eX) ? DG.GraphTypes.EOrientation.kVertical :
            DG.GraphTypes.EOrientation.kHorizontal;
      }.property('primaryAxisPlace'),

      multipleMovableValuesModel: function () {
        var tMultipleMovableValues = this.getAdornmentModel('multipleMovableValues');
        if (!tMultipleMovableValues) {
          tMultipleMovableValues = DG.MultipleMovableValuesModel.create({
            plotModel: this,
            axisModel: this.get('primaryAxisModel')
          });
          tMultipleMovableValues.addObserver('values', this, 'valuesDidChange');
          this.setAdornmentModel('multipleMovableValues', tMultipleMovableValues);
        }
        return tMultipleMovableValues;
      }.property(),

      /**
       * @property {Boolean}
       */
      isShowingMovableValues: function () {
        return this.getPath('multipleMovableValuesModel.values').length > 0;
      }.property(),

      /**
       * True because we can display percents with movable values
       * @property {Boolean}
       */
      wantsPercentCheckbox: function() {
        return this.get('isShowingMovableValues');
      }.property(),

      destroy: function () {
        var tMultipleMovableValues = this.getAdornmentModel('multipleMovableValues');
        if (tMultipleMovableValues) {
          tMultipleMovableValues.removeObserver('values', this, 'valuesDidChange');
        }
        sc_super();
      },

      /**
       We override our base class because we want to handle display of counts and percents
       in our multipleMovableValues adornment.
       However, if we have no movable values, we defer to our base class.
       */
      togglePlottedCount: function (iWhat) {

        if (!this.get('isShowingMovableValues')) {
          sc_super();
          return;
        }

        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            var tMultipleMovableValues = iPlot.get('multipleMovableValuesModel'),
                tCurrentValue = tMultipleMovableValues.get('isShowing' + iWhat);
            tMultipleMovableValues.setComputingNeeded();
            tMultipleMovableValues.set('isShowing' + iWhat, !tCurrentValue);
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);
        }

        var tInitialValue = this.getPath('multipleMovableValuesModel.isShowing' + iWhat),
            tUndo = tInitialValue ? ('DG.Undo.graph.hide' + iWhat) : ('DG.Undo.graph.show' + iWhat),
            tRedo = tInitialValue ? ('DG.Redo.graph.hide' + iWhat) : ('DG.Redo.graph.show' + iWhat);
        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.toggleCount",
          undoString: tUndo,
          redoString: tRedo,
          log: ("togglePlotted" + iWhat + ": %@").fmt(tInitialValue ? "hide" : "show"),
          execute: function () {
            toggle();
          }.bind(this),
          undo: function () {
            toggle();
          }.bind(this),
        }));
      },

      /**
       * Override base class to refer to multipleMovableValuesModel
       @return { Boolean }
       */
      shouldPlottedCountBeChecked: function (iWhat) {
        if( this.get('isShowingMovableValues'))
          return this.getPath('multipleMovableValuesModel.isShowing' + iWhat);
        else
          return sc_super();
      },

      /**
       * Add another movable value.
       * If it's the first one, we may have to deal with counts showing via the base class adornment.
       */
      addMovableValue: function () {
        var this_ = this,
            tAddedValues = [];

            function doAddMovableValue() {

              function addMovableValueToPlot( iPlot, iIndexMinusOne) {
                var tIndex = iIndexMinusOne + 1,
                    tMultipleMovableValues = iPlot.get('multipleMovableValuesModel'),
                    tNumAlreadyShowing = tMultipleMovableValues.get('values').length,
                    tPlottedCount = iPlot.get('plottedCount'), // from base class
                    tBaseClassCountIsShowing = (tNumAlreadyShowing === 0) && tPlottedCount &&
                        tPlottedCount.get('isShowingCount'),
                    tAddedValue = tAddedValues[ tIndex];
                if (tAddedValue) {
                  tMultipleMovableValues.addThisValue(tAddedValue);
                  tAddedValues[ tIndex] = null;
                }
                else {
                  tAddedValue = tMultipleMovableValues.addValue();
                  tAddedValues[ tIndex] = tAddedValue;
                }
                if (tBaseClassCountIsShowing) {
                  tPlottedCount.set('isShowingCount', false);
                  tMultipleMovableValues.set('isShowingCount', true);
                }
                iPlot.notifyPropertyChange('movableValueChange');
              }

              addMovableValueToPlot( this_, -1);
              this_.get('siblingPlots').forEach( addMovableValueToPlot);
            }

            function doUndoAddMovableValue() {

              function undoAddMovableValueFromPlot( iPlot, iIndexMinusOne) {
                var tIndex = iIndexMinusOne + 1,
                    tAddedValue = tAddedValues[ tIndex];
                iPlot.getAdornmentModel('multipleMovableValues').removeThisValue(tAddedValue);
              }

              undoAddMovableValueFromPlot( this_, -1);
              this_.get('siblingPlots').forEach( undoAddMovableValueFromPlot);
            }

        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.addMovableValue",
          undoString: 'DG.Undo.graph.addMovableValue',
          redoString: 'DG.Redo.graph.addMovableValue',
          log: "Added Movable Value",
          execute: doAddMovableValue,
          undo: doUndoAddMovableValue
        }));

      },

      /**
       * Add another movable value
       */
      removeMovableValue: function () {
        var tMultipleMovableValues = this.getAdornmentModel('multipleMovableValues'),
            tRemovedValue, tPlottedCount;

        if( !tMultipleMovableValues)
          return;

        var tShowing = { count: tMultipleMovableValues.get('isShowingCount'),
                          percent: tMultipleMovableValues.get('isShowingPercent')},
            tNumShowing = tMultipleMovableValues.get('values').length,

            doRemoveMovableValue = function () {
              if( tNumShowing === 1 && (tShowing.count || tShowing.percents) ) {
                tPlottedCount = this.get('plottedCount');
                tPlottedCount.set('isShowingCount', tShowing.count);
                tPlottedCount.set('isShowingPercent', tShowing.percent);
              }
              if( tRemovedValue)
                tMultipleMovableValues.removeThisValue( tRemovedValue);
              else
                tRemovedValue = tMultipleMovableValues.removeValue();
              this.notifyPropertyChange('movableValueChange');
            }.bind(this),

            doUndoRemoveMovableValue = function () {
              tMultipleMovableValues.addThisValue(tRemovedValue);
              tRemovedValue = null;
              if( tNumShowing === 1 && (tShowing.count || tShowing.percents) ) {
                tMultipleMovableValues.set('isShowingCount', tShowing.count);
                tMultipleMovableValues.set('isShowingPercent', tShowing.percent);
                this.setPath('plottedCount.isShowingCount', false);
                this.setPath('plottedCount.isShowingPercent', false);
              }
              this.notifyPropertyChange('movableValueChange');
            }.bind(this);

        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.removeMovableValue",
          undoString: 'DG.Undo.graph.removeMovableValue',
          redoString: 'DG.Redo.graph.removeMovableValue',
          log: "Added Movable Value",
          execute: doRemoveMovableValue,
          undo: doUndoRemoveMovableValue
        }));
      },

      valuesDidChange: function () {
        this.notifyPropertyChange('valuesDidChange');
      },

      /**
       Toggle the visibility of the specified DG.PlottedAverageModel.
       Will create the adornment the first time it's shown.
       @param    {String}    iAdornmentKey -- e.g. 'plottedMean'
       @param    {String}    iToggleLogString -- Name of action logged to server
       */
      toggleAverage: function (iAdornmentKey, iToggleLogString) {
        var this_ = this;

        function toggle() {

          function doToggle( iPlot) {
            var avg = iPlot.toggleAdornmentVisibility(iAdornmentKey, iToggleLogString);
            if (avg) {
              if (avg.get('isVisible')) {
                avg.recomputeValue();     // initialize
              } else {
                avg.setComputingNeeded(); // make sure we recompute when made visible again
              }
            }
          }

          doToggle( this_);
          this_.get('siblingPlots').forEach( doToggle);

          return this_.getAdornmentModel( iAdornmentKey).get('isVisible');
        }

        DG.UndoHistory.execute(DG.Command.create({
          name: "graph." + iToggleLogString,  // e.g. graph.togglePlottedMean
          undoString: null,
          log: iToggleLogString,
          execute: function () {
            var wasShown = toggle(),

                verb = wasShown ? "show" : "hide",
                action = iToggleLogString.replace("toggle", verb);

            this.set('undoString', 'DG.Undo.graph.' + action); // e.g. DG.Undo.graph.showPlottedMean
            this.set('redoString', 'DG.Redo.graph.' + action);
          },
          undo: function () {
            toggle();
          },
        }));
      },

      /**
       Toggle the visibility of the mean.
       */
      togglePlottedMean: function () {
        this.toggleAverage('plottedMean', 'togglePlottedMean');
      },

      /**
       Toggle the visibility of the median.
       */
      togglePlottedMedian: function () {
        this.toggleAverage('plottedMedian', 'togglePlottedMedian');
      },

      /**
       Toggle the visibility of the Standard Deviation.
       */
      togglePlottedStDev: function () {
        this.toggleAverage('plottedStDev', 'togglePlottedStDev');
      },

      /**
       Toggle the visibility of the Standard Deviation.
       */
      togglePlottedMad: function () {
        this.toggleAverage('plottedMad', 'togglePlottedMad');
      },

      /**
       Toggle the visibility of the IQR.
       */
      togglePlottedIQR: function () {
        this.toggleAverage('plottedIQR', 'togglePlottedIQR');
      },

      /**
       Toggle the visibility of the Box Plot.
       */
      togglePlottedBoxPlot: function () {
        this.toggleAverage('plottedBoxPlot', 'togglePlottedBoxPlot');
      },

      /**
       Toggle whether boxplot outliers are showing.
       */
      toggleShowOutliers: function () {
        var this_ = this;

        function toggle() {
          var tBoxPlotModel = this_.getAdornmentModel('plottedBoxPlot');
          if (tBoxPlotModel) {
            tBoxPlotModel.setComputingNeeded();
            tBoxPlotModel.toggleProperty('showOutliers');
          }
          return tBoxPlotModel.get('showOutliers');
        }

        DG.UndoHistory.execute(DG.Command.create({
          name: "graph.boxPlot.showOutliers",
          undoString: null,
          log: "graph.boxPlot.showOutliers",
          execute: function () {
            var wasShown = toggle(),

                verb = wasShown ? "show" : "hide",
                action = "toggleOutliers".replace("toggle", verb);

            this.set('undoString', 'DG.Undo.graph.' + action); // e.g. DG.Undo.graph.showPlottedMean
            this.set('redoString', 'DG.Redo.graph.' + action);
          },
          undo: function () {
            toggle();
          },
        }));
      },

      updateAdornmentsModels: function() {
        sc_super();
        ['multipleMovableValues', 'plottedMean', 'plottedMedian', 'plottedStDev', 'plottedBoxPlot', 'plottedCount'].forEach(function (iAdornmentKey) {
          var adornmentModel = this.getAdornmentModel(iAdornmentKey);
          if (adornmentModel) {
            if (adornmentModel.setComputingNeeded)
              adornmentModel.setComputingNeeded();  // invalidate if axis model/attribute change
            if (iAdornmentKey === 'multipleMovableValues') {
              adornmentModel.recomputeValueIfNeeded(this.get('primaryAxisModel'));
            }
            else {
              adornmentModel.recomputeValueIfNeeded(); // recompute only if/when visible
            }
          }
        }.bind(this));
      },

      handleDataConfigurationChange: function ( iKey) {
        if (!DG.assert(!this.get('isDestroyed'), "DG.DotPlotModel.handleDataConfiguration() shouldn't be triggered after destroy()!"))
          return;
        sc_super();
        var kAnimate = true, kDontLog = false;
        this.rescaleAxesFromData( iKey !== 'hiddenCases', kAnimate, kDontLog);
        this.updateAdornmentModels();
      },

      /**
       * Pass to my multipleMovableValues. We do this only after axis bounds have changed
       */
      onRescaleIsComplete: function() {
        this.get('multipleMovableValuesModel').handleChangedAxisAttribute();
      },

      /**
       Each axis should rescale based on the values to be plotted with it.
       @param{Boolean} Default is false
       @param{Boolean} Default is true
       @param{Boolean} Default is false
       @param{Boolean} Default is false
       */
      rescaleAxesFromData: function (iAllowScaleShrinkage, iAnimatePoints, iLogIt, iUserAction) {
        if (iAnimatePoints === undefined)
          iAnimatePoints = true;
        this.doRescaleAxesFromData([this.get('primaryAxisPlace')], iAllowScaleShrinkage, iAnimatePoints, iUserAction);
        if (iLogIt)
          DG.logUser("rescaleDotPlot");
      },

      /**
       @param{ {x: {Number}, y: {Number} } }
       @param{Number}
       */
      dilate: function (iFixedPoint, iFactor) {
        this.doDilation([this.get('primaryAxisPlace')], iFixedPoint, iFactor);
      },

      /**
       * Get an array of non-missing case counts in each axis cell.
       * Also cell index on primary and secondary axis, with primary axis as major axis.
       * @return {Array} [{count, primaryCell, secondaryCell},...] (all values are integers 0+).
       */
      getCellCaseCounts: function () {
        var tCases = this.get('cases'),
            tNumericVarID = this.get('primaryVarID'),
            tNumericAxisModel = this.get('primaryAxisModel'),
            tCategoricalVarID = this.get('secondaryVarID'),
            tCategoricalAxisModel = this.get('secondaryAxisModel'),
            tValueArray = [];

        if (!( tCategoricalAxisModel && tNumericAxisModel )) {
          return tValueArray; // too early to recompute, caller must try again later.
        }

        var tNumCells = tCategoricalAxisModel.get('numberOfCells');

        // initialize the values
        for (var i = 0; i < tNumCells; ++i) {
          tValueArray.push({count: 0, primaryCell: 0, secondaryCell: i});
        }

        // compute count of cases in each cell, excluding missing values
        // take care to handle null VarIDs and null case values correctly
        tCases.forEach(function (iCase, iIndex) {
          var tNumericValue = iCase.getNumValue(tNumericVarID),
              tCellValue = iCase.getStrValue(tCategoricalVarID),
              tCellNumber = tCategoricalAxisModel.cellNameToCellNumber(tCellValue);
          if (tCellNumber != null &&
              DG.MathUtilities.isInIntegerRange(tCellNumber, 0, tValueArray.length) && // if Cell Number not missing
              isFinite(tNumericValue)) { // if numeric value not missing
            tValueArray[tCellNumber].count += 1;
          }
        });

        return tValueArray;
      },

      restoreStorage: function (iStorage) {
        sc_super();
        var tMultipleMovable = this.getAdornmentModel('multipleMovableValues');
        if (tMultipleMovable)
          tMultipleMovable.set('axisModel', this.get('primaryAxisModel'));
      },

      /**
       * Return a list of objects { key, class, useAdornmentModelsArray, storage }
       * Subclasses should override calling sc_super first.
       * @return {[Object]}
       */
      getAdornmentSpecs: function() {
        var tSpecs = sc_super();
        DG.ObjectMap.forEach( this._adornmentModels, function( iKey, iAdorn) {
          tSpecs.push( {
            key: iKey,
            "class": iAdorn.constructor,
            useAdornmentModelsArray: true,
            storage: iAdorn.createStorage()
          });
        });
        return tSpecs;
      },

      /**
       * Base class will do most of the work. We just have to finish up the multipleMovableValues model.
       * @param {DG.PlotModel} iSourcePlot
       */
      installAdornmentModelsFrom: function( iSourcePlot) {
        sc_super();
        var tMultipleMovable = this.getAdornmentModel('multipleMovableValues');
        if (tMultipleMovable)
          tMultipleMovable.set('axisModel', this.get('primaryAxisModel'));
      },

      checkboxDescriptions: function () {
        var this_ = this;

        function createBoxPlotToggle() {
          var kMargin = 20,
              kLeading = 5,
              kRowHeight = 20,
              tShowOutliersCheckbox = SC.CheckboxView.create( {
                layout: { height: kRowHeight },
                localize: true,
                flowSpacing: { left: kMargin },
                title: 'DG.Inspector.graphBoxPlotShowOutliers',
                value: this_.getAdornmentModel('plottedBoxPlot') ?
                    this_.getAdornmentModel('plottedBoxPlot').get('showOutliers') : false,
                classNames: 'dg-graph-boxPlotShowOutliers-check'.w(),
                valueDidChange: function () {
                  this_.toggleShowOutliers();
                }.observes('value')
              }),
              tBoxPlotCheckbox = SC.CheckboxView.create( {
                layout: { height: kRowHeight },
                localize: true,
                title: 'DG.Inspector.graphPlottedBoxPlot',
                value: this_.isAdornmentVisible('plottedBoxPlot'),
                classNames: 'dg-graph-plottedBoxPlot-check'.w(),
                valueDidChange: function () {
                  this_.togglePlottedBoxPlot();
                  tShowOutliersCheckbox.set('isEnabled', isBoxPlotVisible());
                }.observes('value')
              });

          function isBoxPlotVisible() {
            return this_.isAdornmentVisible('plottedBoxPlot');
          }

          var tComposite =  SC.View.create( SC.FlowedLayout,
              {
                layoutDirection: SC.LAYOUT_VERTICAL,
                isResizable: false,
                isClosable: false,
                layout: {height: 2 * (kRowHeight + kLeading)},
                defaultFlowSpacing: {bottom: kLeading},
                canWrap: false,
                align: SC.ALIGN_TOP,
                // layout: {right: 22},
                boxplot: null,
                showOutliers: null,
                init: function() {
                  sc_super();
                  tShowOutliersCheckbox.set('isEnabled', this_.isAdornmentVisible('plottedBoxPlot'));
                  this.appendChild( tBoxPlotCheckbox);
                  this.appendChild(tShowOutliersCheckbox);
                }
              });
          return tComposite;
        }

        return sc_super().concat([
          {
            title: 'DG.Inspector.graphPlottedMean',
            value: this_.isAdornmentVisible('plottedMean'),
            classNames: 'dg-graph-plottedMean-check'.w(),
            valueDidChange: function () {
              this_.togglePlottedMean();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphPlottedMedian',
            value: this_.isAdornmentVisible('plottedMedian'),
            classNames: 'dg-graph-plottedMedian-check'.w(),
            valueDidChange: function () {
              this_.togglePlottedMedian();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphPlottedStDev',
            value: this_.isAdornmentVisible('plottedStDev'),
            classNames: 'dg-graph-plottedStDev-check'.w(),
            valueDidChange: function () {
              this_.togglePlottedStDev();
            }.observes('value')
          },
          {
            title: 'DG.Inspector.graphPlottedMeanAbsDev',
            value: this_.isAdornmentVisible('plottedMad'),
            classNames: 'dg-graph-plottedMad-check'.w(),
            valueDidChange: function () {
              this_.togglePlottedMad();
            }.observes('value')
          },
          {
            control: createBoxPlotToggle()
          },
          {
            title: 'DG.Inspector.graphPlottedValue',
            value: this_.isAdornmentVisible('plottedValue'),
            classNames: 'dg-graph-plottedValue-check'.w(),
            valueDidChange: function () {
              this_.togglePlotValue();
            }.observes('value')
          }
        ]);
      }.property(),

      lastValueControls: function () {
        var tControls = sc_super(),
            kRowHeight = 23,
            kButtonWidth = 120,
            tButton = SC.PopupButtonView.create({
              layout: {height: kRowHeight, width: kButtonWidth},
              title: 'DG.Inspector.graphMovableValue'.loc(),
              classNames: 'dg-movable-value-button',
              menu: SC.MenuPane.extend({
                layout: {width: 100},
                items: [
                  {
                    title: 'DG.Inspector.graphAdd'.loc(),
                    target: this,
                    action: function() {
                      tButton.setPath('parentView.parentView.isVisible', false);
                      this.addMovableValue();
                    }
                  },
                  {
                    title: 'DG.Inspector.graphRemove'.loc(),
                    target: this,
                    action: function() {
                      tButton.setPath('parentView.parentView.isVisible', false);
                      this.removeMovableValue();
                    }
                  },
                ]
              })
            });

        tControls.push( tButton);
        return tControls;
      }.property(),

    });

/**
 class method called before plot creation to make sure roles are correct
 @param {DG.GraphDataConfiguration}
 */
DG.DotPlotModel.configureRoles = function (iConfig) {
  var tXType = iConfig.get('xType'),
      tXIsNumeric = tXType === DG.Analysis.EAttributeType.eNumeric ||
          tXType === DG.Analysis.EAttributeType.eDateTime,
      tAxisKey = tXIsNumeric ? 'x' : 'y',
      tOtherAxisKey = (tAxisKey === 'x') ? 'y' : 'x';
  iConfig.setPath(tAxisKey + 'AttributeDescription.role',
      DG.Analysis.EAnalysisRole.ePrimaryNumeric);
  iConfig.setPath(tOtherAxisKey + 'AttributeDescription.role',
      DG.Analysis.EAnalysisRole.eSecondaryCategorical);
};

