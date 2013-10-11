// ==========================================================================
//                          DG.CellLinearAxisView
// 
//  A view of a linear axis possibly broken into cells.
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

sc_require('components/graph/axes/cell_axis_view');

/** @class

  An axis with a numeric scale, possible broken into cells.

  @extends DG.CellAxisView
*/
DG.CellLinearAxisView = DG.CellAxisView.extend(
/** @scope DG.CellLinearAxisView.prototype */ (function() {
  var kAxisGap = 1,
      kTickLength = 4;

  return {

    displayProperties: 'model.lowerBound model.upperBound model.tickGap'.w(),

    /**
    I work with numbers.
      @return { Boolean }
    */
    isNumeric: true,

    /**
      @property {Number} The coordinate at which the zero line should be drawn. Null if zero
        is not within axis bounds.
    */
    zeroPixel: function() {
      if( (0 >= this.getPath('model.lowerBound')) && (0 <= this.getPath('model.upperBound')))
        return this.dataToCoordinate( 0);
      else
        return null;
    }.property('model.lowerBound', 'model.upperBound', 'pixelMin', 'pixelMax').cacheable(),

    /**
      @property {Number} Each time we draw the axis, we set this property to the maximum width
        of the number label strings
    */
    maxNumberExtent: 0,

    /**
    coordToString
      @param {Number} location on axis
      @return {String}  Formatted version of world coordinate with decimals appropriate to axis
    */
    coordToString: function( iPixelValue) {
      var tData = this.coordinateToData( iPixelValue),
        tTickGap = this.getPath('model.tickGap'),
        tFracDigits = (tTickGap < 1) ? 1 + Math.ceil( Math.abs( Math.log( tTickGap) / Math.LN10)) : 0,
        tFormat;
      if( (tFracDigits === 0) && (tTickGap < 10))
        tFracDigits++;
      tFormat = pv.Format.number().group("").fractionDigits( 0, tFracDigits);
      return tFormat( tData);
    },

    /**
    We force display which will call createVisualization
    */
    prepareVisualization: function() {
      this.displayDidChange();
    },

    /**
    Called each time we have to regenerate or modify the visualization
    */
    doDraw: function doDraw() {
      var this_ = this,
          tModel = this.get('model'),
          tLower = tModel.get('lowerBound'),
          tUpper = tModel.get('upperBound'),
          tBaseline = this.get('axisLineCoordinate'),
          tOrientation = this.get('orientation'),
          tTickGap = this_.getPath( 'model.tickGap'),
          tStart = Math.ceil( tLower / tTickGap) * tTickGap,
          tTickCount = Math.floor( Math.abs(( tUpper - tStart) / tTickGap)),
          tLabelString,
          tMaxNumberExtent = DG.RenderingUtilities.kDefaultFontHeight,
          tFracDigits = (tTickGap < 1) ? Math.ceil( Math.abs( Math.log( tTickGap) / Math.LN10)) : 0,
          tFormat = pv.Format.number().group("").fractionDigits( 0, tFracDigits)
          ;

      function drawTicks()
      {
        /* Return the frequency of drawing value labels that will not cause collisions.
          A returned value of 1 means draw every value label, 2 means draw every other,
          etc. */
        function findWorkableGap( iStart, iOffset) {
          var mScaleIsReversed = false,
              tModulus = 1,
              tWorkableGapFound = false,  // guarantee first time through loop
              tHalfWidth, tHalfHeight
              ;

          while (!tWorkableGapFound) {
            var lastPixelUsed = 0,
                firstTime = true,
                tModifiedTickGap = tModulus * tTickGap,
                tTickIndex;

            tTickCount = Math.floor( Math.abs( (tUpper - iStart) / tModifiedTickGap));
            tWorkableGapFound = true; // assume success

            for( tTickIndex = 0;
                  (tTickIndex <= tTickCount) && tWorkableGapFound  ;
                  tTickIndex++) {
              var spot = iStart + tTickIndex * tModifiedTickGap,
                  tickPixel = this_.dataToCoordinate( spot + iOffset),
                  tTextExtent;

              tLabelString = tFormat( spot);

              tTextExtent = DG.RenderingUtilities.textExtentOnCanvas( this_._paper, tLabelString);

              switch( tOrientation) {
                case 'vertical':
                  tHalfHeight = tTextExtent.y / 2;

                  if (firstTime || (Math.abs( lastPixelUsed - tickPixel) > tHalfHeight)) {
                    firstTime = false;
                    lastPixelUsed = tickPixel + (mScaleIsReversed ?
                                    tHalfHeight : -tHalfHeight);
                  }
                  else {  // Nope, text is on top of itself
                    tWorkableGapFound = false;
                    tModulus++;
                  }
                  break;
                case 'horizontal':
                  // By pretending half the width is a bit greater than it is, we leave
                  // room between
                  tHalfWidth = 5 * tTextExtent.x / 8;

                  // Only draw label if we aren't going to collide with the previous number
                  if (firstTime || (Math.abs( tickPixel - lastPixelUsed)  > tHalfWidth)) {
                    firstTime = false;
                    lastPixelUsed = tickPixel + (mScaleIsReversed ?
                                    -tHalfWidth : tHalfWidth);
                  }
                  else {  // Nope, text is on top of itself
                    tWorkableGapFound = false;
                    tModulus++;
                  }
                  break;
              }
            }
          }
          return tModulus;
        }

        var //tOffset = mIntegerBinOffsetting ? 0.5 : 0.0;
            tOffset = 0,
            // Compute the frequency for drawing text so it doesn't bump itself
            tDrawValueModulus = findWorkableGap( tStart, tOffset),
            // If we're not drawing every label for lack of space, then compute a start
            // value for the draw value counter so that we choose to draw sensible labels;
            // e.g. include 0, include integers, ...
            //tInitialDrawValueCounter = FindInitialDrawValueCounter( tStart, tDrawValueModulus);
            tInitialDrawValueCounter = 0,
            // If there's enough screen space, we'll add some intermediate ticks.
            //tNumSubIntervals = FindNumSubIntervals( tStart, tOffset, iCellNumber, tDrawValueModulus * mTickGap);
            //tNumSubIntervals = 0,
            tCounter = tInitialDrawValueCounter,
//            tSubTickPixelGap = (this_.cellDataToCoordinate( tCellNumber, tStart + 2 * tTickGap + tOffset) -
//                      this_.cellDataToCoordinate( tCellNumber, tStart + tTickGap + tOffset)) /
//                          tNumSubIntervals,
            tPixelMax = this_.get('pixelMax'),
            tTickIndex = 0;

        this_.forEachTickDo( function( iSpot, iTickPixel) {
          var tNum, tLabelExtent, tWidth, tHeight;
              tLabelString = tFormat( iSpot);
              tNum = this_._paper.text( 0, 0, tLabelString);
              this_._elementsToClear.push( tNum);
              tLabelExtent = DG.RenderingUtilities.getExtentForTextElement(
                                tNum, DG.RenderingUtilities.kDefaultFontHeight);
              tWidth = tLabelExtent.width;
              tHeight = tLabelExtent.height;

          switch( tOrientation) {
            case 'vertical':
              iTickPixel += tPixelMax;  // offset by top of axis
              if( (iTickPixel < this_.get('pixelMin')) && (tTickIndex >= 0))
                this_._elementsToClear.push(
                  this_._paper.line( tBaseline, iTickPixel, tBaseline - kTickLength, iTickPixel)
                        .attr( { stroke: DG.PlotUtilities.kAxisColor }));
              //DrawSubTicks( iTickPixel, tSubTickPixelGap, tNumSubIntervals);

              if (tCounter === 0) {
                if( (iTickPixel < this_.get('pixelMin')) && (tTickIndex >= 0)) {
                  tNum.attr( { x: tBaseline - kTickLength - kAxisGap,
                               y: iTickPixel,
                              'text-anchor': 'end' });
//                  tNum.node.setAttribute( 'style', tNum.node.getAttribute('style') +
//                            'dominant-baseline:middle');
//                  tNum.node.setAttribute( 'dominant-baseline', 'middle');
                  tMaxNumberExtent = Math.max( tMaxNumberExtent, tWidth);
                }
              }
              else
                tNum.hide();
              break;

            case 'horizontal':
              iTickPixel += this_.get('pixelMin');  // offset by left start of axis
              if( (iTickPixel >= this_.get('pixelMin')) && (tTickIndex >= 0))
                this_._elementsToClear.push(
                  this_._paper.line( iTickPixel, tBaseline, iTickPixel, tBaseline + kTickLength)
                        .attr( { stroke: DG.PlotUtilities.kAxisColor }));
              //DrawSubTicks( iTickPixel, tSubTickPixelGap, tNumSubIntervals);
              if (tCounter === 0) {
                if ((iTickPixel >= this_.get('pixelMin')) && (tTickIndex >= 0)) {
                  tNum.attr({ x: iTickPixel + 1,
                              y: tBaseline + kTickLength + kAxisGap + tHeight / 3 });
                  tMaxNumberExtent = Math.max( tMaxNumberExtent, tHeight);
                }
              }
              else
                tNum.hide();
              break;
          }
          if( tTickIndex >= 0)
            tCounter = (tCounter + 1) % tDrawValueModulus;
          tTickIndex++;
        });
      } // drawTicks

      function setupEventHandling() {
        var tFrame = this_.get('frame'),
          tClickHandling = false;

        // Event handlers
        function beginDrag() {
          this_._dragPanel.show();
          this_._isDragging = true;
          DG.logUser("dragStart: { lower: %@, upper: %@ }",
            this_.getPath('model.lowerBound'), this_.getPath('model.upperBound'));
        }

        function endDrag() {
          this_._dragPanel.hide();
          this_._isDragging = false;
          DG.logUser("dragEnd: { lower: %@, upper: %@ }",
            this_.getPath('model.lowerBound'), this_.getPath('model.upperBound'));
        }

        function beginTranslate( iWindowX, iWindowY) {
          if( !tClickHandling) {
            beginDrag();
            this_._lowerBoundAtDragStart = this_.getPath('model.lowerBound');
            this_._upperBoundAtDragStart = this_.getPath('model.upperBound');
          }
        }

        function doTranslate( idX, idY) {
          if( !tClickHandling && this_._isDragging) {
            //DG.SoundUtilities.drag();
            var tDelta = (this_.get('orientation') === 'vertical') ? idY : idX,
                tLowerBound = this_.getPath('model.lowerBound'),
                tCurrentDelta = this_.coordinateToDataGivenCell( 0, 0) -
                        this_.coordinateToDataGivenCell( 0, tDelta),
                tIncDelta = tCurrentDelta - (tLowerBound - this_._lowerBoundAtDragStart);
            this_.get('model').translate( tIncDelta);
          }
        }

        // We are dragging in the lower portion of the axis. The upper bound will remain fixed
        function beginLowerDilate( iWindowX, iWindowY) {
          if( !tClickHandling) {
            var tPoint = DG.ViewUtilities.windowToViewCoordinates(
                          { x: iWindowX, y: iWindowY }, this_);
            this_._dilationAnchorCoord =
                    (this_.get( 'orientation') === 'vertical') ? tPoint.y : tPoint.x;
            this_._lowerBoundAtDragStart = this_.getPath('model.lowerBound');
            beginDrag();
          }
        }

        function doLowerDilate( idX, idY) {
          if( !tClickHandling && this_._isDragging) {
            //DG.SoundUtilities.drag();
            var tLowerAtStart = this_.get('_lowerBoundAtDragStart'),
                tUpper = this_.getPath('model.upperBound'),
                tCurrDelta = (this_.get( 'orientation') === 'vertical') ? idY : idX,
                tFixed = this_.get( 'pixelMax'),
                tDelta = tFixed - this_._dilationAnchorCoord,
                tFactor = tDelta / (tDelta - tCurrDelta);
            if( (tFactor > 0) && (tFactor < 10)) {
              this_.setPath('model._lowerBound', tLowerAtStart);
              this_.get('model').dilate( tUpper, tFactor);
            }
          }
        }

        // We are dragging in the lower portion of the axis. The upper bound will remain fixed
        function beginUpperDilate( iWindowX, iWindowY) {
          if( !tClickHandling) {
            var tPoint = DG.ViewUtilities.windowToViewCoordinates(
                          { x: iWindowX, y: iWindowY }, this_);
            this_._dilationAnchorCoord =
                    (this_.get( 'orientation') === 'vertical') ? tPoint.y : tPoint.x;
            this_._upperBoundAtDragStart = this_.getPath('model.upperBound');
            beginDrag();
          }
        }

        function doUpperDilate( idX, idY) {
          if( !tClickHandling && this_._isDragging) {
            //DG.SoundUtilities.drag();
            var tUpperAtStart = this_.get('_upperBoundAtDragStart'),
                tLower = this_.getPath('model.lowerBound'),
                tCurrDelta = (this_.get( 'orientation') === 'vertical') ? idY : idX,
                tFixed = this_.get( 'pixelMin'),
                tDelta = tFixed - this_._dilationAnchorCoord,
                tFactor = tDelta / (tDelta - tCurrDelta);
            if( (tFactor > 0) && (tFactor < 10)) {
              this_.setPath('model._upperBound', tUpperAtStart);
              this_.get('model').dilate( tLower, tFactor);
            }
          }
        }

        function setRect( iElement, iX, iY, iWidth, iHeight) {
          iElement.attr( { x: iX, y: iY, width: iWidth, height: iHeight });
        }

        function handleMouseDown( iEvent) {
          tClickHandling = iEvent.altKey;
        }

        function handleMouseMove( iEvent) {
          var tZoomDirection;
          if( iEvent.altKey) {
            var magnifyPlusCursorUrl = static_url('cursors/MagnifyPlus.cur'),
                magnifyMinusCursorUrl = static_url('cursors/MagnifyMinus.cur'),
                cursorUrl = iEvent.shiftKey ? magnifyMinusCursorUrl : magnifyPlusCursorUrl;
            tZoomDirection = iEvent.shiftKey ? "out" : "in";
            this.attr( { cursor:DG.Browser.customCursorStr( cursorUrl, 8, 8),
                  title: "Click to zoom " + tZoomDirection });
          }
          else
            this.attr( { cursor: this.defaultCursor, title: this.defaultTitle });
        }

        function handleMouseUp( iEvent) {
          var tFactor, tViewPoint, tFixedCoord;
          if( iEvent.altKey) {
            tFactor = iEvent.shiftKey ? 2 : 0.5;
            tViewPoint = DG.ViewUtilities.windowToViewCoordinates(
              { x: iEvent.clientX, y: iEvent.clientY }, this_);
            tFixedCoord =  (this_.get('orientation') === 'vertical') ?
              tViewPoint.y : tViewPoint.x;
            this_.get('model').dilate( this_.coordinateToData(tFixedCoord), tFactor,
                          true /* with animation */);
            tClickHandling = false;
          }
        }

        // ============body of setupEventHandling===========
        if( SC.none( this_._midPanel)) {
          this_._midPanel = this_._paper.rect(0, 0, 0, 0)
                    .attr({ stroke: DG.RenderingUtilities.kTransparent,
                            fill: DG.RenderingUtilities.kSeeThrough });
          this_._lowerPanel = this_._midPanel.clone();
          this_._upperPanel = this_._midPanel.clone();
          this_._dragPanel = this_._midPanel.clone();
          // It doesn't work to assign mousedown, mouseup, and mousemove to _midPanel
          // and then clone. The handlers don't get cloned. :-(

          this_._midPanel.defaultTitle = 'DG.CellLinearAxisView.midPanelTooltip'.loc(); // "Drag to translate axis scale"
          this_._midPanel.attr( { title: this_._midPanel.defaultTitle });
          this_._midPanel.mousedown( handleMouseDown);
          this_._midPanel.mouseup( handleMouseUp);
          this_._midPanel.drag( doTranslate, beginTranslate, endDrag);
          this_._midPanel.mousemove( handleMouseMove);

          this_._lowerPanel.defaultTitle = 'DG.CellLinearAxisView.lowerPanelTooltip'.loc(); // "Drag to change axis lower bound"
          this_._lowerPanel.attr( { title: this_._lowerPanel.defaultTitle });
          this_._lowerPanel.mousedown( handleMouseDown);
          this_._lowerPanel.mouseup( handleMouseUp);
          this_._lowerPanel.drag( doLowerDilate, beginLowerDilate, endDrag);
          this_._lowerPanel.mousemove( handleMouseMove);

          this_._upperPanel.defaultTitle = 'DG.CellLinearAxisView.upperPanelTooltip'.loc(); // "Drag to change axis upper bound";
          this_._upperPanel.attr( { title: this_._upperPanel.defaultTitle });
          this_._upperPanel.mousedown( handleMouseDown);
          this_._upperPanel.mouseup( handleMouseUp);
          this_._upperPanel.drag( doUpperDilate, beginUpperDilate, endDrag);
          this_._upperPanel.mousemove( handleMouseMove);

          // Note that the name of this cursor canNOT be "ClosedHand" or in Safari
          // you will get a black closed hand no matter what is in the file.
          this_._dragPanel.attr( { cursor: DG.Browser.customCursorStr(static_url('cursors/ClosedHandXY.cur'), 8, 8) });
        }
          if( this_.get('orientation') === 'vertical') {
            setRect( this_._lowerPanel, tFrame.x, (5/8) * tFrame.height,
                        tFrame.width, (3/8) * tFrame.height);
          this_._lowerPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/DownDilate.cur'), 8, 8);
          this_._lowerPanel.attr({ cursor: this_._lowerPanel.defaultCursor });
            setRect( this_._midPanel, tFrame.x, (3/8) * tFrame.height,
                        tFrame.width, (3/8) * tFrame.height);
          this_._midPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/TranslateY.cur'), 8, 8);
          this_._midPanel.attr({ cursor: this_._midPanel.defaultCursor });
            setRect( this_._upperPanel, tFrame.x, 0,
                        tFrame.width, (3/8) * tFrame.height);
          this_._upperPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/UpDilate.cur'), 8, 8);
          this_._upperPanel.attr({ cursor: this_._upperPanel.defaultCursor });
            setRect( this_._dragPanel, tFrame.x, 0,
                        tFrame.width, tFrame.height);
          } else {
            setRect( this_._lowerPanel, 0, 0, (3/8) * tFrame.width, tFrame.height);
          this_._lowerPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/LeftDilate.cur'), 8, 8);
          this_._lowerPanel.attr({ cursor: this_._lowerPanel.defaultCursor });
            setRect( this_._midPanel, (3/8) * tFrame.width, 0, (3/8) * tFrame.width, tFrame.height);
          this_._midPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/TranslateX.cur'), 8, 8);
          this_._midPanel.attr({ cursor: this_._midPanel.defaultCursor });
            setRect( this_._upperPanel, (5/8) * tFrame.width, 0, (3/8) * tFrame.width, tFrame.height);
          this_._upperPanel.defaultCursor = DG.Browser.customCursorStr(static_url('cursors/RightDilate.cur'), 8, 8);
          this_._upperPanel.attr({ cursor: this_._upperPanel.defaultCursor });
            setRect( this_._dragPanel, 0, 0,
                        tFrame.width, tFrame.height);
          }
        if( !this_._isDragging)
            this_._dragPanel.hide();
      }

      // ===============Main body of doDraw===============

      this._elementsToClear.push( this.renderAxisLine());
      drawTicks();
      setupEventHandling();
      this.renderLabel();
      this.setIfChanged('maxNumberExtent', tMaxNumberExtent);
    },

    /**
     * @property Cache of information about this axis
     */
    info: function() {
      var tInfo = {
              lowerBound: this.getPath('model.lowerBound'),
              upperBound: this.getPath('model.upperBound'),
              range: null,
              cellWidth: this.get('fullCellWidth'),
              pixelMax: this.get('pixelMax')
            };
      tInfo.range = tInfo.upperBound - tInfo.lowerBound;
      return tInfo;
    }.property('model.lowerBound', 'model.upperBound', 'fullCellWidth', 'pixelMax' ).cacheable(),

    /**
    Given the value to plot and its cell number, give the coordinate along this axis.
    @return {Number}
    */
    cellDataToCoordinateUsingCache: function( iCell, iData, iCache) {
      if (!isFinite( iData))
        return null;

      var tCoordinate = SC.none( iData) ? null : (iData - iCache.lowerBound) * iCache.cellWidth / iCache.range;
      if(!SC.none(tCoordinate))
        switch( this.get('orientation')) {
          case 'vertical':
            tCoordinate = iCache.pixelMax + (iCell + 1) * iCache.cellWidth - tCoordinate;
            break;

          case 'horizontal':
            tCoordinate = iCell * iCache.cellWidth + tCoordinate;
            break;
        }

      return tCoordinate;
    },

    /**
    Given the value to plot and its cell number, give the coordinate along this axis.
    @return {Number}
    */
    cellDataToCoordinate: function( iCell, iData) {
      return this.cellDataToCoordinateUsingCache( iCell, iData, this.get('info'));
    },

    /**
    Given the value to plot return the coordinate along this axis.
    @return {Number}
    */
    dataToCoordinate: function( iData) {
      return this.cellDataToCoordinate( 0, iData);
    },

    /**
    Given the value to plot return the coordinate along this axis.
    @return {Number}
    */
    dataToCoordinateUsingCache: function( iData, iCache) {
      return this.cellDataToCoordinateUsingCache( 0, iData, iCache);
    },

    /**
    Given a coordinate, return the result of the linear transformation
    to data value. The value will be relative to the given cell; i.e., if
    the user has dragged outside of that cell, the returned value is as though
    that cell continued on in both directions.
    @return {Number} in world coordinates
    */
    coordinateToDataGivenCell: function( iCell, iCoord) {
      var tData = 0,
        tCellWidth = this.get('fullCellWidth'),
        tLowerBound, tUpperBound, tPixelMin, tPixelMax, tPixelDistance;
      if (tCellWidth !== 0) {
        tLowerBound = this.getPath('model.lowerBound');
        tUpperBound = this.getPath('model.upperBound');
//        TBool tReverseScale = ((ds_CCellLinearAxis*) mAxisP)->IsScaleReversed();
//        TBool tLogScale = ((ds_CCellLinearAxis*) mAxisP)->IsScaleLogarithmic();

        if( this.get('orientation') === 'vertical') {
          tPixelMin = this.get('pixelMax') + tCellWidth * (iCell + 1);
          tPixelMax = tPixelMin - tCellWidth;
          iCoord += this.get('pixelMax'); // offset by the top of the axis
        } else {
          tPixelMin = this.get('pixelMin') + tCellWidth * iCell;
          tPixelMax = tPixelMin + tCellWidth;
          iCoord += this.get('pixelMin'); // offset by the left of the axis
        }
        tPixelDistance = iCoord - tPixelMin;
        tData = tLowerBound + tPixelDistance * (tUpperBound - tLowerBound) / ( tPixelMax - tPixelMin);
//        TDouble tLogLinearParam( ((ds_CCellLinearAxis*) mAxisP)->
//                        GetLogLinearTransitionParam()); // 0 => linear; 1 => log
        // tPixelDistance is the number of pixels from the relevant axis boundary to the given coordinate
//        TLength tPixelDistance( tReverseScale ? (pixelMax - iCoord) : (iCoord - pixelMin));
        // For a vertical scale, tPixelDistance is negative, but tCellWidth is positive. That won't work for a
        // log scale so we have to change the sign.
//        if( tLogScale && (mOrientation === ds_kVertical))
//          tPixelDistance *= -1;
//        tData = ((tLogLinearParam === 0) ? 0 :
//                tLogLinearParam * tLowerBounds * 
//                  pow( 10, log10( tUpperBounds / tLowerBounds) * tPixelDistance / tCellWidth))
//            +
//            ((tLogLinearParam === 1) ? 0 :
//                (1 - tLogLinearParam) * (tLowerBounds + tPixelDistance * (tUpperBound - tLowerBound)
//                              / ( tPixelMax - tPixelMin)));
      }

      return tData;
},

    /**
    Given a coordinate, return the result of the linear transformation
    to data value
    @return {Number} in world coordinates.
    */
    coordinateToData: function( iCoord) {
      return this.coordinateToDataGivenCell( this.whichCell( iCoord), iCoord);
    },

    /**
     * Called typically be a ValueAnimator to get the amount to increment a value displayed along the axis
     * @property {Number}
     */
    increment: function() {
      return this.coordinateToData( 1) - this.coordinateToData(0);
    }.property('model.lowerBound', 'model.upperBound', 'frame').cacheable(),

    /**
    Return the maximum length of the label strings plus a bit extra.
      @property {Number} of pixels
    */
    desiredExtent: function() {
      var tExtent = sc_super() + kAxisGap + kTickLength + this.get('maxNumberExtent');
      return tExtent;
    }.property('maxNumberExtent'),

    /**
    Call the given function once for each tick with arguments
        iWorldCoordinateOfTick, iScreenCoordinateOfTick
      @param {Function} to be called for each tick
    */
    forEachTickDo: function( iDoF) {
      var tTickIndex,
        tLower = this.getPath('model.lowerBound'),
        tUpper = this.getPath('model.upperBound'),
        tTickGap = this.getPath('model.tickGap'),
        tStart = Math.ceil( tLower / tTickGap) * tTickGap,
        tTickCount = Math.abs( (tUpper - tStart) / tTickGap),
        tSpot;
      for( tTickIndex = 0; tTickIndex <= tTickCount; tTickIndex++)  {
        tSpot = tStart + tTickIndex * tTickGap;
        iDoF( tSpot, this.dataToCoordinate( tSpot));
      }
    },

    _isDragging: false,
    _lowerBoundAtDragStart: null,
    _upperBoundAtDragStart: null,
    _dilationAnchorCoord: null,
    _dragPanel: null,
    _lowerPanel: null,
    _midPanel: null,
    _upperPanel: null
  };

}())
);

