// ==========================================================================
//                            DG.TextModel
//
//  Author:   Kirk Swenson
//
//  Copyright (c)2020 The Concord Consortium
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

/** @class  DG.TextModel

 @extends SC.Object
 */
DG.TextModel = SC.Object.extend(
  /** @scope DG.TextModel.prototype */
  {
    /**
     The serialized content of the text object. Prior to build 0535 this was simple text.
     As of 0535 it is a JSON representation of the rich text content. If a newer build
     encounters plain text here it will be converted to the rich text format.
     This build is mapped to the 'theText' function property of the DG.TextController,
     which is in turn mapped via SproutCore binding to the 'value' property of DG.TextView.
     @property { Object }
     */
    text: null,

    _apiText: null,

    /**
     This property is intended for use by the data interactive (plugin) API. When referenced
     it returns the contents of the local '_apiText' property, if one has been set, or the
     'text' property otherwise. When written it notifies that it has changed, which triggers
     the DG.TextController to synchronize this `apiText` value to its 'theText' and 'theValue'
     properties in a way that signals the DG.TextView to load the new value.
     @property { Object }
     */
    apiText: function(k, v) {
      if (v != null) {
        this._apiText = v;
      }
      return this._apiText || this.get('text');
    }.property(),

    init: function() {
      sc_super();
    }

  });
