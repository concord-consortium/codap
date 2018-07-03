// ==========================================================================
//                            DG.MapModel
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

sc_require('components/map/map_layer_model');

/** @class  DG.MapPolygonLayerModel - The model for polygons on a map.

 @extends DG.MapLayerModel
 */
DG.MapPolygonLayerModel = DG.MapLayerModel.extend(
    /** @scope DG.MapLayerModel.prototype */
    {
      areaColor: DG.PlotUtilities.kMapAreaNoLegendColor,
      areaTransparency: DG.PlotUtilities.kDefaultMapFillOpacity,
      areaStrokeColor: DG.PlotUtilities.kDefaultMapStrokeColor,
      areaStrokeTransparency: DG.PlotUtilities.kDefaultMapStrokeOpacity,

      polygonVarID: function() {
        return this.getPath('dataConfiguration.polygonAttributeDescription.attributeID');
      }.property(),
      polygonVarIDDidChange: function() {
        this.notifyPropertyChange('polygonVarID');
      }.observes('*dataConfiguration.polygonAttributeDescription.attributeID'),

      /**
       * Override superclass
       * @returns {boolean}
       */
      wantsInspector: true,

      hasPolygonAttribute: true,

      /**
       * We can rescale if we have some data to rescale to.
       * @return {Boolean}
       */
      canRescale: true,

      createStorage: function() {
        var tStorage = {};
        tStorage.areaColor = this.get('areaColor');
        tStorage.areaTransparency = this.get('areaTransparency');
        tStorage.areaStrokeColor = this.get('areaStrokeColor');
        tStorage.areaStrokeTransparency = this.get('areaStrokeTransparency');

        return tStorage;
      },

      restoreStorage: function( iStorage) {
        sc_super();

        if( iStorage.mapModelStorage) {
          if( iStorage.mapModelStorage.areaColor)
            this.set('areaColor', iStorage.mapModelStorage.areaColor);
          if( iStorage.mapModelStorage.areaTransparency)
            this.set('areaTransparency', iStorage.mapModelStorage.areaTransparency);
          if( iStorage.mapModelStorage.areaStrokeColor)
            this.set('areaStrokeColor', iStorage.mapModelStorage.areaStrokeColor);
          if( iStorage.mapModelStorage.areaStrokeTransparency)
            this.set('areaStrokeTransparency', iStorage.mapModelStorage.areaStrokeTransparency);

          this.get('gridModel').restoreStorage( iStorage.mapModelStorage.grid);
        }
      }
    });