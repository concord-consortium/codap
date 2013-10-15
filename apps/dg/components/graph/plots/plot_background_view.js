// ==========================================================================
//                            DG.PlotBackgroundView
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

/** @class  DG.PlotBackgroundView - The base class view for a plot.

  @extends DG.RaphaelBaseView
*/
DG.PlotBackgroundView = DG.RaphaelBaseView.extend( DG.GraphDropTarget,
/** @scope DG.PlotBackgroundView.prototype */ 
{
  displayProperties: ['xAxisView.model.lowerBound', 'xAxisView.model.upperBound',
                      'yAxisView.model.lowerBound', 'yAxisView.model.upperBound',
                      'xAxisView.model.attributeDescription.attributeStats.categoricalStats.numberOfCells',
                      'yAxisView.model.attributeDescription.attributeStats.categoricalStats.numberOfCells'],

  /**
   * @property {DG.GraphModel}
   */
  graphModel: null,

  /**
    @property { DG.AxisView}
  */
  xAxisView: null,
  /**
    @property { DG.AxisView }
  */
  yAxisView: null,

  // Private properties
  _backgroundForClick: null,  // We make this once and keep it sized properly.

  /**
    We just have the background to draw. But it has a marquee behavior and a background click
    behavior to install.
  */
  doDraw: function doDraw() {
    var this_ = this,
        tFrame = this.get('frame' ),
        tXAxisView = this.get('xAxisView'),
        tYAxisView = this.get('yAxisView'),
        tBothWaysNumeric =( tXAxisView.get('isNumeric') && tYAxisView.get('isNumeric')),
        tMarquee,
        tStartPt,
        tBaseSelection = [],
        tHaveShowZoomTip = false,
        tToolTip;

    function createRulerLines() {

      function vLine( iX, iColor, iWidth) {
        this_._elementsToClear.push(
          this_._paper.line( iX, tFrame.height, iX, 0)
                .attr( { stroke: iColor, 'stroke-width': iWidth }));
      }

      function hLine( iY, iColor, iWidth) {
        this_._elementsToClear.push(
          this_._paper.line( 0, iY, tFrame.width, iY)
                  .attr( { stroke: iColor, 'stroke-width': iWidth }));
      }

      function drawVRule( iValue, iX) {
        vLine( iX, DG.PlotUtilities.kRuleColor, DG.PlotUtilities.kRuleWidth);
      }

      function drawHRule( iValue, iY) {
        hLine( iY, DG.PlotUtilities.kRuleColor, DG.PlotUtilities.kRuleWidth);
      }

      function drawZeroLines() {

        function drawLine( iAxisView, iDrawingFunc) {
          var tZeroCoord = iAxisView.get('zeroPixel');
          if( tZeroCoord)
            iDrawingFunc( tZeroCoord, DG.PlotUtilities.kZeroLineColor, DG.PlotUtilities.kZeroLineWidth);
        }

        drawLine( tXAxisView, vLine);
        drawLine( tYAxisView, hLine);
      }
      if( tBothWaysNumeric ) {
        tXAxisView.forEachTickDo( drawVRule);
        tYAxisView.forEachTickDo( drawHRule);
        drawZeroLines();
      } // else suppress numeric grid lines for dot plots (numeric only on one axis), because it interferes with mean/median lines, etc.
    } // createRulerLines

    function startMarquee( iWindowX, iWindowY, iEvent) {
      // It's a little weird to put this altKey handling here because it makes the assumption
      //  that all subclasses have a different meaning for altKey dragging.
      if( iEvent.altKey)
        return; // Alt key has a different meaning

      if( iEvent.shiftKey)
        tBaseSelection = this_.getPath( 'graphModel.selection').toArray();
      else
        this_.get('graphModel').selectAll( false);
      tStartPt = DG.ViewUtilities.windowToViewCoordinates(
                    { x: iWindowX, y: iWindowY }, this_);
      tMarquee = this_._paper.rect( tStartPt.x, tStartPt.y, 0, 0)
              .attr( { fill: DG.PlotUtilities.kMarqueeColor,
                    stroke: DG.RenderingUtilities.kTransparent });
    }

    function continueMarquee( idX, idY) {
      if( SC.none( tMarquee))
        return; // Alt key was down when we started

      var tX = (idX > 0) ? tStartPt.x : tStartPt.x + idX,
        tY = (idY > 0) ? tStartPt.y : tStartPt.y + idY,
        tWidth = Math.abs( idX),
        tHeight = Math.abs( idY),
        tRect = { x: tX, y: tY, width: tWidth, height: tHeight };
      tMarquee.attr( tRect);
      this_.get('parentView' ).selectPointsInRect( tRect, tBaseSelection);
    }

    function endMarquee( idX, idY) {
      if( SC.none( tMarquee))
        return; // Alt key was down when we started

      tMarquee.remove();
      tMarquee = null;
      tBaseSelection = [];

      var tNumCases = this_.getPath( 'graphModel.casesController.selection.length');
      if( tNumCases > 0)  // We must have something > 0
        DG.logUser("marqueeSelection: %@", tNumCases);
    }

    function showCursor( iEvent) {
      if( iEvent.altKey) {
        var magnifyPlusCursorUrl = static_url('cursors/MagnifyPlus.cur'),
            magnifyMinusCursorUrl = static_url('cursors/MagnifyMinus.cur'),
            cursorUrl = iEvent.shiftKey ? magnifyMinusCursorUrl : magnifyPlusCursorUrl;
        this.attr( { cursor: DG.Browser.customCursorStr( cursorUrl, 8, 8) });
      }
      else
        this.attr( { cursor: 'auto' });
    }

    function destroyZoomTip() {
      if( tToolTip) {
        tToolTip.hide();
        tToolTip.destroy();
        tToolTip = null;
      }
    }

    function mouseOver( iEvent) {
      if( !tHaveShowZoomTip) {
        var tZoomTipText = 'DG.GraphView.zoomTip'.loc();
        tToolTip = DG.ToolTip.create( { paperSource: this_,
                                        text: tZoomTipText });
        tToolTip.show( iEvent.layerX, iEvent.layerY);
        tHaveShowZoomTip = true;
        this_.invokeLater( destroyZoomTip, 5000);
      }
    }

    var drawCellBands = function() {
      var tPaper = this.get('paper' ),
          tXView = this.get('xAxisView'),
          tYView = this.get('yAxisView'),
          tNumSecCells = tXView.getPath('model.numberOfCells'),
          tNumPrimaryCells = tYView.getPath('model.numberOfCells'),
          tSecCellWidth = tXView.get('fullCellWidth'),
          tPrimaryCellWidth = tYView.get('fullCellWidth'),
          tIsVertical = this.getPath('model.orientation') === 'vertical',
          tSecIndex, tPrimaryIndex,
          tHeight, tWidth,
          tXCoord, tYCoord, tLeft, tTop;
      if(SC.none( tPaper))
        return;

      if( tIsVertical) {
        tHeight = tSecCellWidth;
        tWidth = tPrimaryCellWidth;
      }
      else {
        tHeight = tPrimaryCellWidth;
        tWidth = tSecCellWidth;
      }

      for( tPrimaryIndex = 0; tPrimaryIndex < tNumPrimaryCells; tPrimaryIndex++) {
        if( tIsVertical){
          tXCoord = tYView.cellToCoordinate( tPrimaryIndex);
          tLeft = tXCoord - tPrimaryCellWidth / 2;
        }
        else {
          tYCoord = tYView.cellToCoordinate( tPrimaryIndex);
          tTop = tYCoord - tPrimaryCellWidth / 2;
        }
        for( tSecIndex = 0; tSecIndex < tNumSecCells; tSecIndex++) {
          if( tIsVertical) {
            tYCoord = tXView.cellToCoordinate( tSecIndex);
            tTop = tYCoord - tSecCellWidth / 2;
          }
          else {
            tXCoord = tXView.cellToCoordinate( tSecIndex);
            tLeft = tXCoord - tSecCellWidth / 2;
          }
          if( (tPrimaryIndex + tSecIndex) / 2 !== Math.floor((tPrimaryIndex + tSecIndex) / 2))
            this._elementsToClear.push(
              tPaper.rect( tLeft, tTop, tWidth, tHeight)
                .attr( { fill: DG.PlotUtilities.kPlotCellFill, opacity: 0.8,
                      stroke: DG.PlotUtilities.kPlotCellStroke })
                .toBack());
        }
      }
    }.bind( this); // drawCellBands

    createRulerLines();

    drawCellBands();

    if( SC.none( this._backgroundForClick)) {
      this._backgroundForClick = this._paper.rect( 0, 0, 0, 0)
                .attr( { fill: DG.RenderingUtilities.kSeeThrough,
                         stroke: DG.RenderingUtilities.kTransparent })
                .click( function( iEvent) {
                          this_.get('parentView').handleBackgroundClick( iEvent);
                        })
                .drag( continueMarquee, startMarquee, endMarquee)
                .mousemove( showCursor)
                .mouseover( mouseOver);
    }

    this._backgroundForClick.attr( { width: this.get('drawWidth'),
                                    height: this.get('drawHeight') } );

  },

  didCreateLayer: function() {
    var tGraphView = this.get('parentView');
    sc_super();
    tGraphView.get('plotViews' ).forEach( function( iPlotView) {
      iPlotView.didCreateLayer();
    });
    tGraphView.drawPlots();
  }

});

