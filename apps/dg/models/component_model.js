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

 @extends SC.Object
 */
DG.Component = DG.BaseModel.extend(
  /** @scope DG.Component.prototype */ {

    /**
     * A relational link back to the parent DG.Document
     * @property {DG.Document}
     */
    document: null,

    /**
     * Content is an arbitrary javascript object, serializable, and defined
     * by the Component.
     */
    content: function (iKey, iValue) {
      if (iValue !== undefined) {
        DG.Component.setContent(this, iValue);
        return this;
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
     * @property {JSON}
     */
    layout: null,

    /**
     * Per-component storage, in a component specific format.
     * @property {JSON}
     */
    componentStorage: null,

    destroy: function () {
      if (this.document) {
        delete this.document.components[this.id];
      }
      sc_super();
    },
    toArchive: function() {
      var obj = {};
      obj = {
        type: this.type,
        guid: this.id,
        componentStorage: this.componentStorage,
        layout: this.layout
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

/**
 Returns the content object associated with the specified component.
 @param  {DG.Component}  iComponent  The component whose content should be returned.
 @returns  {Object}  The content object associated with the specified component.
 */
DG.Component.getContent = function (iComponent) {
  var componentID = iComponent && iComponent.id;
  return componentID ? DG.Component.contentMap[ componentID] : undefined;
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
      delete DG.Component.contentMap[ componentID];
    else DG.Component.contentMap[ componentID] = iContent;
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
