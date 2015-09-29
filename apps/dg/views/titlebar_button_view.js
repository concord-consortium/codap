// ==========================================================================
//                          DG.TitleBarButtonView
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

/** @class

    DG.TitleBarButtonView is a base class for the close and minimize buttons in a component view's title bar.

 @extends SC.View
 */
DG.TitleBarButtonView = SC.View.extend(
    /** @scope DG.TitleBarButtonView.prototype */
    (function () {

    return {
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
        mouseUp: function(evt) {
          if( this.get( 'isActive')) {
            this.set( 'isActive', NO);
            this.set( 'isMouseOver', NO);
            this.set( 'isMouseDown', NO);
            this.doIt();
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
          this.doIt();
        },
        isVisible: SC.platform.touch,  // Always show minimize on touch devices
        doIt: null
    };
  }()) // function closure
);
/** @class

    DG.TitleBarCloseButton is a base class for the close and minimize buttons in a component view's title bar.

 @extends DG.TitleBarButtonView
 */
DG.TitleBarCloseButton = DG.TitleBarButtonView.extend(
    /** @scope DG.TitleBarButtonView.prototype */
    (function () {
      SC.imageQueue.loadImage(static_url('images/icon-ex.svg'));
      SC.imageQueue.loadImage(static_url('images/icon-ex-hover.svg'));
      SC.imageQueue.loadImage(static_url('images/icon-ex-active.svg'));

    return {
        classNames: 'close-icon'.w(),
        doIt: function() {
          var tComponentId = this.parentView.viewToDrag().getPath('controller.model.id'),
              tState;
          DG.UndoHistory.execute(DG.Command.create({
            name: 'component.close',
            undoString: 'DG.Undo.component.close',
            redoString: 'DG.Redo.component.close',
            _componentId: tComponentId,
            _controller: function() {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            _model: null,
            execute: function() {
              var tController = this._controller(),
                  tComponentView = tController.get('view'),
                  tContainerView = tComponentView.get('parentView');

              this.log = 'closeComponent: %@'.fmt(tComponentView.get('title'));
              this._model = tController.get('model');

              tController.willSaveComponent();

              if (tController.saveGameState) {
                // If we are a GameController, try to save state.
                // Since this is an asynchronous operation, we have to hold off closing the component
                // until it is complete (or it will fail).
                // Also, since closing the document will happen after this command executes, dirtying the
                // document will clear the undo history, so we must force it not to dirty.
                tController.saveGameState(function(result) {
                  if (result && result.success) {
                    tState = result.state;
                  }
                  tContainerView.removeComponentView( tComponentView);
                });
              } else {
                tContainerView.removeComponentView( tComponentView);
              }
            },
            undo: function() {
              DG.currDocumentController().createComponentAndView(this._model);

              var tController = this._controller();
              if (tController.restoreGameState && tState) {
                tController.restoreGameState({gameState: tState});
              }
            }
          }));
        }
    };
  }()) // function closure
);
/** @class

    DG.TitleBarMinimizeButton is a base class for the close and minimize buttons in a component view's title bar.

 @extends DG.TitleBarButtonView
 */
DG.TitleBarMinimizeButton = DG.TitleBarButtonView.extend(
    /** @scope DG.TitleBarButtonView.prototype */
    (function () {
      SC.imageQueue.loadImage(static_url('images/icon-minimize.svg'));
      SC.imageQueue.loadImage(static_url('images/icon-minimize-hover.svg'));
      SC.imageQueue.loadImage(static_url('images/icon-minimize-active.svg'));

    return {
        classNames: 'min-icon'.w(),
        doIt: function() {
          var tComponentView = this.parentView.viewToDrag();
/*
          DG.UndoHistory.execute(DG.Command.create({
            name: 'component.minimize',
            undoString: 'DG.Undo.component.minimize',
            redoString: 'DG.Redo.component.minimize',
            execute: function() {
*/
              tComponentView.toggleMinimization( tComponentView);
/*
            },
            undo: function() {
              this.execute();
            }
          }));
*/
        }
    };
  }()) // function closure
);
