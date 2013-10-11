// ==========================================================================
//                        DG.LineLabelMixin
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

/** @class  Mixin class for line labels
*/
DG.LineLabelMixin = 
{
  /**
    @property { Raphael text element }
  */
  textElement: null,

  /**
    Make the movable line. This only needs to be done once.
    Caller can optionally add the line element to this.myElements array.
    @return {Rafael element} the text element
  */
  createTextElement: function() {
    // Put the text below the hit segments in z-order so user can still hit the line
    this.textElement = this.get('paper').text( 0, 0, '')
      .attr({ font: 'caption', 'text-anchor': 'start', opacity: 0 });
    return this.textElement;
  },

  /**
    Compute the position of the text element
  */
  updateTextToModel: function( iFractionFromTop) {
    if( this.myElements === null)
      this.createElements();

    var kPadding = 5, // pixels
        tAxisView = this.get( 'valueAxisView'),
        tValue = this.get('value'),
        tValueCoord = tAxisView.dataToCoordinate( tValue),
        tPaper = this.get('paper'),
        tValueString = this.get('valueString'),
        tTextElement = this.get('textElement'),
        tTextBox, tAlign,
        tTextAnchor = {} ;
    
    tTextElement.attr( { text: tValueString } );
    tTextBox = tTextElement.getBBox();
    
    if( tAxisView.get('orientation') === 'horizontal') {
      tAlign = tTextElement.attr('text-anchor');
      tTextAnchor.y = iFractionFromTop * tPaper.height;
      
      // Don't change the alignment unless the current alignment no longer works
      switch( tAlign) {
        case 'start':
          if( tTextBox.width + kPadding < tPaper.width - tValueCoord) {
            tTextAnchor.x = tValueCoord + kPadding;
          }
          else if( tTextBox.width + kPadding < tValueCoord) {
            tTextAnchor.x = tValueCoord - kPadding;
            tAlign = 'end';
          }
          else
            tTextAnchor.x = kPadding;
          break;
        case 'end':
          if( tTextBox.width + kPadding < tValueCoord) {
            tTextAnchor.x = tValueCoord - kPadding;
          }
          else if ( tTextBox.width + kPadding < tPaper.width - tValueCoord) {
            tTextAnchor.x = tValueCoord + kPadding;
            tAlign = 'start';
          }
          else
            tTextAnchor.x = tPaper.width - kPadding;
          break;
        }
    }
    else {
      tTextAnchor.y = tValueCoord;
      tTextAnchor.x = tPaper.width / 2;
      tAlign = 'middle';
      if( tTextBox.height > tValueCoord) {
        tTextAnchor.y += tTextBox.height / 2;
      }
      else {
        tTextAnchor.y -= tTextBox.height / 2;
      }
    }
    
    tTextElement.attr( { x: tTextAnchor.x, y: tTextAnchor.y, 'text-anchor': tAlign });
  }

};

