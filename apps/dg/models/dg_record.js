// ==========================================================================
//                                DG.Record
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

  Base class for all DG RecordTypes.

  @extends DG.Record
*/

// Move to closure
DG._guid = -1;

DG.Record = SC.Record.extend(
/** @scope DG.Record.prototype */ {

/*  According to Erich Ocean, apps should always ignore unknown properties on records.
    Here's the meaning of this from the code:

      Whether to ignore unknown properties when they are being set on the record
      object. This is useful if you want to strictly enforce the model schema
      and not allow dynamically expanding it by setting new unknown properties
  */
  ignoreUnknownProperties: YES,
  
  /**
    Retrieves the record type or class of the object (e.g. DG.Document)
   */
  recordType: function() {
    // Record type should be the constructor function
    return this.constructor;
  }.property().cacheable(),
  
  // http://markmail.org/message/lbclk6eevdr2rec3#query:+page:1+mid:cu5yc55ynrn525dv+state:results
  guid: SC.Record.attr(String, { defaultValue: function() { return DG._guid--; } }),

  /**
    Update any properties that need to be updated pre-archive, e.g. layout.
  
    In general when overriding, call sc_super(), and then do your own thing.
  
    @function
  */
  willSaveRecord: function() {
  },
  
  /**
  Restore any properties that need to be updated post-archive, e.g. layout.
  
  */
  didLoadRecord: function() {
  },
  
  toLink: function() {
    var recordType = this.get('recordType'),
        className = DG.Record.stringFromRecordType( recordType);
    return { type: className, id: this.get('id') };
  },

  /**
   Return a hash which will get written out / read in file io
   
   @returns {Hash} JSON-style hash to write out when archiving this object.
  */
  toArchive: function() {
    var store = this.get('store'),
        id = this.get('id'),
        recordType = this.get('recordType'),
        storeKey = store.storeKeyFor( recordType, id),
        dataHash = null,
        this_ = this;
    
    // Function passed to forEachRelation to add child records to those
    // to archive and to remove redundant relationship references.
     function prepareRelationForArchiving( iProperty, iRelationAttr) {
        // Make sure owned child records get archived
        if( iRelationAttr.isOwner) {
          var children = this_.get( iProperty) || [],
              sortedChildren = [];
          // Create the child relation property if necessary (e.g. dataHash['components'])
          dataHash[iProperty] = [];
          // We must sort them to guarantee that they get written
          // out in the correct order.
          children.forEach( function( iChild) {
                              var status = iChild && iChild.get('status');

                              /*jshint bitwise:false */
                              // Destroyed child records should not be be written out
                              if( status && !(status & SC.Record.DESTROYED) &&
                                    (status !== SC.Record.BUSY_DESTROYING)) {
                                sortedChildren.push( iChild);
                              }
                            });
          sortedChildren.sort( function( iChild1, iChild2) {
                                  var childID1 = iChild1.get('id'),
                                      childID2 = iChild2.get('id');
                                  if( childID1 < childID2) return -1;
                                  if( childID1 > childID2) return 1;
                                  return 0;
                                });
          sortedChildren.forEach( function( iChild) {
            // Call toArchive() on the child record recursively to get its JSONifiable representation.
            // Note that this will recursively call toArchive for all of its children as well.
            // Finally, push the returned object onto the end of the child record array with name
            // specified by 'property', e.g. 'components'.
            var childHash = iChild.toArchive();
            if( childHash) {
              delete childHash[iRelationAttr.inverse];
              dataHash[iProperty].push( childHash);
            }
        });
      }
      // Eliminate the parent-->child links, since they carry the same information as the
      // child-->parent links, and both can be derived from the latter on the server side.
      else if (iRelationAttr.isMaster) {
          delete dataHash[ iProperty];
      }
    }
    
    this.willSaveRecord(); // Give our record a chance to update itself before we write it out.
    
    // The dataHash is a JavaScript object which contains just the properties that correspond
    // to the database-storable fields of the record, without any of the ancillary SproutCore stuff.
    dataHash = SC.copy( store.readDataHash( storeKey), false) || {};

    // Loop through this object's relationships, adding child records
    // to those to archive and removing redundant relationship references.
    this.forEachRelation( prepareRelationForArchiving);
    
    return dataHash;
  },
  
  /**
    Calls the specified function for every bidirectional relationship (e.g. one-to-one,
    one-to-many, many-to-many) in this object's record type.
  
    Signature of iFunction:
    iFunction( iProperty, iRelation)
      iProperty is the name of the property containing the relationship (e.g. "collections")
      iRelationAttr is the SC.RecordAttribute representing the relationship in this record
      iInverseAttr is the SC.RecordAttribute representing the relationship in the inverse record
    
    @param {Function} iFunction   Function to call for each relation
   */
  forEachRelation: function( iFunction) {
    DG.Record.forEachRelation( this.get('recordType'), iFunction);
  }
  
});

/**
  Utility function for converting from a record type (e.g. DG.Document)
  to a class name (record type string), e.g. "DG.Document".
  
  @param {Class}  iRecordType   Object representing the record class (e.g. DG.Document)
  @returns {String}             String representation of the class name (e.g. "DG.Document")
 */
DG.Record.stringFromRecordType = function( iRecordType) {
  return SC._object_className( iRecordType) || '';
};

/**
  Utility function for converting from a class name (record type string),
  e.g. "DG.Document", to a record type (e.g. DG.Document).
  
  @param {String} iRecordTypeStr  String representing the name of the record class (e.g. "DG.Document")
  @returns {Class}                Object representing the record class (e.g. DG.Document)
 */
DG.Record.recordTypeFromString = function( iRecordTypeStr) {
  var dotIndex = iRecordTypeStr.indexOf('.'),
      classNameStartPos = dotIndex >= 0 ? dotIndex + 1 : 0,
      className = iRecordTypeStr.substr( classNameStartPos);
  return DG[className];
};

/**
  Calls the specified function for every bidirectional relationship (e.g. one-to-one,
  one-to-many, many-to-many) in the specified record type.

  Signature of iFunction:
  iFunction( iProperty, iRelationAttr, iInverseAttr)
    iProperty is the name of the property containing the relationship (e.g. "collections")
    iRelationAttr is the SC.RecordAttribute representing the relationship in this record
    iInverseAttr is the SC.RecordAttribute representing the relationship in the inverse record
 */
DG.Record.forEachRelation = function( iRecordType, iFunction) {
  var proto = iRecordType.prototype,
      key, attr, inverseType, inverseProto, inverseAttr;
  
  for( key in proto) {
    if( proto.hasOwnProperty( key)) {
      attr = proto[key];
      if( attr && attr.typeClass && attr.inverse) {
        inverseType = attr.typeClass();
        inverseProto = inverseType.prototype;
        inverseAttr = inverseProto[ attr.inverse];
        if (SC.typeOf(inverseType) === SC.T_CLASS)
          iFunction( key, attr, inverseAttr);
      }
    }
  }
};

/** @private
  Destroys records in the specified RecordArray from the store, optionally preserving some of them.
  @param  {DG.RecordArray}  RecordArray returned from DG.store.find(), for instance
  @param  {Array of Number} [Optional] Array of record IDs to be excluded from destruction
                            Note that the Array will be sorted, so clients that require the
                            original order should make a copy before calling this function.
 */
DG.Record._destroyRecordArrayWithExclusions = function( iRecords, ioExcludeRecordIDs) {

  var deletedCaseIDs = [];

  iRecords.flush();
  if( iRecords.get('scheduledFlushCount') > 0) {
    // Flush wasn't completed due to time constraints.
    // Schedule completion for later, once the flush is complete.
    window.setTimeout(function() {
      SC.run(function() {
        DG.Record._destroyRecordArrayWithExclusions( iRecords, ioExcludeRecordIDs);
      });
    }, 1);
    return;
  }
    
  if( ioExcludeRecordIDs)
    ioExcludeRecordIDs.sort( DG.ArrayUtils.numericComparator);
  
  var storeKeys = iRecords.get('storeKeys');
  
  // Filter out the storeKeys we don't want to destroy.
  function filterFunction( iStoreKey) {
    var id = DG.store.idFor( iStoreKey),
        // Note: binarySearch() handles null/undefined array possibility
        foundIndex = DG.ArrayUtils.binarySearch( ioExcludeRecordIDs, id,
                                                 DG.ArrayUtils.numericComparator);
    // IDs that were not found in the excludeList should be included.
    return foundIndex === -1;
  }
  var storeKeysToDestroy = storeKeys.filter( filterFunction);
  storeKeysToDestroy.forEach( function( iStoreKey) {
                                deletedCaseIDs.push( DG.store.idFor( iStoreKey));
                              });

  // Destroy the records by their storeKeys
  DG.store.destroyRecords( undefined, undefined, storeKeysToDestroy);

  // Destroy the RecordArray once we're through with it
  iRecords.destroy();
  
  return deletedCaseIDs;
};

/**
  Destroys all records of the specified type from the store.
  @param  {Object}          Class of record to be destroyed (e.g. DG.Attribute, DG.Case, etc.)
  @param  {Array of Number} [Optional] Array of record IDs to be excluded from destruction
                            Note that the Array will be sorted, so clients that require the
                            original order should make a copy before calling this function.
 */
DG.Record.destroyAllRecordsOfType = function( iRecordType, ioExcludeRecordIDs) {
  var records;

  // Find the records
  records = DG.store.find( iRecordType);

  // Destroy all of them, except those excluded by the client.
  return DG.Record._destroyRecordArrayWithExclusions( records, ioExcludeRecordIDs);
};

