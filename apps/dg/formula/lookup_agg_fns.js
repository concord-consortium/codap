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
sc_require('formula/collection_formula_context');

/** @class DG.LookupAggFns

  The DG.LookupAggFns object implements aggregate and semi-aggregate
  functions that evaluate the arguments in the context of other cases.
  These functions potentially include first(), last(), prev(), next(), etc.
 */
DG.LookupAggFns = {

  /**
    first(expr)
    Returns the value of its argument for the first case in its game/run, or
    the first game/run itself, depending on the context in which it is used.
   */
  first: DG.AggregateFunction.create({
  
    requiredArgs: { min: 1, max: 1 },

    evaluate: function( iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0];
      
      // The appropriate evaluation context for the first() argument
      // is the first case, i.e. the case at index 0.
      function getFirstEvalContext( iContext, iEvalContext) {
        var iCase = iEvalContext._case_,
            parentCase = iCase && iCase.get('parent'),
            siblings = parentCase ? parentCase.get('children')
                                  : iContext && iContext.getPath('collection.cases'),
            children = iCase && iCase.get('children'),
            firstCase = siblings && siblings.firstObject(),
            tmpEvalContext = firstCase
                                ? { _case_: firstCase, _id_: firstCase.get('id') }
                                : null;
        // If the formula is at the parent collection level but
        // the attribute being referenced is at the child level,
        // then the "first case" is different. We handle that
        // possibility by stashing a separate _childCase_
        // reference in the returned evaluation context.
        if( children)
          tmpEvalContext._childCase_ = children.firstObject();
        return tmpEvalContext;
      }
      
      var firstEvalContext = valueFn && getFirstEvalContext( iContext, iEvalContext);
      
      return firstEvalContext
                    ? valueFn( iContext, firstEvalContext)
                    : undefined;
    }
  }),
  
  /**
    last(expr)
    Returns the value of its argument for the last case in its game/run, or
    the last game/run itself, depending on the context in which it is used.
   */
  last: DG.AggregateFunction.create({
  
    requiredArgs: { min: 1, max: 1 },

    evaluate: function( iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0];
      
      // The appropriate evaluation context for the last() argument
      // is the last case, i.e. the case at index [length-1].
      function getLastEvalContext( iContext, iEvalContext) {
        var iCase = iEvalContext._case_,
            parentCase = iCase && iCase.get('parent'),
            siblings = parentCase ? parentCase.get('children')
                                  : iContext && iContext.getPath('collection.cases'),
            children = iCase && iCase.get('children'),
            lastCase = siblings && siblings.lastObject(),
            tmpEvalContext = lastCase
                                ? { _case_: lastCase, _id_: lastCase.get('id') }
                                : null;
        // If the formula is at the parent collection level but
        // the attribute being referenced is at the child level,
        // then the "last case" is different. We handle that
        // possibility by stashing a separate _childCase_
        // reference in the returned evaluation context.
        if( children)
          tmpEvalContext._childCase_ = children.lastObject();
        return tmpEvalContext;
      }
      
      var lastEvalContext = valueFn && getLastEvalContext( iContext, iEvalContext);
      
      return lastEvalContext
                    ? valueFn( iContext, lastEvalContext)
                    : undefined;
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
  
    requiredArgs: { min: 1, max: 2 },

    evaluate: function( iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0],
          defaultFn = iInstance.argFns[1];
      
      // The appropriate evaluation context for the next() argument is
      // the subsequent case, i.e. the case at the subsequent index.
      function getNextEvalContext( iContext, iEvalContext) {
        var parentCase = iEvalContext._case_ && iEvalContext._case_.get('parent'),
            children = parentCase && parentCase.get('children'),
            caseCount = children && children.get('length'),
            thisCaseIndex = iContext.getCaseIndex( iEvalContext._id_),  // 1-based index
            nextCase = children && (thisCaseIndex < caseCount)
                            ? children.objectAt( thisCaseIndex) // 0-based index
                            : null;
        return nextCase ? { _case_: nextCase, _id_: nextCase.get('id') } : null;
      }
      
      var nextEvalContext = valueFn && getNextEvalContext( iContext, iEvalContext);
      
      // default to undefined (empty) if no user-specified default
      return nextEvalContext
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
  
    requiredArgs: { min: 1, max: 2 },

    evaluate: function( iContext, iEvalContext, iInstance) {
      var valueFn = iInstance.argFns[0],
          defaultFn = iInstance.argFns[1];
      
      // The appropriate evaluation context for the prev() argument
      // is the previous case, i.e. the case at the previous index.
      function getPrevEvalContext( iContext, iEvalContext) {
        var parentCase = iEvalContext._case_ && iEvalContext._case_.get('parent'),
            children = parentCase && parentCase.get('children'),
            thisCaseIndex = iContext.getCaseIndex( iEvalContext._id_),  // 1-based index
            prevCase = children && (thisCaseIndex >= 2)
                            ? children.objectAt( thisCaseIndex - 2)  // 0-based index
                            : null;
        return prevCase ? { _case_: prevCase, _id_: prevCase.get('id') } : null;
      }
      
      var prevEvalContext = valueFn && getPrevEvalContext( iContext, iEvalContext);

      // default to undefined (empty) if no user-specified default
      return prevEvalContext
                    ? valueFn( iContext, prevEvalContext)
                    : defaultFn ? defaultFn( iContext, iEvalContext) : undefined;
    }
  
  })
  
};

DG.CollectionFormulaContext.registerAggFnModule( DG.LookupAggFns);
