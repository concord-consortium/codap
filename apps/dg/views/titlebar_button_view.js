// ==========================================================================
//                          DG.TitleBarCloseButton
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

sc_require('views/mouse_and_touch_view');

/** @class

    DG.TitleBarCloseButton handles the close button in a component view's title bar.

 @extends SC.View
 */
DG.TitleBarCloseButton = SC.View.extend(DG.MouseAndTouchView,
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
    return {
        classNames: 'dg-close-icon'.w(),
        isSelected: false,
        classNameBindings: ['isSelected:dg-close-icon-selected'],
        isVisible: false, // to start with
        doIt: function() {
          var tComponentId = this.parentView.viewToDrag().getPath('controller.model.id'),
              tController = DG.currDocumentController().componentControllersMap[tComponentId],
              tShouldConfirmClose = tController.get('shouldConfirmClose'),
              tConfirmCloseMessage = tController.get('confirmCloseMessage')
                  || 'DG.Component.closeComponent.confirmCloseMessage',
              tConfirmCloseDescription = tController.get('confirmCloseDescription')
                  || 'DG.Component.closeComponent.confirmCloseDescription';

          var closeComponentAfterConfirm = function () {
            DG.closeComponent(tComponentId);
          }.bind(this);

          if (tShouldConfirmClose) {
            DG.AlertPane.warn({
              message: tConfirmCloseMessage,
              description: tConfirmCloseDescription,
              buttons: [
                { title: 'DG.Component.closeComponent.okButtonTitle',
                  action: closeComponentAfterConfirm,
                  localize: YES
                },
                { title: 'DG.Component.closeComponent.cancelButtonTitle',
                  localize: YES,
                  isCancel: YES,
                  isDefault: YES
                }
              ],
              localize: YES
            });

          } else {
            DG.closeComponent(tComponentId);
          }
        }
    };
  }()) // function closure
);

/** @class

    DG.TitleBarMinimizeButton handles the minimize button in a component view's title bar.

 @extends SC.View
 */
DG.TitleBarMinimizeButton = SC.View.extend(DG.MouseAndTouchView,
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
    return {
        classNames: 'dg-min-icon'.w(),
        isVisible: false, // to start with
        isSelected: false,
        classNameBindings: ['isSelected:dg-min-icon-selected'],
        doIt: function() {
          var tComponentView = this.parentView.viewToDrag();
          DG.UndoHistory.execute(DG.Command.create({
            name: 'component.minimize',
            undoString: 'DG.Undo.component.minimize',
            redoString: 'DG.Redo.component.minimize',
            log: (tComponentView.get('isMinimized') ? "Expanded component" : "Minimized component"),
            execute: function() {
              tComponentView.toggleMinimization();
            },
            undo: function() {
              this.execute();
            }
          }));
        }
    };
  }()) // function closure
);

/** @class

    DG.TitleBarUndoRedoButton is a base class for TitleBarUndoButton and TitleBarRedoButton

 @extends SC.View
 */
DG.TitleBarUndoRedoButton = SC.View.extend(DG.MouseAndTouchView,
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
      return {
        localize: true,
        isVisibleBinding: SC.Binding.oneWay('DG.UndoHistory.enabled'),
        isVisible: true,
        toolTipDidChange: function() {
          this.updateLayer();
        }.observes('displayToolTip'),
        render: function(context) {
          sc_super();
          var toolTip = this.get('displayToolTip');
          if (toolTip)
            context.setAttr('title', toolTip);
        }
      };
    }()) // function closure
);

/** @class

    DG.TitleBarUndoButton handles the undo button that appears in a component view's title bar
    when DG.embeddedMode === 'yes'.

 @extends SC.View
 */
DG.TitleBarUndoButton = DG.TitleBarUndoRedoButton.extend(
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
      return {
        toolTip: function() {
          var cmd = this.get('nextUndoCommand');
          return (cmd ? cmd.get('undoString') : 'DG.mainPage.mainPane.undoButton.toolTip');  // "Undo the last action"
        }.property('nextUndoCommand'),
        nextUndoCommandBinding: SC.Binding.oneWay('DG.UndoHistory.nextUndoCommand'),
        isEnabledBinding: SC.Binding.oneWay('DG.UndoHistory.canUndo'),
        classNames: 'dg-undo-icon'.w(),
        doIt: function() {
          DG.UndoHistory.undo();
        }
      };
    }()) // function closure
);

/** @class

    DG.TitleBarRedoButton handles the redo button that appears in a component view's title bar
    when DG.embeddedMode === 'yes'.

 @extends SC.View
 */
DG.TitleBarRedoButton = DG.TitleBarUndoRedoButton.extend(
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
      return {
        toolTip: function() {
          var cmd = this.get('nextRedoCommand');
          return (cmd ? cmd.get('redoString') : 'DG.mainPage.mainPane.redoButton.toolTip');  // "Redo the last undone action"
        }.property('nextRedoCommand'),
        nextRedoCommandBinding: SC.Binding.oneWay('DG.UndoHistory.nextRedoCommand'),
        isEnabledBinding: SC.Binding.oneWay('DG.UndoHistory.canRedo'),
        classNames: 'dg-redo-icon'.w(),
        doIt: function() {
          DG.UndoHistory.redo();
        }
      };
    }()) // function closure
);
