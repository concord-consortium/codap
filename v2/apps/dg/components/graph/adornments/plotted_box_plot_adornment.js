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

DG.PlottedBoxPlotLogString = '';  // global to avoid duplicate log strings.

/**
 * @class  Plots a box plot showing whiskers, Q1, Q3, and median.
 * @extends DG.PlottedAverageAdornment
 */
DG.PlottedBoxPlotAdornment = DG.PlottedAverageAdornment.extend(
    /** @scope DG.PlottedBoxPlotAdornment.prototype */
    (function () {

      var BoxPlotSymbol = SC.Object.extend({
        boxSymbol: null,
        lowerWhiskerCover: null,
        Q1Cover: null,
        lowerRect: null,
        medianCover: null,
        upperRect: null,
        Q3Cover: null,
        upperWhiskerCover: null,
        outliers: null,
        outlierCovers: null,

        init: function () {
          sc_super();
          this.outliers = [];
          this.outlierCovers = [];
        },

        /**
         *
         * @param iDest {[] || DG.RaphaelLayer }
         */
        pushElements: function (iDest) {
          DG.ObjectMap.forEach(this, function (iKey, iValue) {
            if (iValue.paper) // Test for it being a Raphael Element
              iDest.push(iValue);
          });
          this.outliers.forEach(function (iElement) {
            iDest.push(iElement);
          });
          this.outlierCovers.forEach(function (iElement) {
            iDest.push(iElement);
          });
        },

        removeFromArrayAndLayer: function (iArray, iLayer) {
          DG.ObjectMap.forEach(this, function (iKey, iValue) {
            if (iValue.paper) // Test for it being a Raphael Element
            {
              iLayer.prepareToMoveOrRemove(iValue);
              iValue.remove();
              iArray.splice(iArray.indexOf(iValue), 1);
            }
          });
          this.outliers.forEach(function (iElement) {
            iLayer.prepareToMoveOrRemove(iElement);
            iElement.remove();
            iArray.splice(iArray.indexOf(iElement), 1);
          });
          this.outlierCovers.forEach(function (iElement) {
            iLayer.prepareToMoveOrRemove(iElement);
            iElement.remove();
            iArray.splice(iArray.indexOf(iElement), 1);
          });
        }
      });

      return {
        hoverColor: "rgba(255, 48, 0, 0.3)", /** color of line when mouse over cover line */
        bgStroke: '#FFb280',
        bgStrokeWidth: 0.5,
        bgFill: '#FFb280',
        symStroke: '#F30',
        symStrokeWidth: 1,

        modelPropertiesToObserve: [ ['showOutliers', 'updateVisibility'] ],

        /**
         * @property {[BoxPlotSymbol]}
         */
        boxPlotSymbols: null,

        init: function () {
          sc_super();
          this.boxPlotSymbols = [];
        },

        _infoTip: null,
        infoTip: function () {
          if (!this._infoTip) {
            var this_ = this;
            this._infoTip = DG.InfoTip.create({
              paperSource: function () {
                return this_.get('paperSource');
              }.property(),
            });
          }
          return this._infoTip;
        }.property(),

        /**
         * Recompute our model if needed, then move symbols to location specified by model.
         * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
         */
        updateToModel: function( iAnimate ) {
          var tModel = this.get('model');

          if( tModel && tModel.get('isVisible')) {
            tModel.recomputeValueIfNeeded();
            this.updateSymbols( iAnimate );
          }
        },

        /**
         * Show or hide the text element "average = 123.456"
         * Using DG.LineLabelMixin to position.
         * @param iShow {Boolean} Show or hide this text element?
         * @param iDisplayValue {Number} Value along numeric axis, for text display
         * @param iAxisValue {Number} Value along numeric axis, for positioning
         * @param iFractionFromTop {Number} used to position text on cross-axis
         * @param iElementID {Number} Rafael element id of the text, so we can find and update it on the fly.
         * @param iValue {Object} Has the statistics for the current cell
         */
        updateTextElement: function( iShow, iDisplayValue, iAxisValue, iFractionFromTop, iValue, iElementID ) {
          DG.assert( this.textElement );
          if( iShow && DG.isFinite( iDisplayValue ) ) {
            // set up parameters used by DG.LineLabelMixin.updateTextToModel()
            this.value = iAxisValue; // for St.Dev., iAxisValue not equal to iDisplayValue
            this.valueAxisView = this.getPath('parentView.primaryAxisView');
            this.valueString = this.titleString( iDisplayValue, iValue );
            this.updateTextToModel( iFractionFromTop );
            this.textElement.show();
            this.backgrndRect.show();
            this.textShowingForID = iElementID;
          } else {
            // hide until next time
            //this.value = 0;
            this.valueString = '';
            this.valueAxisView = null;
            this.textElement.hide();
            this.backgrndRect.hide();
            this.textShowingForID = undefined;
          }
        },

        /**
         * Create a user log of the the hover over the average line, but remove duplicates
         * @param logString
         */
        updateHoverLog: function( logString ) {
          if( logString !== DG.PlottedBoxPlotLogString ) { // not 2 of the same log strings in a row
            DG.PlottedBoxPlotLogString = logString;        // save for next comparison
            DG.logUser("%@: %@", "hoverOverGraphLine", DG.PlottedBoxPlotLogString );
          }
        },

        /**
         * Create or update our myElements array of average symbols.
         * @param iAnimate {Boolean} [optional] if true then animate showing/hiding of box plot.
         */
        updateSymbols: function (iAnimate) {
          var this_ = this,
              tLayer = this.get('layer'),
              tPrimaryAxisView = this.getPath('parentView.primaryAxisView'),
              tSecondaryAxisView = this.getPath('parentView.secondaryAxisView'),
              tIsHorizontal = tPrimaryAxisView && (tPrimaryAxisView.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal),
              tValuesArray = this.getPath('model.values'),
              tNumValues = tValuesArray && tValuesArray.length,
              tPaper = this.get('paper');
          if (!tSecondaryAxisView || !tNumValues || !tPaper)
            return; // Happens during transition after secondary attribute removed but before new axis created
          var tCellHeight = (tNumValues ?
                  (Math.abs(tSecondaryAxisView.get('pixelMax') - tSecondaryAxisView.get('pixelMin')) / tNumValues) : 0),
              tSpec = {x: 0, y: 0, symSize: this.symSize, cellHeight: tCellHeight - this.cellGap},
              tOffScreen = -3 * this.symSize, // negative view coordinate to move off screen to hide
              tBoxWidth = Math.min(tCellHeight / 3, DG.PlotUtilities.kBoxplotMaxWidth);

          function overScope() {
            var tAttributes = {stroke: this_.hoverColor};
            this.stop();
            this.animate(tAttributes, this_.hoverDelay);
            var tBBox = this.getBBox();
            this_.get('infoTip').show({
              x: tBBox.x, y: tBBox.y - 2,
              tipString: this.info.tipString, tipValue: this.info.tipValue
            });
          }

          function outScope() {
            var tAttributes = {stroke: DG.RenderingUtilities.kTransparent};
            this.stop();
            this.animate(tAttributes, DG.PlotUtilities.kHighlightHideTime);
            this_.get('infoTip').hide();
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
            tCases.forEach(function (iCase) {
              var tValue = iCase.getForcedNumericValue(tNumericVarID);
              if (tValue >= tLower && tValue <= tUpper)
                tSelection.push(iCase);
            });
            this_.getPath('model.plotModel.dataContext').applyChange(tChange);
          }

          /**
           * A boxplot consists of
           *  - the outline of the plot
           *  - a rectangle for each quartile inside the box with a pointer hover cursor and a mousedown action
           *  - a cover segment for each whisker with pointer hover cursor and showing endpoint values, mousedown selects
           *  - a cover segment for the median with pointer hover cursor and showing median value
           *  - a cover segment for Q1 and Q3 with pointer hover cursor and showing appropriate values
           * @type {function(this:DG.PlottedBoxPlotAdornment)}
           */
          var updateOneBoxPlot = function (iIndex) {

            /**
             * Create the path string for the box plot. It is centered in the cell and 1/3 of the cellHeight in width
             * @param p {x,y,width,lowerWhisker,upperWhisker,cellHeight} of reference point, (.x,.y) is Q1,
             *        the two whiskers are lengths in pixels .width is IQR in pixels.
             * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
             */
            var getSymbolPath = function () {
              return tIsHorizontal ?
                    // Start at the lower whisker, line to Q1. Draw the box. Draw the median line. Draw the upper whisker.
                    'M%@,%@ h%@ M%@,%@ v%@ h%@ v%@ h%@ z M%@,%@ v%@ M%@,%@ h%@'.fmt(
                        tSpec.Q1 - tSpec.lowerWhisker, tYCenter, tSpec.lowerWhisker,
                        tSpec.Q1, tYCenter,
                        -tBoxWidth / 2, tSpec.width, tBoxWidth, -tSpec.width,
                        tSpec.x, tYCenter - tBoxWidth / 2, tBoxWidth,
                        tSpec.Q1 + tSpec.width, tYCenter, tSpec.upperWhisker) :
                    'M%@,%@ v%@ M%@,%@ h%@ v%@ h%@ v%@ z M%@,%@ h%@ M%@,%@ v%@'.fmt(
                        tXCenter, tSpec.Q1 - tSpec.lowerWhisker, tSpec.lowerWhisker,
                        tXCenter, tSpec.Q1,
                        -tBoxWidth / 2, -tSpec.width, tBoxWidth, tSpec.width,
                        tXCenter - tBoxWidth / 2, tSpec.y, tBoxWidth,
                        tXCenter, tSpec.Q1 - tSpec.width, tSpec.upperWhisker);
                },

                getLowerRect = function () {
                  return tIsHorizontal ?
                      {
                        x: tSpec.Q1, y: tSpec.y - tSpec.cellHeight / 2 - tBoxWidth / 2,
                        width: tSpec.x - tSpec.Q1, height: tBoxWidth
                      } :
                      {
                        x: tSpec.x + tSpec.cellHeight / 2 - tBoxWidth / 2, y: tSpec.y,
                        width: tBoxWidth, height: tSpec.Q1 - tSpec.y
                      };
                },

                getUpperRect = function () {
                  return tIsHorizontal ?
                      {
                        x: tSpec.x, y: tSpec.y - tSpec.cellHeight / 2 - tBoxWidth / 2,
                        width: tSpec.Q3 - tSpec.x, height: tBoxWidth
                      } :
                      {
                        x: tSpec.x + tSpec.cellHeight / 2 - tBoxWidth / 2, y: tSpec.Q3,
                        width: tBoxWidth, height: tSpec.y - tSpec.Q3
                      };
                },

                getLowerWhisker = function () {
                  return tIsHorizontal ?
                    'M%@,%@ h%@'.fmt( tSpec.Q1 - tSpec.lowerWhisker, tYCenter, tSpec.lowerWhisker) :
                    'M%@,%@ v%@'.fmt( tXCenter, tSpec.Q1 - tSpec.lowerWhisker, tSpec.lowerWhisker);
                },

                getUpperWhisker = function () {
                  return tIsHorizontal ?
                    // Start at Q3, line to upperWhisker.
                    'M%@,%@ h%@'.fmt( tSpec.Q3, tYCenter, tSpec.upperWhisker) :
                    'M%@,%@ v%@'.fmt( tXCenter, tSpec.Q3, tSpec.upperWhisker);
                },

                getCrossCover = function (iHKey, iVKey) {
                  return tIsHorizontal ?
                    // Move to the position for horizontal drawing and then make a line across the boxplot width
                    'M%@,%@ v%@'.fmt( tSpec[iHKey], tYCenter - tBoxWidth / 2, tBoxWidth) :
                    'M%@,%@ h%@'.fmt( tXCenter - tBoxWidth / 2, tSpec[iVKey], tBoxWidth);
                },

                outlierSymbol = function (iIndex) {
                  var tD = tBoxWidth / 3,
                      tCoord = tSpec.outliers[ iIndex],
                      tX = tIsHorizontal ? tCoord : tXCenter,
                      tY = tIsHorizontal ? tYCenter: tCoord;
                  return 'M%@,%@ h%@ M%@,%@ v%@'.fmt(
                      tX - tD / 2, tY, tD, tX, tY - tD / 2, tD);
                },

                createBoxPlotSymbol = function() {
                  var tSymbol = BoxPlotSymbol.create();
                  this.boxPlotSymbols.push(tSymbol);
                  tSymbol.boxSymbol = tPaper.path('M0,0')
                      .attr({stroke: this.symStroke, 'stroke-width': this.symStrokeWidth, 'stroke-opacity': 0});
                  tSymbol.lowerRect = tPaper.rect(0, 0, 0, 0)
                      .attr({
                        stroke: this.bgStroke,
                        'stroke-width': this.bgStrokeWidth,
                        fill: this.bgFill,
                        'fill-opacity': 0.5,
                        cursor: "pointer"
                      })
                      .mousedown(select);
                  tSymbol.upperRect = tSymbol.lowerRect.clone()
                      .mousedown(select);
                  tSymbol.lowerWhiskerCover = tPaper.path('M0,0')
                      .attr({
                        'stroke-width': this.hoverWidth, stroke: DG.RenderingUtilities.kTransparent,
                        cursor: "pointer"
                      })
                      .hover(overScope, outScope)
                      .mousedown(select);
                  tSymbol.upperWhiskerCover = tSymbol.lowerWhiskerCover.clone()
                      .hover(overScope, outScope)
                      .mousedown(select);
                  tSymbol.medianCover = tSymbol.lowerWhiskerCover.clone()
                      .hover(overScope, outScope);
                  tSymbol.Q1Cover = tSymbol.lowerWhiskerCover.clone()
                      .hover(overScope, outScope);
                  tSymbol.Q3Cover = tSymbol.lowerWhiskerCover.clone()
                      .hover(overScope, outScope);

                  tSymbol.lowerRect.animatable =
                      tSymbol.upperRect.animatable =
                          tSymbol.boxSymbol.animatable = true;
                  tSymbol.lowerRect.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
                  tSymbol.upperRect.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
                  tSymbol.boxSymbol.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
                  tSymbol.pushElements(this.myElements);
                  tSymbol.pushElements(tLayer);
                }.bind( this),

                configureBoxPlotSymbol = function ( iSymbol) {
                  iSymbol.lowerRect.info = {range: {lower: tQ1, upper: tMedian, cases: tCases}};
                  iSymbol.upperRect.info = {range: {lower: tMedian, upper: tQ3, cases: tCases}};
                  iSymbol.lowerWhiskerCover.info = {
                    tipString: 'lower = %@', tipValue: tLowerWhisker,
                    range: {lower: tLowerWhisker, upper: tQ1, cases: tCases}
                  };
                  iSymbol.upperWhiskerCover.info = {
                    tipString: 'upper = %@', tipValue: tUpperWhisker,
                    range: {lower: tQ3, upper: tUpperWhisker, cases: tCases}
                  };
                  iSymbol.medianCover.info = {tipString: 'median = %@', tipValue: tMedian};
                  iSymbol.Q1Cover.info = {tipString: 'Q1 = %@', tipValue: tQ1};
                  iSymbol.Q3Cover.info = {tipString: 'Q3 = %@', tipValue: tQ3};
                  if (iAnimate) {
                    iSymbol.boxSymbol.animate({path: getSymbolPath()}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
                    iSymbol.lowerRect.animate(getLowerRect(),
                        DG.PlotUtilities.kDefaultAnimationTime, '<>');
                    iSymbol.upperRect.animate(getUpperRect(),
                        DG.PlotUtilities.kDefaultAnimationTime, '<>');
                  } else {
                    iSymbol.boxSymbol.attr({path: getSymbolPath()});
                    iSymbol.lowerRect.attr(getLowerRect());
                    iSymbol.upperRect.attr(getUpperRect());
                  }
                  iSymbol.lowerWhiskerCover.attr('path', getLowerWhisker());
                  iSymbol.upperWhiskerCover.attr('path', getUpperWhisker());
                  iSymbol.medianCover.attr('path', getCrossCover('x', 'y'));
                  iSymbol.Q1Cover.attr('path', getCrossCover('Q1', 'Q1'));
                  iSymbol.Q3Cover.attr('path', getCrossCover('Q3', 'Q3'));

                  // Since the number of outliers is variable, we have get the right number
                  var tSym, tSymCover;
                  while( iSymbol.outliers.length < tSpec.outliers.length) {
                    tSym = tPaper.path('M0,0')
                        .attr({stroke: this.symStroke, 'stroke-width': this.symStrokeWidth, 'stroke-opacity': 1});
                    tSymCover = tPaper.path('M0,0')
                        .attr({
                          'stroke-width': this.hoverWidth, stroke: DG.RenderingUtilities.kTransparent,
                          cursor: "pointer"
                        })
                        .hover(overScope, outScope)
                        .mousedown(select);
                    tSym.animatable = true;
                    this.myElements.push( tSym);
                    tLayer.push( tSym);
                    iSymbol.outliers.push( tSym);
                    this.myElements.push( tSymCover);
                    tLayer.push( tSymCover);
                    iSymbol.outlierCovers.push( tSymCover);
                  }
                  while( iSymbol.outliers.length > tSpec.outliers.length) {
                    tSym = iSymbol.outliers.pop();
                    tLayer.prepareToMoveOrRemove(tSym);
                    tSym.remove();
                    this.myElements.splice(this.myElements.indexOf(tSym), 1);
                    tSymCover = iSymbol.outlierCovers.pop();
                    tLayer.prepareToMoveOrRemove(tSymCover);
                    tSymCover.remove();
                    this.myElements.splice(this.myElements.indexOf(tSymCover), 1);
                  }

                  iSymbol.outliers.forEach( function( iOutlier, iOutlierIndex) {
                    var tNumLower = tValuesArray[iIndex].lowerOutliers.length,
                        tWorldValue =  (iOutlierIndex < tNumLower) ?
                                        tValuesArray[iIndex].lowerOutliers[ iOutlierIndex] :
                                        tValuesArray[iIndex].upperOutliers[ iOutlierIndex - tNumLower],
                        tCover = iSymbol.outlierCovers[ iOutlierIndex],
                        tPath = outlierSymbol( iOutlierIndex);
                    iOutlier.attr({ path: tPath });
                    tCover.attr({ path: tPath });
                    tCover.info = {
                      tipString: '%@', tipValue: tWorldValue,
                      range: {lower: tWorldValue, upper: tWorldValue, cases: tCases }
                    };
                  });

                  iSymbol.boxSymbol.toFront();
                  iSymbol.lowerWhiskerCover.toFront();
                  iSymbol.upperWhiskerCover.toFront();
                  iSymbol.medianCover.toFront();
                  iSymbol.Q1Cover.toFront();
                  iSymbol.Q3Cover.toFront();
                }.bind( this);

            // Begin updateOneBoxPlot
            var tCases = tValuesArray[iIndex].cases,
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
            tSpec.y = ( tIsHorizontal ? (tNumValues - iIndex) * tCellHeight : tMedianCoord );
            tSpec.Q1 = tQ1Coord;
            tSpec.Q3 = tQ3Coord;
            tSpec.lowerWhisker = ( isFinite(tLowerWhisker) ?
            tSpec.Q1 - tPrimaryAxisView.dataToCoordinate(tLowerWhisker) : 0);
            tSpec.upperWhisker = ( isFinite(tUpperWhisker) ?
                (tIsHorizontal ? tPrimaryAxisView.dataToCoordinate(tUpperWhisker) - (tSpec.Q1 + tSpec.width) :
                    -(tSpec.Q1 - tSpec.width - tPrimaryAxisView.dataToCoordinate(tUpperWhisker))) : 0);
            tSpec.outliers = [];
            tValuesArray[iIndex].lowerOutliers.forEach(function (iOutlier) {
              tSpec.outliers.push(tPrimaryAxisView.dataToCoordinate(iOutlier));
            });
            tValuesArray[iIndex].upperOutliers.forEach(function (iOutlier) {
              tSpec.outliers.push(tPrimaryAxisView.dataToCoordinate(iOutlier));
            });
            var tXCenter = tSpec.x + tSpec.cellHeight / 2,
                tYCenter = tSpec.y - tSpec.cellHeight / 2;

            // create and update the boxplot elements
            if (iIndex >= this.boxPlotSymbols.length) {
              createBoxPlotSymbol();
            }

            // update elements (to current size/position)
            configureBoxPlotSymbol( this.boxPlotSymbols[iIndex]);

          }.bind(this);

          // Begin updateSymbols
          for (var i = 0; i < tNumValues; ++i) {
            updateOneBoxPlot(i);
          }
          while (this.boxPlotSymbols.length > tNumValues) {
            this.boxPlotSymbols.pop().removeFromArrayAndLayer(this.myElements, tLayer);
          }
        }
      };  // object returned closure
    }()) // function closure
);