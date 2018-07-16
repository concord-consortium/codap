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

/* global L */
/** @class  DG.MapLayerView

 A view on a map.

 We're using Leaflet as our map library.
 See: http://leafletjs.com/index.html

 @extends SC.Object
 */
DG.MapLayerView = SC.View.extend(
    /** @scope DG.MapLayerView.prototype */ {

      model: null,

      _layerID: null,

      _map: null,

      map: function () {
        return this._map;
      }.property('_map'),

      baseMapLayer: null,
      baseMapLabels: null,

      didCreateMap: function (iMap) {
      },

      /**
       * Property that can be observed by parent view
       */
      displayChangeCount: 0,

      /**
       * Set along with displayChangeCount so that event can be logged
       * @property(String}
       */
      lastEventType: null,

      /**
       * Property that can be observed by parent view
       */
      clickCount: 0,

      /**
       * Property that can be observed by parent view, counts times the map returns to idle
       */
      idleCount: 0,

      init: function () {
        sc_super();
      },

      /**
       * Provide an element on which we can draw.
       * @param ctx
       * @param first
       */
      render: function (ctx, first) {
        if (first) {
          this._layerID = ctx.push(
              '<div></div>'
          ).id();
        }
      },

      didAppendToDocument: function() {
        if (!this._map) {
          this._createMap();
        }
        else {
          this.viewDidResize();
        }
      },

      _createMap: function () {

        var onLayerAdd = function (iLayerEvent) {
              var tParentView = this.get('parentView');
              this._map.off('layeradd', onLayerAdd);
              tParentView.addPointLayer();
              tParentView.addAreaLayer();
              tParentView.addGridLayer();
              // We want the popup hints for the grid to be on top of the points. jQuery can
              // help with this if we hardcode the layer class names.
              // ToDo: The implementation below will not work properly when there are two maps.
              // The popups for the second grid will appear on the first map. Presumably we can
              // use more selective selectors to solve this problem.
/*
              this.invokeOnce(function () {
                $('.leaflet-popup-pane').insertAfter('.map-layer');
              });
*/
            }.bind(this),

            onDisplayChangeEvent = function (iEvent) {
              SC.run(function() {
                this.set('lastEventType', iEvent.type);
                this.incrementProperty('displayChangeCount');
              }.bind(this));
            }.bind(this),

            onClick = function (iEvent) {
              SC.run(function() {
                this.incrementProperty('clickCount');
              }.bind(this));
            }.bind(this),

            onMousedown = function( iEvent) {
              SC.run(function() {
                // Passing this event to the top will cause any extant picker panes to be removed
                DG.mainPage.mainPane.sendEvent('mouseDown', iEvent, this);
              }.bind(this));
            }.bind(this);

        if (this._map) {
          // May need to resize here
        } else {
        this._map = L.map(this._layerID, {
          scrollWheelZoom: false,
          zoomSnap: 0,
          attributionControl: false,
          trackResize: false
        })
            .setView(this.getPath('model.center'), this.getPath('model.zoom'));
          this._map.on('layeradd', onLayerAdd)
              .on('dragstart', onDisplayChangeEvent)
              .on('dragend', onDisplayChangeEvent)
              .on('moveend', onDisplayChangeEvent)
              .on('click', onClick)
              .on('mousedown', onMousedown)
              .on('dragstart drag move', function () {
                this._clearIdle();
              }.bind(this))
              .on('dragend zoomend moveend', function () {
                this._setIdle();
              }.bind(this));
          this.backgroundChanged(); // will initialize baseMap
        }
      },

      viewDidResize: function () {
        var tMap = this.get('map');
        if (tMap) {
          tMap.invalidateSize();
        }
      },

      _idleTimeout: null,
      _clearIdle: function () {
        if (this._idleTimeout) {
          clearTimeout(this._idleTimeout);
        }
      },
      _setIdle: function () {
        this._clearIdle();
        this._idleTimeout = setTimeout(function () {
          this._idleTimeout = null;
          this.incrementProperty('idleCount');
        }.bind(this), 500);
      },

      backgroundChanged: function () {
        var tMap = this.get('map'),
            tLayerOpacity = this.getPath('model.baseMapLayerToggle') ? 1.0 : 0.0,
            tNewLayerName = this.getPath('model.baseMapLayerName'),
            tNewLayer;

        if (!tNewLayerName)
          return;
        if (this.get('baseMapLayer'))
          tMap.removeLayer(this.get('baseMapLayer'));
        if (this.get('baseMapLabels'))
          tMap.removeLayer(this.get('baseMapLabels'));
        tNewLayer = L.esri.basemapLayer(tNewLayerName, { opacity: tLayerOpacity });
        this._map.addLayer(tNewLayer, true /*add at bottom */);
        //this._map.addLayer( L.esri.basemapLayer(tBasemap + 'Labels'));
        this.set('baseMapLayer', tNewLayer);
      }.observes('model.baseMapLayerName')

    }
);
