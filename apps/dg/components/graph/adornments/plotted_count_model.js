// ==========================================================================
//                          DG.PlottedCountModel
//
//  Model for counts and percentages displayed as text in plots
//  of the graph.  Plot is divided into cells according to categorical
//  axis bins.  In the future this count can also be divided by user-specified
//  divider lines like TinkerPlots.
//
//  Author:   Craig D. Miller
//
//  Copyright ©2012-13 Scientific Reasoning Research Institute,
//                  University of Massachusetts Amherst
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

sc_require('components/graph/adornments/plot_adornment_model');
sc_require('components/graph/data_model/analysis');

/**
 * @class  The model for a plotted count and/or percent.
 * @extends SC.Object
 */
DG.PlottedCountModel = DG.PlotAdornmentModel.extend(
    /** @scope DG.PlottedCountModel.prototype */
    (function () {

      return {

        values: null,       // [{ count|percent }], one element per cell
        //precision: 0,     // decimal precision of percent being displayed
        plotModel: null,    // {DG.PlotModel}

        isVisible: false, // opposite of base class

        _isShowingCount: false,

        destroy: function() {
          this.plotModel = null;  // break reference loop
          sc_super();
        },

        /**
         * @property {Boolean}
         */
        isShowingCount: function (iKey, iValue) {
          if (!SC.none(iValue) && iValue !== this._isShowingCount) {
            this._isShowingCount = iValue;
            this.set('isVisible', this._isShowingCount || this._isShowingPercent);
          }
          return this._isShowingCount;
        }.property(),

        _isShowingPercent: false,
        /**
         * @property {Boolean}
         */
        isShowingPercent: function (iKey, iValue) {
          if (!SC.none(iValue) && iValue !== this._isShowingPercent) {
            this._isShowingPercent = iValue;
            this.set('isVisible', this._isShowingCount || this._isShowingPercent);
          }
          return this._isShowingPercent;
        }.property(),

        enableMeasuresForSelection: false,

        /**
         * @property {ePercentKind}
         */
        _percentKind: null,
        percentKind: function(iKey, iValue) {
          if( !SC.none( iValue)) {
            this._percentKind = iValue;
            this._needsComputing = true;
          }
          if( SC.none( this._percentKind))
              this._percentKind = DG.Analysis.EPercentKind.eRow;
          return this._percentKind;
        }.property(),

        /** compute counts */
        recomputeValue: function () {

          function computeCellPercents() {
            var tTotalCount = 0;
            if( !tForSelection) {
              tValueArray.forEach(function (iCell) {
                tTotalCount += iCell.count;
              });
            }
            tValueArray.forEach(function (iCell) {
              var tCellCount = tForSelection ? iCell.selectedCount : iCell.count;
              tTotalCount = tForSelection ? iCell.count : tTotalCount;
              if (tTotalCount > 0 && tCellCount > 0) {
                iCell.percent = 100 * tCellCount / tTotalCount;
              } else {
                iCell.percent = 0; // if 0 cases then 0%
              }
            });
          }

          function computeRowPercents() {
            var tRowCounts = [];
            for( var i = 0; i < tNumOnSecondary; i++) {
              tRowCounts[ i] = 0;
            }
            tValueArray.forEach(function (iCell, iIndex) {
              var tRow = iIndex % tNumOnSecondary;
              tRowCounts[ tRow] += iCell.count;
            });
            tValueArray.forEach(function (iCell, iIndex) {
              var tCellCount = tForSelection ? iCell.selectedCount : iCell.count,
                  tRow = iIndex % tNumOnSecondary,
                  tRowCount = tRowCounts[ tRow];
              if( tForSelection)
                iCell.count = tRowCount;  // So we'll see the right denominator in display
              if (tRowCount > 0 && tCellCount > 0) {
                iCell.percent = 100 * tCellCount / tRowCount;
              } else {
                iCell.percent = 0; // if 0 cases then 0%
              }
            });
          }

          function computeColumnPercents() {
            var tColumnCounts = [];
            for( var i = 0; i < tNumOnPrimary; i++) {
              tColumnCounts[ i] = 0;
            }
            tValueArray.forEach(function (iCell, iIndex) {
              var tColumn = Math.floor( iIndex / tNumOnSecondary);
              tColumnCounts[ tColumn] += iCell.count;
            });
            tValueArray.forEach(function (iCell, iIndex) {
              var tCellCount = tForSelection ? iCell.selectedCount : iCell.count,
                  tColumn = Math.floor( iIndex / tNumOnSecondary),
                  tColumnCount = tColumnCounts[ tColumn];
              if( tForSelection)
                iCell.count = tColumnCount;  // So we'll see the right denominator in display
              if (tColumnCount > 0 && tCellCount > 0) {
                iCell.percent = 100 * tCellCount / tColumnCount;
              } else {
                iCell.percent = 0; // if 0 cases then 0%
              }
            });
          }

          var tNumOnPrimary = this.getPath('plotModel.primaryAxisModel.numberOfCells'),
              tNumOnSecondary = this.getPath('plotModel.secondaryAxisModel.numberOfCells'),
              tPercentKind = (tNumOnPrimary > 1 && tNumOnSecondary > 1) ? this.get('percentKind') :
                  DG.Analysis.EPercentKind.eCell,
              tIsRotated = this.getPath('plotModel.primaryAxisPlace') === DG.GraphTypes.EPlace.eY,
              tForSelection = this.get('enableMeasuresForSelection');
          // Take this opportunity to turn off showing percent if there is only one cell
          if( this.get('isShowingPercent') && (tNumOnPrimary * tNumOnSecondary === 1) &&
              !tForSelection) {
            this.set('isShowingPercent', false);
          }
          if( tIsRotated) {
            if( tPercentKind === DG.Analysis.EPercentKind.eColumn)
              tPercentKind = DG.Analysis.EPercentKind.eRow;
            else if(tPercentKind === DG.Analysis.EPercentKind.eRow)
              tPercentKind = DG.Analysis.EPercentKind.eColumn;
          }

          // get non-missing case count in each cell, and cell index, from plot models
          DG.assert(this.plotModel && this.plotModel.getCellCaseCounts);
          var tValueArray = this.plotModel.getCellCaseCounts( tForSelection);
          switch( tPercentKind) {
            case DG.Analysis.EPercentKind.eCell:
              computeCellPercents();
              break;
            case DG.Analysis.EPercentKind.eRow:
              computeRowPercents();
              break;
            case DG.Analysis.EPercentKind.eColumn:
              computeColumnPercents();
              break;
          }

          this.set('values', tValueArray); // we expect view to observe this change
          this._needsComputing = false;
        },

        /**
         Private cache.
         @property { Boolean }
         */
        _needsComputing: true,

        /**
         Returns an object which contains properties that should be written
         out with the document for archiving purposes.
         */
        createStorage: function () {
          var tStorage = sc_super();
          tStorage.isShowingCount = this.get('isShowingCount') || false;
          tStorage.isShowingPercent = this.get('isShowingPercent') || false;
          tStorage.percentKind = SC.none(this.get('percentKind')) ? undefined : this.get('percentKind');
          return tStorage;
        },

        /**
         Set the contents of the adornment model from the restored storage.
         */
        restoreStorage: function (iStorage) {
          this.set('isShowingCount', SC.none( iStorage.isShowingCount) ? iStorage.isVisible : iStorage.isShowingCount);
          this.set('isShowingPercent', iStorage.isShowingPercent || false);
          this.set('percentKind', SC.none(iStorage.isShowingPercent) ? DG.Analysis.EPercentKind.eRow :
              iStorage.percentKind);
          sc_super();
        }

      };
    }()));

DG.PlotAdornmentModel.registry.plottedCount = DG.PlottedCountModel;
