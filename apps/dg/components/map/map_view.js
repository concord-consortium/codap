// ==========================================================================
//                            DG.MapView
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
/* global google */

/** @class  DG.MapView

 A view on a map.

 Tips on how to define a google maps view as a subclass of SC.View can be found at:
 https://groups.google.com/forum/#!msg/sproutcore/aZUnKzq-aC0/ZdYMZNKKUv4J

 Documentation for Google Maps can be found at:
 https://developers.google.com/maps/documentation/javascript/

 @extends SC.View
 */
DG.MapView = SC.View.extend(
  /** @scope DG.MapView.prototype */ {

    homeButton: null,
    home: null,
    homeBounds: null,
    zoom:8,

    map: function() {
      return this._map;
    }.property('_map'),

    didCreateMap: function( iMap) {
      if( iMap) {
        google.maps.event.addListener( iMap, 'tilesloaded', function() {
          if( !this.homeBounds)
            this.set('homeBounds', iMap.getBounds());
        }.bind(this));
      }
    },

    init: function() {
      sc_super();

      if( window.google && window.google.maps)
        this.set('home', new google.maps.LatLng( 37.782112, -122.391815 ));  // San Francisco
    },

    render:function ( ctx, first ) {
      if( first ) {
        ctx.push( '<div style="position:absolute;top:0;left:0;right:0;bottom:0"></div>' );
      }
    },

    didCreateLayer:function () {
      this.invokeLast( '_createMap' );
    },

    _createMap:function () {
      if( !window.google || !window.google.maps)
        return;
      if( this._map ) {
        google.maps.event.trigger( this._map, 'resize' );
      } else {
        google.maps.visualRefresh = true;

        var opts = {
          zoom:this.get( 'zoom' ),
          center:this.get( 'home' ),
          panControl: false,
          zoomControl: true,
          zoomControlOptions: {
                  position: google.maps.ControlPosition.LEFT_BOTTOM
              },
          mapTypeId:google.maps.MapTypeId.ROADMAP
        };

        var div = this.$( 'div' )[0];
        var map = new google.maps.Map( div, opts );

        this._map = map;

        if( this.didCreateMap ) this.didCreateMap( map );
      }
    },

    viewDidResize: function() {
      var tMap = this.get('map');
      if( tMap) {
        google.maps.event.trigger(tMap, 'resize');
      }
    }

  }
);
