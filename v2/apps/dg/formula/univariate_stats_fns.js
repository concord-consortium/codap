// ==========================================================================
//                Univariate Stats Aggregate Functions
//  
//  Author:   Kirk Swenson
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

/* global Set:true */

sc_require('formula/aggregate_function');
sc_require('formula/function_registry');

/** @class DG.UnivariateStatsFns

  The DG.UnivariateStatsFns object implements aggregate functions that
  perform univariate statistical computations such as count() mean(),
  median(), sum(), etc.
 */
DG.functionRegistry.registerAggregates((function() {

return {

  /**
    count([expr])
    Returns the aggregated count of its (optional) argument.
    If no argument is supplied, then the count of cases is returned.
    All other non-empty values except boolean false are counted.
    (The boolean false exception allows count(x>0) to behave as expected.)
   */
  count: DG.ParentCaseAggregate.create({
  
    requiredArgs: { min: 0, max: 1 },

    // count() with no arguments must be invalidated when case indices change
    isCaseIndexDependent: function(iArgs) {
      return !iArgs || !iArgs.length;
    },

    evaluate: function( iContext, iEvalContext, iInstance) {
      // if we have an argument, use the base class iteration method
      if (iInstance.argFns[0] != null) {
        return sc_super();
      }

      // if no argument, just count child cases
      var childCases = iEvalContext._case_ && iEvalContext._case_.get('children');
      return childCases ? childCases.get('length') : 0;
    },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var value = this.getValue( iContext, iEvalContext, iInstance);
      // Count:
      //  -- non-empty values except for boolean false and empty string
      //      (this way count(x>0) returns the expected result)
      if(!SC.empty(value) && (value !== false)) {
        if( iInstance.results[ iCacheID])
          ++iInstance.results[ iCacheID];
        else
          iInstance.results[ iCacheID] = 1;
      }
      else if( !iInstance.results[ iCacheID]) {
        // put a 0 entry in the cache for evaluated groups
        iInstance.results[ iCacheID] = 0;
      }
    },

    computeResults: function( iContext, iEvalContext, iInstance) {
      // default to 0 rather than undefined (e.g. if there are no cases)
      return sc_super() || 0;
    }
  }),

  /**
    uniqueValues([expr])
    Returns the number of unique values of its first argument.
    The second argument determines which case's values contribute.
   */
  uniqueValues: DG.ParentCaseAggregate.create({

    requiredArgs: { min: 1, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var value = this.getValue( iContext, iEvalContext, iInstance);
      if (!iInstance.caches[iCacheID])
        iInstance.caches[iCacheID] = new Set();
      if(!SC.empty(value)) {
        iInstance.caches[iCacheID].add(value);
      }
    },

    computeResults: function( iContext, iEvalContext, iInstance) {
      DG.ObjectMap.forEach( iInstance.caches,
          function( iKey, iCache) {
            iInstance.results[ iKey] = iCache.size;
          });
      return this.queryCache( iContext, iEvalContext, iInstance);
    }
  }),

  /**
    min(expr)
    Returns the smallest of its evaluated argument values.
   */
  min: DG.ParentCaseAggregate.create({
  
    requiredArgs: { min: 1, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var value = this.getNumericValue( iContext, iEvalContext, iInstance);
      if( value != null) {
        var cache = iInstance.caches[ iCacheID];
        if( cache) {
          if( cache.min > value)
            cache.min = value;
        }
        else
          iInstance.caches[ iCacheID] = { min: value };
      }
    },
    
    computeResults: function( iContext, iEvalContext, iInstance) {
      DG.ObjectMap.forEach( iInstance.caches,
                            function( iKey, iCache) {
                              iInstance.results[ iKey] = iCache.min;
                            });
      return this.queryCache( iContext, iEvalContext, iInstance);
    }
  }),

  /**
    max(expr)
    Returns the largest of its evaluated argument values.
   */
  max: DG.ParentCaseAggregate.create({
  
    requiredArgs: { min: 1, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var value = this.getNumericValue( iContext, iEvalContext, iInstance);
      if( value != null) {
        var cache = iInstance.caches[ iCacheID];
        if( cache) {
          if( cache.max < value)
            cache.max = value;
        }
        else
          iInstance.caches[ iCacheID] = { max: value };
      }
    },
    
    computeResults: function( iContext, iEvalContext, iInstance) {
      DG.ObjectMap.forEach( iInstance.caches,
                            function( iKey, iCache) {
                              iInstance.results[ iKey] = iCache.max;
                            });
      return this.queryCache( iContext, iEvalContext, iInstance);
    }
  }),

  /**
    mean(expr)
    Returns the aggregated mean of its evaluated argument values.
   */
  mean: DG.ParentCaseAggregate.create({
  
    requiredArgs: { min: 1, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var value = this.getNumericValue( iContext, iEvalContext, iInstance);
      if( value != null) {
        var cache = iInstance.caches[ iCacheID];
        if( cache) {
          cache.count += 1;
          cache.sum += value;
        }
        else
          iInstance.caches[ iCacheID] = { count: 1, sum: value };
      }
    },
    
    computeResults: function( iContext, iEvalContext, iInstance) {
      DG.ObjectMap.forEach( iInstance.caches,
                            function( iKey, iCache) {
                              iInstance.results[ iKey] = iCache.count > 0
                                                            ? iCache.sum / iCache.count
                                                            : null;
                            });
      return this.queryCache( iContext, iEvalContext, iInstance);
    }
  }),

  /**
    median(expr)
    Returns the aggregated median of its evaluated argument values.
   */
  median: DG.SortDataFunction.create({
  
    requiredArgs: { min: 1, max: 1 },

    extractResult: function( iCachedValues, iEvalContext, iInstance) {
      return DG.MathUtilities.medianOfNumericArray( iCachedValues);
    }
  }),

  /**
    variance(expr)
    Returns the aggregated sample standard deviation of its evaluated argument values.
   */
  variance: DG.CachedValuesParentCaseAggregate.create({
  
    requiredArgs: { min: 1, max: 1 },

    computeResultFromCache: function(iCache) {
      return this.computeVarianceFromCache(iCache);
    }
  }),

  /**
    stdDev(expr)
    Returns the aggregated sample standard deviation of its evaluated argument values.
   */
  stdDev: DG.CachedValuesParentCaseAggregate.create({
  
    requiredArgs: { min: 1, max: 1 },

    computeResultFromCache: function(iCache) {
      return Math.sqrt(this.computeVarianceFromCache(iCache));
    }
  }),

  /**
    stdErr(expr)
    Returns the aggregated standard error of its evaluated argument values.
   */
  stdErr: DG.CachedValuesParentCaseAggregate.create({
  
    requiredArgs: { min: 1, max: 1 },

    computeResultFromCache: function(iCache) {
      var count = iCache.values && iCache.values.length,
          stdDev = Math.sqrt(this.computeVarianceFromCache(iCache));
      return stdDev / Math.sqrt(count);
    }
  }),

  /**
    mad(expr)
    Returns the mean absolute deviation of its evaluated argument values.
   */
  mad: DG.CachedValuesParentCaseAggregate.create({

    requiredArgs: { min: 1, max: 1 },

    computeResultFromCache: function(iCache) {
      var count = iCache.values && iCache.values.length,
          tMean = iCache.sum / count;
      return iCache.values && iCache.values.reduce( function( iSum, iValue) {
            return iSum + Math.abs( tMean - iValue);
          }, 0) / count;
    }
  }),

  /**
    percentile(expr)
    Returns the aggregated percentile of its evaluated argument values.
   */
  percentile: DG.SortDataFunction.create({

    // todo: Figure out what should be the min number of arguments. 2 or 1?
    requiredArgs: { min: 2, max: 2 },

    preEvaluate: function(iContext, iEvalContext, iInstance) {
      sc_super();

      var tPercValueFn = iInstance.argFns[1],
          percValue = tPercValueFn ? tPercValueFn(iContext, iEvalContext) : undefined;
      // Note that the percentile argument could evaluate to a different value for every
      // case, e.g. percentile(x, caseIndex/count(x)). The code here somewhat arbitrarily
      // chooses the last evaluated percentile value to use for the aggregate evaluation.
      // A fully general implementation would treat the percentile function as a semi-
      // aggregate which could evaluate to a different value for every case.
      if (!iInstance.caches) iInstance.caches = {};
      iInstance.caches._percentile_ = percValue;
    },

    extractResult: function (iCachedValues, iEvalContext, iInstance) {
      return DG.MathUtilities.quantileOfSortedArray(iCachedValues, iInstance.caches._percentile_);
    }
  }),

  /**
    sum(expr)
    Returns the aggregated sum of its evaluated argument values.
   */
  sum: DG.ParentCaseAggregate.create({

    requiredArgs: { min: 1, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var value = this.getNumericValue( iContext, iEvalContext, iInstance);
      if (iInstance.results[ iCacheID] == null) {
        iInstance.results[ iCacheID] = 0;
      }
      if( value != null) {
        if( iInstance.results[ iCacheID])
          iInstance.results[ iCacheID] += value;
        else
          iInstance.results[ iCacheID] = value;
      }
    }
  }),

  /**
   combine(expr)
   Returns the aggregated concatenation of its evaluated argument values.
   */
  'combine': DG.ParentCaseAggregate.create({

    category: 'DG.Formula.FuncCategoryString',
    requiredArgs: { min: 1, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var value = this.getValue( iContext, iEvalContext, iInstance);
      if( value != null) {
        if( iInstance.results[ iCacheID])
          iInstance.results[ iCacheID] += String( value);
        else
          iInstance.results[ iCacheID] = String( value);
      }
    }
  }),
  /**
   * rolling_mean(expr, width, filter)
   * Returns the running mean. 'expr' is the expression evaluated for each case.
   * 'width', is the number of prior and succeeding cases included in the mean.
   * It is a positive odd integer. For example, a width of seven will sum the
   * values for the three prior (filtered) cases, the three succeeding (filtered)
   * cases, and the current case and divide by seven. The filter is an expression
   * that excludes cases from consideration.
   *
   */
  rollingMean: DG.AggregateFunction.create({
    category: 'DG.Formula.FuncCategoryStatistical',
    requiredArgs: { min: 2, max: 3 }, // expression, width, filter
    isCaseIndexDependent: function () { return false; },
    evaluate: function(iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0],
          widthFn = iInstance.argFns[1],
          filterFn = iInstance.argFns[2];
      /**
       * @return {[object]}
       */
      function getRangeValues(iContext, iEvalContext) {
        var width = Math.round(widthFn(iContext, iEvalContext));
        if (width<1) return [];
        var numPreceding = Math.floor(width/2);
        var numFollowing = width - 1 - numPreceding;
        var rtn = [];
        var iCase = iEvalContext._case_;
        var parentCase = iCase && iCase.get('parent');
        var siblings = parentCase ? parentCase.get('children')
            : (iContext && iContext.getPath('collection.cases'));
        var thisCaseIndex = iContext.getCaseIndex( iEvalContext._id_); // 1-based index
        var ix = thisCaseIndex - 1; // 0-based index
        var remaining = numPreceding;
        var tCase;
        var value = DG.getNumeric(valueFn(iContext, iEvalContext));
        if (numPreceding > ix || numFollowing >= (siblings.length - ix)) {
          return [];
        }
        if (value != null) {rtn.push(value);}
        while(ix > 0 && remaining > 0) {
          ix -= 1;
          tCase = siblings[ix];
          if (!filterFn || filterFn(iContext, {_case_: tCase, _id_: tCase.get('id') })) {
            value = DG.getNumeric(valueFn(iContext, { _case_: tCase, _id_: tCase && tCase.get('id')  }));
            if (value != null) { rtn.push(value); }
            remaining -= 1;
          }
        }
        ix = thisCaseIndex - 1; // 0-based index
        remaining = numFollowing;
        while(ix < siblings.length - 1 && remaining > 0) {
          ix += 1;
          tCase = siblings[ix];
          if (tCase && (!filterFn || filterFn(iContext, {_case_: tCase, _id_: tCase.get('id') }))) {
            value = DG.getNumeric(valueFn(iContext, { _case_: tCase, _id_: tCase && tCase.get('id')  }));
            if (value != null) { rtn.push(value); }
            remaining -= 1;
          }
        }
        return rtn;
      }
      var values = getRangeValues(iContext, iEvalContext);
      if (values.length === 0) {
        return null;
      }
      var sum = values.reduce(function (accum, value, ix) {
        return accum + value;
      }.bind(this), 0);
      return sum / values.length;
    }
  })
};

}()));
