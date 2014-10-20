// ==========================================================================
//                            DG.MapGridModel
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

/** @class  DG.MapGridModel - The model for a grid being displayed on a map.

 @extends SC.Object
 */
DG.MapGridModel = SC.Object.extend((function () // closure
/** @scope DG.MapGridModel.prototype */ {

  function RectRecord(iRect) {
    this.rect = iRect;
    this.count = 0;
  }

  function RectArray() {
    this.maxCount = 0;

    this.rectangles = [
      []
    ];
    this.getRect = function (iLongIndex, iLatIndex) {
      return this.rectangles[iLongIndex][iLatIndex];
    };
    this.setRect = function(iLongIndex, iLatIndex, iRect) {
      if(!this.rectangles[iLongIndex])
        this.rectangles[iLongIndex] = [];
      this.rectangles[iLongIndex][iLatIndex] = iRect;
    };

    this.forEachRect = function( iFunc) {
      this.rectangles.forEach( function(iLongArray) {
        iLongArray.forEach( function( iRect) {
          iFunc( iRect);
        });
      });
    };

    this.incrementCount = function( iLongIndex, iLatIndex) {
      var tRect = this.getRect( iLongIndex, iLatIndex);
      if( tRect) {
        tRect.count++;
        this.maxCount = Math.max(this.maxCount, tRect.count);
      }
    };
  };

  return {
    /**
     * Here we get access to the cases being plotted so we can determine how many points are in a grid rectangle
     * {@property DG.MapDataConfiguration}
     */
    dataConfiguration: null,

    /**
     * {@property L.latLngBounds}
     */
    bounds: null,

    /**
     * We keep track of the latitude and longitude of a reference point
     */
    refLat: null, // Number (degrees)
    refLong: null, // Number (degrees)

    /**
     * The grid has a width and height measured in degrees
     */
    gridWidth: null, // Number (degrees)
    gridHeight: null, // Number (degrees)

    startWest: null, // Number (degrees) - Left edge of grid
    startSouth: null, // Number (degrees) - Bottom edige of grid

    /**
     * A 2-dimensional array of objects, each of which consists of a rectangle and a count
     * {@property {[][]}
     */
    rectArray: null,

    maxCount: function() {
      return this.get('rectArray').maxCount;
    }.property(),

    /**
     * {@property Boolean}
     */
    visible: false,

    init: function() {
      sc_super();

      this.rectArray = new RectArray();
    },

    forEachRect: function( iFunc) {
      this.get('rectArray').forEachRect( iFunc);
    },

    /**
     * Called with lat and long of bounds to allow a default grid to be chosen with the center of the bounds
     * as the reference point and 1/10 of the bounds width and height as the grid width and height.
     * {@param L.latLngBounds}
     */
    setDefaultGrid: function (iBounds) {
      if (!iBounds)
        return;
      var tCenter = iBounds.getCenter(),
          tNorth = iBounds.getNorth(),
          tWest = iBounds.getWest(),
          tSouth = iBounds.getSouth(),
          tEast = iBounds.getEast();
      this.beginPropertyChanges();
        this.set('refLat', tCenter.lat);
        this.set('refLong', tCenter.lng);
        this.set('gridWidth', (tEast - tWest) / 20);
        this.set('gridHeight', (tNorth - tSouth) / 20);
        this.set('bounds', iBounds);
      this.endPropertyChanges();
      this.setupRectangles();
      this.computeCounts();
    },

    /**
     * We figure out the grid using the default settings.
     */
    setupRectangles: function() {
      var tRectArray = this.get('rectArray'),
          tBounds = this.get('bounds'),
          tGridWidth = this.get('gridWidth'),
          tWest = tBounds.getWest(),
          tRefLong = this.get('refLong'),
          tNumToWest = Math.ceil((tRefLong - tWest) / tGridWidth),
          tFirstWest = tRefLong - tGridWidth * tNumToWest,

          tGridHeight = this.get('gridHeight'),
          tSouth = tBounds.getSouth(),
          tRefLat = this.get('refLat'),
          tNumToSouth = Math.ceil((tRefLat - tSouth) / tGridHeight),
          tFirstSouth = tRefLat - tGridHeight * tNumToSouth,
          tLatIndex, tLongIndex;

      for( tLongIndex = 0 ; tLongIndex < 2 * tNumToWest; tLongIndex++) {
        for( tLatIndex = 0; tLatIndex < 2 * tNumToSouth; tLatIndex++) {
          tRectArray.setRect( tLongIndex, tLatIndex, new RectRecord( [
            [tFirstSouth + tLatIndex * tGridHeight, tFirstWest + tLongIndex * tGridWidth],
            [tFirstSouth + (tLatIndex + 1) * tGridHeight, tFirstWest + (tLongIndex + 1)* tGridWidth]]));
        }
      }
      this.set('startWest', tFirstWest);
      this.set('startSouth', tFirstSouth);
    },

    /**
     * Zero the count of each rectangle
     */
    zeroCounts: function() {
      this.get('rectArray').forEachRect( function( iRect) {
        iRect.count = 0;
      });
      this.get('rectArray').maxCount = 0;
    },

    /**
     * For each case, increment the count for the rectangle in which it lies
     */
    computeCounts: function() {
      var tCases = this.getPath('dataConfiguration.cases'),
          tGridWidth = this.get('gridWidth'),
          tGridHeight = this.get('gridHeight'),
          tStartWest = this.get('startWest'),
          tStartSouth = this.get('startSouth'),
          tLongVarID = this.getPath('dataConfiguration.xAttributeDescription.attributeID'),
          tLatVarID = this.getPath('dataConfiguration.yAttributeDescription.attributeID'),
          tRectArray = this.get('rectArray');
      this.zeroCounts();
      tCases.forEach( function( iCase) {
        var tLongVal = iCase.getNumValue( tLongVarID),
            tLatVal = iCase.getNumValue( tLatVarID),
            tLongIndex = Math.floor( (tLongVal - tStartWest) / tGridWidth),
            tLatIndex = Math.floor( (tLatVal - tStartSouth) / tGridHeight);
        tRectArray.incrementCount( tLongIndex, tLatIndex);
      })
    },

    /**
     *
     * @returns {{}}
     */
    createStorage: function () {
      var tStorage = {};
      tStorage.bounds = this.get('bounds');
      tStorage.refLat = this.get('refLat');
      tStorage.refLong = this.get('refLong');
      tStorage.gridWidth = this.get('gridWidth');
      tStorage.gridHeight = this.get('gridHeight');
      tStorage.visible = this.get('visible');

      return tStorage;
    },

    /**
     *
     * @param iStorage
     */
    restoreStorage: function (iStorage) {
      if (iStorage) {
        this.beginPropertyChanges();
        this.set('bounds', iStorage.bounds);
        this.set('refLat', iStorage.refLat);
        this.set('refLong', iStorage.refLong);
        this.set('gridWidth', iStorage.gridWidth);
        this.set('gridHeight', iStorage.gridHeight);
        this.set('visible', iStorage.visible);
        this.endPropertyChanges();
        this.setDefaultGrid( iStorage.bounds)
      }
    }
  };
})()); // end closure
