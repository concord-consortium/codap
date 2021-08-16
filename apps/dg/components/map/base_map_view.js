// ==========================================================================
//                            DG.BaseMapView
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
/** @class  DG.BaseMapView

 A view on a map.

 We're using Leaflet as our map library.
 See: http://leafletjs.com/index.html

 @extends SC.Object
 */
DG.BaseMapView = SC.View.extend(
    /** @scope DG.BaseMapView.prototype */ {

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
              this.invokeLater( function() {
                // invokeLater is needed to insure that the parent view has its legendViewCallback
                tParentView.addPointLayers();
                tParentView.addPolygonLayers();
                tParentView.adjustLayout();
              });
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
            trackResize: true
          }).setView(this.getPath('model.center'), this.getPath('model.zoom'));
          this._map.on('layeradd', onLayerAdd)
              .on('dragstart', onDisplayChangeEvent)
              .on('dragend', onDisplayChangeEvent)
              .on('moveend', onDisplayChangeEvent)
              .on('click', onClick)
              .on('mousedown', onMousedown)
              .on('dragstart drag move', function () {
                this._clearIdle();
              }.bind(this))
              .on('dragend zoomend moveend', function (iEvent) {
                this._setIdle(iEvent.type);
              }.bind(this));
          this.backgroundChanged(); // will initialize baseMap
        }
      },

      centerDidChange: function () {
        this.get('map').setView(this.getPath('model.newCenter'), this.getPath('model.newZoom'), {animate: true});
      }.observes('model.newCenter', 'model.newZoom'),

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
          this._idleTimeout = null;
        }
      },
      _setIdle: function (eventType) {
        // console.log('eventType = %@, _idleTimeout = %@'.loc( eventType, this._idleTimeout));
        if(!this._idleTimeout) {
          this._clearIdle();
          this._idleTimeout = setTimeout(function () {
            this._idleTimeout = null;
            this.set('lastEventType', eventType); // So observers can act conditionally on event
            this.incrementProperty('idleCount');
            this.set('lastEventType', null);
          }.bind(this), 100);
        }
      },

      backgroundChanged: function () {
        var tMap = this.get('map'),
            tLayerOpacity = this.getPath('model.baseMapLayerIsVisible') ? 1.0 : 0.0,
            tNewLayerName = this.getPath('model.baseMapLayerName'),
            tNewLayer;

        if (!tNewLayerName)
          return;
        if (this.get('baseMapLayer'))
          tMap.removeLayer(this.get('baseMapLayer'));
        if (this.get('baseMapLabels'))
          tMap.removeLayer(this.get('baseMapLabels'));
        tNewLayer = L.esri.basemapLayer(tNewLayerName, {crossOrigin:true, opacity: tLayerOpacity});
        this._map.addLayer(tNewLayer, true /*add at bottom */);
        //this._map.addLayer( L.esri.basemapLayer(tBasemap + 'Labels'));
        this.set('baseMapLayer', tNewLayer);
      }.observes('model.baseMapLayerName')

    }
);
