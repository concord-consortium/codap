// ==========================================================================
//                            DG.EditorLock
//
//  Implements a global editor lock to coordinate the actions of multiple
//  disparate edit views. Clients that support editing should register with
//  the global editor lock and implement the required methods. Non-editing
//  clients may call DG.globalEditorLock.commitCurrentEdit() to force any
//  active edit to complete.
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

/**
  @class DG.EditorLock
  
  Currently just forwards to the SlickGrid implementation as a simple means
  of coordinating with it. Could easily be a replacement for it if we ever
  moved away from SlickGrid.
 */
DG.EditorLock = SC.Object.extend({

  /**
    Returns true if the specified controller is the active one.
    @param  {Object}  iEditController -- the controller to test
    @returns  {Boolean} True if the specified controller is active
   */
  isActive: function( iEditController) {
    return iEditController === DG.mainPage.getPath('mainPane.firstResponder') ||
        window.Slick.GlobalEditorLock.isActive( iEditController);
  },

  /**
    Make the specified controller the active one.
    @param  {Object}  iEditController -- the controller to activate
   */
  activate: function( iEditController) {
    try {
      window.Slick.GlobalEditorLock.activate( iEditController);
    }
    catch(e) {
      // SlickGrid throws an exception on failure to activate
      DG.logWarn( e.replace('SlickGrid', 'DG'));
    }
  },

  /**
    Remove the specified controller as the active one.
    @param  {Object}  iEditController -- the controller to deactivate
   */
  deactivate: function( iEditController) {
    try {
      window.Slick.GlobalEditorLock.deactivate( iEditController);
    }
    catch(e) {
      // SlickGrid throws an exception on failure to deactivate
      DG.logWarn( e.replace('SlickGrid', 'DG'));
    }
  },

  /**
    Requests the current active controller to complete its edit,
    commit the new value, and deactivate.
    @returns  {Boolean} True if the edit was completed successfully; false otherwise.
   */
  commitCurrentEdit: function() {
    var result = window.Slick.GlobalEditorLock.commitCurrentEdit();
    DG.mainPage.get('mainPane').makeFirstResponder( null);
    return result;
  },

  /**
    Requests the current active controller to cancel its current edit,
    discarding any results to this point.
    @returns  {Boolean} True if the edit was canceled successfully; false otherwise.
   */
  cancelCurrentEdit: function() {
    return window.Slick.GlobalEditorLock.cancelCurrentEdit();
  }
});

DG.globalEditorLock = new DG.EditorLock();
