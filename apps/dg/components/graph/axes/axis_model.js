// ==========================================================================
//                          DG.AxisModel
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

/** @class  The model for a graph axis.

  @extends SC.Object
*/
DG.AxisModel = SC.Object.extend(
/** @scope DG.AxisModel.prototype */ 
{
  /**
    Describes the physical location of the axis in the graph. One of: x, y, or legend.
    @property { DG.AttributePlacementDescription }
  */
  attributeDescription: null,

  /**
    The array of strings that will be used to label the axis.
    @property { Array of String }
    Note: This should be cacheable, but I couldn't make it work.
  */
  labels: function() {
    var tDesc = this.attributeDescription,
        tLabels = [];
    if( tDesc) {
      tDesc.get('attributes' ).forEach( function( iAttribute) {
        if( iAttribute !== DG.Analysis.kNullAttribute) {
          var tName = iAttribute.get('name' ),
              tUnit = iAttribute.get('unit' ),
              tThisLabel = tName + (!SC.empty( tUnit) ? ' (' + tUnit + ')' : '');
          tLabels.push( tThisLabel);
        }
      });
    }
    return tLabels;
  }.property('attributeDescription.attribute')/*.cacheable()*/,

  /**
    The string to use as a tooltip.
    @property { String }
  */
  labelDescription: function() {
    return this.getPath('attributeDescription.attribute.description') || '';
  }.property('attributeDescription.attribute')/*.cacheable()*/,

  /**
   *
   * @param iIndex
   * @return {String}
   */
  getLabelDescription: function( iIndex) {
    var tAttributes = this.getPath('attributeDescription.attributes');
    return (iIndex < tAttributes.length) ? tAttributes[ iIndex].get('description') : '';
  },

  firstAttributeName: function() {
    var tAttributes = this.getPath( 'attributeDescription.attributes' );
    if( SC.isArray( tAttributes ) && (tAttributes.length > 0) ) {
      return tAttributes[ 0].get( 'name' );
    }
    return '';
  }.property('attributeDescription.attributes'),

  /**
  One by default. Subclasses will likely override.
    @property {Number}
  */
  numberOfCells: function() {
    return 1;
  }.property().cacheable(),

  /**
      @protected
    @property { DG.GraphAnimator }
  */
  axisAnimator: null,

  /**
    @return{Number} always return 0
  */
  cellNameToCellNumber: function( iCellName) {
    return 0;
  },
  
  /**
  Must be overriden by subclasses
    @property {null}
  */
  isNumeric: null,

  /**
  Default implementation does nothing

    @param {Number} iLower - desired world coordinate lower bound
    @param {Number} iUpper - desired world coordinate upper bound
  */
  setLowerAndUpperBounds: function() {
  },

  /**
   * If I have an animation, end it.
   */
  stopAnimation: function() {
    var tAnimator = this.get('axisAnimator');
    if( !SC.none( tAnimator ) ) {
      tAnimator.endAnimation();
    }
  }

});

