// ==========================================================================
//                          DG.UnivariateAdornmentBaseView
//
//  Author:   William Finzer
//
//  Copyright (c) 2023 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/plots/univariate_plot_view');

/** @class  DG.UnivariateAdornmentBaseView - Serves as a base for views that allow the full set of univariate
 * adornments.
 @extends DG.UnivariatePlotView
 */
DG.UnivariateAdornmentBaseView = DG.UnivariatePlotView.extend(
    /** @scope DG.UnivariateAdornmentBaseView.prototype */
    {
      autoDestroyProperties: ['multipleMovableValuesAdorn', 'plottedValueAdorn',
        'plottedMeanAdorn', 'plottedMedianAdorn', 'plottedStDevAdorn', 'plottedStErrAdorn', 'plottedNormalAdorn',
        'plottedMadAdorn', 'plottedBoxPlotAdorn', 'plottedNormalAdorn'],

      /** @property {DG.MultipleMovableValuesAdornment} */
      multipleMovableValuesAdorn: null,

      /** @property {DG.PlottedMeanAdornment} */
      plottedMeanAdorn: null,

      /** @property {DG.PlottedMedianAdornment} */
      plottedMedianAdorn: null,

      /** @property {DG.plottedStDevAdorn} */
      plottedStDevAdorn: null,

      /** @property {DG.plottedStErrAdorn} */
      plottedStErrAdorn: null,

      /** @property {DG.plottedMadAdorn} */
      plottedMadAdorn: null,

      /** @property {DG.plottedBoxPlotAdorn} */
      plottedBoxPlotAdorn: null,

      /** @property {DG.plottedNormalAdorn} */
      plottedNormalAdorn: null,

      primaryAxisViewDidChange: function () {
        sc_super();
        var tMultMovableValuesAdorn = this.get('multipleMovableValuesAdorn');
        if (tMultMovableValuesAdorn)
          tMultMovableValuesAdorn.set('valueAxisView', this.get('primaryAxisView'));
      },

      /**
       * Update the plot when cases have been added or removed.
       */
      dataDidChange: function () {
        if (!this.getPath('model.dataConfiguration'))
          return; // happens during destroy of plot
        sc_super(); // base class handles almost everything
        if (SC.none(this.get('paper')))
          return;   // not ready to create elements yet
        this.updateAverages();
      },

      /**
       * Update the plot when case values have changed.
       */
      dataRangeDidChange: function (iSource, iQuestion, iKey, iChanges) {
        var tCases = this.getPath('model.cases');

        this.notifyPropertyChange('plotDisplayDidChange');

        this.updateAverages();
        this.rescaleOnParentCaseCompletion(tCases);
        sc_super();
      },

      numberOfCellsDidChange: function () {
        ['plottedMeanAdorn', 'plottedMedianAdorn', 'plottedStDevAdorn', 'plottedStErrAdorn', 'plottedMadAdorn',
          'plottedBoxPlotAdorn', 'plottedNormalAdorn'].forEach(function (iKey) {
          if (this.getPath(iKey + '.model')) {
            this.getPath(iKey + '.model').setComputingNeeded();
          }
        }.bind(this));
      }.observes('*secondaryAxisView.model.numberOfCells'),

      /**
       Called when the order of the categories on an axis changes (e.g. cells are dragged)
       */
      categoriesDidChange: function () {
        this.updateAverages();
      }.observes('model.colorMap'),

      initializeAdornments: function () {
        sc_super();
        this.setOffsetsForAverages();
      },

      setOffsetsForAverages: function () {
        var tOffset = 0;
        ['plottedMeanAdorn', 'plottedMedianAdorn', 'plottedStDevAdorn', 'plottedStErrAdorn',
          'plottedNormalAdorn', 'plottedMadAdorn'].forEach(
            function (iKey) {
              if (this.getPath(iKey + '.model.isVisible')) {
                if (this.getPath(iKey + '.offset') !== tOffset)
                  this.setPath(iKey + '.offset', tOffset);
                tOffset++;
              }
            }.bind(this)
        );
      },

      /**
       * Invalidate and update the averages adornments.
       * To be called when cases or plot configuration
       * changes, that the averages depend upon.
       * @param iAnimate {Boolean}[optional] animate change to averages.
       */
      updateAverages: function (iAnimate) {
        function updateOneAdorn(ioAdorn) {
          if (ioAdorn) {
            var adornModel = ioAdorn.get('model');
            if (adornModel) {
              adornModel.setComputingNeeded();
              ioAdorn.updateToModel(iAnimate);
            }
          }
        }

        if (!this.getPath('model.dataConfiguration'))
          return; // because we can get here during destroy

        updateOneAdorn(this.plottedMeanAdorn);
        updateOneAdorn(this.plottedMedianAdorn);
        updateOneAdorn(this.plottedStDevAdorn);
        updateOneAdorn(this.plottedStErrAdorn);
        updateOneAdorn(this.plottedMadAdorn);
        updateOneAdorn(this.plottedBoxPlotAdorn);
        updateOneAdorn(this.plottedNormalAdorn);
        updateOneAdorn(this.multipleMovableValuesAdorn);

        if (this.plottedValueAdorn) {
          this.plottedValueAdorn.updateToModel();
        }

        this.setOffsetsForAverages();
      },

      /**
       Generate the svg needed to display the plot
       */
      doDraw: function doDraw() {

        function updateAverageAdorn(a) {
          if (!SC.none(a) && a.wantVisible()) {
            a.get('model').setComputingNeeded();
            a.updateToModel();
          }
        }

        sc_super();

        this.drawData();

        this.updateSelection();

        ['plottedMeanAdorn', 'plottedMedianAdorn', 'plottedStDevAdorn', 'plottedStErrAdorn', 'plottedMadAdorn',
          'plottedBoxPlotAdorn', 'plottedNormalAdorn'].forEach(
            function (iKey) {
              updateAverageAdorn(this[iKey]);
            }.bind(this)
        );

        if (!SC.none(this.plottedValueAdorn))
          this.plottedValueAdorn.updateToModel();
        if (!SC.none(this.multipleMovableValuesAdorn))
          this.multipleMovableValuesAdorn.updateToModel();
      },

      /**
       Presumably our model has created a movable value. We need to create our adornment.
       */
      movableValueChanged: function () {
        var tPlotModel = this.get('model'),
            tMultipleMovableValues = tPlotModel && tPlotModel.getAdornmentModel('multipleMovableValues'),
            tMultipleMovableValuesAdorn = this.get('multipleMovableValuesAdorn');
        if (tMultipleMovableValues) {
          if (tMultipleMovableValuesAdorn) {
            tMultipleMovableValuesAdorn.set('parentView', this);
            tMultipleMovableValuesAdorn.set('model', tMultipleMovableValues);
            tMultipleMovableValuesAdorn.set('paperSource', this.get('paperSource'));
          } else {
            tMultipleMovableValuesAdorn = DG.MultipleMovableValuesAdornment.create({
              parentView: this, model: tMultipleMovableValues,
              paperSource: this.get('paperSource'),
              layerName: DG.LayerNames.kAdornments,
              valueAxisView: this.get('primaryAxisView')
            });
            this.set('multipleMovableValuesAdorn', tMultipleMovableValuesAdorn);
          }
          tMultipleMovableValuesAdorn.updateToModel();
        }
      }.observes('*model.valuesDidChange', '*model.multipleMovableValues'),

      /**
       Presumably our model has created a plotted mean. We need to create our adornment.
       */
      plottedMeanChanged: function () {
        this.adornmentDidChange('plottedMean', 'plottedMeanAdorn', DG.PlottedMeanAdornment);
      }.observes('*model.plottedMean'),

      /**
       Presumably our model has created a plotted mean. We need to create our adornment.
       */
      plottedMedianChanged: function () {
        this.adornmentDidChange('plottedMedian', 'plottedMedianAdorn', DG.PlottedMedianAdornment);
      }.observes('*model.plottedMedian'),

      /**
       Presumably our model has created a plotted St.Dev. We need to create our adornment.
       */
      plottedStDevChanged: function () {
        this.adornmentDidChange('plottedStDev', 'plottedStDevAdorn', DG.PlottedStDevAdornment);
      }.observes('*model.plottedStDev'),

      /**
       Presumably our model has created a plotted StErr. We need to create our adornment.
       */
      plottedStErrChanged: function () {
        this.adornmentDidChange('plottedStErr', 'plottedStErrAdorn', DG.PlottedStErrAdornment);
      }.observes('*model.plottedStErr'),

      /**
       Presumably our model has created a plotted MAD. We need to create our adornment.
       */
      plottedMadChanged: function () {
        this.adornmentDidChange('plottedMad', 'plottedMadAdorn', DG.PlottedMeanAbsDevAdornment);
      }.observes('*model.plottedMad'),

      /**
       Presumably our model has created a box plot. We need to create our adornment.
       */
      plottedBoxPlotChanged: function () {
        this.adornmentDidChange('plottedBoxPlot', 'plottedBoxPlotAdorn', DG.PlottedBoxPlotAdornment);
      }.observes('*model.plottedBoxPlot'),

      /**
       Presumably our model has created a plotted IQR. We need to create our adornment.
       */
      plottedNormalChanged: function () {
        this.adornmentDidChange('plottedNormal', 'plottedNormalAdorn', DG.PlottedNormalAdornment);
      }.observes('*model.plottedNormal'),

      /**
       Update an adornment after a change to its corresponding adornment model.
       @param    {String}    iAdornmentKey -- e.g. 'plottedMean' or 'plottedMedian'
       @param    {String}    iAdornmentProperty -- e.g. 'plottedMeanAdorn' or 'plottedMedianAdorn'
       @param    {Object}    iAdornmentClass -- e.g. DG.PlottedMeanAdornment or DG.PlottedMedianAdornment
       */
      adornmentDidChange: function (iAdornmentKey, iAdornmentProperty, iAdornmentClass) {
        var tPlotModel = this.get('model'),
            tAdornmentModel = tPlotModel && tPlotModel.getAdornmentModel(iAdornmentKey),
            tAdornment = this[iAdornmentProperty];
        if (tAdornmentModel) {
          if (tAdornment) {
            // These can get out of sync in undo
            tAdornment.set('parentView', this);
            tAdornment.set('model', tAdornmentModel);
            tAdornment.set('paperSource', this.get('paperSource'));
          } else {
            tAdornment = iAdornmentClass.create({
              parentView: this, model: tAdornmentModel, paperSource: this.get('paperSource'),
              layerName: DG.LayerNames.kAdornments, shadingLayerName: DG.LayerNames.kIntervalShading
            });
            this[iAdornmentProperty] = tAdornment;
          }
          tAdornment.updateToModel();
        } else if (tAdornment) {  // We can't have an adornment without a model
          tAdornment.destroy();
          delete this[iAdornmentProperty];
        }
        this.setOffsetsForAverages();
      },

    });
