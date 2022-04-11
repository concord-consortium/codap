// ==========================================================================
//                   DG.PlottedAverageAdornment
//
//  Averages displayed as symbols in a dot plot.
//
//  Author:   Craig D. Miller
//
//  Copyright ©2012-13 Scientific Reasoning Research Institute,
//                  University of Massachusetts Amherst
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

sc_require('components/graph/adornments/plot_adornment');
sc_require('components/graph/adornments/line_label_mixin');

/**
 * @class  Abstract base class for plot adornments that draw averages (mean, median) as symbols in the plot.
 * @extends DG.PlotAdornment
 */
DG.PlottedAverageAdornment = DG.PlotAdornment.extend(
    /** @scope DG.PlottedAverageAdornment.prototype */
    {
      cellGap: 2, /** gap in pixels between one average line and the next */
      hoverWidth: 5, /** width of invisible 'cover' line that has popup text */
      hoverDelay: 10, /** very short (MS) delay before highlighting appears */
      symSize: 3, /** reference size, about 1/2 of width of symbols */
      symStrokeWidth: 1,
      bgStroke: 'black',
      bgFill: 'gray',
      bgStrokeWidth: 0.5,
      titlePrecision: 2, /** {Number} extra floating point precision of average value for this.titleString */
      titleFraction: 1 / 5, /** {Number} fraction-from-top for placement of average=123 text */

      shadingLayerName: '', /** Set on creation. This is layer where we stash backgrounds */
      /**
       * All my Raphael elements go in this layer
       * @property { DG.RaphaelLayer }
       */
      shadingLayer: function () {
        var tLayerManager = this.getPath('paperSource.layerManager');
        return (tLayerManager && this.layerName) ? tLayerManager[this.shadingLayerName] : null;
      }.property('paperSource', 'shadingLayerName'),

      /**
       * The number of average adornments displayed before me
       * Used to compute default equation position so as not to overlap with previous equations
       * @property offset {number}
       */
      offset: 0,

      /**
       * @property {Element[]}
       */
      lineCovers: null,

      /**
       Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
       which observers to add/remove from the model.

       @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
       */
      // Disabled, needs redesign to avoid redundancy with DG.DotPlotView calls to updateToModel()
      //modelPropertiesToObserve: [ ['values', 'updateToModel'] ],

      init: function () {
        sc_super();
        this.lineCovers = [];
      },

      /** do we want the average to be visible and up to date? Yes if our model 'isVisible' */
      wantVisible: function () {
        return this.getPath('model.isVisible');
      },

      /**
       * Recompute our model if needed, then move symbols to location specified by model.
       * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
       */
      updateToModel: function (iAnimate) {
        var tAverageModel = this.get('model');
        if (tAverageModel.get('isVisible')) {
          this.createEquationViews(); // No-op if they are already created
          if (!this.textElement) { // initialize the text element "average=", before updateSymbols()
            this.createTextElement();
            this.createBackgroundRect();
            this.textElement.attr('opacity', 1);  // We don't show this element until user hovers,
                                                  // at which point we need opacity to be 1
          }
          tAverageModel.recomputeValueIfNeeded();
          this.updateSymbols(iAnimate);
        }
      },

      // Subclasses will override if desired
      createEquationViews: function () {
      },

      // Subclasses may override
      updateEquation: function (i) {

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
      updateTextElement: function (iShow, iDisplayValue, iAxisValue, iFractionFromTop, iValue, iElementID) {
        DG.assert(this.textElement);
        if (iShow && DG.isFinite(iDisplayValue)) {
          // set up parameters used by DG.LineLabelMixin.updateTextToModel()
          this.value = iAxisValue; // for St.Dev., iAxisValue not equal to iDisplayValue
          this.valueAxisView = this.getPath('parentView.primaryAxisView');
          this.valueString = this.titleString(iDisplayValue, iValue);
          this.updateTextToModel(iFractionFromTop);
          this.textElement.show();
          this.backgrndRect.show();
          this.textShowingForID = iElementID;
        } else {
          // hide until next time
          //this.value = 0;
          this.valueString = '';
          this.textElement.hide();
          this.backgrndRect.hide();
          this.textShowingForID = undefined;
        }
      },

      /**
       * Create or update our myElements array of average symbols.
       * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
       */
      updateSymbols: function (iAnimate) {
        var tAdornment = this,
            tLayer = this.get('layer'),
            tShadingLayer = this.get('shadingLayer'),
            tPrimaryAxisView = this.getPath('parentView.primaryAxisView'),
            tSecondaryAxisView = this.getPath('parentView.secondaryAxisView'),
            tIsHorizontal = tPrimaryAxisView && (tPrimaryAxisView.get('orientation') === DG.GraphTypes.EOrientation.kHorizontal),
            tValuesArray = this.getPath('model.values'),
            tNumValues = tValuesArray && tValuesArray.length,
            tNumElements = this.myElements.length,
            tPaper = this.get('paper');
        if (!tSecondaryAxisView || !tNumValues)
          return; // Happens during transition after secondary attribute removed but before new axis created
        var tCellHeight = tAdornment.getPath('parentView.secondaryAxisView.fullCellWidth'),
            p = {x: 0, y: 0, symSize: this.symSize, cellHeight: tCellHeight - this.cellGap},
            tOffScreen = -3 * this.symSize; // negative view coordinate to move off screen to hide
        var tWorldCoord, tViewCoord, i, tSpread, tSpreadStart, tLowerWhisker, tUpperWhisker, tStat;
        var tSymbol, tCover, tBackground, kElemsPerCell = 3; // rafael elements

        function overScope() {
          tAdornment.highlightOne(this._valueIndex);
          if (!tAdornment.get('showMeasureLabels')) {
            tAdornment.updateTextElement(true, this.textStatValue, this.textAxisPosition, this.textCrossPosition,
                this.value, this.id);
          }
        }

        function outScope() {
          tAdornment.unHighlightOne(this._valueIndex);
          if (!tAdornment.get('showMeasureLabels')) {
            tAdornment.updateTextElement(false);
          }
        }

        // for each average value (one per cell on secondary axis), add *two* graphical elements
        // NOTE: alternatively, we might be able to create one group element that has both the symbol and cover as properties.
        for (i = 0; i < tNumValues; ++i) {

          // transform the computed average to view coordinates of symbol reference point
          tStat = tValuesArray[i][this.statisticKey]; // user-visible statistic value: number or undefined
          tWorldCoord = tValuesArray[i][this.centerKey]; // center value to plot: number or undefined
          tSpread = tValuesArray[i][this.spreadKey]; // spread value to plot: number or undefined;
          tSpreadStart = tValuesArray[i][this.spreadStartKey]; // world coord of lower end of spread
          tLowerWhisker = tValuesArray[i][this.lowerKey]; // end of lower whisker to plot: number or undefined;
          tUpperWhisker = tValuesArray[i][this.upperKey]; // end of upper whisker to plot: number or undefined;
          tViewCoord = (isFinite(tWorldCoord) ? tPrimaryAxisView.dataToCoordinate(tWorldCoord) : tOffScreen);
          p.width = (isFinite(tSpread) ? Math.abs(tPrimaryAxisView.dataToCoordinate(tWorldCoord + tSpread) - tViewCoord) : 0);
          p.x = (tIsHorizontal ? tViewCoord : i * tCellHeight);
          p.y = (tIsHorizontal ? (tNumValues - i) * tCellHeight : tViewCoord);
          p.spreadStart = (isFinite(tSpreadStart) ?
              tPrimaryAxisView.dataToCoordinate(tSpreadStart) : tOffScreen);
          p.lowerWhisker = (isFinite(tLowerWhisker) ?
              p.spreadStart - tPrimaryAxisView.dataToCoordinate(tLowerWhisker) : 0);
          p.upperWhisker = (isFinite(tUpperWhisker) ?
              (tIsHorizontal ? tPrimaryAxisView.dataToCoordinate(tUpperWhisker) - (p.spreadStart + p.width) :
                  -(p.spreadStart - p.width - tPrimaryAxisView.dataToCoordinate(tUpperWhisker))) : 0);

          // create symbol and invisible cover line elements as needed (set constant attributes here)
          if (i * kElemsPerCell >= tNumElements) {
            tBackground = tPaper.path('M0,0')
                .attr({
                  stroke: this.bgStroke,
                  'stroke-width': this.bgStrokeWidth,
                  fill: this.bgFill,
                  'fill-opacity': 0.5
                });
            tSymbol = tPaper.path('M0,0')
                .attr({stroke: this.symStroke, 'stroke-width': this.symStrokeWidth, 'stroke-opacity': 0});
            tCover = tPaper.path('M0,0')
                .attr({'stroke-width': this.hoverWidth, stroke: DG.RenderingUtilities.kTransparent})
                .hover(overScope, outScope);
            tCover._valueIndex = i;
            this.lineCovers[i] = tCover;
            tBackground.animatable = tSymbol.animatable = true;
            tBackground.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            tSymbol.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            this.myElements.push(tBackground);
            this.myElements.push(tSymbol);
            this.myElements.push(tCover);
            tShadingLayer.push(tBackground);
            tLayer.push(tSymbol);
            tLayer.push(tCover);
          }

          // update elements (to current size/position)
          tBackground = this.myElements[i * kElemsPerCell];
          tSymbol = this.myElements[i * kElemsPerCell + 1];
          tCover = this.myElements[i * kElemsPerCell + 2];
          if (iAnimate) {
            tBackground.animate({path: this.backgroundPath(p, tIsHorizontal)}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            tSymbol.animate({path: this.symbolPath(p, tIsHorizontal)}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
                this.updateToModel.bind(this));
          } else {
            tBackground.attr({path: this.backgroundPath(p, tIsHorizontal)});
            tSymbol.attr({path: this.symbolPath(p, tIsHorizontal)});
          }
          tCover.attr('path', this.coverPath(p, tIsHorizontal));

          // save the following values for updateTextElement() which is called during hover over the cover element
          tCover.textStatValue = tStat;
          tCover.textAxisPosition = this.getTextPositionOnAxis(tWorldCoord, tSpread);
          tCover.textCrossPosition = tIsHorizontal ?
              1 - ((1 / tNumValues) * (i + 1 - this.titleFraction)) :
              ((1 / tNumValues) * (i + this.titleFraction)); // text position in range [0-1] on cross axis
          tCover.value = tValuesArray[i];

          tSymbol.toFront(); // keep averages on top of cases
          tCover.toFront();  // keep cover on top of average symbol
          if (!this.get('showMeasureLabels')) {
            if (this.textElement) {
              this.backgrndRect.toFront();
              this.textElement.toFront();
            } // keep text in front of case circles

            // if mouse is now over an element with text showing, update the text now.
            if (this.textShowingForID === tCover.id) {
              this.updateTextElement(true, tCover.textStatValue, tCover.textAxisPosition, tCover.textCrossPosition,
                  tCover.id, tCover.value);
            }
          }

          this.updateEquation(i);
        }

        // remove extra symbols (if number of cells has shrunk)
        if (this.myElements.length > (kElemsPerCell * tNumValues)) {
          this.removeExtraSymbols(kElemsPerCell * tNumValues);
        }
        DG.assert(this.myElements.length === kElemsPerCell * tValuesArray.length);
      },

      /**
       * Remove extra symbols from the plot and the end of our 'myElements' array
       * @param iDesiredNumSymbols
       */
      removeExtraSymbols: function (iDesiredNumSymbols) {
        var tLayer = this.get('layer'),
            tShadingLayer = this.get('shadingLayer'),
            i, j, tElement;

        for (i = iDesiredNumSymbols, j = this.myElements.length; i < j; ++i) {
          tElement = this.myElements[i];
          tLayer.prepareToMoveOrRemove(tElement);
          tShadingLayer.prepareToMoveOrRemove(tElement);
          tElement.remove();
        }
        this.myElements.length = iDesiredNumSymbols;
      },

      /**
       * Create the path string for the average symbol; can be overridden
       * @param p {x,y,cellHeight} of reference point
       * @param iIsHorizontal {Boolean}
       * @return {String} M:move-to absolute: l:line-to relative: z:close path
       */
      symbolPath: function (p, iIsHorizontal) {
        if (iIsHorizontal) {
          return 'M%@,%@ v%@'.fmt(p.x, p.y, -(p.cellHeight));
        } else {
          return 'M%@,%@ h%@'.fmt(p.x, p.y, p.cellHeight);
        }
      },

      /**
       * Create the path string for the invisible popup cover region.
       * @param p {x,y,cellHeight} of reference point
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      coverPath: function (p, iIsHorizontal) {
        if (iIsHorizontal) {
          return 'M%@,%@ v%@'.fmt(p.x, p.y, -(p.cellHeight));
        } else {
          return 'M%@,%@ h%@'.fmt(p.x, p.y, p.cellHeight);
        }
      },

      /**
       * Create the path string for the background, for example gray reference lines on the St.Dev..
       * @param p {x,y,cellHeight} of reference point
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      backgroundPath: function (p, iIsHorizontal) {
        return 'M0,0'; // default is to return an empty path
      },

      /**
       * @return {String} title string to show when hovering over average symbol/line
       */
      titleString: function (axisValue) {
        // convert resource to string with rounding, and insert axis value number
        if (!isFinite(axisValue))
          return '';
        var tPrecision = DG.PlotUtilities.findFractionDigitsForAxis(this.getPath('parentView.primaryAxisView')),
            tNumFormat = DG.Format.number().fractionDigits(0, tPrecision).group(''),
            tUnits = this.getPath('parentView.primaryAxisView.model.firstAttributeUnit'),
            tValueString = this.titleResource.loc(tNumFormat(axisValue));
        if (this.get('showMeasuresLabel')) {
          var tHTML = '<p style = "color:%@;">%@ %@</p>',
              tUnitsSpan = '<span style = "color:gray;">%@</span>'.loc(tUnits);
          return tHTML.loc(this.symStroke, tValueString, tUnitsSpan);
        } else {
          return tValueString + ' ' + tUnits;
        }
      }

    });

/**
 * @class  Base class for plotted average adornments that consist of a single line or area
 * @extends DG.PlottedAverageAdornment
 */
DG.PlottedSimpleAverageAdornment = DG.PlottedAverageAdornment.extend(DG.LineLabelMixin,
    /** @scope DG.PlottedSimpleAverageAdornment.prototype */
    (function () {

      return {

        init: function () {
          sc_super();
          this.equationViews = [];
        },

        destroy: function () {
          this.destroyEquationViews();
          sc_super();
        },

        showMeasureLabels: function () {
          return this.getPath('model.plotModel.showMeasureLabels') || SC.platform.touch;
        }.property(),

        showMeasuresLabelsDidChange: function () {
          if (this.get('showMeasureLabels')) {
            this.createEquationViews();
          } else {
            this.destroyEquationViews();
          }
          this.notifyPropertyChange('showMeasuresLabel');
        }.observes('model.plotModel.showMeasureLabels'),

        /**
         * @property {DG.EquationView[]}
         */
        equationViews: null,

        destroyEquationViews: function () {
          if (this.get('equationViews')) {
            this.get('equationViews').forEach(function (iView) {
              iView.destroy();
            });
          }
          this.equationViews = [];
        },

        setEquationsVisibility: function (iIsVisible) {
          this.get('equationViews').forEach(function (iView) {
            iView.set('isVisible', iIsVisible);
          });
        },

        showElements: function () {
          sc_super();
          this.setEquationsVisibility(true);
        },

        hideElements: function () {
          sc_super();
          this.setEquationsVisibility(false);
        },

        /**
         * There will be one equation view for each of our values
         */
        createEquationViews: function () {
          var this_ = this,
              tEqViewIndex, tMouseStart, tOriginalCoordinates, tReturnPoint;

          function highlightElements(iIndex) {
            this_.highlightOne(iIndex);
          }

          function unHighlightElements(iIndex) {
            this_.unHighlightOne(iIndex);
          }

          function beginDrag(event) {
            var tEqView = this;

            function getCurrentCoords() {
              var tEqLayer = tEqView.get('layer');
              return {
                proportionX: tEqLayer.offsetLeft / this_.get('paper').width,
                proportionY: tEqLayer.offsetTop / this_.get('paper').height
              };
            }

            tEqViewIndex = tEqView.get('index');
            tMouseStart = {x: event.clientX, y: event.clientY};
            tOriginalCoordinates = this_.getPath('model.equationCoordsArray')[tEqViewIndex];
            tReturnPoint = SC.none(tOriginalCoordinates) ? getCurrentCoords() : tOriginalCoordinates;
            return YES;
          }

          function continueDrag(event) {
            var dX = (event.clientX - tMouseStart.x),
                dY = (event.clientY - tMouseStart.y),
                tPaper = this_.get('paper');
            if( dX !== 0 || dY !== 0) {
              var tCoordsArray = this_.getPath('model.equationCoordsArray'),
                  tCoords = {
                    proportionX: tReturnPoint.proportionX + dX / tPaper.width,
                    proportionY: tReturnPoint.proportionY + dY / tPaper.height
                  };
              tCoordsArray[tEqViewIndex] = tCoords;
              this_.updateEquation(tEqViewIndex);
            }
          }

          function endDrag(iEvent) {
            var tOriginal = tOriginalCoordinates,
                tNew;
            DG.UndoHistory.execute(DG.Command.create({
              name: "graph.repositionEquation",
              undoString: 'DG.Undo.graph.repositionEquation',
              redoString: 'DG.Redo.graph.repositionEquation',
              log: "Moved equation from %@ to %@".fmt(tOriginal, this.getPath('model.coordinates')),
              executeNotification: {
                action: 'notify',
                resource: 'component',
                values: {
                  operation: 'reposition equation',
                  type: 'DG.GraphView'
                }
              },
              execute: function () {
                tNew = this_.getPath('model.equationCoordsArray')[tEqViewIndex];
              }.bind(this),
              undo: function () {
                this_.getPath('model.equationCoordsArray')[tEqViewIndex] = tOriginal;
                this_.updateEquation(tEqViewIndex);
              }.bind(this),
              redo: function () {
                this_.getPath('model.equationCoordsArray')[tEqViewIndex] = tNew;
                this_.updateEquation(tEqViewIndex);
              }.bind(this)
            }));
          }

          if (this.get('showMeasureLabels')) {
            if (!this.equationViews)
              this.equationViews = [];
            var tValuesArray = this.getPath('model.values'),
                tNumValues = tValuesArray && tValuesArray.length;
            while (this.equationViews.length < tNumValues) {
              var tEquationView = DG.EquationView.create({
                index: this.equationViews.length,
                highlight: highlightElements,
                unhighlight: unHighlightElements,
                mouseDown: beginDrag,
                mouseDragged: continueDrag,
                mouseUp: endDrag
              });
              tEquationView.set('isVisible', false);
              this.get('paperSource').appendChild(tEquationView);
              this.equationViews.push(tEquationView);
            }
            while (this.equationViews.length > tNumValues) {
              this.equationViews.pop().destroy();
            }
            for (var index = 0; index < this.equationViews.length; index++) {
              this.updateEquation(index);
            }
          }
        },

        updateEquation: function (iIndex) {
          if (this.getPath('showMeasureLabels')) {
            var tIsHorizontal = this.getPath('parentView.primaryAxisView.orientation') === DG.GraphTypes.EOrientation.kHorizontal,
                tValuesArray = this.getPath('model.values'),
                tNumValues = tValuesArray && tValuesArray.length,
                tCenterWorld = tValuesArray[iIndex][this.centerKey],
                tStat = tValuesArray[iIndex][this.statisticKey],
                tTitleString = this.titleString(tStat),
                tCellWidth = this.getPath('parentView.secondaryAxisView.fullCellWidth'),
                tPrimaryAxisView = this.getPath('parentView.primaryAxisView'),
                tEquationView = this.get('equationViews')[iIndex],
                tCoordsFromModel = this.getPath('model.equationCoordsArray')[iIndex],
                tPaper = this.get('paper'),
                tX, tY;
            if (!tEquationView)
              return; // Can happen during transitions
            tEquationView.show({x: 0, y: -100}, tTitleString);
            if (tCoordsFromModel) {
              var tEquationDiv = tEquationView.get('layer'),
                  tWidth = tEquationDiv.offsetWidth,
                  tHeight = tEquationDiv.offsetHeight;
              tX = tCoordsFromModel.proportionX * tPaper.width;
              tX = Math.min(Math.max(tX, -tWidth / 2), tPaper.width - tWidth / 2);
              tY = tCoordsFromModel.proportionY * tPaper.height;
              tY = Math.min(Math.max(tY, -tHeight / 2), tPaper.height - tHeight / 2);
              // Adjust the proportions in case we changed
              tCoordsFromModel.proportionX = tX / tPaper.width;
              tCoordsFromModel.proportionY = tY / tPaper.height;
            } else {
              var kOffscreen = -9,
                  tViewCoord = isFinite(tCenterWorld) ? tPrimaryAxisView.dataToCoordinate(tCenterWorld) : kOffscreen,
                  tSpreadWorld = tValuesArray[iIndex][this.spreadKey],
                  tSpreadCoord = isFinite(tSpreadWorld) ?
                      Math.abs(tPrimaryAxisView.dataToCoordinate(tSpreadWorld) - tPrimaryAxisView.dataToCoordinate(0)) : 0,
                  tLoc = this.getTextPositionOnAxis(tViewCoord, tSpreadCoord),
                  tOffset = this.get('offset') * DG.EquationView.defaultHeight;
              tX = tIsHorizontal ? tLoc : iIndex * tCellWidth;
              tY = tIsHorizontal ? tOffset + (tNumValues - iIndex - 1) * tCellWidth :
                  tOffset + (iIndex % 2) * DG.EquationView.defaultHeight;
            }
            tEquationView.set('isVisible', this.getPath('model.isVisible'));
            tEquationView.show({x: tX, y: tY}, tTitleString);
          }
        },

        offsetDidChange: function () {
          this.get('equationViews').forEach(function (iView, iIndex) {
            this.updateEquation(iIndex);
          }.bind(this));
        }.observes('offset'),

        highlightOne: function (iIndex) {
          var tAttributes = {stroke: this.hoverColor},
              tCoverElement = this.lineCovers[iIndex];
          tCoverElement.stop();
          tCoverElement.animate(tAttributes, this.hoverDelay);
          if (this.get('showMeasureLabels')) {
            this.get('equationViews')[iIndex].set('highlighted', true);
          }
        },

        unHighlightOne: function (iIndex) {
          var tAttributes = {stroke: DG.RenderingUtilities.kTransparent},
              tCoverElement = this.lineCovers[iIndex];
          tCoverElement.stop();
          tCoverElement.animate(tAttributes, DG.PlotUtilities.kHighlightHideTime);
          if (this.get('showMeasureLabels')) {
            this.get('equationViews')[iIndex].set('highlighted', false);
          }
        },

        /**
         * Get the desired axis position of the equation view, in display coordinates.
         * @param iCenterValue {Number}
         * @param iSpreadValue {Number}
         */
        getTextPositionOnAxis: function (iCenterValue, iSpreadValue) {
          var tOffset = 0,
              tAxisView = this.get('valueAxisView');
          if (tAxisView) {
            tOffset = Math.abs(tAxisView.coordinateToData(2) - tAxisView.coordinateToData(0));
          }
          return iCenterValue + tOffset; // default to text going to the right of the center line
        }

      };  // object returned closure
    }()) // function closure
);

/**
 * @class  Plots a computed value.
 * @extends DG.PlottedAverageAdornment
 */
DG.PlottedMeanAdornment = DG.PlottedSimpleAverageAdornment.extend(
    /** @scope DG.PlottedMeanAdornment.prototype */
    {
      statisticKey: 'mean', /** {String} key to relevant statistic in this.model.values[i][statistic] */
      centerKey: 'mean',
      titleResource: 'DG.PlottedAverageAdornment.meanValueTitle', /** {String} resource string for this.titleString() */
      //titleFraction: 0.3,   /** {Number} fraction-from-top for placement of average=123 text */
      hoverColor: "rgba(0, 0, 255, 0.3)", /** color of line when mouse over cover line */
      symStroke: '#00F',
      symStrokeWidth: 1.5

      /**
       * Create the path string for a Tinkerplots-like equilateral triangle at the given point on the axis line.
       * @param p {x,y,cellHeight} of reference point
       * @param iIsHorizontal {Boolean}
       * @return {String} M:move-to absolute: l:line-to relative: z:close path
       */
      /*symbolPath: function( p, iIsHorizontal ) {
        var triHeight = p.symSize*Math.sqrt(3),
            pathString = 'M%@,%@ l%@,%@ l%@,%@ z %@%@';
        if( iIsHorizontal ) {
          return pathString.fmt(
              p.x, (p.y - triHeight), // top of upward-pointing triangle
              (-p.symSize), triHeight, // lower left of triangle base
              (p.symSize*2), 0, // lower right of triangle base
              'V', // vertical line
              (p.y-p.cellHeight) // close path then move vertically to top of cell
            );
        } else {
          return pathString.fmt(
              (p.x+triHeight), p.y, // top of right-pointing triangle
              -triHeight, (-p.symSize), // top left of triangle base
              0, (p.symSize*2), // top right of triangle base
              'H', // horizontal line
              (p.x+p.cellHeight) // close path then move horizontally to top of cell
            );
        }
      }*/

    });


/**
 * @class  Plots a computed value.
 * @extends DG.PlottedSimpleAverageAdornment
 */
DG.PlottedMedianAdornment = DG.PlottedSimpleAverageAdornment.extend(
    /** @scope DG.PlottedMedianAdornment.prototype */
    {
      statisticKey: 'median',
      /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
      centerKey: 'median',
      titleResource: 'DG.PlottedAverageAdornment.medianValueTitle',
      /** {String} resource string for this.titleString() */
      //titleFraction: 0.1,   /** {Number} fraction-from-top for placement of average=123 text */
      hoverColor: "rgba(255, 0, 0, 0.3)",
      /** color of line when mouse over cover line */
      symStroke: '#F00',
      symStrokeWidth: 1.5

      /**
       * Create the path string for a TinkerPlots-like upside-down 'T' at the given point on the axis line.
       * @param p {x,y,cellHeight} of reference point
       * @param iIsHorizontal {Boolean}
       * @return {String} M:move-to absolute: l:line-to relative: z:close path
       */
      /*symbolPath: function( p, iIsHorizontal ) {
        if( iIsHorizontal ) {
          return 'M%@,%@ v%@ v%@ h%@ h%@'.fmt(
           p.x, p.y,
           -p.cellHeight, p.cellHeight,
           p.symSize, -2* p.symSize );
        } else {
          return 'M%@,%@ h%@ h%@ v%@ v%@'.fmt(
            p.x, p.y,
            p.cellHeight, -p.cellHeight,
            p.symSize, -2* p.symSize );
        }
      }
      */
    });


/**
 * @class  Plots a computed value.
 * @extends DG.PlottedSimpleAverageAdornment
 */
DG.PlottedDevAdornment = DG.PlottedSimpleAverageAdornment.extend(
    /** @scope DG.PlottedDevAdornment.prototype */
    {
      /**
       * Create the path string for the rectangular area covering the Standard Deviation.
       * @param p {x,y,cellHeight,width} of reference point in view coordinates
       * @param iIsHorizontal {Boolean}
       * @param iWidth {Number} width in pixels of spread
       * @return {String} M:move-to absolute: l:line-to relative: z:close path
       */
      symbolPath: function (p, iIsHorizontal) {
        if (iIsHorizontal) {
          // 2 lines
          return 'M%@,%@ v%@ M%@,%@ v%@'.fmt(
              p.x, p.y, -p.cellHeight, // vertical line up at -1 st.dev.
              p.x + 2 * p.width, p.y, -p.cellHeight); // vertical line up at +1 st.dev.
        } else {
          // 2 lines
          return 'M%@,%@ h%@ M%@,%@ h%@'.fmt(
              p.x, p.y, p.cellHeight, // vertical line up at -1 st.dev.
              p.x, p.y - 2 * p.width, p.cellHeight); // vertical line up at +1 st.dev.
        }
      },

      /**
       * Create the path string for the background, for example gray reference lines on the St.Dev..
       * @param p {x,y,cellHeight} of reference point
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      backgroundPath: function (p, iIsHorizontal) {
        var x = p.x,
            y = p.y,
            w = p.width,
            h = p.cellHeight;
        if (iIsHorizontal) {
          return 'M%@,%@ v%@ h%@ v%@ z M%@,%@ v%@'.fmt(
              x, y, -h, 2 * w, h, // box from -1 to +1 s.d.
              x + w, y, -h); // vertical line up at mean
        } else {
          return 'M%@,%@ h%@ v%@ h%@ z M%@,%@ h%@'.fmt(
              x, y, h, -2 * w, -h, // box from mean to +1 s.d.
              x, y - w, h); // horizontal line right at -1 s.d.
        }
      },

      /**
       * Create the path string for the invisible popup cover region.
       * @param p {x,y,cellHeight,width} of reference point
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      coverPath: function (p, iIsHorizontal) {
        return this.symbolPath(p, iIsHorizontal);
      },

      /**
       * Get the desired axis position of the pop-up text, in the attribute's coordinates.
       * @param iCenterValue
       * @param iSpreadValue
       */
      getTextPositionOnAxis: function (iCenterValue, iSpreadValue) {
        return iCenterValue + 2 * iSpreadValue + 2; // text going to the right of the shading
      }

    });

/**
 * @class  Plots a computed deviation.
 * @extends DG.PlottedDevAdornment
 */
DG.PlottedStDevAdornment = DG.PlottedDevAdornment.extend(
    /** @scope DG.PlottedStDevAdornment.prototype */
    {
      bgFill: '#9980FF',
      bgStroke: '#9980FF',
      bgStrokeWidth: 0.5,
      symStrokeWidth: 1,
      symStroke: '#30F',
      statisticKey: 'stdev',
      /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
      centerKey: 'centerMinus1Dev',
      /** {String} key to relevant center point in this.model.values[i][centerKey] */
      spreadKey: 'stdev',
      /** {String} key to relevant spread value in this.model.values[i][width] */
      titleResource: 'DG.PlottedAverageAdornment.stDevValueTitle',
      /** {String} resource string for this.titleString() */
      //titleFraction: 0.4,   /** {Number} fraction-from-top for placement of average=123 text */
      symHeight: 0.6,
      /** {Number} fractional distance from axis for symbol line  */
      hoverColor: "rgba(48, 0, 255, 0.3)", /** color of line when mouse over cover line */

    });

/**
 * @class  Plots a computed deviation.
 * @extends DG.PlottedDevAdornment
 */
DG.PlottedMeanAbsDevAdornment = DG.PlottedDevAdornment.extend(
    /** @scope DG.PlottedMeanAbsDevAdornment.prototype */
    {
      bgFill: '#9ac6ff',
      bgStroke: '#5bbaff',
      bgStrokeWidth: 0.5,
      symStrokeWidth: 1,
      symStroke: '#00adff',
      statisticKey: 'mad', /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
      centerKey: 'centerMinus1Dev', /** {String} key to relevant center point in this.model.values[i][centerKey] */
      spreadKey: 'mad', /** {String} key to relevant spread value in this.model.values[i][width] */
      titleResource: 'DG.PlottedAverageAdornment.madValueTitle', /** {String} resource string for this.titleString() */
      //titleFraction: 0.4,   /** {Number} fraction-from-top for placement of average=123 text */
      symHeight: 0.6, /** {Number} fractional distance from axis for symbol line  */
      hoverColor: "rgba(0, 173, 255, 0.3)", /** color of line when mouse over cover line */

    });

/**
 * @class  Plots a computed Inter-Quartile Range (IQR), between the first and third quartiles (Q1 and Q3).
 * @extends DG.PlottedSimpleAverageAdornment
 */
DG.PlottedIQRAdornment = DG.PlottedSimpleAverageAdornment.extend(
    /** @scope DG.PlottedIQRAdornment.prototype */
    {
      statisticKey: 'IQR', /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
      centerKey: 'Q1', /** {String} key to relevant center point in this.model.values[i][centerKey] */
      spreadKey: 'IQR', /** {String} key to relevant spread value in this.model.values[i][width] */
      titleResource: 'DG.PlottedAverageAdornment.iqrValueTitle', /** {String} resource string for this.titleString() */
      //titleFraction: 0.2,   /** {Number} fraction-from-top for placement of average=123 text */
      hoverColor: "rgba(255, 48, 0, 0.3)", /** color of line when mouse over cover line */
      bgStroke: '#FFb280',
      bgStrokeWidth: 0.5,
      bgFill: '#FFb280',
      symStroke: '#F30',
      symStrokeWidth: 1,

      /**
       * Create the path string for the background, gray reference lines going from Q1 to Q3
       * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      symbolPath: function (p, iIsHorizontal) {
        if (iIsHorizontal) {
          return 'M%@,%@ v%@ M%@,%@ v%@'.fmt(
              p.x, p.y, -p.cellHeight,  // vertical line up on Q1
              p.x + p.width, p.y, -p.cellHeight); // vertical line up on Q3
        } else {
          return 'M%@,%@ h%@ M%@,%@ h%@'.fmt(
              p.x, p.y, p.cellHeight,  // upper horizontal line on Q1
              p.x, p.y - p.width, p.cellHeight); // lower horizontal line on Q3
        }
      },

      /**
       * Create the path string for the invisible popup cover region.
       * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      coverPath: function (p, iIsHorizontal) {
        if (iIsHorizontal) {
          return 'M%@,%@ v%@ M%@,%@ v%@'.fmt(
              p.x, p.y, -p.cellHeight,  // vertical line up on Q1
              p.x + p.width, p.y, -p.cellHeight); // vertical line up on Q3
        } else {
          return 'M%@,%@ h%@ M%@,%@ h%@'.fmt(
              p.x, p.y, p.cellHeight,  // upper horizontal line on Q1
              p.x, p.y - p.width, p.cellHeight); // lower horizontal line on Q3
        }
      },

      /**
       * Create the path string for the background, gray reference lines going from Q1 to Q3
       * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      backgroundPath: function (p, iIsHorizontal) {
        if (iIsHorizontal) {
          return 'M%@,%@ v%@ h%@ v%@ z'.fmt(
              p.x, p.y, -p.cellHeight, p.width, p.cellHeight); // box on Q1-Q3 lines in cell
        } else {
          return 'M%@,%@ h%@ v%@ h%@ z'.fmt(
              p.x, p.y, p.cellHeight, -p.width, -p.cellHeight); // box on Q1-Q3 lines in cell
        }
      },

      /**
       * Get the desired axis position of the pop-up text, in the attribute's coordinates.
       * @param iCenterValue
       * @param iSpreadValue
       */
      getTextPositionOnAxis: function (iCenterValue, iSpreadValue) {
        return iCenterValue + iSpreadValue; // text going to the right of the shading
      }
    });

