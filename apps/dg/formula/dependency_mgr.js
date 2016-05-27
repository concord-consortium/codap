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
//  formulas, etc., at which point the invalidateNodes() method can be
//  called to invalidate the relevant attribute values and return a
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

  return {

  /**
    The data context for which dependencies are being tracked
    @type {DG.DataContext}
   */
  context: null,

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
    Adds the specified node to the dependency map if it's not already present
    @param  {object}  iNodeSpec - the node specification
    @param  {string}  .type - the type of the node
    @param  {string}  .id - the id of the node
   */
  registerNode: function(iNodeSpec) {
    if (this.hasNode(iNodeSpec)) return this.findNode(iNodeSpec);

    var key = this.createKey(iNodeSpec);
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
    Adds the specified node to the dependency map if it's not already present
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
      DG.depMgrLog("DG.DependencyMgr.removeNode: Removing %@ '%@' from the dependency graph",
                  iNodeSpec.type, iNodeSpec.name);
      delete this._nodes[key];
    }
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
   */
  registerDependency: function(iDependency) {
    var dependentNode = this.findNode(iDependency.dependentSpec),
        prevIndependent = this.findNode(iDependency.independentSpec),
        descriptors = prevIndependent ? ["a non-aggregate", "an aggregate"]
                                      : ["a new non-aggregate", "a new aggregate"],
        independentNode = this.findOrRegisterNode(iDependency.independentSpec);

    DG.depMgrLog("DG.DependencyMgr.registerDependency:\n%@ '%@' has %@ dependency on %@ '%@'",
                iDependency.dependentSpec.type, iDependency.dependentSpec.name,
                descriptors[iDependency.aggFnIndices.length > 0 ? 1 : 0],
                iDependency.independentSpec.type, iDependency.independentSpec.name);

    DG.assert(dependentNode != null,
              "DG.DependencyMgr.registerDependency: dependentNode not found!",
              "Formulas should be registered before they are compiled.");

    this._addDependency(dependentNode, independentNode, iDependency.aggFnIndices);
    this._addDependent(dependentNode, independentNode);
  },

  /**
    Adds a dependency on the independent node from the dependent node.
    @param {object}   iDependentNode - the node to which the dependency is to be added
    @param {object}   iIndependentNode - the node which is dependend upon
    @param {number[]} iAggFnIndices - array of aggregate function indices
    @private
   */
  _addDependency: function(iDependentNode, iIndependentNode, iAggFnIndices) {
    var dependencies = iDependentNode.dependencies,
        dependencyCount = dependencies.length,
        i, dependency,
        aggFnIndexCount = iAggFnIndices ? iAggFnIndices.length : 0;
    for (i = 0; i < dependencyCount; ++i) {
      dependency = dependencies[i];
      // do we already have this dependency in the list?
      if (0 === _compareNodeSpecs(dependency.node, iIndependentNode)) {
        if (aggFnIndexCount) {
          // keep track of aggFnIndices affected
          iAggFnIndices.forEach(function(iAggFnIndex) {
            if (dependency.aggFnIndices.indexOf(iAggFnIndex) < 0) {
              dependency.aggFnIndices.push(iAggFnIndex);
            }
          });
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
                        aggFnIndices: aggFnIndexCount ? iAggFnIndices.slice() : [] });
  },

  /**
    Returns the dependency object (if any) of iDependentNode on iIndependentNode.
    @private
   */
  _findDependency: function(iDependentNode, iIndependentNode) {
    var dependentNode = this.findNode(iDependentNode),
        dependencies = dependentNode.dependencies,
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
        DG.depMgrLog("DG.DependencyMgr._pruneDependencies:\nRemoving dependence of %@ '%@' on %@ '%@'",
                    dependentNode.type, dependentNode.name,
                    independentNode.type, independentNode.name)
        this._removeDependent(dependentNode, independentNode);
        dependencies.splice(i, 1);
      }
    }
  },

  /**
    Invalidate the specified nodes; returns an object indicating the affected nodes.
    @param {object[]}   iNodeSpecs
    @returns {object}   result
                        .simpleDependencies[]
                        .aggregateDependencies[]
   */
  invalidateNodes: function(iNodeSpecs, iCases) {
    var i, nodeSpec, nodeSpecCount = iNodeSpecs.length,
        result = { simpleDependencies: [], aggregateDependencies: [] };

    // increment our invalidation counter
    ++this._currentInvalidation;

    var invalidateDependents = function(iIndNode, iForceAggregate) {

      iIndNode.dependents.forEach(function(iDependent) {

        // if we've already invalidated this node, we don't need to do so again
        if (iDependent.lastInvalidation >= this._currentInvalidation) return;
        iDependent.lastInvalidation = this._currentInvalidation;

        var dependency = this._findDependency(iDependent, iIndNode),
            attributeID = iDependent && iDependent.id,
            attribute = attributeID && DG.Attribute.getAttributeByID(attributeID);

        if (!iForceAggregate && dependency.simpleDependency) {
          attribute.invalidateCases(iCases);
          result.simpleDependencies.push(iDependent);
        }
        if (iForceAggregate || dependency.aggFnIndices.length) {
          attribute.invalidateCases(null, dependency.aggFnIndices);
          result.aggregateDependencies.push(iDependent);
        }
        DG.depMgrLog("DG.DependencyMgr.invalidateDependents: Invalidating %@ '%@'",
                    iDependent.type, iDependent.name);
        // recursively invalidate additional affected nodes
        invalidateDependents(iDependent, iForceAggregate || dependency.aggFnIndices.length);
      }.bind(this));
    }.bind(this);

    for (i = 0; i < nodeSpecCount; ++i) {
      indNode = this.findNode(iNodeSpecs[i]);
      if (indNode) {
        indNode.lastInvalidation = this._currentInvalidation;
        invalidateDependents(indNode);
      }
    }

    return result;
  }

  }; // return from function closure
}())); // function closure
