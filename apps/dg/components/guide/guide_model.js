// ==========================================================================
//                            DG.GuideModel
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

/** @class  DG.GuideModel - The GuideModel singleton stores what is needed to
 * construct the Guide menu in the tool shelf.

 @extends SC.Object
 */
DG.GuideModel = SC.Object.extend(
  /** @scope DG.GuideModel.prototype */
  {
    /**
     @property { String }
     */
    title: '',

    /**
     @property { Array of { itemTitle: {String}, url: {String} }
     */
    items: null,

    /**
     * @property {String}
     */
    currentURL: '',

    /**
     * @property {String}
     */
    currentItemTitle: '',

    init: function() {
      sc_super();
      this.reset();
    },

    reset: function() {
      this.beginPropertyChanges();
        this.set('title', '');
        this.set('currentURL', '');
        this.set('currentItemTitle', '');
        this.set('items', []);
      this.endPropertyChanges();
    },

    createComponentStorage: function() {
      return { title: this.title, items: this.items,
        currentURL: this.currentURL, currentItemTitle: this.currentItemTitle };
    },

    restoreComponentStorage: function( iStorage) {
    // For a while we had an invokeLater wrapping the following because it improved
    // Chromes ability to load iframes. But we think fixed that in a better way
      this.beginPropertyChanges();
        if( iStorage.currentURL)
          this.set('currentURL', iStorage.currentURL);
        if( iStorage.title)
          this.set('title', iStorage.title);
        if( iStorage.title)
          this.set('currentItemTitle', iStorage.currentItemTitle);
        if( iStorage.items)
          this.set('items', iStorage.items);
      this.endPropertyChanges();
    }

  } );

