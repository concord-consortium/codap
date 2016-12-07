// ==========================================================================
//  
//  Author:   wfinzer
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
sc_require('utilities/math_utilities');

module("DG.Utilities", {
  setup: function() {
    window.DG = window.DG || {};
  },
  teardown: function() {
  }
});

test("Tests leastSquaresLinearRegression", function() {
  var tResult;

  var tThreeOnALine = [{x: 0, y: 0 },{x: 1, y: 1 },{x: 2, y: 2 }];
  tResult = DG.MathUtilities.leastSquaresLinearRegression( tThreeOnALine, false);
  ok(tResult.slope === 1 && tResult.intercept === 0 && tResult.rSquared === 1 && tResult.sumSquaresResiduals === 0,
  'LSR for three points on a line evaluates correctly');

  var tSinglePoint = [{x: 1, y: 1 }];
  tResult = DG.MathUtilities.leastSquaresLinearRegression( tSinglePoint, false);
  ok((tResult.slope === null) && (tResult.intercept === null) &&
      (tResult.rSquared === null) && (tResult.sumSquaresResiduals === null),
  'LSR of single point produces Nulls');

  var tVerticalLine = [{x: 1, y: 1 }, {x: 1, y: 2 }, {x: 1, y: 3 }];
  tResult = DG.MathUtilities.leastSquaresLinearRegression( tVerticalLine, false);
  ok(!isFinite(tResult.slope) && !isFinite(tResult.intercept) &&
      !isFinite(tResult.rSquared) && !isFinite(tResult.sumSquaresResiduals),
  'LSR of vertical line produces NaNs');

  var tHorizontalLine = [{x: 0, y: 1 }, {x: 1, y: 2 }, {x: 1, y: 0 }];
  tResult = DG.MathUtilities.leastSquaresLinearRegression( tHorizontalLine, false);
  ok(tResult.slope === 0 && tResult.intercept === 1 && tResult.rSquared === 0 && tResult.sumSquaresResiduals === 2,
  'LSR of three points (0,1), (1,2), (1,0): slope = %@, intercept = %@, r2 = %@, sumSquaresResiduals = %@'.loc(
      tResult.slope, tResult.intercept, tResult.rSquared, tResult.sumSquaresResiduals
  ));

  tHorizontalLine = [{x: 0, y: 1 }, {x: 1.5, y: 2 }, {x: 1.5, y: 0 }, {x: 3, y: 1 }];
  tResult = DG.MathUtilities.leastSquaresLinearRegression( tHorizontalLine, false);
  ok(tResult.slope === 0 && tResult.intercept === 1 && tResult.rSquared === 0 && tResult.sumSquaresResiduals === 2,
  'LSR of four points (0,1), (1.5,2), (1.5,0), (3,1): slope = %@, intercept = %@, r2 = %@, sumSquaresResiduals = %@'.loc(
      tResult.slope, tResult.intercept, tResult.rSquared, tResult.sumSquaresResiduals
  ));

});