// ==========================================================================
//                      DG.GraphDataConfiguration
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

sc_require('components/graph_map_common/plot_data_configuration');

/** @class  DG.GraphDataConfiguration - The object that describes the manner in which attributes are
    assigned to places in a graph.

  @extends DG.PlotDataConfiguration
*/
DG.GraphDataConfiguration = DG.PlotDataConfiguration.extend(
/** @scope DG.GraphDataConfiguration.prototype */ 
{
  topCollectionClient: function () {
    return this.getPath('topAttributeDescription.collectionClient');
  }.property(),

  rightCollectionClient: function () {
    return this.getPath('rightAttributeDescription.collectionClient');
  }.property(),

  topCollectionDidChange: function () {
    this.notifyPropertyChange('topCollectionClient');
  }.observes('*topAttributeDescription.collectionClient'),

  rightCollectionDidChange: function () {
    this.notifyPropertyChange('rightCollectionClient');
  }.observes('*rightAttributeDescription.collectionClient'),

  /**
   @property { DG.AttributePlacementDescription }
   */
  topAttributeDescription: function (iKey, iValue) {
    return this.attributeDescriptionForPlace(iKey, iValue, DG.GraphTypes.EPlace.eTopSplit);
  }.property(),

  /**
   @property { DG.AttributePlacementDescription }
   */
  captionAttributeDescription: function (iKey, iValue) {
    return this.attributeDescriptionForPlace(iKey, iValue, DG.GraphTypes.EPlace.eCaption);
  }.property(),

  /**
   @property { DG.AttributePlacementDescription }
   */
  rightAttributeDescription: function (iKey, iValue) {
    return this.attributeDescriptionForPlace(iKey, iValue, DG.GraphTypes.EPlace.eRightSplit);
  }.property(),

  topAttributeID: function () {
    return this.getPath('topAttributeDescription.attributeID');
  }.property(),

  rightAttributeID: function () {
    return this.getPath('rightAttributeDescription.attributeID');
  }.property(),

  topAttributeIDDidChange: function () {
    this.notifyPropertyChange('topAttributeID');
  }.observes('*topAttributeDescription.attributeID'),

  rightAttributeIDDidChange: function () {
    this.notifyPropertyChange('rightAttributeID');
  }.observes('*rightAttributeDescription.attributeID'),

  /**
   * It is in initialization that we specialize from base class
   */
  init: function() {

    var attributeDescriptions = {
          caption: DG.AttributePlacementDescription.create(),
          x: DG.AttributePlacementDescription.create(),
          y: DG.AttributePlacementDescription.create(),
          y2: DG.AttributePlacementDescription.create(),
          legend: DG.AttributePlacementDescription.create(),
          top: DG.AttributePlacementDescription.create(),
          right: DG.AttributePlacementDescription.create()
        },
        tPlace,
        tDefaults = DG.currDocumentController().collectionDefaults();

    sc_super();
    
    /**
        Utility function for use in confuguring the attribute descriptions
        @param  {String}    iAttrPrefix -- {'x','y','legend'}
        @param  {String}    iAttrInfix -- {'X','Y','Legend'}
        @param  {Number}    iNumericRole -- Numeric analysis role
        @param  {Number}    iCategoricalRole -- Categorical analysis role
     */
    var configAttrDesc = function( iAttrPrefix, iAttrInfix, iNumericRole, iCategoricalRole) {
      var attrDesc = attributeDescriptions[ iAttrPrefix],
          attrSpec = tDefaults['plot' + iAttrInfix + 'Attr'],
          isAttrNumeric = tDefaults['plot' + iAttrInfix + 'AttrIsNumeric'];
      isAttrNumeric = SC.none(isAttrNumeric) ? true : isAttrNumeric;
          
      DG.assert( attrDesc, 'Check for missing attribute description.');
      
      // Configure the attribute description for the specified default attribute
      if( attrSpec) {
        // Must set collection before attribute for attribute stats to be configured properly
        attrDesc.set('collectionClient', tDefaults.collectionClient);
        attrDesc.set('attribute', attrSpec);
        attrDesc.setPath('attributeStats.attributeType',
                        SC.none( attrSpec)
                            ? DG.Analysis.EAttributeType.eNone
                            : isAttrNumeric
                                ? DG.Analysis.EAttributeType.eNumeric
                                : DG.Analysis.EAttributeType.eCategorical);
        attrDesc.set('role',
                      SC.none( attrSpec)
                          ? DG.Analysis.EAnalysisRole.eNone
                          : isAttrNumeric ? iNumericRole : iCategoricalRole);
      }
      //
      // Null out the attribute description when no default attribute is specified.
      else {
        attrDesc.set('collectionClient', null);
        attrDesc.removeAllAttributes();
      }

      // We must set these up manually, because the infrastructure isn't in place by
      // the time sc_super() (i.e. SC.Object.init()) is called.
      attrDesc.addObserver('collectionClient', this, iAttrPrefix + 'CollectionDidChange');
      attrDesc.addObserver('collection', this, 'collectionDidChange');
    }.bind( this);
    
    configAttrDesc('x', 'X', DG.Analysis.EAnalysisRole.ePrimaryNumeric,
                             DG.Analysis.EAnalysisRole.ePrimaryCategorical);
    configAttrDesc('y', 'Y', DG.Analysis.EAnalysisRole.eSecondaryNumeric,
                             DG.Analysis.EAnalysisRole.eSecondaryCategorical);
    configAttrDesc('y2', 'Y2', DG.Analysis.EAnalysisRole.eSecondaryNumeric,
                             DG.Analysis.EAnalysisRole.eSecondaryCategorical);
    configAttrDesc('legend', 'Legend', DG.Analysis.EAnalysisRole.eLegendNumeric,
                                       DG.Analysis.EAnalysisRole.eLegendCategorical);
    attributeDescriptions.legend.addObserver('attributeStats.categoricalStats.cellMap', this, 'legendColorMapDidChange');

    // Prepare the attributes array. It has as many elements as there are places,
    //  and, initially, those elements are empty arrays.
    this.attributesByPlace = [];
    for( tPlace = 0; tPlace < DG.GraphTypes.EPlace.eNumPlaces; tPlace++)
      this.attributesByPlace[tPlace] = [];
    
    // Actually, during this coding transition, we're going to stash the previously
    // initialized attribute descriptions in attributesByPlace.
    this.attributeDescriptionForPlace('caption', attributeDescriptions.caption, DG.GraphTypes.EPlace.eCaption);
    this.attributeDescriptionForPlace('x', attributeDescriptions.x, DG.GraphTypes.EPlace.eX);
    this.attributeDescriptionForPlace('y', attributeDescriptions.y, DG.GraphTypes.EPlace.eY);
    this.attributeDescriptionForPlace('y2', attributeDescriptions.y2, DG.GraphTypes.EPlace.eY2);
    this.attributeDescriptionForPlace('legend', attributeDescriptions.legend, DG.GraphTypes.EPlace.eLegend);
    this.attributeDescriptionForPlace('topSplit', attributeDescriptions.top, DG.GraphTypes.EPlace.eTopSplit);
    this.attributeDescriptionForPlace('right', attributeDescriptions.right, DG.GraphTypes.EPlace.eRightSplit);
  },

  destroy: function () {
    var topDesc = this.get('topAttributeDescription'),
        rightDesc = this.get('rightAttributeDescription');

    if (topDesc)
      topDesc.removeObserver('collectionClient', this, 'topCollectionDidChange');
    if (rightDesc)
      rightDesc.removeObserver('collectionClient', this, 'rightCollectionDidChange');

    sc_super();
  },

  /**
   * We override so that we can make sure the caption attribute is set correctly
   */
  setAttributeAndCollectionClient: function () {
    sc_super();
    this.updateCaptionAttribute();
  },

  legendColorMapDidChange: function() {
    this._casesCache = null;
  },

  /**
   Returns true if this graph references attributes in collections with aggregate
   functions, which is useful when determining whether a graph needs to be redrawn.
   @property   {Boolean}
   */
  hasAggregates: function () {
    var tResult = sc_super();
    if( !tResult) {
      var collectionIDs = {},
          foundID,

          considerCollection = function (iDescriptor) {
            var collection = this.getPath(iDescriptor + 'AttributeDescription.collectionClient'),
                collectionID = collection && collection.get('id');
            if (!SC.none(collectionID))
              collectionIDs[collectionID] = collection;
          }.bind(this);

      // Consider each of our split collections in turn
      considerCollection('top');
      considerCollection('right');

      // Search through our set of collections, stopping on the first one that has aggregates.
      foundID = DG.ObjectMap.findKey(collectionIDs,
          function (iCollectionID, iCollection) {
            return iCollection && iCollection.get('hasAggregates');
          });
      tResult = !SC.none(foundID);
    }
    return tResult;
  }.property(),

  /**
   * @property {Boolean}
   */
  hasSplitAttribute: function() {
    return !!this.get('rightAttributeID') || !!this.get('topAttributeID');
  }.property( 'rightAttributeID', 'topAttributeID'),

  /**
   * Utility method
   */
  invalidateAttributeDescriptionCaches: function (iCases, iChange) {
    sc_super();
    if (this.get('topAttributeDescription'))
      this.get('topAttributeDescription').invalidateCaches(iCases, iChange);
    if (this.get('rightAttributeDescription'))
      this.get('rightAttributeDescription').invalidateCaches(iCases, iChange);
  },

  /**
   *
   * @returns {Boolean}
   */
  atLeastOneFormula: function () {
    var tProperties = ['topAttributeDescription', 'rightAttributeDescription'];
    return (sc_super() ||
        tProperties.some(function (iProperty) {
          return this.getPath(iProperty + '.hasFormula');
        }.bind(this)));
  }

});

