// ==========================================================================
//                            DG.CategoriesView
//
//  Author:   William Finzer
//
//  Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('views/raphael_base');

/** @class  DG.CategoriesView - View of portion of legend that displays squares for each category of
 * a legend. The squares are selectable and can be dragged to change order.

 @extends DG.RaphaelBaseView
 */
DG.CategoriesView = DG.RaphaelBaseView.extend(
    (function () {
          var kMaxWidth = 150, // of a cell. Used to determine how many columns
              kMinWidth = 20,
              kDefaultRectSize = 14;

          var CategoryKey = SC.Object.extend({
            model: null,
            paper: null,

            /**
             * @property { String}
             */
            cellName: null,

            /**
             * Function set on initialization. Returns integer.
             */
            coordinatesToCellNum: null,

            // @property { Raphael Element }
            keyRect: null,
            // @property { Raphael Element }
            keyText: null,
            color: null,

            left: 0,
            top: 0,
            rectSize: 0,
            spaceForText: 0,

            containingView: null,

            init: function () {
              var this_ = this,
                  tView = this.containingView,
                  tStartingCellnames, tInitialCell, tDragStartCoord, tCellBeingDragged, tOffset,
                  rectHover = function( iEvent) {
                    this.transform('s1.2');
                  },
                  rectUnhover = function( iEvent) {
                    this.transform('');
                  },
                  selectCasesInCell = function (iEvent) {
                    SC.run(function () {
                      this_.get('model').selectCasesInCell(this_.cellName, iEvent.shiftKey);
                    }.bind(this));
                  },
                  beginDrag = function (iWindowX, iWindowY) {
                    tStartingCellnames = this_.getPath('model.cellNames');
                    tDragStartCoord = DG.ViewUtilities.windowToViewCoordinates({x: iWindowX, y: iWindowY}, tView);
                    tInitialCell = tCellBeingDragged = this_.coordinatesToCellNum(tDragStartCoord);
                    tOffset = {
                      x: this_.left - tDragStartCoord.x,
                      y: this_.top - tDragStartCoord.y
                    };
                  },
                  doDrag = function (iDeltaX, iDeltaY, iWindowX, iWindowY) {
                    var tModel = this_.get('model'),
                        tCurrentCoord = {
                          x: tDragStartCoord.x + iDeltaX,
                          y: tDragStartCoord.y + iDeltaY
                        },
                        tCategoryInCurrentCell = this_.coordinatesToCellNum(tCurrentCoord);
                    // Todo Touch is currently returning NaN for window coordinates. Fix this
                    if (isNaN(tCurrentCoord.x) || isNaN(tCurrentCoord.y) || isNaN(tCategoryInCurrentCell))
                      return;
                    SC.run(function () {
                      if (tCategoryInCurrentCell !== tCellBeingDragged) {
                        tCellBeingDragged = swapCategories( tModel.get('attributeDescription'),
                            tCategoryInCurrentCell, tCellBeingDragged);
                      }
                      tView.set('dragInfo', {
                        cellBeingDragged: tCellBeingDragged,
                        offset: tOffset,
                        position: tCurrentCoord
                      });
                      tView.displayDidChange();
                      tView.propertyDidChange('categoriesDragged');
                    });
                  },
                  endDrag = function (iEvent) {
                    SC.run(function () {
                      tView.set('dragInfo', null);
                      tView.displayDidChange();
                      tView.propertyDidChange('categoriesDragged');
                      tView.updateLayerIfNeeded();
                    });
                    if( tInitialCell !== tCellBeingDragged) {
                      var tCat1 = tStartingCellnames[tInitialCell],
                          tCat2 = tStartingCellnames[tCellBeingDragged];
                      DG.UndoHistory.execute(DG.Command.create({
                        name: 'swapCategories',
                        undoString: 'DG.Undo.graph.swapCategories',
                        redoString: 'DG.Redo.graph.swapCategories',
                        log: 'Moved category %@ into position of %@'.fmt(tCat1, tCat2),
                        _initialCell: tInitialCell,
                        _finalCell: tCellBeingDragged,
                        _legendModel: this_.get('model'),
                        execute: function () {
                        },
                        undo: function () {
                          swapCategories( this._legendModel.get('attributeDescription'),
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

              this.keyRect = this.paper.rect(0, 0, this.rectSize, this.rectSize)
                  .attr({fill: this.color})
                  .addClass(DG.PlotUtilities.kLegendKey)
                  .mouseover(rectHover)
                  .mouseout( rectUnhover)
                  .mousedown(selectCasesInCell)
                  .drag(doDrag, beginDrag, endDrag);
              this.keyText = this.paper.text(0, 0, this.cellName)
                  .attr({'text-anchor': 'start'})
                  .addClass(DG.PlotUtilities.kLegendKeyName)
                  .mousedown(selectCasesInCell)
                  .drag(doDrag, beginDrag, endDrag);
            },

            destroy: function () {
              this.keyRect.remove();
              this.keyText.remove();
              this.containingView = null;

              sc_super();
            },

            draw: function (iAnimate) {
              // body of draw
              var tRectAttrs = {
                    x: this.left,
                    y: this.top,
                    width: this.rectSize,
                    height: this.rectSize,
                    fill: this.color
                  },
                  tTextAttrs = {
                    x: this.left + this.rectSize + 5,
                    y: this.top + this.rectSize - 5,
                  };
              if (iAnimate) {
                this.keyRect.animate(tRectAttrs, 100, '<>');
                this.keyText.animate(tTextAttrs, 100, '<>');
              }
              else {
                this.keyRect.attr(tRectAttrs);
                this.keyText.attr(tTextAttrs);
              }
              this.keyText.attr('text', this.cellName);
              DG.RenderingUtilities.elideToFit( this.keyText, this.spaceForText);
            }
          });

          /** @scope DG.CategoriesView.prototype */
          return {
            displayProperties: ['model.attributeDescription.attribute',
              'model.attributeDescription.attributeStats.categoricalStats.numberOfCells',
              'model.updateCases'],

            /**
             Set by owning LegendView on creation
             @property { DG.LegendModel }
             */
            model: null,

            /**
             * Hash of category names to CategoryKey
             * @property { Object }
             */
            categoryKeys: null,

            /**
             * @property {Object}
             */
            dragInfo: null,

            // These are used during a drag of a categoryKey to compute current cell of mouse
            colWidth: null,
            rowHeight: null,
            numColumns: 2,

            init: function () {
              sc_super();
              this.categoryKeys = {};
            },

            maxCellNameExtent: function () {
              var tMaxExtent = 0,
                  tPaper = this.get('paper'),
                  tCellNames = this.getPath('model.cellNames');
              if (!tPaper || !tCellNames)
                return kMaxWidth;
              tCellNames.forEach(function (iName) {
                tMaxExtent = Math.max(tMaxExtent,
                    DG.RenderingUtilities.textExtent( iName).x);
              });
              return tMaxExtent + kDefaultRectSize + 10;
            },

            desiredExtent: function (iRowHeight) {

              var tCellWidth = Math.max(kMinWidth, Math.min(kMaxWidth, this.maxCellNameExtent())),
                  tWidth = this.getPath('frame.width') || tCellWidth,
                  tNumColumns = Math.max(2, Math.floor(tWidth / tCellWidth)),
                  tNumCells = this.model ? this.getPath('model.numberOfCells') : 0,
                  tNumRows = Math.ceil(tNumCells / tNumColumns);
              return tNumRows * iRowHeight;
            },

            doDraw: function doDraw() {
              if( !this.get('isVisible'))
                return;
              var tAttrDesc = this.getPath('model.attributeDescription'),
                  tWidth = this._paper.width,
                  tHeight = this._paper.height,
                  tColWidth = Math.max(kMinWidth, Math.min(kMaxWidth, this.maxCellNameExtent()+5)),
                  tNumColumns = Math.max(2, Math.floor(tWidth / tColWidth)),
                  tNumCells = this.getPath('model.numberOfCells'),
                  tNumRows = Math.ceil(tNumCells / tNumColumns),
                  tRowHeight = tHeight / tNumRows,
                  tCellIndex,
                  tCellNames = this.getPath('model.cellNames'),
                  tCategoryKeys = this.get('categoryKeys'),
                  coordinatesToCellNum = function (iCoords) {
                    var tCol = Math.min( this.numColumns - 1, Math.max(0, Math.floor(iCoords.x / this.colWidth))),
                        tRow = Math.min( this.numRows - 1, Math.max(0, Math.floor(iCoords.y / this.rowHeight))),
                        tCellNum = Math.min( this.numCells - 1, tCol + tRow * this.numColumns);
                    return tCellNum;
                  }.bind(this);
              // Stash the quantities we will need when coordinatesToCellNum is called
              this.set('rowHeight', tRowHeight);
              this.set('colWidth', tColWidth);
              this.set('numColumns', tNumColumns);
              this.set('numRows', tNumRows);
              this.set('numCells', tNumCells);
              // Mark them all as unused so we can get rid of ones no longer present
              DG.ObjectMap.forEach(tCategoryKeys, function (iName, iKey) {
                iKey.set('inUse', false);
              });

              for (tCellIndex = 0; tCellIndex < tNumCells && tCellIndex < tCellNames.length; tCellIndex++) {
                var tName = tCellNames[tCellIndex],
                    tColor = DG.ColorUtilities.calcCaseColor(tName, tAttrDesc),
                    tRow = Math.floor(tCellIndex / tNumColumns),
                    tCol = tCellIndex % tNumColumns,
                    tCategoryKey = tCategoryKeys[tName],
                    tIsDraggedCell = this.dragInfo && this.dragInfo.cellBeingDragged === tCellIndex;
                tColor = tColor.colorString || tColor;
                if (!tCategoryKey) {
                  tCategoryKeys[tName] = tCategoryKey = CategoryKey.create({
                    model: this.get('model'),
                    paper: this.get('paper'),
                    containingView: this,
                    coordinatesToCellNum: coordinatesToCellNum
                  });
                }
                if (tIsDraggedCell) {
                  tCategoryKey.set('left', this.dragInfo.position.x + this.dragInfo.offset.x);
                  tCategoryKey.set('top', this.dragInfo.position.y + this.dragInfo.offset.y);
                } else {
                  tCategoryKey.set('left', tCol * tWidth / tNumColumns + 2);
                  tCategoryKey.set('top', tRow * tRowHeight + 2);
                }
                tCategoryKey.set('rectSize', tRowHeight - 5);
                tCategoryKey.set('spaceForText', tWidth / tNumColumns - (tRowHeight - 5) - 8);
                tCategoryKey.set('color', tColor);
                tCategoryKey.set('cellName', tName);
                tCategoryKey.set('inUse', true);
                tCategoryKey.draw(!tIsDraggedCell);
              }

              // Those that are unused get destroyed
              DG.ObjectMap.forEach(tCategoryKeys, function (iName, iKey) {
                if (!iKey.inUse) {
                  iKey.destroy();
                  delete tCategoryKeys[iName];
                }
              });

            },

            selectionDidChange: function() {
              var tSelectionMap = this.getPath('model.selectionMap'),
                  tCategoryKeys = this.get('categoryKeys');
              if (SC.none(tSelectionMap) || SC.none(tCategoryKeys))
                return;
              DG.ObjectMap.forEach(tCategoryKeys, function (iCategory, iCatKey) {
                if (tSelectionMap[iCategory]) {
                  iCatKey.keyRect.addClass(DG.PlotUtilities.kLegendKeySelected);
                }
                else {
                  iCatKey.keyRect.removeClass(DG.PlotUtilities.kLegendKeySelected);
                }
              });
            }.observes('*model.selectionMap')

          };
        }()
    ))
;

