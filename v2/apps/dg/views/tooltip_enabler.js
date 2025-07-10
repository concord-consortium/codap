// ==========================================================================
//                          DG.TooltipEnabler
// 
//  A mixin that makes tooltips work properly in ordinary views
//  
//  Author:   William Finzer
//
//  Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.
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

/** @class

    DG.TooltipEnabler is a mixin the does the right thing with a View's tooltip property.

 */
DG.TooltipEnabler = {
  localize: true,
  toolTipDidChange: function() {
    this.updateLayer();
  }.observes('displayToolTip'),
  render: function(context) {
    sc_super();
    var toolTip = this.get('displayToolTip');
    if (toolTip)
      context.setAttr('title', toolTip);
  }
};