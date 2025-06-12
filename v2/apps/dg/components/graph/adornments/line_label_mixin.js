// ==========================================================================
//                        DG.LineLabelMixin
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

/** @class  Mixin class for line labels
 */
DG.LineLabelMixin =
    {
      /**
       @property { Raphael text element }
       */
      backgrndRect:null,
      textElement: null,

      /**
       Make the movable line. This only needs to be done once.
       Caller can optionally add the line element to this.myElements array.
       @return {Raphael element} the text element
       */
      createBackgroundRect: function() {
        this.backgrndRect = this.get('paper').rect(0, 0, 0, 0)
            .attr({ fill: 'white', 'stroke-width': 0, 'fill-opacity': 0.6 });
        return this.backgrndRect;
      },

      /**
       Make the text element that appears on hover
       Caller can optionally add the line element to this.myElements array.
       @return {Raphael element} the text element
       */
      createTextElement: function() {
        this.textElement = this.get('paper').text( 0, 0, '')
            .attr({ 'text-anchor': 'start', opacity: 1 });
        this.textElement.addClass('dg-graph-adornment');
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
            tValueCoord = (!SC.none( tValue) && isFinite(tValue)) ? tAxisView.dataToCoordinate( tValue) : -1000,
            tPaper = this.get('paper'),
            tValueString = this.get('valueString'),
            tTextElement = this.get('textElement'),
            tBackgrnd = this.get('backgrndRect'),
            tTextBox, tAlign,
            tTextAnchor = {},
            tBackgrndAnchor = {} ;

        tTextElement.attr( { text: tValueString } );
        tTextBox = tTextElement.getBBox();

        if( tAxisView.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal) {
          tAlign = tTextElement.attr('text-anchor');
          tTextAnchor.y = iFractionFromTop * tPaper.height;
          tBackgrndAnchor.y = tTextAnchor.y - tTextBox.height / 2;

          // Don't change the alignment unless the current alignment no longer works
          switch( tAlign) {
            case 'start':
              tBackgrndAnchor.x = tValueCoord + 2;
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
              tBackgrndAnchor.x = tValueCoord - tTextBox.width - 2;
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
          tBackgrndAnchor.x = tTextAnchor.x - tTextBox.width / 2;
          tAlign = 'middle';
          if( tTextBox.height > tValueCoord) {
            tTextAnchor.y += tTextBox.height / 2 + 2;
            tBackgrndAnchor.y = tValueCoord + 2;
          }
          else {
            tTextAnchor.y -= tTextBox.height / 2 + 2;
            tBackgrndAnchor.y = tValueCoord - tTextBox.height - 2;
          }
        }

        tTextElement.attr( { x: tTextAnchor.x, y: tTextAnchor.y, 'text-anchor': tAlign });
        tBackgrnd.attr( { x: tBackgrndAnchor.x, y: tBackgrndAnchor.y, width: tTextBox.width, height: tTextBox.height });
      }

    };

