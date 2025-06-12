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
      attribute: function (iKey, iValue) {
        if (!SC.none(iValue)) {
          this._attributes = [iValue];
          this.setupStats();
        }
        return (this._attributes.length > 0) ? this._attributes[0] : DG.Analysis.kNullAttribute;
      }.property(),

      /**
       * Return my array of attributes.
       */
      attributes: function () {
        return this._attributes;
      }.property(),

      /**
       *
       * @param iIndex
       * @return {DG.Attribute} or -1 if none
       */
      attributeAt: function (iIndex) {
        if ((iIndex >= 0) && (iIndex < this._attributes.length))
          return this._attributes[iIndex];
        else
          return DG.Analysis.kNullAttribute;
      },

      /**
       *
       * @param iName {String}
       * @return {DG.AttributeModel}
       */
      attributeNamed: function (iName) {
        return this.get('attributes').find(function (iAttr) {
          return (iAttr.get('name') === iName);
        });
      },

      attributeIDAt: function (iIndex) {
        var tAttribute = this.attributeAt(iIndex);
        return (tAttribute !== DG.Analysis.kNullAttribute) ? tAttribute.get('id') : null;
      },

      /**
       * If not already present, adds the given attribute to my array.
       * @param iAttribute
       */
      addAttribute: function (iAttribute) {
        if( iAttribute) {
          if (!this._attributes.contains(iAttribute))
            this._attributes.push(iAttribute);
          this.setupStats();
          this.invalidateCaches();
          this.notifyPropertyChange('attribute');
          iAttribute.addObserver('collection', this, 'collectionDidChange');
        }
      },

      removeAttributeAtIndex: function (iIndex) {
        DG.assert(iIndex < this._attributes.length);
        var tAttribute = this._attributes[iIndex];
        this._attributes.splice(iIndex, 1);
        this.invalidateCaches();
        this.notifyPropertyChange('attribute');
        tAttribute.removeObserver('collection', this, 'collectionDidChange');
      },

      removeAttribute: function (iAttribute) {
        this._attributes.removeObject(iAttribute);
        this.invalidateCaches();
        this.notifyPropertyChange('attribute');
        iAttribute.removeObserver('collection', this, 'collectionDidChange');
      },

      removeAllAttributes: function () {
        this._attributes.forEach(function (iAttribute) {
          iAttribute.removeObserver('collection', this, 'collectionDidChange');
        }.bind(this));
        this._attributes = [];
        this.setPath('attributeStats.attributes', []);
        this.invalidateCaches();
        this.notifyPropertyChange('attribute');
      },

      removeAllAttributesButFirst: function () {
        while (this._attributes.length > 1) {
          this._attributes.pop().removeObserver('collection', this, 'collectionDidChange');
        }
        this.invalidateCaches();
        this.notifyPropertyChange('attribute');
      },

      collectionDidChange: function () {
        this.notifyPropertyChange('collection');
      },

      /**
       @property { DG.AttributeStats }
       */
      attributeStats: null,

      number_of_categories_limit: function( iKey, iValue) {
        if( iValue) {
          this.setPath('attributeStats.number_of_categories_limit', iValue);
        }
        return this.getPath('attributeStats.number_of_categories_limit');
      }.property(),

      /**
       * @property {[{String}]}
       */
      cellNames: function () {
        return this.getPath('attributeStats.cellNames');
      }.property(),
      cellNamesDidChange: function() {
        this.notifyPropertyChange('cellNames');
      }.observes('attributeStats.categoricalStats.cellNames'),

      /**
       * Note: True range is adjusted by offsetMinProportion.
       @property{{min:{Number}, max:{Number} isDataInteger:{Boolean}}}
       */
      minMax: function () {
        var tMinMax = this.getPath('attributeStats.minMax'),
            tRange = tMinMax.max - tMinMax.min;
        tMinMax.min -= this.get('offsetMinProportion') * tRange;
        return tMinMax;
      }.property(),
      minMaxDidChange: function () {
        this.notifyPropertyChange('minMax');
      }.observes('*attributeStats.minMax', 'offsetMinProportion'),

      /**
       * Set to cause minimum of numeric values to be offset downward by this proportion of the range.
       * Useful for keeping areas on a map from getting colored white.
       * @property{Number}
       */
      offsetMinProportion: 0,

      /**
       @private { Array of DG.Attribute }
       */
      _attributes: null,

      init: function () {
        this._attributes = [];  // Before sc_super() so observes can be set up
        sc_super();
        this.attributeStats = DG.AttributeStats.create();
      },

      /**

       */
      setupStats: function () {
        this.attributeStats.beginPropertyChanges();
        this.attributeStats.set('collectionClient', this.get('collectionClient'));
        this.attributeStats.set('attributes', this.get('attributes'));
        this.attributeStats.endPropertyChanges();
      },

      setCases: function (iCases) {
        this.attributeStats.setCases(iCases);
      },

      /**
       * Return ID of first attribute.
       @property { Number }
       */
      attributeID: function () {
        var tAttribute = this.get('attribute');
        return (tAttribute !== DG.Analysis.kNullAttribute) ? tAttribute.get('id') : null;
      }.property('attribute'),

      /**
       * Both datetime and numeric data are treated as numeric.
       @property {Boolean}
       */
      isNumeric: function () {
        var tType = this.get('attributeType');
        return tType === DG.Analysis.EAttributeType.eNumeric ||
            tType === DG.Analysis.EAttributeType.eDateTime;
      }.property('attributeType'),

      /**
       @property {Boolean}
       */
      isCategorical: function () {
        return this.get('attributeType') === DG.Analysis.EAttributeType.eCategorical;
      }.property('attributeType'),

      /**
       @property {Boolean}
       */
      isNull: function () {
        return this.get('attributeID') === null;
      }.property('attributeID'),

      /**
       @property {Boolean}
       */
      noAttributes: function () {
        var tAttributes = this.get('attributes');
        return !tAttributes || !SC.isArray(tAttributes) || (tAttributes.length === 0);
      }.property('attributes'),

      /**
       @property {Boolean}
       */
      hasFormula: function () {
        var tFormula = this.getPath('attribute.formula');
        return !SC.empty(tFormula);
      }.property(),

      /**
       @property {DG.Analysis.EAttributeType}
       */
      attributeType: function () {
        var tAttributeStats = this.get('attributeStats');
        if (SC.none(tAttributeStats))
          return DG.Analysis.EAttributeType.eNone;
        else
          return tAttributeStats.get('attributeType');
      }.property(),

      attributeTypeDidChange: function () {
        this.notifyPropertyChange('attributeType');
      }.observes('*attributeStats.attributeType'),

      /**
       @property {DG.Analysis.EAnalysisRole}
       */
      role: DG.Analysis.EAnalysisRole.eNone,

      /**
       @property { DG.CollectionClient }
       */
      collectionClient: null,

      collectionClientDidChange: function () {
        this.setPath('attributeStats.collectionClient',
            this.get('collectionClient'));
      }.observes('collectionClient'),

      /**
       Pass along to attribute stats
       @param {Array}  iCases - Array of DG.Case. These are the cases that are used for computation
       */
      invalidateCaches: function (iCases, iChange) {
        var stats = this.get('attributeStats');
        if (stats)
          stats.invalidateCaches(iCases, iChange);
        if (this._attributes.length === 0)
          this.setPath('attributeStats.attributeType', DG.Analysis.EAttributeType.eNone);
      },

      /**
       Pass along to attribute stats
       @param {Array}  iCases - Array of DG.Case. These are the cases that are used for computation
       */
      colorMapDidChange: function () {
        this.invalidateCaches();
        this.propertyDidChange('categoryMap');
      }.observes('attribute.categoryMap'),

      casesForCategory: function (iCellName) {
        var tCellMap = this.getPath('attributeStats.cellMap');
        return (tCellMap && tCellMap[iCellName]) ? tCellMap[iCellName].cases : [];
      }

    });

