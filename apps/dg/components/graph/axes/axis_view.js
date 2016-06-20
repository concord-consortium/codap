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
      return {
        displayProperties: ['model.attributeDescription.attribute',
          'model.attributeDescription.attributeStats.categoricalStats.numberOfCells',
          'otherYAttributeDescription.attribute',
          'otherAxisView.desiredExtent'],
        classNames: 'axis-view'.w(),

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

        /**
         * @property {DG.Attribute}
         */
        plottedAttribute: function () {
          return this.getPath('model.attributeDescription.attribute');
        }.property(),

        xAttributeDescription: null,  // Used by vertical2 axis to test if drag attribute is valid
        otherYAttributeDescription: null,  // Used by vertical2 axis to test if drag attribute is valid

        blankDropHint: 'DG.GraphView.addToEmptyPlace',

        _hiddenDragView: null,

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
         * Return whether both my model and my otherAxisView's model have no attributes assigned
         * @return{Boolean}
         */
        noAttributesOnEitherAxis: function() {
          return this.getPath('model.noAttributes') &&
                  this.getPath('otherAxisView.model.noAttributes');
        },

        /**
         Coordinate of my minimum value (Y: bottom end, X: left end)
         @property { Number }
         */
        pixelMin: function() {
          var tResult = 0;
          if( this.get('isVertical')) {
            var tOtherDrawHeight = this.getPath('otherAxisView.drawHeight') || 0;
            tResult = this.get('drawHeight') -  tOtherDrawHeight;
          }
          return tResult;
        }.property(),
        pixelMinDidChange: function() {
          this.notifyPropertyChange('pixelMin');
        }.observes('*otherAxisView.drawHeight', 'drawHeight'),

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
              tNoAttributesOnEitherAxis = this.noAttributesOnEitherAxis(),
              tLabels, tNumAttributes, tNode;
          if (SC.none(this._paper))
            return [];

          if( tNoAttributesOnEitherAxis) {
            tLabels = ['DG.AxisView.emptyGraphCue'.loc()];
            tNumAttributes = 0;
          }
          else {
            tLabels = this.getPath('model.labels');
            tNumAttributes = tBaseLabelIndex + tLabels.length +
                ((this.get('orientation') === 'vertical') ? tOtherYCount : 0);
          }
          tLabels.forEach(function (iLabel, iIndex) {
            if (tLabelCount >= this_._labelNodes.length) {
              tNode = DG.LabelNode.create({
                paper: this_._paper,
                rotation: tRotation,
                colorIndex: tBaseLabelIndex + iIndex,
                numColors: tNumAttributes,
                priorNode: (tLabelCount > 0) ? tLabels[ tLabelCount - 1] : null });
              tNode.setDragLabelHandler( DG.DragLabelHandler.create({
                labelNode: tNode,
                labelView: this_._hiddenDragView,
                viewToAddTo: this_,
                attributeDescription: this_.getPath('model.attributeDescription'),
                dataContext: this_.getPath('model.dataConfiguration.dataContext')
              }));
              this_._labelNodes.push(tNode);
              tChangeHappened = true;
            }
            else {
              tNode = this_._labelNodes[ tLabelCount];
              tNode.beginPropertyChanges();
                tNode.setIfChanged('colorIndex', tBaseLabelIndex + iIndex);
                tNode.setIfChanged('numColors', tNumAttributes);
              tNode.endPropertyChanges();
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
        }.property(),

        labelNodesDidChange: function() {
          this.notifyPropertyChange('labelNodes');
        }.observes('*model.labels'),

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
         * @property {[DG.LabelNode]}
         */
        _labelNodes: null,

        init: function () {
          sc_super();
          this._labelNodes = [];
          // Add a classname for use in QA automation
          var tClassName;
          switch( this.get('orientation')) {
            case 'horizontal':
              tClassName = 'h-axis';
              break;
            case 'vertical':
              tClassName = 'v-axis';
              break;
            case 'vertical2':
              tClassName = 'v2-axis';
              break;
          }
          this.get('classNames').push( tClassName);
          this._hiddenDragView = SC.LabelView.create({
            classNames: 'drag-label'.w(),
            layout: {width: 100, height: 20, top: -50, left: 0},
            value: ''
          });
          this.appendChild( this._hiddenDragView);

        },

        /**
         * Make sure we don't hang around pointing to otherAxisView
         */
        destroy: function() {
          this.otherAxisView = null;  // break circular references
          this.get('labelNodes').forEach( function( iNode) {
            iNode.remove();
            iNode.destroy();
          });
          this._labelNodes = null;
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
              //tRotation = tIsVertical ? -90 : 0,
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
              tPosition -= tLabelExtent.y + 4;
              if (tV2)
                tLoc.x = tDrawWidth - tLabelExtent.x / 2 - 2;
            }
            else {  // horizontal
              tLoc.x = tPosition + tLabelExtent.x / 2;
              tLoc.y = tDrawHeight - tLabelExtent.y / 2 - 2;
              tPosition += tLabelExtent.x + 4;
            }
            tNode.set('loc', tLoc);
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
          this.hideDropHint();
          this.set('dragData', iDragObject.data);
          return SC.DRAG_LINK;
        },

        /**
         * Override so that y2 can hide if it has no attribute
         */
        dragEnded: function() {
          if( (this.get('orientation') === 'vertical2') && (this.constructor === DG.AxisView)) {
            this.set('isVisible', false);
          }
          DG.GraphDropTarget.dragEnded.apply(this, arguments);
        },

        numberOfCells: function () {
          return this.getPath('model.numberOfCells');
        }.property(),

        numberOfCellsChanged: function() {
          this.notifyPropertyChange('numberOfCells');
        }.observes('*model.numberOfCells'),

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

        doDraw: function() {
          this.renderLabel();
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
            return DG.GraphDropTarget.isValidAttribute.call(this, iDrag);
        }
      };
    }()));

