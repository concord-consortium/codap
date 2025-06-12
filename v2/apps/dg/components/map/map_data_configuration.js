// ==========================================================================
//                      DG.MapDataConfiguration
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
sc_require('components/graph_map_common/plot_data_configuration');

/** @class  DG.MapDataConfiguration - The object that describes the manner in which attributes are
 assigned to places in a map.

 @extends DG.PlotDataConfiguration
 */
DG.MapDataConfiguration = DG.PlotDataConfiguration.extend(
    /** @scope DG.MapDataConfiguration.prototype */
    {
      /**
       * Subclasses will override
       */
      collectionClient: function () {
        return null;
      }.property(),

      /**
       * @property {SC.Array of DG.Case} All cases, both hidden and visible
       */
      allCases: function () {
        return [];
      }.property(),

      hasLatLongAttributes: false,

      hasPolygonAttribute: false

    });

