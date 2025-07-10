// ==========================================================================
//                        DG.ArchiveUtils
//
//  A collection of utilities to facilitate archiving/restoring documents data.
//
//  Author: Kirk Swenson
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

  Utility functions for managing the _links_ property used for database
  record ID conversion on save/restore.

  @extends SC.Object
*/
DG.ArchiveUtils = {

  /**
    Primitive function for adding a link object to the '_links_' property
    of another object. If multiple link specs are added for a single key,
    they will be appended to an array and getLinkCount() can be used to
    determine the number of links specs attached to a particular key and
    the 'index' form of getLinkID() can be used to extract each link spec.
    @param    {Object}    iStorage -- the object with the '_links_' property
    @param    {String}    iLinkKey -- the string key for the new link
    @param    {Object}    iLinkSpec -- { type: %className%, id: %ID% }
   */
  _addLinkSpec: function( iStorage, iLinkKey, iLinkSpec) {
    if( iStorage && !SC.empty( iLinkKey) && iLinkSpec) {
      // Make sure we have a _links_ property
      if( !iStorage._links_) iStorage._links_ = {};
      var links = iStorage._links_;
      // If we already have an entry for iKey, then update it
      if( links[ iLinkKey]) {
        if( !SC.isArray( links[ iLinkKey])) {
          // Convert simple property to array if necessary
          links[ iLinkKey] = [ links[ iLinkKey] ];
        }
        // Add the new entry to the array
        links[ iLinkKey].push( iLinkSpec);
      }
      else {
        // Just add the simple property
        links[ iLinkKey] = iLinkSpec;
      }
    }
  },

  /**
    Utility function for adding entries to the _links_ property of a
    storage object. Will create the _links_ property if necessary.
    Accepts link specification in form of class name and ID.
    Will store multiple links added for a single key in an array.
    @param    {Object}    iStorage -- the object with the '_links_' property
    @param    {String}    iLinkKey -- the string key for the new link
    @param    {String}    iClassName -- the name of the class being stored (e.g. 'DG.Case')
    @param    {Number}    iLinkID -- the ID of the record being stored
   */
  addLinkID: function( iStorage, iLinkKey, iClassName, iLinkID) {
    var linkSpec = { type: iClassName, id: iLinkID };
    DG.ArchiveUtils._addLinkSpec( iStorage, iLinkKey, linkSpec);
  },

  /**
    Utility function for adding entries to the _links_ property of a
    componentStorage object. Will create the _links_ property if necessary.
    Will store multiple links added for a single key in an array.
    @param    {Object}  iStorage -- The componentStorage object with the _links_ property
    @param    {String}  iLinkKey -- The string key of the link in the _links_ property
    @param    {Object}  iObject -- The object being linked; must have a toLink() method
                                   which returns a link spec { type: %className%, id: %ID% }
   */
  addLink: function( iStorage, iLinkKey, iObject) {
    var linkSpec = iObject && iObject.toLink && iObject.toLink();
    DG.ArchiveUtils._addLinkSpec( iStorage, iLinkKey, linkSpec);
  },
  
  /**
    Returns the total number of link entries or the number of link entries for a given key.
    @param    {Object}  iStorage -- The componentStorage object with the _links_ property
    @param    {String}  iLinkKey -- The string key of the link in the _links_ property
    @returns  {Number}              The number of link entries (if iLinkKey is not specified)
                                    or the number of links for iLinkKey (if it is specified)
   */
  getLinkCount: function( iStorage, iLinkKey) {
    var links = iStorage && iStorage._links_;
    if( !links)
      return 0;
    // If no link key, return number of entries
    if( SC.empty( iLinkKey))
      return DG.ObjectMap.length( links);
    var entry = links[ iLinkKey];
    return SC.isArray(entry)  ? entry.length
                              : (SC.empty(entry) ? 0 : 1);
  },
  
  /**
    Utility function for extracting link IDs from the _links_ property
    of a componentStorage object.
    @param    {Object}  iStorage -- The componentStorage object with the _links_ property
    @param    {String}  iLinkKey -- The string key of the link in the _links_ property
    @param    {Number}  iIndex   -- [Optional] The index of the ID to retrieve (default: 0)
    @returns  {Number}              The ID from the link object with the specified key [and index]
   */
  getLinkID: function( iStorage, iLinkKey, iIndex) {
    var links = iStorage && iStorage._links_,
        entry = links && links[ iLinkKey],
        link = SC.isArray( entry) ? entry[ iIndex || 0] : entry;
    return link && link.id;
  }
  
};
