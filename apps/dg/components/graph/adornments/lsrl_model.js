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
       * @property {string}
       */
      categoryName: null,

      /**
       * @property {Number}
       */
      rSquared: null,

      /**
       We compute the slope and intercept of the lsrl for the displayed points
       */
      recomputeSlopeAndIntercept: function () {

        var tInterceptIsLocked = this.get('isInterceptLocked'),
            tCoordinates = this.getCoordinates(),
            tCategoryName = this.get('categoryName'),
            tSlopeIntercept;
        tCoordinates = tCoordinates.filter( function( iCoords) {
          // '==' will provide equality when one is string and other is number
          // eslint-disable-next-line eqeqeq
          return SC.none( iCoords.legend) || tCategoryName == iCoords.legend; // jshint ignore:line
        });
        tSlopeIntercept = DG.MathUtilities.leastSquaresLinearRegression( tCoordinates, tInterceptIsLocked);
        if( isNaN(tSlopeIntercept.slope) && isNaN( this.get('slope')) ||
            isNaN(tSlopeIntercept.intercept) && isNaN( this.get('intercept'))) {
          return; // not covered by setIfChanged
        }
        this.beginPropertyChanges();
          this.setIfChanged('slope', tSlopeIntercept.slope);
          this.setIfChanged('intercept', tSlopeIntercept.intercept);
          this.setIfChanged('rSquared', tSlopeIntercept.rSquared);
          this.setIfChanged('sumSquaresResiduals', tSlopeIntercept.sumSquaresResiduals);
          this.setIfChanged('isVertical', !isFinite(tSlopeIntercept.slope));
          this.setIfChanged('xIntercept', null);
        this.endPropertyChanges();
      }

    });

