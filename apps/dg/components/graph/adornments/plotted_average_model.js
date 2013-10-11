// ==========================================================================
//                            DG.PlottedAverageModel
// 
//  Model for averages displayed as symbols in a dot plot.
//  The primary axis should be numeric, and the secondary axis one or
//  more cells (one mean per cell).
//  
//  Author:   Craig D. Miller
//
//  Copyright ©2013 Scientific Reasoning Research Institute,
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
DG.PlottedAverageModel = DG.PlotAdornmentModel.extend(
/** @scope DG.PlottedAverageModel.prototype */
{
  values: null,       // [{ mean|median }], one element per cell on secondary axis
  precision: 0,       // decimal precision of attribute being averaged

  /**
   * True if we need to compute new values to match new cells.
   * Note that this does not detect data changes where means need recomputing anyway.
   * @return { Boolean }
   */
  isComputingNeeded: function() {
    return this._needsComputing && this.isVisible;
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

  /** derived classes must implement */
  recomputeValue: function() {
  },

  /**
    Private cache.
    @property { Boolean }
  */
  _needsComputing: true
  
});


DG.PlottedMeanStDevModel = DG.PlottedAverageModel.extend(
/** @scope DG.PlottedMeanStDevModel.prototype */
{
  /**
   * Compute or re-compute the sums, counts, and means of each cell.
   * returns null or an array of values, one for each cell
   */
  computeSumCountMean: function() {

    var tCases = this.getPath('plotModel.cases'),
        tNumericVarID = this.getPath( 'plotModel.primaryVarID'),
        tNumericAxisModel = this.getPath('plotModel.primaryAxisModel'),
        tCategoricalVarID = this.getPath( 'plotModel.secondaryVarID'),
        tCategoricalAxisModel = this.getPath('plotModel.secondaryAxisModel');
    if( !( tCategoricalAxisModel && tNumericAxisModel )) {
      return null; // too early to recompute, caller must try again later.
    }

    var tNumCells = tCategoricalAxisModel.get('numberOfCells');
    var tValues = []; // new values to compute and save
    var i,j;

    // initialize the values
    for( i=0, j=tNumCells; i<j; ++i ) {
      tValues.push({ sum:0, sumOfSquares:0, count:0, mean:undefined, stdev:undefined });
    }

    // compute count and sum of cases in each cell, excluding missing values
    // take care to handle null VarIDs and null case values correctly
    tCases.forEach( function( iCase, iIndex ) {
      var tNumericValue = iCase.getNumValue( tNumericVarID),
          tCellValue = iCase.getStrValue( tCategoricalVarID),
          tCellNumber = tCategoricalAxisModel.cellNameToCellNumber( tCellValue);
      if( tCellNumber!==null && DG.MathUtilities.isInIntegerRange( tCellNumber, 0, tValues.length )) { // if Cell Number not missing
        var iValue = tValues[tCellNumber];
        if( isFinite( tNumericValue )) { // if numeric value not missing
          iValue.sum += tNumericValue;
          iValue.sumOfSquares +=( tNumericValue * tNumericValue );
          iValue.count += 1;
          //iValue.cellValue = tCellValue;
        }
      }
    });

    // compute mean of cases in each cell
    tValues.forEach( function( iValue ) { // TO-DO remove this.
      if( iValue.count > 0 ) {
        iValue.mean = iValue.sum / iValue.count;
      }
    });

    return tValues;
  }
});

DG.PlottedMeanModel = DG.PlottedMeanStDevModel.extend(
/** @scope DG.PlottedMeanModel.prototype */
{
  /**
   * Compute or re-compute the mean(s).
   */
  recomputeValue: function() {
    var tValues = this.computeSumCountMean();

    if( tValues ) {
      var tNumericAxisModel = this.getPath('plotModel.primaryAxisModel');
      this.set( 'precision', tNumericAxisModel.getPath('attributeDescription.attribute.precision'));
      this.set( 'values', tValues ); // we expect view to observe this change
      this._needsComputing = false;
    }
  }
});
DG.PlotAdornmentModel.registry.plottedMean = DG.PlottedMeanModel;

DG.PlottedStDevModel = DG.PlottedMeanStDevModel.extend(
/** @scope DG.PlottedMeanModel.prototype */
{
  /**
   * Compute or re-compute the standard deviation(s).
   */
  recomputeValue: function() {
    var tValues = this.computeSumCountMean();

    // compute st.dev. of cases in each cell
    tValues.forEach( function( iValue ) {
      if( iValue.count > 0 ) {
        iValue.stdev = Math.sqrt(( iValue.sumOfSquares / iValue.count) - ( iValue.mean * iValue.mean ));
        iValue.stDevMinus1 = iValue.mean - iValue.stdev;
      }
    });
    if( tValues ) {
      var tNumericAxisModel = this.getPath('plotModel.primaryAxisModel');
      this.set( 'precision', tNumericAxisModel.getPath('attributeDescription.attribute.precision'));
      this.set( 'values', tValues ); // we expect view to observe this change
      this._needsComputing = false;
    }
  }
});
DG.PlotAdornmentModel.registry.plottedStDev = DG.PlottedStDevModel;

DG.PlottedQuantileModel = DG.PlottedAverageModel.extend(
/** @scope DG.PlottedMedianModel.prototype */
{
  /**
   * Compute quantile(s) for cases in each cell.
   * Note: array of '.vals' is sorted ascending, which helps make further quantile computations more efficient.
   * returns null or an array of values, one for each cell.
   */
  collectCellValsAndMedian: function() {

    var tCases = this.getPath('plotModel.cases'),
        tNumericVarID = this.getPath( 'plotModel.primaryVarID'),
        tCategoricalVarID = this.getPath( 'plotModel.secondaryVarID'),
        tCategoricalAxisModel = this.getPath('plotModel.secondaryAxisModel');
    if( ! tCategoricalAxisModel ) {
      //DG.log("DG.PlottedMedianModel.recomputeValue() ignored, no plotModel.secondaryAxisModel yet");
      return; // too early to recompute, caller must try again later.
    }
    var tNumCells = tCategoricalAxisModel.get('numberOfCells'),
        tValues = [], // new values to compute and save
        i,j;

    // initialize the values
    for( i=0, j=tNumCells; i<j; ++i ) {
      tValues.push({ vals: [], median: undefined });
    }

    // collect array of numeric cases in each cell, excluding missing/non-numeric/non-finite values
    // take care to handle null VarIDs and null case values correctly
    tCases.forEach( function( iCase, iIndex ) {
      var tNumericValue = iCase.getNumValue( tNumericVarID),
          tCellValue = iCase.getStrValue( tCategoricalVarID),
          tCellNumber = tCategoricalAxisModel.cellNameToCellNumber( tCellValue);
      if( tCellNumber!==null && DG.MathUtilities.isInIntegerRange( tCellNumber, 0, tValues.length )) { // if Cell Number not missing
        var iValue = tValues[tCellNumber];
        if( isFinite( tNumericValue )) { // if numeric value not missing
          iValue.vals.push( tNumericValue );
        }
      }
    });

    // compute median of cases in each cell
    tValues.forEach( function( iValue ) {
      if( iValue.vals.length > 0 ) { // TO_DO remove this.
        iValue.median = DG.MathUtilities.medianOfNumericArray( iValue.vals ); // also sorts .vals array
      }
    });
    return tValues;
  }
});

DG.PlottedMedianModel = DG.PlottedQuantileModel.extend(
/** @scope DG.PlottedMedianModel.prototype */
{
  /**
   * Compute or re-compute the median(s).
   */
  recomputeValue: function() {
    var tValues = this.collectCellValsAndMedian();

    this.set( 'values', tValues ); // we expect view to observe this change
    this._needsComputing = false;
    //DG.log("DG.PlottedMedianModel.recomputeValue() done");
  }
});
DG.PlotAdornmentModel.registry.plottedMedian = DG.PlottedMedianModel;

DG.PlottedIQRModel = DG.PlottedQuantileModel.extend(
/** @scope DG.PlottedMedianModel.prototype */
{
  /**
   * Compute or re-compute the Median, Q1, Q3, IQR for each cell.
   */
  recomputeValue: function() {
    var tValues = this.collectCellValsAndMedian();

    // also compute IQR
    tValues.forEach( function( iValue ) {
      if( iValue.vals.length > 0 ) {
        iValue.Q1 = DG.MathUtilities.quantileOfSortedArray( iValue.vals, 0.25 );
        iValue.Q3 = DG.MathUtilities.quantileOfSortedArray( iValue.vals, 0.75 );
        iValue.IQR = (iValue.Q3 - iValue.Q1);
      }
    });

    this.set( 'values', tValues ); // we expect view to observe this change
    this._needsComputing = false;
    //DG.log("DG.PlottedIQRModel.recomputeValue() done");
  }
});
DG.PlotAdornmentModel.registry.plottedIQR = DG.PlottedIQRModel;
