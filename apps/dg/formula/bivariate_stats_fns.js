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
              iInstance.results[iKey] = DG.MathUtilities.correlation( iCache);
            });
        return this.queryCache(iContext, iEvalContext, iInstance);
      }
    }),

    rSquared: DG.BivariateStatsFn.create({

      computeResults: function (iContext, iEvalContext, iInstance) {
        DG.ObjectMap.forEach(iInstance.caches,
            function (iKey, iCache) {
              iInstance.results[iKey] = DG.MathUtilities.rSquared( iCache);
            });
        return this.queryCache(iContext, iEvalContext, iInstance);
      }
    }),

    linRegrSlope: DG.BivariateStatsFn.create({

      computeResults: function (iContext, iEvalContext, iInstance) {
        DG.ObjectMap.forEach(iInstance.caches,
            function (iKey, iCache) {
              iInstance.results[iKey] = DG.MathUtilities.linRegrSlope( iCache);
            });
        return this.queryCache(iContext, iEvalContext, iInstance);
      }
    }),

    linRegrIntercept: DG.BivariateStatsFn.create({

      computeResults: function (iContext, iEvalContext, iInstance) {
        DG.ObjectMap.forEach(iInstance.caches,
            function (iKey, iCache) {
              iInstance.results[iKey] = DG.MathUtilities.linRegrIntercept( iCache);
            });
        return this.queryCache(iContext, iEvalContext, iInstance);
      }
    }),

    linRegrResidual: DG.BivariateSemiAggregateFn.create({

      preEvaluate: function (iContext, iEvalContext, iInstance) {
        sc_super();

        // Each cache now contains an array of coordinate pairs for its group.
        // We want to replace this array with the slope and intercept the lsrl
        DG.ObjectMap.forEach(iInstance.caches,
            function (iKey, iCache) {
              var tBiStats = DG.MathUtilities.computeBivariateStats( iCache),
                  tSlope = tBiStats.sumOfProductDiffs / tBiStats.xSumSquaredDeviations;
              iInstance.caches[iKey] = {
                slope: tSlope,
                intercept: tBiStats.yMean - tSlope * tBiStats.xMean
              };
            });
      },

      /**
       Evaluates the aggregate function and returns a computed result for the specified case.
       This implementation loops over all cases, calling the evalCase() method for each one,
       and then caching the result indexed by the parent case ID.
       Derived classes should override the evalCase() method to perform whatever per-case
       computation and/or caching is required, and then the computeResults() method to
       complete the computation and return the requested value.
       @param  {DG.FormulaContext}   iContext
       @param  {Object}              iEvalContext -- { _case_: , _id_: }
       @param  {Object}              iInstance -- The aggregate function instance from the context.
       @returns  {Number|String|...}
       */
      evaluate: function( iContext, iEvalContext, iInstance) {

        var cachedResult = this.queryCache( iContext, iEvalContext, iInstance);
        if( cachedResult !== undefined) return cachedResult;

        this.preEvaluate(iContext, iEvalContext, iInstance);

        var collection = iContext && iContext.getCollectionToIterate(),
            cases = collection && collection.get('cases'),
            caseCount = cases && cases.get('length');

        for( var i = 0; i < caseCount; ++i) {
          var tCase = cases.objectAt( i),
              tEvalContext = $.extend({}, iEvalContext,
                  { _case_: tCase, _id_: tCase && tCase.get('id') }),
              cacheID = this.getGroupID(iContext, tEvalContext);
          if (this.filterCase( iContext, tEvalContext, iInstance))
            this.secondPassEvalCase( iContext, tEvalContext, iInstance, cacheID);
        }

        return this.computeResults( iContext, iEvalContext, iInstance);
      },

      secondPassEvalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
        var xFn = iInstance.argFns[0],
            yFn = iInstance.argFns[1],
            tSlope = iInstance.caches[ iCacheID].slope,
            tIntercept = iInstance.caches[ iCacheID].intercept,
            tCaseID = iEvalContext._id_;
        iInstance.results[ tCaseID] = DG.getNumeric( yFn( iContext, iEvalContext)) -
            (tSlope * DG.getNumeric( xFn( iContext, iEvalContext)) + tIntercept);
      }
    })


  };

}()));
