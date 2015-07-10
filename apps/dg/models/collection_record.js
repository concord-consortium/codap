// ==========================================================================
//                        DG.CollectionRecord
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

sc_require('models/base_model');

/** @class

  (Document your Model here)

 @extends SC.Object
 */
DG.CollectionRecord = DG.BaseModel.extend( (function() // closure
/** @scope DG.CollectionRecord.prototype */ {

  return {  // return from closure

    /**
     * The id of the model object.
     * @property {number}
     */
    id: null,

    /**
     * The name of the collection
     * @property {String}
     */
    name: '',

    /**
     * A description of/comment for the collection.
     * @property {String}
     */
    description: '',

    /**
     * A relational link back to the owning data context.
     * @property {DG.DataContextRecord}
     */
    context: null,

    /**
     * A relational link back to the parent collection (if any).
     * @property {DG.CollectionRecord}
     */
    parent: null,

    /**
     * A relational link to the subcollections of this collection.
     * @property {Array of DG.CollectionRecord}
     */
    children: null,

    /**
     * Indicates whether parent/child links are configured correctly.
     * Games using the revised API (Aug 2011) should set this to true.
     * Note that this property is not a record attribute and is not
     * expected to be archived with the record. It's a temporary flag
     * for use until games using the old API are no longer supported.
     * @property {Boolean}
     */
    areParentChildLinksConfigured: false,

    /**
     * A relational link to the attributes of this collection.
     *  Note that "attributes" is a reserved property name in SproutCore.
     * @property {Array of DG.Attribute}
     */
    attrs: null,

    /**
     * A relational link to the cases of this collection.
     * @property {Array of DG.Case}
     */
    cases: null,

    /**
     * Map of case IDs to indices within parent cases
     * @property {Object} of {String}:{Number}
     */
    caseIDToIndexMap: null,

    /**
     * Map of parent case IDs to number of cases with that parent
     * @property {Object} of {String}:{Number}
     */
    caseCounts: null,

    init: function () {
      this.attrs = [];
      this.cases = [];
      this.children = [];
      sc_super();
    },
    /**
     Destroy the collection's cases and attributes when the collection is destroyed.
     */
    destroy: function() {
      var context, ix;
      this.cases.forEach( function( iCase) { DG.Case.destroyCase( iCase); });

      this.attrs.forEach( function( iAttr) { DG.Attribute.destroyAttribute( iAttr); });

      if (this.parent) {
        ix = this.parent.children.indexOf(this);
        if (ix >= 0) {
          this.parent.children.splice(ix, 1);
        }
      }
      context = this.context;
      delete context.collections[this.id];
      sc_super();
    },

    verify: function () {
      if (SC.empty(this.context)) {
        DG.logWarn('Unattached collection: ' + this.id);
      }
      if (typeof this.context === 'number') {
        DG.logWarn('Unresolved reference in collection ' + this.id + ' to context ' + this.context);
      }
      if (!SC.empty(this.parent) && (typeof this.parent === 'number')) {
        DG.logWarn('Collection parent is a key -- collection/key: ' + this.name
          + '/' + this.parent);
      }
      if (SC.empty(this.name)) {
        DG.logWarn('Collection with no name: ' + this.id);
      }
    },

    /**
     Returns true if iOtherCollection is descended from this collection.
     @param {DG.CollectionRecord} iOtherCollection The collection to test for ancestry.
     @returns {Boolean} True if this is an ancestor of iOtherCollection, false otherwise.
     */
    isAncestorOf: function( iOtherCollection) {
      return iOtherCollection.isDescendantOf( this);
    },

    /**
     Returns true if this collection is descended from iOtherCollection.
     @param {DG.CollectionRecord} iOtherCollection The collection to test for ancestry.
     @returns {Boolean} True if this is an descendant of iOtherCollection, false otherwise.
     */
    isDescendantOf: function( iOtherCollection) {
      var parent = this.get('parent');
      // If I don't have a parent, then I'm not descended from anything
      if( !parent) return false;
      // If the other collection is my parent, then I'm a descendant
      if( parent === iOtherCollection) return true;
      // Otherwise, if my parent is a descendant, then I'm a descendant
      return parent.isDescendantOf( iOtherCollection);
    },

    /**
     Find the DG.Attribute with the specified name.
     @param    {String}        iName -- The name of the attribute to find
     @returns  {DG.Attribute}  The attribute with the specified name
     */
    getAttributeByName: function( iName) {
      var attrs = this.get('attrs'),
        i, attrCount = attrs && attrs.get('length');
      for( i = 0; i < attrCount; ++i) {
        var attr = attrs.objectAt( i);
        if( attr && (attr.get('name') === iName))
          return attr;
      }
      return null;
    },
    toArchive: function () {
      var parentID, obj;
      if (this.parent) {
        if (typeof this.parent === 'number') {
          parentID = this.parent;
        } else {
          parentID = this.parent.id;
        }
      }
      obj = {
        areParentChildLinksConfigured: this.areParentChildLinksConfigured,
        attrs: [],
        cases: [],
        caseName: this.caseName,
        childAttrName: this.childAttrName,
        collapseChildren: this.collapseChildren,
        guid: this.id,
        labels: this.labels,
        name: this.name,
        parent: parentID
      };
      this.attrs.forEach(function (attr) {
        obj.attrs.push(attr.toArchive());
      });
      this.cases.forEach(function (myCase) {
        obj.cases.push(myCase.toArchive());
      });
      return obj;
    }
  }; // end return from closure

}())); // end closure

DG.CollectionRecord.createCollection = function( iProperties) {
  var tCollection;

  if( SC.none( iProperties)) {
    iProperties = {};
  }

  if( SC.none( iProperties.type)) {
    iProperties.type = 'DG.CollectionRecord';
  }

  if (iProperties.parent) {
    iProperties.parent = DG.store.resolve(iProperties.parent);
  }

  tCollection = DG.CollectionRecord.create(iProperties);

  if (iProperties.parent) {
    iProperties.parent.children.push(tCollection);
  }
  if (iProperties.context) {
    iProperties.context.collections[tCollection.id] = tCollection;
  }

  if (!SC.none(iProperties.areParentChildLinksConfigured)) {
    tCollection.set('areParentChildLinksConfigured',
      iProperties.areParentChildLinksConfigured);
  }

  if (iProperties.attrs) {
    iProperties.attrs.forEach(function (iAttr) {
      iAttr.collection = tCollection;
      tCollection.attrs.pushObject(DG.Attribute.createAttribute(iAttr));
    });
  }

  if (iProperties.cases) {
    iProperties.cases.forEach(function (iCase) {
      iCase.collection = tCollection;
      tCollection.cases.pushObject(DG.Case.createCase(iCase));
    });
  }

  DG.log('Create collection: ' + [tCollection.name, tCollection.description].join());

  return tCollection;
};

DG.CollectionRecord.destroyCollection = function( iCollection) {
  iCollection.destroy();
};
