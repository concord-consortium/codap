// ==========================================================================
//                Bivariate Stats Aggregate Functions
//  
//  Author:   William Finzer
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('formula/aggregate_function');
sc_require('formula/function_registry');

/** @class DG.BivariateStatsFns
 The DG.BivariateStatsFns object implements aggregate functions that
 perform bivariate statistical computations such as correlation, covariance,
 linRegrIntercept, linRegrPredicted, etc.
 */
DG.functionRegistry.registerAggregates((function () {

  return {

    correlation: DG.BivariateStatsFn.create({

      computeResults: function (iContext, iEvalContext, iInstance) {
        DG.ObjectMap.forEach(iInstance.caches,
            function (iKey, iCache) {
              iInstance.results[iKey] = DG.MathUtilities.correlation(iCache);
            });
        return this.queryCache(iContext, iEvalContext, iInstance);
      }
    }),

    rSquared: DG.BivariateStatsFn.create({

      computeResults: function (iContext, iEvalContext, iInstance) {
        DG.ObjectMap.forEach(iInstance.caches,
            function (iKey, iCache) {
              iInstance.results[iKey] = DG.MathUtilities.rSquared(iCache);
            });
        return this.queryCache(iContext, iEvalContext, iInstance);
      }
    }),

    linRegrSlope: DG.BivariateStatsFn.create({

      computeResults: function (iContext, iEvalContext, iInstance) {
        DG.ObjectMap.forEach(iInstance.caches,
            function (iKey, iCache) {
              iInstance.results[iKey] = DG.MathUtilities.linRegrSlope(iCache);
            });
        return this.queryCache(iContext, iEvalContext, iInstance);
      }
    }),

    linRegrIntercept: DG.BivariateStatsFn.create({

      computeResults: function (iContext, iEvalContext, iInstance) {
        DG.ObjectMap.forEach(iInstance.caches,
            function (iKey, iCache) {
              iInstance.results[iKey] = DG.MathUtilities.linRegrIntercept(iCache);
            });
        return this.queryCache(iContext, iEvalContext, iInstance);
      }
    }),

    linRegrResidual: DG.BivariateSemiAggregateFn.create({

      secondPassEvalCase: function (iContext, iEvalContext, iInstance, iCacheID) {
        var xFn = iInstance.argFns[0],
            yFn = iInstance.argFns[1],
            tSlope = iInstance.caches[iCacheID].slope,
            tIntercept = iInstance.caches[iCacheID].intercept,
            tCaseID = iEvalContext._id_;
        iInstance.results[tCaseID] = DG.getNumeric(yFn(iContext, iEvalContext)) -
            (tSlope * DG.getNumeric(xFn(iContext, iEvalContext)) + tIntercept);
      }
    }),

    linRegrPredicted: DG.BivariateSemiAggregateFn.create({

      yCanBeNonNumeric: true, // so that we can get predicted values for x's without y's

      secondPassEvalCase: function (iContext, iEvalContext, iInstance, iCacheID) {
        var xFn = iInstance.argFns[0],
            tSlope = iInstance.caches[iCacheID].slope,
            tIntercept = iInstance.caches[iCacheID].intercept,
            tCaseID = iEvalContext._id_;
        iInstance.results[tCaseID] = (tSlope * DG.getNumeric(xFn(iContext, iEvalContext)) + tIntercept);
      }
    })


  };

}()));
