// ==========================================================================
//                            DG.DragCaseCardItemHandler
//
//  Author:   William Finzer
//
//  Copyright ©2017 Concord Consortium
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

/** @class  DG.DragCaseCardItemHandler - Similar to DG.DragLabelHandler but made to work with the React-based
 * CaseCard.

 @extends SC.Object
 */
DG.DragCaseCardItemHandler = SC.Object.extend(
    (function () {

          /** @scope DG.DragCaseCardItemHandler.prototype */
          return {
            /**
             * @property{SC.View}
             */
            viewToAddTo: null,

            /**
             * @property{SC.View}
             */
            dragView: null,

            /**
             * @property{DG.Attribute}
             */
            attribute: null,

            /**
             * @property {String}
             */
            attributeName: function () {
              return this.getPath('attribute.name');
            }.property(),

            /**
             * @property{DG.DataContext}
             */
            dataContext: null,

            receivedStartDrag: false,
            receivedDoDrag: false,

            /**
             * @param iX {number} x coordinate of pointer
             * @param iY {number} y coordinate of pointer
             * @param iEvent
             */
            handleStartDrag: function (iEvent) {
              var tDragView = SC.LabelView.create({
                classNames: 'dg-drag-label'.w(),
                layout: {width: 100, height: 20, top: -100, left: 0},
                value: this.get('attributeName')
              });
              this.set('dragView', tDragView);
              SC.run(function () {
                // Make sure dragView is in front. Won't actually happen without this runloop.
                if (tDragView.isDescendantOf(this.viewToAddTo))
                  this.viewToAddTo.removeChild(tDragView);
                this.viewToAddTo.appendChild(tDragView);
              }.bind(this));

              this.receivedStartDrag = true;
              this.receivedDoDrag = false;
            },

            /**
             * Handles a drag movement.
             * @param idX {number} delta x from initial position
             * @param idY delta y from initial position
             * @param iX {number}
             * @param iY {number}
             * @param iEvent {Event}
             */
            handleDoDrag: function (idX, idY, iX, iY, iEvent) {
              if (this.receivedStartDrag && !this.receivedDoDrag) {
                this.receivedDoDrag = true;
                var tDragView = this.get('dragView'),
                    tAttributeName = this.get('attributeName'),
                    tAttribute = this.get('attribute'),
                    tCollection = this.getPath('attribute.collection'),
                    tContext = this.get('dataContext');
                if (!tAttribute)
                  return;
                // Initiate a drag
                SC.run(function () {
                  DG.Drag.start({
                    event: iEvent,
                    source: this.viewToAddTo,
                    dragView: tDragView,
                    ghost: YES,
                    ghostActsLikeCursor: YES,
                    slideBack: YES,
                    origin: {x: iEvent.clientX, y: iEvent.clientY},
                    data: {
                      context: tContext,
                      collection: tCollection,
                      attribute: tAttribute,
                      text: tAttributeName
                    }  // For use by clients like the text box
                  });
                }.bind(this));
              }
            }
          };
        }
        ()
    ));

