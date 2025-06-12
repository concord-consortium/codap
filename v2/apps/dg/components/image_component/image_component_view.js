// ==========================================================================
//                          DG.WebView
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

/** @class
 * Implements a view of an image that presents a loading message
 * and an error message, if the load fails. In particular, if the load of a
 * page from another origin fails, the underlying message will be visible. We
 * won't be able to interrogate the IFrame, so the error message will be the
 * only indication the user has of the failure.
 * @extends SC.View
 */
DG.ImageComponentView = SC.View.extend(
/** @scope DG.WebView.prototype */ {
    classNames: ['dg-web-view'],
    childViews: ['imageView'],

    isTextSelectable: YES,

    /**
     * The URL provided.
     * @type {String}
     */
    value: '',

    /**
     * The URL to load.
     *
     * We load protocol relative URLs to maximize the likelihood of success.
     * See: https://www.paulirish.com/2010/the-protocol-relative-url/
     *
     * @type {String}
     */
    _url: function () {
      return this.get('value').replace(/^https?:/, '');
    }.property('value'),

    imageView: SC.ImageView.extend({
      classNames: ['dg-web-view-frame'],

      value: function () {
        return this.getPath('parentView._url');
      }.property(),

      valueDidChange: function () {
        this.notifyPropertyChange('value');
      }.observes('parentView._url'),

      scale: SC.BEST_FIT,

    })
});
