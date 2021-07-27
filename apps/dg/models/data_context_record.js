// ==========================================================================
//                        DG.DataContextRecord
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

sc_require('models/model_store');
sc_require('models/base_model');

/** @class
 * Represents a data context.
 *
 * A data context is bound to a single source of data, e.g. a data interactive.
 * It manages a Data Set.
 *
 * @extends SC.BaseModel
 */
DG.DataContextRecord = DG.BaseModel.extend(/** @scope DG.DataContextRecord.prototype */ {

  type: 'DG.DataContext',

  /**
   * A relational link back to the parent DG.Document
   * @property {DG.Document}
   */
  document: null,

  /**
   * Externally specified identifier for data context.
   * @type {string}
   */
  name: null,

  /**
   * Displayable name for data context
   * @type {string}
   */
  _title: null,
  title: function(key, value) {
    if (value) {
      this._title = value;
    }
    return this._title || this.get('defaultTitle') || this.name ;
  }.property('_title', 'name'),

  /**
   * A free-text description of the data context.
   * Deprecated: use metadata.description.
   */
  description: "",

  /**
   * Data about the source of the data context.
   */
  metadata: null,

  /**
   * If true, indicates the user should be prevented from moving attributes
   * or creating new collections or attributes. Defaults to false.
   */
  preventReorg: false,

  /**
   * A relational link to the collections in this context.
   * @property {[DG.Collection]}
   */
  collections: null,
  collectionsChangeCount: 0,

  defaultTitle: function() {
    var tTitle = '';
    DG.ObjectMap.forEach(this.collections, function (collectionKey){
      if( !SC.empty( tTitle))
        tTitle += '/';
      tTitle += this.collections[collectionKey].get('name');
    }.bind(this));
    return tTitle;
  }.property(),

  /**
    The dependency mananager
   */
  dependencyMgr: null,

  /**
   * The base data set for the collections in this context.
   * @property {DG.DataSet}
   */
  dataSet: null,

  /**
   * The context is has had its original organization modified.
   * No new data should be added.
   * @property {boolean}
   */
  flexibleGroupingChangeFlag: false,

  /**
   * Per-component storage, in a component specific format.
   * @property {JSON}
   */
  contextStorage: null,

  _savedShadowCopy: null,

  init: function () {
    this.collections = {};
    this.dependencyMgr = DG.DependencyMgr.create({ dataContext: this });
    this.dataSet = DG.DataSet.create({dataContextRecord: this});
    sc_super();
  },

  verify: function () {
    if (SC.empty(this.document)) {
      DG.logWarn('Unattached data context: ' + this.id);
    }
    if (typeof this.document === 'number') {
      DG.logWarn('Unresolved reference to document id, ' + this.document +
        ', in data context: ' + this.id);
    }
  },

  destroy: function() {
    if (this.collections) {
      DG.ObjectMap.forEach(this.collections, function( iCollectionID, iCollection) {
        DG.Collection.destroyCollection( iCollection);
      });
    }
    delete this.document.contexts[this.id];
    sc_super();
  },

  createCollection: function( iProperties) {
    iProperties = iProperties || {};
    iProperties.context = this;
    return DG.Collection.createCollection( iProperties);
  },

  addCollection: function (iCollection) {
    this.collections[iCollection.id] = iCollection;
    this.incrementProperty('collectionsChangeCount', 1);
  },

  removeCollection: function (iCollection) {
    delete this.collections[iCollection.id];
    this.incrementProperty('collectionsChangeCount', 1);
  },

  /**
   * Prepares a streamable version of this object. Streamable means it is
   * JSON ready and has all persistent data for the object and its sub-objects.
   *
   * In this case we take special care to avoid forward references among
   * collections.
   * @param {boolean} fullData Whether to generate data or externalDocumentId only.
   *   TODO: This option is intended to support saving of document fragments and as
   *   such, may be obsolescent.
   * @param {boolean} excludeCases Whether to exclude cases.
   * @returns {Object}
   */
  toArchive: function (fullData, excludeCases) {
    function notEmpty(collection) {
      return !(SC.none(
          collection.attrs) || (collection.attrs.length === 0));
    }
    var obj;
    var root;
    fullData = true;
    if ( fullData) {
      obj = {
        type: this.type,
        document: this.document && this.document.id || undefined,
        guid: this.id,
        id: this.id,
        flexibleGroupingChangeFlag: this.flexibleGroupingChangeFlag,
        name: this.get('name'),
        title: this.get('title'),
        collections: [],
        description: this.description,
        metadata: this.metadata,
        preventReorg: this.preventReorg,
        setAsideItems: this.get('dataSet').archiveSetAsideItems(),
        contextStorage: this.contextStorage
      };

      DG.ObjectMap.values(this.collections).some(function (collection){
        if (SC.none(collection.parent) && notEmpty(collection)) {
          root = collection;
          return true;
        }
        return false;
      });

      if (root && root.children) {
        while (root.children.length > 0) {
          obj.collections.push(root.toArchive(excludeCases));
          root = root.children[0];
        }
      }
      if (!SC.none(root)) {
        obj.collections.push(root.toArchive(excludeCases));
      }
    }
    return obj;
  },

  savedShadowCopy: function() {
    return this._savedShadowCopy;
  },

  updateSavedShadowCopy: function(shadow) {
    this._savedShadowCopy = shadow;
  }

});

DG.DataContextRecord.createContext = function( iProperties) {
  function makeDataContextName() {
    var doc = DG.currDocumentController();
    var ix = 1;
    var name = 'DG.DataContext.baseName'.loc(ix);
    while (doc.getContextByName(name)) {
      name = 'DG.DataContext.baseName'.loc(++ix);
    }
    return name;
  }
  var tContext, shadowCopy = {};
  if( SC.none( iProperties)) iProperties = {};
  if( SC.none( iProperties.type)) iProperties.type = 'DG.DataContext';
  if (!iProperties.document) {
    iProperties.document = DG.currDocumentController().content;
  }
  iProperties.document = DG.store.resolve(iProperties.document);
  tContext = DG.DataContextRecord.create(iProperties);
  tContext.updateSavedShadowCopy(shadowCopy);
  if (iProperties.document) {
    iProperties.document.contexts[tContext.get('id')] = tContext;
  }
  // Make unique name, if none provided.
  if (SC.empty(tContext.name)) {
    tContext.name = makeDataContextName();
  }
  if (iProperties.collections) {
    iProperties.collections.forEach(function (iProps) {
      iProps.context = tContext;
      DG.Collection.createCollection(iProps);
    });
  }
  if (iProperties.setAsideItems) {
    var tDataSet = tContext.get('dataSet');
    tDataSet.createSetAsideItems(iProperties.setAsideItems);
  }
  DG.log("Create context: '%@'", tContext.name);

  return tContext;
};

DG.DataContextRecord.destroyContext = function( iContext) {
  iContext.destroy();
};
