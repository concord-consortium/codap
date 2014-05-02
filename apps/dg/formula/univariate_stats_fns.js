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

sc_require('formula/aggregate_function');
sc_require('formula/collection_formula_context');

/** @class DG.UnivariateStatsFns

  The DG.UnivariateStatsFns object implements aggregate functions that
  perform univariate statistical computations such as count() mean(),
  median(), sum(), etc.
 */
DG.UnivariateStatsFns = {

  /**
    count([expr])
    Returns the aggregated count of its (optional) argument.
    If no argument is supplied, then the count of cases is returned.
    All other non-empty values except boolean false are counted.
    (The boolean false exception allows count(x>0) to behave as expected.)
   */
  count: DG.ParentCaseAggregate.create({
  
    requiredArgs: { min: 0, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var valueFn = iInstance.argFns[0],
          value = valueFn && valueFn( iContext, iEvalContext);
      // Count:
      //  -- all cases if there are no arguments (!valueFn)
      //  -- non-empty values except for boolean false
      //      (this way count(x>0) returns the expected result)
      // We don't use the cache, since all we need is the result counts.
      if( !valueFn || (!SC.none( value) && (value !== false))) {
        if( iInstance.results[ iCacheID])
          ++iInstance.results[ iCacheID];
        else
          iInstance.results[ iCacheID] = 1;
      }
      
    }
  
  }),

  /**
    min(expr)
    Returns the smallest of its evaluated argument values.
   */
  min: DG.ParentCaseAggregate.create({
  
    requiredArgs: { min: 1, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var valueFn = iInstance.argFns[0],
          value = valueFn && valueFn( iContext, iEvalContext);
      if( isFinite( value)) {
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
      var valueFn = iInstance.argFns[0],
          value = valueFn && valueFn( iContext, iEvalContext);
      if( isFinite( value)) {
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
      var valueFn = iInstance.argFns[0],
          value = valueFn && valueFn( iContext, iEvalContext);
      if( isFinite( value)) {
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

    extractResult: function( iCachedValues) {
      return DG.MathUtilities.medianOfNumericArray( iCachedValues);
    }
    
  }),

  /**
    sum(expr)
    Returns the aggregated sum of its evaluated argument values.
   */
  sum: DG.ParentCaseAggregate.create({
  
    requiredArgs: { min: 1, max: 1 },

    evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
      var valueFn = iInstance.argFns[0],
          value = valueFn && valueFn( iContext, iEvalContext);
      if( isFinite( value)) {
        if( iInstance.results[ iCacheID])
          iInstance.results[ iCacheID] += value;
        else
          iInstance.results[ iCacheID] = value;
      }
      
    }
  
  })
  
};

DG.CollectionFormulaContext.registerAggFnModule( DG.UnivariateStatsFns);
