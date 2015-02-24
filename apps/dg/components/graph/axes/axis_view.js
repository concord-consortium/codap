// ==========================================================================
//                              DG.AxisView
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

sc_require('components/graph/utilities/graph_drop_target');
sc_require('views/raphael_base');

/** @class  DG.AxisView - The base class view for a graph axis.

 On creation, pass in the orientation, as in
 DG.AxisView.create( { orientation: 'vertical' })

 @extends DG.RaphaelBaseView
 */
DG.AxisView = DG.RaphaelBaseView.extend(DG.GraphDropTarget,
    /** @scope DG.AxisView.prototype */ (function () {

      var LabelNode = SC.Object.extend(
          {
            paper: null,
            text: null,
            description: null,
            colorIndex: 0,
            numColors: 1,
            rotation: 0,
            priorNode: null,
            loc: null,  // {x, y}
            _circleElement: null,
            _textElement: null,
            kCircleRadius: 6,

            init: function() {
              this._textElement = this.paper.text(0, 0, '')
                  .addClass('axis-label');
              DG.RenderingUtilities.rotateText(this._textElement, this.rotation, 0, 0);
              this.numColorsChanged();
            },

            numColorsChanged: function() {
              var tTextColor = 'blue',
                  tPointColor = 'lightblue';
              if (this.colorIndex > 0) {
                tTextColor = DG.ColorUtilities.calcAttributeColorFromIndex(this.colorIndex, this.numColors).colorString;
                tPointColor = tTextColor;
              }
              this._textElement.attr('fill', tTextColor);

              if((this.numColors > 1) && !this._circleElement) {
                this._circleElement = this.paper.circle(0, 0, this.kCircleRadius)
                    .addClass('axis-dot');
              }
              else if((this.numColors <= 1) && this._circleElement) {
                this._circleElement.remove();
                this._circleElement = null;
              }
              if( this._circleElement)
                this._circleElement.attr('fill', tPointColor);
            }.observes('numColors'),

            textChanged: function() {
              this._textElement.attr('text', this.text);
            }.observes('text'),

            descriptionChanged: function() {
              this._textElement.attr('title', this.description);
            }.observes('description'),

            locChanged: function() {
              var tYOffset = this._circleElement ? this.kCircleRadius / 2 : 0;
              this._textElement.attr({ x: this.loc.x, y: this.loc.y - tYOffset });
              DG.RenderingUtilities.rotateText(this._textElement, this.rotation, this.loc.x, this.loc.y - tYOffset);
              if( this._circleElement) {
                var tBox = this._textElement.getBBox(),
                    tCenter;
                if (this.rotation !== 0) {
                  tCenter = { cx: this.loc.x + 1, cy: this.loc.y - tYOffset + tBox.height / 2 + this.kCircleRadius + 2 }
                }
                else {
                  tCenter = { cx: this.loc.x - (tBox.width / 2 + this.kCircleRadius + 2), cy: this.loc.y }
                }
                this._circleElement.attr( tCenter);
              }
            }.observes('loc'),

            extent: function() {
              var tResult = this._textElement.getBBox();
              if( this._circleElement) {
                tResult.width += (this.rotation === 0) ? 2 * this.kCircleRadius + 2 : 0;
                tResult.height += (this.rotation !== 0) ? 2 * this.kCircleRadius + 2 : 0;
              }
              return tResult;
            },

            mousedown: function( iHandler) {
              this._textElement.mousedown( iHandler);
              this._circleElement && this._circleElement.mousedown( iHandler);
            },

            unmousedown: function( iHandler) {
              this._textElement.unmousedown( iHandler);
              this._circleElement && this._circleElement.unmousedown( iHandler);
            },

            remove: function() {
              this._textElement.remove();
              this._circleElement && this._circleElement.remove();
            }
          }
      );

      return {
        displayProperties: ['model.attributeDescription.attribute',
          'model.attributeDescription.attributeStats.categoricalStats.numberOfCells',
          'otherYAttributeDescription.attribute'],

        /**
         The model on which this view is based.
         @property { DG.AxisModel }
         */
        model: null,

        /**
         Either 'vertical' or 'horizontal' or 'vertical2'
         @property { String }
         */
        orientation: null,

        isVertical: function () {
          return this.get('orientation').indexOf('vertical') >= 0;
        }.property('orientation'),

        /**
         * @property {DG.Attribute}
         */
        plottedAttribute: function () {
          return this.getPath('model.attributeDescription.attribute');
        }.property(),

        xAttributeDescription: null,  // Used by vertical2 axis to test if drag attribute is valid
        otherYAttributeDescription: null,  // Used by vertical2 axis to test if drag attribute is valid

        blankDropHint: 'DG.GraphView.addToEmptyPlace',

        /**
         For Raphael 1.5.2 we could always return the height, but this changed with Raphael 2.0 when
         the BBox started depending on rotation.
         @property { Number }
         */
        desiredExtent: function () {
          var tLabelExtent = this.get('labelExtent'),
              tDimension = (Raphael.version < "2.0") ?
                  'y' :
                  ((this.get('orientation') === 'horizontal') ? 'y' : 'x');
          return tLabelExtent[ tDimension];
        }.property('labelNode'),

        /**
         * A y-axis gets its pixelMin from the corresponding x-axis
         * @property { DG.AxisView }
         */
        otherAxisView: null,

        /**
         Coordinate of my minimum value (Y: bottom end, X: left end)
         @property { Number }
         */
        pixelMin: function() {
          return this.get('isVertical') ?
              this.get('drawHeight') - this.getPath('otherAxisView.drawHeight') :
              0;
        }.property('otherAxisView.drawHeight', 'drawHeight'),

        /**
         Coordinate of my maximum value (Y: top end, X: right end)
         @property { Number }
         */
        pixelMax: function() {
          return this.get('isVertical') ? 0 :
              this.get('drawWidth');
        }.property('drawWidth'),

        /**
         Return the extent of the label
         @property {Point as in { x, y }}
         */
        labelExtent: function () {
          var kMinHeight = DG.RenderingUtilities.kCaptionFontHeight,
              tLabelNode = this.get('labelNode'),
              tExtent = { x: kMinHeight, y: kMinHeight};
          if (!SC.none(tLabelNode)) {
            var tBox = tLabelNode.extent();
            tExtent = { x: isNaN(tBox.width) ? kMinHeight : Math.max(kMinHeight, tBox.width),
              y: isNaN(tBox.height) ? kMinHeight : Math.max(kMinHeight, Math.ceil(tBox.height / 2) * 2) };
          }
          return tExtent;
        }.property('labelNode').cacheable(),

        /**
         Subclasses must override
         @return { Boolean }
         */
        isNumeric: null,

        /**
         The Raphael element used to display the label.
         @property {Array of LabelNode}
         */
        labelNodes: function () {
          var this_ = this,
              tChangeHappened = false,
              tLabelCount = 0,
              tRotation = this.get('isVertical') ? -90 : 0,
              tOtherYAttributes = this.getPath('otherYAttributeDescription.attributes'),
              tOtherYCount = SC.isArray(tOtherYAttributes) ? tOtherYAttributes.length : 0,
              tBaseLabelIndex = (this.get('orientation') === 'vertical2') ? tOtherYCount : 0,
              tLabels, tNumAttributes, tDescription, tNode;
          if (SC.none(this._paper))
            return [];

          tLabels = this.getPath('model.labels');
          tNumAttributes = tBaseLabelIndex + tLabels.length +
              ((this.get('orientation') === 'vertical') ? tOtherYCount : 0);
          tLabels.forEach(function (iLabel, iIndex) {
            if (tLabelCount >= this_._labelNodes.length) {
              tNode = LabelNode.create({ paper: this_._paper, rotation: tRotation,
                colorIndex: tBaseLabelIndex + iIndex, numColors: tNumAttributes,
                priorNode: (tLabelCount > 0) ? tLabels[ tLabelCount - 1] : null });
              this_._labelNodes.push(tNode);
              tChangeHappened = true;
            }
            else {
              tNode = this_._labelNodes[ tLabelCount];
              tNode.setIfChanged('numColors', tNumAttributes);
            }

            tChangeHappened = (iLabel !== tNode.get('text'));
            tNode.setIfChanged('text', iLabel);
            tNode.setIfChanged('description', this_.get('model').getLabelDescription(iIndex) +
                '—' + 'DG.AxisView.labelTooltip'.loc(this_.orientation));

            tLabelCount++;
          });

          while (this._labelNodes.length > tLabelCount) {
            this._labelNodes.pop().remove();
            tChangeHappened = true;
          }

          if (tChangeHappened)
            this.notifyPropertyChange('labelNode', this._labelNodes);

          return this._labelNodes;
        }.property('model.labels'),

        /**
         The Raphael element used to display the label.
         @property {Raphael element}
         */
        labelNode: function () {
          var tNodes = this.get('labelNodes');
          return (tNodes.length > 0) ? tNodes[0] : null;
        }.property('labelNodes'),

        /**
         * @private
         * @property {Raphael element}
         */
        _labelNodes: null,

        init: function () {
          sc_super();
          this._labelNodes = [];
        },

        /**
         * Make sure we don't hang around pointing to otherAxisView
         */
        destroy: function() {
          this.otherAxisView = null;  // break circular references
          sc_super();
        },

        /**
         * The label consists of one clickable text node for each attribute assigned to the axis.
         * These are separated by colons.
         * Note that only y-axes of scatterplots are equipped to handle multiple attributes.
         */
        renderLabel: function () {
          var tNodes = this.get('labelNodes'),
              tDrawWidth = this.get('drawWidth'),
              tDrawHeight = this.get('drawHeight'),
              tIsVertical = this.get('isVertical'),
              tRotation = tIsVertical ? -90 : 0,
              tTotalLength = 0,
              tLayout = tNodes.map(function (iNode) {
                var tExtent = iNode.extent();
                tTotalLength += tIsVertical ? tExtent.height : tExtent.width;
                return { node: iNode, extent: tExtent };
              }),
              tPosition = tIsVertical ? ((tDrawHeight + tTotalLength) / 2) : ((tDrawWidth - tTotalLength) / 2),
              tV2 = this.get('orientation') === 'vertical2';
          tLayout.forEach(function (iLayout) {
            var tNode = iLayout.node,
                tLabelExtent = { x: iLayout.extent.width, y: iLayout.extent.height },
                tLoc = { }; // The center of the node

            if (tIsVertical) {
              tLoc.x = tLabelExtent.x / 4 + 2;
              tLoc.y = tPosition - tLabelExtent.y / 2;
              tPosition -= tLabelExtent.y;
              if (tV2)
                tLoc.x = tDrawWidth - tLabelExtent.x / 2 - 2;
            }
            else {  // horizontal
              tLoc.x = tPosition + tLabelExtent.x / 2;
              tLoc.y = tDrawHeight - tLabelExtent.y / 2 - 2;
              tPosition += tLabelExtent.x;
            }
            tNode.attr( { x: tLoc.x, y: tLoc.y } );
            DG.RenderingUtilities.rotateText( tNode, tRotation, tLoc.x, tLoc.y);
          });
        },

        /**
         Graph controller observes this property to detect that a drag has taken place.
         @property{{
          context:{DG.DataContext},
          collection:{DG.CollectionRecord},
          attribute:{DG.Attribute},
          text:{String},
          axisOrientation:{String} }}
         */
        dragData: null,

        /**
         Attempt to assign the given attribute to this axis.
         @param {SC.Drag} 'data' property contains 'collection', 'attribute', 'text' properties
         @param {SC.DRAG_LINK}
         */
        performDragOperation: function (iDragObject, iDragOp) {
          this.set('dragData', iDragObject.data);
          return SC.DRAG_LINK;
        },

        /**
         @property { Number }  Takes into account any borders the parent views may have
         [SCBUG]
         */
        drawWidth: function () {
          var tWidth = this.get('frame').width;
          if (this.get('orientation') === 'horizontal')
            tWidth -= 2 * DG.ViewUtilities.kBorderWidth;
          return tWidth;
        }.property('frame'),

        /**
         @property { Number }  Takes into account any borders the parent views may have
         [SCBUG]
         */
        drawHeight: function () {
          var tHeight = this.get('frame').height;
          if (this.get('isVertical'))
            tHeight -= 2 * DG.ViewUtilities.kBorderWidth;
          return tHeight;
        }.property('frame'),

        numberOfCells: function () {
          return this.getPath('model.numberOfCells');
        }.property('model.numberOfCells'),

        /**
         The total distance in pixels between one cell and the next without any "slop" at the ends.
         @property {Number} in pixels
         */
        fullCellWidth: function () {
          var tNumCells = this.get('numberOfCells');

          return Math.abs(this.get('pixelMax') - this.get('pixelMin')) / tNumCells;
        }.property('numberOfCells', 'pixelMax', 'pixelMin'),

        /**
         The width to be used when actually drawing into a cell because it takes into account
         the need for space between cells and space on both ends.
         @property {Number} in pixels
         */
        cellWidth: function () {
          var tNumCells = this.get('numberOfCells'),
              tPixelMin = this.get('pixelMin'),
              tPixelMax = this.get('pixelMax'),
              kShrinkFactor = 0.9,
          // Here's where we make a bit of space at the ends of the axis.
              tUpperBounds = tNumCells + 0.5,
              tLowerBounds = 0,
              tAxisRange = tUpperBounds - tLowerBounds,
              tHalfWidth = Math.abs((tPixelMax - tPixelMin) / tAxisRange);

          return tHalfWidth * kShrinkFactor;
        }.property('numberOfCells', 'pixelMax', 'pixelMin'),

        /**
         Note that for vertical axis, the zeroth cell is at the top.
         @return {Number} coordinate of the given cell.
         */
        cellToCoordinate: function (iCellNum) {
          var tNumCells = this.get('numberOfCells'),
              tCoordinate = Math.abs((iCellNum + 0.5) / tNumCells * (this.get('pixelMax') -
                  this.get('pixelMin')));

          return tCoordinate;
        },

        /**
         @return {Number} coordinate of the cell with the given name.
         */
        cellNameToCoordinate: function (iCellName) {
          return this.cellToCoordinate(this.model.cellNameToCellNumber(iCellName));
        },

        /**
         Default implementation does nothing.
         @param {Function} to be called for each tick
         */
        forEachTickDo: function () {
        },

        /**
         Default implementation expects a number between 0 and 1 and returns a number between pixelMin and pixelMax.
         @param{Number} Expected to be between 0 and 1.
         @return {Number}
         */
        dataToCoordinate: function (iData) {
          var
              tPixelMin = this.get('pixelMin'),
              tPixelMax = this.get('pixelMax');
          return tPixelMin + iData * (tPixelMax - tPixelMin);
        },

        /**
         Default implementation expects a number between 0 and 1 and returns a number between pixelMin and pixelMax.
         @param{Number} Expected to be between pixelMin and pixelMax.
         @return {Number} Typically between 0 and 1.
         */
        coordinateToData: function (iCoord) {
          var
              tPixelMin = this.get('pixelMin'),
              tPixelMax = this.get('pixelMax');
          return (iCoord - tPixelMin) / (tPixelMax - tPixelMin);
        },

        isValidAttribute: function (iDrag) {
          if (this.get('orientation') === 'vertical2') {
            var tDragAttr = iDrag.data.attribute,
                tCurrAttr = this.get('plottedAttribute'),
                tXDescription = this.get('xAttributeDescription'),
                tCurrXAttr = tXDescription ? tXDescription.get('attribute') : DG.Analysis.kNullAttribute,
                tY1Description = this.get('otherYAttributeDescription'),
                tY1Attr = tY1Description ? tY1Description.get('attribute') : DG.Analysis.kNullAttribute;
            return (tCurrXAttr !== DG.Analysis.kNullAttribute) &&
                (tY1Attr !== DG.Analysis.kNullAttribute) &&
                (tY1Attr !== tDragAttr) &&
                (tCurrAttr !== tDragAttr) &&
                tXDescription.get('isNumeric') &&
                tY1Description.get('isNumeric');
          }
          else
            return DG.GraphDropTarget.isValidAttribute.call(this, iDrag)
        }
      };
    }()));

