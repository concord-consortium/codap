// ==========================================================================
//                            DG.CaseCardView
//
//  Author:   William Finzer
//
//  Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.
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

/* global ReactDOM */
/** @class  DG.CaseCardView - The top level view for a case card

 @extends DG.View
 */
DG.CaseCardView = SC.View.extend(
    /** @scope DG.CaseCardView.prototype */
    (function () {

      return {

        isDropTarget: true, // So we'll participate in SC drag-drop

        /**
         The model on which this view is based.
         @property { DG.CaseCardModel }
         */
        model: null,

        /**
         * @property { DG.DataContext }
         */
        context: function() {
          return this.getPath('model.context');
        }.property('model'),

        contextDidChange: function() {
          this.renderCard();
        }.observes('model.context'),
        /**
         * @property {function}
         */
        isSelectedCallback: null,

        /**
         * @property {Element}
         */
        reactDiv: null,

        dragInProgress: false,

        classNames: 'react-data-card-view'.w(),

        classNameBindings: ['dragInProgress'],

        _mouseYInDrag: 0,

        _mouseHandlersInstalled: false,

        /*
        @property {SC.Timer}
         */
        _scrollTimer: null,

        didAppendToDocument: function () {
          this.reactDiv = document.createElement('div');
          this.get('layer').appendChild(this.reactDiv);
          this.renderCard();
        },

        destroy: function () {
          DG.React.toggleRender(this.reactDiv);

          sc_super();
        },

        viewDidResize: function () {
          // failing to call sc_super() here breaks attr drop-target highlighting
          sc_super();
          // update layout, e.g. column resize handle
          this.reactDiv && this.renderCard();
        },

        columnWidthDidChange: function() {
          this.renderCard();
        }.observes('*model.columnWidthMap'),

        resizeColumn: function (iCollectionName, iColumnWidthPct) {
          var columnWidthMap = this.getPath('model.columnWidthMap') || {},
              orgColumnWidthPct = columnWidthMap[iCollectionName];

          if (iColumnWidthPct === columnWidthMap[iCollectionName]) return;

          var setColumnWidth = function(name, width) {
            var columnWidthMap = SC.clone(this.getPath('model.columnWidthMap') || {});
            if (width) {
              columnWidthMap[name] = width;
            }
            else {
              delete columnWidthMap[name];
            }
            this.setPath('model.columnWidthMap', columnWidthMap);
          }.bind(this);

          DG.UndoHistory.execute(DG.Command.create({
            name: 'caseCard.columnWidthChange',
            undoString: 'DG.Undo.caseCard.columnWidthChange',
            redoString: 'DG.Redo.caseCard.columnWidthChange',
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'change column width',
                type: 'DG.CaseCard'
              }
            },
            execute: function () {
              setColumnWidth(iCollectionName, iColumnWidthPct);
              this.log = "Change case card column width for collection '%@' to '%@'%"
                  .fmt(iCollectionName, DG.MathUtilities.roundToDecimalPlaces(100 * iColumnWidthPct, 2));
            },
            undo: function () {
              setColumnWidth(iCollectionName, orgColumnWidthPct);
            },
            redo: function() {
              setColumnWidth(iCollectionName, iColumnWidthPct);
            }
          }));
        },

        renderCard: function (iExtraProps) {
          var this_ = this;

          function installMouseHandlers() {
            if( this_._mouseHandlersInstalled)
              return;
            var tLayer = this_.get('layer'),
                tOKToDeselectOnClick = false;
            tLayer.addEventListener('mousedown', function(e) {
                tOKToDeselectOnClick = this_.isSelectedCallback();
            });
            tLayer.addEventListener('click', function(e) {
              if(tOKToDeselectOnClick && !DG.Core.gClickWillBeHandledInReactComponent) {
                SC.run(function() {
                  this_.get('context').applyChange({operation: 'selectCases', select: false});
                });
              }
              tOKToDeselectOnClick = false;
            });
            this_._mouseHandlersInstalled = true;
          }

          function isChangedWidth(oldWidth, newWidth) {
            var oldWidthRounded = oldWidth && DG.MathUtilities.roundToDecimalPlaces(oldWidth, 4),
                newWidthRounded = newWidth && DG.MathUtilities.roundToDecimalPlaces(newWidth, 4);
            return oldWidthRounded !== newWidthRounded;
          }
          var props = Object.assign({
                        context: this.get('context'),
                        columnWidthMap: this.getPath('model.columnWidthMap') || {},
                        isSelectedCallback: this.isSelectedCallback,
                        onResizeColumn: function(collection, widthPct, isComplete) {
                          SC.run(function() {
                            var columnWidthMap = this.getPath('model.columnWidthMap') || {},
                                columnWidth = columnWidthMap[collection];
                            if (this.get('isVisible') && !this.get('isAnimating') &&
                                (widthPct > 0) && (isComplete || isChangedWidth(columnWidth, widthPct))) {
                              this.resizeColumn(collection, widthPct, isComplete);
                            }
                          }.bind(this));
                        }.bind(this)
                      }, iExtraProps || {});
          ReactDOM.render( DG.React.CaseCard(props), this.reactDiv);

          installMouseHandlers();
        },

        touchStart: function (evt) {
          evt.allowDefault();
          return YES;
        },

        touchEnd: function (evt) {
          evt.allowDefault();
          return YES;
        },

        /**
         * Commit current edit
         * @param evt
         */
        mouseDown: function (evt) {
          DG.globalEditorLock.commitCurrentEdit();
        },

        mouseWheel: function (evt) {
          // don't propagate to document
          return YES;
        },

        /**
         *
         * @param iDrag
         * @return {string | false}
         */
        isValidAttribute: function (iDrag) {
          var tResult = false,
              tDragAttr = iDrag.data.attribute,
              tDragContext = iDrag.data.context;
          if( tDragAttr && tDragContext && tDragContext === this.get('context'))
            tResult = 'ownContext';
          else if( tDragContext && tDragAttr)
            tResult = 'foreignContext';
          return tResult;
        },

        canAcceptDrop: function (iDrag) {
          var canAcceptDrop = false,
              tContext = this.get('context'),
              ownedByGame = tContext.get('hasGameInteractive'),
              preventReorgFlag = tContext.get('preventReorg');
          if (!preventReorgFlag && !ownedByGame) {
            canAcceptDrop = true;
          }
          return canAcceptDrop;
        },

        computeDragOperations: function (iDrag) {
          var tResult;
          if (this.isValidAttribute(iDrag) && this.canAcceptDrop(iDrag))
            tResult = SC.DRAG_LINK;
          else
            tResult = SC.DRAG_NONE;
          return tResult;
        },

        dragEntered: function (iDragObject, iEvent) {
          this.renderCard({ dragStatus: { dragObject: iDragObject, event: iEvent,
              dragType: this.get('dragType')}});
        },

        dragUpdated: function (iDragObject, iEvent) {

          function scrollUp() {
            if( this_._mouseYInDrag < 5 && tLayer.scrollTop > 0) {
              tLayer.scrollTop -= 10;
            }
            else if(this_._scrollTimer && this_._scrollTimer.isValid){
              this_._scrollTimer.invalidate();
            }
          }

          function scrollDown() {
            if( this_._mouseYInDrag > tFrameHeight - 10) {
              tLayer.scrollTop += 10;
            }
            else if(this_._scrollTimer && this_._scrollTimer.isValid){
              this_._scrollTimer.invalidate();
            }
          }

          function setupScrollTimer( iAction) {
            if( !this_._scrollTimer || !this_._scrollTimer.isValid) {
              this_._scrollTimer = SC.Timer.schedule({
                target: this_,
                action: iAction,
                interval: 100,
                repeats: YES
              });
            }
          }

          var this_ = this,
              tViewPoint = DG.ViewUtilities.windowToViewCoordinates({x: iEvent.clientX, y: iEvent.clientY}, this),
              tLayer = this.get('layer'),
              tScrollTop = tLayer.scrollTop,
              tFrameHeight = this.get('frame').height;
          this._mouseYInDrag = tViewPoint.y;
          if( tViewPoint.y < 5 && tScrollTop > 0) {
            setupScrollTimer( scrollUp);
          }
          else if( tViewPoint.y > tFrameHeight - 10) {
            setupScrollTimer( scrollDown);
          }

          this.renderCard({ dragStatus: { dragObject: iDragObject, event: iEvent,
              dragType: this.get('dragType')}});
        },

        dragExited: function (iDragObject, iEvent) {
          this.renderCard({ dragStatus: null});
        },

        acceptDragOperation: function () {
          return YES;
        },

        dragStarted: function (iDrag) {
          var tValidityCheck = this.isValidAttribute(iDrag);
          if (tValidityCheck &&  this.canAcceptDrop(iDrag)) {
            this.set('dragInProgress', true);
            this.set('dragType', tValidityCheck);
          }
        },

        dragEnded: function () {
          if( this._scrollTimer && this._scrollTimer.isValid)
            this._scrollTimer.invalidate();
          this.set('dragInProgress', false);
          this.dragExited();
        },

        performDragOperation: function( iDragObject, iOp) {
          this.renderCard({ dragStatus: { dragObject: iDragObject, op: iOp,
              dragType: this.get('dragType') } });
        }

        // todo: handle data drags

      };
    }()));

