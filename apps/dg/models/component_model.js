// ==========================================================================
//                              DG.Component
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

    Represents an individual component of a DG.Document.

 @extends DG.BaseModel
 */
DG.Component = DG.BaseModel.extend(
    /** @scope DG.Component.prototype */ {

      /**
       * A relational link back to the parent DG.Document
       * @property {DG.Document}
       */
      document: null,

      /**
       * The title of this component. Can be edited by user.
       * @property {String}
       */
      _title: null,
      title: function( iKey, iValue) {
        if( iValue !== undefined) {
          this._title = iValue;
          if (this.getPath('content.title')) {
            this.setPath('content.title', iValue);
          }
        }
        else if (SC.none(this._title)) {
          this._title = this.getPath('content.title') || this.getPath('content.defaultTitle');
        }
        return this._title;
      }.property(),

      //defaultTitleChanged: function() {
      //  this.notifyPropertyChange('title');
      //}.observes('*content.defaultTitle'),

      //contentTitleChanged: function() {
      //  this.notifyPropertyChange('title');
      //}.observes('*content.title'),

      /*
       * The width and height of this component in pixels to be used in layout.
       * @property {Object}
       */
      dimensions: function() {
        return this.getPath('content.dimensions');
      }.property(),

      contentDimensionsChanged: function() {
        this.notifyPropertyChange('dimensions');
      }.observes('*content.dimensions'),

      /*
       * An arbitrary version string to be presented in the header.
       * @property {string}
       */
      version: function() {
        return this.getPath('content.version');
      }.property(),

      contentVersionChanged: function() {
        this.notifyPropertyChange('version');
      }.observes('*content.version'),

      /**
       * Content is an arbitrary javascript object, serializable, and defined
       * by the Component.
       * @property {object}
       */
      content: function (iKey, iValue) {
        if (iValue !== undefined) {
          DG.Component.setContent(this, iValue);
        }
        return DG.Component.getContent(this);
      }.property(),


      /**
       * The type of the component (e.g. 'DG.CaseTable', 'DG.Graph', 'DG.Calculator', ...)
       * @property {String}
       */
      type: '',

      /**
       * The bounds of the component in the document stored as an SC.Layout-formatted object.
       * @property {Object}
       */
      layout: null,

      /**
       * Is only a value when we are minimized
       * If we are not minimized, this is null
       * When we are minimized, this is the height of the component to return to when unminimized
       * @property {Number}
       */
      savedHeight: null,

      /**
       * Per-component storage, in a component specific format.
       * @property {object} must be serializable
       */
      componentStorage: null,

      init: function() {
        sc_super();
        var tStorage = this.get('componentStorage');
        if (tStorage) {
          if( tStorage.title) {
            this.set('title', tStorage.title);
          }
          if( tStorage.name) {
            this.set('name', tStorage.name);
          }
        }
      },

      destroy: function () {
        if (this.document) {
          delete this.document.components[this.id];
        }
        sc_super();
      },

      toArchive: function () {
        var obj = {},
            tStorage = this.get('componentStorage');
        if( tStorage) {
          tStorage.title = this.get('title');
          tStorage.name = this.get('name');
        }
        obj = {
          type: this.type,
          guid: this.id,
          componentStorage: tStorage,
          layout: this.layout,
          savedHeight: this.get('savedHeight')
        };
        return obj;
      },

      verify: function () {
        if (SC.empty(this.document)) {
          DG.logWarn('Unattached component: ' + this.id);
        }
        if (typeof this.document === 'number') {
          DG.logWarn('Unresolved reference to document id, ' + this.document +
              ', in component: ' + this.id);
        }
      }


    });

/**
 Class-level map from DG.Component 'id's to content objects.

 Conceptually, the DG.Component owns a 'content' property. The fact that DG.Records get
 promiscuously cloned, however, makes it a bad idea to have potentially complicated
 content objects stored in top-level properties where they are likely to get cloned
 unnecessarily. Therefore, we use an object map. The computed 'content' property above
 insures that clients that get/set the 'content' property will be accessing the
 contents of this map rather than a simple property.
 */
DG.Component.contentMap = {};

DG.Component.clearContentMap = function () {
  DG.Component.contentMap = {};
};

/**
 Returns the content object associated with the specified component.
 @param  {DG.Component}  iComponent  The component whose content should be returned.
 @returns  {Object}  The content object associated with the specified component.
 */
DG.Component.getContent = function (iComponent) {
  var componentID = iComponent && iComponent.id;
  return componentID ? DG.Component.contentMap[componentID] : undefined;
};

/**
 Sets the content object associated with the specified component.
 @param  {DG.Component}  iComponent  The component whose content is being specified.
 @param  {Object}        iContent    The content object to associate with the component.
 */
DG.Component.setContent = function (iComponent, iContent) {
  // We must use DG.store.idFor() here because during creation, we can get
  // here with DG.store.idFor() having been updated appropriately, but
  // component.get('id') being stale.
  var componentID = iComponent && iComponent.id;
  if (!SC.none(componentID)) {
    if (iContent === undefined)
      delete DG.Component.contentMap[componentID];
    else DG.Component.contentMap[componentID] = iContent;
  }
};


DG.Component.createComponent = function (iProperties) {
  var tProperties = iProperties || {},
      tComponent;
  tComponent = DG.Component.create(tProperties);
  if (iProperties.document) {
    iProperties.document.components[tComponent.get('id')] = tComponent;
  }

  return tComponent;
};

DG.Component.destroyComponent = function (iComponent) {
  iComponent.destroy();
};
