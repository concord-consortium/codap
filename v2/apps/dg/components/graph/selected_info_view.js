// ==========================================================================
//                              DG.SelectedInfoView
//
//  Author:   William Finzer
//
//  Copyright (c) 2020 by The Concord Consortium, Inc. All rights reserved.
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

/** @class  DG.SelectedInfoView - Only visible when "Show Measures for Selection" is enabled
 * in a graph. It displays something like: Showing measures for <nn> selected.


 @extends SC.LabelView
 */
DG.SelectedInfoView = SC.LabelView.extend(
    /** @scope DG.SelectedInfoView.prototype */
    (function () {
      return {

        classNames: 'dg-selected-info-view'.w(),

        graphModel: null,   // DG.GraphModel

        desiredExtent: function() {
          return this.get('isVisible') ? DG.RenderingUtilities.kCaptionFontHeight : 0;
        }.property('isVisible'),

        init: function() {
          sc_super();
          this.enableMeasuresForSelectionDidChange();
        },

        enableMeasuresForSelectionDidChange: function() {
          if( this.getPath('graphModel.enableMeasuresForSelection')) {
            this.set('isVisible', true);
            this.selectionDidChange();
          } else {
            this.set('isVisible', false);
          }
        }.observes('graphModel.enableMeasuresForSelection'),

        selectionDidChange: function() {
          if( this.get('isVisible')) {
            var tNumSelected = this.getPath('graphModel.selection').length,
                tValueString = tNumSelected === 1 ? 'DG.SelectedInfoView.infoSing' :
                    'DG.SelectedInfoView.infoPlural';
            this.set('value', tValueString.loc(tNumSelected));
          }
        }.observes('graphModel.dataConfiguration.selection')
      };
    }()));

