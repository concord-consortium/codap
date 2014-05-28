// ==========================================================================
//                        DG.DocumentArchiver
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

/** @class

  Coordinating controller for the document.

  @extends SC.Object
*/
DG.DocumentArchiver = SC.Object.extend(
/** @scope DG.DocumentArchiver.prototype */ {

  
  /**
    Adds the specified record to our internal _records structure.
   */
  addRecord: function( iClassName, iRecordHash, iServerID) {
    var recordType = DG.Record.recordTypeFromString( iClassName),
        id = iRecordHash.guid;
    if( !this._records)
      this._records = [];
    if( !this._records[iClassName]) {
      this._records[iClassName] = { type: recordType, idMap: {}, array: [] };
    }
    
    var recordMap = this._records[iClassName];
    recordMap.idMap[id] = iRecordHash;
    recordMap.array.push( iRecordHash);
    if( !SC.none( iServerID)) {
      if( !recordMap.serverIDMap)
        recordMap.serverIDMap = {};
      // serverIDMap maps from server-generated IDs to client-side IDs
      recordMap.serverIDMap[ iServerID.toString()] = id;
    }
  },
  
  /**
    Returns the record of the specified type with the specified ID
    from our internal _records structure.
   */
  getRecord: function( iRecordTypeStr, iRecordID) {
    return this._records && this._records[iRecordTypeStr] &&
            this._records[iRecordTypeStr].idMap[iRecordID];
  },
  
  /**
    Load the records in our internal _records structure into the specified store.
   */
  loadRecordsIntoStore: function( iStore) {
    // We must force instantiation of data source
    var dataSource = iStore._getDataSource();
    DG.ObjectMap.forEach( this._records,
                          function( iRecordTypeStr, iRecordMap) {
                            // Load the records into the data source (which is
                            // currently representing our back-end database).
                            // This step shouldn't be necessary if the records
                            // actually come from the data source.
                            dataSource.loadRecords( iRecordMap.type, iRecordMap.array);
                            // Load the records into the store.
                            iStore.loadRecords( iRecordMap.type, iRecordMap.array);
                          });
    // Give the cases a chance to update their case-value caches.
    iStore.find( DG.Attribute).forEach( function( iAttr) { iAttr.didLoadRecord(); });
    iStore.find( DG.Case).forEach( function( iCase) { iCase.didLoadRecord(); });
  },
  
  /**
    Convert from a server ID to the corresponding client ID.
    As records are read in we maintain maps from server IDs to client IDs,
    which are used for reference when performing this conversion.
    @param    {String}    iRecordType -- the record type of the record
    @param    {Number}    iServerID -- the server-generated ID of the record
    @returns  {Number}    the client ID of the record in the DG.store
   */
  clientIDFromServerID: function( iRecordType, iServerID) {
    if( SC.empty( iRecordType) || SC.none( iServerID)) return null;
    var recordMap = this._records && this._records[ iRecordType],
        serverIDMap = recordMap && recordMap.serverIDMap,
        clientID = serverIDMap && serverIDMap[ iServerID.toString()];
    return clientID;
  },
  
  /**
    Returns the record identified by the specified iRecordType and iClientID.
    As records are read in we maintain maps from server IDs to client IDs,
    which are used for reference when performing this search.
    @param    {String}    iRecordType -- the record type of the record
    @param    {Number}    iServerID -- the server-generated ID of the record
    @returns  {DG.Record} the record object identified
   */
  recordFromClientID: function( iRecordType, iClientID) {
    if( !iRecordType || !iClientID) return null;
    var recordMap = this._records && this._records[ iRecordType],
        record = recordMap && recordMap.idMap && recordMap.idMap[ iClientID];
    return record;
  },
  
  /**
    Recursive method which restores individual objects from the JSON starting with
    the document object itself and recursing through all objects in the document.
    @param    {SC.MemoryDataSource}   iDataSource -- The data source used to generate IDs
    @param    {String}                iClassName -- The record type of the object to be restored
    @param    {Object}                iRecordHash -- The object hash for the record to be restored
   */
  restoreObject: function( iDataSource, iClassName, iRecordHash) {
  
    var serverID = !SC.none( iRecordHash.guid) ? iRecordHash.guid : undefined,
        guid = iDataSource.assignIDForNewRecord( iClassName, iRecordHash);
    
    this.addRecord( iClassName, iRecordHash, serverID);
    
    // Function for processing each individual relationship
    var processRelation = function( iProperty, iRelationAttr, iInverseAttr) {
    
      // For owner relationships, the child records are contained within an
      // array in the parent, e.g. documents contain arrays of 'components',
      // 'contexts', and 'globalValues'. We want to process each of the child
      // records and replace the child arrays in the parent with arrays of
      // guids and place the guid of the parent in the child record.
      if( iRelationAttr.isOwner) {
        var prevChildren = iRecordHash[ iProperty] || [],
            newChildren = [];
        // Replace the array of recordHashes with an array of child IDs
        iRecordHash[ iProperty] = newChildren;
        // Process each individual child record
        prevChildren.forEach( function( iChildRecordHash) {
                                // Restore the child object
                                this.restoreObject( iDataSource, iRelationAttr.type, iChildRecordHash);
                                // Set the link from the child back to the parent
                                iChildRecordHash[ iRelationAttr.inverse] = guid;
                                // Add the link from the parent to the child
                                newChildren.push( iChildRecordHash.guid);
                              }.bind( this));
      }
      
      // For master relationships that aren't owning relationships, we simply empty out the
      // array of children. The array will be filled in as the non-owned children are processed.
      // The relationship between attributes and case values is an example of a non-owning
      // master relationship. Parent cases to child cases are another example.
      else if( iRelationAttr.isMaster) {
        // Most of our relationships are one-to-many, but we test to support the possibility of
        // one-to-one relationships, in which case it's a value instead of an array of values.
        iRecordHash[ iProperty] = SC.instanceOf( iRelationAttr, SC.ManyAttribute) ? [] : null;
      }
      
      // For the child end of non-owning relationships, we just want to put the parent ID
      // in the child record as a link back to the parent and the child ID in the parent
      // records array of children. The subtlety here is that since these are non-owning
      // relationships, the server has placed server IDs in the places where we now want
      // client IDs. Therefore, we use the serverIDMap in the recordMap to map from the
      // server-generated ID to the corresponding client-generated ID and use that instead.
      else if( iInverseAttr.isMaster && !iInverseAttr.isOwner) {
        var parentType = iRelationAttr.type,
            parentServerID = iRecordHash[ iProperty],
            parentClientID = this.clientIDFromServerID( parentType, parentServerID);
        if( parentClientID) {
          var parentRecord = this.recordFromClientID( parentType, parentClientID);
          // Configure the reference from the child back to the parent
          iRecordHash[ iProperty] = parentClientID;
          // Configure the reference from the parent back to the child
          if( parentRecord) {
            // Support one-to-many relationships
            if( SC.instanceOf( iInverseAttr, SC.ManyAttribute)) {
              if( !parentRecord[ iRelationAttr.inverse])
                parentRecord[ iRelationAttr.inverse] = [];
              parentRecord[ iRelationAttr.inverse].push( iRecordHash.guid);
            }
            else {
              // Support one-to-one relationships
              parentRecord[ iRelationAttr.inverse] = iRecordHash.guid;
            }
          }
          else {
            // If a parent link was specified, but we can't find the parent record, issue a warning.
            DG.logWarn("DG.DocumentArchiver.restoreObject.processRelation failed to find linked parent:");
            DG.logWarn("  Parent Type: %@, ID: %@, Property: %@", 
                        parentType, parentClientID, iRelationAttr.inverse);
            DG.logWarn("  Child Type:  %@, ID: %@, Property: %@",
                        iClassName, iRecordHash.guid, iProperty);
          }
        }
      }
    }.bind( this);
    
    // Process the explicit relationships
    DG.Record.forEachRelation( DG.Record.recordTypeFromString( iClassName), processRelation);
    
    // Identify 'componentStorage', 'contextStorage', etc. properties which require further processing.
    var identifyStorage = function( iStorageKey, iStorageValue) {
      var kStorageKeyLen = 7;
      if( (iStorageKey.lastIndexOf('Storage') === iStorageKey.length - kStorageKeyLen) &&
          !SC.none( iStorageValue) && (typeof iStorageValue === 'object') && 
          !SC.none( iStorageValue._links_) && (typeof iStorageValue._links_ === 'object')) {
        // Found a '...Storage' property with '_links_' within it, stash it for later
        this._storageProperties.push( { record: iRecordHash, key: iStorageKey, value: iStorageValue });
      }
    }.bind( this);

    DG.ObjectMap.forEach( iRecordHash, identifyStorage);
  },
  
  processStorageProperties: function() {
    // Process the implicit relationships inside 'componentStorage', 'contextStorage', etc.
    var processStorage = function( iStorageProperty) {
      var didChangeStorage = false,
          // decode the string value
          storage = iStorageProperty.value,
          // function for updating individual link IDs
          processLink = function( iLinkKey, iLinkValue) {
            var links = SC.isArray(iLinkValue) ? iLinkValue : [ iLinkValue ];
            links.forEach( function( iLink) {
              iLink.id = this.clientIDFromServerID( iLink.type, iLink.id);
            }.bind( this));
            didChangeStorage = true;
          }.bind( this);
      // process each of the links in the '_links_' property
      DG.ObjectMap.forEach( storage._links_, processLink);
      // if any of them changed, encode the new value and store it
      if( didChangeStorage)
        iStorageProperty.record[ iStorageProperty.key] = storage;
    }.bind( this);
    
    if( this._storageProperties)
      this._storageProperties.forEach( processStorage);
    this._storageProperties = null;
  },
  
  /**
    Open the specified document text as a new document, returning the newly-created document.
   */
  openDocument: function( iStore, iDocText) {
    var docArchive = SC.json.decode( iDocText),
        // We must force instantiation of data source
        dataSource = iStore._getDataSource(),
        newDocument = null;

    this._storageProperties = [];
    this.restoreObject( dataSource, 'DG.Document', docArchive);
    
    this.processStorageProperties();

    this.loadRecordsIntoStore( iStore);

    var documentRecords = this._records && this._records['DG.Document'],
        newDocumentRecord = documentRecords && documentRecords.array[0],
        newDocumentID = newDocumentRecord && newDocumentRecord.guid;
    newDocument = newDocumentID && iStore.find( DG.Document, newDocumentID);
    this._records = null;
  return newDocument;
  },

  /**
    Save the specified document in its JSON-text form.
    @param    {DG.Document}   iDocument   The document whose contents are to be archived
    @returns  {Object}                    An object suitable for JSON encoding
   */
  saveDocument: function( iDocument) {
    var docController = DG.currDocumentController();
    
    // Prepare the context-specific storage for saving.
    // Start by saving the state of the current game in the appropriate context.
    DG.gameSelectionController.saveCurrentGameState();
    DG.DataContext.forEachContextInMap( iDocument.get('id'),
                                        function( iContextID, iContext) {
                                          iContext.willSaveContext();
                                        });
    if( docController) {
      // Prepare the component-specific storage for saving
      DG.ObjectMap.forEach( docController.componentControllersMap,
                            function( iComponentID, iController) {
                              iController.willSaveComponent();
                            });
    }

    var docArchive = iDocument.toArchive();
    return docArchive;
  },

  /**
   * Copy the specified document case data in tab-delimited string form
   * @param	{String} iWhichCollection 'parent' or 'child' (TODO: allow 'both' for flatted collection with all attributes)
   * @param {DG.Document}	iDocument   The document whose contents are to be archived
   * @returns {String}	The export string
   */
  exportCaseData: function( iDocument, iWhichCollection ) {
    var caseDataString = '';

    DG.DataContext.forEachContextInMap( iDocument.get('id'),
      function( iContextID, iContext) {
        caseDataString += iContext.exportCaseData( iWhichCollection );
      });
    return caseDataString;
  }

});

