// ==========================================================================
//                          DG.MapConnectingLineAdornment
//
//  Author:   William Finzer
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/adornments/connecting_line_adornment');

/**
 * @class  Extension of ConnectingLineAdornment that can draw on maps
 * @extends DG.ConnectingLineAdornment
 */
DG.MapConnectingLineAdornment = DG.ConnectingLineAdornment.extend(
/** @scope DG.MapConnectingLineAdornment.prototype */
{

  /**
   * @property {DG.MapView}
   */
  mapSource: null,
  mapBinding: '.mapSource.mapLayer.map',

  /**
   * Create or update our lines, one for each parent present.
   * @param iAnimate {Boolean} [optional] if true then animate to new symbol location.
   */
  updateLine: function( iAnimate ) {
    var tMap = this.get('map');

    function getCoords( iX, iY) {
      return tMap.latLngToContainerPoint([iY, iX]);
    }

    this.doUpdateLine( iAnimate, getCoords);
  }

});


