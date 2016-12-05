// ==========================================================================
//                            DG.InfoTip
//
//  Author:   William Finzer
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('utilities/tool_tip');

/** @class DG.InfoTip A simple adornment-like class that displays and updates a data tip that shows
 *        at the behest of the owner

  @extends DG.DataTip
*/
DG.InfoTip = DG.DataTip.extend(
/** @scope DG.InfoTip.prototype */
{
  layerName: 'dataTip',
  getDataTipText: function () {
    var tResult = '';
    if (this.info) {
      tResult = this.info.tipString.loc(this.info.tipValue);
    }
    return tResult;
  },

  show: function (iInfo) {
    this.tipOrigin = {x: iInfo.x, y: iInfo.y};
    this.info = {tipString: iInfo.tipString, tipValue: iInfo.tipValue};

    sc_super();
  }

});
