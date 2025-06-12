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

  isTopLevelReorgPrevented: function (iDataContext) {
    var pluginController = iDataContext.get('managingController');
    return !!pluginController && pluginController.get('preventTopLevelReorg');
  },

  getNonTopLevelAttributeCount: function (iDataContext) {
    var attrCount = 0;
    var collections = iDataContext.get('collections');
    collections.forEach(function (collection, index) {
      if (index > 0) {
        attrCount += collection.getPath('attrs.length');
      }
    });
    return attrCount;
  },

  isAttributeDeletable: function (iDataContext, iAttribute) {
    if (!iAttribute.get('deleteable')) return false;

    var pluginController = iDataContext.get('managingController');
    var pluginPreventsTopLevelReorg = !!pluginController &&
        pluginController.get('preventTopLevelReorg');
    var isTopLevelAttribute = !iAttribute.getPath('collection.parent');
    var nonTopLevelAttributeCount = DG.DataContextUtilities.getNonTopLevelAttributeCount(iDataContext);
    var isLastNonTopLevelAttribute = !isTopLevelAttribute && (nonTopLevelAttributeCount === 1);
    if (pluginPreventsTopLevelReorg && isLastNonTopLevelAttribute) return false;

    var pluginPreventsAttributeDeletion = !!pluginController &&
        pluginController.get('preventAttributeDeletion');
    var pluginAllowsEmptyAttributeDeletion = !!pluginController &&
        pluginController.get('allowEmptyAttributeDeletion');
    var hasAttributeFormula = iAttribute.get('hasFormula');
    var hasAttributeValues = !hasAttributeFormula && iAttribute.get('hasValues');
    var isEmptyAttribute = !hasAttributeFormula && !hasAttributeValues;
    return !pluginPreventsAttributeDeletion ||
        (pluginAllowsEmptyAttributeDeletion && isEmptyAttribute);
  },

  /**
   * Returns false if the owning plugin disables editing of the case, true otherwise.
   * @param {DG.DataContext} iDataContext
   * @param {string} itemID
   */
  isCaseEditable: function (iDataContext, iCase) {
    // we don't disable rows that don't correspond to cases, e.g. proto-case rows
    if (!iCase) return true;
    // is the plugin controlling editability?
    var pluginController = iDataContext.get('managingController');
    var pluginRespectsEditableAttribute = pluginController && pluginController.get('respectEditableItemAttribute');
    if (!pluginRespectsEditableAttribute) return true;
    // do we have an __editable__ attribute?
    var editableAttrRef = iDataContext.getAttrRefByName('__editable__');
    var editableAttr = editableAttrRef && editableAttrRef.attribute;
    if (!editableAttr) return true;
    // does it have a formula?
    if (!editableAttr.get('hasFormula')) {
      // no formula -- look up its item value
      var dataSet = iDataContext.getPath('model.dataSet');
      var itemIndex = dataSet && dataSet.getDataItemClientIndexByID(iCase.item.id);
      return !!(dataSet && (itemIndex != null) && dataSet.value(itemIndex, editableAttr.id));
    }
    // evaluate formula in context of appropriate case
    for (var aCase = iCase; aCase; aCase = aCase.get('parent')) {
      if (aCase.getPath('collection.id') === editableAttrRef.collection.get('id')) {
        var isEditable = editableAttr.evalFormula(aCase);
        return !!isEditable;
      }
    }
    return true;
  },

  /**
   * Drop is disabled if any of the following are true
   *   (a) the dataContext prevents the drop
   *   (b) the dragged attribute is from another dataContext,
   *   (c) the plugin prevents the drop
   *
   * @param iDataContext    {DG.DataContext} The DataContext receiving the drop
   * @param iAttribute      {DG.Attribute} The attribute being dragged
   * @param isTopLevelDrop  {Boolean} Whether the proposed drop target is top-level
   * @param allowTopLevelAttrs {Boolean} Whether to allow drops of top-level attrs,
   *                        which could indicate a desire to rearrange top-level attrs
   *                        without changing the collection hierarchy.
   * @returns {Boolean}   Whether the drop should be accepted
   */
  canAcceptAttributeDrop: function (iDataContext, iAttribute, isTopLevelDrop, allowTopLevelAttrs) {
    // check whether DataContext prevents reorganization
    if (iDataContext.get('hasGameInteractive') || iDataContext.get('preventReorg'))
      return false;

    // we can't reorganize drops of attributes from another DataContext
    var ownsThisAttribute = iAttribute &&
        !SC.none(iDataContext.getCollectionByID(iAttribute.collection.id));
    if (!ownsThisAttribute) return false;

    // check whether plugin prevents all reorganization
    var pluginController = iDataContext.get('managingController');
    if (pluginController && pluginController.get('preventDataContextReorg'))
      return false;

    // check whether plugin prevents top-level reorganization
    var pluginPreventsTopLevelReorg = pluginController &&
        pluginController.get('preventTopLevelReorg');
    var isTopLevelDragAttr = iAttribute && !iAttribute.getPath('collection.parent');
    if (pluginPreventsTopLevelReorg) {
      if (isTopLevelDragAttr && isTopLevelDrop && allowTopLevelAttrs)
        return true;
      if (isTopLevelDragAttr || isTopLevelDrop)
        return false;
    }

    // otherwise, we accept the drop
    return true;
  },

  updateAttribute: function (iContext, iCollection, iAttribute, iChangedAttrProps) {
    var newAttrName = iChangedAttrProps.name;
    if (newAttrName) {
      newAttrName = iContext.getUniqueAttributeName(newAttrName, [iAttribute.name]);
      iChangedAttrProps.name = newAttrName;
    }

    var tOldAttrProps = {
      id: iAttribute.get('id'),
      name: iAttribute.get('name'),
      type: iAttribute.get('type'),
      cid: iAttribute.get('cid'),
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
   *
   * @param iDataContext {DG.DataContext}
   * @param iAttrID {number}
   */
  hideAttribute: function (iDataContext, iAttrID) {
    var tAttrRef = iDataContext && iDataContext.getAttrRefByID(iAttrID),
        tAttrName = tAttrRef.attribute.get('name'),
        tCollectionClient = tAttrRef.collection,
        tCollection = tCollectionClient.get('collection');

    DG.UndoHistory.execute(DG.Command.create({
      name: "caseTable.hideAttribute",
      undoString: 'DG.Undo.caseTable.hideAttribute',
      redoString: 'DG.Redo.caseTable.hideAttribute',
      log: 'Hide attribute "%@"'.fmt(tAttrName),
      _beforeStorage: {
        changeFlag: iDataContext.get('flexibleGroupingChangeFlag'),
        fromCollectionID: tCollection.get('id'),
        fromCollectionName: tCollection.get('name'),
        fromCollectionParent: tCollection.get('parent'),
        fromCollectionChild: tCollection.get('children')[0]
      },
      _afterStorage: {},
      execute: function () {
        var change;
        change = {
          operation: 'hideAttributes',
          collection: tCollectionClient,
          attrs: [{id: iAttrID, attribute: tAttrRef.attribute}]
        };
        iDataContext.applyChange(change);
        iDataContext.set('flexibleGroupingChangeFlag', true);
      },
      undo: function () {
        var tChange;
        if (iDataContext.getCollectionByID(tCollection.get('id'))) {
          tChange = {
            operation: 'unhideAttributes',
            attrs: [{id: iAttrID, attribute: tAttrRef.attribute}]
          };
          iDataContext.applyChange(tChange);
          iDataContext.set('flexibleGroupingChangeFlag',
              this._beforeStorage.changeFlag);
          this._afterStorage.collection = tCollectionClient;
        }
      }
    }));

  },

  /**
   *
   * @param iDataContext {DG.DataContext}
   * @param iAttrID {number}
   */
  showAllHiddenAttributes: function (iDataContext) {
    var tHiddenAttrs = iDataContext.getHiddenAttributes().map(function (iAttr) {
          return {id: iAttr.get('id'), attribute: iAttr};
        }),
        tChange = {
          attrs: tHiddenAttrs
        };

    DG.UndoHistory.execute(DG.Command.create({
      name: "caseTable.showAllHiddenAttributes",
      undoString: 'DG.Undo.caseTable.showAllHiddenAttributes',
      redoString: 'DG.Redo.caseTable.showAllHiddenAttributes',
      log: 'Show all hidden attributes',
      execute: function () {
        if (tHiddenAttrs.length > 0) {
          tChange.operation = 'unhideAttributes';
          iDataContext.applyChange(tChange);
        }
        iDataContext.set('flexibleGroupingChangeFlag', true);
      },
      undo: function () {
        tChange.operation = 'hideAttributes';
        iDataContext.applyChange(tChange);
      }
    }));

  },

  /**
   * Delete an attribute. Confirmation will be requested if Undo is not enabled.
   *
   */
  deleteAttribute: function (iDataContext, iAttrID) {
    var tAttrRef = iDataContext && iDataContext.getAttrRefByID(iAttrID),
        tAttrName = tAttrRef.attribute.get('name'),
        tCollectionClient = tAttrRef.collection,
        tCollection = tCollectionClient.get('collection');

    var doDeleteAttribute = function () {
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
        execute: function () {
          var response;
          if ((tCollectionClient.get('attrsController').get('length') === 1) &&
              (iDataContext.get('collections').length !== 1) &&
              (tCollectionClient.getAttributeByID(iAttrID))) {
            response = iDataContext.applyChange({
              operation: 'deleteCollection', collection: tCollectionClient
            });
            this._afterStorage.deletedItems = response && response.deletedItems;
          } else {
            iDataContext.applyChange({
              operation: 'deleteAttributes',
              collection: tCollectionClient,
              attrs: [{id: iAttrID, attribute: tAttrRef.attribute}]
            });
          }
          iDataContext.set('flexibleGroupingChangeFlag', true);
        },
        undo: function () {
          var tChange;
          var tStatus;
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
                children: this._beforeStorage.fromCollectionChild ? [this._beforeStorage.fromCollectionChild] : []
              },
              attributes: [tAttrRef.attribute]
            };
            tStatus = iDataContext.applyChange(tChange);
            this._afterStorage.collection = tStatus.collection;
            if (this._afterStorage.deletedItems) {
              this._afterStorage.deletedItems.forEach(function (item) {
                if (!item.setAside) {
                  item.deleted = false;
                }
              });
            }
            iDataContext.regenerateCollectionCases();
            iDataContext.set('flexibleGroupingChangeFlag',
                this._beforeStorage.changeFlag);
          }
        },
        redo: function () {
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
              attrs: [{id: iAttrID, attribute: tAttrRef.attribute}]
            };
          }
          iDataContext.applyChange(change);
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
   * Delete attribute's formula keeping values
   *
   */
  deleteAttributeFormula: function (iDataContext, iAttrID, iUpdateFunc) {
    var tRef = iDataContext && iDataContext.getAttrRefByID(iAttrID),
        tAttrName = tRef.attribute.get('name'),
        tCollection = tRef && iDataContext.getCollectionForAttribute(tRef.attribute),
        tFormula = '',
        tPrevFormula = tRef && tRef.attribute.get('formula');

    DG.UndoHistory.execute(DG.Command.create({
      name: "caseTable.editAttributeFormula",
      undoString: 'DG.Undo.caseTable.editAttributeFormula',
      redoString: 'DG.Redo.caseTable.editAttributeFormula',
      execute: function () {
        var tChange = {
              operation: 'createAttributes',
              collection: tCollection,
              attrPropsArray: [{ name: tAttrName, formula: tFormula }]
            },
            tResult = iDataContext && iDataContext.applyChange( tChange);
        if( tResult.success) {
          tRef.attribute.set('formula', tFormula);
          tRef.attribute.set('deletedFormula', tPrevFormula);
          iUpdateFunc && iUpdateFunc();

          var action = "attributeEditFormula";
          this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
              action, tAttrName, tCollection.get('name'), tFormula);
        } else {
          this.set('causedChange', false);
        }
      },
      undo: function () {
        var tChange, tResult, action; // eslint-disable-line no-unused-vars
        tChange = {
          operation: 'createAttributes',
          collection: tCollection,
          attrPropsArray: [{ name: tAttrName, formula: tPrevFormula }]
        };

        tResult = iDataContext && iDataContext.applyChange( tChange);
        if( tResult.success) {
          tRef.attribute.set('formula', tPrevFormula);
          tRef.attribute.set('deletedFormula', tFormula);
          iUpdateFunc && iUpdateFunc();

          action = "attributeEditFormula";
          this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
              action, tAttrName, tCollection.get('name'), tPrevFormula);
        } else {
          this.set('causedChange', false);
        }
      },
      redo: function () {
        this.execute();
      }
    }));
  },

  /**
   * Recover attribute's formula
   *
   */
  recoverAttributeFormula: function (iDataContext, iAttrID, iUpdateFunc) {
    var tRef = iDataContext && iDataContext.getAttrRefByID(iAttrID),
        tCollection = tRef && iDataContext.getCollectionForAttribute(tRef.attribute),
        tAttrName = tRef && tRef.attribute.get('name'),
        tFormula = tRef && tRef.attribute.get('deletedFormula'),
        tPrevFormula = '';

    DG.assert( tRef && tAttrName, "recoverDeletedFormula() is missing the attribute reference or attribute name" );

    DG.UndoHistory.execute(DG.Command.create({
      name: "caseTable.editAttributeFormula",
      undoString: 'DG.Undo.caseTable.editAttributeFormula',
      redoString: 'DG.Redo.caseTable.editAttributeFormula',
      execute: function() {
        var tChange = {
              operation: 'createAttributes',
              collection: tCollection,
              attrPropsArray: [{ name: tAttrName, formula: tFormula }]
            },
            tResult = iDataContext && iDataContext.applyChange( tChange);
        if( tResult.success) {
          tRef.attribute.set('formula', tFormula);
          tRef.attribute.set('deletedFormula', tPrevFormula);
          iUpdateFunc && iUpdateFunc();

          var action = "attributeEditFormula";
          this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
              action, tAttrName, tCollection.get('name'), tFormula);
        } else {
          this.set('causedChange', false);
        }
      },
      undo: function() {
        var tChange, tResult, action; // eslint-disable-line no-unused-vars
        tChange = {
          operation: 'createAttributes',
          collection: tCollection,
          attrPropsArray: [{ name: tAttrName, formula: tPrevFormula }]
        };

        tResult = iDataContext && iDataContext.applyChange( tChange);
        if( tResult.success) {
          tRef.attribute.set('formula', tPrevFormula);
          tRef.attribute.set('deletedFormula', tFormula);
          iUpdateFunc && iUpdateFunc();

          action = "attributeEditFormula";
          this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
              action, tAttrName, tCollection.get('name'), tPrevFormula);
        } else {
          this.set('causedChange', false);
        }
      },
      redo: function() {
        this.execute();
      }
    }));
  },

  /**
   *
   * @param iContext {DG.DataContext}
   * @param iAttrID {Number}
   * @return {Boolean}
   */
  attributeCanBeRandomized: function (iContext, iAttrID) {
    var depMgr = iContext && iContext.get('dependencyMgr'),
        dependency = depMgr &&
            depMgr.findDependency({
                  type: DG.DEP_TYPE_ATTRIBUTE,
                  id: iAttrID
                },
                {
                  type: DG.DEP_TYPE_SPECIAL,
                  id: 'random'
                });
    return dependency;
  },

  /**
   * Randomize a single attribute
   */
  randomizeAttribute: function (iDataContext, iAttrID) {
    if (iDataContext && iAttrID) {
      iDataContext.invalidateDependencyAndNotify({
            type: DG.DEP_TYPE_ATTRIBUTE,
            id: iAttrID
          },
          {
            type: DG.DEP_TYPE_SPECIAL,
            id: 'random'
          },
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

  /**
   Creates a new case with the specified values.
   */
  createCaseUndoable: function (iContext, props) {
    var contextName = iContext.get('name');
    if (!props.collection || !props.attrIDs) return;

    var createResult;
    var isRegenerated = false;

    function doCreateCase() {
      var result = iContext.applyChange({
        operation: 'createCases',
        attributeIDs: props.attrIDs,
        collection: props.collection,
        properties: {parent: props.parent},
        values: [props.values]
      });
      if (result.success && props.beforeCaseID) {
        var dataSet = iContext.get('dataSet');
        var beforeCase = iContext.getCaseByID(props.beforeCaseID);
        var beforeItem = beforeCase && beforeCase.item;
        var beforeItemIndex = dataSet && beforeItem &&
            dataSet.getDataItemClientIndexByID(beforeItem.id);
        if (result.itemIDs && dataSet && (beforeItemIndex != null)) {
          iContext.applyChange({
            operation: 'moveItems',
            items: result.itemIDs.map(function (id) {
              return dataSet.getDataItemByID(id);
            }),
            itemOrder: beforeItemIndex
          });
          isRegenerated = true;
        }
      }
      if (!isRegenerated)
        iContext.regenerateCollectionCases();

      return result;
    }

    function doDeleteCase(caseIDs) {
      var cases = caseIDs.map(function (id) {
        return DG.store.find('DG.Case', id);
      });
      return iContext.applyChange({
        operation: 'deleteCases',
        cases: cases
      });
    }

    var cmd = DG.Command.create({
      name: "caseTable.createNewCase",
      undoString: 'DG.Undo.caseTable.createNewCase',
      redoString: 'DG.Redo.caseTable.createNewCase',
      log: "create new case",
      execute: function () {
        createResult = doCreateCase();
      },
      undo: function () {
        if (createResult && createResult.caseIDs)
          doDeleteCase(createResult.caseIDs);
      },
      redo: function () {
        iContext = DG.currDocumentController().getContextByName(contextName);
        if (iContext)
          createResult = doCreateCase();
      }
    });

    DG.UndoHistory.execute(cmd);
  },

  stashAttributeValue: function (iContext, iCase, iAttr, iValue) {
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

  newAttribute: function (iDataContext, iCollection, iPosition, iEditorViewOrCallback, iAutoEdit) {
    if (iEditorViewOrCallback) {
      DG.globalEditorLock.commitCurrentEdit();
    }
    var tAttrName = iDataContext.getNewAttributeName(),
        tAttrRef;

    DG.UndoHistory.execute(DG.Command.create({
      name: "caseTable.createAttribute",
      undoString: 'DG.Undo.caseTable.createAttribute',
      redoString: 'DG.Redo.caseTable.createAttribute',
      execute: function (isRedo) {
        SC.run(function () {
          tAttrRef = iDataContext.getAttrRefByName(tAttrName);
          var change = {
                operation: 'createAttributes',
                collection: iCollection,
                attrPropsArray: [{name: tAttrName}],
                position: iPosition
              },
              result = iDataContext && iDataContext.applyChange(change);
          if (!isRedo && result.success) {
            this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
                'attributeCreate', tAttrName, iCollection.get('name'));
            // simple callback function
            if (typeof iEditorViewOrCallback === "function") {
              iEditorViewOrCallback(tAttrName);
            } else if (iAutoEdit && iEditorViewOrCallback) {
              iEditorViewOrCallback.invokeLater(function () {
                iEditorViewOrCallback.beginEditAttributeName(tAttrName);
              });
            }
          } else {
            this.set('causedChange', false);
          }
        }.bind(this));
      },
      undo: function () {
        tAttrRef = iDataContext.getAttrRefByName(tAttrName);
        var attr = tAttrRef.attribute,
            change = {
              operation: 'deleteAttributes',
              collection: iCollection,
              attrs: [{id: attr.get('id'), attribute: attr}]
            },
            result = iDataContext && iDataContext.applyChange(change);
        if (!result.success) {
          this.set('causedChange', false);
        }
      },
      redo: function () {
        this.execute(true);
      }
    }));
  },

  joinSourceToDestCollection: function (iSourceKeyAttribute, iDestContext, iDestCollection, iDestKeyAttribute) {

    function forEachJoinableSourceAttribute(iCallback) {
      tSourceAttributes.forEach(function (iForeignAttribute) {
        if (iForeignAttribute !== iSourceKeyAttribute && !iForeignAttribute.get('hidden')) {
          var tAttributeName = iForeignAttribute.get('name'),
              tIndex = 1;
          while (tExistingDestAttributeNames.indexOf(tAttributeName) >= 0) {
            tAttributeName = iForeignAttribute.get('name') + '_' + tIndex;
            tIndex++;
          }
          iCallback(iForeignAttribute, tAttributeName);
        }
      });
    }

    var tSourceAttributeName = iSourceKeyAttribute && iSourceKeyAttribute.get('name'),
        tSourceCollection = iSourceKeyAttribute && iSourceKeyAttribute.collection,
        tSourceDatasetName = tSourceCollection && tSourceCollection.getPath('context.title'),
        tSourceAttributes = tSourceCollection && tSourceCollection.get('attrs'),
        tDestKeyValueAttributeName = iDestKeyAttribute && iDestKeyAttribute.get('name'),
        tExistingDestAttributeNames = iDestCollection.getPath('collection.attrs').map(function (iAttr) {
          return iAttr.get('name');
        });
    if (tSourceAttributes && tSourceAttributeName && tSourceDatasetName && iDestCollection &&
        tDestKeyValueAttributeName && iDestContext) {
      DG.UndoHistory.execute(DG.Command.create({
        name: "dataContext.join",
        undoString: 'DG.Undo.DataContext.join'.loc(tSourceDatasetName, iDestContext.get('title')),
        redoString: 'DG.Redo.DataContext.join'.loc(tSourceDatasetName, iDestContext.get('title')),
        log: 'Join attributes from "%@" to "%@"'.fmt(tSourceDatasetName, iDestContext.get('title')),
        executeNotification: {
          action: 'notify',
          resource: 'component',
          values: {
            operation: 'join',
            type: DG.CaseTable
          }
        },
        execute: function () {
          var tAttrSpecs = [];
          forEachJoinableSourceAttribute(function (iForeignAttribute, iNewAttrName) {
            var tProps = iForeignAttribute.getTransferableProperties(),
                tForeignAttributeName = iForeignAttribute.get('name');
            tAttrSpecs.push(Object.assign(tProps, {
              name: iNewAttrName,
              title: iNewAttrName,
              formula: 'lookupByKey("%@", "%@", "%@", `%@`)'.fmt(tSourceDatasetName, tForeignAttributeName,
                  tSourceAttributeName, tDestKeyValueAttributeName)
            }));
          });
          iDestContext.applyChange({
            operation: 'createAttributes',
            collection: iDestCollection,
            attrPropsArray: tAttrSpecs
          });
        },
        undo: function () {
          var tAttributes = [];
          forEachJoinableSourceAttribute(function (iForeignAttribute, iNewAttrName) {
            tAttributes.push(iDestCollection.getAttributeByName(iNewAttrName));
          });
          iDestContext.applyChange({
            operation: 'deleteAttributes',
            collection: iDestCollection,
            attrs: tAttributes
          });
        }
      }));
    }
  }
};
