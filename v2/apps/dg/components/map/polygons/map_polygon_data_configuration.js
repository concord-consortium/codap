// ==========================================================================
//                      DG.MapPolygonDataConfiguration
//
//  Author:   William Finzer
//
//  Copyright ©2018 Concord Consortium
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
/* global L */
sc_require('components/map/map_data_configuration');

/** @class  DG.MapPolygonDataConfiguration - The object that describes the manner in which attributes are
 assigned to places in a map.

 @extends DG.MapDataConfiguration
 */
DG.MapPolygonDataConfiguration = DG.MapDataConfiguration.extend(
    /** @scope DG.MapPolygonDataConfiguration.prototype */
    {
      /**
       * It is in initialization that we specialize from base class
       */
      init: function () {

        var attributeDescriptions = {
              caption: DG.AttributePlacementDescription.create(),
              legend: DG.AttributePlacementDescription.create(),
              polygon: DG.AttributePlacementDescription.create()
            },
            tPlace,
            tCaptionName,
            tCaptionAttr, tPolygonAttr;

        sc_super();

        var configureAttributeDescriptions = function () {

          var configAttrDesc = function (iAttrPrefix, iAttr, iCollectionClient) {
            var attrDesc = attributeDescriptions[iAttrPrefix],
                tType;

            DG.assert(attrDesc);

            // Configure the attribute description for the specified default attribute
            if (iAttr) {
              // Must set collection before attribute for attribute stats to be configured properly
              attrDesc.set('collectionClient', iCollectionClient);
              attrDesc.set('attribute', iAttr);
              switch (iAttrPrefix) {
                case 'polygon':
                  tType = DG.Analysis.EAttributeType.eBoundary;
                  break;
                case 'caption':
                  tType = DG.Analysis.EAttributeType.eCategorical;
                  break;
              }
              if (tType)
                attrDesc.setPath('attributeStats.attributeType', tType);
            }
            // Null out the attribute description when no map attribute is specified.
            else {
              attrDesc.set('collectionClient', null);
              attrDesc.removeAllAttributes();
            }

            // We must set these up manually, because the infrastructure isn't in place by
            // the time sc_super() (i.e. SC.Object.init()) is called.
            attrDesc.addObserver('collectionClient', this, iAttrPrefix + 'CollectionDidChange');
            attrDesc.addObserver('collection', this, 'collectionDidChange');
          }.bind(this);

          // When called we are given an initializer with info we need to be valid
          var tMapContext = this.initializer.context,
              tMapCollection = this.initializer.collection,
              tMapCollectionClient = tMapContext && tMapContext.getCollectionByID(tMapCollection.get('id'));
          if (tMapCollection && tMapCollectionClient) {
            tCaptionName = tMapCollection.getAttributeNames()[0];
            tCaptionAttr = tCaptionName && tMapCollection.getAttributeByName(tCaptionName);
            tPolygonAttr = this.initializer.polygonName && tMapCollection.getAttributeByName(this.initializer.polygonName);

            configAttrDesc('caption', tCaptionAttr, tMapCollectionClient);
            configAttrDesc('legend', null, tMapCollectionClient);
            configAttrDesc('polygon', tPolygonAttr, tMapCollectionClient);
          }
        }.bind(this);

        // -- main routine of init
        configureAttributeDescriptions();

        // Prepare the attributes array. It has as many elements as there are places,
        //  and, initially, those elements are empty arrays.
        this.attributesByPlace = [];
        for (tPlace = 0; tPlace < DG.GraphTypes.EPlace.eNumPlaces; tPlace++)
          this.attributesByPlace[tPlace] = [];

        // Actually, during this coding transition, we're going to stash the previously
        // initialized attribute descriptions in attributesByPlace.
        this.attributesByPlace[DG.GraphTypes.EPlace.eCaption][0] = attributeDescriptions.caption;
        this.attributesByPlace[DG.GraphTypes.EPlace.eLegend][0] = attributeDescriptions.legend;
        this.attributesByPlace[DG.GraphTypes.EPlace.ePolygon][0] = attributeDescriptions.polygon;

        this.set('dataContext', this.initializer.context);

        delete this.initializer;  // We don't need it any more
      },

      /**
       * Override to return use the source that is used by either the polygon attribute or one of the lat/long attributes.
       * Note that we are assuming that _either_ the polygon attribute _or_ the xAttribute have a collection client. If
       * they both have collection clients and those are different, this won't be adequate.
       */
      collectionClient: function () {
        var tKeys = ['polygonAttributeDescription', 'xAttributeDescription'],
            tSource;
        tKeys.forEach(function (iAttrKey) {
          var tAttrDesc = this.get(iAttrKey);
          if (tAttrDesc && tAttrDesc.collectionClient)
            tSource = tAttrDesc.collectionClient;
        }.bind(this));
        return tSource;
      }.property(),

      /**
       * @property {SC.Array of DG.Case} All cases, both hidden and visible
       */
      allCases: function () {
        if( this.get('hasPolygonAttribute')) {
          var tSource = this.get('collectionClient');
          return tSource ? tSource.getPath('casesController.arrangedObjects') : [];
        }
        else return [];
      }.property(),

      /**
       @property { DG.AttributePlacementDescription }
       */
      polygonAttributeDescription: function (iKey, iValue) {
        return this.attributeDescriptionForPlace(iKey, iValue, DG.GraphTypes.EPlace.ePolygon);
      }.property(),

      polygonCollectionDidChange: function () {
        this.notifyPropertyChange('polygonCollectionClient');
      },

      polygonCollectionClient: function () {
        return this.getPath('polygonAttributeDescription.collectionClient');
      }.property().cacheable(),
      polygonCollectionClientDidChange: function() {
        this.notifyPropertyChange('polygonCollectionClient');
      }.observes('*polygonAttributeDescription.collectionClient'),

      polygonAttributeID: function () {
        return this.getPath('polygonAttributeDescription.attributeID');
      }.property(),
      polygonAttributeIDDidChange: function() {
        this.notifyPropertyChange('polygonAttributeID');
      }.observes('*polygonAttributeDescription.attributeID'),

      hasPolygonAttribute: function () {
        return !SC.none(this.get('polygonAttributeID'));
      }.property('polygonAttributeID'),

      /**
       @property { DG.AttributePlacementDescription }
       */
      captionAttributeDescription: function (iKey, iValue) {
        return this.attributeDescriptionForPlace(iKey, iValue, DG.GraphTypes.EPlace.eCaption);
      }.property(),

      captionCollectionDidChange: function () {
        this.notifyPropertyChange('captionCollectionClient');
      },

      captionCollectionClient: function () {
        return this.getPath('captionAttributeDescription.collectionClient');
      }.property(),
      captionCollectionClientDidChange: function() {
        this.notifyPropertyChange('captionCollectionClient');
      }.observes('*captionAttributeDescription.collectionClient'),

      captionAttributeID: function () {
        return this.getPath('captionAttributeDescription.attributeID');
      }.property(),
      captionAttributeIDDidChange: function() {
        this.notifyPropertyChange('captionAttributeID');
      }.observes('*captionAttributeDescription.attributeID'),

      /**
       * If there is an polygon attribute, go through its values, finding the rectangle that encompases all
       * the coordinates.
       * @returns {*[]}
       */
      getPolygonBounds: function () {
        var tCases = this.get('cases'),
            tPolygonID = this.get('polygonAttributeID'),
            tMinWest = 180, tMaxEast = -180, tMinSouth = 90, tMaxNorth = -90;
        if (!tPolygonID)
          return null;

        function processArrayOfCoords(iArrayOfCoords) {
          iArrayOfCoords.forEach(function (iPoint) {
            tMinSouth = Math.min(tMinSouth, iPoint[1]);
            tMaxNorth = Math.max(tMaxNorth, iPoint[1]);
            tMinWest = Math.min(tMinWest, iPoint[0]);
            tMaxEast = Math.max(tMaxEast, iPoint[0]);
          });
        }

        tCases.forEach(function (iCase) {
          try {
            var tFeature = JSON.parse(iCase.getValue(tPolygonID)),
                tCoords = tFeature.geometry.coordinates,
                tType = tFeature.geometry.type;
            tCoords.forEach(function (iArray) {
              switch (tType) {
                case 'Polygon':
                  processArrayOfCoords(iArray);
                  break;
                case 'MultiPolygon':
                  iArray.forEach(function (iSubArray) {
                    processArrayOfCoords(iSubArray);
                  });
                  break;
              }
            });
          }
          catch (er) {
            console.log(er);
          }
        });

        return L.latLngBounds([[tMinSouth, tMinWest], [tMaxNorth, tMaxEast]]);
      }

    });

