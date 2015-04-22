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
      mapBinding: '.mapLayer.map',

      /**
       * @property {DG.MapAreaLayer}
       */
      mapAreaLayer: null,

      /**
       * @property {DG.MapPointView}
       */
      mapPointView: null,

      /**
       * @property {DG.MapGridLayer}
       */
      mapGridLayer: null,

      /**
       * @property {DG.LegendView}
       */
      legendView: null,

      /**
       * @property {DG.MapConnectingLineAdornment}
       */
      connectingLineAdorn: null,

      /**
       * SC.SegmentedView
       */
      backgroundControl: null,

      /**
       * SC.SliderView
       */
      gridControl: null,

      /**
       * SC.ImageButtonView
       */
      marqueeTool: null,

      paper: function() {
        return this.getPath('mapPointView.paper');
      }.property(),

      layerManager: function() {
        return this.getPath('mapPointView.layerManager');
      }.property(),

      init: function () {
        sc_super();
        var tLegendView = DG.LegendView.create({layout: { bottom: 0, height: 0 }}),
            tMapLayer = DG.MapLayerView.create( { model: this.get('model') });

        this.set('mapLayer', tMapLayer);
        this.appendChild( tMapLayer);

        this.set('legendView', tLegendView);
        this.appendChild( tLegendView);
        tLegendView.set('model', this.getPath('model.legend'));

        var tItems = [
          SC.Object.create( { label: 'Oceans',
            value: 'Oceans'}),
          SC.Object.create( { label: 'Topo',
            value: 'Topographic'} ),
          SC.Object.create( { label: 'Streets',
            value: 'Streets'} )
        ];

        this.backgroundControl = SC.SegmentedView.create({
          controlSize: SC.SMALL_CONTROL_SIZE,
          layout: { width: 170, height: 18, top: 5, right: 5 },
          items: tItems,
          value: [this.getPath('model.baseMapLayerName')],
          itemTitleKey: 'label',
          itemValueKey: 'value',
          action: 'changeBaseMap',
          target: this
        });
        this.appendChild( this.backgroundControl );

        this.gridControl = SC.SliderView.create({
          controlSize: SC.SMALL_CONTROL_SIZE,
          layout: { width: 40, height: 16, top: 33, right: 48 },
          toolTip: 'DG.MapView.gridControlHint'.loc(),
          minimum: 0,
          maximum: 1,
          step: 0,
          value: this.getPath('model.gridModel.gridMultiplier') / 1.8 - 0.1,
          isVisible: false,
          mouseUp: function( iEvent) {
            sc_super();
            DG.logUser('changeGridMultiplier: %@', 0.1 + 1.9 * this.get('value'));
          }
        });
        this.appendChild( this.gridControl );

        this.marqueeTool = SC.ImageButtonView.create({
          buttonBehavior: SC.PUSH_BEHAVIOR,
          layout: { right: 10, top: 25, width: 32, height: 32 },
          toolTip: 'DG.MapView.marqueeHint'.loc(),
          image: 'map-marquee',
          action: 'setMarqueeMode',
          isVisible: false
        });
        this.appendChild( this.marqueeTool);
      },

      setMarqueeMode: function() {
        this.setPath('mapPointView.isInMarqueeMode', true);
        DG.logUser('marqueeToolSelect');
      },

      marqueeModeChanged: function() {
        var tImage = this.getPath('mapPointView.isInMarqueeMode') ?
            'map-marquee-selected' :
            'map-marquee';
        this.setPath('marqueeTool.image', tImage);
      }.observes('mapPointView.isInMarqueeMode'),

      changeBaseMap: function() {
        var tBackground = this.backgroundControl.get('value');
        this.setPath('model.baseMapLayerName', tBackground);
        DG.dirtyCurrentDocument();
        DG.logUser('changeMapBackground: %@', tBackground);
      },

      changeGridSize: function() {
        var tControlValue = this.gridControl.get('value');
        this.setPath('model.gridModel.gridMultiplier', 0.1 + 1.9 * tControlValue);
      }.observes('gridControl.value'),

      addPointLayer: function () {
        if( this.get('mapPointView'))
          return;
        var tMakeVisible = this.getPath('model.pointsShouldBeVisible');

        var tMapPointView = DG.MapPointView.create(
            {
              mapLayer: this.get('mapLayer')
            });
        tMapPointView.set( 'model', this.get('model')); // Cannot pass in because of observer setup
        this.set('mapPointView', tMapPointView);
        this.appendChild( tMapPointView);

        if( this.getPath('model.hasLatLongAttributes')) {
          if (!this.getPath('model.centerAndZoomBeingRestored')) {
            this.fitBounds();
          }
          // if model's pointsShouldBeVisible has not previously been set or it is set to true, we make the
          //  the pointView visible.
          if (tMakeVisible !== false)
            tMakeVisible = true;
          tMapPointView.set('isVisible', tMakeVisible);
          this.setPath('marqueeTool.isVisible', tMakeVisible);
          this.setPath('model.pointsShouldBeVisible', tMakeVisible);
          if( tMakeVisible && this.getPath('model.linesShouldBeVisible')) {
            this.lineVisibilityChanged();
          }
        }
        else {
          tMapPointView.set('isVisible', false);
        }
        this.adjustLayout( this.renderContext( this.get('tagName')));
      },

      pointVisibilityChanged: function() {
        var tPointsAreVisible = this.getPath('model.pointsShouldBeVisible');
        this.setPath('mapPointView.isVisible', tPointsAreVisible);
        this.setPath('marqueeTool.isVisible', tPointsAreVisible);
        this.setPath('mapGridLayer.showTips', true /*!tPointsAreVisible*/ );
      }.observes('model.pointsShouldBeVisible'),

      /**
       * Something about the points (aside from visibility) changed. Take appropriate action.
       */
      pointsDidChange: function() {
        this.getPath('mapGridLayer.model').rectArrayMustChange();
        this.updateConnectingLine();
      }.observes('mapPointView.pointsDidChange'),

      /**
       Our model has created a connecting line. We need to create our adornment. We don't call adornmentDidChange
       because we don't want to destroy the adornment.
       */
      lineVisibilityChanged: function() {
        var tMapModel = this.get('model' ),
            tAdornModel = tMapModel && tMapModel.get( 'connectingLineModel' ),
            tAdorn = this.get('connectingLineAdorn');
        if( tAdornModel && tAdornModel.get('isVisible') && !tAdorn) {
          tAdorn = DG.MapConnectingLineAdornment.create({ parentView: this, model: tAdornModel, paperSource: this,
                                                          mapSource: this, layerName: DG.LayerNames.kConnectingLines });
          this.set('connectingLineAdorn', tAdorn);
        }

        this.invokeLast( function() {
          if( tAdorn)
            tAdorn.updateVisibility();
        });
      }.observes('.model.linesShouldBeVisible'),

      addAreaLayer: function () {
        if( !this.getPath('model.areaVarID') || this.get('mapAreaLayer'))
          return;

        this.set('mapAreaLayer', DG.MapAreaLayer.create(
            {
              mapSource: this
            }));
        this.setPath('mapAreaLayer.model', this.get('model'));
        if( !this.getPath('model.centerAndZoomBeingRestored')) {
          this.fitBounds();
        }
        this.get('mapAreaLayer').addFeatures();
      },

      addGridLayer: function () {
        if( !this.getPath('model.hasLatLongAttributes') || this.get('mapGridLayer'))
          return;

        var tGridModel = this.getPath('model.gridModel');
        tGridModel.initializeRectArray();

        this.set('mapGridLayer', DG.MapGridLayer.create(
            {
              mapSource: this,
              model: tGridModel,
              showTips: true /* !this.getPath('model.pointsShouldBeVisible') */
            }));
        // The size of any points depends on whether the grid is visible or not
        if( !this.get('mapPointView'))
          this.addPointLayer();
        // Make the points smaller so they don't completely cover the grid cells
        if( tGridModel.get('visible'))
          this.setPath('mapPointView.mapPointLayer.fixedPointRadius', 3);

        this.gridVisibilityChanged();
      },

      /**
       * Cause the map to shrink or expand to encompass the data
       */
      fitBounds: function() {
        var tBounds;
        if( this.getPath('model.areaVarID')) {
          tBounds = this.getPath('model.dataConfiguration').getAreaBounds();
        }
        if (this.getPath('model.hasLatLongAttributes')) {
          tBounds = this.getPath('model.dataConfiguration').getLatLongBounds();
        }
        if ( tBounds.isValid())
          this.getPath('mapLayer.map').fitBounds(tBounds, this.kPadding);
      },

      gridVisibilityChanged: function() {
        this.gridControl.set('isVisible', this.getPath('model.gridModel.visible'));
      }.observes('model.gridModel.visible'),

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

      handleLegendModelChange: function() {
        var tLegendModel = this.getPath('model.legend');
        this.setPath('legendView.model', tLegendModel);
      }.observes('.model.legend'),

      /**
       * When the layout needs of an axis change, we need to adjust the layout of the plot and the other axis.
       */
      handleLegendLayoutChange: function() {
        this.adjustLayout( this.renderContext( this.get('tagName')));
      }.observes('*legendView.desiredExtent'),

      updateConnectingLine: function() {
        var tConnectingLineAdorn = this.get('connectingLineAdorn');
        if( tConnectingLineAdorn) {
          tConnectingLineAdorn.invalidateModel();
          tConnectingLineAdorn.updateToModel( false /* do not animate */);
        }
      },

      handleMapLayerDisplayChange: function() {
        var tMapPointView = this.get('mapPointView');
        if (tMapPointView) { tMapPointView.doDraw(); }

        this.updateConnectingLine();

        // Store the map's center and zoom in my model for save and restore
        var tMap = this.getPath('mapLayer.map'),
            tModel = this.get('model'),
            tCenter = tMap.getCenter(),
            tZoom = tMap.getZoom(),
            tEventType = this.getPath('mapLayer.lastEventType');
        tModel.set('center', tCenter);
        tModel.set('zoom', tZoom);
        DG.dirtyCurrentDocument();
        switch( tEventType) {
          case 'zoomend':
          case 'dragstart':
          case 'dragend':
            DG.logUser('mapEvent: %@ at {center: %@, zoom: %@}', tEventType, tCenter, tZoom);
        }
        this.setPath('mapLayer.lastEventType', null);
      }.observes('mapLayer.displayChangeCount'),

      handleClick: function() {
        this.get('model').selectAll(false);
      }.observes('mapLayer.clickCount'),

      /**
       * Override the two mixin methods because the drop target view is mapPointView
       */
      dragStarted: function() {
        DG.GraphDropTarget.dragStarted.apply( this, arguments);
        if( !this.getPath('model.hasLatLongAttributes'))
          this.setPath('mapPointView.isVisible', true);
      },

      dragEnded: function() {
        DG.GraphDropTarget.dragEnded.apply( this, arguments);
        if( !this.getPath('model.hasLatLongAttributes'))
          this.setPath('mapPointView.isVisible', false);
      }

    }
);
