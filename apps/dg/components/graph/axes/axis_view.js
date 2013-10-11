// ==========================================================================
//                              DG.AxisView
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

sc_require('components/graph/utilities/graph_drop_target');
sc_require('views/raphael_base');

/** @class  DG.AxisView - The base class view for a graph axis.
  
  On creation, pass in the orientation, as in
  DG.AxisView.create( { orientation: 'vertical' })

  @extends DG.RaphaelBaseView
*/
DG.AxisView = DG.RaphaelBaseView.extend( DG.GraphDropTarget,
/** @scope DG.AxisView.prototype */ 
{
  displayProperties: ['model.attributeDescription.attribute',
                      'model.attributeDescription.attributeStats.categoricalStats.numberOfCells'],

  /**
    The model on which this view is based.
    @property { DG.AxisModel }
  */
  model: null,
  
  /**
    Either 'vertical' or 'horizontal'
    @property { String }
  */
  orientation: null,

  /**
   * @property {DG.Attribute}
   */
  plottedAttribute: function() {
    return this.getPath('model.attributeDescription.attribute');
  }.property(),

  blankDropHint: 'DG.GraphView.addToEmptyPlace',

  /**
  For Raphael 1.5.2 we could always return the height, but this changed with Raphael 2.0 when
   the BBox started depending on rotation.
    @property { Number }
  */
  desiredExtent: function() {
    var tLabelExtent = this.get('labelExtent'),
        tDimension = (Raphael.version < "2.0") ?
                        'y' :
                        ((this.get('orientation') === 'horizontal') ? 'y' : 'x');
    return tLabelExtent[ tDimension];
  }.property('labelNode'),

  /**
    Coordinate of my minimum value (Y: bottom end, X: left end)
    @property { Number }
    Note trouble with cacheability
  */
  pixelMin: function() {
    return (this.get('orientation') === 'vertical') ?
          this.get('drawHeight') : 0;
  }.property('drawHeight')/*.cacheable()*/,

  /**
    Coordinate of my maximum value (Y: top end, X: right end)
    @property { Number }
    Note trouble with cacheability
  */
  pixelMax: function() {
    return (this.get('orientation') === 'vertical') ?
          0 : this.get('drawWidth');
  }.property('drawWidth')/*.cacheable()*/,

  /**
  Return the extent of the label
    @property {Point as in { x, y }}
  */
  labelExtent: function() {
    var	kMinHeight = DG.RenderingUtilities.kCaptionFontHeight,
        tLabelNode = this.get('labelNode' ),
        tExtent = { x: kMinHeight, y: kMinHeight};
    if( !SC.none( tLabelNode)) {
      var tBox = tLabelNode.getBBox();
      tExtent = { x: isNaN(tBox.width) ? kMinHeight : Math.max( kMinHeight, tBox.width),
                  y: isNaN(tBox.height) ? kMinHeight : Math.max( kMinHeight, Math.ceil( tBox.height / 2) * 2) };
    }
    return tExtent;
  }.property('labelNode').cacheable(),

  /**
  Subclasses must override
    @return { Boolean }
  */
  isNumeric: null,

  /**
  The Raphael element used to display the label.
    @property {Array of Raphael element}
  */
  labelNodes: function() {
    var this_ = this,
        tChangeHappened = false,
        tLabelCount = 0,
        tRotation = this.get('orientation') === 'vertical' ? -90 : 0,
        tLabels, tDescription, tNode;
    if( SC.none( this._paper))
      return [];

    tLabels = this.getPath('model.labels');
    tLabels.forEach( function( iLabel, iIndex) {
      var tColor = 'blue';
      if( iIndex > 0) {
        iLabel = ': ' + iLabel;
        tColor = DG.ColorUtilities.calcAttributeColorFromIndex( iIndex, tLabels.length ).colorString;
      }
      if( tLabelCount >= this_._labelNodes.length) {
        tNode = this_._paper.text( 0, 0, '')
                      .addClass( 'axis-label');
        DG.RenderingUtilities.rotateText( tNode, tRotation, 0, 0);
        this_._labelNodes.push( tNode);
        tChangeHappened = true;
      }
      else
        tNode = this_._labelNodes[ tLabelCount];

      tNode.attr('fill', tColor);
      // If the text has changed, we set it and notify
      if( iLabel !== tNode.attr( 'text')) {
        tDescription = this_.get('model' ).getLabelDescription( iIndex);
        // TODO: Move strings to strings.js
        tDescription += '—Click to change ' + this_.orientation + ' axis attribute';
        tNode.attr({ text: iLabel, title: tDescription });
        tChangeHappened = true;
      }
      tLabelCount++;
    });

    while( this_._labelNodes.length > tLabelCount) {
      this_._labelNodes.pop().remove();
      tChangeHappened = true;
    }

    if( tChangeHappened)
      this.notifyPropertyChange('labelNode', this._labelNodes);

    return this._labelNodes;
  }.property('model.labels'),

  /**
  The Raphael element used to display the label.
    @property {Raphael element}
  */
  labelNode: function() {
    var tNodes = this.get('labelNodes');
    return (tNodes.length > 0) ? tNodes[0] : null;
  }.property('labelNodes'),

  /**
   * @private
   * @property {Raphael element}
   */
  _labelNodes: null,

  init: function() {
    sc_super();
    this._labelNodes = [];
  },

  /**
   * The label consists of one clickable text node for each attribute assigned to the axis.
   * These are separated by colons.
   * Note that only y-axes of scatterplots are equipped to handle multiple attributes.
   */
  renderLabel: function() {
    var tNodes = this.get('labelNodes' ),
        tDrawWidth = this.get('drawWidth'),
        tDrawHeight = this.get('drawHeight'),
        tIsVertical = this.get('orientation') === 'vertical',
        tRotation = tIsVertical ? -90 : 0,
        tTotalLength = 0,
        tLayout = tNodes.map( function( iNode) {
            var tBox = iNode.getBBox();
            tTotalLength += tIsVertical ? tBox.height : tBox.width;
            return { node: iNode, box: tBox };
          } ),
        tPosition = tIsVertical ? ((tDrawHeight + tTotalLength) / 2) : ((tDrawWidth - tTotalLength) / 2);
    tLayout.forEach( function( iLayout) {
      var tNode = iLayout.node,
          tBox = iLayout.box,
          tLabelExtent = { x: tBox.width, y: tBox.height },
          tLoc = { };

      if( tIsVertical) {
        tLoc.x = tLabelExtent.x / 4 + 2;
        tLoc.y = tPosition - tLabelExtent.y / 2;
        tPosition -= tLabelExtent.y;
      }
      else {  // horizontal
        tLoc.x = tPosition + tLabelExtent.x / 2;
        tLoc.y = tDrawHeight - tLabelExtent.y / 2 - 2;
        tPosition += tLabelExtent.x;
      }
      tNode.attr( { x: tLoc.x, y: tLoc.y } );
      DG.RenderingUtilities.rotateText( tNode, tRotation, tLoc.x, tLoc.y);
    });
  },
  
  /**
    Graph controller observes this property to detect that a drag has taken place.
    @property{{collection:{DG.CollectionRecord}, attribute:{DG.Attribute}, text:{String},
                axisOrientation:{String} }}
  */
    dragData: null,

  /**
    Attempt to assign the given attribute to this axis.
    @param {SC.Drag} 'data' property contains 'collection', 'attribute', 'text' properties
    @param {SC.DRAG_LINK}
  */
  performDragOperation: function( iDragObject, iDragOp) {
    this.set('dragData', iDragObject.data);
    return SC.DRAG_LINK;
  },
  
  /**
    @property { Number }  Takes into account any borders the parent views may have
    [SCBUG]
  */
  drawWidth: function() {
    var tWidth = this.get('frame').width;
    if( this.get('orientation') === 'horizontal')
      tWidth -= 2 * DG.ViewUtilities.kBorderWidth;
    return tWidth;
  }.property('frame'),

  /**
    @property { Number }  Takes into account any borders the parent views may have
    [SCBUG]
  */
  drawHeight: function() {
    var tHeight = this.get('frame').height;
    if( this.get('orientation') === 'vertical')
      tHeight -= 2 * DG.ViewUtilities.kBorderWidth;
    return tHeight;
  }.property('frame'),

  numberOfCells: function() {
    return this.getPath('model.numberOfCells');
  }.property('model.numberOfCells'),
  
  /**
    The total distance in pixels between one cell and the next without any "slop" at the ends.
    @property {Number} in pixels
  */
  fullCellWidth: function() {
    var tNumCells = this.get('numberOfCells');
    
    return Math.abs( this.get('pixelMax') - this.get('pixelMin')) / tNumCells;
  }.property('numberOfCells', 'pixelMax', 'pixelMin'),

  /**
    The width to be used when actually drawing into a cell because it takes into account
      the need for space between cells and space on both ends.
    @property {Number} in pixels
  */
  cellWidth: function() {
    var tNumCells = this.get('numberOfCells'),
        tPixelMin = this.get('pixelMin'),
        tPixelMax = this.get('pixelMax'),
        kShrinkFactor = 0.9,
        // Here's where we make a bit of space at the ends of the axis.
        tUpperBounds = tNumCells + 0.5,
        tLowerBounds = 0,
        tAxisRange =  tUpperBounds - tLowerBounds,
        tHalfWidth = Math.abs((tPixelMax - tPixelMin) / tAxisRange);
    
    return tHalfWidth * kShrinkFactor;
  }.property('numberOfCells', 'pixelMax', 'pixelMin'),

  /**
      Note that for vertical axis, the zeroth cell is at the top.
    @return {Number} coordinate of the given cell.
  */
  cellToCoordinate: function( iCellNum) {
    var tNumCells = this.get('numberOfCells'),
        tCoordinate = Math.abs((iCellNum + 0.5) / tNumCells * (this.get('pixelMax') - 
                      this.get('pixelMin')));
    
    return tCoordinate;
  },

  /**
    @return {Number} coordinate of the cell with the given name.
  */
  cellNameToCoordinate: function( iCellName) {
    return this.cellToCoordinate( this.model.cellNameToCellNumber( iCellName));
  },

  /**
  Default implementation does nothing.
    @param {Function} to be called for each tick
  */
  forEachTickDo: function() {
  },

  /**
  Default implementation expects a number between 0 and 1 and returns a number between pixelMin and pixelMax.
  @param{Number} Expected to be between 0 and 1.
  @return {Number}
  */
  dataToCoordinate: function( iData) {
    var
      tPixelMin = this.get('pixelMin'),
      tPixelMax = this.get('pixelMax');
    return tPixelMin + iData * (tPixelMax - tPixelMin);
  },

  /**
  Default implementation expects a number between 0 and 1 and returns a number between pixelMin and pixelMax.
  @param{Number} Expected to be between pixelMin and pixelMax.
  @return {Number} Typically between 0 and 1.
  */
  coordinateToData: function( iCoord) {
    var
      tPixelMin = this.get('pixelMin'),
      tPixelMax = this.get('pixelMax');
    return (iCoord - tPixelMin) / (tPixelMax - tPixelMin);
  }

});

