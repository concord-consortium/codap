// ==========================================================================
//                            DG.MenuPane
//
//  Author:   William Finzer
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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

/** @class DG.MenuPane A simple extension of SC.MenuPane to allow passing arguments
 *
 * There are two reasons for this override:
 *  1. We want to adjust the width of the menu before we display it.
 *  2. We want to pass arguments to the function being called.
 *
 *  Note that dgAction is the property of the menu item that will be used to invoke the
 *  the action of selecting the item from the menu.
 *
 *   @extends SC.Object
*/

sc_require('utilities/menu_item');

DG.MenuPane = SC.MenuPane.extend(
/** @scope DG.MenuPane.prototype */ 
{
  /**
   * @property {String | Function}
   */
  dgAction: null,

  exampleView: DG.MenuItem,

  getDesiredMenuWidth: function() {
    var tMaxCharCount = 0,
        kAvgCharWidth = 6,  // Use 6 pixels/character for estimation
        kWidthMargins = 60;
    this.get('items').forEach( function( iItem) {
      if (!iItem) {
        return;
      }
      var charCount = 0;
      if( iItem.title && (typeof iItem.title === 'string')) {
        charCount =  iItem.title.loc().length;
      }
      if (iItem.rightIcon) {
        charCount += 2;
      }
      tMaxCharCount = Math.max( tMaxCharCount, charCount);
    });
    // Note: Currently we use a heuristic. Eventually we will probably need
    // to measure the text more precisely.
    return tMaxCharCount * kAvgCharWidth + kWidthMargins;
  },

  selectedItemDidChange: function() {
    var tSelectedItem = this.get('selectedItem'),
        tArgs = tSelectedItem.get('args') || [],
        tAction = tSelectedItem.get( 'dgAction');
    if( typeof tAction === 'string') {
      tAction = tSelectedItem.target[tAction] || this[tAction];
    }
    if( tAction)
      tAction.apply( tSelectedItem.get( 'target'), tArgs);
    this.selectedItem = null;
  }.observes('selectedItem'),

  popup: function() {
    this.adjust('width', this.getDesiredMenuWidth());
    sc_super();
  },

  /**
   The name of the property that contains the right icon for each item.

   @type String
   @default "icon"
   @commonTask Menu Item Properties
   */
  itemRightIconKey: 'rightIcon',
  itemRightTargetKey: 'rightTarget',
  itemRightActionKey: 'rightAction',
  itemRightToolTipKey: 'rightToolTip',
  menuItemKeys: ['rightIcon','rightTarget','itemRightAction','itemTitleKey', 'itemValueKey', 'itemToolTipKey', 'itemIsEnabledKey', 'itemIconKey', 'itemSeparatorKey', 'itemActionKey', 'itemCheckboxKey', 'itemShortCutKey', 'itemHeightKey', 'itemSubMenuKey', 'itemKeyEquivalentKey', 'itemTargetKey', 'itemLayerIdKey']

});

