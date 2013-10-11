// ==========================================================================
//                          DG.TitleBarButtonView
// 
//  A button view that allows user to close a component view.
//  
//  Author:   William Finzer
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

  DG.TitleBarButtonView shows a close button for a component view.

  @extends SC.ImageView
*/
DG.TitleBarButtonView = SC.ImageView.extend(
/** @scope DG.TitleBarButtonView.prototype */ 
  (function() {
    var tClose = static_url('images/closeicon.png'),
        tClose_cross = static_url('images/closeicon_cross.png'),
        tClose_cross_dark = static_url('images/closeicon_cross_dark.png');

    // We only need to preload once, so do it here.
    SC.imageQueue.loadImage( tClose_cross);
    SC.imageQueue.loadImage( tClose_cross_dark);

    return {
        value: function() {
          if( this.get( 'isMouseOver')) {
            if( this.get( 'isActive'))
              return tClose_cross_dark;
            else
              return tClose_cross;
          }
          else if( this.get( 'isMouseDown'))
            return tClose_cross;
          else
            return tClose;
        }.property( 'isMouseDown', 'isActive', 'isMouseOver').cacheable(),
        preloadIcons: function() {
        },
        isMouseDown: NO,
        isMouseOver: NO,
        isActive: NO,
        mouseMoved: function( evt) {
          this.mouseOver( evt);
          return YES;
        },
        mouseOver: function(evt) {
          if( this.get( 'isMouseDown')) {
            this.set( 'isActive', YES);
          }
          this.set( 'isMouseOver', YES);
          return YES;
        },
        mouseExited: function(evt) {
          this.set( 'isActive', NO);
          this.set( 'isMouseOver', NO);
          return YES;
        },
        mouseDown: function(evt) {
          if( !this.get( 'isMouseDown')) {
            this.set( 'isMouseDown', YES);
            this.set( 'isActive', YES);
          }
          return YES; // so we get other events
        },
        mouseUp: function(evt) {
          if( this.get( 'isActive')) {
            this.closeIt();
          }
          else {
            this.set( 'isMouseDown', NO);
            this.mouseExited( evt);
          }
          return YES; // so we get other events
        },
        touchStart: function( iTouch) {
          return YES;
        },
        touchEnd: function( iTouch) {
          this.closeIt();
        },
        closeIt: function() {
          var tComponentView = this.parentView.viewToDrag(),
            tContainerView = tComponentView.parentView;
          tContainerView.removeComponentView( tComponentView);
        }
    };
  }()) // function closure
);
