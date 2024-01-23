// ==========================================================================
//                          DG.LSRLModel
//
//  Author:   William Finzer
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/adornments/twoD_line_model');

/** @class  DG.LSRLModel - The model for a least squares regression line.

 @extends DG.TwoDLineModel
 */
DG.LSRLModel = DG.TwoDLineModel.extend(
    /** @scope DG.TwoDLineModel.prototype */
    {
      /**
       * @property { Boolean }
       */
      showConfidenceBands: false,
      /**
       * @property {string}
       */
      categoryName: null,

      /**
       * @property {Number}
       */
      rSquared: null,

      /**
       * @property {Number}
       */
      sdResiduals: null,

      /**
       * @property {Number}
       */
      seSlope: null,

     /**
       * @property {Number}
       */
      seIntercept: null,

      getCoordinates: function() {
        var tCoordinates = sc_super(),
           tCategoryName = this.get('categoryName');
        return tCoordinates.filter( function( iCoords) {
          // '==' will provide equality when one is string and other is number
          // eslint-disable-next-line eqeqeq
          return SC.none( iCoords.legend) || tCategoryName == iCoords.legend ||  // jshint ignore:line
                 tCategoryName === '_main_';
        });
      },

      computeSumSquaresResiduals: function() {
        var tSumSquaresResiduals = 0,
            tSlope = this.get('slope'),
            tIntercept = this.get('intercept');
        this.getCoordinates().forEach(function (iCoordinates) {
          var tLineY = tIntercept + tSlope * iCoordinates.x,
              tResid = iCoordinates.y - tLineY;
          tSumSquaresResiduals += tResid * tResid;
        });
        this.setIfChanged('sumSquaresResiduals', tSumSquaresResiduals);
      },

      /**
       We compute the slope and intercept of the lsrl for the displayed points
       */
      recomputeSlopeAndIntercept: function () {
        var tInterceptIsLocked = this.get('isInterceptLocked'),
            tCoordinates = this.getCoordinates(),
            tSlopeIntercept, tSeSlope, tSeIntercept;
        tSlopeIntercept = DG.MathUtilities.leastSquaresLinearRegression( tCoordinates, tInterceptIsLocked);
        tSeSlope = this.get('showConfidenceBands') ? DG.MathUtilities.linRegrSESlopeAndIntercept( tCoordinates).seSlope
                                                   : null;
        tSeIntercept = this.get('showConfidenceBands')
                          ? DG.MathUtilities.linRegrSESlopeAndIntercept( tCoordinates).seIntercept : null;
        if( isNaN(tSlopeIntercept.slope) && isNaN( this.get('slope')) ||
            isNaN(tSlopeIntercept.intercept) && isNaN( this.get('intercept'))) {
          return; // not covered by setIfChanged
        }
        this.beginPropertyChanges();
          this.setIfChanged('count', tSlopeIntercept.count);
          this.setIfChanged('slope', tSlopeIntercept.slope);
          this.setIfChanged('intercept', tSlopeIntercept.intercept);
          this.setIfChanged('mse', tSlopeIntercept.mse);
          this.setIfChanged('xMean', tSlopeIntercept.xMean);
          this.setIfChanged('yMean', tSlopeIntercept.yMean);
          this.setIfChanged('xSumSquaredDeviations', tSlopeIntercept.xSumSquaredDeviations);
          this.setIfChanged('rSquared', tSlopeIntercept.rSquared);
          this.setIfChanged('seSlope', tSeSlope);
          this.setIfChanged('seIntercept', tSeIntercept);
          this.setIfChanged('isVertical', !isFinite(tSlopeIntercept.slope));
          this.setIfChanged('xIntercept', null);
          this.computeSumSquaresResiduals();
        this.endPropertyChanges();
      },

      createStorage: function() {
        var tStorage = sc_super();
        tStorage.showConfidenceBands = this.showConfidenceBands;
        return tStorage;
      },

      /**
       * @param iStorage
       */
      restoreStorage: function( iStorage) {
        sc_super();
        this.showConfidenceBands = iStorage.showConfidenceBands;
      }

    });

