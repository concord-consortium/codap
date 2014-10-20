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

  init: function() {
    sc_super();
    this.visibilityHasChanged();
  },

  /**
    Draw the grid lines
  */
  addGridLayer: function() {
    var tMap = this.get('map'),
        tModel = this.get('model');
    if( !tMap || !tModel)
      return;
    var tOptions = { color: 'white', fillColor: 'red', weight: 1 },
        tModel = this.get('model'),
        tRectangles = [],
        tMaxCount = tModel.get('rectArray').maxCount;
    tModel.forEachRect( function( iRect) {
      tOptions.fillOpacity = iRect.count / tMaxCount;
      tRectangles.push(L.rectangle( iRect.rect, tOptions));
    });

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
    tRectangles.forEach( function( iRect) {
      tMap.removeLayer( iRect);
    });
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
  }.observes('model.visible')

});

