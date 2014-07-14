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

  displayProperties: ['model.dataConfiguration.attributeAssignment'],

  classNames: ['map-layer'],

  /**
   * @property {DG.MapModel}
   */
  model: null,

  /**
   * @property {DG.MapPointLayer}
   */
  mapPointLayer: null,

  /**
   * @property {DG.MapLayerView}
   */
  mapLayer: null,

  /**
   * Subclasses can override calling sc_super() and then adding layers at will.
   */
  initLayerManager: function() {
    sc_super();

    var ln = DG.LayerNames;
    this.get('layerManager').addNamedLayer( ln.kBackground )
                  .addNamedLayer( ln.kPoints )
                  .addNamedLayer( ln.kSelectedPoints )
                  .addNamedLayer( ln.kDataTip );
  },

  init: function() {
    sc_super();
    this.set('mapPointLayer', DG.MapPointLayer.create({
      paperSource: this,
      model: this.get('model'),
      mapSource: this
    }))
  },

  modelDidChange: function () {
    this.setPath('mapPointLayer.model', this.get('model'));
  }.observes('model'),

  shouldDraw: function() {
    // The actual map is created in an invokeLast, so we may not be ready yet
    return !SC.none( this.getPath('mapLayer.map'));
  },

  doDraw: function doDraw() {
    this.get('mapPointLayer' ).doDraw();
  }

});

