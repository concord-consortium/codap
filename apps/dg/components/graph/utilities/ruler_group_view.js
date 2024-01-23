// ==========================================================================
//                          DG.RulerGroupView
//
//  Author:   William Finzer
//
//  Copyright (c) 2024 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  DG.RulerGroupView - Serves as a base for views that allow the full set of univariate
 * adornments.
 @extends SC.View
 */

var kMargin = 0,
   kLeading = 5,
   kPaddingRight = 5;

DG.RulerGroupView = SC.View.extend(SC.FlowedLayout,
    /** @scope DG.RulerGroupView.prototype */
{
  visibilityStateProperty: '',
  localizable: true,
  layoutDirection: SC.LAYOUT_VERTICAL,
  isResizable: false,
  isClosable: false,
  defaultFlowSpacing: {left: kMargin, bottom: kLeading},
  canWrap: false,
  align: SC.ALIGN_TOP,
  layout: {top: kLeading, right: kPaddingRight},
  childViews: 'toggleView'.w(),
  toggleView: SC.DisclosureView.design({
    classNames: 'dg-disclosure'.w(),
    layout: { width: 200, height: 18 },
    value: false,
  }),
  init: function() {
    var this_ = this;
    sc_super();
    this.setPath('toggleView.title', this.get('title'));
    // By default the toggleView's value is false. The desired value is stored in the
    // DG.UnivariateAdornmentBaseModel.rulerState hash, but we wait to set it until
    // to avoid SC layout problems with SC.ButtonView's.
    this.invokeLater( function() {
      this_.setPath('toggleView.value',
         DG.UnivariateAdornmentBaseModel.rulerState[this.get('visibilityStateProperty')]);
    }, 100);
  },
  forEachControlView: function( iDoF) {
    var tToggleView = this.get('toggleView');
    this.get('childViews').forEach( function( iChildView) {
      iChildView !== tToggleView && iDoF( iChildView);
    });
  },
  syncChildViewVisibility: function() {
    var this_ = this;
    this.forEachControlView( function( iChildView) {
      iChildView.set('isVisible', this_.getPath('toggleView.value'));
    });
  },
  toggleViewValueDidChange: function() {
    this.syncChildViewVisibility();
    DG.UnivariateAdornmentBaseModel.rulerState[this.get('visibilityStateProperty')] = this.getPath('toggleView.value');
  }.observes('.toggleView.value'),
});
