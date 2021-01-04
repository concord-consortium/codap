// ==========================================================================
//                            DG.MapPointView
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

sc_require('views/raphael_base');

/** @class  DG.MapPointView - Subview of MapView that manages map layers and point layers

  @extends DG.RaphaelBaseView
*/
DG.MapPointView = DG.RaphaelBaseView.extend(
/** @scope DG.MapPointView.prototype */
{
  autoDestroyProperties: [ ],

  displayProperties: ['model.dataConfiguration.attributeAssignment',
                      'model.dataConfiguration.legendAttributeDescription.attributeStats.attributeType'],

  classNames: ['dg-map-layer'],
  // When we go into marquee-mode we add this class which makes us translucent and able receive mousedown events.
  classNameBindings: ['isInMarqueeMode:dg-marquee-mode'],

  /**
   * @property {DG.MapModel}
   */
  model: null,

  /**
   * @property {DG.MapPointLayer}
   */
  mapPointLayers: null,

  /**
   * @property {DG.BaseMapView}
   */
  mapLayer: null,

  /**
   * @property {Boolean}
   */
  isInMarqueeMode: false,

  marqueeContext: null,

  /**
   * We should be able to accomplish the following with binding, but it didn't work,
   * possibly because of the classNameBindings. So we use brute force.
   */
  marqueeModeDidChange: function() {
    this.get('mapPointLayers').forEach( function( iLayer) {
      iLayer.set('isInMarqueeMode', this.get('isInMarqueeMode'));
    }.bind( this));
  }.observes('isInMarqueeMode'),

  /**
   * Subclasses can override calling sc_super() and then adding layers at will.
   */
  initLayerManager: function() {
    sc_super();

    // if base class wasn't able to initialize the layer manager, e.g. because we
    // don't have paper yet, then this.get('layerManager') leads to an infinite loop.
    // For now, we avoid the infinite loop by testing the private _layerManager.
    if (!this._layerManager) return;

    var ln = DG.LayerNames;
    this.get('layerManager').addNamedLayer( ln.kBackground )
                  .addNamedLayer( ln.kConnectingLines )
                  .addNamedLayer( ln.kPoints )
                  .addNamedLayer( ln.kSelectedPoints )
                  .addNamedLayer( ln.kAdornments )
                  .addNamedLayer( ln.kDataTip );
  },

  /**
   * Go through each of the mapPointLayers and merge their separate LatLongBounds into one
   * @return {L.LatLngBounds | null}
   */
  getBounds: function() {
    var tBounds,
        tPointLayers = this.get('mapPointLayers');
    if( tPointLayers) {
      tPointLayers.forEach( function( iLayer) {
        if( iLayer.getPath('model.isVisible')) {
          var tPointBounds = iLayer.getBounds();
          if (!SC.none(tPointBounds)) {
            if (!tBounds)
              tBounds = tPointBounds;
            else
              tBounds.extend(tPointBounds);
          }
        }
      });
    }
    return tBounds;
  },

  /**
   * Handles a marquee mouse down.
   * @param {{clientX:number, clientY:number}} iEvent
   * @returns {boolean}
   */
  mouseDown: function( iEvent) {
    DG.ViewUtilities.componentViewForView( this).select();
    if (!this.get('isInMarqueeMode')) {
      return false;
    }
    this.marqueeContext = {};
    this.marqueeContext.startPt = DG.ViewUtilities.windowToViewCoordinates(
        { x: iEvent.clientX - 5, y: iEvent.clientY - 5 }, this);
    this.marqueeContext.marquee = this._paper.rect(
      this.marqueeContext.startPt.x, this.marqueeContext.startPt.y, 0, 0)
        .attr( { fill: DG.PlotUtilities.kMarqueeColor,
          stroke: DG.RenderingUtilities.kTransparent });
    this.getPath('layerManager.' + DG.LayerNames.kAdornments )
      .push( this.marqueeContext.marquee);
    DG.logUser('marqueeDrag: start');
    this.marqueeContext.lastRect = {x:0, y:0, width: 0, height: 0};
    this.get('mapPointLayers').forEach( function( iLayer) {
      iLayer.preparePointSelection();
      var tDataContext = iLayer.getPath('model.dataContext'),
          tCollection = iLayer.getPath('model.collectionClient');
      tDataContext.applyChange({
        operation: 'selectCases',
        collection: tCollection,
        cases: null,
        select: false
      });
    });
    return true;
  },

  mouseMoved: function( iEvent) {
    if( !this.get('marqueeContext'))
      return false;

    var tBaseSelection = [],
        tCurrPt = DG.ViewUtilities.windowToViewCoordinates(
                      { x: iEvent.clientX - 5, y: iEvent.clientY - 5 }, this),
        tX = Math.min( this.marqueeContext.startPt.x, tCurrPt.x),
        tY = Math.min( this.marqueeContext.startPt.y, tCurrPt.y),
        tWidth = Math.abs( this.marqueeContext.startPt.x - tCurrPt.x),
        tHeight = Math.abs( this.marqueeContext.startPt.y - tCurrPt.y),
        tRect = { x: tX, y: tY, width: tWidth, height: tHeight},
        tLast = this.marqueeContext.lastRect;
    this.marqueeContext.marquee.attr( tRect);
    this.marqueeContext.lastRect = tRect;
    this.selectPointsInRect( tRect, tBaseSelection, tLast);
    return true;
  },

  selectPointsInRect: function( iRect, iBaseSelection, iLast) {
    iBaseSelection = iBaseSelection || [];

    this.get('mapPointLayers' ).forEach( function( iLayer) {
      var tDataContext = iLayer.getPath('model.dataContext'),
          tCollection = iLayer.getPath('model.collectionClient');
      if( SC.none( tDataContext))
        return;
      var tSelection = iLayer.getCasesForDelta( iRect, iLast),
          tDeselection = iLayer.getCasesForDelta(iLast, iRect),
          tSelectChange = {
            operation: 'selectCases',
            collection: tCollection,
            cases: iBaseSelection.concat( tSelection),
            select: true,
            extend: true
          },
          tDeselectChange = {
            operation: 'selectCases',
            collection: tCollection,
            cases: iBaseSelection.concat( tDeselection),
            select: false,
            extend: true
          };

      if (tSelectChange.cases.length !== 0) {
        tDataContext.applyChange( tSelectChange);
      }
      if (tDeselectChange.cases.length !== 0) {
        tDataContext.applyChange( tDeselectChange);
      }
    });
  },

  mouseUp: function( iEvent) {
    if( !this.get('marqueeContext'))
      return false;
    this.get('layerManager').removeElement( this.marqueeContext.marquee, true /* callRemove*/ );
    this.marqueeContext = null;
    this.set('isInMarqueeMode', false);
    DG.logUser('marqueeDrag: end');
    this.get('mapPointLayers').forEach( function( iLayer) {
      iLayer.cleanUpPointSelection();
    });

    return true;
  },

  init: function() {
    var tVisibleAtZoomStart;

    var handleZoomStart = function() {
          SC.run(function() {
            tVisibleAtZoomStart = this.get('isVisible');
            if (tVisibleAtZoomStart)
              this.set('isVisible', false);
          }.bind(this));
        }.bind(this),

        handleZoomEnd = function() {
          SC.run(function() {
            if( tVisibleAtZoomStart)
              this.set('isVisible', true);
          }.bind(this));
        }.bind(this);

    sc_super();

    this.mapPointLayers = [];
    this.addMapPointLayers();

    // When the underlying map zooms, we want to be hidden during the zoom so user doesn't see
    // points momentarily in wrong place.
    this.getPath('mapLayer.map')
        .on('zoomstart', handleZoomStart)
        .on('zoomend', handleZoomEnd);
  },

  /** For each mapLayerModel that has lat/long attributes, if we don't already have a corresponding
   *  mapPointLayer, make one and stash it.
   */
  addMapPointLayers: function() {
    var tMapPointLayers = this.get('mapPointLayers'),
        tExistingMapPointLayerModels = tMapPointLayers.map( function( iLayer) {
          return iLayer.get('model');
        });
    this.getPath('model.mapLayerModels').forEach(function (iMapLayerModel, iIndex) {
      var tDataConfig = iMapLayerModel.get('dataConfiguration');
      if (tDataConfig.get('hasLatLongAttributes') && tExistingMapPointLayerModels.indexOf( iMapLayerModel) < 0) {
        var tLayer = DG.MapPointLayer.create({
          paperSource: this,
          model: iMapLayerModel,
          mapSource: this,
          dataConfiguration: tDataConfig,
          plotLayerNumber: iIndex,
        });
        tLayer.addObserver('plotDisplayDidChange', this, function () {
          this.invokeLast(this.plottedPointsDidChange);
        }.bind(this));
        tMapPointLayers.push(tLayer);
      }
    }.bind(this));
  },

  /**
   *
   * @return {[DG.LegendView]}
   */
  createLegendViews: function() {
    var tViews = this.get('mapPointLayers').map( function( iLayer) {
      return DG.LegendView.create( { model: iLayer.getPath('model.legend')});
    });
    return tViews;
  },

  /**
   * Something about the points changed. Let my dependents know.
   */
  plottedPointsDidChange: function() {
    this.notifyPropertyChange('pointsDidChange');
  },

  modelDidChange: function () {
    // this.setPath('mapPointLayers.model', this.get('model'));
  }.observes('model'),

  shouldDraw: function() {
    // The actual map is created in an invokeLast, so we may not be ready yet
    return !SC.none( this.getPath('mapLayer.map'));
  },

  doDraw: function() {
    this.get('mapPointLayers').forEach( function( iLayer) {
      iLayer.doDraw();
    });
  },

  updateConnectingLines: function() {
    this.get('mapPointLayers').forEach( function( iLayer) {
      iLayer.updateConnectingLine();
    });
  },

  clear: function() {
    this.get('mapPointLayers').forEach( function( iLayer) {
      iLayer.clear();
    });
  }

});

