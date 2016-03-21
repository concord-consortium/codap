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
        classNames: 'close-icon'.w(),
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
            this.closeComponent(tComponentId, tController);
          }.bind(this);

          if (tShouldConfirmClose) {
            DG.AlertPane.warn({
              message: tConfirmCloseMessage,
              description: tConfirmCloseDescription,
              buttons: [
                { title: 'DG.Component.closeComponent.okButtonTitle',
                  action: closeComponentAfterConfirm,
                  localize: YES,
                  isDefault: YES
                },
                { title: 'DG.Component.closeComponent.cancelButtonTitle',
                  localize: YES,
                  isCancel: YES
                }
              ],
              localize: YES
            });

          } else {
            this.closeComponent(tComponentId, tController);
          }
        },

        closeComponent: function (iComponentID, iController) {
          var tState;

          // Give the controller a chance to do some housekeeping before we close it (defocus, commit edits, etc.).
          // Also, do this outside of the undo command, so that it can register its own
          // separate undo command if desired.
          iController.willCloseComponent();

          DG.UndoHistory.execute(DG.Command.create({
            name: 'component.close',
            undoString: 'DG.Undo.component.close',
            redoString: 'DG.Redo.component.close',
            _componentId: iComponentID,
            _controller: function() {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            _model: null,
            execute: function() {
              iController = this._controller();
              var tComponentView = iController.get('view'),
                  tContainerView = tComponentView.get('parentView');

              this.log = 'closeComponent: %@'.fmt(tComponentView.get('title'));
              this._model = iController.get('model');

              // Some components (the graph in particular), won't restore correctly without calling willSaveComponent(),
              // because sometimes not all of the info necessary to restore the view is actively held in the model.
              // (In the graph's case, there is 'model' which relates to the view, and 'graphModel' which holds all of the
              // configuration like axis ranges, legends, etc.)
              iController.willSaveComponent();

              if (iController.saveGameState) {
                // If we are a GameController, try to save state.
                // Since this is an asynchronous operation, we have to hold off closing the component
                // until it is complete (or it will fail).
                // Also, since closing the document will happen after this command executes, dirtying the
                // document will clear the undo history, so we must force it not to dirty.
                iController.saveGameState(function(result) {
                  if (result && result.success) {
                    tState = result.state;
                  }
                  SC.run(function () {
                    tContainerView.removeComponentView( tComponentView);
                  });
                });
              } else {
                tContainerView.removeComponentView( tComponentView);
              }
            },
            undo: function() {
              DG.currDocumentController().createComponentAndView(this._model);

              iController = this._controller();
              if (iController.restoreGameState && tState) {
                iController.restoreGameState({gameState: tState});
              }
            }
          }));
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
        classNames: 'min-icon'.w(),
        isVisible: false, // to start with
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
