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
DG.MapView = SC.View.extend( DG.GraphDropTarget,
    /** @scope DG.MapView.prototype */ {

      kPadding: [10, 10],

      /**
       * @property {DG.MapModel}
       */
      model: null,

      /**
       * @property {DG.MapLayer}
       */
      mapLayer: null,

      /**
       * @property {DG.MapAreaLayer}
       */
      mapAreaLayer: null,

      /**
       * @property {DG.MapPointView}
       */
      mapPointView: null,

      paper: function() {
        return this.getPath('mapPointView.paper');
      }.property(),

      init: function () {
        sc_super();
        this.set('mapLayer', DG.MapLayer.create({ containerView: this }));
      },

      _isValidBounds: function( iBounds) {
        // If any of the array elements are null we don't have a valid bounds
        return iBounds && !SC.none(iBounds[0][0]) && !SC.none( iBounds[0][1]) &&
            !SC.none( iBounds[1][0]) && !SC.none( iBounds[1][1]);
      },

      addPointLayer: function () {
        if( this.get('mapPointView'))
          return;

        var tMapPointView = DG.MapPointView.create(
            {
              mapLayer: this.get('mapLayer')
            });
        this.set('mapPointView', tMapPointView);
        this.setPath('mapPointView.model', this.get('model'))
        this.appendChild( tMapPointView);
        if( this.getPath('model.hasLatLngAttrs')) {
          var tBounds = this.get('model').getLatLngBounds();
          if (this._isValidBounds(tBounds))
            this.getPath('mapLayer.map').fitBounds(tBounds, this.kPadding);
        }
        else {
          tMapPointView.set('isVisible', false);
        }
      },

      addAreaLayer: function () {
        if( this.get('mapAreaLayer'))
          return;

        this.set('mapAreaLayer', DG.MapAreaLayer.create(
            {
              mapSource: this
            }));
        this.setPath('mapAreaLayer.model', this.get('model'));
        var tBounds = this.get('model').getAreaBounds();
        if (this._isValidBounds(tBounds))
          this.getPath('mapLayer.map').fitBounds(tBounds, this.kPadding);
        this.get('mapAreaLayer').addFeatures();
      },

      /**
       * Provide an element on which we can draw.
       * @param ctx
       * @param first
       */
      render: function (ctx, first) {
        sc_super();
        this.get('mapLayer').render(ctx, first);
      },

      /**
       * Additional setup after creating the view
       */
      didCreateLayer: function () {
        this.get('mapLayer').didCreateLayer();
      },

      /**
       * Pass to layers
       */
      viewDidResize: function () {
        sc_super();
        this.get('mapLayer').viewDidResize();
      },

      /**
       * This is our chance to add the features to the area layer
       */
      createVisualization: function () {
        this.get('mapAreaLayer').createVisualization();
      }

    }
);
