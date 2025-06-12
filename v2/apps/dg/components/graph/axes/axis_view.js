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
 DG.AxisView.create( { orientation: DG.GraphTypes.EOrientation.kVertical })

 @extends DG.RaphaelBaseView
 */
DG.AxisView = DG.RaphaelBaseView.extend(DG.GraphDropTarget,
    /** @scope DG.AxisView.prototype */ (function () {
      return {
        displayProperties: ['suppressLabel',
          'model.attributeDescription.attribute',
          'model.attributeDescription.attributeStats.categoricalStats.numberOfCells',
          'model.attributeDescription.attributeStats.cellMap',
          'otherYAttributeDescription.attribute'],
        classNames: 'dg-axis-view'.w(),

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
         * When this set, we use its paper rather than our own for rendering our label.
         * @property {DG.RaphaelBaseView}
         */
        paperSourceForLabel: null,

        paperForLabel: function() {
          if( this.get('paperSourceForLabel'))
            return this.getPath('paperSourceForLabel.paper');
          else return this.get('paper');
        }.property('paperSourceForLabel'),

        /**
         * In some situations we don't want to show the label; e.g. split right or split top
         * we only show the label on one of the axes.
         * @property {Boolean}
         */
        suppressLabel: false,

        /**
         * Most axis views allow bin lines. But a BinnedAxisView does not.
         * @property {Boolean}
         */
        allowCellBoundaries: true,

        /**
         * @property {DG.Attribute}
         */
        plottedAttribute: function () {
          return this.getPath('model.attributeDescription.attribute');
        }.property(),
        plottedAttributeDidChange: function() {
          // If make use of an AxisLabelView, let it know the new plottedAttribute so it can
          // highlight correctly in a drag of an attribute
          if( this.get('paperSourceForLabel'))
            this.setPath( 'paperSourceForLabel.plottedAttribute', this.get('plottedAttribute'));
        }.observes('model.attributeDescription.attribute'),

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
          if( this.get('paperSourceForLabel'))
            return 0; // it will be laid out independently of us

          var tLabelExtent = this.get('labelExtent'),
              tDimension;
          switch (this.get('orientation')) {
            case DG.GraphTypes.EOrientation.kHorizontal:
            case DG.GraphTypes.EOrientation.kTop:
              tDimension = 'y';
              break;
            case DG.GraphTypes.EOrientation.kVertical:
            case DG.GraphTypes.EOrientation.kVertical2:
            case DG.GraphTypes.EOrientation.kRight:
              tDimension = 'x';
              break;
          }
          return tLabelExtent[ tDimension];
        }.property('labelNode', 'paperSourceForLabel'),

        /**
         * When we are the "other" axis, our partner needs to know how much to offset pixelMin
         * @property {Number}
         */
        pixelMinOffset: function() {
          var tPaperSourceForLabel = this.get('paperSourceForLabel');
          return tPaperSourceForLabel ? tPaperSourceForLabel.get('desiredExtent') : 0;
        }.property('paperSourceForLabel'),

        /**
         @property{Number}
         */
        axisLineCoordinate: function() {
          var tCoord;
          switch( this.get('orientation')) {
            case DG.GraphTypes.EOrientation.kVertical:
              tCoord = this.get('drawWidth');
              break;
            case DG.GraphTypes.EOrientation.kVertical2:
            case DG.GraphTypes.EOrientation.kHorizontal:
            case DG.GraphTypes.EOrientation.kRight:
              tCoord = 0;
              break;
            case DG.GraphTypes.EOrientation.kTop:
              tCoord = this.get('drawHeight');
              break;
          }
          return tCoord;
        }.property('drawWidth', 'drawHeight'),

        /**
         * Return whether both my model and my otherAxisView's model have no attributes assigned
         * @return{Boolean}
         */
        noAttributesOnEitherAxis: function() {
          var tDataConfiguration = this.getPath('model.dataConfiguration');
          return tDataConfiguration && tDataConfiguration.noAttributesFor(['x', 'y']);
        },

        /**
         Coordinate of my minimum value (Y: bottom end, X: left end)
         @property { Number }
         */
        pixelMin: function() {
          var tResult = 0;
          if( this.get('isVertical')) {
            tResult = this.get('drawHeight');
          }
          return tResult;
        }.property(),
        pixelMinDidChange: function() {
          this.notifyPropertyChange('pixelMin');
        }.observes('drawHeight'),

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
              tBaseLabelIndex = (this.get('orientation') === DG.GraphTypes.EOrientation.kVertical2) ? tOtherYCount : 0,
              tNoAttributesOnThisAxis = this.getPath('model.noAttributes'),
              tNoAttributesOnEitherAxis = this.noAttributesOnEitherAxis(),
              tLabels, tNumAttributes, tNode, tAttributes, tAttribute;
          if (SC.none(this.get('paperForLabel')) || (this._labelNodes == null))
            return [];

          if( (this.constructor === DG.AxisView) && (tNoAttributesOnEitherAxis ||
              (tNoAttributesOnThisAxis && DG.ComponentView.isComponentViewForViewSelected( this)))) {
            tLabels = ['DG.AxisView.emptyGraphCue'.loc()];
            tNumAttributes = 0;
          }
          else {
            tLabels = this.getPath('model.labels');
            tNumAttributes = tBaseLabelIndex + tLabels.length +
                ((this.get('orientation') === DG.GraphTypes.EOrientation.kVertical) ? tOtherYCount : 0);
          }
          tLabels.forEach(function (iLabel, iIndex) {
            if (tLabelCount >= this_._labelNodes.length) {
              tNode = DG.LabelNode.create({
                paper: this_.get('paperForLabel'),
                rotation: tRotation,
                colorIndex: tBaseLabelIndex + iIndex,
                numColors: tNumAttributes,
                getPointColor: iIndex === 0 ? this_.getPath('model.getPointColor') : null,
                priorNode: (tLabelCount > 0) ? tLabels[ tLabelCount - 1] : null });
              tAttributes = this_.getPath('model.attributeDescription.attributes');
              tAttribute = (SC.isArray(tAttributes)) ? tAttributes[iIndex] : null;
              if( tAttribute) {
                tNode.setDragLabelHandler(DG.DragLabelHandler.create({
                  labelNode: tNode,
                  labelView: this_._hiddenDragView,
                  viewToAddTo: this_,
                  attributeDescription: this_.getPath('model.attributeDescription'),
                  attributeName: tAttribute.get('name'),
                  dataContext: this_.getPath('model.dataConfiguration.dataContext')
                }));
              }
              this_._labelNodes.push(tNode);
              tChangeHappened = true;
            }
            else {
              tNode = this_._labelNodes[ tLabelCount];
              tNode.beginPropertyChanges();
                tNode.setIfChanged('colorIndex', tBaseLabelIndex + iIndex);
                tNode.setIfChanged('numColors', tNumAttributes);
                if( iIndex === 0 && tNumAttributes > 1)
                  tNode.numColorsChanged(); // in case the base color has changed
              tNode.endPropertyChanges();
            }

            tChangeHappened = (iLabel !== tNode.get('text'));
            tNode.setIfChanged('text', iLabel);

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
          this.get('labelNodes'); // Should cause new text to be set in each label node.
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
            case DG.GraphTypes.EOrientation.kVertical2:
              tClassName = 'dg-v2-axis';
              break;
          }
          this.get('classNames').push( tClassName);
          this._hiddenDragView = SC.LabelView.create({
            classNames: 'dg-drag-label'.w(),
            layout: {width: 100, height: 20, top: -50, left: 0},
            value: ''
          });
          this.appendChild( this._hiddenDragView);
          // A plain axis view will need to redraw each time the component becomes selected/unselected
          if( this.constructor === DG.AxisView)
            DG.mainPage.docView.addObserver('selectedChildView', this, this.doDraw);
        },

        /**
         * Remove observer and nodes
         */
        destroy: function() {
          if( this.constructor === DG.AxisView)
            DG.mainPage.docView.removeObserver('selectedChildView', this, this.doDraw);
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
          if( this.get('suppressLabel')) {
            this.suppressLabelChanged();  // Guarantee that it's hidden
            return;
          }

          var tNodes = this.get('labelNodes'),
              tPaperForLabel = this.get('paperForLabel'),
              tDrawWidth = tPaperForLabel ? tPaperForLabel.width: 0,
              tDrawHeight = tPaperForLabel ? tPaperForLabel.height : 0,
              tIsVertical = this.get('isVertical'),
              tOrientation = this.get('orientation'),
              tTotalLength = 0,
              tLayout = tNodes.map(function (iNode) {
                var tExtent = iNode.extent();
                // We do this next test because of a peculiarity of restoring a graph component that is
                //  minimized. The label gets a chance to position itself during the initial render while
                //  the component is minimized but doesn't get another chance during maximization.
                if( !tIsVertical && tExtent.height === 0)
                  tExtent.height = tDrawHeight;
                tTotalLength += tIsVertical ? tExtent.height : tExtent.width;
                return { node: iNode, extent: tExtent };
              }),
              tPosition = tIsVertical ? ((tDrawHeight + tTotalLength) / 2) : ((tDrawWidth - tTotalLength) / 2);
          // It seems redundant to go through this every time we display, but we've had trouble getting the descriptions
          //  to be set consistently.
          tNodes.forEach(function( iNode, iIndex) {
            var tDescription = this.get('model').getLabelDescription(iIndex) +
                '—' + 'DG.AxisView.labelTooltip'.loc(('DG.AxisView.' + this.orientation).loc());
            iNode._textElement.attr('title', tDescription);
          }.bind(this));

          tLayout.forEach(function (iLayout) {
            var tNode = iLayout.node,
                tLabelExtent = { x: iLayout.extent.width, y: iLayout.extent.height },
                tLoc = { }; // The center of the node

            switch( tOrientation) {
              case DG.GraphTypes.EOrientation.kVertical:
              case DG.GraphTypes.EOrientation.kVertical2:
              case DG.GraphTypes.EOrientation.kRight:
                tLoc.x = tLabelExtent.x / 4 + 4;
                tLoc.y = tPosition - tLabelExtent.y / 2;
                tPosition -= tLabelExtent.y + 4;
                if (tOrientation === DG.GraphTypes.EOrientation.kVertical2 ||
                    tOrientation === DG.GraphTypes.EOrientation.kRight)
                  tLoc.x = tDrawWidth - tLabelExtent.x / 2 - 2;
                break;
              case DG.GraphTypes.EOrientation.kHorizontal:
              case DG.GraphTypes.EOrientation.kTop:
                tLoc.x = tPosition + tLabelExtent.x / 2;
                tLoc.y = tDrawHeight - tLabelExtent.y / 2 - 2;
                tPosition += tLabelExtent.x + 4;
                if( tOrientation === DG.GraphTypes.EOrientation.kTop)
                  tLoc.y = tLabelExtent.y / 3;
                break;
            }
            tNode.set('loc', tLoc);
          });
        },

        suppressLabelChanged: function() {
          var tLabelNodes = this._labelNodes,
              tSuppress = this.get('suppressLabel');
          if (tLabelNodes) {
            tLabelNodes.forEach(function (iNode) {
              if( tSuppress)
                iNode.hide();
              else
                iNode.show();
            });
          }
          if( !tSuppress)
            this.renderLabel();
        }.observes('suppressLabel'),

        /**
         This is the main backbone of the axis.
         @return {Raphael element}
         */
        renderAxisLine: function() {
          var tCoord = this.get('axisLineCoordinate'),
              tPixelMin = this.get('pixelMin'),
              tPixelMax = this.get('pixelMax'),
              tStart, tStop;
          switch( this.get('orientation')) {
            case DG.GraphTypes.EOrientation.kVertical:
              tStart = { x: tCoord - 1, y: tPixelMin };
              tStop = { x: tCoord - 1, y: tPixelMax };
              break;
            case DG.GraphTypes.EOrientation.kHorizontal:
              tStart = { x: tPixelMin, y: tCoord + 1 };
              tStop = { x: tPixelMax, y: tCoord + 1 };
              break;
            case DG.GraphTypes.EOrientation.kVertical2:
            case DG.GraphTypes.EOrientation.kRight:
              tStart = { x: tCoord + 1, y: tPixelMin };
              tStop = { x: tCoord + 1, y: tPixelMax };
              break;
            case DG.GraphTypes.EOrientation.kTop:
              tStart = { x: tPixelMin, y: tCoord - 1 };
              tStop = { x: tPixelMax, y: tCoord - 1 };
              break;
          }
          return this.get('paper').line( tStart.x, tStart.y, tStop.x, tStop.y)
              .attr( { stroke: DG.PlotUtilities.kAxisColor,
                strokeWidth: 2 });
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
          if( (this.get('orientation') === DG.GraphTypes.EOrientation.kVertical2) && (this.constructor === DG.AxisView)) {
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
              tPixelWidth = Math.abs( this.get('pixelMax') - this.get('pixelMin')),
              tDistanceToCell = (iCellNum + 0.5) / tNumCells * tPixelWidth,
              tCoordinate;
          switch (this.get('orientation')) {
            case DG.GraphTypes.EOrientation.kHorizontal:
            case DG.GraphTypes.EOrientation.kTop:
              tCoordinate = this.get('pixelMin') + tDistanceToCell;
              break;
            case DG.GraphTypes.EOrientation.kVertical:
            case DG.GraphTypes.EOrientation.kVertical2:
            case DG.GraphTypes.EOrientation.kRight:
              tCoordinate = this.get('pixelMin') - tDistanceToCell;
              break;
          }

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
          switch (this.get('orientation')) {
            case DG.GraphTypes.EOrientation.kVertical2:
              return this.isValidAttributeForScatterplot( iDrag) ||
                  this.isValidAttributeForPlotSplit( iDrag);
            case DG.GraphTypes.EOrientation.kTop:
            case DG.GraphTypes.EOrientation.kRight:
              return this.isValidAttributeForPlotSplit( iDrag);
            default:
              return DG.GraphDropTarget.isValidAttribute.call(this, iDrag);
          }
        },

        /**
         * Only called for a y2 axis view
         * @param iDrag
         * @return {boolean|*}
         */
        isValidAttributeForScatterplot: function( iDrag) {
          var tDragAttr = iDrag.data.attribute,
              tDataConfiguration = this.getDataConfiguration(),
              tDragAttrIsNominal = tDataConfiguration.attributeIsNominal(tDragAttr),
              tCurrAttr = this.getPath('model.attributeDescription.attribute'),
              tXAttrDescription = this.get('xAttributeDescription'),
              tXAttr = tXAttrDescription && tXAttrDescription.get('attribute'),
              tXIsNumeric = tXAttrDescription && tXAttrDescription.get('isNumeric'),
              tOtherYAttr = this.getPath('otherYAttributeDescription.attribute'),
              tValidForScatterplot = (tXAttr !== DG.Analysis.kNullAttribute && tXIsNumeric) &&
                  (tCurrAttr !== tDragAttr) &&
                  !tDragAttrIsNominal &&
                  tOtherYAttr && !tDataConfiguration.attributeIsNominal( tOtherYAttr);
          return tValidForScatterplot;
        }
      };
    }()));

