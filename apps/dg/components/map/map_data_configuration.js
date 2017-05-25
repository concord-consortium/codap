// ==========================================================================
//                      DG.MapDataConfiguration
//
//  Author:   William Finzer
//
//  Copyright ©2014 Concord Consortium
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
sc_require('components/graph_map_common/plot_data_configuration');

/** @class  DG.MapDataConfiguration - The object that describes the manner in which attributes are
 assigned to places in a map.

 @extends DG.PlotDataConfiguration
 */
DG.MapDataConfiguration = DG.PlotDataConfiguration.extend(
    /** @scope DG.MapDataConfiguration.prototype */
    {
      /**
       * It is in initialization that we specialize from base class
       */
      init: function () {

        var attributeDescriptions = {
              caption: DG.AttributePlacementDescription.create(),
              x: DG.AttributePlacementDescription.create(),
              y: DG.AttributePlacementDescription.create(),
              legend: DG.AttributePlacementDescription.create(),
              area: DG.AttributePlacementDescription.create()
            },
            tPlace,
            tMapContext,
            tCaptionName, tLatName, tLongName, tAreaName,
            tCaptionAttr, tLatAttr, tLongAttr, tAreaAttr,
            kLatNames = ['latitude', 'lat', 'Latitude', 'Lat', 'LAT', 'LATITUDE', 'LATITUD', 'latitud'],
            kLongNames = ['longitude', 'long', 'lng', 'Longitude', 'Long', 'Lng', 'LONG', 'LON',
              'LONGITUDE', 'LONGITUD', 'longitud'],
            kAreaNames = ['boundary', 'area', 'polygon', 'Boundary', 'Area', 'Polygon'];

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
                case 'x':
                case 'y':
                  tType = DG.Analysis.EAttributeType.eNumeric;
                  break;
                case 'area':
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

          var tMapCollection, tMapCollectionClient;
          DG.currDocumentController().get('contexts').forEach(function (iContext) {
            iContext.get('collections').forEach(function (iCollection) {
              var tAttrNames = (iCollection && iCollection.getAttributeNames()) || [],
                  tFoundLat = kLatNames.some(function (iName) {
                    if (tAttrNames.indexOf(iName) >= 0) {
                      tLatName = iName;
                      return true;
                    } else
                      return false;
                  }),
                  tFoundLong = kLongNames.some(function (iName) {
                    if (tAttrNames.indexOf(iName) >= 0) {
                      tLongName = iName;
                      return true;
                    } else
                      return false;
                  }),
                  tFoundArea = kAreaNames.some(function (iName) {
                    if (tAttrNames.indexOf(iName) >= 0) {
                      tAreaName = iName;
                      return true;
                    } else
                      return false;
                  });

              if ((tFoundLat && tFoundLong) || tFoundArea) {
                tMapContext = iContext;
                tMapCollection = iCollection;
                tMapCollectionClient = iContext.getCollectionByID( iCollection.get('id'));
              }
              if( SC.none( tAreaName)) {  // Try for an attribute that has a boundary type
                ((iCollection && iCollection.get('attrs')) || []).forEach( function( iAttr) {
                  if( iAttr.get('type') === 'boundary')
                    tAreaName = iAttr.get('name');
                });
              }
            });
          });
          if (tMapCollection && tMapCollectionClient) {
            tCaptionName = tMapCollection.getAttributeNames()[0];
            tCaptionAttr = tCaptionName && tMapCollection.getAttributeByName(tCaptionName);
            tLatAttr = tLatName && tMapCollection.getAttributeByName(tLatName);
            tLongAttr = tLongName && tMapCollection.getAttributeByName(tLongName);
            tAreaAttr = tAreaName && tMapCollection.getAttributeByName(tAreaName);

            configAttrDesc('caption', tCaptionAttr, tMapCollectionClient);
            configAttrDesc('x', tLongAttr, tMapCollectionClient);
            configAttrDesc('y', tLatAttr, tMapCollectionClient);
            configAttrDesc('legend', null, tMapCollectionClient);
            configAttrDesc('area', tAreaAttr, tMapCollectionClient);
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
        this.attributesByPlace[DG.GraphTypes.EPlace.eX][0] = attributeDescriptions.x;
        this.attributesByPlace[DG.GraphTypes.EPlace.eY][0] = attributeDescriptions.y;
        this.attributesByPlace[DG.GraphTypes.EPlace.eLegend][0] = attributeDescriptions.legend;
        this.attributesByPlace[DG.GraphTypes.EPlace.eArea][0] = attributeDescriptions.area;
        this.set('dataContext', tMapContext);
      },

      /**
       * Override to return use the source that is used by either the area attribute or one of the lat/long attributes.
       * Note that we are assuming that _either_ the area attribute _or_ the xAttribute have a collection client. If
       * they both have collection clients and those are different, this won't be adequate.
       */
      collectionClient: function () {
        var tKeys = ['areaAttributeDescription', 'xAttributeDescription'],
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
        if( this.get('hasAreaAttribute') || this.get('hasLatLongAttributes')) {
          var tSource = this.get('collectionClient');
          return tSource ? tSource.getPath('casesController.arrangedObjects') : null;
        }
      }.property(),

      /**
       @property { DG.AttributePlacementDescription }
       */
      areaAttributeDescription: function (iKey, iValue) {
        return this.attributeDescriptionForPlace(iKey, iValue, DG.GraphTypes.EPlace.eArea);
      }.property(),

      areaCollectionDidChange: function () {
        this.notifyPropertyChange('areaCollectionClient');
      },

      areaCollectionClient: function () {
        return this.getPath('areaAttributeDescription.collectionClient');
      }.property().cacheable(),
      areaCollectionClientDidChange: function() {
        this.notifyPropertyChange('areaCollectionClient');
      }.observes('*areaAttributeDescription.collectionClient'),

      latAttributeID: function () {
        return this.getPath('yAttributeDescription.attributeID');
      }.property(),
      latAttributeIDDidChange: function() {
        this.notifyPropertyChange('latAttributeID');
      }.observes('*yAttributeDescription.attributeID'),

      longAttributeID: function () {
        return this.getPath('xAttributeDescription.attributeID');
      }.property(),
      longAttributeIDDidChange: function() {
        this.notifyPropertyChange('longAttributeID');
      }.observes('*xAttributeDescription.attributeID'),

      // These two bindings help us with API for connecting line model
      xVarIDBinding: '.longAttributeID',
      yVarIDBinding: '.latAttributeID',

      hasLatLongAttributes: function () {
        return !SC.none(this.get('latAttributeID')) && !SC.none(this.get('longAttributeID'));
      }.property('latAttributeID', 'longAttributeID'),

      areaAttributeID: function () {
        return this.getPath('areaAttributeDescription.attributeID');
      }.property(),
      areaAttributeIDDidChange: function() {
        this.notifyPropertyChange('areaAttributeID');
      }.observes('*areaAttributeDescription.attributeID'),

      hasAreaAttribute: function () {
        return !SC.none(this.get('areaAttributeID'));
      }.property('areaAttributeID'),

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

      getLatLongBounds: function () {
        var tLatMinMax = this.getPath('yAttributeDescription.attributeStats.minMax'),
            tLngMinMax = this.getPath('xAttributeDescription.attributeStats.minMax'),
            tSouthWest = [tLatMinMax.min, tLngMinMax.min],
            tNorthEast = [tLatMinMax.max, tLngMinMax.max];
        return L.latLngBounds([tSouthWest, tNorthEast]);
      },

      /**
       * If there is an area attribute, go through its values, finding the rectangle that encompases all
       * the coordinates.
       * @returns {*[]}
       */
      getAreaBounds: function () {
        var tCases = this.get('cases'),
            tAreaID = this.get('areaAttributeID'),
            tMinWest = 180, tMaxEast = -180, tMinSouth = 90, tMaxNorth = -90;
        if (!tAreaID)
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
            var tFeature = JSON.parse(iCase.getValue(tAreaID)),
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

