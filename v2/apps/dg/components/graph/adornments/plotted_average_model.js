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
  _values: null,       // [{ mean|median }], one element per cell on secondary axis

  values: function( iKey, iValue) {
    if( iValue) {
      this._values = iValue;
    }
    if( !this._values) {
      this.recomputeValue();
    }
    return this._values;
  }.property(),

  enableMeasuresForSelection: false,
  precision: 0,       // decimal precision of attribute being averaged

});

/**
 * @class  The model for a plotted average (mean or median).
 * @extends SC.Object
*/
DG.PlottedSimpleAverageModel = DG.PlottedAverageModel.extend(
/** @scope DG.PlottedAverageModel.prototype */
{
  /**
   * Coordinates of the center of the equation rectangle as a proportion of the plot frame
   * @property {{proportionCenterX: {Number}, proportionCenterY: {Number}}[]}
   */
  equationCoordsArray: null,
  
  init: function() {
    sc_super();
    this.equationCoordsArray = [];
  },

  createStorage: function() {
    var tStorage = sc_super();
    DG.ObjectMap.copy( tStorage, {
      equationCoordsArray: this.get('equationCoordsArray')
    });
    return tStorage;
  },

  /**
   * @param { Object } with properties specific to a given subclass
   */
  restoreStorage: function( iStorage) {
    sc_super();
    if( iStorage) {
      if( iStorage.equationCoordsArray)
        this.set('equationCoordsArray', iStorage.equationCoordsArray);
    }
  }
  
});



    DG.PlottedMeanStDevModel = DG.PlottedSimpleAverageModel.extend(
/** @scope DG.PlottedMeanStDevModel.prototype */
{
  /**
   * Compute or re-compute the sums, counts, and means of each cell.
   * returns null or an array of values, one for each cell
   */
  computeSumCountMean: function( includeMAD) {

    var tCases = this.get('cases'),
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
      tValues.push({ sum:0, sumOfSquares:0, count:0, mean:undefined, stdev:undefined, numericValues: [] });
    }

    // compute count and sum of cases in each cell, excluding missing values
    // take care to handle null VarIDs and null case values correctly
    tCases.forEach( function( iCase, iIndex ) {
      var tNumericValue = iCase.getNumValue( tNumericVarID),
          tCellValue = iCase.getStrValue( tCategoricalVarID),
          tCellNumber = tCategoricalAxisModel.cellNameToCellNumber( tCellValue);
      if( tCellNumber!=null && DG.MathUtilities.isInIntegerRange( tCellNumber, 0, tValues.length )) { // if Cell Number not missing
        var iValue = tValues[tCellNumber];
        if( isFinite( tNumericValue )) { // if numeric value not missing
          iValue.sum += tNumericValue;
          iValue.sumOfSquares +=( tNumericValue * tNumericValue );
          iValue.count += 1;
          if( includeMAD) {
            iValue.numericValues.push( tNumericValue);
          }
          //iValue.cellValue = tCellValue;
        }
      }
    });

    // compute mean of cases in each cell
    tValues.forEach( function( iValue ) { // TO-DO remove this.
      if( iValue.count > 0 ) {
        iValue.mean = iValue.sum / iValue.count;
        if( includeMAD) {
          iValue.mad = iValue.numericValues.reduce( function( iMad, iNumValue) {
            return iMad + Math.abs( iValue.mean - iNumValue);
          }, 0) / iValue.count;
          delete iValue.numericValues;
        }
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
/** @scope DG.PlottedStDevModel.prototype */
{
  /**
   * Compute or re-compute the standard deviation(s).
   */
  recomputeValue: function() {
    var tValues = this.computeSumCountMean();
    if( !tValues)
      return;

    // compute st.dev. of cases in each cell
    tValues.forEach( function( iValue ) {
      if( iValue.count > 1 ) {
        iValue.stdev = Math.sqrt(( iValue.sumOfSquares -
                                  ( iValue.mean * iValue.mean ) * iValue.count) /
                                    (iValue.count - 1));
        iValue.centerMinus1Dev = iValue.mean - iValue.stdev;
      }
    });
    var tNumericAxisModel = this.getPath('plotModel.primaryAxisModel');
    this.set( 'precision', tNumericAxisModel.getPath('attributeDescription.attribute.precision'));
    this.set( 'values', tValues ); // we expect view to observe this change
    this._needsComputing = false;
  }
});
DG.PlotAdornmentModel.registry.plottedStDev = DG.PlottedStDevModel;

DG.PlottedMadModel = DG.PlottedMeanStDevModel.extend(
    /** @scope DG.PlottedMadModel.prototype */
    {
      /**
       * Compute or re-compute the mean(s).
       */
      recomputeValue: function() {
        var tValues = this.computeSumCountMean( true /* include MAD */);
        if( !tValues)
          return;

        tValues.forEach( function( iValue ) {
          iValue.centerMinus1Dev = iValue.mean - iValue.mad;
        });
        var tNumericAxisModel = this.getPath('plotModel.primaryAxisModel');
        this.set( 'precision', tNumericAxisModel.getPath('attributeDescription.attribute.precision'));
        this.set( 'values', tValues ); // we expect view to observe this change
        this._needsComputing = false;
      }
    });
DG.PlotAdornmentModel.registry.plottedMad = DG.PlottedMadModel;

DG.PlottedQuantileModel = DG.PlottedSimpleAverageModel.extend(
/** @scope DG.PlottedMedianModel.prototype */
{
  /**
   * Compute quantile(s) for cases in each cell.
   * Note: array of '.vals' is sorted ascending, which helps make further quantile computations more efficient.
   * returns null or an array of values, one for each cell.
   */
  collectCellValsAndMedian: function() {

    var tCases = this.get('cases'),
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
      tValues.push({ vals: [], cases: [], median: undefined });
    }

    // collect array of numeric cases in each cell, excluding missing/non-numeric/non-finite values
    // take care to handle null VarIDs and null case values correctly
    tCases.forEach( function( iCase, iIndex ) {
      var tNumericValue = iCase.getNumValue( tNumericVarID),
          tCellValue = iCase.getStrValue( tCategoricalVarID),
          tCellNumber = tCategoricalAxisModel.cellNameToCellNumber( tCellValue);
      if( tCellNumber!= null && DG.MathUtilities.isInIntegerRange( tCellNumber, 0, tValues.length )) { // if Cell Number not missing
        var iValue = tValues[tCellNumber];
        if( isFinite( tNumericValue )) { // if numeric value not missing
          iValue.vals.push( tNumericValue );
          iValue.cases.push( iCase);
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

    if( tValues) {
      this.set('values', tValues); // we expect view to observe this change
      this._needsComputing = false;
      //DG.log("DG.PlottedMedianModel.recomputeValue() done");
    }
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
    if( !tValues)
      return;

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

DG.PlottedBoxPlotModel = DG.PlottedIQRModel.extend(
/** @scope DG.PlottedBoxPlotModel.prototype */
{
  showOutliers: false,  // If true, then we draw a "modified" boxplot

  /**
   * Compute or re-compute the Median, Q1, Q3, lowerWhisker, upperWhisker for each cell.
   * My base class will have computed everything except the lower and upper whisker.
   *    A whisker extends at most 1.5 times the IQR beyond the appropriate percentile, but
   *    stops at the closest value that doesn't exceed it.
   */
  recomputeValue: function() {
    this.beginPropertyChanges();  // Postpone notification until after we compute whisker ends

    sc_super();

    var tValues = this.get('values'),
        tShowOutliers = this.get('showOutliers');
    if( tValues) {

      tValues.forEach(function (iValue) {
        iValue.upperOutliers = [];
        iValue.lowerOutliers = [];
        if (iValue.vals.length > 0) {
          if( tShowOutliers) {
            var tMaxWhiskerLength = 1.5 * iValue.IQR,
                tWhiskerCandidate, tIndex;
            tWhiskerCandidate = iValue.Q1 - tMaxWhiskerLength;
            tIndex = 0;
            while (iValue.vals[tIndex] < tWhiskerCandidate) {
              iValue.lowerOutliers.push(iValue.vals[tIndex]);
              tIndex++;
            }
            iValue.lowerWhisker = iValue.vals[tIndex];

            tWhiskerCandidate = iValue.Q3 + tMaxWhiskerLength;
            tIndex = iValue.vals.length - 1;
            while (iValue.vals[tIndex] > tWhiskerCandidate) {
              iValue.upperOutliers.push(iValue.vals[tIndex]);
              tIndex--;
            }
            iValue.upperWhisker = iValue.vals[tIndex];
          }
          else {
            iValue.lowerWhisker = iValue.vals[0];
            iValue.upperWhisker = iValue.vals[iValue.vals.length - 1];
          }
        }
      });
    }

    this.endPropertyChanges();
  },
  /**
   Returns an object which contains properties that should be written
   out with the document for archiving purposes.
   */
  createStorage: function() {
    var tStorage = sc_super();
    tStorage.showOutliers = this.get('showOutliers') || false;
    return tStorage;
  },

  /**
   Set the contents of the adornment model from the restored storage.
   */
  restoreStorage: function( iStorage) {
    sc_super();
    if( iStorage)
      this.set('showOutliers', iStorage.showOutliers || false);
  }

});
DG.PlotAdornmentModel.registry.plottedBoxPlot = DG.PlottedBoxPlotModel;
