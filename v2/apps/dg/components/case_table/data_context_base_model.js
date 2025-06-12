// ==========================================================================
//  
//  Author:   kswenson
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
/** @class  DG.DataContextBaseModel - The base model for a case table or case card component.

 @extends SC.Object
 */
DG.DataContextBaseModel = SC.Object.extend(/** @scope DG.DataContextBaseModel.prototype */ {
  /**
   @property { DG.DataContext }
   */
  context: null,

  id: null,
  idBinding: '*context.id',

  /**
   * Name of the component, always the data context name.
   * @property {string}
   */
  name: function (k, v) {
    if (!SC.none(v)) {
      this.context.applyChange({
        operation: 'updateDataContext',
        properties: {name: v}
      });
    }
    return this.getPath('context.name');
  }.property(),

  /**
   * Title of the component: always the data context title.
   * @property {string}
   */
  title: function(k, v) {
    if (!SC.none(v)) {
      this.context.applyChange({
        operation: 'updateDataContext',
        properties: {title: v}
      });
    }
    return this.getPath('context.title');
  }.property(),

  titleDidChange: function () {
    return this.notifyPropertyChange('title');
  }.observes('*context.title'),

  defaultTitle: function() {
    return this.getPath('context.defaultTitle');
  }.property(),

  defaultTitleDidChange: function () {
    return this.notifyPropertyChange('defaultTitle');
  }.observes('*context.defaultTitle')

});
