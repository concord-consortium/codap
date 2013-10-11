// ==========================================================================
//                      DG.DocumentListController
//
//  Interface for tracking a list of available documents on the server.
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
  Interface for tracking a list of available documents on the server.
  It's a SC.ArrayController, so you can just observe it like an array,
  and extract the .arrangedObjects() when you want to use them.
  
  @extends SC.ArrayController
*/
DG.DocumentListController = SC.ArrayController.extend(
/** @scope DG.documentListController.prototype */ {

  loadingMessage: 'DG.OpenSaveDialog.loading',
  noDocumentsMessage: 'DG.OpenSaveDialog.noDocuments',
  noResponseMessage: 'DG.OpenSaveDialog.error.noResponse',
 
  init: function() {
    sc_super();
    this.set('content', []);
    
    var loadingMessage = this.get('loadingMessage').loc();
    if( !SC.empty( loadingMessage))
      this.addObject({ name: loadingMessage, id: '' });

    DG.authorizationController.documentList( this);
  },
  
  receivedDocumentListResponse: function( iResponse) {
    //clear the loading message
    this.set('content', []);
    if (SC.ok(iResponse)) {
      var  serverText = iResponse.get('body'),
           docList = [],
           response;
      try {
          response = serverText && SC.json.decode(serverText);
      } catch (err) {
          response = {
              'valid' : false,
              'message' : 'error.parseError'
          };
      }
      if (response.valid === false) {
        //display the error code from the server as human readable message
        var error = response.message;
        this.addObject({ name: ('DG.DocumentListController.' + error).loc(), id: ''});
      } else if (response) {
        response.forEach( function( iDoc) {
                              if( iDoc.id && iDoc.name)
                                docList.push( { name: iDoc.name, id: iDoc.id });
                            });
        if (docList.length === 0) {
          var noDocumentsMessage = this.get('noDocumentsMessage').loc();
          if( !SC.empty( noDocumentsMessage)) {

            this.addObject({ name: noDocumentsMessage, id: '' });
          }
        } else {
          docList.sort( function( iItem1, iItem2) {
                          var canonical1 = iItem1.name.toLowerCase(),
                              canonical2 = iItem2.name.toLowerCase();
                          // Sort case-insensitive first so we get A,a,B,b,C,c,...
                          // rather than A,B,C,...,a,b,c,...
                          return canonical1.localeCompare( canonical2) ||
                                  iItem1.name.localeCompare( iItem2.name);
                        });
          this.set('content', docList);
        }
      }
    } else {
        //Error occured most likely due to interruption of connection to server
        var noResponseMessage = this.get('noResponseMessage').loc();
        this.addObject({ name: noResponseMessage, id: '' });
    }
  }

}) ;
