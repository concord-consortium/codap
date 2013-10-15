// ==========================================================================
//                            DG.ToolTip
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

  /**
    What we draw on.
    @property { Raphael }
  */
  paper: function() {
    return this.getPath('paperSource.paper');
  }.property(),

  /**
   * The text to display.
   * @property {String}
   */
  text: null,

  /**
    These are the Raphael objects I draw, kept together for ease of showing and hiding.
    @private
    @property { SC.Array }
  */
  _myElements: null,

  /**
    The original screen coordinates of the element from which the tip derives.
    @private
    @property { {x, y} }
  */
  _tipOrigin: null,

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
    var tPaper = this.get('paper' ),
        kRectXOffset = 10,
        kRectYOffset = 5,
        kShadowWidth = 2,
        tShadowXOffset,
        tShadowYOffset,
        kTextXOffset = 15,
        tTextYOffset,
        tX, tY,
        tExtent,
        tRectWidth,
        tRectHeight;

    tX = this._tipOrigin.x;
    tY = this._tipOrigin.y;
    this._tipTextElement.attr( { text: this.get('text') });
    tExtent = DG.RenderingUtilities.getExtentForTextElement( this._tipTextElement, 12);
    tRectWidth = tExtent.width + 10;
    tRectHeight = tExtent.height + 10;
    tTextYOffset = tRectHeight / 2 + 5;
    tShadowXOffset = kRectXOffset + tRectWidth + kShadowWidth;
    tShadowYOffset = kRectYOffset + kShadowWidth;

    // Adjust tX and tY so that the tip will be within the plotview
    if( tX + tShadowXOffset > tPaper.width)
      tX -= (tX + tShadowXOffset) - tPaper.width;
    if( tY + tShadowYOffset + tRectHeight > tPaper.height)
      tY -= tShadowYOffset + tRectHeight;
    this._tipTextElement.attr({ x: tX + kTextXOffset, y: tY + tTextYOffset });

    this._tipShadowElement.attr( { 'path': 'M'+ (tX + tShadowXOffset) + ' ' + (tY + tShadowYOffset) +
                                    ' v' + tRectHeight + ' h-' + tRectWidth });
    this._tipRectElement.attr( { x: tX + kRectXOffset, y: tY + kRectYOffset,
                                width: tRectWidth, height: tRectHeight });
  },

  show: function( iX, iY) {
    var tPaper = this.get('paper' ),
        tSet = tPaper.set();

    // Make sure only one data tip can be displayed at a time.
    this.hide();

    this._tipOrigin = { x: iX, y: iY};

    this._tipTextElement = tPaper.text( 0, 0, '')
                .attr({ 'text-anchor': 'start', 'opacity': 0 })
                .addClass( DG.PlotUtilities.kToolTipTextClassName);
    this._tipShadowElement = tPaper.path('')
                .addClass( DG.PlotUtilities.kToolTipShadowClassName)
                .attr('stroke-opacity', 0 );
    this._tipRectElement = tPaper.rect( 0, 0, 0, 0)
                .addClass( DG.PlotUtilities.kToolTipClassName)
                .attr('opacity', 0 );

    this.updateTip();

    tSet.push( this._tipShadowElement);
    tSet.push( this._tipRectElement);
    tSet.push( this._tipTextElement);
    this._tipTextElement.toFront();
    this._myElements = tSet;
    // TODO: Move constants below to DG.RenderingUtilities
    this._tipRectElement.animate({ 'opacity': 0.7 }, DG.PlotUtilities.kToolTipShowTime, '<>');
    this._tipTextElement.animate({ 'opacity': 1 }, DG.PlotUtilities.kToolTipShowTime, '<>');
    this._tipShadowElement.animate({ 'stroke-opacity': 0.7 }, DG.PlotUtilities.kToolTipShowTime, '<>');
  },

  hide: function() {
    if( this._myElements) {
      this._myElements.remove();
      this._myElements = null;
    }
  },

  toFront: function() {
    if( this._myElements)
      this._myElements.toFront();
  }

});

