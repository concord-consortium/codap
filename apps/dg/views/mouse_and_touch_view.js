// ==========================================================================
//                          DG.MouseAndTouchView
// 
//  A view that allows user to initiate an action when mouse or touch begins in the
// view and ends in the view.
//  
//  Author:   William Finzer
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

    DG.MouseAndTouchView is a base class for the close and minimize buttons in a component view's title bar.

 @extends SC.View
 */
DG.MouseAndTouchView = {
  isMouseDown: NO,
  isMouseOver: NO,
  isActive: NO,
  mouseMoved: function (evt) {
    this.mouseOver(evt);
    return YES;
  },
  mouseOver: function (evt) {
    if (this.get('isMouseDown')) {
      this.set('isActive', YES);
    }
    this.set('isMouseOver', YES);
    return YES;
  },
  mouseExited: function (evt) {
    this.set('isActive', NO);
    this.set('isMouseOver', NO);
    return YES;
  },
  mouseDown: function (evt) {
    if (!this.get('isMouseDown')) {
      this.set('isMouseDown', YES);
      this.set('isActive', YES);
    }
    return YES; // so we get other events
  },
  mouseUp: function (evt) {
    if (this.get('isActive')) {
      this.set('isActive', NO);
      this.set('isMouseOver', NO);
      this.set('isMouseDown', NO);
      this.doIt();
    }
    else {
      this.set('isMouseDown', NO);
      this.mouseExited(evt);
    }
    return YES; // so we get other events
  },
  touchStart: function (iTouch) {
    return YES;
  },
  touchEnd: function (iTouch) {
    this.doIt();
  },
  doIt: null
};