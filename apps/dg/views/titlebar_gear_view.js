// ==========================================================================
//                        DG.TitleBarGearView
// 
//  A button view that brings up a menu specific to the component
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

  DG.TitleBarGearView is the superview for the component views in the document.

  @extends SC.ImageView
*/
DG.TitleBarGearView = SC.ImageView.extend(
/** @scope DG.TitleBarGearView.prototype */ 
  (function() {
    return {
      contentView: null,
      value: 'sc-icon-options-16',
      menu: null,
      init: function() {
        sc_super();
        this.menu = SC.MenuPane.create( {
                layout: { width: 200, height: 150 }
                });
      },

      controller: function() {
        return !SC.none( this.contentView) ?
                this.contentView.get('controller') : null;
      }.property('contentView', 'contentView.controller'),

      controllerItems: function() {
        var tController = this.get('controller');
        return !SC.none( tController) ?
                tController.get('gearMenuItems') : [];
      }.property('controller', 'controller.gearMenuItems'),

      updateVisibility: function() {
        var items = this.get('controllerItems'),
            itemCount = items ? items.length : 0;
        this.set('isVisible', itemCount > 0);
      }.observes('controllerItems'),

      getDesiredMenuWidth: function( iMenuItems) {
        var tMaxCharCount = 0,
          kAvgCharWidth = 5,  // Use 5 pixels/character for estimation
          kWidthMargins = 60;
        iMenuItems.forEach( function( iItem) {
                    if( iItem && iItem.title)
                      tMaxCharCount = Math.max( tMaxCharCount, iItem.title.length);
                  });
        // Note: Currently we use a heuristic. Eventually we will probably need
        // to measure the text more precisely.
        return tMaxCharCount * kAvgCharWidth + kWidthMargins;
      },

      mouseDown: function(evt) {
        var tControllerItems = this.get( 'controllerItems');
        // Set the menu width based on the menu items to display
        this.menu.layout.width = this.getDesiredMenuWidth( tControllerItems);
        this.menu.set( 'items', tControllerItems);
        this.menu.popup( this);
        return YES; // handled
      },
      mouseUp: function(evt) {
        return YES; // handled
      },
      touchStart: function( iTouch) {
        return this.mouseDown(iTouch);
      },
      touchEnd: function( iTouch) {
        return this.mouseUp( iTouch);
      },
      selectedItemDidChange: function() {
        var tSelectedItem = this.menu.get('selectedItem'),
          tArgs = tSelectedItem.get('args') || [];
        tSelectedItem.get( 'itemAction').apply( tSelectedItem.get( 'target'), tArgs);
      }.observes('.menu.selectedItem')
    };
  }()) // function closure
);

