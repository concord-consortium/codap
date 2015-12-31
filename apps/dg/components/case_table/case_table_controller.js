// ==========================================================================
//                      DG.CaseTableController
// 
//  The controller for tables.
//  
//  Authors:  William Finzer, Kirk Swenson
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

sc_require('controllers/component_controller');

/** @class

  DG.CaseTableController provides controller functionality for DG.TableViews.

  @extends DG.ComponentController
*/
DG.CaseTableController = DG.ComponentController.extend(
/** @scope DG.CaseTableController.prototype */
  (function() {
    return {

      /**
        Called when the currently selected game context changes.
       */
      currentGameContextDidChange: function( iNotifier, iKey) {
        // 'gameIsReady' affects our labels, which affects our group headers
        if( iKey === 'gameIsReady') {
          var hierTableView = this.getPath('view.contentView');
          if( hierTableView)
            hierTableView.refresh();
        }
      },

      /**
        The table will reflect the contents of this data context.
        @property   {DG.DataContext} or derived class
       */
      dataContext: null,

      /**
        @private
        Used internally to track changes to the data context.
       */
      _prevDataContext: null,

      /**
        The set of DG.CaseTableAdapters for the subtables in parent-->child order.
        @property {Array of DG.CaseTableAdapter}
       */
      caseTableAdapters: null,

      /**
        The content view for this controller, i.e. the DG.HierTableView.
        @property {DG.HierTableView}
       */
      contentView: null,

      newAttributeDialog: null,

      /**
        Initialization function.
       */
      init: function() {
        sc_super();
        this.caseTableAdapters = [];
        // Init is called when the case table controller may not be fully
        // constructed, so, delay to the next Run Loop.
        this.invokeLater(function () {
          if( this.get('dataContext') && this.get('model')) {
            this.dataContextDidChange();
          } else {
            DG.logWarn('Case table controller unable to complete initialization: missing dataContext or model');
          }
        });
      },

      /**
        Destruction function.
       */
      destroy: function() {
        var dataContext = this.get('dataContext');
        if( dataContext)
          dataContext.removeObserver('changeCount', this, 'contextDataDidChange');
        this.caseTableAdapters = null;
        sc_super();
      },

      /**
        Builds an appropriate DG.CaseTableAdapter for each collection.
       */
      updateTableAdapters: function() {
        var dataContext = this.get('dataContext'),
            collectionRecords = dataContext && dataContext.get('collections') || [],
            prevAdapters = this.caseTableAdapters,
            newAdapters = [],
            // The controller model is a component object. We want the model for the
            // component's content.
            caseTableModel = this.model && this.model.get('content');

        this.caseTableAdapters = newAdapters;

        // Utility function for identifying existing adapters for the specified collection
        function findAdapterForCollection( iCollectionID) {
          var i, count;
          if (prevAdapters) {
            count = prevAdapters.length;
            for( i = 0; i < count; ++i) {
              if( prevAdapters[i] && (prevAdapters[i].getPath('collection.id') === iCollectionID))
                return prevAdapters[i];
            }
          }
          return null;
        }

        // Utility function for finding or creating (if necessary) an appropriate
        // adapter for the specified collection.
        function guaranteeAdapterForCollectionRecord( iCollectionRecord) {
          var collectionID = iCollectionRecord.get('id'),
              collection = dataContext.getCollectionByID( collectionID),
              // try to find an existing adapter for the specified collection
              adapter = findAdapterForCollection( collectionID);
          if( !adapter) {
            // create a new adapter for the specified collection
            adapter = DG.CaseTableAdapter.create({
              dataContext: dataContext,
              collection: collection,
              model: caseTableModel
            });

          }
          // add the new/found adapter to the adapter array
          newAdapters.push( adapter);
        }

        collectionRecords.forEach( guaranteeAdapterForCollectionRecord);
      },

      /**
        Configure the table for the new data context.
       */
      dataContextDidChange: function() {
        var dataContext = this.get('dataContext');

        this.updateTableAdapters();

        var contentView = this.getPath('view.contentView');
        if( contentView) contentView.setCaseTableAdapters( this.get('caseTableAdapters'));

        if( dataContext !== this._prevDataContext) {
          if( this._prevDataContext)
            this._prevDataContext.removeObserver('changeCount', this, 'contextDataDidChange');
          if( dataContext)
            dataContext.addObserver('changeCount', this, 'contextDataDidChange');
          this._prevDataContext = dataContext;
        }

        var childCollection = this.getPath('dataContext.childCollection');
        if( childCollection) {
          // old-style notification support -- Remove once new-style notifications are completed.
          var this_ = this;
          //childCollection.casesController.addObserver('[]', this, 'caseCountDidChange');
          dataContext.forEachCollection( function( iCollection) {
                                          iCollection.attrsController.
                                            addObserver('[]', this_, 'attributeCountDidChange');
                                         });
        }
        this.doResetCollections();
      }.observes('dataContext'),

      getCaseCountMessage: function () {
        var dataContext = this.get('dataContext');
        var collectionRecords = dataContext.get('collections');
        var messages = [];
        var tStatusMessage = "";

        collectionRecords.forEach(function (collectionRecord) {
          var collectionClient = dataContext.getCollectionByName(collectionRecord.get('name'));
          var message = dataContext.getCaseCountString(collectionClient, collectionClient.getCaseCount() || 0);
          messages.push(message);
        });
        tStatusMessage = messages.join('/');
        if (SC.empty(tStatusMessage)) {
          DG.logWarn('No status message for case table: no collections');
        }

        //DG.logInfo("UpdateStatus: "  + tStatusMessage);
        return tStatusMessage;
      },

      createComponentStorage: function() {
        var caseTableModel = this.getPath('model.content'),
            dataContext = caseTableModel.get('context'),
            collapsedNodes = caseTableModel.get('collapsedNodes'),
            attributeWidths = [],
            storage = {};
        if( dataContext) {
          this.addLink(storage, 'context', dataContext);
        }

        DG.ObjectMap.forEach(caseTableModel.get('preferredAttributeWidths'), function (key, width) {
          var obj = {};
          var attrRef = dataContext.getAttrRefByID(key);
          if (attrRef) {
            this.addLink(obj, 'attr', attrRef.attribute);
            obj.width = width;
            attributeWidths.push(obj);
          }
        }.bind(this));
        storage.attributeWidths = attributeWidths;

        collapsedNodes.forEach(function (node, key) {
          if (node.isCollapsed) {
            this.addLink(storage, 'collapsedNodes', node.collapsedCase);
          }
        }.bind(this));

        return storage;
      },

      restoreComponentStorage: function( iStorage, iDocumentID) {
        var caseTableModel = this.getPath('model.content');
        if (caseTableModel) {
          var contextID = this.getLinkID( iStorage, 'context'),
              collapsedNodesCount = DG.ArchiveUtils.getLinkCount(iStorage, 'collapsedNodes'),
              dataContext = contextID && DG.DataContext.retrieveContextFromMap( iDocumentID, contextID),
              attributeWidths = {},
              ix = 0;
          if (iStorage.attributeWidths) {
            iStorage.attributeWidths.forEach(function (obj) {
              var id = this.getLinkID(obj, 'attr');
              attributeWidths[id] = obj.width;
            }.bind(this));
            caseTableModel.set('preferredAttributeWidths', attributeWidths);
          }
          if( dataContext) {
            caseTableModel.set('context', dataContext);
            //
            this.invokeLater(function () {
              this.set('dataContext', dataContext);
            }.bind(this));
          }
          if (collapsedNodesCount > 0) {
            while(ix < collapsedNodesCount) {
              caseTableModel.collapseNode(DG.store.find('DG.Case', DG.ArchiveUtils.getLinkID(iStorage, 'collapsedNodes', ix)));
              ix += 1;
            }
          }
        }
      },

      /**
        Process commands such as those dispatched by the SlickGrid column header menus.
        @param  {Object}  iArgs
                  {String}  iArgs.command
                  {Object}  iArgs.column
                    {String}  iArgs.column.id
       */
      doCommand: function( iArgs) {
        var columnID = Number( iArgs.column.id);
        switch( iArgs.command) {
        case 'cmdEditFormula':
          this.editAttributeFormula( columnID);
          break;
        case 'cmdRenameAttribute':
          this.renameAttribute( columnID);
          break;
        case 'cmdDeleteAttribute':
          this.deleteAttribute( columnID);
          break;
        }
      },

      /**
        Observer function called when the data context notifies that it has changed.
       */
      contextDataDidChange: function() {
        var changes = this.getPath('dataContext.newChanges'),
            // most changes are sufficient to require aggregate invalidation
            invalidateAggregates = true;

        /**
          Process each change that has occurred since the last notification.
         */
        var handleOneChange = function( iChange) {
          var operation = iChange && iChange.operation;
          switch( operation) {
          case 'createCollection':
            // Hook up the table to the new collection
            this.dataContextDidChange();
            break;
          case 'createCase':
          case 'createCases':
            this.caseCountDidChange( iChange);
            break;
          case 'updateCases':
            this.doChangeCaseValues( iChange);
            break;
          case 'deleteCases':
            this.caseCountDidChange( iChange);
            this.doSelectCases(iChange);
            break;
          case 'selectCases':
            this.doSelectCases( iChange);
            // selection changes don't require aggregate invalidation
            if( operation === 'selectCases')
              invalidateAggregates = false;
            break;
          case 'createAttributes':
          case 'deleteAttributes':
          case 'moveAttribute':
            this.caseCountDidChange( iChange);
            this.attributeCountDidChange( iChange);
            break;
          case 'updateAttributes':
            this.doUpdateAttributes( iChange);
            break;
          case 'resetCollections':
            this.caseCountDidChange( iChange);
            this.dataContextDidChange();
            break;
          default:
            DG.logWarn('Unhandled operation: ' + iChange.operation);
          }
        }.bind( this);

        // Process all changes that have occurred since the last notification.
        if( changes) {
          changes.forEach( function( iChange) {
                              handleOneChange( iChange);
                            });
        }
        // If there are aggregate functions, we may have to mark all cases as changed.
        if( invalidateAggregates) {
          var adapters = this.get('caseTableAdapters');
          if( adapters) {
            adapters.forEach( function( iAdapter) {
                                                    if( iAdapter.get('hasAggregates'))
                                                      iAdapter.markCasesChanged();
                                                  });
          }
        }
      },
      doResetCollections: function (iChange) {
        function processAdapter(iAdapter) {
          iAdapter.rebuild();
          iAdapter.refresh();
        }
        var adapters = this.get('caseTableAdapters');
        adapters.forEach( processAdapter);
      },
      /**
        Called when the data context notifies that the set of selected cases has changed.
        @param iChange {Object}  An object describing the nature of the change
       */
      doSelectCases: function( iChange) {
        var hierTableView = this.getPath('view.contentView');
        if( hierTableView)
          hierTableView.updateSelectedRows();
      },

      /**
        Called when the data context notifies that case values have changed.
        @param iChange {Object}  An object describing the nature of the change
       */
      doChangeCaseValues: function( iChange) {
        var adapters = this.get('caseTableAdapters');
        if( adapters) {
          adapters.forEach( function( iAdapter) {
                                                  iAdapter.markCasesChanged( iChange.cases);
                                                });
        }
      },

      /**
        Called when the data context notifies that attribute properties have changed.
        @param  iChange {Object}  An object describing the nature of the change
       */
      doUpdateAttributes: function( iChange) {
        var hierTableView = this.getPath('view.contentView'),
            adapters = this.get('caseTableAdapters'),
            updatedAdapters = [],
            attributes = iChange && iChange.result && iChange.result.attrs;

        function processAdapter( iAdapter) {
          if( attributes) {
            attributes.forEach( function( iAttribute) {
                                  if( iAdapter.updateColumnForAttribute( iAttribute))
                                    updatedAdapters.push( iAdapter);
                                });
          }
        }

        if( adapters) {
          adapters.forEach( processAdapter);
          if( hierTableView) {
            hierTableView.get('childTableViews').
              forEach( function( iCaseTableView) {
                var tableAdapter = iCaseTableView.get('gridAdapter');
                if( updatedAdapters.indexOf( tableAdapter) >= 0) {
                  iCaseTableView.setColumns( tableAdapter.get('gridColumns'));
                }
              });
          }
        }
      },

      /**
        Called when the array observer indicates that the number of cases has changed.
       */
      caseCountDidChange: function( iChange) {
        var hierTableView = this.getPath('view.contentView'),

            // if the change event includes an index, then we're inserting a new row in an
            // arbitrary location, so we need to force the table to re-index the rows
            forceRedraw   = iChange.properties && !SC.none(iChange.properties.index);

        if( hierTableView) {
          hierTableView.updateRowCount(forceRedraw);
        }
      },

      /**
        Called when the array observer indicates that the number of attributes has changed.
       */
      attributeCountDidChange: function() {
        var hierTableView = this.getPath('view.contentView');
        if( hierTableView)
          hierTableView.updateColumnInfo();
      },

      /**
       Handler for the Export Case Data... menu command.
       Displays a dialog, so user can select and copy the case data from the current document.
       */
      exportCaseData: function () {
        // callback to get export string from one of the menu item titles
        var exportCollection = function (whichCollection) {
          return tDataContext.exportCaseData(whichCollection);
        };
        // get array of exportable collection names for menu titles
        var tDataContext = this.get('dataContext'),
          tMenuItems = tDataContext.exportCaseData().split('\t'),
          tStartingMenuItem = tMenuItems[0];

        DG.CreateExportCaseDataDialog({
          prompt: 'DG.AppController.exportCaseData.prompt',
          textLimit: 1000000,
          textValue: exportCollection(tStartingMenuItem),
          collectionMenuTitle: tStartingMenuItem,
          collectionMenuItems: tMenuItems,
          collectionMenuItemAction: exportCollection,
          okTitle: 'DG.AppController.exportDocument.okTitle',
          okTooltip: 'DG.AppController.exportDocument.okTooltip'
        });
      },

      modelDidChange: function() {
      }.observes('model'),

      viewDidChange: function() {
        var tComponentView = this.get('view'),
            tContentView = tComponentView.get('contentView');
        this.set('contentView', tContentView);

        if( !this.getPath('caseTableAdapters.length'))
          this.updateTableAdapters();

        if( tContentView) {
          tContentView.bind('dataContext', this, 'dataContext');

          tContentView.setCaseTableAdapters( this.get('caseTableAdapters') || []);
        }

        var gearView = this.getPath('view.containerView.titlebar.gearView');
        if( gearView)
          gearView.set('contentView', tComponentView);
      }.observes('view'),

      selectAll: function () {
        var tContext = this.get('dataContext'),
          tCollection = tContext && tContext.get('parentCollection'),// todo
        tChange = {
          operation: 'selectCases',
          collection: tCollection,
          cases: null,// null selects all
          select: true
        };
        tContext.applyChange( tChange);
      },
      /**
        Deletes the currently selected cases from their collections.
       */
      deleteSelectedCases: function() {
        var tContext = this.get('dataContext'),
            tCases = tContext.getSelectedCases(),
            tChange;
        if (tContext) {
          // We deselect the cases before deleting them for performance
          // reasons. Deleting selected cases is much less efficient because
          // of list reconstruction.
          tChange = {
            operation: 'selectCases',
            select: false,
            cases: tCases
          };
          tContext.applyChange( tChange);
          tChange = {
            operation: 'deleteCases',
            cases: tCases
          };
          tContext.applyChange( tChange);
        }
      },

      /**
       * Method to create a new attribute with formula.
       * NOTE: this method will also replace the formula of an existing attribute of the same name (case sensitive)
       * @param iProperties --properties to pass on to the applyNewAttribute() method.
       * @param iDefaultAttrName {string} --(optional) default attribute name for the new attribute dialog
       * @param iDefaultAttrFormula {string} --(optional) default attribute formula string for the new attribute dialog
       */
      newAttribute: function( iProperties, iDefaultAttrName, iDefaultAttrFormula ) {
        var tDataContext = this.get('dataContext'),
            collectionRecords = tDataContext.get('collections'),
            tGlobalNames = DG.globalsController.getGlobalValueNames(),
            tOperandsMenu = [],
                            // Eventually, we will want some form of unique name generator
            defaultAttrName = iDefaultAttrName || '', // was DG.TableController.newAttrDlg.defaultAttrName'.loc(),  // "new_attr"
            defaultAttrFormula = iDefaultAttrFormula || '';

        function appendArrayOfNamesToMenu( iNamesArray) {
          if( !iNamesArray || !iNamesArray.length) return;
          if( tOperandsMenu.length)
            tOperandsMenu.push('--');
          tOperandsMenu = tOperandsMenu.concat( iNamesArray.sort());
        }

        collectionRecords.forEach(function (collectionRecord) {
          var collectionContext = tDataContext.getCollectionByName(collectionRecord.name);
          appendArrayOfNamesToMenu(collectionContext.collection.getAttributeNames());
        });
        appendArrayOfNamesToMenu( tGlobalNames);
        appendArrayOfNamesToMenu([ 'e', 'π' ]);

          // Use SC.mixin() to combine iProperties with the rest of the default properties
          // that are passed to the new attribute dialog.
        this.newAttributeDialog = DG.CreateAttributeFormulaView(SC.mixin({
                      applyTarget: this,
                      applyAction: 'applyNewAttribute',
                      applyTooltip: 'DG.TableController.newAttrDlg.applyTooltip', // "Define the new attribute using the name and (optional) formula"
                      attrNameHint: 'DG.TableController.newAttrDlg.attrNameHint',
                      attrNameValue: defaultAttrName,
                      attrNameIsEnabled: SC.empty( iDefaultAttrName ), // disable attribute name changes if editing an existing attribute
                      formulaValue: defaultAttrFormula,
                      //formulaNames: tFormulaNames,  // no type-ahead
                      formulaOperands: tOperandsMenu,
                      formulaHint: 'DG.TableController.newAttrDlg.formulaHint'  // "If desired, type a formula for computing values of this attribute"
                    }, iProperties));
      },

      applyNewAttribute: function() {
        var tContext = this.get('dataContext'),
            tAttributeName = this.newAttributeDialog.get('attributeName'),
            tRef = tContext.getAttrRefByName( tAttributeName),
            tAttrFormula = tRef && tRef.attribute.get('formula'),
            isNew = this.newAttributeDialog.get('attrNameIsEnabled');
        // Should also test for attribute name validity as well
        if( !SC.empty( tAttributeName)) {
          // Retrieve the name of the target collection that was passed by the client originally.
          var tCollection = this.newAttributeDialog.get('collection'),
              tFormula = this.newAttributeDialog.get('formula');

          DG.UndoHistory.execute(DG.Command.create({
            name: isNew ? "caseTable.createAttribute" : "caseTable.editAttributeFormula",
            undoString: isNew ? 'DG.Undo.caseTable.createAttribute' : 'DG.Undo.caseTable.editAttributeFormula',
            redoString: isNew ? 'DG.Redo.caseTable.createAttribute' : 'DG.Redo.caseTable.editAttributeFormula',
            _componentId: this.getPath('model.id'),
            _controller: function() {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            execute: function() {
              tRef = tContext.getAttrRefByName( tAttributeName);
              var tChange = {
                          operation: 'createAttributes',
                          collection: tCollection,
                          attrPropsArray: [{ name: tAttributeName, formula: tFormula }]
                        },
                  tResult = tContext && tContext.applyChange( tChange);
              if( tResult.success) {
                var action = isNew ? "attributeCreate" : "attributeEditFormula";
                this.log = "%@: { name: '%@', collection: '%@', formula: '%@' }".fmt(
                            action, tAttributeName, tCollection.get('name'), tFormula);
              } else {
                  this.set('causedChange', false);
              }
            },
            undo: function() {
              var tChange, tResult, action;
              tContext = this._controller().get('dataContext');
              if (isNew) {
                tRef = tContext.getAttrRefByName( tAttributeName);
                tChange = {
                            operation: 'deleteAttributes',
                            collection: tCollection,
                            attrs: [{ id: tRef.attribute.get('id'), attribute: tRef.attribute }]
                          };
              } else {
                tChange = {
                            operation: 'createAttributes',
                            collection: tCollection,
                            attrPropsArray: [{ name: tAttributeName, formula: tAttrFormula }]
                          };
              }
              tResult = tContext && tContext.applyChange( tChange);
              if( tResult.success) {
                action = isNew ? "attributeCreate" : "attributeEditFormula";
              } else {
                  this.set('causedChange', false);
              }
            },
            redo: function() {
              tContext = this._controller().get('dataContext');
              this.execute();
            }
          }));
        }
        else {
          // Alert if user doesn't enter an attribute name
          DG.AlertPane.show({
              localize: true,
              message: 'DG.TableController.newAttrDlg.mustEnterAttrNameMsg'
          });
          return; // Return without closing the dialog
        }
        this.newAttributeDialog.close();
        this.newAttributeDialog = null;
      },

      willDestroy: function() {
        if( this.newAttributeDialog) {
          this.newAttributeDialog.close();
          this.newAttributeDialog = null;
        }
        sc_super();
      },

      /**
       * Rename an attribute. Brings up the Rename Attribute dialog.
       *
       */
      renameAttribute: function( iAttrID) {
        var tDataContext = this.get('dataContext'),
            tAttrRef = tDataContext && tDataContext.getAttrRefByID( iAttrID),
            tCollectionClient = tDataContext && tAttrRef &&
                                tDataContext.getCollectionForAttribute( tAttrRef.attribute),
            tAttrName = tAttrRef && tAttrRef.attribute.get('name'),
            tDialog;
        if( !DG.assert( tAttrRef, "renameAttribute() is missing the attribute reference"))
          return;

        var doRenameAttribute = function( iAttrID, iAttrName, iOldAttrName) {
          DG.UndoHistory.execute(DG.Command.create({
            name: "caseTable.renameAttribute",
            undoString: 'DG.Undo.caseTable.renameAttribute',
            redoString: 'DG.Redo.caseTable.renameAttribute',
            log: 'Rename attribute "%@"'.fmt(iAttrName),
            _componentId: this.getPath('model.id'),
            _controller: function() {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            execute: function() {
              tAttrRef = tDataContext.getAttrRefByName( iOldAttrName);
              var change = {
                              operation: 'updateAttributes',
                              collection: tAttrRef && tAttrRef.collection,
                              attrPropsArray: [{ id: tAttrRef.attribute.get('id'), name: iAttrName }]
                            };
              tDataContext.applyChange( change);
            },
            undo: function() {
              tDataContext = this._controller().get('dataContext');
              tAttrRef = tDataContext.getAttrRefByName( iAttrName);
              var change = {
                              operation: 'updateAttributes',
                              collection: tAttrRef && tAttrRef.collection,
                              attrPropsArray: [{ id: tAttrRef.attribute.get('id'), name: iOldAttrName }]
                            };
              tDataContext.applyChange( change);
            },
            redo: function() {
              tDataContext = this._controller().get('dataContext');
              this.execute();
            }
          }));
        }.bind(this);

        function handleRenameAttributeOK() {
          // newAttrName: value of single-text-dialog: cannot be empty string
          var newAttrName = tDialog.get('value'),
              tExistingAttr = tCollectionClient && newAttrName &&
                              tCollectionClient.getAttributeByName( newAttrName);
          // if the name didn't change, then there's nothing to do
          if( newAttrName === tAttrName) {
            tDialog.close();
            return;
          }
          if( newAttrName && !tExistingAttr) {
            tDialog.close();
            doRenameAttribute( iAttrID, newAttrName, tAttrName);
          }
          else if( tExistingAttr) {
            DG.AlertPane.info({
              message: 'DG.TableController.renameAttributeDuplicateMsg',
              description: 'DG.TableController.renameAttributeDuplicateDesc',
              localize: true
            });
          }
        }

        tDialog = DG.CreateSingleTextDialog( {
                        prompt: 'DG.TableController.renameAttributePrompt',
                        textValue: tAttrName,
                        okTarget: null,
                        okAction: handleRenameAttributeOK,
                        okTooltip: 'DG.TableController.renameAttributeOKTip'
                      });
      },

      /**
       * Delete an attribute after requesting confirmation from the user.
       *
       */
      deleteAttribute: function( iAttrID) {
        var tDataContext = this.get('dataContext'),
            tAttrRef = tDataContext && tDataContext.getAttrRefByID( iAttrID),
            tAttrName = tAttrRef && tAttrRef.attribute.get('name');

        var doDeleteAttribute = function() {
          DG.UndoHistory.execute(DG.Command.create({
            name: "caseTable.deleteAttribute",
            undoString: 'DG.Undo.caseTable.deleteAttribute',
            redoString: 'DG.Redo.caseTable.deleteAttribute',
            log: 'Delete attribute "%@"'.fmt(tAttrName),
            _componentId: this.getPath('model.id'),
            _controller: function() {
              return DG.currDocumentController().componentControllersMap[this._componentId];
            },
            _beforeStorage: {
              changeFlag: tDataContext.get('flexibleGroupingChangeFlag')
            },
            execute: function() {
              tAttrRef = tDataContext.getAttrRefByName( tAttrName);
              var change = {
                              operation: 'deleteAttributes',
                              collection: tAttrRef && tAttrRef.collection,
                              attrs: [{ id: iAttrID, attribute: tAttrRef.attribute }]
                            };
              tDataContext.applyChange( change);
              tDataContext.set('flexibleGroupingChangeFlag', true);
            },
            undo: function() {
              tDataContext = this._controller().get('dataContext');
              var tChange = {
                              operation: 'createAttributes',
                              collection: tAttrRef && tAttrRef.collection,
                              attrPropsArray: [tAttrRef.attribute],
                              position: [tAttrRef.position]
                            };
              tDataContext.applyChange( tChange);
              tDataContext.set('flexibleGroupingChangeFlag', this._beforeStorage.changeFlag);
            },
            redo: function() {
              tDataContext = this._controller().get('dataContext');
              tAttrRef = tDataContext.getAttrRefByName( tAttrName);
              var tChange = {
                              operation: 'deleteAttributes',
                              collection: tAttrRef && tAttrRef.collection,
                              attrs: [{ id: tAttrRef.attribute.get('id'), attribute: tAttrRef.attribute }]
                            };
              tDataContext.applyChange( tChange);
              tDataContext.set('flexibleGroupingChangeFlag', true);
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
       * Edit a formula attribute, if given the attribute ID.
       * Initiates an Edit Attribute Formula dialog for the given attribute.
       *
       */
      editAttributeFormula: function( iAttrID ) {
        var tDataContext = this.get('dataContext'),
            tRef = tDataContext && tDataContext.getAttrRefByID( iAttrID),
            tAttrName = tRef && tRef.attribute.get('name'),
            tAttrFormula = tRef && tRef.attribute.get('formula');
        DG.assert( tRef && tAttrName, "editAttributeFormula() is missing the attribute reference or attribute name" );
        // for now we use the newAttribute() method which will replace one attribute formula with another
        // if the new attribute has the same name as the old.
        this.newAttribute({ collection: tRef.collection }, tAttrName, tAttrFormula || '' );
      },

      showDeletePopup: function() {
        var tDataContext = this.get('dataContext'),
            //tCases = tModel.get('cases'),
            tSelection = tDataContext && tDataContext.getSelectedCases(),
            tDeleteIsEnabled = tSelection && tSelection.get('length') > 0,
            //tDeleteUnselectedIsEnabled = !tSelection || tSelection.get('length') < tCases.length,
            tItems = [
              {
                title: 'DG.Inspector.selection.selectAll',
                localize: true,
                target: this,
                action: 'selectAll'
              },
              {
                title: 'DG.Inspector.selection.deleteSelectedCases',
                localize: true,
                target: this,
                action: 'deleteSelectedCases',
                isEnabled: tDeleteIsEnabled
              }/*,
              {
                title: 'DG.Inspector.selection.deleteUnselectedCases',
                localize: true,
                target: this,
                action: 'deleteUnselectedCases',
                isEnabled: tDeleteUnselectedIsEnabled
              }*/
            ],
            tMenu = DG.MenuPane.create({
              classNames: 'delete-popup'.w(),
              layout: {width: 200, height: 150},
              items: tItems
            });
        tMenu.popup(this.get('inspectorButtons')[0]);
      },

      showAttributesPopup: function() {
        var tDataContext = this.get('dataContext'),
            collectionRecords = tDataContext.get('collections') || [],
            tNewAttrMenuItemStringKey = 'DG.Inspector.newAttribute',
            tItems = [];
        collectionRecords.forEach(function (collection) {
          tItems.push({
            title: tNewAttrMenuItemStringKey.loc( collection.name),
            target: this,
            args: [{collection: tDataContext.getCollectionByName(collection.name)}],
            dgAction: 'newAttribute'
          });
        }.bind(this));
        tItems.push({
          title: 'DG.Inspector.exportCaseData', // "Export Case Data..."
          localize: true,
          target: this,
          dgAction: 'exportCaseData'
        });

        DG.MenuPane.create({
          classNames: 'attributes-popup'.w(),
          layout: {width: 200, height: 150},
          items: tItems
        }).popup(this.get('inspectorButtons')[1]);
      },

      /**
       *
       * @returns {Array}
       */
      createInspectorButtons: function() {
        var tButtons = sc_super();
        tButtons.push(DG.IconButton.create({
              layout: {width: 32},
              classNames: 'table-trash'.w(),
              iconClass: 'moonicon-icon-trash',
              showBlip: true,
              target: this,
              action: 'showDeletePopup',
              toolTip: 'DG.Inspector.delete.toolTip',
              localize: true
            })
        );
        tButtons.push(DG.IconButton.create({
              layout: {width: 32},
              classNames: 'table-attributes'.w(),
              iconClass: 'moonicon-icon-values',
              showBlip: true,
              target: this,
              action: 'showAttributesPopup',
              toolTip: 'DG.Inspector.attributes.toolTip',
              localize: true
            })
        );
        return tButtons;
      },

      _makeUniqueCollectionName: function (candidateName) {
        function pluralize(name) {
          return name + 's';
        }
        var context = this.dataContext;
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
      _createCollectionCommand: function (attribute, collection, context, parentCollectionID) {
        var collectionName = this._makeUniqueCollectionName(attribute.name);
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
       * Handles drop to leftDropZone.
       */
      leftDropZoneDidAcceptDrop: function () {
        var dropData = this.getPath('contentView.leftDropTarget.dropData');
        if (SC.none(dropData)) {
          return;
        }
        var context = this.dataContext;
        DG.UndoHistory.execute(this._createCollectionCommand(dropData.attribute,
            dropData.collection, context));
        this.setPath('contentView.leftDropTarget.dropData', null);
      }.observes('contentView.leftDropTarget.dropData'),
    };
  }()) // function closure
);

