// ==========================================================================
//                              DG.Core
// 
//  This is intended to be a gathering place for widely useful "core" utility
//  functions.
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

DG.Core = {

  /**
   * This pseudo global flag is set during onMouseDownCapture function in React components to signal to
   * an SC.View that contains them can tell that they should not attempt to handle a given event.
   */
  gClickWillBeHandledInReactComponent: false,
  setClickHandlingForReact: function() {
    DG.Core.gClickWillBeHandledInReactComponent = true;
    setTimeout(function() {
      DG.Core.gClickWillBeHandledInReactComponent = false;
    }, 200);
  },

  /**
    Returns the "class" object which corresponds to the specified string.
    @param    {String}  iClassName -- The name of the class object to be returned
    @returns  {Object}  The class object corresponding to the specified name
   */
  classFromClassName: function( iClassName) {
    var parts = iClassName ? iClassName.split('.') : [],
        i, partCount = parts.length,
        obj = window;
    for( i = 0; i < partCount; ++i) {
      obj = obj && obj[ parts[i]];
    }
    return obj || null;
  },
  
  /**
    Returns true if the specified event indicates that a modifier key
    that extends selection was down at the time of the event. This
    method doesn't currently differentiate between item selection
    (e.g. cmd/ctrl click) and range selection (shift click).
    @param    {SC.Event}    iEvent -- The SproutCore event passed to an event handler
    @returns  {Boolean}     True if the event indicates extension, false otherwise
   */
  isExtendingFromEvent: function( iEvent) {
        // ctrlKey masquerades as meta key in SC.Event
    var osUsesMetaKey = (SC.browser.os === SC.OS.mac) || (SC.browser.os === SC.OS.ios),
        isMetaKeyExtension = osUsesMetaKey && iEvent.metaKey && !iEvent.ctrlKey,
        isCtrlKeyExtension = !osUsesMetaKey && iEvent.ctrlKey;
    return iEvent.shiftKey || isMetaKeyExtension || isCtrlKeyExtension;
  }

};
