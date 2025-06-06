// ==========================================================================
//                            DG.LegendView
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

/** @class  DG.LegendView - The base class view for a graph legend.
  
  @extends DG.RaphaelBaseView
*/
DG.LegendView = DG.RaphaelBaseView.extend( DG.GraphDropTarget,

  (function()
  {
    var kVMargin = 3,
        kHMargin = 6;
    
    /** @scope DG.LegendView.prototype */
    return {
      displayProperties: ['model.attributeDescription.attribute', 'model.attributeDescription.attribute.categoryMap'],

      classNames: ['dg-legend-view'],

      /**
        The model on which this view is based.
        @property { DG.LegendModel }
      */
      model: null,

      /**
        A legend view is neither horizontal or vertical. Distinguish it from axes
        @property { String }
      */
      orientation: DG.GraphTypes.EOrientation.kNone,

      /**
       * @property {DG.CategoriesView}
       */
      categoriesView: null,

      /**
       * @property {DG.ChoroplethView}
       */
      choroplethView: null,

      modelDidChange: function() {
        this.setPath('categoriesView.model', this.get('model'));
        this.setPath('choroplethView.model', this.get('model'));
      }.observes('model'),

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
        var tLabelHeight = this.get('labelExtent').y,
            tExtent = tLabelHeight + (tLabelHeight === 0 ? 0 : 2 * kVMargin);
        switch( this.get('attributeType')) {
          case DG.Analysis.EAttributeType.eNumeric:
          case DG.Analysis.EAttributeType.eDateTime:
            tExtent += this.get('choroplethView').desiredExtent( tLabelHeight);
            break;
          case DG.Analysis.EAttributeType.eCategorical:
            tExtent += this.get('categoriesView').desiredExtent( tLabelHeight);
            break;
          case DG.Analysis.EAttributeType.eColor:
            // Only the label displays
            break;
        }
        return tExtent;
      }.property(),
      desiredExtentDidChange: function() {
        this.notifyPropertyChange('desiredExtent');
      }.observes('labelNode', '*model.numberOfCells',
          'model.attributeDescription.attributeStats.attributeType'),

      /**
      Return the extent of the label
        @property {Point as in { x, y }}
      */
      labelExtent: function() {
        var	kMinHeight = DG.RenderingUtilities.kCaptionFontHeight,
            tLabelNode = this.get('labelNode'),
            tBox;
        if( !SC.none( tLabelNode)) {
          tBox = tLabelNode.get('bBox');
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
            tText, tDescription;
        if( SC.none( this._paper))
          return;

        if( SC.none( this._labelNode)) {
          this._labelNode = DG.LabelNode.create({ paper: this._paper, rotation: 0,
            colorIndex: 0, numColors: 1,
            anchor: 'start'});
          this._labelNode.setDragLabelHandler( DG.DragLabelHandler.create({
            labelNode: this._labelNode,
            labelView: this._hiddenDragView,
            viewToAddTo: this,
            attributeDescription: this.getPath('model.attributeDescription'),
            attributeName: this.getPath('model.attributeDescription.attribute.name'),
            dataContext: this.getPath('model.dataConfiguration.dataContext')
          }) );

          tChangeHappened = true;
        }
        tText = this.getPath('model.label');
        // If the text has changed, we set it and notify
        if( tText !== this._labelNode.get('text')) {
          this._labelNode.set('text', tText );
          tChangeHappened = true;
        }
        tDescription = this.getPath('model.attributeDescription.attribute.description') + '—' +
                                    'DG.LegendView.attributeTooltip'.loc();
        if( tDescription !== this._labelNode.get('description')) {
          this._labelNode.set('description', tDescription );
          tChangeHappened = true;
        }
        if( tChangeHappened)
          this.notifyPropertyChange( 'labelNode', this._labelNode);

        if( SC.empty( tText))
          return null;
        else
          return this._labelNode;
      }.property(),

      labelNodeDidChange: function() {
        this.notifyPropertyChange('labelNode');
      }.observes('*model.label'),

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
      _hiddenDragView: null,

      init: function() {
        sc_super();

        this.categoriesView = DG.CategoriesView.create( {
          classNames: 'dg-categories'.w(),
          layout: { left: kHMargin, right: kHMargin, top: kVMargin, bottom: kVMargin },
          isVisible: false,
          model: this.get('model'),
          rowHeight: DG.RenderingUtilities.kDefaultFontHeight
        });
        this.appendChild( this.categoriesView);

        this.choroplethView = DG.ChoroplethView.create( {
          classNames: 'dg-choropleth'.w(),
          layout: { left: kHMargin, right: kHMargin, top: kVMargin, bottom: kVMargin },
          isVisible: false,
          model: this.get('model')
        });
        this.appendChild( this.choroplethView);

        this._hiddenDragView = SC.LabelView.create({
          classNames: 'dg-drag-label'.w(),
          layout: {width: 100, height: 20, top: -50, left: 0},
          value: ''
        });
        this.appendChild( this._hiddenDragView);
      },

      displayDidChange: function() {
        sc_super();
        this.get('choroplethView').displayDidChange();
        this.get('categoriesView').displayDidChange();
      },

      doDraw: function doDraw() {

        /**
         * renderLabel - Render the attribute name centered
         */
        var renderLabel = function() {
          var tLabelNode = this.get('labelNode'),
              tLabelExtent = this.get('labelExtent'),
              tDescription = this.getPath('model.attributeDescription.attribute.description') + '—' +
                  'DG.LegendView.attributeTooltip'.loc();
          if( SC.none( tLabelNode))
            return;

          tLabelNode.get('_textElement').attr({ text: this.getPath('model.label'),
                            x: kHMargin, y: tLabelExtent.y / 2});
          tLabelNode.get('_textElement').attr({ title: tDescription});
        }.bind( this);

        var tCategoriesView = this.get('categoriesView'),
            tChoroplethView = this.get('choroplethView');
        renderLabel();
        switch( this.get('attributeType')) {
          case DG.Analysis.EAttributeType.eNumeric:
          case DG.Analysis.EAttributeType.eDateTime:
            tChoroplethView.set('isVisible', true);
            tCategoriesView.set('isVisible', false);
            tChoroplethView.adjust('top', kVMargin + this.get('labelExtent').y);
            break;
          case DG.Analysis.EAttributeType.eCategorical:
            tCategoriesView.adjust('top', kVMargin + this.get('labelExtent').y);
            tCategoriesView.set('isVisible', true);
            tChoroplethView.set('isVisible', false);
            break;
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
        this.hideDropHint();
        this.set('dragData', iDragObject.data);
        return SC.DRAG_LINK;
      },

      /**
        @property { Number }  Takes into account any borders the parent views may have
        [SCBUG]
      */
      drawWidth: function() {
        return Math.max( 0, this.get('frame').width - 2 * DG.ViewUtilities.kBorderWidth);
      }.property('frame'),

      /**
       * isNumeric
       * @property {Boolean}
       */
      isNumeric: function() {
        return this.getPath('model.isNumeric');
      }.property(),

      isNumericDidChange: function() {
        // TODO: Check whether this function is necessary.
        // Is anyone listening for 'isNumeric' notifications from the view?
        // If so, they should be listening to the model instead.
        this.notifyPropertyChange('isNumeric');
      }.observes('*model.isNumeric'),

      /**
       * attributeType
       * @property {DG.Analysis.EAttributeType}
       */
      attributeType: function() {
        return this.getPath('model.attributeDescription.attributeType');
      }.property(),

      attributeTypeDidChange: function() {
        this.notifyPropertyChange('attributeType');
        this.displayDidChange();
      }.observes('*model.attributeDescription.attributeStats.attributeType')

    };
  }()));

