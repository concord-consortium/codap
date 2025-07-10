// ==========================================================================
//                            DG.MenuItem
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


/** @class DG.MenuItem A simple extension of SC.MenuItem to display font icons
 *
 *   @extends SC.MenuItemView
 */
DG.MenuItem = SC.MenuItemView.extend(
    /** @scope DG.MenuItem.prototype */
    {

      init: function () {
        sc_super();
      },
      displayProperties: ['title', 'toolTip', 'isEnabled', 'icon', 'isSeparator', 'shortcut', 'isChecked','rightIcon'],
      /** @private
       Overrides base class to display a font icon.

       @param context {SC.RenderContext}  the render context
       @param className {String} the classname that will show the icon
       @returns {void}
       */
      renderImage: function(context, image) {
        if (image && SC.ImageView.valueIsUrl(image)) {
          context.begin('img').addClass('image').setAttr('src', image).end();
        } else {
          context.begin('div').addClass(image).end() ;
        }
      },

      /** @private
       Fills the passed html-array with strings that can be joined to form the
       innerHTML of the receiver element.  Also populates an array of classNames
       to set on the outer element.

       @param {SC.RenderContext} context
       @param {Boolean} firstTime
       @returns {void}
       */
      render: function (context) {
        var    rightIcon = this.getContentProperty('itemRightIconKey');

        sc_super();
        if (rightIcon) {
          this.renderRightIcon(context, rightIcon);
        }
      },

      /** @private
       Generates a right icon for the label based on the content.  This method will
       only be called if the menu item view has icons enabled.  You can override
       this method to display your own type of icon if desired.

       @param {SC.RenderContext} context the render context
       @param {String} icon a URL or class name.
       @returns {void}
       */
      renderRightIcon: function (context, icon) {
        // get a class name and url to include if relevant
        var url = null;
        var className = null;
        var toolTip = this.getContentProperty('itemRightToolTipKey');
        if (toolTip) { toolTip = toolTip.loc();}
        // DG.log('toolTip: ' + toolTip);
        var classArray = ['dg-right-icon'];
        // classArray = ['dg-right-icon', 'dg-trash-icon'];
        // context.begin('div')
        //     .addClass(classArray)
        //     .end();
        if (icon && SC.ImageView.valueIsUrl(icon)) {
          url = icon;
          className = '';
          context.begin('img')
              .addClass(classArray)
              .setAttr('src', url)
              .setAttr('title', toolTip)
              .end();
        } else {
          className = icon;
          classArray.push(className);
          url = SC.BLANK_IMAGE_URL;
          context.begin('div')
              .addClass(classArray)
              .setAttr('title', toolTip)
              .end();
        }

        // generate the img element...
      },
      mouseUp: function (evt) {
        // SproutCore's event system will deliver the mouseUp event to the view
        // that got the mouseDown event, but for menus we want to track the mouse,
        // so we'll do our own dispatching.
        var targetMenuItem = this.getPath('parentMenu.rootMenu.targetMenuItem'),
            rightIconAction = this.getContentProperty('itemRightActionKey');

        if ($(evt.target).hasClass('dg-right-icon') && rightIconAction) {
          this.performRightMenuAction();
        } else if (targetMenuItem) {
          targetMenuItem.performAction();
        }
        return YES;
      },

      performRightMenuAction: function () {
        var action = this.getContentProperty('itemRightActionKey'),
            target = this.getContentProperty('itemRightTargetKey'),
            rootMenu = this.getPath('parentMenu.rootMenu'),
            responder;

        // Close the menu
        rootMenu.remove();
        // We're no longer flashing
        rootMenu._isFlashing = NO;

        action = (action === undefined) ? rootMenu.get('action') : action;
        target = (target === undefined) ? rootMenu.get('target') : target;

        // Notify the root menu pane that the selection has changed
        //rootMenu.set('selectedItem', this.get('content'));

        // Legacy support for actions that are functions
        if (SC.typeOf(action) === SC.T_FUNCTION) {
          action.apply(target, [rootMenu]);
          //@if (debug)
          SC.Logger.warn('Support for menu item action functions has been deprecated. Please use target and action.');
          //@endif
        } else {
          responder = this.getPath('pane.rootResponder') || SC.RootResponder.responder;

          if (responder) {
            // Send the action down the responder chain
            responder.sendAction(action, target, rootMenu);
          }
        }
      }

    });
