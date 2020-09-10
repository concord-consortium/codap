// ==========================================================================
//                      DG.CollectionFormulaContext
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

sc_require('formula/global_formula_context');

/** @class DG.CollectionFormulaContext

  Derived class of DG.FormulaContext which supports references to collection
  attributes as well as global variables (through its DG.GlobalFormulaContext
  base class).

  @extends DG.GlobalFormulaContext
*/
DG.CollectionFormulaContext = DG.GlobalFormulaContext.extend((function() {

  return {

  /**
    Constant used when registering dependencies to indicate that all functions are affected.
    @type {String}
   */
  ALL_FUNCTIONS: '__ALL__',

  /**
    Properties of the formula owner for use by the dependency manager.
    Generally passed in by the client on construction.
    @type {object}
    @type {string}  .type - the type of the owner
    @type {string}  .id - the ID of the owner
    @type {string}  .name - the name of the owner
   */
  ownerSpec: null,

  /**
    The collection for which this CollectionFormulaContext provides bindings.
    Generally passed in by the client on construction.
    @property {DG.CollectionRecord}
   */
  collection: null,

  /**
    Cache of attribute functions which are referenced by the formula.
    @property {Object}  Map from attribute name {String} to ID {Number}
   */
  attrFns: null,

  /**
    Attribute reference counts for each collection.
    Needs to be tracked per aggregate function instance rather than per context.
    @property {Map of CollectionID:AttrReferenceCount pairs}
   */
  collectionAttrRefCounts: null,

  /**
    Cache of information for each aggregate function instance.
    @property {Array of Object}
   */
  aggFnInstances: null,

  /**
    Count of aggregate function instances assigned.
    Used to make sure that instance indices are assigned uniquely.
    @property {Number}
   */
  aggFnCount: 0,

  /**
    Provides access to the DependencyMgr for the data context.
    @property {DG.DependencyMgr}
   */
  dependencyMgr: function() {
    return this.getPath('collection.context.dependencyMgr');
  }.property(),

  /**
    Initialization method.
   */
  init: function() {
    sc_super();

    // register formula-owning nodes on creation
    this.get('dependencyMgr').registerNode(this.get('ownerSpec'));

    // Initializes the caches
    this.clearCaches();
  },

  destroy: function() {
    this.get('dependencyMgr').removeNode(this.get('ownerSpec'));

    sc_super();
  },

  /**
    Called when the parse/compilation changes.
    Clearing the caches prevents them from affecting the new compilation.
   */
  clearCaches: function() {
    this.attrFns = {};
    this.collectionAttrRefCounts = {};
    this.aggFnInstances = [];
    this.aggFnCount = 0;
  }.observes('collection'),

  /**
    Returns the case index for the give case ID.
    @param    {Number}    iCase -- The case being evaluated or its ID
    @returns  {Number}    The index of the case with the specified ID
   */
  getCaseIndex: function( iCase) {
    var caseID, collection;
    if (typeof iCase === 'object') {
      caseID = iCase.id;
      collection = iCase.collection;
    } else {
      caseID = iCase;
      collection = this.collection;
    }
    var map = collection && collection.caseIDToGroupedIndexMap;
    return map && (map[ caseID] + 1); // 1-based index
  },

  /**
    Returns the value of the specified attribute for the specified case.
    @param    {DG.Case}   iCase -- The case from which the value is to be retrieved
    @param    {Number}    iAttrID -- The ID of the attribute whose value is to be retrieved
    @returns  {Object}    Return value can be a Number, String, Boolean, error object, etc.
   */
  getAttrValue: function( iCase, iAttrID) {
    var tValue = iCase && iAttrID && iCase.getTypedValue( iAttrID);
    // Propagate errors via exceptions
    if( tValue instanceof Error) throw tValue;
    return tValue;
  },

  /**
    Returns the attribute in the data context/data set with the specified name.
    @param    {String}    iName -- The name of the attribute to find
    @returns  {DG.AttributeModel}
   */
  getAttributeByName: function( iName) {
    // check the current collection first
    var collection = this.get('collection'),
        attr = collection && collection.getAttributeByName(iName);
    if (attr) return attr;

    // if not in the current collection, check all collections
    var attrs = this.getPath('collection.context.dataSet.attrs'),
        attrCount = attrs && attrs.length,
        i;
    for (i = 0; i < attrCount; ++i) {
      attr = attrs[i];
      if (attr.get('name') === iName) {
        return attr;
      }
    }
    return null;
  },

  /**
    Returns the collection in which the specified attribute resides.
    @param    {DG.AttributeModel} -- the attribute to find
    @returns  {DG.CollectionModel}
   */
  getCollectionForAttribute: function( iAttribute) {
    // check the current collection first
    if (iAttribute.getPath('collection.id') === this.getPath('collection.id'))
      return this.get('collection');

    // if not in the current collection, check all collections
    var collections = this.getPath('collection.context.collections'),
        key = DG.ObjectMap.findKey(collections, function(iKey, iCollection) {
                return iCollection.getAttributeByName(iAttribute.get('name'));
              });
    return key && collections[key];
  },

  /**
    Returns an array of aggregate function indices representing the aggregate
    functions that are on the _functionContextStack at the moment.
    @returns {number[]}
   */
  getAggregateFunctionIndices: function() {
    var i, fnContext,
        fnContextLength = this._functionContextStack.length,
        aggFnIndices = [];
    for (i = 0; i < fnContextLength; ++i) {
      fnContext = this._functionContextStack[i];
      if (fnContext.isAggregate && (fnContext.aggFnIndex != null)) {
        aggFnIndices.push(fnContext.aggFnIndex);
      }
    }
    return aggFnIndices;
  },

  /**
    Called when the formula is about to be recompiled to clear any cached data.
   */
  willCompile: function() {
    sc_super();

    // clear dependencies so they can be pruned after compilation
    this.get('dependencyMgr')._clearDependencies(this.get('ownerSpec'));
  },

  /**
    Called when the formula has been recompiled to clear any stale dependencies.
    Derived classes may override as appropriate.
   */
  completeCompile: function() {
    sc_super();

    // prune (remove) prior dependencies that are no longer extant
    this.get('dependencyMgr')._pruneDependencies(this.get('ownerSpec'));
  },

  /**
    Called when a dependency is identified during compilation.
    @param {object}   iDependency
    @param {object}   .dependentSpec - the specs of the node that is dependant
    @param {string}     .type - the type of the node that is dependant
    @param {string}     .id - the id of the node that is dependant
    @param {string}     .name - the name of the node that is dependant
    @param {object}   .independentSpec - the specs of the node being depended upon
    @param {string}     .type - the type of the node being depended upon
    @param {string}     .id - the id of the node being depended upon
    @param {string}     .name - the name of the node being depended upon
    @param {number[]} .aggFnIndices - array of aggregate function indices
    @param {object}   .dependentContext - the formula context for the dependent node
   */
  registerDependency: function(iDependency) {
    var dependency = SC.clone(iDependency);
    if (!dependency.dependentSpec)
      dependency.dependentSpec = this.get('ownerSpec');
    DG.assert(dependency.independentSpec);
    if (!dependency.aggFnIndices) {
      dependency.aggFnIndices = this.getAggregateFunctionIndices();
    }
    else if (dependency.aggFnIndices === this.ALL_FUNCTIONS) {
      dependency.aggFnIndices = [];
      for (var i = 0; i < this.aggFnInstances.length; ++i) {
        dependency.aggFnIndices.push(i);
      }
    }
    if (!dependency.dependentContext)
      dependency.dependentContext = this;
    this.get('dependencyMgr').registerDependency(dependency);
  },

  /**
    Invalidation function for use with the dependency manager.
    Called by the dependency manager when invalidating nodes as a result
    of tracked dependencies.
    @param {object}     ioResult
    @param {object}     iDependent
    @param {object}     iDependency
    @param {DG.Case[]}  iCases - array of cases affected
                                 if no cases specified, all cases are affected
    @param {boolean}    iForceAggregate - treat the dependency as an aggregate dependency
   */
  invalidateDependent: function(ioResult, iDependent, iDependency, iCases, iForceAggregate) {
    var attributeID = iDependent && iDependent.id,
        attribute = attributeID && DG.Attribute.getAttributeByID(attributeID);

    // invalidate specific cases when there's a simple dependency
    if (attribute && !iForceAggregate && iDependency.simpleDependency) {
      attribute.invalidateCases(iCases);
      ioResult.simpleDependencies.push(iDependent);
    }
    // Invalidate all cases when there's an aggregate dependency
    // or if we're forcing all dependencies to be treated as aggregate.
    // The latter happens when we're processing simple dependencies among
    // aggregate function arguments.
    if (attribute && (iForceAggregate || iDependency.aggFnIndices.length)) {
      attribute.invalidateCases(null, iDependency.aggFnIndices);
      ioResult.aggregateDependencies.push(iDependent);
    }

    // If we're invalidating a lookup...() function as a result of an invalidation
    // cascade in the source context, start an invalidation cascade locally.
    var dependencyMgr = this.get('dependencyMgr');
    if (iDependency.srcDependencyMgr && (dependencyMgr !== iDependency.srcDependencyMgr)) {
      dependencyMgr.invalidateDependentsOf([iDependent]);
    }
  },

  /**
    Compiles a variable reference into the JavaScript code for accessing
    the appropriate value. For the CollectionFormulaContext, this means
    binding to 'caseIndex' and any collection attributes by name.
    @param    {String}    iName -- The variable name to be bound
    @returns  {String}    The JavaScript code for accessing the value
    @throws   {VarReferenceError} Base class throws VarReferenceError for
                                  variable names that are not recognized.
   */
  compileVariable: function( iName, iAggFnIndices) {
    // Client is responsible for putting '_id_' into the evaluation context.
    // This context's getCaseIndex() method provides the implementation,
    // which requires the caseIDToIndexMap, which is built on demand.
    if( iName === 'caseIndex') {
      // register the 'caseIndex' dependency for invalidation
      this.registerDependency({ independentSpec: {
                                  type: DG.DEP_TYPE_SPECIAL,
                                  id: 'caseIndex',
                                  name: 'caseIndex'
                                },
                                aggFnIndices: iAggFnIndices
                              });
      return 'c.getCaseIndex(e._case_)';
    }

    var attribute = this.getAttributeByName(iName),
        formulaCollection = this.get('collection'),
        collection = attribute && this.getCollectionForAttribute(attribute),
        collectionID = collection && collection.get('id');

    function isValidAttrReference() {
      // allow child attr references inside aggregate functions
      if (iAggFnIndices && iAggFnIndices.length) return true;
      if (collection && collection.isDescendantOf(formulaCollection))
        return false;
      // not one of our child collections, must be okay
      return true;
    }

    if( attribute) {
      // register the dependency for tracking/invalidation purposes
      this.registerDependency({ independentSpec: {
                                  type: DG.DEP_TYPE_ATTRIBUTE,
                                  id: attribute.get('id'),
                                  name: iName
                                },
                                aggFnIndices: iAggFnIndices
                              });

      // Having identified the attribute to be referenced, we attach a
      // function that can access the appropriate value, making use of
      // JavaScript variable scoping to make sure that the new function has
      // access to the local variable named 'attributeID'. We attach this
      // function to a map of referenced attributes in the context named 'attrFns'.
      // (This is code that is generated by the app for the express purpose
      // of machine consumption, so we use terse variable names for simplicity.)
      // The generated JavaScript code then executes the function dereferenced
      // from the context with code that looks something like
      // 'c.attrFns["attrName"](e)', where the case is passed in at
      // evaluation time.
      // Client is responsible for putting '_case_' into evaluation context.
      var attributeID = attribute.get('id');
      this.attrFns[ iName] = isValidAttrReference()
                              ? function(iEvalContext) {
                                  var tCase = iEvalContext._caseMap_
                                                ? iEvalContext._caseMap_[collectionID]
                                                : iEvalContext._case_,
                                      tValue = tCase && tCase.getTypedValue(attributeID);
                                  // Propagate error values immediately
                                  if( tValue instanceof Error) throw tValue;
                                  return tValue;
                                }
                              : function(iEvalContext) {
                                  throw new DG.HierReferenceError(iName);
                                };

      // Track the number of attribute references for each collection
      // This needs to be tracked per aggregate function instance so
      // that mean(weight)/mean(game) behaves appropriately.
      collectionID = collection.get('id');
      var refCount = this.collectionAttrRefCounts[ collectionID] || 0;
      this.collectionAttrRefCounts[ collectionID]  = refCount + 1;

      // The function built above captures the attribute ID at compile time,
      // but it must be evaluated multiple times for different cases. Thus,
      // the function takes a case reference, which the client is required
      // to have placed into the evaluation context.
      return 'c.attrFns["' + iName + '"](e)';
    }
    return sc_super();
  },

  /**
    Direct evaluation of the expression without an intervening compilation.
    This is unlikely to be used for case attribute formulas, where the formula
    is generally evaluated enough times to make compilation to JavaScript
    worthwhile, but we support it for consistency and completeness.
    @param    {String}    iName -- The variable name to be bound
    @returns  {Object}    Return value can be a Number, String, Boolean, error object, etc.
    @throws   {VarReferenceError} Base class throws VarReferenceError for
                                  variable names that are not recognized.
   */
  evaluateVariable: function( iName, iEvalContext) {
    // Client is responsible for putting '_id_' into the evaluation context.
    // This context's getCaseIndex() method provides the implementation,
    // which requires the caseIDToIndexMap, which is built on demand.
    if( iName === 'caseIndex') return this.getCaseIndex( iEvalContext._id_);

    // Client is responsible for putting '_case_' into evaluation context.
    // This context's getAttrValue() method provides the implementation.
    var collection = this.get('collection'),
        attribute = collection && collection.getAttributeByName( iName),
        attributeID = attribute && attribute.get('id');
    if( attributeID) return this.getAttrValue( iEvalContext._case_, attributeID);

    return sc_super();
  },

  /**
    Returns the collection whose cases should be iterated when evaluating
    a particular aggregate function instance; depends on the arguments of
    the aggregate functions involved. Currently computed formula-wide, but
    ultimately needs to be computed separately for each aggregate function
    depending on its arguments.
    @returns  {DG.CollectionClient}   The whose cases should be iterated
   */
  getCollectionToIterate: function() {
    var collections = this.getPath('collection.context.dataSet.collectionOrder'),
        collectionCount = collections.length,
        i, collection, collectionID;
    // loop from child collection to parent collections
    for (i = collectionCount - 1; i >= 0; --i) {
      collection = collections[i];
      collectionID = collection.get('id');
      if (this.collectionAttrRefCounts[collectionID])
        return collection;
    }
    return this.get('collection');
  },

  /**
    Returns true if this context's formula contains aggregate functions, false otherwise.
    @property {Boolean}
   */
  hasAggregates: function() {
    return this.aggFnCount > 0;
  }.property('aggFnCount'),

  /**
    Returns true if the specified function name refers to an aggregate function.
   */
  isAggregate: function( iName) {
    return DG.functionRegistry.isAggregate(iName);
  },

  /**
    Builds the array of argument expressions.
   */
  marshalArguments: function( iAggregateFn, iEvalContext, iInstance) {
    var i, argCount = iInstance.args.length,
        reqArgs = iAggregateFn.get('requiredArgs'),
        aggFnArgCount = Math.min(argCount, reqArgs.max),
        argCountWithFilter = aggFnArgCount + 1;
    iInstance.argFns = [];
    for( i = 0; i < aggFnArgCount; ++i) {
      iInstance.argFns.push( DG.FormulaContext.createContextFunction( iInstance.args[i]));
    }

    // if an extra argument was specified, assume it's a filter argument
    if (argCount >= argCountWithFilter)
      iInstance.filterFn = DG.FormulaContext.createContextFunction( iInstance.args[argCountWithFilter-1]);
  },

  validateArguments: function( iAggregateFn, iEvalContext, iInstance) {
    // Make sure we have a valid number of arguments
    var reqArgs = iAggregateFn.get('requiredArgs'),
        maxArgsWithFilter = reqArgs.max + 1,
        providedArgCount = iInstance.args.length,
        marshaledArgCount = iInstance.argFns.length;
    if( (marshaledArgCount < reqArgs.min) || (providedArgCount > maxArgsWithFilter))
      throw new DG.FuncArgsError( iInstance.name, { min: reqArgs.min, max: maxArgsWithFilter });
  },

  /**
    Evaluates the specified aggregate function (specified by internal index).
    Marshals the function arguments into evaluable form and dispatches to
    the appropriate aggregate function.

    @param    {Number}          iAggFnIndex -- The internal instance index.
    @returns  {Number|String|?} The result of the aggregate function evaluation
   */
  evalAggregate: function( iEvalContext, iAggFnIndex) {

    var instance = this.aggFnInstances[ iAggFnIndex];

    var aggregateFn = DG.functionRegistry.getAggregate(instance.name),
        result = aggregateFn && aggregateFn.queryCache( this, iEvalContext, instance);

    // Return the cached result if there is one
    if( result !== undefined)
      return result;

    // Marshal the arguments into individually callable functions.
    this.marshalArguments(aggregateFn, iEvalContext, instance);

    // Make sure we have a valid number of arguments
    this.validateArguments(aggregateFn, iEvalContext, instance);

    // Invoke the aggregate function with context and instance arguments
    result = aggregateFn.evaluate( this, iEvalContext, instance);

    return result;
  },

  /**
    Override base class function to include the aggregate function index
    in the function context so that individual aggregate function dependencies
    can be tracked.
    @param  {Object}  iFunctionContext - the function context for the current function
   */
  beginFunctionContext: function(iFunctionContext) {
    if (iFunctionContext.isAggregate) {
      iFunctionContext.aggFnIndex = this.aggFnCount;
    }
    sc_super();
  },

  /**
    Invalidate the caches for the aggregate functions that correspond to the
    specified indices. This is called during while traversing the dependency
    graph when aggregate function dependents are encountered.
    @param  {Number[]}  iFunctionIndices - array of aggregate function indices
   */
  invalidateFunctions: function(iFunctionIndices) {
    if (iFunctionIndices) {
      iFunctionIndices.forEach(function(iAggFnIndex) {
        var instance = this.aggFnInstances && this.aggFnInstances[ iAggFnIndex];
        if (instance) {
          instance.caches = {};
          instance.results = {};
        }
      }.bind(this));
    }
  },

  /**
    Compiles a function reference into the JavaScript code for evaluating
    the appropriate function. For the base FormulaContext, this means
    binding to global functions such as ln(), log(), round(), etc. as well
    as the standard JavaScript Math functions (sin(), cos(), atan()), etc.
    This CollectionFormulaContext adds support for aggregate functions that
    compute over the attributes and cases of the collection.

    @param    {String}    iName -- The name of the function to be called.
    @param    {String[]}  iArgs -- array of arguments to the function
    @param    {Number[]}  iAggFnIndices -- array of aggregate function indices
                            indicating the aggregate function call stack, which
                            determines the aggregates that must be invalidated
                            when a dependent changes.
    @returns  {String}    The JavaScript code for calling the specified function
    @throws   {DG.FuncReferenceError} Throws DG.FuncReferenceError for function
                                      names that are not recognized.
   */
  compileFunction: function( iName, iArgs, iAggFnIndices) {

    // If this is an aggregate function reference, dispatch it as such.
    if( this.isAggregate( iName)) {

      // Some functions (e.g. count()) have an implicit dependency on 'caseIndex'
      var _fn = DG.functionRegistry.getAggregate(iName);
      if (_fn && _fn.isCaseIndexDependent(iArgs)) {
        // register the 'caseIndex' dependency for invalidation
        this.registerDependency({ independentSpec: {
                                    type: DG.DEP_TYPE_SPECIAL,
                                    id: 'caseIndex',
                                    name: 'caseIndex'
                                  },
                                  aggFnIndices: iAggFnIndices
                                });
      }

      // Internal aggregate function instances are identified by auto-generated index.
      // This way, mean(x)/mean(y) results in two separate instances.
      var aggFnIndex = this.aggFnCount++;

      // We push the name and arguments into the instance rather than marshaling
      // them into JavaScript text for the JavaScript interpreter.
      this.aggFnInstances.push({ index: aggFnIndex, name: iName, args: iArgs,
                                  aggFnIndices: iAggFnIndices });

      // The JavaScript code simply passes in the instance index.
      // At evaluation-time, evalAggregate() can extract the contents of the instance.
      return 'c.evalAggregate(e,' + aggFnIndex + ')';
    }

    // base class handles non-aggregate functions
    return sc_super();
  }

  }; // end of closure return statement

}()));
