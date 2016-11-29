// ==========================================================================
//                   DG.PlottedBoxPlotAdornment
//
//  Averages displayed as symbols in a dot plot.
//
//  Author:   William Finzer
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/adornments/plotted_average_adornment');

/**
 * @class  Plots a box plot showing whiskers, Q1, Q3, and median.
 * @extends DG.PlottedAverageAdornment
 */
DG.PlottedBoxPlotAdornment = DG.PlottedAverageAdornment.extend(
    /** @scope DG.PlottedIQRAdornment.prototype */
    {
      titleResource: 'DG.PlottedAverageAdornment.boxPlotTitle', /** {String} resource string for this.titleString() */
      titleFraction: 0.8,   /** {Number} fraction-from-top for placement of average=123 text */
      hoverColor: "rgba(255, 48, 0, 0.3)", /** color of line when mouse over cover line */
      bgStroke: '#FFb280',
      bgStrokeWidth:  0.5,
      bgFill: '#FFb280',
      symStroke: '#F30',
      symStrokeWidth: 1,

      _dataTip: null,
      dataTip: function() {
        if( !this._dataTip) {
          var this_ = this;
          this._dataTip = DG.DataTip.create({
            paperSource: function () {
              return this_.get('paperSource');
            }.property(),
            layerName: 'dataTip',
            getDataTipText: function () {
              var tResult = '';
              if (this.info) {
                tResult = this.info.tipString.loc(this.info.tipValue);
              }
              return tResult;
            },

            show: function (iInfo) {
              this.tipOrigin = {x: iInfo.x, y: iInfo.y};
              this.info = {tipString: iInfo.tipString, tipValue: iInfo.tipValue};

              sc_super();
            }

          });
        }
        return this._dataTip;
      }.property(),

      /**
       * Create or update our myElements array of average symbols.
       * @param iAnimate {Boolean} [optional] if true then animate showing/hiding of box plot.
       */
      updateSymbols: function( iAnimate ) {
        var this_ = this,
            tLayer = this.get('layer' ),
            tPrimaryAxisView = this.getPath('parentView.primaryAxisView'),
            tSecondaryAxisView = this.getPath('parentView.secondaryAxisView'),
            tIsHorizontal = tPrimaryAxisView && (tPrimaryAxisView.get('orientation') === 'horizontal'),
            tValuesArray = this.getPath('model.values'),
            tNumValues = tValuesArray && tValuesArray.length,
            tNumElements = this.myElements.length;
        if( !tSecondaryAxisView || !tNumValues)
          return; // Happens during transition after secondary attribute removed but before new axis created
        var tPaper = this.get('paper'),
            tCellHeight = (tNumValues ? (Math.abs(tSecondaryAxisView.get('pixelMax') - tSecondaryAxisView.get('pixelMin'))/tNumValues) : 0),
            tSpec = { x:0, y:0, symSize:this.symSize, cellHeight:tCellHeight-this.cellGap },
            tOffScreen = -3 * this.symSize, // negative view coordinate to move off screen to hide
            kElemsPerCell = 8, // rafael elements
            tBoxWidth = Math.min(tCellHeight / 3, DG.PlotUtilities.kBoxplotMaxWidth);

        function overScope() {
          var tAttributes = { stroke: this_.hoverColor };
          this.stop();
          this.animate( tAttributes, this_.hoverDelay );
          var tBBox = this.getBBox();
          this_.get('dataTip').show({
            x: tBBox.x, y: tBBox.y - 2,
            tipString: this.info.tipString, tipValue: this.info.tipValue
          });
        }

        function outScope() {
          var tAttributes = { stroke: DG.RenderingUtilities.kTransparent };
          this.stop();
          this.animate( tAttributes, DG.PlotUtilities.kHighlightHideTime );
          this_.get('dataTip').hide();
        }

        function select() {
          var tNumericVarID = this_.getPath('model.plotModel.primaryVarID'),
              tLower = this.info.range.lower,
              tUpper = this.info.range.upper,
              tCases = this.info.range.cases,
              tSelection = [],
              tChange = {
                operation: 'selectCases',
                collection: this_.getPath('model.plotModel.collectionClient'),
                cases: tSelection,
                select: true,
                extend: false
              };
          tCases.forEach( function( iCase) {
            var tValue = iCase.getNumValue( tNumericVarID);
            if( tValue >= tLower && tValue <= tUpper)
                tSelection.push( iCase);
          });
          this_.getPath('model.plotModel.dataContext').applyChange( tChange);
        }

        /**
         * A boxplot consists of
         *  - the outline of the plot
         *  - a rectangle for each quartile inside the box with a pointer hover cursor and a mousedown action
         *  - a cover segment for each whisker with pointer hover cursor and showing endpoint values, mousedown selects
         *  - a cover segment for the median with pointer hover cursor and showing median value
         * @type {function(this:DG.PlottedBoxPlotAdornment)}
         */
        var updateOneBoxPlot = function (iIndex) {

          /**
           * Create the path string for the box plot. It is centered in the cell and 1/3 of the cellHeight in width
           * @param p {x,y,width,lowerWhisker,upperWhisker,cellHeight} of reference point, (.x,.y) is Q1,
           *        the two whiskers are lengths in pixels .width is IQR in pixels.
           * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
           */
          var getSymbolPath = function (iSpec, iIsHorizontal) {
                if (iIsHorizontal) {
                  var tYCenter = iSpec.y - iSpec.cellHeight / 2;
                  // Start at the lower whisker, line to Q1. Draw the box. Draw the median line. Draw the upper whisker.
                  return 'M%@,%@ h%@ M%@,%@ v%@ h%@ v%@ h%@ z M%@,%@ v%@ M%@,%@ h%@'.fmt(
                      iSpec.Q1 - iSpec.lowerWhisker, tYCenter, iSpec.lowerWhisker,
                      iSpec.Q1, tYCenter,
                      -tBoxWidth / 2, iSpec.width, tBoxWidth, -iSpec.width,
                      iSpec.x, tYCenter - tBoxWidth / 2, tBoxWidth,
                      iSpec.Q1 + iSpec.width, tYCenter, iSpec.upperWhisker);
                } else {
                  var tXCenter = iSpec.x + iSpec.cellHeight / 2;
                  return 'M%@,%@ v%@ M%@,%@ h%@ v%@ h%@ v%@ z M%@,%@ h%@ M%@,%@ v%@'.fmt(
                      tXCenter, iSpec.Q1 - iSpec.lowerWhisker, iSpec.lowerWhisker,
                      tXCenter, iSpec.Q1,
                      -tBoxWidth / 2, -iSpec.width, tBoxWidth, iSpec.width,
                      tXCenter - tBoxWidth / 2, iSpec.y, tBoxWidth,
                      tXCenter, iSpec.Q1 - iSpec.width, iSpec.upperWhisker);
                }
              },

              getLowerRect = function (iSpec, iIsHorizontal) {
                return iIsHorizontal ?
                        {x: iSpec.Q1, y: iSpec.y - iSpec.cellHeight / 2 - tBoxWidth / 2,
                          width: iSpec.x - iSpec.Q1, height: tBoxWidth} :
                        {x: iSpec.x + iSpec.cellHeight / 2 - tBoxWidth / 2, y: iSpec.y,
                          width: tBoxWidth, height: iSpec.Q1 - iSpec.y };
              },

              getUpperRect = function (iSpec, iIsHorizontal) {
                return iIsHorizontal ?
                        {x: iSpec.x, y: iSpec.y - iSpec.cellHeight / 2 - tBoxWidth / 2,
                          width: iSpec.Q3 - iSpec.x, height: tBoxWidth} :
                        {x: iSpec.x + iSpec.cellHeight / 2 - tBoxWidth / 2, y: iSpec.Q3,
                          width: tBoxWidth, height: iSpec.y - iSpec.Q3 };
              },

              getLowerWhisker = function (iSpec, iIsHorizontal) {
                if (iIsHorizontal) {
                  var tYCenter = iSpec.y - iSpec.cellHeight / 2;
                  // Start at the lower whisker, line to Q1.
                  return 'M%@,%@ h%@'.fmt(
                      iSpec.Q1 - iSpec.lowerWhisker, tYCenter, iSpec.lowerWhisker);
                } else {
                  var tXCenter = iSpec.x + iSpec.cellHeight / 2;
                  return 'M%@,%@ v%@'.fmt(
                      tXCenter, iSpec.Q1 - iSpec.lowerWhisker, iSpec.lowerWhisker);
                }
              },

              getUpperWhisker = function (iSpec, iIsHorizontal) {
                if (iIsHorizontal) {
                  var tYCenter = iSpec.y - iSpec.cellHeight / 2;
                  // Start at Q3, line to upperWhisker.
                  return 'M%@,%@ h%@'.fmt(
                      iSpec.Q3, tYCenter, iSpec.upperWhisker);
                } else {
                  var tXCenter = iSpec.x + iSpec.cellHeight / 2;
                  return 'M%@,%@ v%@'.fmt(
                      tXCenter, iSpec.Q3, iSpec.upperWhisker);
                }
              },

              getCrossCover = function (iSpec, iIsHorizontal, iHKey, iVKey) {
                if (iIsHorizontal) {
                  var tYCenter = iSpec.y - iSpec.cellHeight / 2;
                  // Start at the lower whisker, line to Q1. Draw the box. Draw the median line. Draw the upper whisker.
                  return 'M%@,%@ v%@'.fmt(
                      iSpec[iHKey], tYCenter - tBoxWidth / 2, tBoxWidth);
                } else {
                  var tXCenter = iSpec.x + iSpec.cellHeight / 2;
                  return 'M%@,%@ h%@'.fmt(
                      tXCenter - tBoxWidth / 2, iSpec[iVKey], tBoxWidth);
                }
              };

          // Begin updateOneBoxPlot
          var tCases = tValuesArray[ iIndex].cases,
              tMedian = tValuesArray[iIndex].median,
              tQ1 = tValuesArray[iIndex].Q1,
              tQ3 = tValuesArray[iIndex].Q3,
              tLowerWhisker = tValuesArray[iIndex].lowerWhisker,
              tUpperWhisker = tValuesArray[iIndex].upperWhisker,
              tMedianCoord = ( isFinite(tMedian) ? tPrimaryAxisView.dataToCoordinate(tMedian) : tOffScreen ),
              tQ1Coord = ( isFinite(tQ1) ? tPrimaryAxisView.dataToCoordinate(tQ1) : tOffScreen ),
              tQ3Coord = ( isFinite(tQ3) ? tPrimaryAxisView.dataToCoordinate(tQ3) : tOffScreen );
          tSpec.width = ( isFinite(tQ3Coord - tQ1Coord) ? Math.abs(tQ3Coord - tQ1Coord) : 0 );
          tSpec.x = ( tIsHorizontal ? tMedianCoord : iIndex * tCellHeight );
          tSpec.y = ( tIsHorizontal ? (iIndex + 1) * tCellHeight : tMedianCoord );
          tSpec.Q1 = tQ1Coord;
          tSpec.Q3 = tQ3Coord;
          tSpec.lowerWhisker = ( isFinite(tLowerWhisker) ?
                                tSpec.Q1 - tPrimaryAxisView.dataToCoordinate(tLowerWhisker) : 0);
          tSpec.upperWhisker = ( isFinite(tUpperWhisker) ?
              (tIsHorizontal ? tPrimaryAxisView.dataToCoordinate(tUpperWhisker) - (tSpec.Q1 + tSpec.width) :
                  -(tSpec.Q1 - tSpec.width - tPrimaryAxisView.dataToCoordinate(tUpperWhisker))) : 0);
          tSpec.lowerOutliers = [];
          tValuesArray[ iIndex].lowerOutliers.forEach( function( iOutlier) {
            tSpec.lowerOutliers.push( tPrimaryAxisView.dataToCoordinate( iOutlier));
          });
          tSpec.upperOutliers = [];
          tValuesArray[ iIndex].upperOutliers.forEach( function( iOutlier) {
            tSpec.upperOutliers.push( tPrimaryAxisView.dataToCoordinate( iOutlier));
          });

          // create and update the boxplot elements
          var tSymbol, tLowerRect, tUpperRect, tLowerWhiskerCover, tUpperWhiskerCover, tMedianCover,
              tQ1Cover, tQ3Cover, tLowerOutliers, tUpperOutliers;
          if (iIndex * kElemsPerCell >= tNumElements) {
            tSymbol = tPaper.path('M0,0')
                .attr({stroke: this.symStroke, 'stroke-width': this.symStrokeWidth, 'stroke-opacity': 0});
            tLowerRect = tPaper.rect(0, 0, 0, 0)
                .attr({
                  stroke: this.bgStroke,
                  'stroke-width': this.bgStrokeWidth,
                  fill: this.bgFill,
                  'fill-opacity': 0.5,
                  cursor: "pointer"
                })
                .mousedown( select);
            tUpperRect = tLowerRect.clone()
                .mousedown( select);
            tLowerWhiskerCover = tPaper.path('M0,0')
                .attr({'stroke-width': this.hoverWidth, stroke: DG.RenderingUtilities.kTransparent,
                  cursor: "pointer"})
                .hover(overScope, outScope)
                .mousedown( select);
            tUpperWhiskerCover = tLowerWhiskerCover.clone()
                .hover(overScope, outScope)
                .mousedown( select);
            tMedianCover = tLowerWhiskerCover.clone()
                .hover(overScope, outScope);
            tQ1Cover = tLowerWhiskerCover.clone()
                .hover(overScope, outScope);
            tQ3Cover = tLowerWhiskerCover.clone()
                .hover(overScope, outScope);
            tLowerRect.animatable = tUpperRect.animatable = tSymbol.animatable = true;
            tLowerRect.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            tUpperRect.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            tSymbol.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            [tSymbol, tLowerRect, tUpperRect, tLowerWhiskerCover, tUpperWhiskerCover, tMedianCover,
              tQ1Cover, tQ3Cover]
                .forEach( function( iElement) {
                  this.myElements.push( iElement);
                }.bind(this));
            [tLowerRect, tUpperRect, tSymbol, tLowerWhiskerCover, tUpperWhiskerCover, tMedianCover,
              tQ1Cover, tQ3Cover]
                .forEach( function( iElement) {
                  tLayer.push( iElement);
                });
          }

          // update elements (to current size/position)
          tSymbol = this.myElements[iIndex * kElemsPerCell];
          tLowerRect = this.myElements[iIndex * kElemsPerCell + 1];
          tLowerRect.info = { range: { lower: tQ1, upper: tMedian, cases: tCases }};
          tUpperRect = this.myElements[iIndex * kElemsPerCell + 2];
          tUpperRect.info = { range: { lower: tMedian, upper: tQ3, cases: tCases }};
          tLowerWhiskerCover = this.myElements[iIndex * kElemsPerCell + 3];
          tLowerWhiskerCover.info = { tipString: 'lower = %@', tipValue: tLowerWhisker,
            range: { lower: tLowerWhisker, upper: tQ1, cases: tCases }};
          tUpperWhiskerCover = this.myElements[iIndex * kElemsPerCell + 4];
          tUpperWhiskerCover.info = { tipString: 'upper = %@', tipValue: tUpperWhisker,
            range: { lower: tQ3, upper: tUpperWhisker, cases: tCases }};
          tMedianCover = this.myElements[iIndex * kElemsPerCell + 5];
          tMedianCover.info = { tipString: 'median = %@', tipValue: tMedian};
          tQ1Cover = this.myElements[iIndex * kElemsPerCell + 6];
          tQ1Cover.info = { tipString: 'Q1 = %@', tipValue: tQ1};
          tQ3Cover = this.myElements[iIndex * kElemsPerCell + 7];
          tQ3Cover.info = { tipString: 'Q3 = %@', tipValue: tQ3};
          if (iAnimate) {
            tSymbol.animate({path: getSymbolPath(tSpec, tIsHorizontal)}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            tLowerRect.animate(getLowerRect(), DG.PlotUtilities.kDefaultAnimationTime, '<>');
            tUpperRect.animate(getUpperRect(), DG.PlotUtilities.kDefaultAnimationTime, '<>');
          } else {
            tSymbol.attr({path: getSymbolPath(tSpec, tIsHorizontal)});
            tLowerRect.attr(getLowerRect(tSpec, tIsHorizontal));
            tUpperRect.attr(getUpperRect(tSpec, tIsHorizontal));
          }
          tLowerWhiskerCover.attr('path', getLowerWhisker(tSpec, tIsHorizontal));
          tUpperWhiskerCover.attr('path', getUpperWhisker(tSpec, tIsHorizontal));
          tMedianCover.attr('path', getCrossCover(tSpec, tIsHorizontal, 'x', 'y'));
          tQ1Cover.attr('path', getCrossCover(tSpec, tIsHorizontal, 'Q1', 'Q1'));
          tQ3Cover.attr('path', getCrossCover(tSpec, tIsHorizontal, 'Q3', 'Q3'));

          tSymbol.toFront();
          tLowerWhiskerCover.toFront();
          tUpperWhiskerCover.toFront();
          tMedianCover.toFront();
        }.bind(this);

        // for each average value (one per cell on secondary axis), add *two* graphical elements
        // NOTE: alternatively, we might be able to create one group element that has both the symbol and cover as properties.
        for (var i = 0; i < tNumValues; ++i) {
          updateOneBoxPlot( i);
        }

        // remove extra symbols (if number of cells has shrunk)
        if( this.myElements.length > (kElemsPerCell*tNumValues)) {
          this.removeExtraSymbols( kElemsPerCell*tNumValues );
        }
        DG.assert( this.myElements.length === kElemsPerCell * tValuesArray.length );
      }
    });
