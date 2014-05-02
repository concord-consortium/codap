// ==========================================================================
//                    DG.AttributePlacementDescription
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

/** @class  DG.AttributePlacementDescription - A complete description of how an attribute is to be used.

  @extends SC.Object
*/
DG.AttributePlacementDescription = SC.Object.extend(
/** @scope DG.AttributePlacementDescription.prototype */ 
{
  /**
    @property { DG.Attribute }
  */
  attribute: function( iKey, iValue) {
    if( !SC.none( iValue)) {
      this._attributes = [ iValue];
      this.setupStats();
    }
    return (this._attributes.length > 0) ? this._attributes[ 0] : DG.Analysis.kNullAttribute;
  }.property(),

  /**
   * Return my array of attributes.
   */
  attributes: function() {
    return this._attributes;
  }.property(),

  /**
   *
   * @param iIndex
   * @return {DG.Attribute} or -1 if none
   */
  attributeAt: function( iIndex) {
    if((iIndex >= 0) && (iIndex < this._attributes.length))
      return this._attributes[ iIndex];
    else
      return DG.Analysis.kNullAttribute;
  },

  attributeIDAt: function( iIndex) {
    var tAttribute = this.attributeAt( iIndex);
    return ( tAttribute !== DG.Analysis.kNullAttribute) ? tAttribute.get('id') : null;
  },

  /**
   * If not already present, adds the given attribute to my array.
   * @param iAttribute
   */
  addAttribute: function( iAttribute) {
    if( !this._attributes.contains( iAttribute))
      this._attributes.push( iAttribute);
    this.setupStats();
    this.invalidateCaches();
    this.notifyPropertyChange('attribute');
  },

  removeAttributeAtIndex: function( iIndex) {
    DG.assert( iIndex < this._attributes.length);
    this._attributes.splice( iIndex, 1);
    this.invalidateCaches();
    this.notifyPropertyChange('attribute');
  },

  removeAttribute: function( iAttribute) {
    this._attributes.removeObject( iAttribute);
    this.invalidateCaches();
    this.notifyPropertyChange('attribute');
  },

  removeAllAttributes: function() {
    this._attributes = [];
    this.setPath('attributeStats.attributes', []);
    this.invalidateCaches();
    this.notifyPropertyChange('attribute');
  },

  /**
    @property { DG.AttributeStats }
  */
  attributeStats: null,

  /**
    @private { Array of DG.Attribute }
  */
  _attributes: null,

  init: function() {
    sc_super();
    this._attributes = [];
    this.attributeStats = DG.AttributeStats.create();
  },

  /**

  */
  setupStats: function() {
    this.attributeStats.beginPropertyChanges();
    this.attributeStats.set('collectionClient', this.get('collectionClient'));
    this.attributeStats.set('attributes', this.get('attributes'));
    this.attributeStats.endPropertyChanges();
  },

  /**
   * Return ID of first attribute.
    @property { Number }
  */
  attributeID: function() {
    var tAttribute = this.get('attribute');
    return (tAttribute !== DG.Analysis.kNullAttribute) ? tAttribute.get('id') : null;
  }.property('attribute'),

  /**
    @property {Boolean}
  */
  isNumeric: function() {
    var tAttributeType = this.get('attributeType');
    return tAttributeType === DG.Analysis.EAttributeType.eNumeric;
  }.property('attributeType'),
  
  /**
    @property {Boolean}
   */
  hasFormula: function() {
    var tFormula = this.getPath('attribute.formula');
    return !SC.empty( tFormula);
  }.property(),

  /**
    @property {DG.Analysis.EAttributeType}
  */
  attributeType: function() {
    var tAttributeStats = this.get('attributeStats');
    if( SC.none( tAttributeStats))
      return DG.Analysis.EAttributeType.eNone;
    else
      return tAttributeStats.get('attributeType');
  }.property('attributeStats.attributeType'),

  /**
    @property {DG.Analysis.EAnalysisRole}
  */
  role: DG.Analysis.EAnalysisRole.eNone,

  /**
    @property { DG.CollectionClient }
  */
  collectionClient: null,

  collectionClientDidChange: function() {
    this.setPath('attributeStats.collectionClient',
                 this.get('collectionClient'));
  }.observes('collectionClient'),

  /**
    Pass along to attribute stats
    @param {Array}  iCases - Array of DG.Case. These are the cases that are used for computation
  */
  invalidateCaches: function( iCases, iChange) {
    var stats = this.get('attributeStats');
    if( stats)
      stats.invalidateCaches( iCases, iChange);
  },

  casesForCategory: function( iCellName) {
    var tCellMap = this.getPath('attributeStats.cellMap');
    return tCellMap ? tCellMap[ iCellName] : [];
  }

});

