// ==========================================================================
//                            DG.DataTip
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

/** @class DG.DataTip A simple adornment-like class that displays and updates a data tip that shows when the
 *    user hovers over a point.

  @extends SC.Object
*/
DG.DataTip = SC.Object.extend(
/** @scope DG.DataTip.prototype */ 
{
  /**
    Our gateway to attributes, values, and axes
    @property { DG.PlotView }
  */
  plotView: null,

  /**
    What we draw on.
    @property { Raphael }
  */
  paperBinding: '.plotView.paper',

  plotBinding: '.plotView.model',

  /**
   * The index of the case whose values are being displayed
   * @property { Integer }
   */
  caseIndex: null,

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

  getDataTipText: function() {

    var this_ = this,
        tCase = this.getPath('plot.cases')[ this.get('caseIndex' )];

    function getNameValuePair( iKey) {
      var tAttrDesc = this_.get('plot' ).getPath('dataConfiguration.' + iKey + 'AttributeDescription'),
          tAttributes = tAttrDesc.get('attributes' ),
          tPlotIndex = this_.getPath('plotView.plotIndex' );
      // If there are more than 1 attribute, we'll end up using the plot index to pull out the right one
      // This only works because we only allow multiple attributes on the y-place.
      tPlotIndex = (tPlotIndex < tAttributes.length) ? tPlotIndex : 0;
      var tAttr = tAttributes[ tPlotIndex],
          tAttrID = (typeof(tAttr) === 'object') ? tAttr.get('id') : null,
          tName, tValue, tDigits, tNumFormat;
      if( !SC.none( tAttrID)) {
        tName = tAttr.get('name');
        tValue  = tCase && tCase.getValue( tAttrID);
        if( SC.none( tValue)) return null;

        if( tAttrDesc.get('isNumeric')) {
          tDigits = (iKey === 'legend') ?
                    DG.PlotUtilities.findFractionDigitsForRange( tAttrDesc.getPath('attributeStats.minMax')) :
                    DG.PlotUtilities.findFractionDigitsForAxis( this_.getPath('plotView.' + iKey + 'AxisView'));
          tNumFormat = pv.Format.number().fractionDigits( 0, tDigits);
          tValue = tNumFormat( tCase.getNumValue( tAttrID));
        }
        else {
          tValue = tCase.getStrValue( tAttrID);
        }
        return tName + ': ' + tValue;
      }
      return null;
    }

    if( SC.none( tCase))
      return '';

    var tXPair = getNameValuePair('x'),
        tYPair = getNameValuePair('y'),
        tLegendPair = getNameValuePair('legend'),
        tCoords;
    tCoords = SC.none(tXPair) ? '' : tXPair;
    if( !SC.none(tYPair)) {
      if( tCoords.length > 0)
        tCoords += '\n';
      tCoords += tYPair;
    }
    if( !SC.none(tLegendPair)) {
      if( tCoords.length > 0)
        tCoords += '\n';
      tCoords += tLegendPair;
    }
    return tCoords;
  },

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
    this._tipTextElement.attr( { text: this.getDataTipText() });
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

    this._tipShadowElement.stop()
                          .animate( { 'path': 'M'+ (tX + tShadowXOffset) + ' ' + (tY + tShadowYOffset) +
                                    ' v' + tRectHeight + ' h-' + tRectWidth }, 100, '<>');
    this._tipRectElement.stop()
                        .animate( { x: tX + kRectXOffset, y: tY + kRectYOffset,
                                width: tRectWidth, height: tRectHeight }, 100, '<>');
  },

  show: function( iElement, iIndex) {
    var tPaper = this.get('paper' ),
        tSet = tPaper.set();

    // Make sure only one data tip can be displayed at a time.
    this.hide();

    this._tipOrigin = { x: iElement.attr('cx'), y: iElement.attr('cy')};

    this.set('caseIndex', iIndex);

    this._tipTextElement = tPaper.text( 0, 0, '')
                .attr({ 'text-anchor': 'start', 'opacity': 0 })
                .addClass( DG.PlotUtilities.kDataTipTextClassName);
    this._tipShadowElement = tPaper.path('')
                .addClass( DG.PlotUtilities.kDataTipShadowClassName)
                .attr('stroke-opacity', 0 );
    this._tipRectElement = tPaper.rect( 0, 0, 0, 0)
                .addClass( DG.PlotUtilities.kDataTipClassName)
                .attr('opacity', 0 );

    this.updateTip();

    tSet.push( this._tipShadowElement);
    tSet.push( this._tipRectElement);
    tSet.push( this._tipTextElement);
    this._tipTextElement.toFront();
    this._myElements = tSet;
    this._tipRectElement.animate({ 'opacity': 0.7 }, DG.PlotUtilities.kDataTipShowTime, '<>');
    this._tipTextElement.animate({ 'opacity': 1 }, DG.PlotUtilities.kDataTipShowTime, '<>');
    this._tipShadowElement.animate({ 'stroke-opacity': 0.7 }, DG.PlotUtilities.kDataTipShowTime, '<>');
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
  },

  handleChanges: function( iChanges) {
    // iChanges can be a single index or an array of indices
    var tChanges = (SC.typeOf( iChanges) === SC.T_NUMBER ? SC.IndexSet.create( iChanges) : iChanges);
    if( SC.none( this._myElements) || (this._myElements.length === 0) || !(tChanges.contains( this.get('caseIndex'))))
      return;

    this.updateTip();
  }

});

