// ==========================================================================
//                          DG.GraphDropTarget
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

/** @class  Mixin to define behavior of graph subviews on drag

*/
DG.GraphDropTarget = 
{
  kDropFrameClass: 'graph-drop-frame',
  kDropHintClass: 'graph-drop-hint',
  kDropBoxClass: 'graph-drop-box',

  /**
   * Return the key to a localizable string to be displayed when the target has no current attribute
   */
  blankDropHint: '',

  // SC.DropTarget protocol
  isDropTarget: true,
  
  /**
   Graph controller observes this property to detect that a drag has taken place.
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
    this.borderFrame.addClass('graph-drop-frame-fill');
    this.showDropHint();
  },
  
  dragExited: function( iDragObject, iEvent) {
    this.borderFrame.removeClass('graph-drop-frame-fill');
    this.hideDropHint();
  },
  
  acceptDragOperation: function() {
    return YES;
  },

  isValidAttribute: function( iDrag) {
    var tDragAttr = iDrag.data.attribute,
        tCurrAttr = this.get('plottedAttribute');
    return SC.none( tCurrAttr) || (tCurrAttr !== tDragAttr);
  },
  
  // Draw an orange frame to show we're a drop target.
  dragStarted: function( iDrag) {
    var kWidth = 3,
        tPaper = this.get('paper' ),
        tFrame;

    function isEmpty( iString) {
      return SC.empty( iString) || iString === 'undefined';
    }

    if( this.isValidAttribute( iDrag)) {
      tFrame = { x: kWidth, y: kWidth,
                    width: tPaper.width - 2 * kWidth,
                    height: tPaper.height - 2 * kWidth };

      if( this.get('isVertical')) {
        tFrame.y += 18 + 2 * kWidth;
        tFrame.height -= 18 + 2 * kWidth;
      }

      if( SC.none( this.borderFrame)) {
        this.borderFrame = tPaper.path('')
          .addClass( this.kDropFrameClass);
      }
      this.borderFrame.attr( { path:  DG.RenderingUtilities.pathForFrame( tFrame) } )
                      .show();

      var tDraggedName = iDrag.data.attribute.get('name' ),
          tAttrName = this.getPath('plottedAttribute.name' ),
          tString = isEmpty( tAttrName) ? this.get('blankDropHint' ).loc(tDraggedName) :
                                          'DG.GraphView.replaceAttribute'.loc( tAttrName, tDraggedName );
      this.set('dropHintString', tString);
    }
  },

  dragEnded: function() {
    if( this.borderFrame)
      this.borderFrame.hide();
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

  isVertical: function() {
    return this.get('orientation') === 'vertical';
  }.property(),

  showDropHint: function() {
    if( SC.empty( this.dropHintString))
      return;
    var tPaper = this.get('paper' ),
        kPadding = 3,
        tX = tPaper.width / 2,
        tY = tPaper.height / 2;
    if( !this.dropHintElement) {
      this.dropHintBox = tPaper.rect( 0, 0, 0, 0, 3)
        .addClass( this.kDropBoxClass)
        .attr('stroke-width', 0);
      this.dropHintElement = tPaper.text( tX, tY, this.dropHintString )
        .addClass( this.kDropHintClass);
    }
    this.dropHintBox.transform('');
    this.dropHintElement.transform('');
    this.dropHintElement.attr({ text: this.dropHintString, x: tX, y: tY });
    var tBBox = this.dropHintElement.getBBox();
    this.dropHintBox.attr({ x: tBBox.x - kPadding, y: tBBox.y - kPadding,
                          width: tBBox.width + 2 * kPadding, height: tBBox.height + 2 * kPadding });
    if( this.isVertical()) {
      this.dropHintBox.transform('R-90');
      this.dropHintElement.transform('R-90');
    }
    this.dropHintBox.toFront()
       .show();
    this.dropHintElement.toFront()
      .show();
  },

  hideDropHint: function() {
    if( this.dropHintElement) {
      this.dropHintElement.hide();
      this.dropHintBox.hide();
    }
  },

  /**
   Attempt to assign the given attribute to this axis.
   @param {SC.Drag} 'data' property contains 'collection', 'attribute', 'text' properties
   @param {SC.DRAG_LINK}
     */
  performDragOperation:function ( iDragObject, iDragOp ) {
    this.set( 'dragData', iDragObject.data );
    return SC.DRAG_LINK;
  }

};

