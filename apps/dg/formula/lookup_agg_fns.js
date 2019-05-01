// ==========================================================================
//                    Lookup Aggregate Functions
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
sc_require('formula/function_registry');

/** @class DG.LookupAggFns

  The DG.LookupAggFns object implements aggregate and semi-aggregate
  functions that evaluate the arguments in the context of other cases.
  These functions potentially include first(), last(), prev(), next(), etc.
 */
DG.functionRegistry.registerAggregates({

  /**
    first(expr)
    Returns the value of its argument for the first case in its game/run, or
    the first game/run itself, depending on the context in which it is used.
   */
  first: DG.AggregateFunction.create({

    category: 'DG.Formula.FuncCategoryLookup',
  
    requiredArgs: { min: 1, max: 2 },

    isCaseIndexDependent: function() {
      return true;
    },

    evaluate: function( iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0],
          filterFn = iInstance.argFns[1];

      // Find the first of the specified cases which passes the filter
      function getFirstFilteredCase(iCases) {
        if (!iCases) return null;
        if (!filterFn) return iCases.firstObject();

        var i, tCase, count = iCases.get('length');
        for (i = 0; i < count; ++i) {
          tCase = iCases.objectAt(i);
          if (filterFn(iContext, { _case_: tCase, _id_: tCase.get('id') }))
            return tCase;
        }
      }
      
      // The appropriate evaluation context for the first() argument
      // is the first case, i.e. the case at index 0.
      function getFirstEvalContext( iContext, iEvalContext) {
        var iCase = iEvalContext._case_,
            parentCase = iCase && iCase.get('parent'),
            siblings = parentCase ? parentCase.get('children')
                                  : (iContext && iContext.getPath('collection.cases')),
            children = iCase && iCase.get('children'),
            firstCase = getFirstFilteredCase(siblings),
            tmpEvalContext = { _caseMap_: {} };
        // The appropriate first case depends on the attribute argument.
        // We stash a map of potential first cases into the evaluation context
        // and then upstream clients can choose the appropriate one.
        if (firstCase) {
          tmpEvalContext._caseMap_[firstCase.getPath('collection.id')] = firstCase;
        }
        while (children && children.length > 0) {
          firstCase = getFirstFilteredCase(children);
          if (firstCase) {
            var childCollectionID = firstCase.getPath('collection.id');
            tmpEvalContext._caseMap_[childCollectionID] = firstCase;
          }
          children = firstCase && firstCase.get('children');
        }
        for (; parentCase; parentCase = parentCase.get('parent')) {
          var parentCollectionID = parentCase.getPath('collection.id');
          tmpEvalContext._caseMap_[parentCollectionID] = parentCase;
        }
        tmpEvalContext._id_ = firstCase && firstCase.get('id');
        tmpEvalContext._case_ = firstCase;
        return tmpEvalContext;
      }
      
      var firstEvalContext = valueFn && getFirstEvalContext( iContext, iEvalContext);
      if (firstEvalContext && DG.ObjectMap.length(firstEvalContext._caseMap_))
        return valueFn(iContext, firstEvalContext);
    }
  }),
  
  /**
    last(expr)
    Returns the value of its argument for the last case in its game/run, or
    the last game/run itself, depending on the context in which it is used.
   */
  last: DG.AggregateFunction.create({
  
    category: 'DG.Formula.FuncCategoryLookup',
  
    requiredArgs: { min: 1, max: 2 },

    isCaseIndexDependent: function() {
      return true;
    },

    evaluate: function( iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0],
          filterFn = iInstance.argFns[1];
      
      // Find the last of the specified cases which passes the filter
      function getLastFilteredCase(iCases) {
        if (!iCases) return null;
        if (!filterFn) return iCases.lastObject();

        var i, tCase, count = iCases.get('length');
        for (i = count - 1; i >= 0; --i) {
          tCase = iCases.objectAt(i);
          if (filterFn(iContext, { _case_: tCase, _id_: tCase.get('id') }))
            return tCase;
        }
      }
      
      // The appropriate evaluation context for the last() argument
      // is the last case, i.e. the case at index [length-1].
      function getLastEvalContext( iContext, iEvalContext) {
        var iCase = iEvalContext._case_,
            parentCase = iCase && iCase.get('parent'),
            siblings = parentCase ? parentCase.get('children')
                                  : (iContext && iContext.getPath('collection.cases')),
            children = iCase && iCase.get('children'),
            lastCase = getLastFilteredCase(siblings),
            tmpEvalContext = { _caseMap_: {} };
        // The appropriate last case depends on the attribute argument.
        // We stash a map of potential last cases into the evaluation context
        // and then upstream clients can choose the appropriate one.
        if (lastCase) {
          tmpEvalContext._caseMap_[lastCase.getPath('collection.id')] = lastCase;
        }
        while (children && children.length > 0) {
          lastCase = getLastFilteredCase(children);
          if (lastCase) {
            var childCollectionID = lastCase.getPath('collection.id');
            tmpEvalContext._caseMap_[childCollectionID] = lastCase;
          }
          children = lastCase && lastCase.get('children');
        }
        for (; parentCase; parentCase = parentCase.get('parent')) {
          var parentCollectionID = parentCase.getPath('collection.id');
          tmpEvalContext._caseMap_[parentCollectionID] = parentCase;
        }
        tmpEvalContext._id_ = lastCase && lastCase.get('id');
        tmpEvalContext._case_ = lastCase;
        return tmpEvalContext;
      }
      
      var lastEvalContext = valueFn && getLastEvalContext( iContext, iEvalContext);
      if (lastEvalContext && DG.ObjectMap.length(lastEvalContext._caseMap_))
        return valueFn( iContext, lastEvalContext);
    }
  }),
  
  /**
    next(expr,[default])
    Returns the value of its argument for the next case in its game/run, or
    the next game/run itself, depending on the context in which it is used.
    Returns the optional [default] value if there is no next case, or null 
    if no default is specified.
   */
  next: DG.AggregateFunction.create({
  
    category: 'DG.Formula.FuncCategoryLookup',
  
    requiredArgs: { min: 1, max: 3 },

    isCaseIndexDependent: function() {
      return true;
    },

    evaluate: function( iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0],
          defaultFn = iInstance.argFns[1],
          filterFn = iInstance.argFns[2];
      
      // Find the next case which passes the filter
      function getNextFilteredCase(iCases, iIndex) {
        if (!iCases || (iIndex < 0)) return null;
        if (!filterFn) return iCases.objectAt(iIndex);

        var i, tCase, count = iCases.get('length');
        for (i = iIndex; i < count; ++i) {
          tCase = iCases.objectAt(i);
          if (filterFn(iContext, { _case_: tCase, _id_: tCase.get('id') }))
            return tCase;
        }
      }
      
      // The appropriate evaluation context for the next() argument is
      // the subsequent case, i.e. the case at the subsequent index.
      function getNextEvalContext( iContext, iEvalContext) {
        var iCase = iEvalContext._case_,
            parentCase = iCase && iCase.get('parent'),
            siblings = parentCase ? parentCase.get('children')
                                  : (iContext && iContext.getPath('collection.cases')),
            thisCaseIndex = iContext.getCaseIndex( iEvalContext._id_),  // 1-based index
            nextCase = getNextFilteredCase(siblings, thisCaseIndex),    // 0-based index
            tmpEvalContext = { _caseMap_: {}, _case_: nextCase, _id_: nextCase && nextCase.get('id') };

        // The appropriate next case depends on the attribute argument.
        // We stash a map of potential next cases into the evaluation context
        // and then upstream clients can choose the appropriate one.
        // Note that we we don't support child cases because it's unclear
        // what prev/next refer to among child cases.
        if (nextCase) {
          tmpEvalContext._caseMap_[nextCase.getPath('collection.id')] = nextCase;
          for (; parentCase; parentCase = parentCase.get('parent')) {
            var parentCollectionID = parentCase.getPath('collection.id');
            tmpEvalContext._caseMap_[parentCollectionID] = parentCase;
          }
        }
        return tmpEvalContext;
      }
      
      var nextEvalContext = valueFn && getNextEvalContext( iContext, iEvalContext);
      
      // default to undefined (empty) if no user-specified default
      return nextEvalContext && DG.ObjectMap.length(nextEvalContext._caseMap_)
                    ? valueFn( iContext, nextEvalContext)
                    : defaultFn ? defaultFn( iContext, iEvalContext) : undefined;
    }
  }),
  
  /**
    prev(expr,[default])
    Returns the value of its argument for the previous case in its game/run, or
    the previous game/run itself, depending on the context in which it is used.
    Returns the optional [default] value if there is no next case, or zero if 
    no default is specified.
   */
  prev: DG.AggregateFunction.create({
  
    category: 'DG.Formula.FuncCategoryLookup',
  
    requiredArgs: { min: 1, max: 3 },

    isCaseIndexDependent: function() {
      return true;
    },

    evaluate: function( iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0],
          defaultFn = iInstance.argFns[1],
          filterFn = iInstance.argFns[2];
      
      // Find the previous case which passes the filter
      function getPrevFilteredCase(iCases, iIndex) {
        if (!iCases || (iIndex < 0)) return null;
        if (!filterFn) return iCases.objectAt(iIndex);

        var i, tCase;
        for (i = iIndex; i >= 0; --i) {
          tCase = iCases.objectAt(i);
          if (filterFn(iContext, { _case_: tCase, _id_: tCase.get('id') }))
            return tCase;
        }
      }
      
      // The appropriate evaluation context for the prev() argument
      // is the previous case, i.e. the case at the previous index.
      function getPrevEvalContext( iContext, iEvalContext) {
        var iCase = iEvalContext._case_,
            parentCase = iCase && iCase.get('parent'),
            siblings = parentCase ? parentCase.get('children')
                                  : (iContext && iContext.getPath('collection.cases')),
            thisCaseIndex = iContext.getCaseIndex( iEvalContext._id_),    // 1-based index
            prevCase = getPrevFilteredCase(siblings, thisCaseIndex - 2),  // 0-based index
            tmpEvalContext = { _caseMap_: {}, _case_: prevCase, _id_: prevCase && prevCase.get('id')  };

        // The appropriate prev case depends on the attribute argument.
        // We stash a map of potential prev cases into the evaluation context
        // and then upstream clients can choose the appropriate one.
        // Note that we we don't support child cases because it's unclear
        // what prev/next refer to among child cases.
        if (prevCase) {
          tmpEvalContext._caseMap_[prevCase.getPath('collection.id')] = prevCase;
          for (; parentCase; parentCase = parentCase.get('parent')) {
            var parentCollectionID = parentCase.getPath('collection.id');
            tmpEvalContext._caseMap_[parentCollectionID] = parentCase;
          }
        }
        return tmpEvalContext;
      }
      
      var prevEvalContext = valueFn && getPrevEvalContext( iContext, iEvalContext);

      // default to undefined (empty) if no user-specified default
      return prevEvalContext && DG.ObjectMap.length(prevEvalContext._caseMap_)
                    ? valueFn( iContext, prevEvalContext)
                    : defaultFn ? defaultFn( iContext, iEvalContext) : undefined;
    }
  
  })
});
