// ==========================================================================
//                          DG.IconButton
// 
//  A button view that allows user to close a component view.
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
sc_require('utilities/tap_hold_gesture');
sc_require('views/image_view');
sc_require('views/tooltip_enabler');

/** @class

  DG.IconButton provides a labeled icon button used in the tool shelf.

  @extends SC.View
*/
DG.IconButton = SC.View.extend(SC.Gesturable, DG.TooltipEnabler,
/** @scope DG.IconButton.prototype */
  (function() {
    var kTopOffset = 0,
        kIconExtent = { width: 34, height: 25 };
    return {
      classNames: 'dg-toolshelf-button',
      // if the property 'disabled' is set a class of the same name is set on the
      // button
      classNameBindings: ['disabled'],
      iconName: null,
      depressedIconName: null,
      title: null,
      iconExtent: kIconExtent,
      showBlip: false,  // If true, will show indicator that click will bring up palette
      childViews: 'iconView labelView'.w(),
        iconView: DG.FontIconView.design({
          classNames: 'dg-icon-button'
        }),
        labelView: SC.LabelView.design({
          classNames: ['dg-icon-label'],
          textAlign: SC.ALIGN_CENTER,
          valueBinding: '.parentView.title',
          localizeBinding: '.parentView.localize'
        }),

      gestures: [DG.TapHoldGesture],

      init: function() {
        sc_super();
        var tTitle = this.get('title') ? this.get('title').loc() : null,
            tTitleIsEmpty = SC.empty( tTitle),
            tLabelHeight = tTitleIsEmpty ? 0 : 15,
            tLabelWidth = tTitleIsEmpty ? 0 : DG.RenderingUtilities.textExtent(tTitle, 'MuseoSans-500', 12).x;
        this.iconView.set('layout',
          { top: kTopOffset, centerX: 0, height: this.iconExtent.height, width: this.iconExtent.width });
        this.iconView.set('iconClass', this.iconClass);
        this.setPath('labelView.layout',
            { top: this.iconExtent.height + kTopOffset, centerX: 0,
              width: tLabelWidth, height: tLabelHeight });
        this.labelView.set('isVisible', !tTitleIsEmpty);
        //this.adjust('height', this.iconExtent.height + kTopOffset + tLabelHeight);

        if( this.get('showBlip')) {
          this.iconView.set('layout',
              { top: 0, right: 0, height: this.iconExtent.height, width: this.iconExtent.width });
          this.adjust('width', this.iconExtent.width + 3);
          this.adjust('height', this.iconExtent.height + 3);
          this.appendChild(DG.ImageView.create({
            classNames: 'dg-icon-button-blip'.w(),
            layout: { left: 0, bottom: 0, width: 3, height: 3 }
          }));
        }
      },

      getWidth: function() {
        return Math.max( this.getPath('iconView.layout').width, this.getPath('labelView.layout').width);
      },

      iconClassDidChange: function() {
        this.iconView.set('iconClass', this.iconClass);
        this.iconView.displayDidChange();
      }.observes('iconClass'),

      /**
       * When part of a FlowedLayout, our height can get messed with, and this can cause a popup to
       * displayed in an inconvenient place.
       */
      adjustHeight: function() {
        this.adjust('height', this.getPath('iconView.layout').height +
            this.getPath('labelView.layout').height + kTopOffset);
      },
      
      isEnabled: true,
      // inverts the significance of isEnabled.
      disabledBinding: SC.Binding.transform(function (state) {return !state;}).oneWay('.isEnabled'),

      isMouseDown: NO,
      isMouseOver: NO,
      mouseMoved: function( evt) {
        this.mouseOver( evt);
        return YES;
      },
      mouseOver: function(evt) {
        this.set( 'isMouseOver', YES);
        return YES;
      },
      mouseExited: function(evt) {
        this.set( 'isMouseOver', NO);
        return YES;
      },
      mouseDown: function(evt) {
        DG.globalEditorLock.commitCurrentEdit();
        if( this.get('isEnabled')) {
          this.set( 'isMouseDown', YES);
          return YES; // so we get other events
        }
        return NO;
      },
      _lastMouseUpTime: 0,

      mouseUp: function(evt) {
        var thisTime = evt.timeStamp;
        // I have replaced the check for if the mouse is still hovering on the target. This fixes 
        // the issue, BZ754 where the menu doesn't appear if the user has clicked to make it disappear, 
        // but hasn't moved the mouse yet.  The reason the previous test was failing even though we were
        // still hovering on the icon, is that moving the mouse while a menu was open caused the
        // mouse exit event flag to fire off because a modal pane appears and removes the icon
        // from the responder chain.  This new test checks correctly for whether the mouse up event was
        // triggered by this icon.
        // Separately, but slightly related, with Webkit browsers, this fix doesn't solve the 
        // mouse cursor problem where the mouse doesn't look like a pointer(it remains default), 
        // after clicking away the modal pane, because Webkit doesn't update the mouse cursor 
        // until there is a mouse move event.
        var inside = this.$().within(evt.target);
        if( inside && thisTime - this._lastMouseUpTime >= 500) {
          this._action( evt);
          this._lastMouseUpTime = evt.timeStamp;
        }
        this.set( 'isMouseDown', NO);
        return YES; // so we get other events
      },
      _action: function(evt) {
        var action = this.get('action');
        var target = this.get('target') || null;
        var pane   = this.get('pane');
        if( action instanceof Function) {
          action.call( target);
        }
        else {
          var responder = pane ? pane.get('rootResponder') : null;
          if (responder) responder.sendAction(action, target, this, pane);
        }
      },
      touchStart: function( iTouch) {
        this.gestureTouchStart(iTouch);
        this.beginPropertyChanges();
        this.set( 'isMouseOver', YES);
        this.set( 'isMouseDown', YES);
        this.endPropertyChanges();
        return YES;
      },
      touchEnd: function( iTouch) {
        this.gestureTouchEnd(iTouch);
        if (!DG.TouchTooltips.clearTouchTooltip(iTouch.identifier))
          this._action(iTouch);
        this.beginPropertyChanges();
        this.set( 'isMouseOver', NO);
        this.set( 'isMouseDown', NO);
        this.endPropertyChanges();
      },

      tapHold: function(touch) {
        this._tooltipTouchID = DG.TouchTooltips.showTouchTooltip(
                                    touch, this, this.get('displayToolTip'));
      },

      tapHoldCancelled: function() {
        if (this._tooltipTouchID) {
          DG.TouchTooltips.hideTouchTooltip(this._tooltipTouchID);
        }
      },

      toolTipDidChange: function() {
        this.updateLayer();
      }.observes('displayToolTip'),

      /**
        Install the toolTip
        @param {SC.RenderContext} context the render context instance
      */
      render: function(context) {
        sc_super();

        // 'displayToolTip' is auto-localized if 'localize' is true
        var toolTip = this.get('displayToolTip');
        if (toolTip)
          context.setAttr('title', toolTip);
      }
    };
  }()) // function closure
);
