// ==========================================================================
//                      DG.DocumentListController
//
//  Interface for tracking a list of available documents on the server.
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

    DG.authorizationController.documentList( this);
  },

  receivedDocumentListSuccess: function( serverText) {
    this.set('content', []);

    serverText.forEach( function( iDoc) {
                          if( iDoc.id && iDoc.name)
                            this.addObject( { name: iDoc.name, id: iDoc.id });
    }.bind(this));
  },

  receivedDocumentListFailure: function( errorCode) {
    this.set('content', []);

    var messageKey = ('DG.DocumentListController.' + errorCode),
        message = messageKey.loc();
    if ( message === messageKey) {
      //Error occurred most likely due to interruption of connection to server
      message = this.get('noResponseMessage').loc();
    }
    this.addObject({ name: message, id: '' });
  }

}) ;
