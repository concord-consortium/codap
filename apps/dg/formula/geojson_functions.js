// ==========================================================================
//                        GeoJSON Functions
//
//  Author:   William Finzer
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('formula/function_registry');
sc_require('utilities/geojson_utils');

/**
  Implements functions that lookup or manipulate geojson boundaries and registers them with the FunctionRegistry.
 */
DG.functionRegistry.registerFunctions((function() {

  return {
    /**
      Returns true if the specified string contains the specified target string
      as its initial characters.
      @param    {String}  iCollectionName - the name of the online collection of boundaries to look in
      @param    {String}  iBoundaryName - the name of the desired boundary
      @returns  {Object}  the object that can be passed to the map to display a boundary
     */
    'lookupBoundary': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryOther',
      evalFn: function(iBoundaryMap, iBoundaryName) {
        if (iBoundaryMap instanceof Error) throw iBoundaryMap;
        if (iBoundaryName instanceof Error) throw iBoundaryName;
        if (!iBoundaryMap || !iBoundaryName) return '';
        if (!(iBoundaryMap instanceof DG.BoundaryMap)) throw new DG.TypeError();
        return iBoundaryMap.map[iBoundaryName.toString().toLowerCase()] || '';
      }
    }

  };
})());
