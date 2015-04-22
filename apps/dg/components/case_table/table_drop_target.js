// ==========================================================================
//                          DG.TableDropTarget
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

/** @class  Mixin to define behavior of table subviews on drag

*/
DG.TableDropTarget = 
{
  kDropFrameClass: 'table-drop-frame',
  kDropFrameFillClass: 'table-drop-frame-fill',
  kDropHintClass: 'table-drop-hint',
  kDropBoxClass: 'table-drop-box',

  /**
   * Return the key to a localizable string to be displayed when the target has no current attribute
   */
  blankDropHint: '',

  // SC.DropTarget protocol
  isDropTarget: true,

  /**
   Table controller observes this property to detect that a drag has taken place.
   @property{{collection:{DG.CollectionRecord}, attribute:{DG.Attribute}, text:{String},
   axisOrientation:{String} }}
   */
  dragData:null,

  computeDragOperations: function( iDrag) {
    if( this.isValidAttribute( iDrag))
      return SC.DRAG_LINK;
    else
      return SC.DRAG_NONE;
  },

  dragEntered: function( iDragObject, iEvent) {
    this.get('classNames').push(this.kDropFrameFillClass);
    //this.showDropHint();
    var tCompView = DG.ViewUtilities.componentViewForView( this);
    if( tCompView)
      tCompView.bringToFront();
  },

  dragExited: function( iDragObject, iEvent) {
    this.get('classNames').pop();
  },
  
  acceptDragOperation: function() {
    return YES;
  },

  isValidAttribute: function( iDrag) {
    return true;
  },
  
  // Draw an orange frame to show we're a drop target.
  dragStarted: function( iDrag) {
      this.get('classNames').push( this.kDropFrameClass);
  },

  dragEnded: function() {
    this.get('classNames').pop();
  },
  
  /**
  @property{Raphael element}
  */
  borderFrame: null,

  /**
   * @property {String} - Display when dragged attribute is over this target
   */
  dropHintString: null,

  /**
   * @property {Raphael element}
   */
  dropHintElement: null,
  dropHintBox: null,

  /**
   Attempt to assign the given attribute to this axis.
   @param {SC.Drag} 'data' property contains 'collection', 'attribute', 'text' properties
   @param {SC.DRAG_LINK}
     */
  performDragOperation:function ( iDragObject, iDragOp ) {
    this.setPath( 'parentView.dragData', iDragObject.data );
    return SC.DRAG_LINK;
  }

};

