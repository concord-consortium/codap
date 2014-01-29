// ==========================================================================
//                      DG.CollectionFormulaContext
//  
//  Author:   Kirk Swenson
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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
sc_require('formula/global_formula_context');

/** @class DG.CollectionFormulaContext

  Derived class of DG.FormulaContext which supports references to collection
  attributes as well as global variables (through its DG.GlobalFormulaContext
  base class).

  @extends DG.GlobalFormulaContext
*/
DG.CollectionFormulaContext = DG.GlobalFormulaContext.extend({

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
    Initialization method.
   */
  init: function() {
    sc_super();
    
    // Initializes the caches
    this.clearCaches();
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
  },
  
  /**
    Returns the case index for the give case ID.
    @param    {Number}    iCaseID -- The ID of the case being evaluated
    @returns  {Number}    The index of the case with the specified ID
   */
  getCaseIndex: function( iCaseID) {
    var map = this.collection.caseIDToIndexMap;
    return map && (map[ iCaseID] + 1); // 1-based index
  },

  /**
    Returns the value of the specified attribute for the specified case.
    @param    {DG.Case}   iCase -- The case from which the value is to be retrieved
    @param    {Number}    iAttrID -- The ID of the attribute whose value is to be retrieved
    @returns  {Object}    Return value can be a Number, String, Boolean, error object, etc.
   */
  getAttrValue: function( iCase, iAttrID) {
    var tValue = iCase && iAttrID && iCase.getValue( iAttrID);
    // Propagate errors via exceptions
    if( tValue instanceof Error) throw tValue;
    return tValue;
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
  compileVariable: function( iName) {
    // Client is responsible for putting '_id_' into the evaluation context.
    // This context's getCaseIndex() method provides the implementation,
    // which requires the caseIDToIndexMap, which is built on demand.
    if( iName === 'caseIndex') return 'c.getCaseIndex(e._id_)';
    
    var parent, child,
        // Check if the attribute is in the collection which owns the formula
        collection = this.get('collection'),
        attribute = collection && collection.getAttributeByName( iName);

    // Search in parent collections. Child collection formulas can
    // reference parent collection attributes unambiguously.
    if( SC.none( attribute)) {
      parent = collection && collection.get('parent');
      for( parent; !SC.none(parent) && SC.none(attribute); parent = parent.get('parent')) {
        attribute = parent && parent.getAttributeByName( iName);
        if( !SC.none( attribute)) {
          collection = parent;
          break;
        }
      }
    }

    // Search in child collections. Parent collection formulas can only reference
    // child collection attributes in the context of aggregate functions.
    if( SC.none( attribute)) {
      var children = this.getPath('collection.children'),
          childCount = children && children.get('length');
      for( var i = 0; i < childCount; ++i) {
        child = children.objectAt( i);
        attribute = child && child.getAttributeByName( iName);
        if( !SC.none( attribute)) {
          collection = child;
          break;
        }
      }
    }

    if( attribute) {
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
      this.attrFns[ iName] = function( iEvalContext) {
                                  // While code above potentially supports multiple levels,
                                  // this code presumes only a single parent level.
                                  var iCase = iEvalContext._case_,
                                      tCase = (child && iEvalContext._childCase_) ||
                                              (parent && iCase.get('parent')) ||
                                              iCase,
                                      tValue = tCase && tCase.getValue( attributeID);
                                  // Propagate error values immediately
                                  if( tValue instanceof Error) throw tValue;
                                  return tValue;
                                };
      
      // Track the number of attribute references for each collection
      // This needs to be tracked per aggregate function instance so
      // that mean(weight)/mean(game) behaves appropriately.
      var collectionID = collection.get('id'),
          refCount = this.collectionAttrRefCounts[ collectionID] || 0;
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
    var collection = this.get('collection'),
        childCollections = collection && collection.get('children'),
        childCount = childCollections && childCollections.get('length');

    // First check for child collection references
    for( var i = 0; i < childCount; ++i) {
      var childCollection = childCollections.objectAt( i),
          childID = childCollection && childCollection.get('id');
      if( this.collectionAttrRefCounts[ childID] > 0)
        return childCollection;
    }

    // Then check for current collection references
    var collectionID = collection && collection.get('id');
    if( this.collectionAttrRefCounts[ collectionID] > 0)
      return collection;
    
    // Finally, check for parent collection references
    var parentCollection = collection && collection.get('parent'),
        parentID = parentCollection && parentCollection.get('id');
    if( this.collectionAttrRefCounts[ parentID] > 0)
      return parentCollection;

    // If no attribute references, iterate the current collection
    // (i.e. the one containing the formula).
    return collection;
  },
  
  /**
    Object which contains aggregate function implementations.
    Note that by defining this as an object here, we're defining it
    as part of the class definition, which means it will be part of
    the prototype that is shared across object instances.
    @property {Map of {Name: Function} pairs}
   */
  aggFns: {},
  
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
    return SC.kindOf( this.aggFns[ iName], DG.AggregateFunction);
  },
  
  /**
    Evaluates the specified aggregate function (specified by internal index).
    Marshals the function arguments into evaluable form and dispatches to
    the appropriate aggregate function.
    
    @param    {Number}          iAggFnIndex -- The internal instance index.
    @returns  {Number|String|?} The result of the aggregate function evaluation
   */
  evalAggregate: function( iEvalContext, iAggFnIndex) {

    // Bail if we have bogus inputs
    if( !iEvalContext._case_ || SC.none( iEvalContext._id_))
      return null;

    var instance = this.aggFnInstances[ iAggFnIndex];
    instance.results = {}; // Disable caching until we have invalidation mechanism
    
    var aggregateFn = this.aggFns[ instance.name],
        result = aggregateFn && aggregateFn.queryCache( this, iEvalContext, instance),
        i, argCount = instance.args.length;

    // Return the cached result if there is one
    if( result !== undefined)
      return result;
    
    // Marshal the arguments into individually callable functions.
    instance.argFns = [];
    for( i = 0; i < argCount; ++i) {
      instance.argFns.push( DG.FormulaContext.createContextFunction( instance.args[i]));
    }
    
    // Make sure we have a valid number of arguments
    var reqArgs = aggregateFn.get('requiredArgs');
    if( (argCount < reqArgs.min) || (reqArgs.max < argCount))
      throw new DG.FuncArgsError( instance.name, reqArgs);
    
    // Invoke the aggregate function with context and instance arguments
    return aggregateFn.evaluate( this, iEvalContext, instance);
  },
  
  /**
    Compiles a function reference into the JavaScript code for evaluating
    the appropriate function. For the base FormulaContext, this means
    binding to global functions such as ln(), log(), round(), etc. as well
    as the standard JavaScript Math functions (sin(), cos(), atan()), etc.
    This CollectionFormulaContext adds support for aggregate functions that
    compute over the attributes and cases of the collection.
    
    @param    {String}    iName -- The name of the function to be called.
    @param    {Array}     iArgs -- the arguments to the function
    @returns  {String}    The JavaScript code for calling the specified function
    @throws   {DG.FuncReferenceError} Throws DG.FuncReferenceError for function
                                      names that are not recognized.
   */
  compileFunction: function( iName, iArgs) {
  
    // If this is an aggregate function reference, dispatch it as such.
    if( this.isAggregate( iName)) {
    
      // Internal aggregate function instances are identified by auto-generated index.
      // This way, mean(x)/mean(y) results in two separate instances.
      var aggFnIndex = this.aggFnCount++;
      
      // We push the name and arguments into the instance rather than marshaling
      // them into JavaScript text for the JavaScript interpreter.
      this.aggFnInstances.push({ name: iName, args: iArgs });
      
      // The JavaScript code simply passes in the instance index.
      // At evaluation-time, evalAggregate() can extract the contents of the instance.
      return 'c.evalAggregate(e,' + aggFnIndex + ')';
    }
    
    // base class handles non-aggregate functions
    return sc_super();
  }
});

/**
  "Class" method for registering a module of aggregate functions.
  Assumes that the properties of iModule are "derived classes" of
  DG.AggregateFunction, whose name can be extracted from the names
  of the properties of the module object.
  @param    {Object}  iModule -- Map from function name {String} to {DG.AggregateFunction}
 */
DG.CollectionFormulaContext.registerAggFnModule = function( iModule) {
  DG.FormulaContext.registerFnModule( iModule);
  DG.ObjectMap.copy( DG.CollectionFormulaContext.prototype.aggFns, iModule);
};


