// ==========================================================================
//                          DG.DataContextUtilities
//
//  Author:   William Finzer
//
//  Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.
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

/*global pluralize:true*/

DG.DataContextUtilities = {

  updateAttribute: function (iContext, iCollection, iAttribute, iChangedAttrProps) {
    var tOldAttrProps = {
      id: iAttribute.get('id'),
      name: iAttribute.get('name'),
      type: iAttribute.get('type'),
      unit: iAttribute.get('unit'),
      editable: iAttribute.get('editable'),
      precision: iAttribute.get('precision'),
      description: iAttribute.get('description'),
    };
    DG.UndoHistory.execute(DG.Command.create({
      name: "caseTable.editAttribute",
      undoString: 'DG.Undo.caseTable.editAttribute',
      redoString: 'DG.Redo.caseTable.editAttribute',
      log: 'Edit attribute "%@"'.fmt(iChangedAttrProps.name),
      execute: function () {
        var change = {
          operation: 'updateAttributes',
          collection: iCollection,
          attrPropsArray: [Object.assign({id: iAttribute.get('id')}, iChangedAttrProps)]
        };
        iContext.applyChange(change);
      },
      undo: function () {
        var change = {
          operation: 'updateAttributes',
          collection: iCollection,
          attrPropsArray: [tOldAttrProps]
        };
        iContext.applyChange(change);
      },
      redo: function () {
        this.execute();
      }
    }));
  },

  editAttributeFormula: function (iDataContext, iCollection, iAttrName, iAttrFormula) {
    iAttrName = iAttrName || '';
    iAttrFormula = iAttrFormula || '';
    var tCollClient = iDataContext.getCollectionByID(iCollection.get('id')),
        tResult = DG.AttributeFormulaView.buildOperandsMenuAndCompletionData(iDataContext),

        tApplier = SC.Object.create({
          applyFormula: function () {
            var tRef = iDataContext.getAttrRefByName(iAttrName),
                tAttrFormula = tRef && tRef.attribute.get('formula');
            // Retrieve the name of the target collection that was passed by the client originally.
            var tCollection = tEditFormulaDialog.get('collection'),
                tFormula = tEditFormulaDialog.get('formula');

            DG.UndoHistory.execute(DG.Command.create({
              name: "caseTable.editAttributeFormula",
              undoString: 'DG.Undo.caseTable.editAttributeFormula',
              redoString: 'DG.Redo.caseTable.editAttributeFormula',
              execute: function () {
                tRef = iDataContext.getAttrRefByName(iAttrName);
                var tChange = {
                      operation: 'createAttributes',
                      collection: tCollection,
                      attrPropsArray: [{name: iAttrName, formula: tFormula}]
                    },
                    tResult = iDataContext && iDataContext.applyChange(tChange);
                if (tResult.success) {
                  var action = "attributeEditFormula";
                  this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
                      action, iAttrName, tCollection.get('name'), tFormula);
                } else {
                  this.set('causedChange', false);
                }
              },
              undo: function () {
                var tChange, tResult, action; // eslint-disable-line no-unused-vars
                tChange = {
                  operation: 'createAttributes',
                  collection: tCollection,
                  attrPropsArray: [{name: iAttrName, formula: tAttrFormula}]
                };
                tResult = iDataContext && iDataContext.applyChange(tChange);
                if (tResult.success) {
                  action = "attributeEditFormula";
                } else {
                  this.set('causedChange', false);
                }
              },
              redo: function () {
                this.execute();
              }
            }));

            tEditFormulaDialog.close();
          }
        }),

        // Use SC.mixin() to combine iProperties with the rest of the default properties
        // that are passed to the new attribute dialog.
        tEditFormulaDialog = DG.CreateAttributeFormulaView(SC.mixin({
          applyTarget: tApplier,
          applyAction: 'applyFormula',
          applyTooltip: 'DG.TableController.newAttrDlg.applyTooltip', // "Define the new attribute using the name and (optional) formula"
          attrNameHint: 'DG.TableController.newAttrDlg.attrNameHint',
          attrNameValue: iAttrName,
          attrNameIsEnabled: SC.empty(iAttrName), // disable attribute name changes if editing an existing attribute
          formulaValue: iAttrFormula,
          formulaCompletions: tResult.completionData,
          formulaOperands: tResult.operandsMenu,
          formulaHint: 'DG.TableController.newAttrDlg.formulaHint'  // "If desired, type a formula for computing values of this attribute"
        }, {collection: tCollClient}));
  },

  /**
   * Delete an attribute. Confirmation will be requested if Undo is not enabled.
   *
   */
  deleteAttribute: function( iDataContext, iAttrID) {
    var tAttrRef = iDataContext && iDataContext.getAttrRefByID( iAttrID),
        tAttrName = tAttrRef.attribute.get('name'),
        tCollectionClient = tAttrRef.collection,
        tCollection = tCollectionClient.get('collection');

    var doDeleteAttribute = function() {
      DG.UndoHistory.execute(DG.Command.create({
        name: "caseTable.deleteAttribute",
        undoString: 'DG.Undo.caseTable.deleteAttribute',
        redoString: 'DG.Redo.caseTable.deleteAttribute',
        log: 'Delete attribute "%@"'.fmt(tAttrName),
        _beforeStorage: {
          changeFlag: iDataContext.get('flexibleGroupingChangeFlag'),
          fromCollectionID: tCollection.get('id'),
          fromCollectionName: tCollection.get('name'),
          fromCollectionParent: tCollection.get('parent'),
          fromCollectionChild: tCollection.get('children')[0]
        },
        _afterStorage: {},
        execute: function() {
          var change;
          if ((tCollectionClient.get('attrsController').get('length') === 1) &&
              (iDataContext.get('collections').length !== 1) &&
              (tCollectionClient.getAttributeByID(iAttrID))) {
            change = {
              operation: 'deleteCollection',
              collection: tCollectionClient
            };
          } else {
            change = {
              operation: 'deleteAttributes',
              collection: tCollectionClient,
              attrs: [{ id: iAttrID, attribute: tAttrRef.attribute }]
            };
          }
          iDataContext.applyChange( change);
          iDataContext.set('flexibleGroupingChangeFlag', true);
        },
        undo: function() {
          var tChange;
          var tStatus;
          var iDataContext;
          if (iDataContext.getCollectionByID(tCollection.get('id'))) {
            tChange = {
              operation: 'createAttributes',
              collection: tAttrRef && tAttrRef.collection,
              attrPropsArray: [tAttrRef.attribute],
              position: [tAttrRef.position]
            };
            iDataContext.applyChange(tChange);
            iDataContext.set('flexibleGroupingChangeFlag',
                this._beforeStorage.changeFlag);
            this._afterStorage.collection = tCollectionClient;
          } else {
            tAttrRef.attribute.collection = null;
            tChange = {
              operation: 'createCollection',
              properties: {
                id: this._beforeStorage.fromCollectionID,
                name: this._beforeStorage.fromCollectionName,
                parent: this._beforeStorage.fromCollectionParent,
                children: [this._beforeStorage.fromCollectionChild]
              },
              attributes: [tAttrRef.attribute]
            };
            tStatus = iDataContext.applyChange(tChange);
            this._afterStorage.collection = tStatus.collection;
            iDataContext.regenerateCollectionCases();
            iDataContext.set('flexibleGroupingChangeFlag',
                this._beforeStorage.changeFlag);
          }
        },
        redo: function() {
          var change;
          var tCollectionClient1 = iDataContext.getCollectionByID(this._afterStorage.collection.get('id'));
          if ((tCollectionClient1.get('attrsController').get('length') === 1) &&
              (iDataContext.get('collections').length !== 1) &&
              (tCollectionClient1.getAttributeByID(iAttrID))) {
            change = {
              operation: 'deleteCollection',
              collection: tCollectionClient1
            };
          } else {
            change = {
              operation: 'deleteAttributes',
              collection: tCollectionClient1,
              attrs: [{ id: iAttrID, attribute: tAttrRef.attribute }]
            };
          }
          iDataContext.applyChange( change);
          iDataContext.set('flexibleGroupingChangeFlag', true);
        }
      }));
    }.bind(this);

    if (DG.UndoHistory.get('enabled')) {
      doDeleteAttribute();
    } else {
      DG.AlertPane.warn({
        message: 'DG.TableController.deleteAttribute.confirmMessage'.loc(tAttrName),
        description: 'DG.TableController.deleteAttribute.confirmDescription'.loc(),
        buttons: [
          {
            title: 'DG.TableController.deleteAttribute.okButtonTitle',
            action: doDeleteAttribute,
            localize: YES
          },
          {
            title: 'DG.TableController.deleteAttribute.cancelButtonTitle',
            localize: YES
          }
        ],
        localize: false
      });
    }
  },

  /**
   *
   * @param iContext {DG.DataContext}
   * @param iAttrID {Number}
   * @return {Boolean}
   */
  attributeCanBeRandomized: function( iContext, iAttrID) {
    var depMgr = iContext && iContext.get('dependencyMgr'),
        dependency = depMgr &&
            depMgr.findDependency({ type: DG.DEP_TYPE_ATTRIBUTE,
                  id: iAttrID },
                { type: DG.DEP_TYPE_SPECIAL,
                  id: 'random' });
    return dependency;
  },

  /**
   * Randomize a single attribute
   */
  randomizeAttribute: function(iDataContext, iAttrID) {
    if (iDataContext && iAttrID) {
      iDataContext.invalidateDependencyAndNotify({ type: DG.DEP_TYPE_ATTRIBUTE,
            id: iAttrID },
          { type: DG.DEP_TYPE_SPECIAL,
            id: 'random' },
          true /* force aggregate */);
    }
  },

  makeUniqueCollectionName: function (context, candidateName) {
    var name = pluralize(candidateName);
    var ix = 0;
    while (!SC.none(context.getCollectionByName(name))) {
      ix += 1;
      name = pluralize(candidateName) + ix;
    }
    return name;
  },

  /**
   * Helper method to create a DG.Command to create a new collection from
   * a dragged attribute.
   *
   * @param attribute {DG.Attribute}
   * @param collection {DG.collection}
   * @param context  {DG.DataContext} The current DataContext
   * @param parentCollectionID {number|undefined} Parent collection id, if
   *                  collection is to be created as a child collection of
   *                  another collection. Otherwise, it is created as the
   *                  parent of the current parent collection.
   * @returns {*}
   * @private
   */
  createCollectionCommand: function (attribute, collection, context, parentCollectionID) {
    var collectionName = this.makeUniqueCollectionName(context, attribute.name);
    var childCollectionID = null;
    if (SC.none(parentCollectionID)) {
      childCollectionID = context.getCollectionAtIndex(0).collection.id;
    }
    return DG.Command.create({
      name: 'caseTable.createCollection',
      undoString: 'DG.Undo.caseTable.createCollection',
      redoString: 'DG.Redo.caseTable.createCollection',
      log: 'createCollection {name: %@, attr: %@}'.loc(collectionName,
          attribute.name),
      _beforeStorage: {
        context: context,
        newCollectionName: collectionName,
        newParentCollectionID: parentCollectionID,
        newChildCollectionID: childCollectionID,
        attributeID: attribute.id,
        oldAttributePosition: collection.attrs.indexOf(
            attribute),
        oldCollectionID: collection.id,
        changeFlag: context.get('flexibleGroupingChangeFlag')
      },
      execute: function () {
        var context = this._beforeStorage.context;
        var attribute = context.getAttrRefByID(
            this._beforeStorage.attributeID).attribute;
        var childCollectionID = this._beforeStorage.newChildCollectionID;
        var childCollection = childCollectionID && context.getCollectionByID(
            childCollectionID).collection;
        var tChange = {
          operation: 'createCollection',
          properties: {
            name: this._beforeStorage.newCollectionName,
            parent: this._beforeStorage.newParentCollectionID
          },
          attributes: [attribute]
        };
        if (childCollection) {
          tChange.properties.children = [childCollection];
        }
        context.applyChange(tChange);
        context.set('flexibleGroupingChangeFlag', true);
      },
      undo: function () {
        var context = this._beforeStorage.context;
        var attribute = context.getAttrRefByID(
            this._beforeStorage.attributeID).attribute;
        var toCollection = context.getCollectionByID(
            this._beforeStorage.oldCollectionID);
        var tChange = {
          operation: 'moveAttribute',
          attr: attribute,
          toCollection: toCollection,
          position: this._beforeStorage.oldAttributePosition
        };
        context.applyChange(tChange);
        context.set('flexibleGroupingChangeFlag', this._beforeStorage.changeFlag);
      }
    });
  },

  stashAttributeValue: function( iContext, iCase, iAttr, iValue) {
    var tAttrID = iAttr.get('id'),
        originalValue = iCase.getStrValue(tAttrID),
        newValue = DG.DataUtilities.canonicalizeInputValue(iValue),
        contextName = iContext.get('name'),
        collection = iCase.get('collection'),
        collectionName = collection && collection.get('name') || "",
        attr = collection && collection.getAttributeByID(tAttrID),
        attrName = attr && attr.get('name'),
        caseIndex = collection.getCaseIndexByID(iCase.get('id'));

    function applyEditChange(attrID, iValue, isUndoRedo) {
      SC.run(function () {
        iContext.applyChange({
          operation: 'updateCases',
          cases: [iCase],
          attributeIDs: [attrID],
          values: [[iValue]]
        });
      });
    }

    var cmd = DG.Command.create({
      name: 'caseTable.editCellValue',
      undoString: 'DG.Undo.caseTable.editCellValue',
      redoString: 'DG.Redo.caseTable.editCellValue',
      log: "editValue: { collection: %@, case: %@, attribute: '%@', old: '%@', new: '%@' }"
          .fmt(collectionName, caseIndex + 1, tAttrID, originalValue, newValue),
      causedChange: true,
      execute: function () {
        applyEditChange(tAttrID, newValue);
      },
      undo: function () {
        applyEditChange(tAttrID, originalValue, true);
      },
      redo: function () {
        iContext = DG.currDocumentController().getContextByName(contextName);
        collection = iContext && iContext.getCollectionByName(collectionName);
        attr = collection && collection.getAttributeByName(attrName);
        tAttrID = attr.get('id');
        var cases = collection && collection.get('casesController');
        iCase = cases && cases.objectAt(caseIndex);
        if (iCase)
          applyEditChange(tAttrID, newValue, true);
      }
    });
    DG.UndoHistory.execute(cmd);
  },

  newAttribute: function( iDataContext, iCollection, iPosition, iEditorView, iAutoEdit) {
    var tAttrName = iDataContext.getNewAttributeName(),
        tAttrRef;

    DG.UndoHistory.execute(DG.Command.create({
      name: "caseTable.createAttribute",
      undoString: 'DG.Undo.caseTable.createAttribute',
      redoString: 'DG.Redo.caseTable.createAttribute',
      execute: function(isRedo) {
        SC.run( function() {
          tAttrRef = iDataContext.getAttrRefByName(tAttrName);
          var change = {
                operation: 'createAttributes',
                collection: iCollection,
                attrPropsArray: [{ name: tAttrName }],
                position: iPosition
              },
              result = iDataContext && iDataContext.applyChange(change);
          if(!isRedo && result.success) {
            this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
                'attributeCreate', tAttrName, iCollection.get('name'));
            if (iAutoEdit && iEditorView) {
              iEditorView.invokeLater(function() {
                iEditorView.beginEditAttributeName(tAttrName);
              });
            }
          } else {
            this.set('causedChange', false);
          }
        }.bind( this));
      },
      undo: function() {
        tAttrRef = iDataContext.getAttrRefByName(tAttrName);
        var attr = tAttrRef.attribute,
            change = {
              operation: 'deleteAttributes',
              collection: iCollection,
              attrs: [{ id: attr.get('id'), attribute: attr }]
            },
            result = iDataContext && iDataContext.applyChange( change);
        if(!result.success) {
          this.set('causedChange', false);
        }
      },
      redo: function() {
        this.execute(true);
      }
    }));
  }
};
