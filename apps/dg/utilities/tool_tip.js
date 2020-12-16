// ==========================================================================
//                            DG.ToolTip
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

/** @class DG.ToolTip A simple adornment-like class that displays a string in a tooltip format.

  @extends SC.Object
*/
DG.ToolTip = SC.Object.extend(
/** @scope DG.ToolTip.prototype */
{
  /**
    Our gateway to attributes, values, and axes
    @property { DG.PlotView }
  */
  paperSource: null,

  destroy: function() {
    this.paperSource = null;
    sc_super();
  },

  /**
    What we draw on.
    @property { Raphael }
  */
  paper: function() {
    return this.getPath('paperSource.paper');
  }.property('paperSource' ).cacheable(),

  /**
   * The key into the layerManager to get the layer we use to display
   * @property { String }
   */
  layerName: null,

  /**
   * The elements that make up the data tip get placed in this layer.
   * @property { DG.RaphaelLayer }
   */
  layer: function() {
    var tLayerManager = this.getPath('paperSource.layerManager');
    return (tLayerManager && this.layerName) ? tLayerManager[ this.layerName] :null;
  }.property('paperSource', 'layerName' ),

  /**
   * The text to display.
   * @property {String}
  */
  text: null,

  /**
    The original screen coordinates of the element from which the tip derives.
    @property { {x, y} }
  */
  tipOrigin: null,

  /**
   * If the element from which this tip derives is a circle, this is its radius
   */
  tipSourceRadius: null,

  tipIsEmpty: function() {
    return SC.empty(this.get('text'));
  }.property('text'),

  /**
    This is the element used for the text in the data tip
    @private
    @property { Raphael Element }
  */
  _tipTextElement: null,

  /**
   This is the element used for the rectangle backing the data tip
    @private
    @property { Raphael Element }
  */
  _tipRectElement: null,

  /**
   This is the element used for the data tip shadow
    @private
    @property { Raphael Element }
  */
  _tipShadowElement: null,

  updateTip: function() {
    if( this.get('tipIsEmpty'))
      return;

    var tPaper = this.get('paper' ),
        kRectXOffset = 10,
        kRectYOffset = 5,
        kShadowWidth = 2,
        tShadowXOffset,
        tShadowYOffset,
        kTextXOffset = 15,
        tTextYOffset,
        tX, tY, tRadius,
        tExtent,
        tRectWidth,
        tRectHeight;

    tRadius = this.tipSourceRadius ? this.tipSourceRadius : 0;
    tX = this.tipOrigin.x + tRadius;
    tY = this.tipOrigin.y + tRadius;
    this._tipTextElement.attr( { text: this.get('text') });
    tExtent = DG.RenderingUtilities.getExtentForTextElement( this._tipTextElement, 12);
    tRectWidth = tExtent.width + 10;
    tRectHeight = tExtent.height + 10;
    tTextYOffset = tRectHeight / 2 + 5;
    tShadowXOffset = kRectXOffset + tRectWidth + kShadowWidth;
    tShadowYOffset = kRectYOffset + kShadowWidth;

    // Adjust tX and tY so that the tip will be within the plotview
    if( tX + tShadowXOffset > tPaper.width)
      tX = Math.max(-kRectXOffset, tX - (tX + tShadowXOffset - tPaper.width));
    if( tY + tShadowYOffset + tRectHeight > tPaper.height)
      tY = Math.max(-kRectYOffset, tY - (tY + tShadowYOffset + tRectHeight - tPaper.height));
    // If the tip rectangle encompasses tipOrigin, move the tip rectangle up and to the left
    if( DG.ViewUtilities.ptInRect( this.tipOrigin,
            { x: tX, y: tY, width: tRectWidth + kShadowWidth + 5, height: tRectHeight + kShadowWidth + 5})) {
      tX = Math.max( 0, this.tipOrigin.x - tRadius - tRectWidth - kShadowWidth - kRectXOffset);
      tY = Math.max( 0, this.tipOrigin.y - tRadius - tRectHeight - kShadowWidth - kRectYOffset);
    }
    this._tipTextElement.attr({ x: tX + kTextXOffset, y: tY + tTextYOffset });

    this._tipShadowElement.attr( { 'path': 'M'+ (tX + tShadowXOffset) + ' ' + (tY + tShadowYOffset) +
                                    ' v' + tRectHeight + ' h-' + tRectWidth });
    this._tipRectElement.attr( { x: tX + kRectXOffset, y: tY + kRectYOffset,
                                width: tRectWidth, height: tRectHeight });
  },

  show: function() {
    if( this.get('tipIsEmpty'))
      return;

    var tPaper = this.get('paper' ),
        tLayer = this.get('layer');

    // Make sure only one data tip can be displayed at a time.
    this.hide();

    this._tipTextElement = tPaper.text( 0, 0, '')
                .attr({ 'text-anchor': 'start', 'opacity': 0 })
                .addClass( DG.PlotUtilities.kToolTipTextClassName);
    this._tipShadowElement = tPaper.path('')
                .attr('stroke-opacity', 0 )
                .addClass( DG.PlotUtilities.kToolTipShadowClassName);
    this._tipRectElement = tPaper.rect( 0, 0, 0, 0)
                .attr('opacity', 0 )
                .addClass( DG.PlotUtilities.kToolTipClassName);

    this.updateTip();

    tLayer.push( this._tipShadowElement);
    tLayer.push( this._tipRectElement);
    tLayer.push( this._tipTextElement);
    // TODO: Move constants below to DG.RenderingUtilities
    this._tipRectElement.animate({ 'opacity': 0.7 }, DG.PlotUtilities.kToolTipShowTime, '<>');
    this._tipTextElement.animate({ 'opacity': 1 }, DG.PlotUtilities.kToolTipShowTime, '<>');
    this._tipShadowElement.animate({ 'stroke-opacity': 0.7 }, DG.PlotUtilities.kToolTipShowTime, '<>');
  },

  hide: function() {
    var tLayer = this.get('layer');
    [ this._tipShadowElement, this._tipRectElement, this._tipTextElement ].forEach( function( iElement) {
      if( iElement) {
        tLayer.prepareToMoveOrRemove( iElement);
        iElement.remove();
      }
    });
  }

});
