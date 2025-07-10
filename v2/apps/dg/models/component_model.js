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

      userSetTitle: false,

      titleChanged: function () {
        // clear local cache when content title changes
        this._title = null;
        this.notifyPropertyChange('title');
      }.observes('*content.title', '*content.defaultTitle'),

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

      /**
       * This property is transient. The Plugin api uses it to convey position
       * to the view, which, in turn updates the layout. We persist the layout.
       * Of layout properties, only left and top can be set.
       *
       * @param value {{left: number, top: number}}
       */
      _position: null,
      position: function (key, value) {
        if (value && typeof value === 'object') {
          if (SC.none(this._position)) {
            this._position = {};
          }
          this._position.left = value.left;
          this._position.top = value.top;
        }
        return this._position;
      }.property(),

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
       * If true, the close button will not show in the component title bar.
       * @property {Boolean}
       */
      _cannotClose: false,
      cannotClose: function (iKey, iValue) {
        if (!SC.none(iValue)) {
          this._cannotClose = iValue;
        }
        return this._cannotClose;
      }.property('_cannotClose'),

      /**
       * @property {{width:{boolean}, height: {boolean}}}
       */
      _isResizable: null,
      /**
       * @property {boolean}
       */
      isResizable: function( iKey, iValue) {
        if(!SC.empty(iValue)) {
          if( typeof iValue === 'object')
            this._isResizable = iValue;
          else if( typeof iValue === 'boolean')
            this._isResizable = { width: iValue, height: iValue };
        }
        return this._isResizable.width && this._isResizable.height;
      }.property(),

      /**
       * @property {boolean}
       */
      isWidthResizable: function(iKey, iValue) {
        if( !SC.empty(iValue) && typeof iValue === 'boolean')
          this._isResizable.width = iValue;
        return this._isResizable.width;
      }.property(),

      /**
       * @property {boolean}
       */
      isHeightResizable: function(iKey, iValue) {
        if( !SC.empty(iValue) && typeof iValue === 'boolean')
          this._isResizable.height = iValue;
        return this._isResizable.height;
      }.property(),

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
        this._isResizable = { width: true, height: true };  // default
        var tStorage = this.get('componentStorage');
        if (tStorage) {
          if( tStorage.title) {
            this.set('title', tStorage.title);
          }
          if( tStorage.name) {
            this.set('name', tStorage.name);
          }
          if( tStorage.userSetTitle) {
            this.set('userSetTitle', tStorage.userSetTitle);
          }
          if (!SC.none(tStorage.cannotClose)) {
            this.set('cannotClose', tStorage.cannotClose);
          }
        }
      },

      destroy: function () {
        var document = DG.currDocumentController().content;
        if (document) {
          delete document.get('components')[this.id];
        }
        sc_super();
      },

      toArchive: function () {

        function populateLayout( iLayout) {
          // The problem is that we can get here with only some of the layout parameters we need defined.
          // Particularly we can get here without right and/or bottom.
          // We correct that unusal situation heuristically
          iLayout.left = iLayout.left || 0;
          iLayout.top = iLayout.top || 0;
          iLayout.width = iLayout.width || 300;
          iLayout.height = iLayout.height || 300;
          iLayout.right = iLayout.right || iLayout.left + iLayout.width;
          iLayout.bottom = iLayout.bottom || iLayout.top + iLayout.height;
          return iLayout;
        }

        var obj = {},
            tStorage = this.get('componentStorage'),
            tCannotClose = this.get('cannotClose'),
            tPopulatedLayout;
        if( tStorage) {
          tStorage.title = this.get('title') || tStorage.title;
          tStorage.name = tStorage.name || this.get('name');
          tStorage.userSetTitle = tStorage.userSetTitle || this.get('userSetTitle');
          tStorage.cannotClose = SC.none(tCannotClose)? tStorage.cannotClose: tCannotClose;
        }
        tPopulatedLayout = populateLayout( this.layout);
        obj = {
          type: this.type,
          guid: this.id,
          id: this.id,
          componentStorage: tStorage,
          layout: tPopulatedLayout,
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
