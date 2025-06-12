// ==========================================================================
//                            DG.ScrollView
// 
//  A derived class of SC.ScrollView that implements DG-specific behaviors.
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

  A DG.ScrollView manages the horizontal and vertical scroll bars.
  DG.ScrollView differs from SC.ScrollView in that it always leaves room for
  a resize-corner and permits no overlap between the thumb and the buttons.

  @extends SC.ScrollView
*/
DG.ScrollView = SC.ScrollView.extend(
/** @scope DG.ScrollView.prototype */ {

  // Thumb should not overlap the arrow buttons
  horizontalScrollerView: SC.ScrollerView.extend({ buttonOverlap: 0 }),
  
  // Always leave room for resize-corner, even when opposite scroller isn't visible
  horizontalScrollerLayout: function() {
    var tRight = this.get('isVerticalScrollerVisible') ? 0 : this.getPath('horizontalScrollerView.scrollbarThickness');
    return { top: 0, left: 0, bottom: 0, right: tRight };
  }.property(),
  
  // Thumb should not overlap the arrow buttons
  verticalScrollerView: SC.ScrollerView.extend({ buttonOverlap: 0 }),

  // Always leave room for resize-corner, even when opposite scroller isn't visible
  verticalScrollerLayout: function() {
    var tBottom = this.get('isHorizontalScrollerVisible') ? 0 : this.getPath('verticalScrollerView.scrollbarThickness');
    return { top: 0, left: 0, bottom: tBottom, right: 0 };
  }.property(),



  // Convenience function
  scrollToBottom: function() {
    this.scrollTo( null, this.get('maximumVerticalScrollOffset'));
  }
});

