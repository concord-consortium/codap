// ==========================================================================
//                            DG.CellAxisView
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

sc_require('components/graph/axes/axis_view');

/** @class  DG.CellAxisView - The view for a graph axis that displays cells.

 @extends DG.AxisView
 */
DG.CellAxisView = DG.AxisView.extend( (function() {
  var kTickLength = 4,
      kAxisGap = 2;

  return {
    /** @scope DG.CellAxisView.prototype */

    displayProperties: ['centering'],

    /**
     Number of pixels required from the axis line to the edge of the graph view
     @property { Number }
     */
    desiredExtent: function() {
      var tExtent = sc_super(),
          kWidthFudge = 5;
      if( !this.get('isNumeric')) { // Not yet handling numeric axis broken up by cells
        tExtent += kTickLength + kAxisGap + kWidthFudge + this.get('maxLabelExtent');
      }
      return tExtent;
    }.property('maxLabelExtent'),

    /**
     * When we are the "other" axis, our partner needs to know how much to offset pixelMin.
     * For me, it's the same as desiredExtent
     * @property {Number}
     */
    pixelMinOffset: function() {
      return this.get('desiredExtent');
    }.property('desiredExtent'),

    /**
     I'm not supposed to work with numbers.
     @property { Boolean }
     */
    isNumeric: false,

    /**
     * @property {Boolean}
     */
    centering: false,

    /**
     * @property { Object { cellBeingDragged: {Integer}, position: {Number}}}
     */
    dragInfo: null,

    /**
     @property {Number} Each time we draw the axis, we set this property to the maximum width
     of the label strings. Note that this will change depending not only on the length of the
     strings but on the rotation of the labels.
     */
    maxLabelExtent: 0,

    /**
     The convention is that, unlike continuous axes, for a
     vertical axis, the low numbers are at the top.
     @param {Number} in screen coordinates
     @return {Number} the cell number corresponding to the given screen coordinate
     */
    whichCell: function( iCoord) {
      var tNumCells = this.getPath('model.numberOfCells'),
          tCell = 0;
      if( tNumCells > 1) {
        var tPixelMin = this.get('pixelMin'),
            tPixelMax = this.get('pixelMax');
        // In order to do the computation, we have to adjust for the coordinates of the ends
        // of the axes, knowing the thePixel is in plot view coordinates, not axis view coordinates.
        if( this.get('isVertical')) {
          iCoord = Math.min( Math.max( tPixelMax + 1, iCoord), tPixelMin - 1);
          tCell = Math.floor( (tPixelMin - iCoord) * tNumCells / ( tPixelMin - tPixelMax));
        }
        else {  // horizontal
          iCoord = Math.max( Math.min( tPixelMax - tPixelMin - 1, iCoord), 1.0);
          tCell = Math.floor( iCoord * tNumCells / ( tPixelMax - tPixelMin));
        }

        //      KCP_ASSERT( (tCell >= 0) && (tCell < tNumCells));
      }
      return tCell;
    },

    /**
     Override base class to account for drag in progress
     @return {Number} coordinate of the given cell.
     */
    cellToCoordinate: function (iCellNum, iIgnoreDragging) {
      var tDragInfo = this.get('dragInfo');
      if( !iIgnoreDragging && tDragInfo && tDragInfo.draggingInProgress && iCellNum === tDragInfo.cellBeingDragged) {
        return tDragInfo.position;
      }
      else {
        return sc_super();
      }
    },

    /**
     Since I'm a leaf class I implement doDraw.
     */
    doDraw: function doDraw() {

      // We can get stuck if we have height or width of zero
      var tFrame = this.get('frame');
      if( !tFrame || (tFrame.height === 0 || tFrame.width === 0))
        return;

      var this_ = this,
          kHorizontalOrientations = [DG.GraphTypes.EOrientation.kHorizontal, DG.GraphTypes.EOrientation.kTop],
          tModel = this.get('model'),
          tNumCells = tModel.get('numberOfCells'),
          tBaseline = this_.get('axisLineCoordinate'),
          tOrientation = this.get('orientation'),
          tIsHorizontal = kHorizontalOrientations.indexOf( tOrientation) >= 0,
          tRotation = tIsHorizontal ? 0 : -90, // default to parallel to axis
          tCursorClass = tIsHorizontal ? 'dg-axis-cell-label-x' : 'dg-axis-cell-label-y',
          tMaxHeight = DG.RenderingUtilities.kDefaultFontHeight,  // So there will be a default extent
          tCentering = this.get('centering'),
          tTickOffset = tCentering ? 0 : this.get('fullCellWidth') / 2,
          tAnchor = tCentering ? 'middle' : 'start',
          tMaxWidth = tMaxHeight,
          tLabelSpecs = this.get('labelSpecs') || [],
          tCollision = false,
          tPrevLabelEnd,
          tDragStartCoord, tCellBeingDragged, tOriginalCellIndex, tStartingCellnames; // eslint-disable-line no-unused-vars

      var beginDrag = function ( iWindowX, iWindowY) {
            tStartingCellnames = this_.getPath('model.cellNames');
            tOriginalCellIndex = tCellBeingDragged = this.cellNum;
            tDragStartCoord = DG.ViewUtilities.windowToViewCoordinates({x: iWindowX, y: iWindowY}, this_);
            tDragStartCoord = tIsHorizontal ? tDragStartCoord.x : tDragStartCoord.y;
          },
          doDrag = function (iDeltaX, iDeltaY, iWindowX, iWindowY) {
            var tModel = this_.get('model'),
                tCurrentCoord = tDragStartCoord + (tIsHorizontal ? iDeltaX : iDeltaY),
                tCategoryInCurrentCell = this_.whichCell( tCurrentCoord);
            // Todo Touch is currently returning NaN for window coordinates. Fix this
            if( isNaN(tCurrentCoord))
                return;
            SC.run(function() {
              if( tCategoryInCurrentCell !== tCellBeingDragged) {
                tCellBeingDragged = tModel.underlyingIndexToDisplayedIndex(
                    swapCategories(tModel.get('attributeDescription'),
                        tModel.displayedCellIndexToUnderlyingIndex(tCategoryInCurrentCell),
                        tModel.displayedCellIndexToUnderlyingIndex(tCellBeingDragged)));
              }
              this_.set('dragInfo', {
                cellBeingDragged: tCellBeingDragged, position: tCurrentCoord,
                draggingInProgress: true
              });
              this_.displayDidChange();
              this_.propertyDidChange('categoriesDragged');
            });
          },
          endDrag = function ( iEvent) {
            SC.run(function() {
              this_.set('dragInfo', null);
              this_.displayDidChange();
              this_.propertyDidChange('categoriesDragged');
              this_.updateLayerIfNeeded();
            });
            if( tOriginalCellIndex !== tCellBeingDragged) {
              var tCat1 = tStartingCellnames[tOriginalCellIndex],
                  tCat2 = tStartingCellnames[tCellBeingDragged];
              DG.UndoHistory.execute(DG.Command.create({
                name: 'swapCategories',
                undoString: 'DG.Undo.graph.swapCategories',
                redoString: 'DG.Redo.graph.swapCategories',
                log: 'Moved category %@ into position of %@'.fmt(tCat1, tCat2),
                _initialCell: tOriginalCellIndex,
                _finalCell: tCellBeingDragged,
                _axisModel: this_.get('model'),
                executeNotification: {
                  action: 'notify',
                  resource: 'component',
                  values: {
                    operation: 'swap categories',
                    type: 'DG.GraphView'
                  }
                },
                execute: function () {
                },
                undo: function () {
                  swapCategories( this._axisModel.get('attributeDescription'),
                      this._initialCell, this._finalCell);
                  var temp = this._initialCell;
                  this._initialCell = this._finalCell;
                  this._finalCell = temp;
                },
                redo: function () {
                  this.undo();
                }
              }));
            }
          },
          swapCategories = function( iAttributeDescription, iCat1, iCat2) {
            var tSign = Math.sign(iCat1 - iCat2),
                tCellToSwap = iCat2 + tSign;
            // Insist on pairwise swaps until we get one beyond iCat1
            while (tCellToSwap !== iCat1 + tSign) {
              DG.PlotUtilities.swapCategoriesByIndex(iAttributeDescription, iCat2, tCellToSwap);
              tCellToSwap += tSign;
              iCat2 += tSign;
            }
            return iCat2;
          };

      function setLimitToNumCellsToDraw() {
        var tDrawingSpace = Math.abs(this_.get('pixelMax') - this_.get('pixelMin')),
            tLimit = Math.floor(tDrawingSpace / DG.RenderingUtilities.kDefaultFontHeight);
        this_.setPathIfChanged('model.attributeDescription.number_of_categories_limit', tLimit);
      }

      function measureOneCell( iCellNum, iCellName) {
        var tCoord = this_.cellToCoordinate(iCellNum);
        if( !isFinite( tCoord)) {
          return;
        }
        var tTextElement;
        if( !tLabelSpecs[iCellNum]) {
          tTextElement = this_.get('paper').text(0, 0, iCellName)
              .addClass('dg-axis-tick-label')
              .addClass(tCursorClass)
              .drag(doDrag, beginDrag, endDrag);
        }
        else {
          tTextElement = tLabelSpecs[ iCellNum].element;
          tTextElement.attr('text', iCellName);
        }
        var tTextExtent = DG.RenderingUtilities.getExtentForTextElement(
                          tTextElement, DG.RenderingUtilities.kDefaultFontHeight, true /* compute with no transform */);

        tTextElement.cellNum = iCellNum;
        tLabelSpecs[iCellNum] = { element: tTextElement, coord: tCoord,
                      height: tTextExtent.height, width: tTextExtent.width };

        tMaxHeight = Math.max( tMaxHeight, tTextExtent.height);
        tMaxWidth = Math.max( tMaxWidth, tTextExtent.width);
        if(SC.none( tPrevLabelEnd)) {
          tCollision = tTextExtent.width > this_.get('fullCellWidth');
          tPrevLabelEnd = tIsHorizontal ? tCoord + tTextExtent.width / 2 : tCoord - tTextExtent.width / 2;
        }
        else if( tIsHorizontal) {
          tCollision = tCollision || (tCoord - tTextExtent.width / 2 < tPrevLabelEnd);
          tPrevLabelEnd = (tCoord + tTextExtent.width / 2);
        }
        else {  // vertical
          tCollision = tCollision || (tCoord + tTextExtent.width / 2 > tPrevLabelEnd);
          tPrevLabelEnd = (tCoord - tTextExtent.width / 2);
        }
      } // measureOneCell

      // iLabelSpec has form { element: {Raphael element}, coord: {Number}, height: {Number}, width: {Number} }
      function drawOneCell( iLabelSpec, iIndex) {
        var tCoord = iLabelSpec.coord,
            // tTextHeight = iLabelSpec.height,
            tLabelX, tLabelY;
        switch( this_.get('orientation')) {
          case DG.GraphTypes.EOrientation.kVertical:
          case DG.GraphTypes.EOrientation.kVertical2:
            this_._elementsToClear.push(
              this_.get('paper').line( tBaseline, tCoord + tTickOffset, tBaseline - kTickLength, tCoord + tTickOffset)
                .attr( { stroke: DG.PlotUtilities.kAxisColor }));
            tLabelX = tBaseline - kTickLength - kAxisGap - iLabelSpec.height / 3;
            tLabelY = tCoord + tTickOffset - ((iIndex === 0 && !tCentering) ? iLabelSpec.height / 2 : 0);
            if( tRotation === 0) {
              tAnchor = 'end';
              if( iLabelSpec.width > tLabelX && tLabelX > 10) {
                DG.RenderingUtilities.elideToFit( iLabelSpec.element, tLabelX);
              }
            }
            break;

          case DG.GraphTypes.EOrientation.kHorizontal:
            this_._elementsToClear.push(
              this_.get('paper').line( tCoord - tTickOffset, tBaseline, tCoord - tTickOffset, tBaseline + kTickLength)
                .attr( { stroke: DG.PlotUtilities.kAxisColor }));
            tLabelX = tCoord - tTickOffset + 1;
            tLabelY = tBaseline + kTickLength + kAxisGap + iLabelSpec.height / 3;
            if( tRotation === -90) {
              tAnchor = 'end';
              if( iIndex === 0 && !tCentering)
                tLabelX += iLabelSpec.height / 3;
              if( iLabelSpec.width > tFrame.height - tLabelY && tFrame.height - tLabelY > 10)
                DG.RenderingUtilities.elideToFit( iLabelSpec.element, tFrame.height - tLabelY);
            }
            break;
          case DG.GraphTypes.EOrientation.kTop:
            this_._elementsToClear.push(
                this_.get('paper').line( tCoord - tTickOffset, tBaseline, tCoord - tTickOffset, tBaseline - kTickLength)
                    .attr( { stroke: DG.PlotUtilities.kAxisColor }));
            tLabelX = tCoord - tTickOffset + 1;
            tLabelY = tBaseline - kTickLength - kAxisGap - iLabelSpec.height / 3;
            if( tRotation === -90) {
              var tAxisLabelHeight = this_.get('labelExtent').y;
              tAnchor = 'start';
              if( iIndex === 0)
                tLabelX += iLabelSpec.height / 3;
              if( iLabelSpec.width > tLabelY - tAxisLabelHeight && tLabelY - tAxisLabelHeight > 10)
                DG.RenderingUtilities.elideToFit( iLabelSpec.element, tLabelY - tAxisLabelHeight);
            }
            break;
          case DG.GraphTypes.EOrientation.kRight:
            this_._elementsToClear.push(
                this_.get('paper').line( tBaseline, tCoord + tTickOffset, tBaseline + kTickLength, tCoord + tTickOffset)
                    .attr( { stroke: DG.PlotUtilities.kAxisColor }));
            tLabelX = tBaseline + kTickLength + kAxisGap + iLabelSpec.height / 3;
            tLabelY = tCoord + tTickOffset;
            if( tRotation === 0) {
              var tAxisLabelWidth = this_.get('labelExtent').x;
              tAnchor = 'start';
              if( iLabelSpec.width > tFrame.width - tLabelX - tAxisLabelWidth) {
                DG.RenderingUtilities.elideToFit(iLabelSpec.element, tFrame.width - tLabelX- tAxisLabelWidth);
              }
            }
            break;
        }
        iLabelSpec.element.attr( { x: tLabelX, y: tLabelY, 'text-anchor': tAnchor });
        DG.RenderingUtilities.rotateText( iLabelSpec.element, tRotation, tLabelX, tLabelY);
      } // drawOneCell

      //==========Main body of doDraw==================
      setLimitToNumCellsToDraw();

      // Special case for short labels
      if( this.getPath('model.maxCellNameLength') <= 3)
        tRotation = 0;

      this._elementsToClear.push( this.renderAxisLine());

      tModel.forEachCellDo( measureOneCell);
      while( tLabelSpecs.length > tNumCells) {
        var tSpec = tLabelSpecs.pop();
        tSpec.element.remove();
      }
      if( tCollision) // labels must be perpendicular to axis
        tRotation = tIsHorizontal ? -90 : 0;
      tLabelSpecs.forEach( drawOneCell);

      this.set('labelSpecs', tLabelSpecs);

      this.renderLabel();
      // By changing maxLabelExtent we can trigger notification that causes the graph to re-layout
      // axes and plot if needed.
      var tNewExtent;
      switch (tOrientation) {
        case DG.GraphTypes.EOrientation.kHorizontal:
        case DG.GraphTypes.EOrientation.kTop:
          tNewExtent = (tRotation === 0) ? tMaxHeight : tMaxWidth;
          break;
        case DG.GraphTypes.EOrientation.kVertical:
        case DG.GraphTypes.EOrientation.kVertical2:
        case DG.GraphTypes.EOrientation.kRight:
          tNewExtent = (tRotation === 0) ? tMaxWidth : tMaxHeight;
          break;
      }
      this.setIfChanged('maxLabelExtent', tNewExtent);
    }

  };
}())
);

