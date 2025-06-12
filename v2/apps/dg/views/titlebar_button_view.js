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
sc_require('views/tooltip_enabler');

/** @class

    DG.TitleBarCloseButton handles the close button in a component view's title bar.

 @extends SC.View
 */
DG.TitleBarCloseButton = SC.View.extend(DG.MouseAndTouchView, DG.TooltipEnabler,
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
      return {
        classNames: 'dg-close-icon'.w(),
        toolTip: 'DG.Component.closeComponent.toolTip',
        isSelected: false,
        classNameBindings: ['isSelected:dg-close-icon-selected'],
        allowParent: NO,
        init: function () {
          sc_super();
          if (!SC.platform.touch) {
            // The following two lines are a workaround to make sure that in SageModeler the button shows
            // itself on the initial hover over the titlebar. (Strange, I know.)
            this.set('isVisible', true);
            this.invokeLater(function () {
              this.set('isVisible', false);
            }.bind(this), 1);
          }
        },
        doIt: function () {
          var tComponentId = this.parentView.viewToDrag().getPath(
              'controller.model.id'),
              tController = DG.currDocumentController().componentControllersMap[tComponentId],
              tShouldConfirmClose = tController.get('shouldConfirmClose'),
              tConfirmCloseMessage = tController.get('confirmCloseMessage')
                  || 'DG.Component.closeComponent.confirmCloseMessage',
              tConfirmCloseDescription = tController.get('confirmCloseDescription')
                  || 'DG.Component.closeComponent.confirmCloseDescription';

          // Some components are not closed, but are hidden. These are
          // distinguished by presence of toggleViewVisiblity method.
          if (tController.toggleViewVisibility) {
            tController.toggleViewVisibility();
          } else {

            var closeComponentAfterConfirm = function () {
              DG.closeComponent(tComponentId);
            }.bind(this);

            if (tShouldConfirmClose) {
              DG.AlertPane.warn({
                message: tConfirmCloseMessage,
                description: tConfirmCloseDescription,
                buttons: [
                  {
                    title: 'DG.Component.closeComponent.okButtonTitle',
                    action: closeComponentAfterConfirm,
                    localize: YES
                  },
                  {
                    title: 'DG.Component.closeComponent.cancelButtonTitle',
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
        },
        closeComponent: function (iComponentID, iController) {
          if (iController.toggleViewVisibility) {
            iController.toggleViewVisibility();
          } else {
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
              _controller: function () {
                return DG.currDocumentController().componentControllersMap[this._componentId];
              },
              _model: null,
              execute: function () {
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
                  iController.saveGameState(function (result) {
                    if (result && result.success) {
                      tState = result.state;
                    }
                    SC.run(function () {
                      if (tContainerView.removeComponentView)
                        tContainerView.removeComponentView(tComponentView);
                    });
                  });
                } else {
                  if (tContainerView.removeComponentView)
                    tContainerView.removeComponentView(tComponentView);
                }
              },
              undo: function () {
                DG.currDocumentController().createComponentAndView(this._model);

                iController = this._controller();
                if (iController.restoreGameState && tState) {
                  iController.restoreGameState({gameState: tState});
                }
              }
            }));
          }
        }
      };
    }()) // function closure
);

/** @class

    DG.TitleBarMinimizeButton handles the minimize button in a component view's title bar.

 @extends SC.View
 */
DG.TitleBarMinimizeButton = SC.View.extend(DG.MouseAndTouchView, DG.TooltipEnabler,
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
      return {
        classNames: 'dg-min-icon'.w(),
        allowParent: NO,
        init: function () {
          sc_super();
          if (!SC.platform.touch) {
            // The following two lines are a workaround to make sure that in SageModeler the button shows
            // itself on the initial hover over the titlebar. (Strange, I know.)
            this.set('isVisible', true);
            this.invokeLater(function () {
              this.set('isVisible', false);
            }.bind(this), 1);
          }
        },
        isSelected: false,
        classNameBindings: ['isSelected:dg-min-icon-selected'],
        toolTip: 'DG.Component.minimizeComponent.toolTip',
        doIt: function () {
          var tComponentView = this.parentView.viewToDrag();
          DG.UndoHistory.execute(DG.Command.create({
            name: 'component.minimize',
            undoString: 'DG.Undo.component.minimize',
            redoString: 'DG.Redo.component.minimize',
            log: (tComponentView.get('isMinimized') ? "Expanded component" : "Minimized component"),
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'toggle minimize component',
                type: tComponentView.getPath('model.type')
              }
            },
            execute: function () {
              tComponentView.toggleMinimization();
            },
            undo: function () {
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
DG.TitleBarUndoRedoButton = SC.View.extend(DG.MouseAndTouchView, DG.TooltipEnabler,
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
      return {
        localize: true,
        isVisibleBinding: SC.Binding.oneWay('DG.UndoHistory.enabled'),
        isVisible: true
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
        toolTip: function () {
          var cmd = this.get('nextUndoCommand');
          return (cmd ? cmd.get('undoString') : 'DG.mainPage.mainPane.undoButton.toolTip');  // "Undo the last action"
        }.property('nextUndoCommand'),
        nextUndoCommandBinding: SC.Binding.oneWay('DG.UndoHistory.nextUndoCommand'),
        isEnabledBinding: SC.Binding.oneWay('DG.UndoHistory.canUndo'),
        classNames: 'dg-undo-icon'.w(),
        doIt: function () {
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
        toolTip: function () {
          var cmd = this.get('nextRedoCommand');
          return (cmd ? cmd.get('redoString') : 'DG.mainPage.mainPane.redoButton.toolTip');  // "Redo the last undone action"
        }.property('nextRedoCommand'),
        nextRedoCommandBinding: SC.Binding.oneWay('DG.UndoHistory.nextRedoCommand'),
        isEnabledBinding: SC.Binding.oneWay('DG.UndoHistory.canRedo'),
        classNames: 'dg-redo-icon'.w(),
        doIt: function () {
          DG.UndoHistory.redo();
        }
      };
    }()) // function closure
);

/** @class

    DG.CaseCardToggleButton, when clicked, switches the case table to a case card

 @extends SC.View
 */
DG.CaseCardToggleButton = SC.View.extend(DG.MouseAndTouchView, DG.TooltipEnabler,
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
      return {
        classNames: 'dg-card-icon'.w(),
        toolTip: 'DG.DocumentController.toggleToCaseCard',
        isVisible: true, // to start with
        doIt: function () {
          var tComponentView = this.parentView.viewToDrag(),
              tItems = [
                {
                  title: 'DG.DocumentController.toggleToCaseCard'.loc(),
                }
              ];

          DG.MenuPane.create({
            classNames: 'dg-attributes-popup'.w(),
            layout: {width: 200, height: 150},
            items: tItems,
            selectedItemDidChange: function () {
              DG.UndoHistory.execute(DG.Command.create({
                name: 'toggle.toCaseCard',
                undoString: 'DG.Undo.component.toggleTableToCard',
                redoString: 'DG.Redo.component.toggleTableToCard',
                log: 'Toggle case table to case card',
                execute: function () {
                  DG.currDocumentController().toggleTableToCard(tComponentView);
                },
                undo: function () {
                  var tDocController = DG.currDocumentController(),
                      tContext = tComponentView.getPath('controller.dataContext'),
                      tCardComponentView = tDocController.tableCardRegistry.getCardView(tContext);
                  tDocController.toggleCardToTable(tCardComponentView);
                }
              }));
            }.observes('selectedItem')
          }).popup(this, [0, -20, SC.POSITION_BOTTOM]);

        }
      };
    }()) // function closure
);

/** @class

    DG.CaseTableToggleButton, when clicked, switches the case table to a case card

 @extends SC.View
 */
DG.CaseTableToggleButton = SC.View.extend(DG.MouseAndTouchView, DG.TooltipEnabler,
    /** @scope DG.MouseAndTouchView.prototype */
    (function () {
      return {
        classNames: 'dg-table-icon'.w(),
        toolTip: 'DG.DocumentController.toggleToCaseTable',
        isVisible: true, // to start with
        doIt: function () {
          var tComponentView = this.parentView.viewToDrag(),
              tItems = [
                {
                  title: 'DG.DocumentController.toggleToCaseTable'.loc(),
                }
              ];

          DG.MenuPane.create({
            classNames: 'dg-attributes-popup'.w(),
            layout: {width: 200, height: 150},
            items: tItems,
            selectedItemDidChange: function () {
              DG.UndoHistory.execute(DG.Command.create({
                name: 'toggle.toCaseTable',
                undoString: 'DG.Undo.component.toggleCardToTable',
                redoString: 'DG.Redo.component.toggleCardToTable',
                log: 'Toggle case card to case table',
                executeNotification: {
                  action: 'notify',
                  resource: 'component',
                  values: {
                    operation: 'toggle card to table',
                    type: 'DG.CaseCard'
                  }
                },
                execute: function () {
                  DG.currDocumentController().toggleCardToTable(tComponentView);
                },
                undo: function () {
                  var tDocController = DG.currDocumentController(),
                      tContext = tComponentView.getPath('controller.dataContext'),
                      tTableComponentView = tDocController.tableCardRegistry.getTableView(tContext);
                  tDocController.toggleTableToCard(tTableComponentView);
                }
              }));
            }.observes('selectedItem')
          }).popup(this, [0, -20, SC.POSITION_BOTTOM]);

        }
      };
    }()) // function closure
);

