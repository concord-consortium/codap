// ==========================================================================
//                            DG.MapLayerView
//
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

/** @class  DG.MapLayerView

 A view on a map.

 We're using Leaflet as our map library.
 See: http://leafletjs.com/index.html

 @extends SC.Object
 */
DG.MapLayerView = SC.View.extend(
  /** @scope DG.MapLayerView.prototype */ {

    kSanFran: [37.84,-122.10],
    kDefaultZoom: 5,

    _layerID: null,

    _map: null,

    map: function() {
      return this._map;
    }.property('_map'),

    didCreateMap: function( iMap) {
    },

    init: function() {
      sc_super();
    },

    /**
     * Provide an element on which we can draw.
     * @param ctx
     * @param first
     */
    render:function ( ctx, first ) {
      if( first ) {
        this._layerID = ctx.push(
          '<div></div>'
        ).id();
      }
    },

    didCreateLayer:function () {
      // TODO: Investigate whether there is some later time to call _createMap so we don't have to use invokeLast
      this.invokeLast(this._createMap);
    },

    _createMap:function () {

      var onLayerAdd = function( iLayerEvent) {
            var tParentView = this.get('parentView');
            this._map.off('layeradd', onLayerAdd);
            tParentView.addPointLayer();
            tParentView.addAreaLayer();
          }.bind( this ),

          onDisplayChangeEvent = function( iEvent) {
              // TODO: Eliminate knowledge at this level of mapPointView
            var tMapPointView = this.getPath('parentView.mapPointView');
            tMapPointView && tMapPointView.doDraw();
          }.bind( this),

          onClick = function( iEvent) {
            this.getPath('parentView.model').selectAll( false);
          }.bind( this);

      if( this._map ) {
        // May need to resize here
      } else {
        this._map = L.map(this._layerID, { scrollWheelZoom: false })
            .setView(this.kSanFran, this.kDefaultZoom);
        this._map.on('layeradd', onLayerAdd);
        var tTileLayer = L.tileLayer.wms("http://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv", {
                              layers: 'gebco_08_grid',
                              format: 'image/jpeg',
                              crs: L.CRS.EPSG4326
                            });
        this._map.addLayer( tTileLayer, true /*add at bottom */)
            .on('drag', onDisplayChangeEvent)
            .on('zoomend', onDisplayChangeEvent)
            .on('click', onClick);

//        L.tileLayer('http://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
//          attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
//          				'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
//          				'Imagery © <a href="http://mapbox.com">Mapbox</a>',
//          			id: 'wfinzer.i9k4439c',
//            maxZoom: 18
//        }).addTo(this._map);
      }
    },

    viewDidResize: function() {
      var tMap = this.get('map');
      if( tMap) {
        tMap.invalidateSize();
      }
    }

  }
);
