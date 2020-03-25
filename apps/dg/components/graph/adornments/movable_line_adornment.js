// ==========================================================================
//                      DG.MovableLineAdornment
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

sc_require('components/graph/adornments/twoD_line_adornment');
sc_require('components/graph/utilities/plot_utilities');

/** @class  Draws a movable line.

  @extends DG.TwoDLineAdornment
*/
DG.MovableLineAdornment = DG.TwoDLineAdornment.extend(
/** @scope DG.MovableLineAdornment.prototype */ 
{
  defaultColor: DG.PlotUtilities.kDefaultMovableLineColor,

  kLineSlideCur: DG.Browser.customCursorStr(static_url('cursors/LineSlide.cur'), 8, 8),
  kLineBotLeft: DG.Browser.customCursorStr(static_url('cursors/LinePivotBotLeft.cur'), 5, 12),
  kLineBotRight: DG.Browser.customCursorStr(static_url('cursors/LinePivotBotRight.cur'), 12, 12),
  kLineTopLeft: DG.Browser.customCursorStr(static_url('cursors/LinePivotTopLeft.cur'), 5, 5),
  kLineTopRight: DG.Browser.customCursorStr(static_url('cursors/LinePivotTopRight.cur'), 12, 5),

  kHandleSize: 12,

  /**
    We add three rectangular "handles" to indicate draggability
    @property { array of Raphael rectangle element }
  */
  hitHandles: null,

  /**
    The line is covered by three nearly transparent wider segments for hitting and hilighting
    @property { array of Raphael line element }
  */
  hitSegments: null,

  equationString: function() {
    var tResult = sc_super();
    return tResult + this.get('sumResidSquaredString');
  }.property(),

  /**
    The line is defined by two pivot points
    @property { Point as in { x: <>, y: <> } } in world coordinates
  */
  pivot1: null,
  pivot2: null,

  /**
    Make the pieces of the movable line. This only needs to be done once.
  */
  createElements: function() {
    var this_ = this,
      tXAxisView = this.get('xAxisView'),
      tYAxisView = this.get('yAxisView'),
      tDragPoint, tLocked, tDragging = false;

    //=============Event handling functions===============
    function logDragResult() {
      var equation = this_.get('equationString');
      // Replace Unicode minus signs (used for display) with ASCII hyphens
      equation = equation.replace(/\u2212/g, "-");
      DG.logUser("dragMovableLine: '%@'", equation);
    }

    function overScope() {
      var tAttributes = { stroke: DG.PlotUtilities.kLineHighlightColor };
      this_.hitSegments.forEach(function(segment) {
        segment.stop();
        segment.animate(tAttributes, DG.PlotUtilities.kHighlightShowTime);
      });
    }

    function outScope() {
      var tAttributes = { stroke: DG.RenderingUtilities.kSeeThrough };
      if( !tDragging) {
        this_.hitSegments.forEach(function(segment) {
          segment.stop();
          segment.animate(tAttributes, DG.PlotUtilities.kHighlightHideTime);
        });
      }
    }

    function beginDrag( iWindowX, iWindowY) {
      var tLine = { slope: this_.getPath('model.slope'),
                    intercept: this_.getPath('model.intercept') };
      tDragPoint = DG.ViewUtilities.windowToViewCoordinates(
                    { x: iWindowX, y: iWindowY }, this_.parentView);
      if( this_.getPath('model.isVertical'))
        tDragPoint.x = tXAxisView.dataToCoordinate( this_.getPath('model.xIntercept'));
      else
        tDragPoint = DG.PlotUtilities.closestScreenPtGivenScreenPtAndWorldLine(
                              tDragPoint, tLine, tXAxisView, tYAxisView);
      tLocked = this_.getPath('model.isInterceptLocked');
      overScope();
      tDragging = true;
    }

    function continueTranslate( idX, idY) {
      this_.get('model').forceThroughPoint( {  x: tXAxisView.coordinateToData( tDragPoint.x + idX),
                          y: tYAxisView.coordinateToData( tDragPoint.y + idY) });
    }

    function endTranslate( idX, idY) {
      this_.pivot1 = this_.pivot2 = null;
      this_.updateToModel();  // needed to force re-computation of pivot points
      logDragResult();
      tDragging = false;
      outScope();
    }

    function beginRotation( iWindowX, iWindowY) {
      beginDrag( iWindowX, iWindowY);
    }

    function forceLineThroughPivots( iWorldDraggedPivot, iWorldStaticPivot, iScreenDraggedPivot, iScreenStaticPivot) {
      var kTolerance = 2;
      if( Math.abs(iScreenDraggedPivot.x - iScreenStaticPivot.x) < kTolerance) {
        // Snap to vertical
        iWorldDraggedPivot.x = iWorldStaticPivot.x;
      }
      else if( Math.abs(iScreenDraggedPivot.y - iScreenStaticPivot.y) < kTolerance) {
        // Snap to horizontal
        iWorldDraggedPivot.y = iWorldStaticPivot.y;
      }

      this_.get('model').forceThroughPoints( this_.pivot1, this_.pivot2);
    }

    function continueRotation1( idX, idY) {
      var tNewDragPt = { x: tDragPoint.x + idX, y: tDragPoint.y + idY },
          tStaticPivotPt = { x: tXAxisView.dataToCoordinate( this_.pivot2.x),
                            y: tYAxisView.dataToCoordinate( this_.pivot2.y) };
      this_.pivot1.x = tXAxisView.coordinateToData( tNewDragPt.x);
      this_.pivot1.y = tYAxisView.coordinateToData( tNewDragPt.y);
      if( tLocked)
        this_.get('model').forceThroughOriginAndPoint( this_.pivot1);
      else
        forceLineThroughPivots( this_.pivot1, this_.pivot2, tNewDragPt, tStaticPivotPt);
    }

    function continueRotation2( idX, idY) {
      var tNewDragPt = { x: tDragPoint.x + idX, y: tDragPoint.y + idY },
          tStaticPivotPt = { x: tXAxisView.dataToCoordinate( this_.pivot1.x),
                            y: tYAxisView.dataToCoordinate( this_.pivot1.y) };
      this_.pivot2.x = tXAxisView.coordinateToData( tNewDragPt.x);
      this_.pivot2.y = tYAxisView.coordinateToData( tNewDragPt.y);
      if( tLocked)
        this_.get('model').forceThroughOriginAndPoint( this_.pivot2);
      else
        forceLineThroughPivots( this_.pivot2, this_.pivot1, tNewDragPt, tStaticPivotPt);
    }

    function endRotation( idX, idY) {
      if( this_.pivot1.x > this_.pivot2.x) {
        var tSwap = this_.pivot1;
        this_.pivot1 = this_.pivot2;
        this_.pivot2 = tSwap;
      }
      logDragResult();
      tDragging = false;
      outScope();
    }

    //=============Main body of createElements===============

    if( this.myElements && (this.myElements.length > 0))
      return; // already created
    sc_super(); // Creates lineSeg, backgrndRect, and equation

    var tPaper = this.get('paper'),
        tDataTipLayer = this.getPath('paperSource.layerManager')[DG.LayerNames.kDataTip];

    this.hitHandles = [0, 1, 2].map(function(i) {
      return tPaper.rect(0, 0, this.kHandleSize, this.kHandleSize)
                    .addClass('dg-movable-line-handle')
                    .attr({ fill: '#FFF', 'fill-opacity': 1 });
    }.bind(this));

    // Hints (implemented as titles here) were good, but they cause layering problems that
    // prevent hitting the line if you are directly over lineSeg. Consider adding the hover
    // and drag routines to lineSeg.
    var dragContinue = [continueRotation1, continueTranslate, continueRotation2],
        dragBegin = [beginRotation, beginDrag, beginRotation],
        dragEnd = [endRotation, endTranslate, endRotation];
    this.hitSegments = [0, 1, 2].map(function(i) {
      return this.lineSeg.clone()
                  .attr({ 'stroke-width': 12,
                          stroke: DG.RenderingUtilities.kSeeThrough })
                  .hover(overScope, outScope)
                  .drag(dragContinue[i], dragBegin[i], dragEnd[i]);
    }.bind(this));

    this.hitHandles.concat(this.hitSegments).forEach( function( iElement) {
      this.myElements.push( iElement);
      tDataTipLayer.push( iElement);
    }.bind( this));
    return this.myElements;
  },

  /**
    Compute the positions of the pivots based on slope and intercept of the model.
   - The line has three segments when the intercept is not locked. Each segment has a different cursor, and one
   that changes based on line orientation.
   - When the intercept is locked, the has one or two segments, two if the origin is within the plot frame, one
   otherwise.
   - The intercept points and the breakpoints are used to define the segments. tIntercepts.pt1 is always to
   the left of tIntercepts.pt2. 
  */
  updateToModel: function() {
    if( !this.getPath('model.isVisible'))
        return;
    if( this.myElements === null)
      this.createElements();
    var tXAxisView = this.get( 'xAxisView'),
        tYAxisView = this.get( 'yAxisView'),
        tLayer = this.get('layer'),
        tModel = this.get('model'),
        tSlope = tModel.get('slope'),
        tLocked = tModel.get('isInterceptLocked'),
        tIntercept = tModel.get('intercept'),
        tXLowerBound = tXAxisView.getPath('model.lowerBound'),
        tXUpperBound = tXAxisView.getPath('model.upperBound'),
        tYLowerBound = tYAxisView.getPath('model.lowerBound'),
        tYUpperBound = tYAxisView.getPath('model.upperBound'),
        // Form of tIntercepts is { pt1: { x, y }, pt2: { x, y }} in world coordinates
        tIntercepts = (tModel.get('isVertical')) ?
                { pt1: { x: tModel.get('xIntercept'), y: tYLowerBound },
                  pt2: { x: tModel.get('xIntercept'), y: tYUpperBound }} :
                DG.PlotUtilities.lineToAxisIntercepts(
                  tSlope, tIntercept, tXAxisView.get('model'), tYAxisView.get('model') );

    function worldToScreen( iWorld) {
      return { x: tXAxisView.dataToCoordinate( iWorld.x),
               y: tYAxisView.dataToCoordinate( iWorld.y) };
    }

    function swapIntercepts() {
      var tSwap = tIntercepts.pt1;
      tIntercepts.pt1 = tIntercepts.pt2;
      tIntercepts.pt2 = tSwap;
    }

    if( tIntercepts.pt2.x < tIntercepts.pt1.x)
      swapIntercepts();

    var tBreakPt1, tBreakPt2;

    if( tLocked) {
      // The only break point is the origin, if it's visible.
      if( (tXLowerBound <= 0) && (tXUpperBound >= 0) && (tYLowerBound <= 0) && (tYUpperBound >= 0)) {
        tBreakPt1 = { x: 0, y: 0 };
        tBreakPt2 = tBreakPt1;
      }
      else if (tSlope >= 0) {
        if((tYUpperBound < 0) || (tXUpperBound < 0))
          tBreakPt1 = tBreakPt2 = tIntercepts.pt2;
        else
          tBreakPt1 = tBreakPt2 = tIntercepts.pt1;
      }
      else {  // tSlope < 0
        if((tYLowerBound > 0) || (tXUpperBound < 0))
          tBreakPt1 = tBreakPt2 = tIntercepts.pt2;
        else
          tBreakPt1 = tBreakPt2 = tIntercepts.pt1;
      }
    }
    else {
      tBreakPt1 = { x: tIntercepts.pt1.x + (3/8) * (tIntercepts.pt2.x - tIntercepts.pt1.x),
                    y: tIntercepts.pt1.y + (3/8) * (tIntercepts.pt2.y - tIntercepts.pt1.y) };
      tBreakPt2 = { x: tIntercepts.pt1.x + (5/8) * (tIntercepts.pt2.x - tIntercepts.pt1.x),
                    y: tIntercepts.pt1.y + (5/8) * (tIntercepts.pt2.y - tIntercepts.pt1.y) };
    }
    if( SC.none( this.pivot1) || !DG.MathUtilities.isInRange( this.pivot1.x, tXLowerBound, tXUpperBound) ||
                                  !DG.MathUtilities.isInRange( this.pivot1.y, tYLowerBound, tYUpperBound))
      this.pivot1 = tIntercepts.pt1;
    if( SC.none( this.pivot2) || !DG.MathUtilities.isInRange( this.pivot2.x, tXLowerBound, tXUpperBound) ||
                                      !DG.MathUtilities.isInRange( this.pivot2.y, tYLowerBound, tYUpperBound))
      this.pivot2 = tIntercepts.pt2;

    var pts = [tIntercepts.pt1, tBreakPt1, tBreakPt2, tIntercepts.pt2]
                .map(function(pt) { return worldToScreen(pt); });

    DG.RenderingUtilities.updateLine( this.lineSeg, pts[0], pts[3]);

    this.hitHandles.forEach(function(handle, i) {
      var xCenter = (pts[i].x + pts[i + 1].x) / 2,
          yCenter = (pts[i].y + pts[i + 1].y) / 2;
      tLayer.bringToFront(handle);
      handle.attr({x: xCenter - this.kHandleSize / 2, y: yCenter - this.kHandleSize / 2});
    }.bind(this));

    this.hitSegments.forEach(function(segment, i) {
      DG.RenderingUtilities.updateLine(segment, pts[i], pts[i + 1]);
    });

    var cursors = tSlope > 0
                    ? [this.kLineBotLeft, this.kLineSlideCur, this.kLineTopRight]
                    : [this.kLineTopLeft, this.kLineSlideCur, this.kLineBotRight];
    this.hitSegments.forEach(function(segment, i) {
      tLayer.bringToFront( segment);
      segment.attr({ cursor: cursors[i] });
    });

    this.positionEquationAndBackground();

  },

  /**
    My model's visibility has changed.
  */
  updateVisibility: function() {
    if( this.getPath('model.isVisible'))
      this.pivot1 = this.pivot2 = null;

    sc_super();
  }

});

