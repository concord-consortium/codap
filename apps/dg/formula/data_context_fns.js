// ==========================================================================
//                    Data Context Lookup Functions
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

/** @class DG.DataContextLookupFns

  The DG.DataContextLookupFns object implements aggregate and semi-aggregate
  functions that evaluate the arguments in a specified data context.
  These functions potentially include lookupByKey() and lookupByIndex(), etc.
 */
DG.functionRegistry.registerAggregates((function() {

  /** @class DG.LookupDataSetError

    Error class for data context lookup errors.

    @extends Error
  */
  var LookupDataSetError = function(iName) {
    this.name = 'EvalError';
    this.message = 'DG.Formula.LookupDataSetError.message'.loc(iName);
    this.description = 'DG.Formula.LookupDataSetError.description'.loc(iName);
    this.reference = iName;
  };
  LookupDataSetError.prototype = new Error();
  LookupDataSetError.prototype.constructor = LookupDataSetError;

  /** @class DG.LookupAttrError

    Error class for attribute lookup errors in data context lookup functions.

    @extends Error
  */
  var LookupAttrError = function(iAttrName, iContextName) {
    this.name = 'EvalError';
    this.message = 'DG.Formula.LookupAttrError.message'.loc(iAttrName, iContextName);
    this.description = 'DG.Formula.LookupAttrError.description'.loc(iAttrName, iContextName);
    this.reference = iAttrName;
  };
  LookupAttrError.prototype = new Error();
  LookupAttrError.prototype.constructor = LookupAttrError;

  /*
    Utility function for binding an attribute reference in a
    separate data context.
   */
  function bindContextVar(iDataContext, iAttrFn, iContext, iEvalContext) {
    var attrName = iAttrFn && iAttrFn(iContext, iEvalContext),
        attrRef = iDataContext && attrName &&
                    iDataContext.getAttrRefByName(attrName),
        attrCollection = attrRef && attrRef.collection,
        attr = attrRef && attrRef.attribute,
        attrID = attr && attr.get('id'),
        binding = {
          isValid: !!iDataContext && !!attrCollection && !!attrID,
          dataContext: iDataContext,
          collection: attrCollection,
          attribute: attr,
          attributeName: attrName,
          attributeID: attrID
        };
    if (!attrID) throw new LookupAttrError(attrName, iDataContext.get('title'));
    return binding;
  }

  /*
    Utility function for registering a dependency between data
    contexts -- adds the dependency to both dependency managers.
   */
  function registerDependency(iBinding, iContext, iInstance) {
    if (iBinding.isValid) {
      var srcDependencyMgr = iBinding.dataContext &&
                              iBinding.dataContext.get('dependencyMgr'),
          dependency = {
            dependentSpec: iContext.get('ownerSpec'),
            independentSpec: {
              type: DG.DEP_TYPE_ATTRIBUTE,
              name: iBinding.attributeName,
              id: iBinding.attributeID
            },
            aggFnIndices: iInstance.aggFnIndices,
            dependentContext: iContext,
            srcDependencyMgr: srcDependencyMgr
          };
      // register with dependent/destination
      iContext.registerDependency(dependency);
      // register with independent/source
      if (srcDependencyMgr) {
        srcDependencyMgr.findOrRegisterNode(dependency.dependentSpec);
        srcDependencyMgr.registerDependency(dependency);
      }
    }
  }

  return {

  /**
    lookupByIndex(iSrcContextName, iSrcValueAttrName, iCaseIndex)
    Returns the value of the attribute named iSrcValueAttrName in the
    data context named iSrcContextName for the case at index iCaseIndex.
   */
  lookupByIndex: DG.AggregateFunction.create({
  
    category: 'DG.Formula.FuncCategoryLookup',
  
    requiredArgs: { min: 3, max: 3 },

    /**
      Evaluates the aggregate function and returns a computed result for the specified case.
      @param  {DG.FormulaContext}   iContext
      @param  {Object}              iEvalContext -- { _case_: , _id_: }
      @param  {Object}              iInstance -- The aggregate function instance from the context.
      @returns  {Number|String|...}
     */
    evaluate: function( iContext, iEvalContext, iInstance) {

      var binding = {};
      if (!iInstance.caches) iInstance.caches = {};

      if (!iInstance.caches.binding) {
        var contextFn = iInstance.argFns[0],
            contextName = contextFn && contextFn(iContext, iEvalContext),
            dataContext = contextName &&
                            DG.currDocumentController().getContextByTitle(contextName);
        if (!dataContext) throw new LookupDataSetError(contextName);

        binding = bindContextVar(dataContext, iInstance.argFns[1], iContext, iEvalContext);
        registerDependency(binding, iContext, iInstance);
        iInstance.caches.binding = binding;

        if (binding.isValid) {
          var srcDependencyMgr = binding.dataContext &&
                                  binding.dataContext.get('dependencyMgr'),
              dependency = {
                dependentSpec: iContext.get('ownerSpec'),
                independentSpec: {
                  type: DG.DEP_TYPE_ATTRIBUTE,
                  name: binding.attributeName,
                  id: binding.attributeID
                },
                aggFnIndices: iInstance.aggFnIndices,
                dependentContext: iContext,
                srcDependencyMgr: srcDependencyMgr
              };
          // register with dependent/destination
          iContext.registerDependency(dependency);
          // register with independent/source
          if (srcDependencyMgr) {
            srcDependencyMgr.findOrRegisterNode(dependency.dependentSpec);
            srcDependencyMgr.registerDependency(dependency);
          }
        }
      }
      else {
        binding = iInstance.caches.binding;
      }

      var cases = binding.collection &&
                    binding.collection.getPath('casesController.arrangedObjects'),
          caseIndexFn = iInstance.argFns[2],
          reqCaseIndex = caseIndexFn && caseIndexFn(iContext, iEvalContext),
          tCase = cases && cases.objectAt(reqCaseIndex-1);
      return (tCase && binding.attributeID && tCase.getValue(binding.attributeID)) || '';
    }

  }),
  
  /**
    lookupByKey(iSrcContextName, iSrcValueAttrName, iSrcKeyAttrName, iKeyValue)
    Returns the value of the attribute named iSrcValueAttrName in the
    data context named iSrcContextName for the first case that has a value for
    iSrcKeyAttrName that matches iKeyValue.
   */
  lookupByKey: DG.AggregateFunction.create({
  
    category: 'DG.Formula.FuncCategoryLookup',
  
    requiredArgs: { min: 4, max: 4 },

    evaluate: function( iContext, iEvalContext, iInstance) {

      var valueBinding = {},
          keyBinding = {},
          contextFn, contextName,
          dataContext;
      if (!iInstance.caches) iInstance.caches = {};

      if (!iInstance.caches.valueBinding || !iInstance.caches.keyBinding) {
        contextFn = iInstance.argFns[0];
        contextName = contextFn && contextFn(iContext, iEvalContext);
        dataContext = contextName &&
                        DG.currDocumentController().getContextByTitle(contextName);
        if (!dataContext) throw new LookupDataSetError(contextName);
      }
      if (!iInstance.caches.valueBinding) {
        valueBinding = bindContextVar(dataContext, iInstance.argFns[1],
                                      iContext, iEvalContext);
        registerDependency(valueBinding, iContext, iInstance);
        iInstance.caches.valueBinding = valueBinding;
      }
      else {
        valueBinding = iInstance.caches.valueBinding;
      }

      if (!iInstance.caches.keyBinding) {
        keyBinding = bindContextVar(dataContext, iInstance.argFns[2],
                                      iContext, iEvalContext);
        registerDependency(keyBinding, iContext, iInstance);
        iInstance.caches.keyBinding = keyBinding;
      }
      else {
        keyBinding = iInstance.caches.keyBinding;
      }

      if (!iInstance.caches.keyValueMap) {
        var keyValueMap = {},
            cases = keyBinding.collection &&
                      keyBinding.collection.getPath('casesController.arrangedObjects');
        if (cases) {
          cases.forEach(function(iCase) {
            var key = iCase && iCase.getValue(keyBinding.attributeID),
                value = iCase && iCase.getValue(valueBinding.attributeID);
            if (keyValueMap[key] == null)
              keyValueMap[key] = value;
          });
        }
        iInstance.caches.keyValueMap = keyValueMap;
      }

      var keyValueFn = iInstance.argFns[3],
          keyValue = keyValueFn && keyValueFn(iContext, iEvalContext);
      return iInstance.caches.keyValueMap[keyValue];
    }
  })
  
  };
})());
