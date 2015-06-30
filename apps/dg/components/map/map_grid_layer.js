// ==========================================================================
//                        DG.MapGridLayer
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
/** @class DG.MapGridLayer - A plot of dots placed according to numeric values

  @extends SC.Object
*/
DG.MapGridLayer = SC.Object.extend(
/** @scope DG.MapGridLayer.prototype */ 
{
  /**
   * {@property DG.MapGridModel}
   */
  model: null,

  mapSource: null,

  map: function() {
    return this.getPath('mapSource.mapLayer.map');
  }.property(),

  /**
   * {@property L.rectangle[]}
   */
  grid: null,

  showTips: false,

  init: function() {
    sc_super();
    this.visibilityHasChanged();
  },

  /**
    Draw the grid cells
  */
  addGridLayer: function() {
    var tMap = this.get('map'),
        tModel = this.get('model');
    if( !tMap || !tModel)
      return;
    var tOptions = { color: 'white', fillColor: 'red', weight: 1 },
        tRectangles = [],
        tMaxCount = tModel.get('rectArray').maxCount,
        tDataContext = tModel.getPath('dataConfiguration.dataContext'),
        tCollection = tModel.getPath('dataConfiguration.collectionClient'),
        tIndex = 0,
        tPopup, tRect;
    tModel.forEachRect( function( iRect, iLongIndex, iLatIndex) {
      var tLocalIndex = tIndex,
          handleClick = function( iEvent) {
            // Select cases in this rectangle?
          }.bind( this),

          handleMouseover = function( iEvent) {
            tRect = tModel.get('rectArray').getRect( iLongIndex, iLatIndex);
            if( (tRect.count === 0) || !this.get('showTips'))
              return;
            tPopup = L.popup({ closeButton: false, autoPan: false }, tRectangles[ tLocalIndex]);
            tPopup.options.offset[1] = -10;
            tPopup.setContent( tDataContext.getCaseCountString(tCollection, tRect.count));
            SC.Timer.schedule( { target: this,
              action: function() {
                // Note the funky check for _map. We have to do this because the grid size slider dragging can
                // be over the grid rectangles and the rectangles may not yet be assigned a map.
                if( tPopup && tRectangles[ tLocalIndex]._map)
                  tRectangles[ tLocalIndex].bindPopup( tPopup).openPopup();
              },
              interval: 500 });

          }.bind(this),

          handleMouseout = function( iEvent) {
            if( tPopup) {
              tPopup._close();
              tPopup = null;
            }
          }.bind( this);

      tOptions.fillOpacity = iRect.count / tMaxCount;
      var tLeafRect = L.rectangle( iRect.rect, tOptions)
                        .on('click', handleClick)
                            .on('mouseover', handleMouseover)
                            .on('mouseout', handleMouseout);
      tRectangles.push(tLeafRect);
      tIndex++;
    }.bind( this));

    this.set('grid', tRectangles);
  },

  /**
   * Add each rectangle to the map
   */
  addGridToMap: function() {
    var tMap = this.get('map'),
        tRectangles = this.get('grid');
    tRectangles.forEach( function( iRect) {
      iRect.addTo( tMap);
    });
  },

  /**
   * Add each rectangle to the map
   */
  removeGridFromMap: function() {
    var tMap = this.get('map'),
        tRectangles = this.get('grid');
    if( tRectangles) {
      tRectangles.forEach(function (iRect) {
        tMap.removeLayer(iRect);
      });
    }
  },

  visibilityHasChanged: function() {
    if( this.getPath('model.visible')) {
      if(!this.get('grid'))
        this.addGridLayer();
      this.addGridToMap();
    }
    else {
      if(this.get('grid'))
        this.removeGridFromMap();
    }
  }.observes('model.visible'),

  gridRectArrayChanged: function() {
    this.removeGridFromMap();
    this.addGridLayer();
    this.visibilityHasChanged();
  }.observes('model.rectArray')

});

