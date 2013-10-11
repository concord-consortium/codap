// ==========================================================================
//                          DG.IconButton
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

sc_require('views/image_view');

/** @class

  DG.IconButton provides a labeled icon button used in the tool shelf.

  @extends SC.View
*/
DG.IconButton = SC.View.extend(
/** @scope DG.IconButton.prototype */
  (function() {
    return {
      iconName: null,
      depressedIconName: null,
      title: null,
      iconExtent: { width: 32, height: 32 },
      childViews: 'iconView labelView'.w(),
        iconView: DG.ImageView.design({
          classNames: 'icon-button',
          textAlign: SC.ALIGN_CENTER,
          altTextBinding: '.parentView.title',
          localizeBinding: '.parentView.localize',
          value: function() {
            if( this.getPath( 'parentView.isMouseOver') && 
                this.getPath( 'parentView.isMouseDown'))
              return this.getPath('parentView.depressedIconName');
            else
              return this.getPath('parentView.iconName');
          }.property( 'parentView.isMouseDown', 'parentView.isMouseOver',
                      'parentView.iconName', 'parentView.depressedIconName').cacheable()
        }),
        labelView: SC.LabelView.design({
          classNames: ['icon-label'],
          layout: { bottom: 0, height: 15 },
          textAlign: SC.ALIGN_CENTER,
          valueBinding: '.parentView.title',
          localizeBinding: '.parentView.localize'
        }),
      
      init: function() {
        sc_super();
        this.iconView.set('layout',
          { top: 0, centerX: 0, height: this.iconExtent.width, width: this.iconExtent.height });
        this.labelView.set('isVisible', !SC.empty( this.get('title')));
        // Preload depressed icon image
        SC.imageQueue.loadImage( this.depressedIconName);
      },
      
      isEnabled: true,

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
        var responder = pane ? pane.get('rootResponder') : null ;
        if (responder) responder.sendAction(action, target, this, pane);
      },
      touchStart: function( iTouch) {
        this.beginPropertyChanges();
        this.set( 'isMouseOver', YES);
        this.set( 'isMouseDown', YES);
        this.endPropertyChanges();
        return YES;
      },
      touchEnd: function( iTouch) {
        this._action(iTouch);
        this.beginPropertyChanges();
        this.set( 'isMouseOver', NO);
        this.set( 'isMouseDown', NO);
        this.endPropertyChanges();
      },

      /**
        Install the toolTip
        @param {SC.RenderContext} context the render context instance
      */
      render: function(context) {
        sc_super();

        // 'displayToolTip' is auto-localized if 'localize' is true
        var toolTip = this.get('displayToolTip');
        if (toolTip)
          context.attr('title', toolTip);
      }
    };
  }()) // function closure
);

