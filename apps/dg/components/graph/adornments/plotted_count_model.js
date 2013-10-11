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

/**
 * @class  The model for a plotted average (mean or median).
 * @extends SC.Object
*/
DG.PlottedCountModel = DG.PlotAdornmentModel.extend(
/** @scope DG.PlottedCountModel.prototype */
{
  values: null,       // [{ count|percent }], one element per cell
  //precision: 0,     // decimal precision of percent being displayed
  plotModel: null,    // {DG.PlotModel}

  /*init: function() {
    sc_super();
    this.values = [];
  },
  */

  /**
   * True if we need to compute new values to match new cells.
   * Note that this does not detect data changes where means need recomputing anyway.
   * @return { Boolean }
   */
  isComputingNeeded: function() {
    return this._needsComputing && this.get('isVisible');
  },

  /**
   * Note that our mean values are out of date, for lazy evaluation.
   * Dependencies, which will require a recompute
   *  - case-attribute-values added/deleted/changed for the primary and secondary axis attribute(s)
   *  - primary or secondary axis attributes changed (from one attribute to another)
   *  - axis models changed (must be up to date when we use them here)
   */
  setComputingNeeded: function() {
    this._needsComputing = true;
  },
  
  /**
    Use the bounds of the given axes to recompute slope and intercept.
  */
  recomputeValueIfNeeded: function() {
    if( this.isComputingNeeded())
      this.recomputeValue();
  },

  /** compute counts */
  recomputeValue: function() {

    // get non-missing case count in each cell, and cell index, from plot models
    DG.assert( this.plotModel && this.plotModel.getCellCaseCounts );
    var tTotalCount = 0,
        tValueArray = this.plotModel.getCellCaseCounts();

    // compute percents from counts
    tValueArray.forEach( function( iCell ) {
      tTotalCount += iCell.count;
    });
    tValueArray.forEach( function( iCell ) {
      if( tTotalCount > 0 && iCell.count > 0 ) {
        iCell.percent = 100 * iCell.count / tTotalCount;
      } else {
        iCell.percent = 0; // if 0 cases then 0%
      }
    });

    this.set( 'values', tValueArray ); // we expect view to observe this change
    this._needsComputing = false;
  },

  /**
    Private cache.
    @property { Boolean }
  */
  _needsComputing: true

});

DG.PlotAdornmentModel.registry.plottedCount = DG.PlottedCountModel;
