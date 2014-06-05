// ==========================================================================
//                            DG.MapView
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

/** @class  DG.MapView

 A view on a map and plotted data.

 @extends SC.View
 */
DG.MapView = SC.View.extend(
  /** @scope DG.MapView.prototype */ {

    /**
     * @property {DG.MapModel}
     */
    model: null,

    /**
     * @property {DG.MapLayer}
     */
    mapLayer: null,

    /**
     * @property {DG.MapPointView}
     */
    mapPointView: null,

    init: function() {
      sc_super();
      this.set('mapLayer', DG.MapLayer.create({ containerView: this }));
    },

    addPointLayer: function() {

      function isValidBounds( iBounds) {
        // If any of the array elements are null we don't have a valid bounds
        return !SC.none( iBounds[0][0], iBounds[0][1], iBounds[1][0], iBounds[1][1]);
      }

      var kPadding = [10, 10];
      this.set('mapPointView', DG.MapPointView.create(
        {
          mapLayer: this.get('mapLayer')
        }));
      this.setPath('mapPointView.model', this.get('model'))
      this.appendChild( this.get( 'mapPointView'));
      var tBounds = this.get('model' ).getLatLngBounds();
      if( isValidBounds( tBounds))
        this.getPath('mapLayer.map' ).fitBounds( tBounds, kPadding);
    },

    /**
     * Provide an element on which we can draw.
     * @param ctx
     * @param first
     */
    render:function ( ctx, first ) {
      sc_super();
      this.get('mapLayer' ).render( ctx, first);
    },

    /**
     * Additional setup after creating the view
     */
    didCreateLayer:function () {
      this.get('mapLayer' ).didCreateLayer();
    },

    /**
     * Pass to layers
     */
    viewDidResize:function () {
      sc_super();
      this.get('mapLayer' ).viewDidResize();
    }

  }
);
