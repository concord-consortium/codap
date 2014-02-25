// ==========================================================================
//                            DG.GuideView
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

/** @class  DG.GuideView - Not much more than an SC.WebView. Exists as a singleton.

 @extends SC.WebView
 */
DG.GuideView = SC.WebView.extend(
  /** @scope DG.GuideView.prototype */
  (function() {

    return {
      /**
       The model on which this view is based.
       @property { DG.GuideModel }
       */
      guideModel: null,

      realURL: function() {
        return DG.StringUtilities.guaranteePrefix( this.getPath('guideModel.currentURL'), 'http://')
      }.property('guideModel.currentURL'),

      init: function() {
        sc_super();
        DG.assert( !SC.none( this.get( 'guideModel' ) ) );
      },

      currentURLDidChange: function() {
        // In Chrome, a direct call to set the URL often fails. We've experimented with
        // different delays and found 500 to work reliably.
        // Bottom line is we don't understand what's going on and why it only affects Chrome
        // TODO: Understand this and figure out how to get rid of the invokeLater
        this.invokeLater( function() {
          this.set('value', this.get('realURL'));
        }.bind(this),
        500);
      }.observes('guideModel.currentURL')

    };
  }()) );

