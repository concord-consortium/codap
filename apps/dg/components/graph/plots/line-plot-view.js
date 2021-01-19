// ==========================================================================
//                          DG.LinePlotView
//
//  Author:   Kirk Swenson
//
//  Copyright (c) 2020 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/plots/dot_plot_view');

/** @class  DG.LinePlotView - A line/bar for each case

  @extends DG.DotPlotView
*/
DG.LinePlotView = DG.DotPlotView.extend(
/** @scope DG.LinePlotView.prototype */
{
  /**
   * Expected type of plotted elements
   */
  plottedElementType: 'rect',

  /**
   * Array of { caseCount: number, indexMap: { caseIndexInCollection: caseIndexInCell } } per cell
   */
  cellCaseInfo: null,

  /**
   * Max number of cases in a cell
   */
  maxCaseCountInCell: 0,

  /**
   * Configure axes
   */
  setupAxes: function () {
    sc_super();

    this.setPath('primaryAxisView.model.preferZeroLowerBound', true);
    this.setPath('primaryAxisView.model.drawZeroLine', true);

    this.setPath('secondaryAxisView.centering', true);

    var model = this.get('model');
    model && model.rescaleAxesFromData(true);
  },

  /**
   * Update the cell counts.
   */
  updateCellCaseInfo: function() {
    var categoryAxisModel = this.getPath('secondaryAxisView.model');
    if (!categoryAxisModel) return;
    var cellCount = categoryAxisModel.get('numberOfCells'),
        cellCaseInfo = new Array(cellCount),
        maxCaseCountInCell = 0;
    for (var i = 0; i < cellCount; ++i) {
      // map from index in collection to index in cell
      cellCaseInfo[i] = {
        caseCount: 0,
        indexMap: {}
      };
    }
    var tCases = this.getPath('model.cases'),
        tCategoryVarID = this.getPath('model.secondaryVarID');
    if (tCases) {
      tCases.forEach(function(iCase, iCaseIndex) {
        var cellIndex = categoryAxisModel.cellNameToCellNumber(iCase.getStrValue(tCategoryVarID));
        if (cellIndex >= 0) {
          var cellInfo = cellCaseInfo[cellIndex];
          if (cellInfo) {
            cellInfo.indexMap[iCaseIndex] = cellInfo.caseCount;
            if (++cellInfo.caseCount > maxCaseCountInCell)
              maxCaseCountInCell = cellInfo.caseCount;
          }
        }
      });
    }
    this.set('cellCaseInfo', cellCaseInfo);
    this.set('maxCaseCountInCell', maxCaseCountInCell);
  },

  /**
    Before we recompute coordinates, we need to compute the cell counts.
   */
  prepareToResetCoordinates: function() {
    sc_super();
    this.updateCellCaseInfo();
  },

  /**
   * @param iCase
   * @param iIndex
   * @param iAnimate
   */
  createElement: function (iCase, iIndex, iAnimate) {
    // Can't create rects if we don't have paper for them
    if (!this.get('paper')) return;

    var tRect = this.get('paper').rect(-1000, -1000, 0, 0)
        .attr({
          fill: DG.PlotUtilities.kDefaultPointColor,
          stroke: 'none'
        });
    tRect.node.setAttribute('shape-rendering', 'geometric-precision');
    /*
            if (iAnimate)
              DG.PlotUtilities.doCreateRectAnimation(tRect);
    */
    return tRect;
  },

  /**
    For use in transferring current element positions of this plot to a new plot about
    to take its place.
    @return {[{cx:{Number}, cy:{Number}, r: {Number}, fill: {String} ]}
  */
  getElementPositionsInParentFrame: function() {
    var tFrame = this.get('frame'),
        tPlottedElements = this.get('plottedElements');
    DG.assert(tPlottedElements.length === 0 || tPlottedElements[0][0].constructor === SVGRectElement,
              'Expecting rectangle');
    return tPlottedElements.map( function( iElement) {
        var tX = iElement.attr('x') + tFrame.x,
            tY = iElement.attr('y') + tFrame.y,
            tWidth = iElement.isHidden() ? 0 : iElement.attr('width'),    // use 0 for hidden plot element
            tHeight = iElement.isHidden() ? 0 : iElement.attr('height');  // use 0 for hidden plot element
            return {
              x: tX,
              y: tY,
              width: tWidth,
              height: tHeight,
              fill: iElement.attr('fill'),
              stroke: iElement.attr('stroke'),
              type: 'rect',
              isNegativeBar: iElement._isNegativeBar};
      });
  },

  /**
   * Called from animateFromTransferredElements to create animatable elements.
   * @param {DG.Case} iCase
   * @param {number} iIndex
   * @param {Object} iOldEltAttrs
   */
  createAnimatingElement: function(iCase, iIndex, iOldEltAttrs) {
    var tOldElementIsCircle = iOldEltAttrs && iOldEltAttrs.type === 'circle',
        tElement = this.callCreateElement(iCase, iIndex, false),
        attrs = iOldEltAttrs && {
          r: tOldElementIsCircle ? iOldEltAttrs.r : 0,
          x: tOldElementIsCircle ? iOldEltAttrs.cx - iOldEltAttrs.r : iOldEltAttrs.x,
          y: tOldElementIsCircle ? iOldEltAttrs.cy - iOldEltAttrs.r : iOldEltAttrs.y,
          width: tOldElementIsCircle ? 2 * iOldEltAttrs.r : iOldEltAttrs.width,
          height: tOldElementIsCircle ? 2 * iOldEltAttrs.r : iOldEltAttrs.height,
          fill: iOldEltAttrs.fill,
          stroke: iOldEltAttrs.stroke
        };
    attrs && tElement.attr(attrs);
    return tElement;
  },

  /**
   * Set the coordinates and other attributes of the case rectangle (a Rafael element in this.get('plottedElements')).
   * @param {{}} iRC case-invariant Render Context
   * @param {DG.Case} iCase the case data
   * @param {number} iIndex index of case in collection
   * @param {Boolean} iAnimate (optional) want changes to be animated into place?
   * @param {function} iCallback
   * @returns {{cx:{Number},cy:{Number}}} final coordinates or null if not defined (hidden plot element)
   */
  setCircleCoordinate: function( iRC, iCase, iIndex, iAnimate, iCallback ) {
    var tPlottedElements = this.get('plottedElements');
    DG.assert( iCase, 'There must be a case' );
    DG.assert( DG.MathUtilities.isInIntegerRange( iIndex, 0, tPlottedElements.length ),
        'index %@ out of bounds for plottedElements of length %@'.loc(iIndex, tPlottedElements.length));
    var tRect = tPlottedElements[iIndex],
        tWorld = iCase.getForcedNumericValue(iRC.primaryVarID),
        tScreenCoord = iRC.primaryAxisView.dataToCoordinate(tWorld),
        tZeroCoord = iRC.primaryAxisView.dataToCoordinate(0),
        tIsMissingCase = !DG.isFinite(tScreenCoord) || (iRC.primaryAxisPlace === DG.GraphTypes.EPlace.eUndefined);
    // For animation purposes, record whether the bar is negative
    tRect._isNegativeBar = tWorld < 0;
    // show or hide if needed, then update if shown.
    if( this.showHidePlottedElement(tRect, tIsMissingCase, iIndex) && iRC.categoryAxisModel) {

      var tCellNumber = iRC.categoryAxisModel.cellNameToCellNumber(iCase.getStrValue(iRC.categoryVarID )),
          tMaxCaseCountInCell = this.get('maxCaseCountInCell'),
          tCellCaseInfo = this.get('cellCaseInfo')[tCellNumber],
          tIndexInCell = tCellCaseInfo ? tCellCaseInfo.indexMap[iIndex] : 0,
          tCasesInCell = tCellCaseInfo ? tCellCaseInfo.caseCount : 0,
          tCellCoord = SC.none(tCellNumber) ? 0 : iRC.categoryAxisView.cellToCoordinate(tCellNumber),
          tCellWidth = iRC.categoryAxisView.get('fullCellWidth'),
          tCellStart = tCellCoord - tCellWidth / 2,
          tBarWidth = tCellWidth / (tMaxCaseCountInCell + 1), // +1 for half bar-width padding on either side
          tCellPadding = (tMaxCaseCountInCell - tCasesInCell) * tBarWidth / 2,
          tCoordX, tCoordY, tWidth, tHeight;

      // Express coordinates in terms of x and y
      switch(iRC.primaryAxisPlace) {
        case DG.GraphTypes.EPlace.eX:
          tCoordX = tWorld < 0 ? tScreenCoord : tZeroCoord;
          tCoordY = tCellStart + tCellWidth - (tCellPadding + (tIndexInCell + 1.5) * tBarWidth);
          tWidth = Math.abs(tScreenCoord - tZeroCoord);
          tHeight = tBarWidth;
          break;
        case DG.GraphTypes.EPlace.eY:
          tCoordX = tCellStart + tCellPadding + (tIndexInCell + 0.5) * tBarWidth;
          tCoordY = tWorld < 0 ? tZeroCoord : tScreenCoord;
          tWidth = tBarWidth;
          tHeight = Math.abs(tScreenCoord - tZeroCoord);
          break;
      }

      var tAttrs = {x: tCoordX, y: tCoordY, width: tWidth, height: tHeight, r: 0.1,
                    fill: iRC.calcCaseColorString( iCase ),
                    stroke: iRC.calcStrokeColorString( iCase), 'fill-opacity': iRC.transparency, 'stroke-opacity': iRC.strokeTransparency};
      this.updatePlottedElement( tRect, tAttrs, iAnimate, iCallback);
      return { x: tCoordX, y: tCoordY, width: tWidth, height: tHeight };
    }
    return null;
  },

  showDataTip: function (iElement, iIndex, event) {
    if (DG.NO_DATA_TIP_PREF || this.getPath('paperSource.tempDisallowDataTips'))
      return;
    this.get('dataTip').show(event.offsetX, event.offsetY, 8, iIndex);
  },

  assignElementAttributes: function( iElement, iIndex, iAnimate) {
    var this_ = this,
        kOpaque = 1;

    // duplicated from DG.PlotLayer
    // Remove event handlers
    if (iElement.events) {
      iElement.events.forEach(function (iHandler) {
        iHandler.unbind();
      });
      iElement.events.length = 0;
    }
    iElement.addClass(DG.PlotUtilities.kColoredDotClassName)
        .attr({cursor: 'pointer'})
        .mousedown(function (iEvent) {
          SC.run(function () {
            this_.get('model').selectCaseByIndex(iIndex, iEvent.shiftKey);
          });
        });
    iElement.index = iIndex;

    iElement.hover(
      function (event) {  // over
        this.animate({
          opacity: kOpaque,
        }, DG.PlotUtilities.kHighlightHideTime);
        this_.showDataTip(this, iIndex, event);
      },
      function (event) { // out
        this.stop();
        this.animate({
          opacity: DG.PlotUtilities.kDefaultPointOpacity,
        }, DG.PlotUtilities.kHighlightHideTime);
        this_.hideDataTip();
      });
    return iElement;
  }

});
