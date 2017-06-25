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
/**
 * Created by jsandoe on 10/17/14.
 */
sc_require('models/base_model');

/**
 * @class
 *
 * A GlobalValue is a named, user created value that can be employed in
 * formulas. Sliders control global values.
 *
 * @extends DG.BaseModel
 */
DG.GlobalValue = DG.BaseModel.extend(/** @scope DG.GlobalValue.prototype */ {

  /**
   * The name of the global value
   * @property {String}
   */
  name: '',

  /**
   * The "native" storage of the value is a number for now.
   * Eventually, this will need to be a more general notion of value.
   * @property {Number}
   */
  value: '',

  /**
   * A relational link back to the document.
   * @property {DG.Document}
   */
  document: null,

  destroy: function () {
    if (this.document) {
      delete this.document.globalValues[this.id];
    }
    sc_super();
  },

  verify: function () {
    if (SC.empty(this.document)) {
      DG.logWarn('Unattached global value: ' + this.id);
    }
    if (typeof this.document === 'number') {
      DG.logWarn('Unresolved reference to document id, ' + this.document +
        ', in global value: ' + this.id);
    }
  },

  archivable: true,

  toArchive: function () {
    return {
      name: this.name,
      value: this.value,
      guid: this.id
    };
  }
});

DG.GlobalValue.createGlobalValue = function (iProperties) {
  var tProperties = iProperties || {},
    tGlobal = DG.GlobalValue.create(tProperties);
  if (iProperties.document) {
    tProperties.document.globalValues[tGlobal.get('id')] = tGlobal;
  }
  return tGlobal;
};

DG.GlobalValue.destroyGlobalValue = function (iGlobalValue) {
  iGlobalValue.destroy();
};
