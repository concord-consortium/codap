// ==========================================================================
//
//  Author:   kswenson
//
//  The DependencyMgr tracks formula dependencies between attributes.
//  It maintains a dependency graph where every attribute with a formula
//  and every attribute or global value (e.g. slider) that is referenced
//  by an attribute formula is a node in the graph, and each node contains
//  a list of dependencies (nodes that a given node references in its
//  formula) and dependents (nodes whose formulas reference this node).
//  The dependency graph must be kept up to date with any changes to
//  formulas, etc., at which point the invalidateDependentsOf() method can
//  be called to invalidate the relevant attribute values and return a
//  list of affected attributes in each affected collection.
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

DG.depMgrLog = function() {};
// @if (debug)
// uncomment to enable debug logging
//DG.depMgrLog = DG.log;
// @endif

/**
  Node type constants
 */
DG.DEP_TYPE_ATTRIBUTE = 'attribute';
DG.DEP_TYPE_GLOBAL = 'global';
DG.DEP_TYPE_PLOT = 'plot';
DG.DEP_TYPE_SPECIAL = 'special';
DG.DEP_TYPE_UNDEFINED = 'undefined';

/**
 * A class for managing formula dependencies
 */
DG.DependencyMgr = SC.Object.extend((function() {
/** @scope DG.DependencyMgr.prototype */ 

  // comparison function for node specification objects,
  // which are used for keys into the dependency graph, etc.
  function _compareNodeSpecs(iNodeSpec1, iNodeSpec2) {
    if (iNodeSpec1.type < iNodeSpec2.type) return -1;
    if (iNodeSpec1.type > iNodeSpec2.type) return 1;
    if (iNodeSpec1.id < iNodeSpec2.id) return -1;
    if (iNodeSpec1.id > iNodeSpec2.id) return 1;
    return 0;
  }

  /**
    Recursive function to invalidate a single dependency and all of the downstream
    dependents that are affected by it.
    @param  {object}  ioResult - dependencies are accumulated and returned in this object
    @param  {object}  iDepMgr - the dependency manager
    @param  {object}  iDependent - the dependent node
    @param  {object}  iDependency - the dependency to be invalidated
    @param  {boolean} iForceAggregate - true if the dependency should be treated as aggregate
   */
  function _invalidateDependency(ioResult, iDepMgr, iDependent, iDependency, iForceAggregate) {
    if (iDependent)
      iDependent.lastInvalidation = iDepMgr._currentInvalidation;

    if (iDependency && iDependency.dependentContext) {
      iDependency.dependentContext
        .invalidateDependent(ioResult, iDependent, iDependency, [], iForceAggregate);
    }
    DG.depMgrLog("DG.DependencyMgr[%@]._invalidateDependency: Invalidating %@ '%@'",
                  iDepMgr.getPath('dataContext.name'), iDependent.type, iDependent.name);
    if (iDependent && iDependency) {
      // recursively invalidate additional affected nodes
      _invalidateDependents(ioResult, iDepMgr, iDependent,
                            iForceAggregate || (iDependency.aggFnIndices.length > 0));
    }
  }

  /**
    Recursive function to invalidate all dependents of a single nod and all of
    the downstream dependents that are affected by them.
    @param  {object}  ioResult - dependencies are accumulated and returned in this object
    @param  {object}  iDepMgr - the dependency manager
    @param  {object}  iIndNode - the independent node
    @param  {boolean} iForceAggregate - true if the dependency should be treated as aggregate
   */
  function _invalidateDependents(ioResult, iDepMgr, iIndNode, iForceAggregate) {

    iIndNode.dependents.forEach(function(iDependent) {

      // if we've already invalidated this node, we don't need to do so again
      if (iDependent.lastInvalidation >= iDepMgr._currentInvalidation) return;

      // Call the specified invalidation function
      var dependency = iDepMgr._findDependency(iDependent, iIndNode);
      if (dependency)
        _invalidateDependency(ioResult, iDepMgr, iDependent, dependency, iForceAggregate);
    });
  }

  return {

  /**
    The data context for which dependencies are being tracked
    @type {DG.DataContext}
   */
  dataContext: null,

  /**
    The nodes of the dependency graph
    @private
    @type {object{}}
   */
  _nodes: null,

  /**
    Invalidation counter - used to prevent multiple invalidation, infinite recursion, etc.
    @private
    @type {number}
   */
  _currentInvalidation: 0,

  /**
    Initialization function
   */
  init: function() {
    this._nodes = {};
  },

  /**
    Create a map key from the specified node specification
    @param  {object}  iNodeSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
   */
  createKey: function(iNodeSpec) {
    return iNodeSpec.type + ':' + iNodeSpec.id;
  },

  /**
    Returns true if the specified node is already present in the dependency map
    @param  {object}  iNodeSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
   */
  hasNode: function(iNodeSpec) {
    return !!this.findNode(iNodeSpec);
  },

  /**
    Returns the specified node (if present) or undefined
    @param  {object}  iNodeSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
   */
  findNode: function(iNodeSpec) {
    var key = this.createKey(iNodeSpec);
    return this._nodes[key];
  },

  /**
    Adds the specified node to the dependency map if it's not already present,
    and returns the found or registered node.
    @param  {object}  iNodeSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
   */
  findOrRegisterNode: function(iNodeSpec) {
    return this.findNode(iNodeSpec) || this.registerNode(iNodeSpec);
  },

  /**
    Returns any nodes which match a name in the specified list, or an empty array
    @param    {string[]}  iNames - array of names to match with nodes
    @returns  {object[]}  array of nodes with matching names (possibly empty).
   */
  findNodesWithNames: function(iNames) {
    var result = [];
    DG.ObjectMap.forEach(this._nodes, function(iNodeSpec, iNode) {
      // if it matches a name on our list, add it to the results
      if (iNames.indexOf(iNode.name) >= 0)
        result.push(iNode);
    });
    return result;
  },

  /*
    Returns the immediate dependents of the specified nodes.
   */
  findDependentsOfNodes: function(iNodes) {
    var result = [];
    iNodes.forEach(function(iNode) {
      var dependents = iNode && iNode.dependents;
      if (dependents) {
        dependents.forEach(function(iDependent) {
          if (result.indexOf(iDependent) < 0)
            result.push(iDependent);
        });
      }
    });
    return result;
  },

  /**
    Adds the specified node to the dependency map if it's not already present
    @param  {object}  iNodeSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
   */
  registerNode: function(iNodeSpec) {
    if (this.hasNode(iNodeSpec)) return this.findNode(iNodeSpec);

    var key = this.createKey(iNodeSpec),
        node = $.extend({}, iNodeSpec, {
                    // nodes that this formula depends on
                    dependencies: [],
                    // nodes that depend on this node
                    dependents: [],
                    // last invalidation indicator
                    lastInvalidation: 0
                  });
    this._nodes[key] = node;
    return node;
  },

  /**
    Removes the specified node from the dependency map if it's present
    @param  {object}  iNodeSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
   */
  removeNode: function(iNodeSpec) {
    // remove the node's dependencies
    this._clearDependencies(iNodeSpec);
    this._pruneDependencies(iNodeSpec);

    // remove the node itself, as long as it doesn't have dependents
    var key = this.createKey(iNodeSpec),
        node = this._nodes[key];
    if (node && !(node.dependents && node.dependents.length)) {
      DG.depMgrLog("DG.DependencyMgr[%@].removeNode: Removing %@ '%@' from the dependency graph",
                  this.getPath('dataContext.name'), iNodeSpec.type, iNodeSpec.name);
      delete this._nodes[key];
    }
  },

  /**
    Returns the dependency object for the specified dependent and independent
    nodes. Returns undefined if no dependency exists between the nodes.
    @param    {object}  iDependentSpec - specifier for the dependent node
    @param    {object}  iIndependentSpec - specifier for the independent node
    @returns  {object}  dependency object between the specified nodes
   */
  findDependency: function(iDependentSpec, iIndependentSpec) {
    var dependentNode = this.findNode(iDependentSpec),
        independentNode = this.findNode(iIndependentSpec);
    return dependentNode && independentNode &&
            this._findDependency(dependentNode, independentNode);
  },

  /**
    Registers the specified dependency, adding a new node for the independent
    node if necessary (the dependent node should already be present because
    a formula should be registered before it is compiled).
    @param {object}   iDependency - the specification of the dependency to be added
    @param {object}   .dependentSpec - the specification of the dependent node
    @param {string}     .type - the type of the node
    @param {string}     .id - the id of the node
    @param {object}   .independentSpec - the specification of the independent node
    @param {string}     .type - the type of the node
    @param {string}     .id - the id of the node
    @param {number[]} .aggFnIndices - the indices of any dependent aggregate functions
    @param {function} .dependentContext - formula context for invalidation
    @param {object}   .srcDependencyMgr - DependencyMgr responsible for independent node
   */
  registerDependency: function(iDependency) {
    var dependentNode = this.findNode(iDependency.dependentSpec),
        prevIndependent = this.findNode(iDependency.independentSpec),
        descriptors = prevIndependent ? ["a non-aggregate", "an aggregate"]
                                      : ["a new non-aggregate", "a new aggregate"],
        independentNode = this.findOrRegisterNode(iDependency.independentSpec);

    DG.depMgrLog("DG.DependencyMgr[%@].registerDependency:\n%@ '%@' has %@ dependency on %@ '%@'",
                this.getPath('dataContext.name'),
                iDependency.dependentSpec.type, iDependency.dependentSpec.name,
                descriptors[iDependency.aggFnIndices.length > 0 ? 1 : 0],
                iDependency.independentSpec.type, iDependency.independentSpec.name);

    DG.assert(dependentNode != null,
              "DG.DependencyMgr.registerDependency: dependentNode not found!",
              "Formulas should be registered before they are compiled.");

    // register the dependency on the independentNode with the dependent node
    this._addDependency(dependentNode, independentNode, iDependency);
    // register a pointer from the independentNode back to the dependentNode
    this._addDependent(dependentNode, independentNode);
  },

  /**
    Adds a dependency on the independent node from the dependent node.
    @param {object}   iDependentNode - the node to which the dependency is to be added
    @param {object}   iIndependentNode - the node which is dependend upon
    @param {number[]} iAggFnIndices - array of aggregate function indices
    @param {object}   iDependentContext - formula context for invalidation
    @private
   */
  _addDependency: function(iDependentNode, iIndependentNode, iDependency) {
    var dependencies = iDependentNode.dependencies,
        dependencyCount = dependencies.length,
        i, dependency,
        aggFnIndices = iDependency.aggFnIndices,
        j, aggFnIndexCount = aggFnIndices ? aggFnIndices.length : 0;

    for (i = 0; i < dependencyCount; ++i) {
      dependency = dependencies[i];
      // do we already have this dependency in the list?
      if (0 === _compareNodeSpecs(dependency.node, iIndependentNode)) {
        // if already present, update the existing dependency
        if (aggFnIndexCount) {
          // merge aggFnIndices with existing dependency
          for (j = 0; j < aggFnIndexCount; ++j) {
            var aggFnIndex = aggFnIndices[j];
            if (dependency.aggFnIndices.indexOf(aggFnIndex) < 0)
              dependency.aggFnIndices.push(aggFnIndex);
          }
        }
        else {
          dependency.simpleDependency = true;
        }
        return;
      }
    }
    // if it's not already present in the list, add it
    dependencies.push({ node: iIndependentNode,
                        simpleDependency: !aggFnIndexCount,
                        aggFnIndices: aggFnIndexCount ? aggFnIndices.slice() : [],
                        dependentContext: iDependency.dependentContext,
                        srcDependencyMgr: iDependency.srcDependencyMgr });
  },

  /**
    Returns the dependency object (if any) of iDependentNode on iIndependentNode.
    @private
   */
  _findDependency: function(iDependentNode, iIndependentNode) {
    var dependentNode = this.findNode(iDependentNode),
        dependencies = dependentNode && dependentNode.dependencies,
        dependencyCount = dependencies.length,
        i, dependency;
    for (i = 0; i < dependencyCount; ++i) {
      dependency = dependencies[i];
      // do we already have this dependency in the list?
      if (0 === _compareNodeSpecs(dependency.node, iIndependentNode)) {
        return dependency;
      }
    }
    return null;
  },

  /**
    Adds a dependent to the independent node for the dependent node.
    Note that the pointer from the independent to the dependent is a simple pointer
    that doesn't contain the additional information maintained by the dependent node
    in its dependency object.
    @param {object}   iDependentNode - the dependent node
    @param {object}   iIndependentNode - the node to which the dependent is to be added
    @private
   */
  _addDependent: function(iDependentNode, iIndependentNode) {
    var dependents = iIndependentNode.dependents,
        dependentCount = dependents.length,
        i, dependentNode;
    for (i = 0; i < dependentCount; ++i) {
      dependentNode = dependents[i];
      // we already have this dependent in the list
      if (0 === _compareNodeSpecs(dependentNode, iDependentNode)) return;
    }
    // if it's not already present in the list, add it
    dependents.push(iDependentNode);
  },

  /**
    Adds a dependent to the independent node for the dependent node.
    Note that the pointer from the independent to the dependent is a simple pointer
    that doesn't contain the additional information maintained by the dependent node
    in its dependency object.
    @param {object}   iDependentNode - the dependent node
    @param {object}   iIndependentNode - the node to which the dependent is to be added
    @private
   */
  _removeDependent: function(iDependentNode, iIndependentNode) {
    var dependents = iIndependentNode.dependents,
        dependentCount = dependents.length,
        i, dependentNode;
    for (i = dependentCount - 1; i >= 0; --i) {
      dependentNode = dependents[i];
      // remove the matching item
      if (0 === _compareNodeSpecs(dependentNode, iDependentNode)) {
        dependents.splice(i, 1);
        return;
      }
    }
  },

  /**
    Clears the detailed dependency information (e.g. 'simpleDependency' and 'aggFnIndices')
    from every dependency of the specified node. This is generally done before recompiling
    the formula so that dependencies that are no longer valid can be identified and pruned.
    @param  {object}  iDependentSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
    @private
   */
  _clearDependencies: function(iDependentSpec) {
    var dependentNode = this.findNode(iDependentSpec);
    if (!dependentNode) return;

    var dependencies = dependentNode.dependencies,
        dependencyCount = dependencies.length,
        i, dependency;
    for (i = 0; i < dependencyCount; ++i) {
      dependency = dependencies[i];
      dependency.simpleDependency = false;
      dependency.aggFnIndices = [];
      // clear remote dependencies such as those created from lookup functions
      if (dependency.srcDependencyMgr && (this !== dependency.srcDependencyMgr))
        dependency.srcDependencyMgr._clearDependencies(iDependentSpec);
    }
  },

  /**
    Removes dependencies that are no longer required. This is generally done
    after _clearDependencies() and then compiling the formula. Any dependencies
    that are still empty after compilation are no longer valid and can be pruned.
    @param  {object}  iDependentSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
    @private
   */
  _pruneDependencies: function(iDependentSpec) {
    var dependentNode = this.findNode(iDependentSpec);
    if (!dependentNode) return;

    var dependencies = dependentNode.dependencies,
        dependencyCount = dependencies.length,
        independentNode,
        i, dependency;
    for (i = dependencyCount - 1; i >= 0; --i) {
      dependency = dependencies[i];
      if (!dependency.simpleDependency && !dependency.aggFnIndices.length) {
        independentNode = dependency.node;
        DG.depMgrLog("DG.DependencyMgr[%@]._pruneDependencies:\nRemoving dependence of %@ '%@' on %@ '%@'",
                    this.getPath('dataContext.name'), 
                    dependentNode.type, dependentNode.name,
                    independentNode.type, independentNode.name);
        this._removeDependent(dependentNode, independentNode);
        dependencies.splice(i, 1);
      }
      // prune remote dependencies such as those created from lookup functions
      if (dependency.srcDependencyMgr && (this !== dependency.srcDependencyMgr))
        dependency.srcDependencyMgr._pruneDependencies(iDependentSpec);
    }
  },

  /**
    Invalidate nodes with the specified names. Designed to handle name changes,
    object creation/deletion, and other namespace-affecting changes.
    returns an object indicating the affected nodes.
    @param {string[]}   iNames
    @returns {object}   result
                        .simpleDependencies[]
                        .aggregateDependencies[]
   */
  invalidateNames: function(iNames) {
    var i, result = { simpleDependencies: [], aggregateDependencies: [] };

    // increment our invalidation counter
    ++this._currentInvalidation;

    // invalidate dependents of the named nodes
    var nodes = this.findNodesWithNames(iNames);
    nodes.forEach(function(iNode) {
      _invalidateDependents(result, this, nodes[i], true);
    });

    return result;
  },

  /**
    Invalidate a particular dependent of a particular node.
    returns an object indicating the affected nodes.
    @param {object}   iDependentSpec - specifier for the dependent node
    @param {object}   iIndependentSpec - specifier for the independent node
    @param {boolean}  iForceAggregate - true if the dependency should be treated as aggregate
    @returns {object}   result
                        .simpleDependencies[]
                        .aggregateDependencies[]
   */
  invalidateDependency: function(iDependentSpec, iIndependentSpec, iForceAggregate) {
    var dependentNode = this.findNode(iDependentSpec),
        dependency = this.findDependency(iDependentSpec, iIndependentSpec),
        result = { simpleDependencies: [], aggregateDependencies: [] };
    if (dependency) {
      // increment our invalidation counter
      ++this._currentInvalidation;
      // invalidate the specified dependency
      _invalidateDependency(result, this, dependentNode, dependency, iForceAggregate);
    }
    return result;
  },

  /**
    Invalidate the specified nodes; returns an object indicating the affected nodes.
    @param {object[]}   iNodeSpecs
    @returns {object}   result
                        .simpleDependencies[]
                        .aggregateDependencies[]
   */
  invalidateDependentsOf: function(iNodeSpecs) {
    var i, nodeSpecCount = iNodeSpecs.length,
        result = { simpleDependencies: [], aggregateDependencies: [] };

    // increment our invalidation counter
    ++this._currentInvalidation;

    // invalidate the initial set of nodes
    for (i = 0; i < nodeSpecCount; ++i) {
      var indNode = this.findNode(iNodeSpecs[i]);
      if (indNode) {
        // invalidate dependents of each node
        _invalidateDependents(result, this, indNode);
      }
    }

    return result;
  }

  }; // return from function closure
}())); // function closure
