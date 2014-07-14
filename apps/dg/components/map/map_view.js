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

      displayProperties: ['model.dataConfiguration.attributeAssignment'],

      kPadding: [10, 10],

      /**
       * @property {DG.MapModel}
       */
      model: null,

      /**
       * @property {DG.MapLayerView}
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

      /**
       * @property {DG.LegendView}
       */
      legendView: null,

      paper: function() {
        return this.getPath('mapPointView.paper');
      }.property(),

      init: function () {
        sc_super();
        var tLegendView = DG.LegendView.create({layout: { bottom: 0, height: 0 }}),
            tMapLayer = DG.MapLayerView.create();

        this.set('mapLayer', tMapLayer);
        this.appendChild( tMapLayer);

        this.set('legendView', tLegendView);
        this.appendChild( tLegendView);
        tLegendView.set('model', this.getPath('model.legend'));
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
        if( !this.getPath('model.areaVarID') || this.get('mapAreaLayer'))
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
       Set the layout (view position) for our subviews.
       @returns {void}
       */
      adjustLayout: function( context, firstTime) {
        var tMapLayer = this.get('mapLayer'),
            tMapPointView = this.get('mapPointView' ),
            tLegendView = this.get('legendView'),
            tLegendHeight = SC.none( tLegendView) ? 0 : tLegendView.get('desiredExtent' );

        if( this._isRenderLayoutInProgress || !tMapPointView || !tLegendView)
          return;
        this._isRenderLayoutInProgress = true;

        // adjust() method avoids triggering observers if layout parameter is already at correct value.
        tMapPointView.adjust('bottom', tLegendHeight);
        tMapLayer.adjust('bottom', tLegendHeight);
        tLegendView.set( 'layout', { bottom: 0, height: tLegendHeight });

        this._isRenderLayoutInProgress = false;
      }.observes('model.dataConfiguration.attributeAssignment'),

      /**
       * Private property to prevent recursive execution of renderLayout. Seems most important in Firefox.
       */
      _isRenderLayoutInProgress: false,

      /**
       * This is our chance to add the features to the area layer
       */
      createVisualization: function () {
        this.get('mapAreaLayer').createVisualization();
      },

      /**
       * Override the two mixin methods because the drop target view is mapPointView
       */
      dragStarted: function() {
        DG.GraphDropTarget.dragStarted.apply( this, arguments);
        if( !this.getPath('model.hasLatLngAttrs'))
          this.setPath('mapPointView.isVisible', true);
      },

      dragEnded: function() {
        DG.GraphDropTarget.dragEnded.apply( this, arguments);
        if( !this.getPath('model.hasLatLngAttrs'))
          this.setPath('mapPointView.isVisible', false);
      }

    }
);
