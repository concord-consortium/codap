// ==========================================================================
//                            DG.UnivariatePlotModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2019 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  DG.UnivariatePlotModel The model for a dot plot.

 @extends SC.PlotModel
 */
DG.UnivariatePlotModel = DG.PlotModel.extend(DG.NumericPlotModelMixin,
    /** @scope DG.UnivariatePlotModel.prototype */
    {
      /**
       * @property {Boolean}
       */
      displayAsBinned: null,

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

      handleDataConfigurationChange: function ( iKey) {
        if (!DG.assert(!this.get('isDestroyed'), "DG.DotPlotModel.handleDataConfiguration() shouldn't be triggered after destroy()!"))
          return;
        sc_super();
        var kAnimate = true, kDontLog = false;
        this.rescaleAxesFromData( iKey !== 'hiddenCases', kAnimate, kDontLog);
        this.updateAdornmentModels();
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

        var tNumCatCells = tCategoricalAxisModel.get('numberOfCells'),
            tNumNumericCells = tNumericAxisModel.get('numberOfCells'),
            tNumCells = tNumCatCells * tNumNumericCells;

        // initialize the values
        for (var i = 0; i < tNumCells; ++i) {
          tValueArray.push({count: 0, primaryCell: i % tNumNumericCells,
            secondaryCell: Math.floor( i / tNumNumericCells) });
        }

        // compute count of cases in each cell, excluding missing values
        // take care to handle null VarIDs and null case values correctly
        tCases.forEach(function (iCase, iIndex) {
          var tNumericValue = iCase.getNumValue(tNumericVarID),
              tCellValue = iCase.getStrValue(tCategoricalVarID),
              tCatCellNumber = tCategoricalAxisModel.cellNameToCellNumber(tCellValue),
              tNumericCellNumber = tNumericAxisModel.valueToCellNumber( tNumericValue);
          if (tCatCellNumber != null &&
              DG.MathUtilities.isInIntegerRange(tCatCellNumber, 0, tNumCatCells) && // if Cell Number not missing
              isFinite(tNumericValue) &&
              DG.MathUtilities.isInIntegerRange(tNumericCellNumber, 0, tNumNumericCells)) {
            tValueArray[tCatCellNumber * tNumNumericCells + tNumericCellNumber].count += 1;
          }
        });

        return tValueArray;
      },

      toggleDisplayBins: function() {
        this.toggleProperty('displayAsBinned');
      },

      /**
       * A dot plot can be configured as a binned chart
       * @property {Boolean}
       */
      canSupportConfigurations: function() {
        return true;
      }.property(),

      configurationDescriptions: function() {
        var this_ = this,
            tDescriptions = sc_super();
        tDescriptions.push(
            {
              constructorClass: SC.CheckboxView,
              properties:
                  {
                    title: 'DG.Inspector.graphGroupIntoBins',
                    value: this_.get('displayAsBinned'),
                    classNames: 'dg-graph-binned-check'.w(),
                    valueDidChange: function () {
                      this_.toggleDisplayBins();
                      DG.mainPage.mainPane.hideInspectorPicker();
                    }.observes('value')
                  }
            }
        );
        return tDescriptions;
      }.property(),

      restoreStorage: function (iStorage) {
        sc_super();
      }

    });

/**
 class method called before plot creation to make sure roles are correct
 @param {DG.GraphDataConfiguration}
 */
DG.UnivariatePlotModel.configureRoles = function (iConfig) {
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

