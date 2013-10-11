// ==========================================================================
//                          DG.RESTDataSource
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

  RESTful data source following the pattern laid out in the "Connecting With a DataSource"
  SproutCore Guide at http://guides.sproutcore.com/data_source.html

  @extends SC.DataSource
*/
DG.RESTDataSource = SC.DataSource.extend( (function() {

  var urlPathFromRecordType = function( iRecType, iID) {
            // For now, use private SC function to get class name.
        var className = DG.Record.stringFromRecordType( iRecType),
            // We expect class names of the form 'DG.Case',
            // so we strip off the 'DG.' to get the urlPath.
            dotIndex = className.indexOf('.');
        if( dotIndex >= 0)
          className = className.substr( dotIndex + 1);
        return '/DataGames/DataServer/server/%@/%@'.fmt( className, iID);
      },

      urlPathFromQuery = function( iQuery) {
        // Assume each query only has a single record type.
        // A more sophisticated approach would be required
        // for queries which support multiple record types.
        // (cf. the 'recordTypes' property of SC.Query).
        var recType = iQuery.get('recordType');
        return urlPathFromRecordType( recType);
      };

/** @scope DG.RESTDataSource.prototype */
  return {

  // ..........................................................
  // QUERY SUPPORT
  // 

  fetch: function( iStore, iQuery) {

    var urlPath = urlPathFromQuery( iQuery);
    
    if( !SC.empty( urlPath)) {
      SC.Request.getUrl( urlPath)
        .notify( this, 'fetchDidComplete', iStore, iQuery)
        .json().send();
      return YES; // We handled the query
    }
   
    return NO; // We didn't handle the query
  },

  fetchDidComplete: function( iResponse, iStore, iQuery) {
    if( SC.ok( iResponse)) {
      var recordType = iQuery.get('recordType'),
          records = iResponse.get('body');
       
      iStore.loadRecords( recordType, records);
      
      // Tell the store that we've completed successfully.
      iStore.dataSourceDidFetchQuery( iQuery);
    }
    else {
      // Tell the store that your server returned an error
      iStore.dataSourceDidErrorQuery( iQuery, iResponse);
    }
  },

  // ..........................................................
  // RECORD SUPPORT
  // 
  
  retrieveRecord: function( iStore, iStoreKey) {
    
    var recordType = iStore.recordTypeFor( iStoreKey),
        id = iStore.idFor( iStoreKey),
        data = iStore.readDataHash( iStoreKey),
        urlPath = urlPathFromRecordType( recordType, id);

    if( !SC.none( urlPath)) {
      SC.Request.getUrl( urlPath)
        .notify( this, 'retrieveRecordDidComplete', iStore, iStoreKey, id)
        .json().send( data);
     
      return YES;
    }
    
    return NO ; // return YES if you handled the storeKey
  },
  
  retrieveRecordDidComplete: function( iResponse, iStore, iStoreKey, iID) {
    if( SC.ok( iResponse) && iResponse.get('status') === 200) {
      // Tell the store that we have successfully completed
      iStore.dataSourceDidComplete( iStoreKey, iResponse.get('body'));
    }
    else {
      // Tell the store that your server returned an error
      iStore.dataSourceDidError( iStoreKey, iResponse);
    }
  },
  
  createRecord: function( iStore, iStoreKey) {
  
    var recordType = iStore.recordTypeFor( iStoreKey),
        data = iStore.readDataHash( iStoreKey),
        urlPath = urlPathFromRecordType( recordType);
 
    if( !SC.empty( urlPath)) {
      SC.Request.postUrl( urlPath)
        .notify(this, 'createRecordDidComplete', iStore, iStoreKey)
        .json().send( data);
      return YES;
    }
   
    return NO;
  },
 
  createRecordDidComplete: function( iResponse, iStore, iStoreKey) {
    var body = iResponse.get('body');
    if( SC.ok( iResponse) && iResponse.get('status') === 200) {
      // Tell the store that we have completed successfully
      iStore.dataSourceDidComplete( iStoreKey, null, body.id);
    } 
    else {
      // Tell the store that your server returned an error
      iStore.dataSourceDidError( iStoreKey, iResponse);
    }
  },
  
  updateRecord: function( iStore, iStoreKey) {
    
    var recordType = iStore.recordTypeFor( iStoreKey),
        id = iStore.idFor( iStoreKey),
        data = iStore.readDataHash( iStoreKey),
        urlPath = urlPathFromRecordType( recordType, id);
    
    if( !SC.empty( urlPath)) {
      SC.Request.putUrl( urlPath)
        .notify( this, 'updateRecordDidComplete', iStore, iStoreKey, id)
        .json().send( data);
       
      return YES; // We handled the request
    }

    return NO; // We didn't handle the request
  },
  
  updateRecordDidComplete: function( iResponse, iStore, iStoreKey, iID) {
    if( SC.ok( iResponse) && iResponse.get('status') === 200) {
      // Tell the store that we have successfully updated
      iStore.dataSourceDidComplete( iStoreKey);
    }
    else {
      // Tell the store that your server returned an error
      iStore.dataSourceDidError( iStoreKey, iResponse);
    }
  },
  
  destroyRecord: function( iStore, iStoreKey) {
    
    var recordType = iStore.recordTypeFor( iStoreKey),
        id = iStore.idFor( iStoreKey),
        urlPath = urlPathFromRecordType( recordType, id);
    
    if( !SC.empty( urlPath)) {
      SC.Request.deleteUrl( urlPath)
        .notify( this, 'destroyRecordDidComplete', iStore, iStoreKey)
        .json().send();
      return YES; // We handled the request
    }
    
    return NO; // We didn't handle the request
  },
  
  destroyRecordDidComplete: function( iResponse, iStore, iStoreKey) {
    //var body = iResponse.get('body');
    if( SC.ok( iResponse) && iResponse.get('status') === 200) {
      // Tell the store that we have successfully updated
      iStore.dataSourceDidDestroy( iStoreKey);
    } 
    else {
      // Tell the store that your server returned an error
      iStore.dataSourceDidError( iStoreKey, iResponse);
    }
  }
  
  };  // end return from closure
  
}()));

