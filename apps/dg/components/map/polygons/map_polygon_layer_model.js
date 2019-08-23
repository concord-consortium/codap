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

      init: function() {
        sc_super();
      },

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

      /**
       * @override
       * @return {*|Number|boolean}
       */
      hasValidMapAttributes: function() {
        var tMapAttribute = this.getPath( 'dataConfiguration.polygonAttributeDescription.attribute'),
            tAttrName = tMapAttribute && tMapAttribute.get('name'),
            tAttrType = tMapAttribute && tMapAttribute.get('type');
        return tAttrName && (DG.MapConstants.kPolygonNames.indexOf( tAttrName.toLowerCase()) >= 0 ||
            tAttrType === DG.Analysis.EAttributeType.eBoundary || tAttrType === 'boundary');
      },

      createStorage: function() {
        var tStorage = sc_super();
        tStorage.areaColor = this.get('areaColor');
        tStorage.areaTransparency = this.get('areaTransparency');
        tStorage.areaStrokeColor = this.get('areaStrokeColor');
        tStorage.areaStrokeTransparency = this.get('areaStrokeTransparency');
        tStorage.strokeSameAsFill = this.get('strokeSameAsFill');

        return tStorage;
      },

      restoreStorage: function( iStorage) {
        sc_super();

        var tStorage = iStorage.mapModelStorage || iStorage;

        if (tStorage.areaColor)
          this.set('areaColor', tStorage.areaColor);
        if (tStorage.areaTransparency)
          this.set('areaTransparency', tStorage.areaTransparency);
        if (tStorage.areaStrokeColor)
          this.set('areaStrokeColor', tStorage.areaStrokeColor);
        if (tStorage.areaStrokeTransparency)
          this.set('areaStrokeTransparency', tStorage.areaStrokeTransparency);
        if (tStorage.strokeSameAsFill)
          this.set('strokeSameAsFill', tStorage.strokeSameAsFill);
      }
    });