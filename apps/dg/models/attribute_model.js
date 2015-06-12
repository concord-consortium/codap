// ==========================================================================
//                            DG.Attribute
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

  Represents an attribute of a collection.

 @extends SC.BaseModel
 */
DG.Attribute = DG.BaseModel.extend(
  /** @scope DG.Attribute.prototype */ {

    /**
     * The name of the attribute
     * @property {String}
     */
    name: '',

    /**
     * The formula for the attribute
     * @property {String}
     */
    formula: '',

    /**
     * The map of attribute and category color values, for the attribute.
     * For special color keys and values, see:
     *   DG.ColorUtilities.getAttributeColorFromColorMap(),
     *   DG.ColorUtilities.getCategoryColorFromColorMap(),
     *   DG.ColorUtilities.simpleColorNames()
     * @property {Object}
     */
    colormap: null,

    /**
     * A description of/comment for the attribute
     * @property {String}
     */
    description: '',

    /**
     * Type of the attribute: 'numeric' or 'nominal'
     */
    type: null,

    /**
     * A relational link back to the parent collection.
     * @property {DG.CollectionRecord}
     */
    collection: null,

    /**
     * Number of decimal places to use for display
     * @property {Number}
     */
    precision: 2,

    /**
     * True if the attribute is user-editable, false otherwise.
     * By default user-created attributes are editable as well as
     * any game-created attributes marked as such.
     * @property {Boolean}
     */
    editable: false,

    /**
     @private
     The DG.Formula for evaluation.
     @property   {DG.Formula}
     */
    _dgFormula: null,

    /**
     Initialization function.
     */
    init: function() {
      sc_super();

      // Handle formula passed in as property at creation
      var formulaSource = this.get('formula');
      if( !SC.empty( formulaSource) && !this._dgFormula) {
        this.createDGFormula();
        this._dgFormula.set('source', formulaSource);
      }
      if (typeof this.collection === 'number') {
        this.collection = DG.store.find(DG.Attribute, this.collection);
      }
    },

    verify: function () {
      if (SC.empty(this.collection)) {
        DG.logWarn('Unattached attribute: ' + this.id);
      }
      if (typeof this.collection === 'number') {
        DG.logWarn('Unresolved reference to collection id, ' + this.collection +
          ', in attribute: ' + this.id);
      }
      if (!(this.collection.recordType
        && this.collection.recordType() === DG.CollectionRecord) ) {
        DG.logWarn('Unexpected collection RecordType: '
          + this.collection.recordTypeString());
      }
    },

    /**
     Destruction function.
     */
    destroy: function() {
      var attrID = this.get('id');

      if( !SC.none( attrID)) {
        delete DG.Attribute.idMap[ attrID];
      }

      if (this.collection) {
        this.collection.attrs.removeObject(this);
      }

      if( this._dgFormula)
        this.destroyDGFormula();
      sc_super();
    },

    /**
     Utility function for creating the DG.Formula when necessary
     and hooking up the necessary observers.
     */
    createDGFormula: function() {
      this._dgFormula = DG.Formula.create({
        context: DG.CollectionFormulaContext.
          create({ collection: this.get('collection') })
      });
      this._dgFormula.addObserver('dependentChange', this, 'dependentDidChange');
    },

    /**
     Utility function for destroying the DG.Formula when necessary
     and cleanup up the necessary observers.
     */
    destroyDGFormula: function() {
      this._dgFormula.removeObserver('dependentChange', this, 'dependentDidChange');
      this._dgFormula.destroy();
      this._dgFormula = null;
    },

    /**
     * {Computed} True if the attribute has a non-empty formula.
     * @property {Boolean}
     */
    hasFormula: function() {
      return !SC.empty( this.get('formula'));
    }.property('formula').cacheable(),

    /**
     * Evaluates the attribute's formula in the context of the specified namespace object.
     * @param {Object}    Namespace object with property:value pairs for evaluation context
     * @return {Number | ?} Result of evaluation
     */
    evalFormula: function( iCase) {
      var tFormula = this._dgFormula,
        tReturnValue = NaN;
      try {
        // Client is responsible for passing _case_ and _id_
        tReturnValue = tFormula.evaluate({ _case_: iCase, _id_: iCase && iCase.get('id') });
      }
      catch(e) {
        // Return error objects as attribute values.
        tReturnValue = e;
      }

      return tReturnValue;
    },

    /**
     Observer function called when the formula changes.
     This function creates, updates, or destroys the corresponding
     DG.Formula as needed and sets up/tears down the necessary
     observers whenever the formula changes.
     */
    formulaDidChange: function() {
      var tSource = this.get('formula');

      // Non-empty formula string -- we need a DG.Formula
      if( !SC.empty( tSource)) {
        // Create the DG.Formula if we don't have one yet
        if( !this._dgFormula)
          this.createDGFormula();
        // Update the DG.Formula with the new source
        this._dgFormula.set('source', tSource);
      }

      // empty formula string -- no need for a DG.Formula
      else {
        if( this._dgFormula)
          this.destroyDGFormula();
      }
    }.observes('formula'),

    /**
     Observer function called when an attribute formula notifies
     that one of its dependents has changed.
     */
    dependentDidChange: function( iNotifier, iKey) {
      this.notifyPropertyChange( iKey);
    },

    /**
     Override to update our attribute map to include attributes loaded
     from documents.
     */
    didLoadRecord: function() {
      var id = this.get('id');
      DG.Attribute.idMap[ id] = this;
    },
    toArchive: function () {
      return {
        name: this.name,
        type: this.type,
        defaultMin: this.defaultMin,
        defaultMax: this.defaultMax,
        description: this.description,
        colormap: this.colormap || undefined,
        blockDisplayOfEmptyCategories: this.blockDisplayOfEmptyCategories || undefined,
        editable: !SC.none(this.formula)? this.editable: undefined,
        formula: !SC.none(this.formula)? this.formula: undefined,
        guid: this.id,
        precision: this.precision
      };
    }
  });

/**
 Global map from attribute ID to attribute.
 More efficient than calling DG.store.find(DG.Attribute, attrID);
 */
DG.Attribute.idMap = {};

/**
 Retrieves an attribute by its ID using our internal map.
 @param  {Number}  iAttrID -- the ID of the attribute to be retrieved
 */
DG.Attribute.getAttributeByID = function( iAttrID) {
  return DG.Attribute.idMap[ iAttrID];
};

/**
 * Creates a new attribute with the specified properties.
 * @param {Object}  iProperties List of properties to apply to the newly-created DG.Attribute.
 * @return {DG.Attribute}   The newly-created DG.Attribute
 */
DG.Attribute.createAttribute = function( iProperties) {
  var collection = DG.store.resolve(iProperties.collection),
    newAttribute;

  iProperties.collection = collection;
  newAttribute = DG.Attribute.create(iProperties || {});

  DG.store.commitRecords();
  DG.Attribute.idMap[ newAttribute.get('id')] = newAttribute;
  return newAttribute;
};

/**
 * Destroys the specified DG.Attribute.
 * @param {DG.Attribute}  The DG.Attribute to destroy
 */
DG.Attribute.destroyAttribute = function( iAttribute) {
  iAttribute.destroy();
};
