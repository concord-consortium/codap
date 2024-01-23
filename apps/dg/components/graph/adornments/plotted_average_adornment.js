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
       * These display when user hovers over a symbol but are not part of the symbol
       * @property {Element[]}
       */
      hoverElements: null,

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
        this.hoverElements = [];
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
        // We can get here indirectly in which case iAnimate is an object we should ignore
        if (iAnimate !== true)
          iAnimate = false;
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
        // If my plotView has a plottedNormalAdorn and gaussianFitEnabled, update it too
        var tPlottedNormalAdorn = this.getPath('parentView.parentView.plottedNormalAdorn');
        (DG.get('gaussianFitEnabled') && tPlottedNormalAdorn) && tPlottedNormalAdorn.doDraw();
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
            tFullHeight = tAdornment.getPath('parentView.secondaryAxisView.fullWidth'),
            p = {x: 0, y: 0, symSize: this.symSize, cellHeight: tCellHeight - this.cellGap,
              fullHeight: tFullHeight},
            tOffScreen = -3 * this.symSize; // negative view coordinate to move off screen to hide
        var tWorldCoord, tViewCoord, i, tSpread, tSpreadStart, tLowerWhisker, tUpperWhisker, tStat, tAmplitude;
        var tSymbol, tCover, tHoverElement, tBackground, kElemsPerCell = 4; // rafael elements

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
          tAmplitude = tValuesArray[i][this.amplitudeKey]; // amplitude of gaussian fit curve for histogram
          tViewCoord = (isFinite(tWorldCoord) ? tPrimaryAxisView.dataToCoordinate(tWorldCoord) : tOffScreen);
          p.width = (isFinite(tSpread) ? Math.abs(tPrimaryAxisView.dataToCoordinate(tWorldCoord + tSpread) - tViewCoord) : 0);
          p.x = (tIsHorizontal ? tViewCoord : i * tCellHeight);
          p.y = (tIsHorizontal ? (tNumValues - i) * tCellHeight : tViewCoord);
          p.count = tValuesArray[i].count;
          p.center = tWorldCoord;
          p.spread = tSpread;
          p.spreadStart = (isFinite(tSpreadStart) ?
              tPrimaryAxisView.dataToCoordinate(tSpreadStart) : tOffScreen);
          p.lowerWhisker = (isFinite(tLowerWhisker) ?
              p.spreadStart - tPrimaryAxisView.dataToCoordinate(tLowerWhisker) : 0);
          p.upperWhisker = (isFinite(tUpperWhisker) ?
              (tIsHorizontal ? tPrimaryAxisView.dataToCoordinate(tUpperWhisker) - (p.spreadStart + p.width) :
                  -(p.spreadStart - p.width - tPrimaryAxisView.dataToCoordinate(tUpperWhisker))) : 0);
          p.amplitude = (isFinite(tAmplitude) ? tAmplitude : null);

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
            tHoverElement = tPaper.path('M0,0')
                .attr({stroke: this.symStroke, 'stroke-width': this.symStrokeWidth, 'stroke-opacity': 0});
            tHoverElement._valueIndex = i;
            this.hoverElements[i] = tHoverElement;
            tBackground.animatable = tSymbol.animatable = true;
            tBackground.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            tSymbol.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            this.myElements.push(tBackground);
            this.myElements.push(tSymbol);
            this.myElements.push(tCover);
            this.myElements.push(tHoverElement);
            tShadingLayer.push(tBackground);
            tLayer.push(tSymbol);
            tLayer.push(tCover);
            tLayer.push(tHoverElement);
          }

          // update elements (to current size/position)
          tBackground = this.myElements[i * kElemsPerCell];
          tSymbol = this.myElements[i * kElemsPerCell + 1];
          tCover = this.myElements[i * kElemsPerCell + 2];
          tHoverElement = this.myElements[i * kElemsPerCell + 3];
          if (iAnimate) {
            tBackground.animate({path: this.backgroundPath(p, tIsHorizontal)}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
            tSymbol.animate({path: this.symbolPath(p, tIsHorizontal)}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
                this.updateToModel.bind(this));
          } else {
            tBackground.attr({path: this.backgroundPath(p, tIsHorizontal)});
            tSymbol.attr({path: this.symbolPath(p, tIsHorizontal)});
          }
          tCover.attr('path', this.coverPath(p, tIsHorizontal));
          tHoverElement.attr('path', this.hoverElementPath(p, tIsHorizontal));

          // save the following values for updateTextElement() which is called during hover over the cover element
          tCover.textStatValue = tStat;
          tCover.textAxisPosition = this.getTextPositionOnAxis(tWorldCoord, tSpread);
          tCover.textCrossPosition = tIsHorizontal ?
              1 - ((1 / tNumValues) * (i + 1 - this.titleFraction)) :
              ((1 / tNumValues) * (i + this.titleFraction)); // text position in range [0-1] on cross axis
          tCover.value = tValuesArray[i];

          tSymbol.toFront(); // keep averages on top of cases
          tCover.toFront();  // keep cover on top of average symbol
          tHoverElement.toFront();  // So we can see it
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
       * Create the path string for element that will display on hover but is not part of the symbol.
       * @param p {x,y,cellHeight} of reference point
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      hoverElementPath: function (p, iIsHorizontal) {
        return '';
      },

      /**
       * Create the path string for the background, for example gray reference lines on the St.Dev..
       * @param p {x,y,cellHeight} of reference point
       * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
       */
      backgroundPath: function (p, iIsHorizontal) {
        return 'M0,0'; // default is to return an empty path
      },

      getValueString: function (axisValue, titleResource) {
        var tPrecision = DG.PlotUtilities.findFractionDigitsForAxis(this.getPath('parentView.primaryAxisView')),
           tNumFormat = DG.Format.number().fractionDigits(0, tPrecision).group('');
        return titleResource.loc(tNumFormat(axisValue));
      },

      /**
       * Return a string to be displayed to user to show numeric value with rounding and units
       * @param axisValue
       * @returns {{valueString:string, unitsString:string}}
       */
      valueAndUnitsStrings: function (axisValue, titleResource) {
        // convert resource to string with rounding, and insert axis value number
        if(!isFinite(axisValue))
          return {};
        var tUnits = this.getPath('parentView.primaryAxisView.model.firstAttributeUnit'),
           tValueString = this.getValueString(axisValue, titleResource);
        return {valueString: tValueString, unitsString: tUnits};
      },

      /**
       * @return {String} title string to show when hovering over average symbol/line
       */
      titleString: function (axisValue) {
        var tValueAndUnits = this.valueAndUnitsStrings(axisValue, this.titleResource);
        if (!tValueAndUnits.valueString)
          return '';
        if (this.get('showMeasureLabels')) {
          var tHTML = '<p style = "color:%@;">%@ %@</p>',
              tUnitsSpan = '<span style = "color:grey;">%@</span>'.loc(tValueAndUnits.unitsString);
          return tHTML.loc(this.symStroke, tValueAndUnits.valueString, tUnitsSpan);
        } else {
          return tValueAndUnits.valueString + ' ' + tValueAndUnits.unitsString;
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
          this.notifyPropertyChange('showMeasureLabels');
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
            var tIsHorizontal = this.getPath('parentView.primaryAxisView.orientation') ===
                                DG.GraphTypes.EOrientation.kHorizontal,
                tValuesArray = this.getPath('model.values'),
                tNumValues = tValuesArray && tValuesArray.length,
                tCenterWorld = tValuesArray[iIndex][this.centerKey],
                tStat = tValuesArray[iIndex][this.statisticKey],
                tTitleString = this.titleString(tStat, tValuesArray[iIndex]),
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
          var tCoverAttributes = {stroke: this.hoverColor},
              tHoverAttributes = {'stroke-opacity': 1},
              tCoverElement = this.lineCovers[iIndex],
              tHoverElement = this.hoverElements[iIndex];
          tCoverElement.stop();
          tCoverElement.animate(tCoverAttributes, this.hoverDelay);
          tHoverElement.stop();
          tHoverElement.animate(tHoverAttributes, this.hoverDelay);
          if (this.get('showMeasureLabels')) {
            this.get('equationViews')[iIndex].set('highlighted', true);
          }
        },

        unHighlightOne: function (iIndex) {
          var tCoverAttributes = {stroke: DG.RenderingUtilities.kTransparent},
              tHoverAttributes = {'stroke-opacity': 0},
              tCoverElement = this.lineCovers[iIndex],
              tHoverElement = this.hoverElements[iIndex];
          tCoverElement.stop();
          tCoverElement.animate(tCoverAttributes, DG.PlotUtilities.kHighlightHideTime);
          tHoverElement.stop();
          tHoverElement.animate(tHoverAttributes, DG.PlotUtilities.kHighlightHideTime);
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
      hoverColor: "rgba(193, 0, 32, 0.3)",
      /** color of line when mouse over cover line */
      symStroke: '#C10020',
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
        return iCenterValue + iSpreadValue; // text going to the right of the shading
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
 * @class  Plots a computed Inter-Quartile Range (IQR), between the first and third quartiles (Q1 and Q3).
 * @extends DG.PlottedSimpleAverageAdornment
 */
DG.PlottedStErrAdornment = DG.PlottedSimpleAverageAdornment.extend(
   /** @scope DG.PlottedStErrAdornment.prototype */
   {
     statisticKey: 'sterr', /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
     centerKey: 'mean', /** {String} key to relevant center point in this.model.values[i][centerKey] */
     spreadKey: 'sterr', /** {String} key to relevant spread value in this.model.values[i][width] */
     titleResource: 'DG.PlottedAverageAdornment.stErrValueTitle', /** {String} resource string for this.titleString() */
     hoverColor: "rgba(246, 118, 142, 0.3)", /** color of line when mouse over cover line */
     bgStroke: '#FFb280',
     bgStrokeWidth: 0.5,
     bgFill: '#FFb280',
     symStroke: '#F6768E',
     offsetFromEdge: 10,
     tickLength: 6,
     modelPropertiesToObserve: [ ['numberOfStdErrs', 'updateToModel'] ],

     /**
      * Override so we can side effect plotted normal adornment
      * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
      */
     updateToModel: function (iAnimate) {
       sc_super();
       // If my plotView has a plottedNormalAdorn and gaussianFitEnabled, update it too
       var tPlottedNormalAdorn = this.getPath('parentView.plottedNormalAdorn'),
           tIsHistogram = this.getPath('model.plotModel.dotsAreFused');
       DG.get('gaussianFitEnabled') === 'yes' && tPlottedNormalAdorn && tIsHistogram &&
          tPlottedNormalAdorn.updateToModel();
     },

     getValueString: function (stdErr, titleResource) {
       var tPrecision = DG.PlotUtilities.findFractionDigitsForAxis(this.getPath('parentView.primaryAxisView')),
          tNumFormat = DG.Format.number().fractionDigits(0, tPrecision).group(''),
          tNumStdErrs = this.getPath('model.numberOfStdErrs'),
          tNumStdErrsString = tNumStdErrs === 1 ? '' : String(tNumStdErrs);
       return this.get('showMeasureLabels')
              ? titleResource.loc(tNumStdErrsString, '<sub style="vertical-align: sub">', '</sub>',
                  tNumFormat(tNumStdErrs * stdErr))
              : titleResource.loc(tNumStdErrsString, '', '', tNumFormat(tNumStdErrs * stdErr));
     },

     /**
      * Create the path string for the line going from mean - stErr to mean + stErr with 5 pixel end bars.
      * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
      * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
      */
     symbolPath: function (p, iIsHorizontal) {
       var tHorizontalY = p.y - p.cellHeight + this.offsetFromEdge,
           tVerticalX = p.x + p.cellHeight - this.offsetFromEdge,
           tWidth = this.getPath('model.numberOfStdErrs') * p.width;
       if (iIsHorizontal) {
         return 'M%@,%@ h%@ M%@,%@ v%@ M%@,%@ v%@'.fmt(
            p.x - tWidth, tHorizontalY, 2 * tWidth,  // horizontal line segment
            p.x - tWidth, tHorizontalY - this.tickLength / 2, this.tickLength, // left tick
            p.x + tWidth, tHorizontalY - this.tickLength / 2, this.tickLength // right tick
         ); // vertical line up on mean + stErr
       } else {
         return 'M%@,%@ v%@ M%@,%@ h%@ M%@,%@ h%@'.fmt(
            tVerticalX, p.y + tWidth, - 2 * tWidth,  // vertical line segment
            tVerticalX - this.tickLength / 2, p.y + tWidth, this.tickLength, // upper tick
            tVerticalX - this.tickLength / 2, p.y - tWidth, this.tickLength); // lower tick
       }
     },

     /**
      * Create the path string for the invisible popup cover region.
      * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
      * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
      */
     coverPath: function (p, iIsHorizontal) {
       return this.symbolPath(p, iIsHorizontal);
     },

     /**
      * Create the path string for any element we want to show on hover but not to trigger a hover.
      * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
      * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
      */
     hoverElementPath: function (p, iIsHorizontal) {
       var tWidth = this.getPath('model.numberOfStdErrs') * p.width;
       if (iIsHorizontal) {
         return 'M%@,%@ v%@ M%@,%@ v%@'.fmt(
            p.x - tWidth, 0, p.fullHeight,  // vertical line segment to axis
            p.x + tWidth, 0, p.fullHeight // vertical line segment to axis
         ); // vertical line up on mean + stErr
       } else {
         return 'M%@,%@ h%@ M%@,%@ h%@'.fmt(
            0, p.y + tWidth, p.fullHeight,  // horizontal line segment to axis
            0, p.y - tWidth, p.fullHeight // horizontal line segment to axis
          );
       }
     },

     /**
      * Get the desired axis position of the pop-up text, in the attribute's coordinates.
      * @param iCenterValue
      * @param iSpreadValue
      */
     getTextPositionOnAxis: function (iCenterValue, iSpreadValue) {
       return iCenterValue + iSpreadValue; // text going to the right of the bar
     }
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
 * @class  Plots a normal curve over the distribution.
 * For a dot plot view, the curve is based solely on the mean and standard deviation.
 * But for a histogram, the curve is a gaussian fit to the histogram.
 * @extends DG.PlottedSimpleAverageAdornment
 */
DG.PlottedNormalAdornment = DG.PlottedSimpleAverageAdornment.extend(
   /** @scope DG.PlottedNormalAdornment.prototype */
   {
     statisticKey: 'mean', /** {String} key to relevant statistic in this.model.values[i][statisticKey] */
     titleResource: 'DG.PlottedAverageAdornment.meanValueTitle', /** {String} resource string for this.titleString() */
     centerKey: 'mean', /** {String} key to relevant center point in this.model.values[i][centerKey] */
     spreadKey: 'stdev', /** {String} key to relevant spread value in this.model.values[i][width] */
     amplitudeKey: 'amplitude', /** {String} key to relevant amplitude value in this.model.values[i][amplitude] */
     hoverColor: "rgba(0, 125, 52,0.3)", /** color of line when mouse over cover line */
     bgStroke: '#FFb280',
     bgStrokeWidth: 0.5,
     // bgFill: '#FFb280',
     symStroke: '#007D34',
     symStrokeWidth: 1,
     offsetFromEdge: 10,

     /**
      * @returns {false|number} false if gaussian fit is not enabled, otherwise the number of standard errors
      */
     numStdErrors: function () {
       var tPlotModel = this.getPath('model.plotModel'),
           tStdErrorModel = tPlotModel.getAdornmentModel('plottedStErr'),
           tNumStdErrs = tStdErrorModel && tStdErrorModel.get('numberOfStdErrs');
       return DG.get('gaussianFitEnabled')==='yes' && tPlotModel.get('dotsAreFused') &&
              tStdErrorModel && tStdErrorModel.get('isVisible') && tNumStdErrs;
     },

     /**
      * @returns {false|number} false if gaussian fit is not enabled, otherwise the stadard error times the
      * number of standard errors
      */
     stdErrorValue: function (count, sd) {
       var tPlotModel = this.getPath('model.plotModel'),
           tStdErrorModel = tPlotModel.getAdornmentModel('plottedStErr'),
           tNumStdErrs = tStdErrorModel && tStdErrorModel.get('numberOfStdErrs'),
           tStdErrorValue = tNumStdErrs && tNumStdErrs * sd / Math.sqrt(count);
       return DG.get('gaussianFitEnabled')==='yes' && tPlotModel.get('dotsAreFused') &&
              tStdErrorModel && tStdErrorModel.get('isVisible') && tStdErrorValue;
     },

     /**
      * Create the path string for
      *   - the normal curve
      *   - the line from the peak to the axis
      *   - the line segment representing one standard deviation on each side of the mean
      * @param p {x,y,width,cellHeight} of reference point, (.x,.y)
      * @param iIsHorizontal {Boolean} true for horizontal orientation, false for vertical
      * @return {String} The path for the normal curve
      */
     symbolPath: function (p, iIsHorizontal) {

       function normal(x) {
         return DG.MathUtilities.normal(x, tAmplitude, tMu, tSigma);
       }

       function countToScreenCoordFromDotPlot (iCount) {
         var tStackCoord = (2 * tRadius - tOverlap) * iCount + 1;
         return iIsHorizontal ? p.y - tStackCoord : p.x + tStackCoord;
       }

         var sqrtTwoPi = Math.sqrt(2 * Math.PI),
          tParentPlotView = this.get('parentView'),
          tIsHistogram = this.getPath('model.plotModel.dotsAreFused'),
          tNumericAxisView = tParentPlotView.get('primaryAxisView'),
          tCountAxisView = tParentPlotView.get('secondaryAxisView'),
          tCountAxisFunc = tIsHistogram ? tCountAxisView.dataToCoordinate.bind(tCountAxisView)
                                        : countToScreenCoordFromDotPlot,
          tRadius = tParentPlotView.calcPointRadius(),
          tOverlap = tParentPlotView.get('overlap'),
          tBinWidth = tIsHistogram ? tParentPlotView.getPath('model.width')
                      : tParentPlotView.get('binWidthInWorldCoordinates'),
          tPixelMin = tNumericAxisView.get(iIsHorizontal ? 'pixelMin' : 'pixelMax'),
          tPixelMax = tNumericAxisView.get(iIsHorizontal ? 'pixelMax' : 'pixelMin'),
          tPath = '',
          tMeanSegment = '',
          tMeanSegmentPixelLength,
          tSDSegment = '',
          tSDSegmentPixelLength,
          tSESegment = '',
          tSESegmentPixelLength,
          tCount = p.count,
          tMu = p.center,
          tSigma = p.spread,
          tAmplitude = p.amplitude || (1 / (tSigma * sqrtTwoPi) * tCount * tBinWidth),
          tStdErrorValue = this.stdErrorValue( tCount, tSigma),
          tNumeric, tCountValue, tPixelCount,
          tPoints = [],
          kPixelGap = 1,
          tPixelNumeric, tPoint;
       for( tPixelNumeric = tPixelMin; tPixelNumeric <= tPixelMax; tPixelNumeric += kPixelGap) {
         tNumeric = tNumericAxisView.coordinateToData( tPixelNumeric);
         tCountValue = normal( tNumeric);
         if( DG.isFinite( tCountValue)) {
           tPixelCount = tCountAxisFunc( tCountValue);
           tPoint = iIsHorizontal ? {left: tPixelNumeric, top: tPixelCount} : {left: tPixelCount, top: tPixelNumeric};
           tPoints.push( tPoint);
         }
       }
       if( tPoints.length > 0) {
         // Accomplish spline interpolation
         tPath = 'M' + tPoints[0].left + ',' + tPoints[0].top + DG.SvgScene.curveBasis( tPoints);
       }
       tMeanSegmentPixelLength = tCountAxisFunc(normal(tMu)) - tCountAxisFunc(0);
       tMeanSegment = iIsHorizontal ? 'M%@,%@ v%@'.fmt( tNumericAxisView.dataToCoordinate(tMu),
          tCountAxisFunc(0), tMeanSegmentPixelLength) :
          'M%@,%@ h%@'.fmt( tCountAxisFunc(0), tNumericAxisView.dataToCoordinate(tMu),
             tMeanSegmentPixelLength);
       tSDSegmentPixelLength = tNumericAxisView.dataToCoordinate(tMu + tSigma) -
                               tNumericAxisView.dataToCoordinate(tMu - tSigma);
       tSDSegment = iIsHorizontal ? ' M%@,%@ h%@'.fmt( tNumericAxisView.dataToCoordinate(tMu - tSigma),
            tCountAxisFunc(normal(tMu - tSigma)), tSDSegmentPixelLength) :
            ' M%@,%@ v%@'.fmt( tCountAxisFunc(normal(tMu - tSigma)),
               tNumericAxisView.dataToCoordinate(tMu - tSigma), tSDSegmentPixelLength);
        if (tStdErrorValue) {
          tSESegmentPixelLength = tNumericAxisView.dataToCoordinate(tMu + tStdErrorValue) -
                                  tNumericAxisView.dataToCoordinate(tMu - tStdErrorValue);
          tSESegment = iIsHorizontal ? ' M%@,%@ h%@'.fmt( tNumericAxisView.dataToCoordinate(tMu - tStdErrorValue),
                tCountAxisFunc(normal(tMu - tStdErrorValue)), tSESegmentPixelLength) :
                ' M%@,%@ v%@'.fmt( tCountAxisFunc(normal(tMu - tStdErrorValue)),
                   tNumericAxisView.dataToCoordinate(tMu - tStdErrorValue), tSESegmentPixelLength);
        }
       return tPath + tMeanSegment + tSDSegment + tSESegment;
     },

     /**
      * Create the path string for the invisible popup cover region.
      * @param p {x,y,width,cellHeight} of reference point, (.x,.y) is Q1, .width is IQR in pixels.
      * @param iIsHorizontal {Boolean} true for horizontal orientation, false for vertical
      * @return {String} M:move-to absolute: v:vertical-line-to relative: h:horizontal-line-to
      */
     coverPath: function (p, iIsHorizontal) {
       return this.symbolPath(p, iIsHorizontal);
     },

     /**
      * Return a string to be displayed to user to show numeric value with rounding and units
      * @returns {{valueString:string, unitsString:string}}
      * @param count
      * @param stdDev
      * @param numStdErrors
      * @param titleResource
      */
     standardErrorAndUnitsStrings: function (count, stdDev, numStdErrors, titleResource, useSubscript) {
       var tNumStdErrorsString = numStdErrors === 1 ? '' : String(numStdErrors),
           tStdError = stdDev / Math.sqrt(count),
           tUnits = this.getPath('parentView.primaryAxisView.model.firstAttributeUnit'),
           tPrecision = DG.PlotUtilities.findFractionDigitsForAxis(this.getPath('parentView.primaryAxisView')),
           tNumFormat = DG.Format.number().fractionDigits(0, tPrecision).group(''),
           tStdErrorsFormatted = tNumFormat(numStdErrors * tStdError),
           tValueString = useSubscript
              ? titleResource.loc(tNumStdErrorsString, '<sub style="vertical-align: sub">', '</sub>', tStdErrorsFormatted)
              : titleResource.loc(tNumStdErrorsString, '', '', tStdErrorsFormatted);
       return {valueString: tValueString, unitsString: tUnits};
     },

     /**
      * @return {String} title string to show when hovering over curve
      */
     titleString: function (mean, valueObject) {
       var kGaussianFitEnabled = DG.get('gaussianFitEnabled')==='yes',
          tIsHistogram = this.getPath('model.plotModel.dotsAreFused'),
          tShowMeasureLabels = this.get('showMeasureLabels'),
          tPrefix = kGaussianFitEnabled && tIsHistogram ? "DG.Inspector.graphPlottedGaussianFit".loc() : "",
          tStdev = typeof valueObject === 'object' ? valueObject.stdev : valueObject,
          tMeanValueAndUnits = this.valueAndUnitsStrings(mean, this.titleResource),
          tStdevValueAndUnits = this.valueAndUnitsStrings(tStdev,
              'DG.PlottedAverageAdornment.stDevValueTitle'),
          tStdErrValue = this.stdErrorValue(valueObject.count, valueObject.stdev);
      var tStdErrValueAndUnits = tStdErrValue
                                 ? this.standardErrorAndUnitsStrings(valueObject.count, valueObject.stdev,
                                    this.numStdErrors(), 'DG.PlottedAverageAdornment.stErrValueTitle',
                                    tShowMeasureLabels)
                                 : { valueString: '', unitsString: ''};
       if (!tMeanValueAndUnits.valueString)
         return '';
       if (tShowMeasureLabels) {
         tPrefix = '<p style="text-decoration-line: underline">' + tPrefix + '</p>';
         var tHTML = '<div style = "color:%@;">%@</div>',
            tUnitsSpan = '<span style = "color:grey;">%@</span>'.loc(tMeanValueAndUnits.unitsString),
            tMeanHtmlString = '<p>%@ %@</p>'.loc(tMeanValueAndUnits.valueString, tUnitsSpan),
            tSDHtmlString = '<p>%@ %@</p>'.loc(tStdevValueAndUnits.valueString, tUnitsSpan),
            tStdErrHtmlString = tStdErrValue
                                ? ('<p>%@ %@</p>'.loc(tStdErrValueAndUnits.valueString, tUnitsSpan))
                                : '';
         return tHTML.loc(this.symStroke, tPrefix + tMeanHtmlString + tSDHtmlString + tStdErrHtmlString, tUnitsSpan);
       } else {
         if (kGaussianFitEnabled)
            tPrefix = tPrefix + ': ';
         return tPrefix + tMeanValueAndUnits.valueString + ' ' + tMeanValueAndUnits.unitsString + ', ' +
                tStdevValueAndUnits.valueString + ' ' + tStdevValueAndUnits.unitsString +
                (tStdErrValue ? ', ' + tStdErrValueAndUnits.valueString + ' ' +
                tStdErrValueAndUnits.unitsString : '');
       }
     },

     /**
      * Get the desired axis position of the pop-up text, in the attribute's coordinates.
      * @param iCenterValue
      * @param iSpreadValue
      */
     getTextPositionOnAxis: function (iCenterValue, iSpreadValue) {
       return iCenterValue + iSpreadValue; // text going to the right of the bar
     }
   });


