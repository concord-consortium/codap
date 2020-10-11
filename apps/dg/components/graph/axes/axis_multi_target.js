// ==========================================================================
//                            DG.AxisMultiTarget
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

/*
 * Under certain circumstances when user is dragging an attribute, this view displays a drop target
 * that allows the user to add more than one attribute to an axis.
 */

sc_require('components/graph/utilities/graph_drop_target');
sc_require('views/raphael_base');

/** @class  DG.AxisMultiTarget - A drop area for adding multiple attributes to a graph

 @extends DG.RaphaelBaseView, DG.GraphDropTarget
 */
DG.AxisMultiTarget = DG.RaphaelBaseView.extend( DG.GraphDropTarget,
  /** @scope DG.AxisMultiTarget.prototype */
  {

    classNameBindings: ['dragIsInside:dg-graph-drop-multi-background'],

    dragIsInside: false,

    dataConfiguration: null,

    /**
     We're adding attributes to this description
     @property { DG.AttributeDescription }
     */
    attributeDescription:null,

    /**
     We're adding attributes to this description
     @property { DG.AttributeDescription }
     */
    otherAttributeDescription:null,

    /**
     * @property {DG.Attribute}
     */
    plottedAttribute:function () {
      return this.getPath('attributeDescription.attribute');
    }.property(),

    /**
     * @property {DG.Attribute}
     */
    otherPlottedAttribute:function () {
      return this.getPath('otherAttributeDescription.attribute');
    }.property(),

    /**
     @property{Raphael element}
     */
    plusArea:null,

    /**
     * @property { width: {Number} height: {Number}}
     */
    desiredExtent:function () {
      return { width:this.getPath('parentView.layout.width') || 24, height:24 };
    }.property(),

    dragEntered:function ( iDragObject, iEvent ) {
      this.plusArea.addClass( 'dg-graph-drop-plus-fill' );
      this.set('dragIsInside', true);
      this.showDropHint({x: iEvent.clientX, y: iEvent.clientY});
    },

    dragExited:function ( iDragObject, iEvent ) {
      this.plusArea.removeClass( 'dg-graph-drop-plus-fill' );
      this.set('dragIsInside', false);
      this.hideDropHint();
    },

    /**
     * For adding a numeric attribute to the y-axis:
     * A dragged attribute is valid for such a drop if there is already at least one attribute
     * and the dragged attribute is not one of them.
     * If the dragged attribute is not nominal there must also be an attribute on the
     * 'other' axis since we only support multiple numeric attributes for scatter plots for now.
     * @param iDrag
     * @return {Boolean}
     */
    isValidAttribute: function( iDrag) {
      return this.isValidAttributeForScatterplot( iDrag) || this.isValidAttributeForPlotSplit( iDrag);
    },

    isValidAttributeForPlotSplit: function( iDrag) {
      return (iDrag.data.attribute !== this.getPath('dataConfiguration.topAttributeDescription.attribute')) &&
          DG.GraphDropTarget.isValidAttributeForPlotSplit.call(this, iDrag);
    },

    /**
     * @override
     * @param iDrag
     * @return {boolean|*}
     */
    isValidAttributeForScatterplot: function( iDrag) {
      var tDragAttr = iDrag.data.attribute,
          tDragAttrIsNominal = this.getDataConfiguration().attributeIsNominal(tDragAttr),
          tCurrAttr = this.get('plottedAttribute'),
          tXDescription = this.getPath('dataConfiguration.xAttributeDescription'),
          tCurrXAttr = tXDescription ? tXDescription.get('attribute') : DG.Analysis.kNullAttribute,
          tY1Description = this.getPath('dataConfiguration.yAttributeDescription'),
          tY1Attr = tY1Description ? tY1Description.get('attribute') : DG.Analysis.kNullAttribute,
          tValidForScatterplot = (tCurrXAttr !== DG.Analysis.kNullAttribute) &&
              (tY1Attr !== DG.Analysis.kNullAttribute) &&
              (tY1Attr !== tDragAttr) &&
              (tCurrAttr !== tDragAttr) &&
              tXDescription.get('isNumeric') &&
              tY1Description.get('isNumeric') &&
              !tDragAttrIsNominal;
      return tValidForScatterplot;
    },

    // Draw an orange frame to show we're a drop target.
    dragStarted:function ( iDrag ) {
      var kPadding = 3,
          kPlusWidth = 24,
          tIsValidForScatterplot = this.isValidAttributeForScatterplot( iDrag),
          tIsValidForPlotSplit = this.isValidAttributeForPlotSplit( iDrag);

      function pathForPlus() {
        return 'M-6,-18 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 v-6Z';
      }

      if( tIsValidForScatterplot || tIsValidForPlotSplit ) {
        this.set('isVisible', true);
        var tParentView = this.get('parentView');
        if( tParentView)
            tParentView.makeSubviewFrontmost( this);

        var tX = kPlusWidth / 2 + kPadding,
          tY = tX + 2 * kPadding;
        if( SC.none( this.plusArea ) ) {
          this.plusArea = this._paper.path( pathForPlus() )
            .addClass( this.kDropFrameClass );
        }
        this.plusArea.transform( '' )
          .transform( 'T' + tX + ',' + tY )
          .show();

        var tDraggedName = iDrag.data.attribute.get( 'name' ),
            tString = tIsValidForScatterplot ?
                'DG.GraphView.addAttribute'.loc( tDraggedName ) :
                'DG.GraphView.layoutPlotsSideBySide'.loc( tDraggedName);
        this.set( 'dropHintString', tString );
      }
    },

    dragEnded:function () {
      if( this.plusArea )
        this.plusArea.hide();
      this.set('isVisible', false);
    }

  } );

