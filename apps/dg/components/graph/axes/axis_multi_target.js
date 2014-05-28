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
      return { width:this.getPath('parentView.layout.width'), height:24 };
    }.property(),

    dragEntered:function ( iDragObject, iEvent ) {
      this.plusArea.addClass( 'graph-drop-plus-fill' );
      this.set('backgroundColor', Raphael.color('rgba(100%,100%,0%,50%)'));
      this.showDropHint();
    },

    dragExited:function ( iDragObject, iEvent ) {
      this.plusArea.removeClass( 'graph-drop-plus-fill' );
      this.set('backgroundColor', null);
      this.hideDropHint();
    },

    /**
     * A dragged attribute is valid for a drop if there is already at least one attribute
     * and the dragged attribute is not one of them. There must also be an attribute on the
     * 'other' axis since we only support multiple attributes for scatter plots for now.
     * TODO: It's not valid unless both axes are numeric
     * @param iDrag
     * @return {Boolean}
     */
    isValidAttribute: function( iDrag) {
      var tDragAttr = iDrag.data.attribute,
          tCurrAttr = this.get('plottedAttribute' ),
          tOtherAttr = this.get('otherPlottedAttribute');
      return (tOtherAttr !== DG.Analysis.kNullAttribute) &&
             (tCurrAttr !== DG.Analysis.kNullAttribute) &&
             (tCurrAttr !== tDragAttr);
    },

    // Draw an orange frame to show we're a drop target.
    dragStarted:function ( iDrag ) {
      var kPadding = 3,
          kPlusWidth = 24;

      function pathForPlus() {
        return 'M-6,-18 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 v-6Z';
      }

      if( this.isValidAttribute( iDrag ) ) {
        this.set('isVisible', true);

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
            tString = 'DG.GraphView.addAttribute'.loc( tDraggedName );
        this.set( 'dropHintString', tString );
      }
    },

    dragEnded:function () {
      if( this.plusArea )
        this.plusArea.hide();
      this.set('isVisible', false);
    }

  } );

