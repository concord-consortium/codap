// ==========================================================================
//                            DG.BaseGameSpec
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

/** @class

  (Document your Model here)

  @extends SC.Object
*/
DG.BaseGameSpec = SC.Object.extend(
/** @scope DG.BaseGameSpec.prototype */ {

  name: null,           // String
  
  url: null,            // String
  
  collections: null,    // Array of Object (collection specification objects)
  
  dimensions: { width: 0, height: 0}, // Default view/component dimensions
  
  context: null,        // DG.DataContext or derived class
   
  // The following properties are simple properties for games using the old game API.
  // When using the new game API (DG.GameSpec), they are computed from the 'collections' property.
  
  collectionName: null,         // String
  
  parentCollectionName: null,   // String
  
  eventsAttributeName: null,    // String
  
  xAttrName: null,              // String
  
  xAttrIsNumeric: true,         // Boolean
  
  yAttrName: null,              // String
  
  yAttrIsNumeric: true,         // Boolean
  
  init: function() {
    sc_super();
    this.collections = [];
  },

  /**
    Returns the specification for the collection with the specified name.
    @param    iCollectionName {String}    The name of the collection whose
                                          specification is requested
    @returns  {Object}    The collection specification
   */
  getCollectionSpecByName: function( iCollectionName) {
    var collections = this.get('collections'),
        i, collectionCount = collections && collections.length;
    for( i = 0; i < collectionCount; ++i) {
      if( collections[ i].name === iCollectionName)
        return collections[ i];
    }
    return null;
  }
}) ;
