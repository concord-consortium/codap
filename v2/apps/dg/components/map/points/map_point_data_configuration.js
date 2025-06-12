// ==========================================================================
//                      DG.MapPointDataConfiguration
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

/** @class  DG.MapPointDataConfiguration - The object that describes the manner in which latitude and
 *  longitude attributes are assigned to places in a map.

 @extends DG.MapDataConfiguration
 */
DG.MapPointDataConfiguration = DG.MapDataConfiguration.extend(
    /** @scope DG.MapPointDataConfiguration.prototype */
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
            },
            tPlace,
            tCaptionName,
            tCaptionAttr, tLatAttr, tLongAttr;

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
            tLatAttr = this.initializer.latName && tMapCollection.getAttributeByName(this.initializer.latName);
            tLongAttr = this.initializer.longName && tMapCollection.getAttributeByName(this.initializer.longName);

            configAttrDesc('caption', tCaptionAttr, tMapCollectionClient);
            configAttrDesc('x', tLongAttr, tMapCollectionClient);
            configAttrDesc('y', tLatAttr, tMapCollectionClient);
            configAttrDesc('legend', null, tMapCollectionClient);
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

        this.set('dataContext', this.initializer.context);

        delete this.initializer;  // We don't need it any more
      },

      /**
       * Override because we only exist if there is an x (long) attribute description
       */
      collectionClient: function () {
        return this.getPath('xAttributeDescription.collectionClient');
      }.property(),

      /**
       * @property {SC.Array of DG.Case} All cases, both hidden and visible
       */
      allCases: function () {
        var tSource = this.get('collectionClient');
        return tSource ? tSource.getPath('casesController.arrangedObjects') : null;
      }.property(),

      longAttributeDescription: function() {
        return this.get('xAttributeDescription');
      }.property('xAttributeDescription'),

      latAttributeDescription: function() {
        return this.get('yAttributeDescription');
      }.property('yAttributeDescription'),

      latAttributeID: function () {
        return this.getPath('yAttributeDescription.attributeID');
      }.property(),
      latAttributeIDDidChange: function () {
        this.notifyPropertyChange('latAttributeID');
      }.observes('*yAttributeDescription.attributeID'),

      longAttributeID: function () {
        return this.getPath('xAttributeDescription.attributeID');
      }.property(),
      longAttributeIDDidChange: function () {
        this.notifyPropertyChange('longAttributeID');
      }.observes('*xAttributeDescription.attributeID'),

      // These two bindings help us with API for connecting line model
      xVarIDBinding: '.longAttributeID',
      yVarIDBinding: '.latAttributeID',

      hasLatLongAttributes: function () {
        return !SC.none(this.get('latAttributeID')) && !SC.none(this.get('longAttributeID'));
      }.property('latAttributeID', 'longAttributeID'),

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
      captionCollectionClientDidChange: function () {
        this.notifyPropertyChange('captionCollectionClient');
      }.observes('*captionAttributeDescription.collectionClient'),

      captionAttributeID: function () {
        return this.getPath('captionAttributeDescription.attributeID');
      }.property(),
      captionAttributeIDDidChange: function () {
        this.notifyPropertyChange('captionAttributeID');
      }.observes('*captionAttributeDescription.attributeID'),

      getLatLongBounds: function () {

        var getRationalLongitudeBounds = function () {
              var tLongID = this.getPath('xAttributeDescription.attribute.id'),
                  tLongs = [];
              this.get('cases').forEach(function (iCase) {
                var tLong = iCase.getNumValue(tLongID);
                if (isFinite(tLong))
                  tLongs.push(tLong);
              });
              tLongs.sort(function (iV1, iV2) {
                return iV1 - iV2;
              });
              var tLength = tLongs.length,
                  tMin = tLongs[0],
                  tMax = tLongs[tLength - 1],
                  tMedian;
              while (tMax - tMin > 180) {
                tMin = Math.min(tMin, tLongs[0]);
                tMax = Math.max(tMax, tLongs[tLength - 1]);
                tMedian = tLongs[Math.floor(tLength / 2)];
                if (tMax - tMedian > tMedian - tMin) {
                  tMax -= 360;
                  if (tMax < tLongs[tLength - 2]) {
                    tMin = Math.min(tMin, tMax);
                    tMax = tLongs[tLength - 2];
                    tLongs.pop();
                  }
                }
                else {
                  tMin += 360;
                  if (tMin > tLongs[1]) {
                    tMax = Math.max(tMax, tMin);
                    tMin = tLongs[1];
                    tLongs.shift();
                  }
                }
                tLength = tLongs.length;
                if (tMax < tMin) {
                  var tTemp = tMax;
                  tMax = tMin;
                  tMin = tTemp;
                }
              }
              return {min: tMin, max: tMax};
            }.bind(this),

            isValid = function (iMinMax) {
              return DG.isFinite(iMinMax.min) && DG.isFinite(iMinMax.max);
            };

        var tLatMinMax = this.getPath('yAttributeDescription.attributeStats.minMax'),
            tLngMinMax = this.getPath('xAttributeDescription.attributeStats.minMax');

        if (tLngMinMax.max - tLngMinMax.min > 180)
          tLngMinMax = getRationalLongitudeBounds();

        var tSouthWest = [tLatMinMax.min, tLngMinMax.min],
            tNorthEast = [tLatMinMax.max, tLngMinMax.max],
            tBounds = (isValid(tLatMinMax) && isValid(tLngMinMax)) ? L.latLngBounds([tSouthWest, tNorthEast]) : null;
        return tBounds;
      }

    });

