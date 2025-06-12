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
        // We require the author to specify either http:// or https:// so that there is no ambiguity
        return this.getPath('guideModel.currentURL');
      }.property(),

      realURLDidChange: function () {
        this.notifyPropertyChange('realURL');
      }.observes('*guideModel.currentURL'),

      init: function() {
        sc_super();
        DG.assert( !SC.none( this.get( 'guideModel' ) ) );
        this.currentURLDidChange(); // So that the model's currentURL can be installed
      },

      currentURLDidChange: function() {
      // For a while we had an invokeLater wrapping the following because it improved
      // Chromes ability to load the iframe. But we think fixed that in a better way
        this.set('value', this.get('realURL'));
      }.observes('guideModel.currentURL')

    };
  }()) );

