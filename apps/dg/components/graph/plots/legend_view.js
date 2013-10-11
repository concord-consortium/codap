// ==========================================================================
//                            DG.LegendView
//
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

/** @class  DG.LegendView - The base class view for a graph legend.
  
  @extends DG.RaphaelBaseView
*/
DG.LegendView = DG.RaphaelBaseView.extend( DG.GraphDropTarget,

  (function()
  {
    var kMinWidth = 150, // of a cell. Used to determine how many columns
        kVMargin = 3,
        kHMargin = 12;  // Could be dynamic
    
    /** @scope DG.LegendView.prototype */
    return {
      displayProperties: ['model.attributeDescription.attribute',
                          'model.attributeDescription.attributeStats.categoricalStats.numberOfCells',
                          'model.numericRange'],

      /**
        The model on which this view is based.
        @property { DG.LegendModel }
      */
      model: null,

      /**
        A legend view is always horizontal
        @property { String }
      */
      orientation: 'horizontal',

      /**
       * @property {DG.Attribute}
       */
      plottedAttribute: function() {
        return this.getPath('model.attributeDescription.attribute');
      }.property(),

      /**
       * For a numeric legend we just need a single row for the color gradient rectangle.
       * For a categorical legend, we'll put two categories in each row.
       *
        @property { Number }
      */
      desiredExtent: function() {
        var tWidth = this.getPath('parentView.frame.width') || kMinWidth,
            tNumColumns = Math.max( 2, Math.floor( tWidth / kMinWidth )),
            tLabelHeight = this.get('labelExtent').y,
            tNumCells = this.model ? this.getPath('model.numberOfCells') : 0,
            tNumRows = this.get('isNumeric') ? 3 : (1 + Math.ceil( tNumCells / tNumColumns)),
            tExtent = tNumRows * tLabelHeight;
        DG.assert( isFinite(tExtent));
        return tExtent;
      }.property('labelNode', 'model.numberOfCells'),

      /**
      Return the extent of the label
        @property {Point as in { x, y }}
      */
      labelExtent: function() {
        var	kMinHeight = DG.RenderingUtilities.kCaptionFontHeight,
            tLabelNode = this.get('labelNode'),
            tBox;
        if( !SC.none( tLabelNode)) {
          tBox = tLabelNode.getBBox();
          return { x: isNaN(tBox.width) ? kMinHeight : Math.max( kMinHeight, tBox.width),
                   y: isNaN(tBox.height) ? kMinHeight : Math.max( kMinHeight, Math.ceil( tBox.height / 2) * 2) };
        }
        return { x: 0, y: 0};
      }.property('labelNode').cacheable(),

      /**
      The Raphael element used to display the label.
        @property {Raphael element}
      */
      labelNode: function() {
        var tChangeHappened = false,
            tText;
        if( SC.none( this._paper))
          return;

        if( SC.none( this._labelNode)) {
          this._labelNode = this._paper.text( 0, 0, '')
              .attr( { font: 'caption', fill: 'blue', cursor: 'pointer',
                    title: SC.String.loc( 'DG.LegendView.attributeTooltip'), 'text-anchor': 'start'});
          this._labelNode.node.setAttribute( 'text-decoration', 'underline');
          tChangeHappened = true;
        }
        tText = this.getPath('model.label');
        // If the text has changed, we set it and notify
        if( tText !== this._labelNode.attr( 'text')) {
          this._labelNode.attr({ text: tText });
          tChangeHappened = true;
        }
        if( tChangeHappened)
          this.notifyPropertyChange( 'labelNode', this._labelNode);

        if( SC.empty( tText))
          return null;
        else
          return this._labelNode;
      }.property('model.label'),

      /**
       * Clients expect to be able to get an array, even though we only ever have one labelNode.
       * @return {Array}
       */
      labelNodes: function() {
        var tLabelNode = this.get('labelNode');
        if( tLabelNode)
          return [ tLabelNode ];
        else
          return [];
      }.property('labelNode'),

      /**
       * @private
       * @property {Raphael element}
       */
      _labelNode: null,

      /**
       * @private
       * @property {Raphael element} Used to display continuous scale as a color gradient
       */
      _gradientRect: null,

      doDraw: function doDraw() {
        var this_ = this,
            tAttrDesc = this.getPath('model.attributeDescription'),
            tAttrStats = tAttrDesc.get('attributeStats'),
            tWidth = this_._paper.width - 2 * kHMargin,
            tHeight = this_._paper.height - 2 * kVMargin
          ;

        /**
         * renderLabel - Render the attribute name centered
         */
        function renderLabel() {
          var tLabelNode = this_.get('labelNode'),
              tLabelExtent = this_.get('labelExtent');
          if( SC.none( tLabelNode))
            return;
          tLabelNode.attr({ text: this_.getPath('model.label'),
                            x: kHMargin, y: tLabelExtent.y / 2 });
        }

        /**
         * drawNumericScale
         */
        function drawNumericScale() {
          var tAttrColor = DG.ColorUtilities.calcAttributeColor( tAttrDesc).colorString,
              tMinMax = tAttrStats.get('minMax'),
              tMin = pv.Format.number().fractionDigits( 0, 2)(tMinMax.min),
              tMax = pv.Format.number().fractionDigits( 0, 2)(tMinMax.max),
              tLabelHeight = this_.get('labelExtent').y,
              kStrokeWidth = 0.5,
              kMaxTicks = 4,
              kTickLength = 3,
              tTick,
              useSafariBugWorkaround = (SC.browser.isSafari),
              tRect = { stroke: tAttrColor,
                        'stroke-width': kStrokeWidth,
                        width: tWidth,
                        height: tHeight / 3,
                        fill: ('0-#fff-' + tAttrColor )}; // Gradient from white to attribute color at 0 degrees

          // create or update the gradient rectangle
          if( useSafariBugWorkaround ) {
            // temporary code to fix Bug 425 - Gradient bars in the legend show up as black in Safari
            this_._elementsToClear.push( this_._paper.rect( kHMargin, kVMargin + tLabelHeight, 0, 0).attr( tRect ) );
            // In Safari 5.1.1, the gradient rectangle renders correctly when first created, but resizes and rerenderings
            // draw a black filled rectangle instead, so for our workaround we just re-create the rectangle every time.
            // Failed test #1: this mysterious fix from Rafael appears to do nothing for us.
            // In FireFox and *WebKit* the gradient is correct every time.
            // which implies that the bug may migrate from Webkit to Safari and we can remove the special workaround.
            // Rafael docs say "There is an inconvenient rendering bug in Safari (WebKit): sometimes the rendering should be forced. This method should help with dealing with this bug. "
            //this_._paper.safari();
            // Failed test #2: This log string outputs the exact gradient data, which can then be pasted in to the Rafael playground app
            // console.log("using safari workaround; gradient for http://raphaeljs.com/playground.html below:");
            // Tests show that the gradient displays correctly in the playground (CDM 2011-11-29)
            //console.log( "paper.rect(" + kHMargin +","+ (kVMargin + tLabelHeight) + ", 0, 0).attr( " + JSON.stringify(tRect ) + ")");
          }
          else {
            // original code: create the rect, update the parameters, and show if hidden
            if( SC.none(this_._gradientRect)) {
              this_._gradientRect = this_._paper.rect( kHMargin, kVMargin + tLabelHeight, 0, 0);
            }
            this_._gradientRect.attr( tRect ).show();
          }

          // re-create the tick marks every time
          for( tTick = 0; tTick <= kMaxTicks; tTick++) {
            var tX = kHMargin + kStrokeWidth + tTick * (tWidth - 2 * kStrokeWidth) / 4,
                tBaseline = kVMargin + tLabelHeight + tHeight / 3;
            this_._elementsToClear.push(
                  this_._paper.line( tX, tBaseline,
                                     tX, tBaseline + kTickLength)
                    .attr( { stroke: tAttrColor }));
          }
          var tTextY = kVMargin + tLabelHeight + tHeight / 3 + kTickLength + DG.RenderingUtilities.kDefaultFontHeight / 2;
          this_._elementsToClear.push( this_._paper.text( kHMargin + kStrokeWidth, tTextY, tMin));
          this_._elementsToClear.push( this_._paper.text( kHMargin + tWidth - 2 * kStrokeWidth, tTextY, tMax));
        }

        /**
         * drawCategoriesKey
         */
        function drawCategoriesKey() {
          var tNumColumns = Math.max( 2, Math.floor( tWidth / kMinWidth) ),
              tNumCells = this_.getPath('model.numberOfCells'),
              tNumRows = Math.ceil( tNumCells / tNumColumns),
              tRowHeight = tHeight / (tNumRows + 1), // adding one to include label
              tSize = tRowHeight - 2 * kVMargin,
              tCellIndex,
              tCellNames = this_.getPath('model.cellNames')
            ;

          // Function passed to Raphael mouseDown event handler, which guarantees
          // that 'this' correctly refers to the Raphael element being called.
          function selectCasesInRectCell( iEvent) {
            this_.get('model').selectCasesInCell( this.cellName, iEvent.shiftKey);
          }
          
          // Function passed to Raphael mouseDown event handler, which guarantees
          // that 'this' correctly refers to the Raphael element being called.
          function selectCasesInTextCell( iEvent) {
            this_.get('model').selectCasesInCell( this.attr('text'), iEvent.shiftKey);
          }
          
          for( tCellIndex = 0; tCellIndex < tNumCells; tCellIndex++) {
            var tName = tCellNames[ tCellIndex],
                tColor = DG.ColorUtilities.calcCaseColor( tName, tAttrDesc).colorString,
                tRow = Math.floor( tCellIndex / tNumColumns),
                tCol = tCellIndex % tNumColumns,
                tX = kHMargin + tCol * tWidth / tNumColumns,
                tY = kVMargin + (tRow + 1) * tRowHeight,
                tRectElement = this_._paper.rect( tX, tY, tSize, tSize)
                                                          .attr({ fill: tColor })
                                                          .addClass( DG.PlotUtilities.kLegendKey)
                                                          .mousedown( selectCasesInRectCell);
            tRectElement.cellName = tName;
            this_._elementsToClear.push( tRectElement);
            this_._elementsToClear.push( this_._paper.text( tX + tRowHeight,
                                                            tY + DG.RenderingUtilities.kDefaultFontHeight / 3,
                                                            tName)
                                                    .attr({ 'text-anchor': 'start' })
                                                    .addClass( DG.PlotUtilities.kLegendKeyName)
                                                    .mousedown( selectCasesInTextCell)
                                                  );
          }
        }

        renderLabel();
        if( this.get('isNumeric'))
          drawNumericScale();
        else {
          if( this._gradientRect)
            this._gradientRect.hide();
          drawCategoriesKey();
        }
      },

      /**
        Graph controller observes this property to detect that a drag has taken place.
        @property {collection:{DG.CollectionRecord}, attribute:{DG.Attribute}, text:{String}}
      */
        dragData: null,

      /**
        Attempt to assign the given attribute to this legend view.
        @param {SC.Drag} 'data' property contains 'collection', 'attribute', 'text' properties
        @param {SC.DRAG_LINK}
      */
      performDragOperation: function( iDragObject, iDragOp) {
        this.set('dragData', iDragObject.data);
        return SC.DRAG_LINK;
      },

      /**
        @property { Number }  Takes into account any borders the parent views may have
        [SCBUG]
      */
      drawWidth: function() {
        return this.get('frame').width - 2 * DG.ViewUtilities.kBorderWidth;
      }.property('frame'),

      /**
        @property { Number }  Takes into account any borders the parent views may have
        [SCBUG]
      */
      drawHeight: function() {
        return this.get('frame').height;
      }.property('frame'),

      /**
       * isNumeric
       * @property {Boolean}
       */
      isNumeric: function() {
        return this.getPath('model.attributeDescription.isNumeric');
      }.property('model.attributeDescription.isNumeric'),

      attributeTypeDidChange: function() {
        this.displayDidChange();
      }.observes('.model.attributeDescription.attributeStats.attributeType')

    };
  }()));

