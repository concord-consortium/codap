// ==========================================================================
//                        DG.AggregateFunction
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

/** @class DG.AggregateFunction

  The DG.AggregateFunction "class" is the base "class" for aggregate function
  implementation classes.

  @extends SC.Object
 */
DG.AggregateFunction = SC.Object.extend({

  /**
    By default, aggregate functions accepts virtually any number of arguments.
    @property   {Object}  min: minimum # of arguments, max: maximum number of arguments
   */
  requiredArgs: { min: 0, max: 999 },
  
  /**
    Returns a computed result from the cache.
    Derived classes must override.
    @param  {DG.FormulaContext}   iContext
    @param  {Object}              iEvalContext -- { _case_: , _id_: }
    @param  {Object}              iInstance -- The aggregate function instance from the context.
    @returns  {Number|String|...}
   */
  queryCache: function( iContext, iEvalContext, iInstance) {
    return undefined;
  },
  
  /**
    Evaluates the aggregate function and returns a computed result for the specified case.
    Base class evaluation method. Derived classes must override.
   */
  evaluate: function( iContext, iEvalContext, iInstance) {
  }

});


/** @class DG.IteratingAggregate

  The DG.IteratingAggregate "class" is the base "class" for aggregate function
  implementation classes which must iterate through all of the cases to perform
  their aggregate computation.

  @extends SC.AggregateFunction
 */
DG.IteratingAggregate = DG.AggregateFunction.extend({

  /**
    Returns a computed result from the cache.
    Base class implementation assumes that the cache is indexed by child case ID,
    i.e. suitable for implementation of functions that return separate values for
    each case. In Fathom we called these semi-aggregates -- functions like rank().
    @param  {DG.FormulaContext}   iContext
    @param  {Object}              iEvalContext -- { _case_: , _id_: }
    @param  {Object}              iInstance -- The aggregate function instance from the context.
    @returns  {Number|String|...}
   */
  queryCache: function( iContext, iEvalContext, iInstance) {
    return iInstance.results ? iInstance.results[ iEvalContext._id_] : undefined;
  },
  
  /**
    Evaluates the aggregate function and returns a computed result for the specified case.
    This implementation loops over all cases, calling the evalCase() method for each one.
    Derived classes should override the evalCase() method to perform whatever per-case
    computation and/or caching is required, and then the computeResults() method to 
    complete the computation and return the requested value.
    @param  {DG.FormulaContext}   iContext
    @param  {Object}              iEvalContext -- { _case_: , _id_: }
    @param  {Object}              iInstance -- The aggregate function instance from the context.
    @returns  {Number|String|...}
   */
  evaluate: function( iContext, iEvalContext, iInstance) {

    // If we have a valid cached value then simply return it.
    var cachedResult = this.queryCache( iContext, iEvalContext, iInstance);
    if( cachedResult !== undefined) return cachedResult;

    // Prepare for iteration over all the cases.
    var collection = iContext && iContext.getCollectionToIterate(),
        cases = collection && collection.get('cases'),
        caseCount = cases && cases.get('length');

    // Clear the cache and iterate over all the cases.
    iInstance.caches = {};
    iInstance.results = {};
    for( var i = 0; i < caseCount; ++i) {
      var tCase = cases.objectAt( i),
          e = { _case_: tCase, _id_: tCase && tCase.get('id') };
      // Perform any per-case evaluation
      this.evalCase( iContext, e, iInstance);
    }
    
    // Complete the computation, returning the requested result
    return this.computeResults( iContext, iEvalContext, iInstance);
  },
  
  /**
    Perform any per-case computation and/or caching.
    Derived classes must override to implement their specific computations.
    @param  {DG.FormulaContext}   iContext
    @param  {Object}              iEvalContext -- { _case_: , _id_: }
    @param  {Object}              iInstance -- The aggregate function instance from the context.
    @param  {Number|null}         iCacheID -- The cache ID to use for cache lookups for this case.
   */
  evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
  },
  
  /**
    Complete the computation for a given case.
    Base class implementation assumes that the evaluate method has already filled
    the cache and that all this method needs to do is to return the cached result.
    Derived classes with more elaborate requirements can override as necessary.
    @param  {DG.FormulaContext}   iContext
    @param  {Object}              iEvalContext -- { _case_: , _id_: }
    @param  {Object}              iInstance -- The aggregate function instance from the context.
    @returns  {Number|String|...}
   */
  computeResults: function( iContext, iEvalContext, iInstance) {
    return this.queryCache( iContext, iEvalContext, iInstance);
  }

});


/** @class DG.ParentCaseAggregate

  The DG.ParentCaseAggregate "class" is the base "class" for aggregate function
  implementation classes which must iterate through all of the cases to perform
  their aggregate computation, and which compute/cache their results over a
  single parent case.

  @extends SC.IteratingAggregate
 */
DG.ParentCaseAggregate = DG.IteratingAggregate.extend({

  /**
    Returns a computed result from the cache.
    This class implementation assumes that the cache is indexed by parent case ID,
    i.e. suitable for implementation of functions that return the same value for all
    child cases of a given parent case, such as most simple univariate stats functions.
    @param  {DG.FormulaContext}   iContext
    @param  {Object}              iEvalContext -- { _case_: , _id_: }
    @param  {Object}              iInstance -- The aggregate function instance from the context.
    @returns  {Number|String|...}
   */
  queryCache: function( iContext, iEvalContext, iInstance) {
    if( iInstance.results) {
      if( iInstance.results[ iEvalContext._id_] !== undefined)
        return iInstance.results[ iEvalContext._id_];
      var parentID = iEvalContext._case_ && iEvalContext._case_.getPath('parent.id'),
          cacheID = parentID || null;
      if( iInstance.results[ cacheID] !== undefined)
        return iInstance.results[ cacheID];
    }
    return undefined;
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

    var collection = iContext && iContext.getCollectionToIterate(),
        cases = collection && collection.get('cases'),
        caseCount = cases && cases.get('length');

    iInstance.caches = {};
    iInstance.results = {};
    for( var i = 0; i < caseCount; ++i) {
      var tCase = cases.objectAt( i),
          parentID =  (tCase && tCase.getPath('parent.id')) || null,
          e = { _case_: tCase, _id_: tCase && tCase.get('id') };
      this.evalCase( iContext, e, iInstance, parentID);
    }
    
    return this.computeResults( iContext, iEvalContext, iInstance);
  }
  
});


/** @class DG.SortDataFunction

  The DG.SortDataFunction "class" is the base "class" for aggregate function
  implementation classes which must iterate through all of the cases to perform
  their aggregate computation, and which compute/cache their results over a
  single parent case, and which sort their values before computing their result.

  @extends SC.ParentCaseAggregate
 */
DG.SortDataFunction = DG.ParentCaseAggregate.extend({

  /**
    Perform any per-case computation and/or caching.
    For the SortDataFunction, this method simply caches its values for later sorting.
    @param  {DG.FormulaContext}   iContext
    @param  {Object}              iEvalContext -- { _case_: , _id_: }
    @param  {Object}              iInstance -- The aggregate function instance from the context.
    @param  {Number|null}         iCacheID -- The cache ID to use for cache lookups for this case.
   */
  evalCase: function( iContext, iEvalContext, iInstance, iCacheID) {
    var valueFn = iInstance.argFns[0],
        value = valueFn && valueFn( iContext, iEvalContext);
    // Currently, we only sort numeric values.
    // To support a Fathom-like alphanumeric sort, we would have to change the test here.
    if( isFinite( value)) {
      var cache = iInstance.caches[ iCacheID];
      if( cache) {
        cache.push( value);
      }
      else
        iInstance.caches[ iCacheID] = [ value ];
    }
    
  },
  
  /**
    Extracts a value from an array of cached values.
    @param  {Array of Number}   iCachedValues -- The array of cached values
    @returns  {Number|null}     Returns the result extracted from the array of values.
   */
  extractResult: function( iCachedValues) {
    // Derived classes must override
    return null;
  },
  
  /**
    Complete the computation for a given case.
    For the SortDataFunction, this requires sorting the values within each parent case,
    and then caching the extracted results from each parent case group.
    @param  {DG.FormulaContext}   iContext
    @param  {Object}              iEvalContext -- { _case_: , _id_: }
    @param  {Object}              iInstance -- The aggregate function instance from the context.
    @returns  {Number|String|...}
   */
  computeResults: function( iContext, iEvalContext, iInstance) {
    DG.ObjectMap.forEach( iInstance.caches,
                          function( iKey, iCachedValues) {
                            if( iCachedValues.length > 0) {
                              iCachedValues.sort( function( v1, v2) { return v1 - v2; });
                            }
                            iInstance.results[ iKey] = this.extractResult( iCachedValues);
                          }.bind( this));
    return this.queryCache( iContext, iEvalContext, iInstance);
  }

});

