// ==========================================================================
//                          DG.DataInteractivePhoneHandler
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

sc_require('controllers/component_controller');

/** @class
 *
 * The DataInteractivePhoneHandler manages a Component containing a Data
 * Interactive.
 *
 * From CODAP's perspective a Data Interactive is a data source. It provides
 * data to an associated Data Context.
 *
 * It receives events from the interactive and acts upon them. Chiefly these
 * are events that create or update case data in collections managed by its
 * data context.
 *
 * @extends DG.ComponentController
 */
DG.DataInteractivePhoneHandler = DG.ComponentController.extend(
    /** @scope DG.DataInteractivePhoneHandler.prototype */ {

      /**
       The total number of document-dirtying changes.
       @property   {Number}
       */
      changeCount: 0,

      /**
       The number of document-dirtying changes that have been saved.
       If this is less than the total change count, then the document is dirty.
       @property   {Number}
       */
      savedChangeCount: 0,

      /**
       Initialization method
       */
      init: function () {
        sc_super();

      },

      /**
       * Break loops
       */
      destroy: function () {
        this.setPath('model.content', null);
        sc_super();
      },

      doCommand: function (iMessage, iCallback) {
        DG.log('gotIt: ' + JSON.stringify(iMessage));
        iCallback({success: true});
      },

      /**
       Whether or not the document contains unsaved changes such that the user
       should be prompted to confirm when closing the document, for instance.
       @property   {Boolean}
       */
      hasUnsavedChanges: function () {
        return this.get('changeCount') > this.get('savedChangeCount');
      }.property(),

      /**
       Synchronize the saved change count with the full change count.
       This method should be called when a save occurs, for instance.
       */
      updateSavedChangeCount: function () {
        this.set('savedChangeCount', this.get('changeCount'));
      },

      dispatchCommand: function (iCmd, iCallback) {
      }
    });

