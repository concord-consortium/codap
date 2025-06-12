// ==========================================================================
//                          DG.RenderingUtilities
//
//  A collection of utilities for working with svg
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

sc_require('libraries/raphael');

DG.RenderingUtilities = {

  /* jshint -W064 */  // Missing 'new' prefix when invoking a constructor. (W064)
  _blankCanvas: Raphael(-500, 0, 500, 500),
  /* jshint +W064 */
  
  kTransparent: "rgba(255, 255, 255, 0)",
  kSeeThrough: "rgba(255, 255, 255, 0.001)",  // Still receives mouse events
  kCaptionFontHeight: 20,
  kDefaultFontHeight: 12,

  /**
  Use getBBox unless this fails, in which case use an estimate based on the given default height.
    @param {Raphael element} must be text
    @return {Point as in {width, height} } in pixels
  */
  getExtentForTextElement: function( iTextElement, iDefaultHeight, iWithoutTransform) {
    var tTextBox = iTextElement.getBBox( iWithoutTransform),
    // Browsers can fill with zeroes or NaNs if they can't do measurement. Because NaN is "falsy" the following works
    tTextHeight = (tTextBox && tTextBox.height) || iDefaultHeight,
    tTextWidth = tTextBox ?tTextBox.width : 0;
    // Sometimes tTextHeight and tTextWidth come out 0. Draw offscreen.
    if( !tTextWidth) {
      var tExtent = this.textExtent(iTextElement.attr('text'), iTextElement.attr('font-family'),
                                    iTextElement.attr('font-size'));
      tTextWidth = tExtent.x;
      tTextHeight = tExtent.y;
    }
    return { width: tTextWidth, height: tTextHeight };
  },

  /**
  How many pixels long will the text be when rendered on the given canvas?
   Note: The result is an estimate based on the assumption that the average character width
          is 6 pixels and height is 9 pixels. Attempts to actually get a computation of extent that
          makes use of the canvas have failed.
        We ignore the canvas for now because we haven't been able to figure out how to get a reliable
        text extent using it.
    @param {R} a Raphael canvas
    @param {String} the string to be rendered
    @return {Point as in {x, y} } length of the string in pixels
  */
  textExtentOnCanvas: function( iCanvas, iText, iFontFamily, iFontSize) {
    var tText = iCanvas.text( -500, -5000, iText)
            .attr({'font-family': iFontFamily, 'font-size': iFontSize}),
      tBox = tText.getBBox(),
      tExtent = { x: tBox.width, y: tBox.height };
    tText.remove();
    return tExtent;
  },

  /**
  How many pixels long will the text be when rendered on the _blankCanvas?
   @param {String} the string to be rendered
    @return {Point as in {x, y} } length of the string in pixels
  */
  textExtent: function( iText, iFontFamily, iFontSize) {
    return this.textExtentOnCanvas( this._blankCanvas, iText, iFontFamily, iFontSize);
  },

  /**
   * Fit the given text element within the given space and, if the whole string does not fit, append ellipsis
   * @param iTextElement {Raphael Element}
   * @param iDesiredExtent {Number} space in pixels
   */
  elideToFit: function( iTextElement, iDesiredExtent) {
    var tStringToFit = iTextElement.attr('text'),
        tNumChars = tStringToFit.length,
        tExtra = 0,
        tCounter = 0,
        tWidth;
    do {
      tWidth = this.getExtentForTextElement(iTextElement, DG.RenderingUtilities.kDefaultFontHeight, true).width;
      if (tWidth > iDesiredExtent) {
        var tNewNumChars = Math.floor((iDesiredExtent / tWidth) * tNumChars) - tExtra;
        tStringToFit = iTextElement.attr('text').substring(0, tNewNumChars) + '…';
        tNumChars = tStringToFit.length;
        tExtra++;
      }
      iTextElement.attr('text', tStringToFit);
      tCounter++; // Prevent unexpected failure to exit
    }
    while ( tWidth > iDesiredExtent && tCounter < 10);
  },

  /**
    @param {element} a Raphael line
    @param {Point} start
    @param {Point} stop
  */
  updateLine: function( iLine, iStart, iStop) {
//    iLine.attr( { x1: iStart.x, y1: iStart.y, x2: iStop.x, y2: iStop.y });
    iLine.attr( { path: "M" + iStart.x + " " + iStart.y + " L" +
                  iStop.x + " " + iStop.y });
  },

  /**
    // Return a string that defines a path for the given rectangle.
    @param {{ x:{Number}, y:{Number}, width:{Number}, height:{Number}}}
    @return {String} SVG path string
  */
  pathForFrame: function( iFrame) {
    return 'M' + iFrame.x + ' ' + iFrame.y + 
        ' L' + (iFrame.x + iFrame.width) + ' ' + iFrame.y + 
        ' L' + (iFrame.x + iFrame.width) + ' ' + (iFrame.y + iFrame.height) +
        ' L' + iFrame.x + ' ' + (iFrame.y + iFrame.height) + 
        ' L' + iFrame.x + ' ' + iFrame.y;
  },

  /**
   *
   * @param iElement {Element}
   * @param iRotation {Number}
   * @param iCenterX {Number}
   * @param iCenterY {Number}
   */
  rotateText: function( iElement, iRotation, iCenterX, iCenterY) {
    // 'rotate' is deprecated in Raphael 2.0 and is additive rather than specifying
    if( Raphael.version < "2.0")
      iElement.rotate( iRotation, iCenterX, iCenterY);
    else  { // transform is new to Raphael 2.0
      var tTransform = 'r%@,%@,%@'.fmt( iRotation, iCenterX, iCenterY);
      iElement.attr( {transform: tTransform });
    }
  },

  testPaperValidity: function( iPaper) {
    this.printPaper( iPaper);
    var map = {},
        bot = iPaper.bottom;
    while (bot) {
      if( map[bot.id]) {
        console.log('Paper is not valid. Element %@ appears twice'.fmt( bot.id));
        return false;
      }
      if( bot.prev && bot.prev.next !== bot) {
        console.log('Paper is not valid. Prev of %@ not pointing to %@'.fmt( bot.id, bot.id));
        return false;
      }
      if( bot.next && bot.next.prev !== bot) {
        console.log('Paper is not valid. Next of %@ not pointing to %@'.fmt( bot.id, bot.id));
        return false;
      }
      map[bot.id] = true;
      bot = bot.next;
    }
    return true;
  },

  svgElementClass: function( iElement) {
    var tClass;
    if( iElement[0]) {
      switch (iElement[0].constructor) {
        case SVGImageElement:
          tClass = 'I';
          break;
        case SVGRectElement:
          tClass = 'R';
          break;
        case SVGPathElement:
          tClass = 'P';
          break;
        case SVGCircleElement:
          tClass = 'C';
          break;
        default:
          tClass = '?';
      }
    }
    return tClass;
  },

  printPaper: function( iPaper) {
    var tPrintout = 'Paper-> ',
        tElement = iPaper.bottom,
        tMap = {},
        tEnd = false;
    while( tElement && !tEnd) {
      tEnd = tMap[tElement.id];
      if( !tEnd) {
        tMap[ tElement.id] = true;
        tPrintout += tElement.id + ': ' + this.svgElementClass( tElement) + ', ';
        tElement = tElement.next;
      }
      else {
        tPrintout += 'FAILED - repetition of ' + tElement.id;
      }
    }
    console.log( tPrintout);
  }

};
