// ==========================================================================
//                   DG.ConnectingLineAdornment
//
//  Connecting lines between points, intended for use between points on
//  a scatterplot.  Can easily be extended or repurposed for other
//  plot types.
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

/**
 * @class  Abstract base class for plot adornments that draw averages (mean, median) as symbols in the plot.
 * @extends DG.PlotAdornment
 */
DG.ConnectingLineAdornment = DG.PlotAdornment.extend(
    /** @scope DG.ConnectingLineAdornment.prototype */
    {
      /**
       * @property {Number}
       */
      unselectedLineWidth: 2,

      /**
       * @property {Number}
       */
      selectedLineWidth: 4,

      _dataTip: null,     // {DG.LineDataTip}
      dataTip: function () {
        if (!this._dataTip) {
          var tPlotView = this.get('parentView');
          DG.assert(tPlotView);
          this._dataTip = DG.LineDataTip.create({
            paperSource: this.get('paperSource'),
            plotView: tPlotView, layerName: DG.LayerNames.kDataTip
          });
        }
        return this._dataTip;
      }.property(),

      init: function () {
        sc_super();
        this.myElements = [];
      },

      /** do we want the line(s) to be visible and up to date? Yes if our model 'isVisible' */
      wantVisible: function () {
        return this.getPath('model.isVisible');
      },

      /**
       * Tell our model that it is out of date.
       */
      invalidateModel: function () {
        var tModel = this.get('model');
        if (tModel) {
          tModel.setComputingNeeded();
        }
      },


      /**
       * Recompute our model if needed, then move symbols to location specified by model.
       * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
       */
      updateToModel: function (iAnimate) {
        var tModel = this.get('model');
        if (SC.none(tModel))
          return;

        // only recompute and update line if visible, this.updateVisibility() handles everything else
        if (tModel.get('isVisible')) {
          tModel.recomputeValueIfNeeded();
          this.updateLine(iAnimate);
        } else
          this.hideLines();
      },

      /**
       My model's visibility has changed.
       */
      updateVisibility: function () {
        this.updateToModel(true /*animate*/);
      },

      hideLines: function () {
        var tNumElements = this.myElements.length,
            tLayer = this.get('layer');
        for (var i = 0; i < tNumElements; i++) {
          this.myElements[i].animate({'stroke-opacity': 0}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
              function () {
                tLayer.prepareToMoveOrRemove(this);
                this.remove();
              });
        }
        this.myElements.length = 0;
      },

      /**
       * Called when our entire layer is being hidden. Don't delete the elements. Just hide them.
       */
      hide: function () {
        this.get('myElements').forEach(function (iElement) {
          iElement.animate({'stroke-opacity': 0}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
              function () {
                this.hide();
              });
        });
      },

      /**
       * Called when our entire layer is being shown after being hidden. Just show the elements.
       */
      show: function () {
        if (this.getPath('model.isVisible')) {
          this.get('myElements').forEach(function (iElement) {
            iElement.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>',
                function () {
                  this.show();
                });
          });
        }
      },

      /**
       * Create or update our lines, one for each parent present.
       * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
       */
      updateLine: function (iAnimate) {
        var tXAxisView = this.getPath('parentView.xAxisView'),
            tYAxisView = this.getPath('parentView.yAxisView');

        function getCoords(iX, iY) {
          return {
            x: tXAxisView.dataToCoordinate(iX),
            y: tYAxisView.dataToCoordinate(iY)
          };
        }

        if (tXAxisView && tYAxisView)
          this.doUpdateLine(iAnimate, getCoords);
      },

      /**
       * Create or update our lines, one for each parent present.
       * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
       */
      doUpdateLine: function (iAnimate, getCoordsFunc) {
        var kEmptyPath = 'M0,0',
            this_ = this,
            tCoordinatesKeyedByParentID = this.getPath('model.values'),
            kCount = 10,  // This is fixed so we get same colors no matter how many lines there are
            tPaper = this.get('paper'),
            tLayer = this.get('layer'),
            tNumLines = DG.ObjectMap.length(tCoordinatesKeyedByParentID),
            tLineNum = 0;

        if (!tPaper) {
          return;
        }
        if (!tCoordinatesKeyedByParentID)
          return; // Can happen in scatterplot that has multiple attributes

        DG.ObjectMap.forEach(tCoordinatesKeyedByParentID, function (iParentID, iCoordinatesObject) {
          var tCoordinates = iCoordinatesObject.coordinates,
              tNumValues = tCoordinates ? tCoordinates.length : 0,
              tPath = kEmptyPath, // use empty path if no points to connect
              tLineColor = iCoordinatesObject.color ?
                  (typeof iCoordinatesObject.color === 'string' ? iCoordinatesObject.color : iCoordinatesObject.color.colorString) :
                  DG.ColorUtilities.calcAttributeColorFromIndex(tLineNum % kCount, kCount),
              i,
              tLine;
          tLineColor = tLineColor.colorString || tLineColor;
          // create a new path, connecting each sorted data point
          for (i = 0; i < tNumValues; ++i) {
            var tCoords = getCoordsFunc(tCoordinates[i].x, tCoordinates[i].y);
            if (tCoords.x && tCoords.y) {
              if (tPath === kEmptyPath) {
                tPath = 'M%@,%@'.fmt(tCoords.x, tCoords.y); // move to first line
              } else {
                tPath += ' L%@,%@'.fmt(tCoords.x, tCoords.y); // draw to subsequent lines
              }
            }
          }
          DG.assert(tPath);

          tLine = this_.myElements[tLineNum];
          if (!tLine) {
            // create the line
            tLine = tPaper.path('')
                .attr({'stroke-opacity': 0, cursor: 'pointer'})
                .mousedown(function (iEvent) {
                  this_.get('model').selectParent(this.parentCaseID, iEvent.shiftKey);
                })
                .hover(
                    // over
                    function (iEvent) {
                      this_.showDataTip(iEvent, iParentID);
                    },
                    // out
                    function () {
                      this_.hideDataTip();
                    });
            this_.myElements.push(tLine);
            tLayer.push(tLine);
          }
          tLine.parentCaseID = iParentID;
          tLine.attr({path: tPath, stroke: tLineColor});
          if (iAnimate)
            tLine.animate({'stroke-opacity': 1}, DG.PlotUtilities.kDefaultAnimationTime, '<>');
          else
            tLine.attr({'stroke-opacity': 1});
          tLineNum++;
        });

        while (this.myElements.length > tNumLines) {
          var tLast = this.myElements.pop();
          tLayer.prepareToMoveOrRemove(tLast);
          tLast.remove();
        }
        this.updateSelection();
      },

      /**
       * If all cases for a given line are selected, we use a thick line, otherwise a thin line.
       */
      updateSelection: function () {
        if (!this.get('paper'))
          return;
        // TODO: Encapsulate access to selection in plotModel.
        var tArrayOfCoordinatesArrays = DG.ObjectMap.values(this.getPath('model.values')) || [], // In certain situations 'model.values' can be null
            tSelection = this.getPath('model.plotModel.selection');
        tArrayOfCoordinatesArrays.forEach(function (iObject, iLineNum) {
          var
              tCoordinates = iObject.coordinates,
              tNumValues = tCoordinates ? tCoordinates.length : 0,
              tAllSelected = true,
              tLine = this.myElements[iLineNum],
              i;
          if (tLine) {
            for (i = 0; i < tNumValues; ++i) {
              tAllSelected = tAllSelected && tSelection.indexOf(tCoordinates[i].theCase) >= 0;
              if (!tAllSelected)
                break;
            }
            tLine.attr({'stroke-width': (tAllSelected ? this.selectedLineWidth : this.unselectedLineWidth)});
          }
        }.bind(this));
      },

      showDataTip: function (iEvent, iParentID) {
        var tDataTip = this.get('dataTip');
        var tContext = this.getPath('model.plotModel.dataContext'),
            tParent = tContext && tContext.getCaseByID(iParentID),
            tGroupingAttribute = this.getPath('model.parentCollectionFirstAttribute');
        if (SC.none(tParent))
          return;

        var tGroupingAttributeName = tGroupingAttribute.get('name'),
            tGroupingValue = tParent.getValue(tGroupingAttribute.get('id')),
            tChildren = tParent.get('children').flatten(),
            tNumChildren = SC.isArray(tChildren) ? tChildren.get('length') : 0,
            tChildrenName = (tNumChildren > 0) ? tChildren[0].getPath('collection.name') : '';
        tDataTip.show(
            {
              groupingAttributeValue: tGroupingValue,
              groupingAttributeName: tGroupingAttributeName,
              numChildren: tNumChildren,
              childrenName: tChildrenName
            },
            {x: iEvent.offsetX - 5, y: iEvent.offsetY - 5});
      },

      hideDataTip: function () {
        this.get('dataTip').hide();
      }

    });


