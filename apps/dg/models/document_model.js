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
/*
 * Created by jsandoe on 10/17/14.
 */
sc_require('models/model_store');
sc_require('models/base_model');
/**
 * @class
 *
 * A describes the momentary state of a user interaction with CODAP components
 * and collections of data in the CODAP workspace.
 *
 * The document provides view and controller objects with access to data contexts,
 * components, and global values. In a running instance of CODAP there is always
 * exactly one active document. It can create contexts and destroy itself
 * and its dependent objects. Documents can be serialized and deserialized. This
 * permits them to be stored to filesystems or databases.
 *
 * @extends DG.baseModel
 */
DG.Document = DG.BaseModel.extend(
  /** @scope DG.Document.prototype */ {
    type: 'DG.Document',
    id: null,
    name: '', // String
    appName: '', // String
    appVersion: '', // String
    appBuildNum: '', // String
    components: null,
    contexts: null,
    globalValues: null,

    init: function () {
      this.components = {};
      this.contexts = {};
      this.globalValues = {};
      sc_super();
    },
    verify: function () {
      if (SC.empty(this.name)) {
        DG.logWarn('Unnamed document: ' + this.id);
      }
    },
    getGlobalValueByName: function (name) {
      var key;
      for (key in this.globalValues) {
        if (this.globalValues[key].name === name) {
          return this.globalValues[key];
        }
      }
    },
    // init: function () {},
    destroy: function () {
      sc_super();
    },
    createContext: function(iProperties) {
      if( SC.none( iProperties)) iProperties = {};
      iProperties.document = this;
      return DG.DataContextRecord.createContext( iProperties);
    },
    /**
     * Prepare to save record. Set the current app information, potentially
     * overriding original document information.
     */
    willSaveRecord: function() {
      this.set('appName', DG.APPNAME);
      this.set('appVersion', DG.VERSION);
      this.set('appBuildNum', DG.BUILD_NUM);
    },

    toArchive: function(fullData) {
      var obj = {
          name: this.name,
          guid: this.id,
          components: [],
          contexts: [],
          globalValues: [],
          appName: DG.APPNAME,
          appVersion: DG.VERSION,
          appBuildNum: DG.BUILD_NUM
        };
      DG.ObjectMap.forEach(this.globalValues, function (globalKey) {
        var globalValue = this.globalValues[globalKey];
        if (globalValue.get('archivable'))
          obj.globalValues.push(globalValue.toArchive());
      }.bind(this));
      DG.ObjectMap.forEach(this.components, function (componentKey) {
        obj.components.push(this.components[componentKey].toArchive());
      }.bind(this));
      DG.ObjectMap.forEach(this.contexts, function (contextKey) {
        obj.contexts.push(this.contexts[contextKey].toArchive(fullData));
      }.bind(this));

      return obj;
    }
  });

DG.Document.createDocument = function( iProperties) {

  /**
   * We make a pass through all the values because there may be some strings that represent date-times.
   * @param iContexts {Object}
   */
  function changeDateStringValuesToDates( iContexts) {
    iContexts.forEach( function( iContext) {
      if (iContext.collections) {
        iContext.collections.forEach(function (iCollection) {
          if (iCollection.cases) {
            iCollection.cases.forEach(function (iCase) {
              if (iCase.values) {
                DG.ObjectMap.forEach(iCase.values, function (iKey, iValue) {
                  if (DG.isDateString(iValue))
                    iCase.values[iKey] = DG.createDate(iValue);
                });
              }
            });
          }
        });
      }
    });
  }

  var tDocument,
    tProperties = iProperties || {};

  //if(DG.activeDocument) {
  //  DG.logError("Can't create another document without closing the first.");
  //  DG.Document.destroyDocument(DG.activeDocument);
  //  DG.activeDocument = null;
  //  DG.store = null;
  //}

  /* A store must exist to create a document */
  DG.store = DG.ModelStore.create();
  tDocument =  DG.Document.create(tProperties);

  DG.activeDocument = tDocument;

  if (tProperties.globalValues) {
    tProperties.globalValues.forEach( function (gv) {
      gv.document = tDocument;
      DG.GlobalValue.createGlobalValue(gv);
    });
  }
  if (tProperties.components) {
    tProperties.components.forEach(function (component) {
      component.document = tDocument;
      DG.Component.createComponent(component);
    });
  }
  if (tProperties.contexts) {
    changeDateStringValuesToDates( tProperties.contexts);
    tProperties.contexts.forEach(function (context) {
      context.document = tDocument;
      DG.DataContextRecord.createContext(context);
    });
  }
  DG.log('Create document: ' + [tDocument.name, tDocument.appName].join(', '));

  return tDocument;
};

DG.Document.destroyDocument = function( iDocument) {
  if( iDocument) {
    iDocument.destroy();
  }
  DG.activeDocument = null;
  DG.store = null;
};
