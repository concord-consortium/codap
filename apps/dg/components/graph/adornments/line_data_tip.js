// ==========================================================================
//                            DG.LineDataTip
//
//  Author:   William Finzer
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph/adornments/data_tip');

/** @class DG.LineDataTip A simple adornment-like class that displays and updates a data tip that shows when the
 *    user hovers over a line.

  @extends DG.DataTip
*/
DG.LineDataTip = DG.DataTip.extend(
/** @scope DG.LineDataTip.prototype */ 
{
  /**
   * @property { {lineIndex: {Number}, parentName: {String}, numChildren: {Number}, childrenName: {String} }
   */
  info: null,

  /**
   * The returned string describes the line that the user is hovering over.
   * @return { String }
   */
  getDataTipText: function() {
    var tResult = '';
    if( this.info) {
      tResult = 'DG.DataTip.connectingLine'.loc( this.info.groupingAttributeName,
                                                this.info.groupingAttributeValue,
                                                this.info.numChildren,
                                                this.info.childrenName);
    }
    return tResult;
  },

  /**
   * Set up tip coordinates and info for generating text before passing control to base class
   * @param iInfo { {lineIndex: {Number}, parentName: {String}, numChildren: {Number}, childrenName: {String} }
   * @param iCoords
   */
  show: function( iInfo, iCoords) {
    this.info = {};
    this.tipOrigin = {};
    DG.ObjectMap.copy( this.info, iInfo);
    DG.ObjectMap.copy( this.tipOrigin, iCoords);

    sc_super();
  }

});

