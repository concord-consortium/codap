// ==========================================================================
//                              DG.GameSpec
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

sc_require('models/base_game_spec');

/** @class

  (Document your Model here)

  @extends SC.Object
*/
DG.GameSpec = DG.BaseGameSpec.extend(
/** @scope DG.GameSpec.prototype */ {

  /**
    Returns the specification for the child/leaf collection.
    @returns  {Object}    The collection specification
   */
  childCollection: function() {
    var collections = this.get('collections'),
        collectionCount = (collections && collections.length) || 0,
        index = collectionCount - 1;
    return (index >= 0) ? collections[ index] : null;
  }.property('collections').cacheable(),

  /**
    Returns the specification for the parent collection.
    @returns  {Object}    The collection specification
   */
  parentCollection: function() {
    var collections = this.get('collections'),
        collectionCount = (collections && collections.length) || 0,
        index = collectionCount - 2;
    return (index >= 0) ? collections[ index] : null;
  }.property('collections').cacheable(),

  /**
    Returns the name of the child/leaf collection.
    @returns  {String}    The name of the collection
   */
  collectionName: function() {
    var collection = this.get('childCollection'),
        name = collection && collection.name;
    return !SC.empty( name) ? name : null;
  }.property('childCollection').cacheable(),

  /**
    Returns the name of the parent collection.
    @returns  {String}    The name of the collection
   */
  parentCollectionName: function() {
    var collection = this.get('parentCollection'),
        name = collection && collection.name;
    return !SC.empty( name) ? name : null;
  }.property('parentCollection').cacheable(),

  eventsAttributeName: function() {
    var parent = this.get('parentCollection'),
        events = parent && parent.childAttrName;
    if( SC.empty( events)) {
      var child = this.get('childCollection');
      events = child && child.name;
    }
    return !SC.empty( events) ? events : null;
  }.property('parentCollection','childCollection').cacheable(),

  getAttrType: function( iCollection, iAttrName) {
    var i, attrCount = iCollection.attrs.length;
    for( i = 0; i < attrCount; ++i) {
      var attr = iCollection.attrs[ i];
      if( attr && (attr.name === iAttrName))
        return attr.type;
    }
    return null;
  },

  graphDefaults: function() {
    var collection = this.get('childCollection');
    return collection && collection.defaults;
  }.property('childCollection').cacheable(),

  xAttrName: function() {
    var defaults = this.get('graphDefaults');
    return defaults && defaults.xAttr;
  }.property('graphDefaults').cacheable(),

  xAttrIsNumeric: function() {
    var collection = this.get('childCollection'),
        attrName = this.get('xAttrName'),
        attrType = this.getAttrType( collection, attrName);
    return attrType === 'numeric';
  }.property('childCollection','xAttrName').cacheable(),

  yAttrName: function() {
    var defaults = this.get('graphDefaults');
    return defaults && defaults.yAttr;
  }.property('graphDefaults').cacheable(),

  yAttrIsNumeric: function() {
    var collection = this.get('childCollection'),
        attrName = this.get('yAttrName'),
        attrType = this.getAttrType( collection, attrName);
    return attrType === 'numeric';
  }.property('childCollection','yAttrName').cacheable(),

  legendAttrName: function() {
    var defaults = this.get('graphDefaults');
    return defaults && defaults.legendAttr;
  }.property('graphDefaults').cacheable(),

  legendAttrIsNumeric: function() {
    var collection = this.get('childCollection'),
        attrName = this.get('legendAttrName'),
        attrType = this.getAttrType( collection, attrName);
    return attrType === 'numeric';
  }.property('childCollection','legendAttrName').cacheable(),

  origin: function() {
    var matches = this.get('url').match(/(.*?\/\/.*?)\//);
    return matches ? matches[1] : null;
  }.property('url').cacheable()

}) ;
