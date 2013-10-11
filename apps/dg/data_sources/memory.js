// ==========================================================================
//                        DG.MemoryDataSource
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

/** @class

  Patterned after Todos.TagDataSource in the SproutCore ToDos demo from the
  originally SproutCore wiki.
  
  Title: Todos - Alternative Path Step 9 - Editing Relationships and Select View
  URL: http://wiki.sproutcore.com/w/page/29907994/
        Todos%20-%20Alternative%20Path%20Step%209%20-%20Editing%20Relationships%20and%20Select%20View
  (Verified 6/9/2011)

  @extends SC.DataSource
*/
DG.MemoryDataSource = SC.DataSource.extend( (function() // closure
/** @scope DG.MemoryDataSource.prototype */ {

    // We use arrays and object hashes to store data locally.
    var storageHash = {}, //holds the hashes by record type
        storageArray = {}, //holds the arrays by record type

        documentHash = {},
        componentHash = {},
        contextHash = {},
        collectionHash = {},
        attributeHash = {},
        caseHash = {},        // holds case hashes by key
        globalValueHash = {};

    // Set up the hashes
    storageHash['DG.Document'] = documentHash;
    storageHash['DG.Component'] = componentHash;
    storageHash['DG.DataContextRecord'] = contextHash;
    storageHash['DG.CollectionRecord'] = collectionHash;
    storageHash['DG.Attribute'] = attributeHash;
    storageHash['DG.Case'] = caseHash;
    storageHash['DG.GlobalValue'] = globalValueHash;

    // Set up the arrays
    storageArray['DG.Document'] = [];
    storageArray['DG.Component'] = [];
    storageArray['DG.DataContextRecord'] = [];
    storageArray['DG.CollectionRecord'] = [];
    storageArray['DG.Attribute'] = [];
    storageArray['DG.Case'] = [];
    storageArray['DG.GlobalValue'] = [];

    var currGuids = {};
    currGuids['DG.Document'] = 10;
    currGuids['DG.Component'] = 100;
    currGuids['DG.DataContextRecord'] = 400;
    currGuids['DG.CollectionRecord'] = 600;
    currGuids['DG.Attribute'] = 1000;
    currGuids['DG.Case'] = 2000;
    currGuids['DG.GlobalValue'] = 9000;

    //Clone an object
    function clone(obj){
      return SC.clone( obj, YES); // requires SproutCore 1.4.4
    }
 
    //Clone an array
    function cloneArray(myarray) {
      var clonedArray = [];
      for (var index=0; index < myarray.length; index++) {
        clonedArray.push(clone(myarray[index]));
      }
      return clonedArray;
    }

    //Converts a real recordType into a String, which we use to index storageHash and storageArray
    var typeOfRecord = function(recordType, store) {
 
      if (SC.kindOf(recordType, DG.Document)) {
        return "DG.Document";
      } 
      if (SC.kindOf(recordType, DG.DataContextRecord)) {
        return "DG.DataContextRecord";
      } 
      if (SC.kindOf(recordType, DG.Component)) {
        return "DG.Component";
      } 
      if (SC.kindOf(recordType, DG.CollectionRecord)) {
        return "DG.CollectionRecord";
      } 
      if (SC.kindOf(recordType, DG.Attribute)) {
        return "DG.Attribute";            
      }
      if (SC.kindOf(recordType, DG.Case)) {
        return "DG.Case";            
      }
      if (SC.kindOf(recordType, DG.GlobalValue)) {
        return "DG.GlobalValue";            
      }
    };
    
    // Update the parent record in the store after changing its child link(s).
    function updateParentRecord( iParentRecordClass, iParentRecord, iParentChildrenProperty, iStore) {
      var tParentRecordStoreKey = iStore.storeKeyFor( iParentRecordClass, iParentRecord.guid),
          storeDataHash = iStore.readEditableDataHash( tParentRecordStoreKey);
      storeDataHash[ iParentChildrenProperty] = SC.copy( iParentRecord[ iParentChildrenProperty], true);
      iStore.dataHashDidChange( tParentRecordStoreKey, null, false, iParentChildrenProperty);
    }
    
    // Configure the relation between the specified child property of the specified child
    // record to the specified parent property of the specified parent record.
    function relateToParents( iChildRecord, iChildPropertyName,
                              iParentRecordClass, iParentPropertyName, iStore) {

      // See if the child record specifies a link to a parent record
      var tParentRecordGuid = iChildRecord[ iChildPropertyName];
      if( !SC.none( tParentRecordGuid)) {

        // Set up the relationship by looking up the parent, 
        // and setting this record id into its list of children.
        var tParentRecordType = typeOfRecord( iParentRecordClass, iStore),
            tParentRecord = tParentRecordType && storageHash[ tParentRecordType][ tParentRecordGuid];
        
        if( !tParentRecord)
          return;

        // Modify the parent record
        var isParentPropertyChanged = false;
        if( !tParentRecord[ iParentPropertyName]) {   // Make sure the array of children exists
          tParentRecord[ iParentPropertyName] = [];
          isParentPropertyChanged = true;
        }
        if( tParentRecord[ iParentPropertyName].indexOf( iChildRecord.guid) < 0) {
          tParentRecord[ iParentPropertyName].pushObject( iChildRecord.guid); //add the child to the parent.
          isParentPropertyChanged = true;
        }

        // Let store know about parent record changes
        if( isParentPropertyChanged)
          updateParentRecord( iParentRecordClass, tParentRecord, iParentPropertyName, iStore);
      }
    }
    
    // Remove a reference from the parent to the child
    function removeChildFromParent( iChildRecord, iParentRecord, iParentsChildrenProperty) {
      var parentsChildren = iParentRecord[ iParentsChildrenProperty];
      if( parentsChildren && parentsChildren.indexOf( iChildRecord.guid) >= 0) {
        parentsChildren.removeObject( iChildRecord.guid);
        return true;
      }
      return false;
    }

    // Remove the relation between the child record being deleted and the
    // the specified parent property of the specified parent record.
    function removeFromParents( iChildRecord, iChildsParentProperty, 
                                iParentRecordClass, iParentsChildrenProperty, iStore) {

      // Identify the parent from the child record.
      // Note that this only works for one-to-many or one-to-one relationships
      var tParentRecordType = typeOfRecord( iParentRecordClass, iStore),
          tParentRecordID = !SC.empty( iChildsParentProperty) && iChildRecord[ iChildsParentProperty],
          tParentRecord = storageHash[ tParentRecordType][ tParentRecordID];
      if( tParentRecord) {
        // If we found the parent, remove the child from it
        if( removeChildFromParent( iChildRecord, tParentRecord, iParentsChildrenProperty))
          updateParentRecord( iParentRecordClass, tParentRecord, iParentsChildrenProperty, iStore);
        return;
      }

      // If we fail to find the parent via the child record, search through all records
      var tAllParentRecords = tParentRecordType && storageArray[ tParentRecordType],
          tParentRecordCount = tAllParentRecords ? tAllParentRecords.length : 0;

      // Loop through all possible parent records.
      // Note: Is this really necessary? Seems like the child hash link would work.
      for (var i = 0; i < tParentRecordCount; ++i) {
        tParentRecord = tAllParentRecords[i];
        
        // Try to remove the child from the specified parent record, and update if we succeed
        if( removeChildFromParent( iChildRecord, tParentRecord, iParentsChildrenProperty)) {
          updateParentRecord( iParentRecordClass, tParentRecord, iParentsChildrenProperty, iStore);
          break;
        }
      }
    }
    
    // When a child record is deleted or moved from one parent to another,
    // its parent relations must be updated appropriately.
    var removeRelations = function (recordType, recordHash, store) {
    
    	// In some destroy paths, we can get here without a recordHash
    	if( !recordHash) return;
  
      switch( recordType) {
      
      case 'DG.Document':
        break;
      
      case 'DG.Component':
        removeFromParents( recordHash, 'document', DG.Document, 'components', store);
        break;
      
      case 'DG.DataContextRecord':
        removeFromParents( recordHash, 'document', DG.Document, 'contexts', store);
        break;
      
      case 'DG.CollectionRecord':
        removeFromParents( recordHash, 'context', DG.DataContextRecord, 'collections', store);
        removeFromParents( recordHash, 'parent', DG.CollectionRecord, 'children', store);
        break;

      case 'DG.Attribute':
        removeFromParents( recordHash, 'collection', DG.CollectionRecord, 'attrs', store);
        break;

      case 'DG.Case':
        removeFromParents( recordHash, 'collection', DG.CollectionRecord, 'cases', store);
        removeFromParents( recordHash, 'parent', DG.Case, 'children', store);
        break;

      case 'DG.GlobalValue':
        removeFromParents( recordHash, 'document', DG.Document, 'globalValues', store);
        break;

      default:
        DG.logWarn("removeRelations: Unrecognized record type: " + recordType);
      }
    };
 
    //Sets up parent/child relationships
    var configureRelations = function (recordType, recordHash, store, update) {

      if (update)
          removeRelations(recordType, recordHash, store);

      switch( recordType) {
      
      case 'DG.Document':
        break;
      
      case 'DG.Component':
        relateToParents( recordHash, 'document', DG.Document, 'components', store);
        break;

      case 'DG.DataContextRecord':
        relateToParents( recordHash, 'document', DG.Document, 'contexts', store);
        break;

      case 'DG.CollectionRecord':
        relateToParents( recordHash, 'context', DG.DataContextRecord, 'collections', store);
        relateToParents( recordHash, 'parent', DG.CollectionRecord, 'children', store);
        break;

      case 'DG.Attribute':
        relateToParents( recordHash, 'collection', DG.CollectionRecord, 'attrs', store);
        break;

      case 'DG.Case':
        relateToParents( recordHash, 'collection', DG.CollectionRecord, 'cases', store);
        relateToParents( recordHash, 'parent', DG.Case, 'children', store);
        break;

      case 'DG.GlobalValue':
        relateToParents( recordHash, 'document', DG.Document, 'globalValues', store);
        break;
      
      default:
        DG.logWarn("configureRelations: Unrecognized record type: " + recordType);
      }
    };
 
  return {  // return from closure

  /**
    Debugging utility.
   */
  getDataHash: function( iRecordType, iID) {
    return storageHash[iRecordType][iID];
  },

  // ..........................................................
  // QUERY SUPPORT
  // 

  fetch: function(store, query) {

    var recordTypeActual = query.get("recordType");
    var recordType = typeOfRecord(recordTypeActual, store);
    var records = null;
 
    records = cloneArray(storageArray[recordType]);
    
    // According to Erich Ocean, this is the place to synthesize ids if the ids
    // are to be synthesized from composite primary keys.
    // cf. https://groups.google.com/d/topic/sproutcore/l2eMYsnPFLQ/discussion
 
    store.loadRecords(recordTypeActual, records);
    store.dataSourceDidFetchQuery(query);
 
    return YES;
  },

  // ..........................................................
  // RECORD SUPPORT
  // 
  
  /**
    Assigns the next available ID for the specified record type.
    Sets the 'guid' property of the iRecordHash and returns the ID.
    @param    {String}    iClassName -- The name of the class/record type
    @param    {Object}    iRecordHash -- The object hash for the record
    @returns  {Number}    The newly-generated ID (which is also assigned 
                          as the 'guid' property of iRecordHash).
   */
  assignIDForNewRecord: function( iClassName, iRecordHash) {
    iRecordHash.guid = ++ currGuids[ iClassName];
    return iRecordHash.guid;
  },
  
  /**
    Loads an array of records of a given type into the data source.
    @param    {Object}            iRecordtype -- The class/record type of the records
    @param    {Array of Object}   iRecords -- Array of object hashes, one for each record
   */
  loadRecords: function( iRecordType, iRecords) {
    var recordTypeStr = DG.Record.stringFromRecordType( iRecordType);
    iRecords.forEach( function( iRecord) {
                        var recordHash = clone( iRecord),
                            guid = recordHash.guid;
                        // Update our next guid generator if necessary
                        if( currGuids[recordTypeStr] < guid)
                          currGuids[recordTypeStr] = guid;
                        storageHash[recordTypeStr][guid] = recordHash;
                        storageArray[recordTypeStr].pushObject( recordHash);
                      });
  },

  retrieveRecord: function(store, storeKey) {
    
    //Get the record type for the storeKey.
    var recordType = typeOfRecord(store.recordTypeFor(storeKey), store);
 
    //Get the id for the storeKey.
    var guid = store.idFor(storeKey);
 
    //Get the stored record hash from our internal structure.
    var recordHash = clone(storageHash[recordType][guid]);
 
    //Tell the store that we got the record from the datasource.
    store.dataSourceDidComplete(storeKey, recordHash);
 
    return YES;
  },
  
  createRecord: function(store, storeKey) {
    
   //Get the record type for the storeKey.
    var recordType = typeOfRecord(store.recordTypeFor(storeKey), store);
 
    //Get the hash in the store.
    var recordHash = clone(store.readDataHash(storeKey));
 
    //Generate a new index
    recordHash.guid = ++ currGuids[recordType];
 
    //Store the new record in the storageHash and the storageArray
    storageHash[recordType][recordHash.guid] = recordHash;
    storageArray[recordType].pushObject(recordHash);
 
    //Configure parent-child relationships
    configureRelations(recordType, recordHash, store);
 
    //Tell the store that we are done creating the record.
    store.dataSourceDidComplete(storeKey, clone(recordHash), recordHash.guid);
 
    return YES;
  },
  
  updateRecord: function(store, storeKey) {
    
    //Get the record type for the storeKey.
    var recordType = typeOfRecord(store.recordTypeFor(storeKey), store);
 
    //Get the hash in the store. This locks the hash so no one can edit it until we are done.
 
    var recordHash = clone(store.readDataHash(storeKey));
    //Get the guid.
    var guid = store.idFor(storeKey);
 
    //Remove the old object from our storage.
    var currentHash = storageHash[recordType][guid]; //get the hash in our store
    storageArray[recordType].removeObject(currentHash); //remove it from the array
    delete storageHash[recordType][guid]; //delete from the storage hash
 
    //Add the new object to our storage.
    storageHash[recordType][guid]=recordHash; //add it to the storage hash
    storageArray[recordType].pushObject(recordHash); //add it to the array
 
    //Configure parent-child relationships
    configureRelations(recordType, recordHash, store, true);
 
    //Let the store know that we are done.
    // We don't need to pass the dataHash or id, since the store already knows them.
    // Passing them forces the store to issue an "all properties have changed" notification.
    // We should only have to pass them if we've actually made a change to the id or
    // the recordHash which makes them different than what the store already knows about.
    store.dataSourceDidComplete(storeKey) ;
  
    return YES;        
  },
  
  destroyRecord: function(store, storeKey) {
    
    //Get the record type for the storeKey.
    var recordType = typeOfRecord(store.recordTypeFor(storeKey), store);
    //Get the guid.
    var guid = store.idFor(storeKey);
 
 
    //Remove the object from our storage.
    var currentHash = storageHash[recordType][guid];
    storageArray[recordType].removeObject(currentHash);
    delete storageHash[recordType][guid];
 
    removeRelations(recordType, currentHash, store);
 
    store.dataSourceDidDestroy(storeKey);
 
    return YES;
  }
  
  }; // end return from closure
  
}())); // end closure
