// ==========================================================================
//                            DG.DragLabelHandler
//
//  Author:   William Finzer
//
//  Copyright ©2016 Concord Consortium
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

/** @class  DG.DragLabelHandler - A small object that can hold onto information needed to drag an axis or legend
 * label and initiate the drag that SproutCore expects.

 @extends SC.Object
 */
DG.DragLabelHandler = SC.Object.extend(
  /** @scope DG.DragLabelHandler.prototype */
  {
    /**
     * @property{LabelNode}
     */
    labelNode: null,

    /**
     * @property{SC.View}
     */
    labelView: null,

    /**
     * @property{SC.View}
     */
    viewToAddTo: null,

    /**
     * @property{DG.AttributePlacementDescription
     */
    attributeDescription: null,

    /**
     * @property{DG.DataContext}
     */
    dataContext: null,

    receivedStartDrag: false,
    receivedDoDrag: false,

    /**
     *
     * @param iEvent
     */
    handleStartDrag: function( iX, iY, iEvent) {
      var tDragView = this.labelView,
          tAttributeName = this.labelNode.get('text');
      SC.run(function () {
        // Make sure dragView is in front. Won't actually happen without this runloop.
        tDragView.set('value', tAttributeName);
        this.viewToAddTo.removeChild(tDragView);
        this.viewToAddTo.appendChild(tDragView);
      }.bind( this));

      this.receivedStartDrag = true;
      this.receivedDoDrag = false;
    },

    handleDoDrag: function( idX, idY, iX, iY, iEvent) {
      if( this.receivedStartDrag && !this.receivedDoDrag) {
        this.receivedDoDrag = true;
        var tDragView = this.labelView,
            tAttributeName = this.labelNode.get('text'),
            tAttrDesc = this.attributeDescription,
            tAttribute = tAttrDesc.attributeNamed( tAttributeName),
            tCollectionClient = tAttrDesc.get('collectionClient'),
            tContext = this.dataContext;
        if( !tAttribute)
            return;
        this.labelNode.ignoreTouchEnd();
        // Initiate a drag
        SC.run( function() {
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
              collection: tCollectionClient.get('collection'),
              attribute: tAttribute,
              text: tAttributeName
            }  // For use by clients like the text box
          });
        }.bind(this));
      }
    },

    handleEndDrag: function() {
      this.receivedStartDrag = false;
      this.receivedDoDrag = false;
      this.labelNode.reinstateTouchEnd();
    }
  } );

