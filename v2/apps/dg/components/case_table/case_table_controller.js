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

sc_require('components/case_display_common/case_display_controller');
sc_require('components/case_table/attribute_editor_view');

/** @class

  DG.CaseTableController provides controller functionality for DG.TableViews.

  @extends DG.CaseDisplayController
*/
DG.CaseTableController = DG.CaseDisplayController.extend(
/** @scope DG.CaseTableController.prototype */
  (function() {
    return {

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
        this.get('specialTitleBarButtons').push(
            DG.CaseCardToggleButton.create()
        );
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

      // Utility function for identifying existing adapters for the specified collection
      findAdapterForCollection: function(iCollectionID) {
        var i, count, adapters = this.caseTableAdapters;
        if (adapters) {
          count = adapters.length;
          for( i = 0; i < count; ++i) {
            if( adapters[i] && (adapters[i].getPath('collection.id') === iCollectionID))
              return adapters[i];
          }
        }
        return null;
      },

      /**
        Builds an appropriate DG.CaseTableAdapter for each collection.
       */
      updateTableAdapters: function() {
        var dataContext = this.get('dataContext'),
            collectionRecords = dataContext && dataContext.get('collections') || [],
            // The controller model is a component object. We want the model for the
            // component's content.
            caseTableModel = this.model && this.model.get('content'),
            // new array to capture adapter order
            newAdapters = [];

        /**
         *
         * @param {DG.Collection} iCollectionRecord
         */
        function hasDisplayableAttributes(iCollectionRecord) {
          var attrs = iCollectionRecord.get('attrs');
          return !!attrs.find(function (attr) {return !attr.get('hidden');});
        }

        // Utility function for finding or creating (if necessary) an appropriate
        // adapter for the specified collection.
        var guaranteeAdapterForCollectionRecord = function( iCollectionRecord) {
          var collectionID = iCollectionRecord.get('id'),
              collection = dataContext.getCollectionByID( collectionID),
              // try to find an existing adapter for the specified collection
              adapter = this.findAdapterForCollection( collectionID);
          if( adapter) {
            adapter.beginPropertyChanges();
            adapter.set('dataContext', dataContext);
            adapter.set('collection', collection);
            adapter.endPropertyChanges();
          }
          else {
            // create a new adapter for the specified collection
            adapter = DG.CaseTableAdapter.create({
              dataContext: dataContext,
              collection: collection,
              model: caseTableModel
            });
          }
          newAdapters.push(adapter);
        }.bind(this);

        collectionRecords
            .filter(function (cr) { return hasDisplayableAttributes(cr); })
            .forEach( guaranteeAdapterForCollectionRecord);
        this.set('caseTableAdapters', newAdapters);
      },

      resetProtoCaseRows: function() {
        this.get('caseTableAdapters').forEach(function(adapter) {
          var gridDataView = adapter.get('gridDataView');
          if (gridDataView) gridDataView.resetProtoCases();
        });
      },

      /**
        Configure the table for the new data context.
       */
      dataContextDidChange: function() {
        var dataContext = this.get('dataContext');

        this.updateTableAdapters();

        var contentView = this.getPath('view.contentView');

        // Handle divider views for the drag-attribute listener setup.
        if (contentView) {
          var dividerDropDataCallback = function (iDivider) {
            var dropData = iDivider.getPath('dropData');
            if (SC.none(dropData)) {
              return;
            }
            var context = iDivider.getPath('dataContext');
            var parentTable = iDivider.getPath('leftTable');

            this.resetProtoCaseRows();
            DG.UndoHistory.execute(DG.DataContextUtilities.createCollectionCommand(dropData.attribute, dropData.collection, context, parentTable.getPath('gridAdapter.collection.id')));

            iDivider.setPath('dropData', null);
          }.bind(this);

          contentView.set('dataContext', dataContext);

          // Remove the observer and destroy stray divider views before the new setup.
          var oldDividerViews = contentView.getPath('dividerViews');
          oldDividerViews.forEach(function (iDividerView) {
            iDividerView.removeObserver('dropData', dividerDropDataCallback);
            iDividerView.destroy();
          });

          // This creates new divider views along with other stuff.
          contentView.setCaseTableAdapters(this.get('caseTableAdapters'));

          // Setup an observer for the drop-target divider views.
          var dividerViews = contentView.getPath('dividerViews');
          dividerViews.forEach(function (iDividerView) {
            iDividerView.addObserver('dropData', dividerDropDataCallback);
          });
        }

        if( dataContext !== this._prevDataContext) {
          if( this._prevDataContext)
            this._prevDataContext.removeObserver('changeCount', this, 'contextDataDidChange');
          if( dataContext)
            dataContext.addObserver('changeCount', this, 'contextDataDidChange');
          this._prevDataContext = dataContext;
          // In case the previous dataContext was destroyed, we are removed from the registry, so reregister
          DG.currDocumentController().tableCardRegistry.registerView(dataContext, this.get('view'));
        }

        var childCollection = this.getPath('dataContext.childCollection');
        if( childCollection) {
          // old-style notification support -- Remove once new-style notifications are completed.
          var this_ = this;
          //childCollection.casesController.addObserver('[]', this, 'caseCountDidChange');
          dataContext.forEachCollection( function( iCollection) {
                                          iCollection.attrsController.
                                            addObserver('[]', this_, 'attributesDidChange');
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
            isActive = caseTableModel.get('isActive'),
            horizontalScrollOffset = caseTableModel.get('horizontalScrollOffset'),
            collapsedNodes = caseTableModel.get('collapsedNodes'),
            isIndexHidden = caseTableModel.get('isIndexHidden'),
            attributeWidths = [],
            rowHeights = [],
            storage = {
              isActive: isActive,
              horizontalScrollOffset: horizontalScrollOffset,
              isIndexHidden: isIndexHidden
            };
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

        DG.ObjectMap.forEach(caseTableModel.get('tableRowHeights'), function (collectionId, rowHeight) {
          var obj = {};
          var collection = dataContext.getCollectionByID(collectionId);
          if (collection) {
            this.addLink(obj, 'collection', collection);
            obj.rowHeight = rowHeight;
            rowHeights.push(obj);
          }
        }.bind(this));
        storage.rowHeights = rowHeights;

        collapsedNodes.forEach(function (caseID, key) {
          var tCase = dataContext.getCaseByID(caseID);
          if (tCase) {
            this.addLink(storage, 'collapsedNodes', tCase);
          }
        }.bind(this));

        return storage;
      },

      restoreComponentStorage: function( iStorage, iDocumentID) {
        sc_super();
        var caseTableModel = this.getPath('model.content');
        if (caseTableModel) {
          var contextID = this.getLinkID( iStorage, 'context'),
              collapsedNodesCount = DG.ArchiveUtils.getLinkCount(iStorage,
                  'collapsedNodes'),
              dataContext = contextID
                  && DG.currDocumentController().getContextByID(contextID),
              attributeWidths = {},
              rowHeights = {},
              isActive = iStorage.isActive,
              ix = 0;
          if (iStorage.attributeWidths) {
            iStorage.attributeWidths.forEach(function (obj) {
              var id = this.getLinkID(obj, 'attr');
              attributeWidths[id] = obj.width;
            }.bind(this));
            caseTableModel.set('preferredAttributeWidths', attributeWidths);
          }
          if (iStorage.rowHeights) {
            iStorage.rowHeights.forEach(function (obj) {
              var collectionId = this.getLinkID(obj, 'collection');
              rowHeights[collectionId] = obj.rowHeight;
            }.bind(this));
            caseTableModel.set('tableRowHeights', rowHeights);
          }
          if( dataContext) {
            caseTableModel.set('context', dataContext);
            this.set('dataContext', dataContext);
          }
          caseTableModel.set('isActive', isActive);
          caseTableModel.set('isIndexHidden', iStorage.isIndexHidden);
          caseTableModel.set('horizontalScrollOffset', iStorage.horizontalScrollOffset);
          if (collapsedNodesCount > 0) {
            while(ix < collapsedNodesCount) {
              caseTableModel.collapseNode(DG.store.find('DG.Case',
                  DG.ArchiveUtils.getLinkID(iStorage, 'collapsedNodes', ix)));
              ix += 1;
            }
          }
        }
        // Todo: This low-level call to get a refresh is problematic. Figure out a better way
        if( this.get('contentView')) {
          this.get('contentView').frameDidChange();
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
        case 'cmdDeleteFormulaKeepValues':
          this.deleteFormulaKeepValues( columnID);
          break;
        case 'cmdRecoverDeletedFormula':
          this.recoverDeletedFormula( columnID);
          break;
        case 'cmdEditName':
          this.editName( columnID, iArgs.grid.getHeaderRowColumn(columnID));
          break;
        case 'cmdResizeAttribute':
          this.resizeColumn(columnID, iArgs.grid.getHeaderRowColumn(columnID));
           break;
        case 'cmdEditAttribute':
          this.editAttribute( columnID, iArgs.grid.getHeaderRowColumn(columnID));
          break;
        case 'cmdRandomizeAttribute':
          DG.DataContextUtilities.randomizeAttribute( this.get('dataContext'), columnID);
          break;
        case 'cmdSortAscending':
          this.sortAttribute( columnID);
          break;
        case 'cmdSortDescending':
          this.sortAttribute( columnID, true);
          break;
        case 'cmdHideAttribute':
          DG.DataContextUtilities.hideAttribute( this.get('dataContext'), columnID);
          break;
        case 'cmdDeleteAttribute':
          DG.DataContextUtilities.deleteAttribute( this.get('dataContext'), columnID);
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
          case 'deleteCollection':
            this.dataContextDidChange();
            break;
          case 'createCase':
          case 'createCases':
          case 'moveCases':
            this.doCreateCases( iChange);
            invalidateAggregates = false; // handled by doDependentCases
            break;
          case 'updateCases':
            this.doUpdateCases( iChange);
            invalidateAggregates = false; // handled by doDependentCases
            break;
          case 'deleteCases':
            this.doDeleteCases( iChange);
            invalidateAggregates = false; // handled by doDependentCases
            break;
          case 'selectCases':
            this.doSelectCases( iChange);
            // selection changes don't require aggregate invalidation
            invalidateAggregates = false;
            break;
          case 'dependentCases':
            this.doDependentCases(iChange);
            invalidateAggregates = false; // handled by doDependentCases
            break;
          case 'createAttributes':
            this.doCreateAttributes(iChange);
            break;
          case 'hideAttributes':
          case 'unhideAttributes':
            this.dataContextDidChange(iChange);
            this.attributesDidChange(iChange);
            break;
          case 'updateAttributes':
            this.dataContextDidChange(iChange);
            this.attributesDidChange(iChange);
            break;
          case 'deleteAttributes':
            this.doDeleteAttributes(iChange);
            break;
          case 'moveAttribute':
            this.dataContextDidChange(iChange);
            this.doMoveAttributes(iChange);
            break;
          case 'resetCollections':
            this.caseCountDidChange( iChange);
            this.dataContextDidChange();
            break;
          case 'deleteDataContext':
            this.dataContextWasDeleted();
            break;
          case 'updateDataContext':
          case 'updateCollection':
          case 'createItems':
          case 'updateItems':
          case 'deleteItems':
          case 'moveItems':
            // Nothing to do here because we'll receive corresponding case notifications
            break;
          default:
            DG.logWarn("DG.CaseTableController -- Unhandled operation: " + iChange.operation);
          }
        }.bind( this);

        // Process all changes that have occurred since the last notification.
        if( changes) {
          changes.forEach( function( iChange) {
                              handleOneChange( iChange);
                            });
        }
        // If there are aggregate functions, we may have to mark all cases as changed.
        // With the introduction of the dependency manager, this should be less frequent.
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
      doCreateCases: function (iChange) {
        this.caseCountDidChange( iChange);
        if (iChange.result && iChange.result.caseIDs) {
          // The dataView is not necessarily updated until the end of the run loop,
          // so we defer scrolling...
          this.invokeNext(function () {
            this.get('contentView').scrollToCaseByID(iChange.collection,
                iChange.result.caseIDs[iChange.result.caseIDs.length - 1]);
          });
        }
      },
      doUpdateCases: function (iChange) {
        this.doChangeCaseValues(iChange);
      },
      doDeleteCases: function (iChange) {
        var caseTableModel = this.getPath('model.content');
        this.caseCountDidChange( iChange);
        this.doSelectCases(iChange);
        caseTableModel.didDeleteCases(iChange.cases);
        this.resetProtoCaseRows();
      },
      doDependentCases: function(iChange) {
        if (iChange.changes) {
          iChange.changes.forEach(function(iChange) {
            var collection = iChange.collection,
                collectionID = collection && collection.get('id'),
                invalidCases = iChange.cases && iChange.cases.length
                                  ? iChange.cases : undefined,
                adapter = this.findAdapterForCollection(collectionID);
            if (adapter) {
              adapter.markCasesChanged(invalidCases);
            }
          }.bind(this));
        }
      },
      doCreateAttributes: function (iChange) {
        this.attributesDidChange( iChange);
      },
      doDeleteAttributes: function (iChange) {
        this.attributesDidChange( iChange);
      },
      doMoveAttributes: function (iChange) {
        this.attributesDidChange( iChange);
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
        // DG.log('Select Cases(' + iChange.operation + '): ' + (iChange.cases && iChange.cases.map(function(iCase) {
        //   return iCase.id;
        // }).join()));
        var scrollToCase = (iChange.operation === 'selectCases') && iChange.cases && iChange.cases[0];
        this.invokeOnceLater(function () {
          if( hierTableView) {
            hierTableView.updateSelectedRows();
            hierTableView.scrollSelectionToView(scrollToCase);
          }
        });
      },

      /**
        Called when the data context notifies that case values have changed.
        @param iChange {Object}  An object describing the nature of the change
       */
      doChangeCaseValues: function( iChange) {
        var adapters = {};
        this.get('caseTableAdapters')
            .forEach(function(iAdapter) {
              var collectionID = iAdapter.getPath('collection.id');
              adapters[collectionID] = { adapter: iAdapter, cases: [] };
            });

        function identifyCasesChanged(iCases) {
          if (iCases) {
            iCases.forEach(function(iCase) {
              var collectionID = iCase.getPath('collection.id'),
                  adapter = adapters[collectionID];
              if (adapter) {
                adapter.cases.push(iCase);
                identifyCasesChanged(iCase.get('children'));
              }
            });
          }
        }

        // recursively identify all affected cases
        identifyCasesChanged(iChange.cases);

        DG.ObjectMap.forEach(adapters, function(id, iAdapter) {
          if (iAdapter.cases.length > 0)
            iAdapter.adapter.markCasesChanged(iAdapter.cases);
        });
        this.getPath('view.contentView').refresh();
      },

      /**
        Called when the data context notifies that attribute properties have changed.
        @param  iChange {Object}  An object describing the nature of the change
       */
      doUpdateAttributes: function( iChange) {
        var hierTableView = this.getPath('view.contentView'),
            adapters = this.get('caseTableAdapters'),
            updatedAdapters = [],
            attributes = (iChange && iChange.result && iChange.result.attrs) ||
                this.dataContext.getAttributes();

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
                var columns;
                if( updatedAdapters.indexOf( tableAdapter) >= 0) {
                  columns = tableAdapter.get('gridColumns').filter(function (column) {
                    return !column.attribute || !column.attribute.hidden;
                  });
                  iCaseTableView.setColumns( columns);
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
      attributesDidChange: function() {
        var hierTableView = this.getPath('view.contentView');
        if( hierTableView) {
          hierTableView.updateColumnInfo();
          hierTableView.updateRowCount();
          hierTableView.updateSelectedRows();
        }
      },

      modelDidChange: function() {
      }.observes('model'),

      /**
       * We do not close case tables and case cards. We hide and show them.
       */
      toggleViewVisibility: function() {
        var tCaseTableView = this.get('view'),
            tOperation = tCaseTableView.get('isVisible') ? 'delete' : 'add',
            tViewName = 'caseTableView';
        DG.UndoHistory.execute(DG.Command.create({
          name: 'component.toggle.delete',
          undoString: 'DG.Undo.toggleComponent.' + tOperation + '.' + tViewName,
          redoString: 'DG.Redo.toggleComponent.' + tOperation + '.' + tViewName,
          log: 'Toggle component: %@'.fmt('caseTable'),
          execute: function () {
            var isVisible = tCaseTableView.toggleProperty('isVisible'),
                layout = tCaseTableView.get('layout'),
                operation = isVisible ? 'create' : 'delete';
            tCaseTableView.set('savedLayout', layout);
            if( !isVisible && tCaseTableView.parentView && tCaseTableView.parentView.select)
              tCaseTableView.parentView.select(null);
            DG.currDocumentController().notificationManager.sendNotification({
              action: 'notify',
              resource: 'component',
              values: {
                operation: operation,
                type: tCaseTableView.getPath('model.type'),
                id: tCaseTableView.getPath('model.id'),
                title: tCaseTableView.getPath('model.title')
              }
            });
          },
          undo: function () {
            this.execute();
          },
          redo: function () {
            this.execute();
          }
        }));
      },

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

      /**
        Handler for sendAction('newAttributeAction')
       */
      newAttributeAction: function(iSender, iContext) {
        this.newAttribute(iContext);
        return YES;
      },

      /**
       * Creates a new attribute and begins to edit the attribute name in place.
       */
      newAttribute: function(properties) {
        var dataContext = this.get('dataContext'),
            collection = properties.collection,
            collectionID = collection && collection.get('id'),
            hierTableView = this.getPath('view.contentView'),
            caseTableView = hierTableView && hierTableView.getChildTableViewForCollection(collectionID);

        DG.DataContextUtilities.newAttribute( dataContext, collection, null,
            caseTableView, properties.autoEditName);

    },

      /**
       * Method to create a new attribute with formula.
       * NOTE: this method will also replace the formula of an existing attribute of the same name (case sensitive)
       * @param iProperties --properties to pass on to the applyNewAttribute() method.
       * @param iDefaultAttrName {string} --(optional) default attribute name for the new attribute dialog
       * @param iDefaultAttrFormula {string} --(optional) default attribute formula string for the new attribute dialog
       */
      editAttributeProperties: function( iProperties, iDefaultAttrName, iDefaultAttrFormula ) {
        var tDataContext = this.get('dataContext'),
            defaultAttrName = iDefaultAttrName || '',
            defaultAttrFormula = iDefaultAttrFormula || '',
            result = DG.AttributeFormulaView.buildOperandsMenuAndCompletionData(tDataContext);

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
              formulaCompletions: result.completionData,
              formulaOperands: result.operandsMenu,
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
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'edit formula',
                type: 'DG.CaseTable'
              }
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
              var tChange, tResult, action; // eslint-disable-line no-unused-vars
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
                            attrPropsArray: [{ name: tAttributeName, formula: tAttrFormula }],
                            isUndo: true
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

      editName: function(iAttrID, iMenuItem) {
        var tDataContext = this.get('dataContext'),
            tAttrRef = tDataContext && tDataContext.getAttrRefByID( iAttrID),
            tAttr = tAttrRef && tAttrRef.attribute,
            collection = tAttrRef && tAttrRef.collection,
            collectionID = collection && collection.get('id'),
            hierTableView = this.getPath('view.contentView'),
            caseTableView = hierTableView && hierTableView.getChildTableViewForCollection(collectionID);


        if( !DG.assert( tAttr, "editName() is missing the attribute reference"))
          return;

        caseTableView.beginEditAttributeName(tAttr.get('name'));
      },
      resizeColumn: function (iAttrID, iMenuItem) {
        var _this = this,
            tDataContext = this.get('dataContext'),
            tAttrRef = tDataContext && tDataContext.getAttrRefByID( iAttrID),
            tAttr = tAttrRef && tAttrRef.attribute,
            collection = tAttrRef && tAttrRef.collection,
            collectionID = collection && collection.get('id'),
            adapter = collectionID && this.findAdapterForCollection(collectionID),
            lastWidth;
        if (adapter) {
          lastWidth = adapter.getPreferredColumnWidth(iAttrID);
          DG.UndoHistory.execute(DG.Command.create({
            name: 'caseTable.resizeColumn',
            undoString: 'DG.Undo.caseTable.resizeColumn',
            redoString: 'DG.Undo.caseTable.resizeColumn',
            log: 'Fit Column Width: {collection: %@, attribute: %@}'
                .fmt(collection.get('name'), tAttr.get('name')),
            executeNotification: {
              action: 'notify',
              resource: 'component',
              values: {
                operation: 'resize column',
                type: 'DG.CaseTable'
              }
            },
            execute: function() {
              adapter.autoResizeColumn(tAttr);
              _this.attributesDidChange();
            },
            undo: function() {
              adapter.model.setPreferredAttributeWidth(iAttrID, lastWidth);
              _this.attributesDidChange();
            }
          }));
        } else {
          DG.logWarn('Could not find adapter for attr: ' + iAttrID);
        }
      },
      /**
       * Edit an attribute's properties. Brings up the Edit Attribute dialog.
       *
       */
      editAttribute: function( iAttrID, iMenuItem) {
        var tDataContext = this.get('dataContext'),
            tAttrRef = tDataContext && tDataContext.getAttrRefByID( iAttrID);

        if( !DG.assert( tAttrRef, "editAttribute() is missing the attribute reference"))
          return;

        this.showEditAttributePane(tAttrRef, iMenuItem);
      },

      /**
       * Updates an attribute undo-ably based on attribute properties.
       *
       * This method is called from the attribute editing dialog.
       *
       * @param iAttrRef {{collection:  {DG.CollectionClient}
   *                       attribute:   {DG.Attribute}
   *                       position:    {number}}}
       * @param iChangedAttrProps {object}
       */
      updateAttribute: function(iAttrRef, iChangedAttrProps) {
        DG.DataContextUtilities.updateAttribute( this.get('dataContext'), iAttrRef && iAttrRef.collection,
            iAttrRef.attribute, iChangedAttrProps);
      },

      showEditAttributePane: function (iAttrRef, menuItem) {
        var attributePane = DG.AttributeEditorView.create({attrRef: iAttrRef, attrUpdater: this});
        attributePane.append();
      },

      /**
       * Sort by an attribute.
       *
       * If the attribute is in a child collection, the sorting should _not_
       * affect the order of the parent collection. In other words, the sorting
       * is among the children of the same parent.
       * @param attrID {string|number}
       * @param isDescending {boolean}
       */
      sortAttribute: function(attrID, isDescending) {
        var dataContext = this.get('dataContext'),
            dataSet = dataContext && dataContext.getPath('model.dataSet'),
            childCollection = dataContext && dataContext.get('childCollection'),
            childCollectionID = childCollection && childCollection.get('id'),
            compareFunc = isDescending
                            ? DG.DataUtilities.compareDescending
                            : DG.DataUtilities.compareAscending,
            attribute = DG.Attribute.getAttributeByID(attrID),
            isNumeric = attribute.get('type') === 'numeric',
            collection = attribute && attribute.get('collection'),
            collectionID = collection && collection.get('id'),
            parentCollection = collection.get('parent'),
            hierTableView = this.getPath('view.contentView'),
            oldClientMap, newClientMap;

        function accessFunc(itemID, attrID) {
          var tCase = DG.Case.findCase(childCollectionID, itemID);

          while (tCase && (tCase.getPath('collection.id') !== collectionID))
            tCase = tCase.get('parent');

          return tCase;
        }

        function getValue(iCase, attrID) {
          var rawValue = iCase && iCase.getRawValue(attrID);
          var numValue = iCase && (isNumeric? iCase.getForcedNumericValue(attrID): null);
          return iCase && (SC.empty(numValue)? rawValue: numValue);
        }

        function makeCompare(attrID, isDescending, parentCollection) {
          var compareIndex = function (a,b) {return a-b;};
          if (parentCollection) {
            return function (caseA, caseB) {
              var caseAParentIndex = caseA && parentCollection.caseIDToIndexMap[caseA.getPath(
                  'parent.id')];
              var caseBParentIndex = caseB && parentCollection.caseIDToIndexMap[caseB.getPath(
                  'parent.id')];
              if (caseAParentIndex !== caseBParentIndex) {
                return compareIndex(caseAParentIndex, caseBParentIndex);
              } else {
                return compareFunc(getValue(caseA, attrID), getValue(caseB, attrID));
              }
            };
          }
          else {
            return function (caseA, caseB) {
              return compareFunc(getValue(caseA, attrID), getValue(caseB, attrID));
            };
          }
        }

        function refreshTable() {
          dataContext.regenerateCollectionCases(null, 'moveCases');
          if (hierTableView)
            hierTableView.updateRowData();
        }

        if (dataSet) {
          DG.UndoHistory.execute(DG.Command.create({
            name: 'caseTable.sortCases',
            undoString: 'DG.Undo.caseTable.sortCases',
            redoString: 'DG.Redo.caseTable.sortCases',
            log: "sort cases by attribute: %@ (\"%@\")".fmt(attrID, attribute && attribute.get('name')),
            execute: function() {
              oldClientMap = dataSet.sortItems(attrID, accessFunc, makeCompare(attrID, isDescending, parentCollection));
              newClientMap = dataSet.getClientIndexMapCopy();
              refreshTable();
            },
            undo: function() {
              dataSet.setClientIndexMap(oldClientMap);
              refreshTable();
            },
            redo: function() {
              dataSet.setClientIndexMap(newClientMap);
              refreshTable();
            }
          }));
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
            tAttrFormula = tRef.attribute.get('formula');

        DG.assert( tRef && tAttrName, "editAttributeFormula() is missing the attribute reference or attribute name" );
        // for now we use the newAttribute() method which will replace one attribute formula with another
        // if the new attribute has the same name as the old.

        this.editAttributeProperties({ collection: tRef.collection }, tAttrName, tAttrFormula || '' );
      },

      /**
       * Converts the formula output to raw values.
       * @param iAttrID
       */
      deleteFormulaKeepValues: function (iAttrID ) {
        var callback = this.getPath('view.contentView').updateColumnInfo.bind(this);
        DG.DataContextUtilities.deleteAttributeFormula(this.get('dataContext'), iAttrID, callback);
      },

      /**
       * If a formula has been deleted recently, restore it from the attribute property.
       * @param iAttrID
       */
      recoverDeletedFormula: function (iAttrID) {
        var callback = this.getPath('view.contentView').updateColumnInfo.bind(this);
        DG.DataContextUtilities.recoverAttributeFormula(this.get('dataContext'), iAttrID, callback);
      },

      createNewAttributesButtons: function() {
        var tDataContext = this.get('dataContext'),
            collectionRecords = tDataContext.get('collections') || [],
            tNewAttrMenuItemStringKey = 'DG.Inspector.newAttribute',
            tItems = [];
        collectionRecords.forEach(function (collection) {
          var adapter = this.findAdapterForCollection(collection.id),
              isEnabled = adapter && adapter.get('isCollectionReorgAllowed');
          tItems.push({
            title: tNewAttrMenuItemStringKey.loc( collection.name),
            target: this,
            args: [{collection: tDataContext.getCollectionByName(collection.name),
              autoEditName: true }],
            dgAction: 'newAttribute',
            isEnabled: isEnabled
          });
        }.bind(this));
        return tItems;
      },

      showAttributesPopup: function() {
        var tItems = this.createNewAttributesButtons();
        tItems.push(this.createRandomizeButton());
        tItems.push(this.createExportCaseButton());
        tItems.push(this.createCopyToClipboardButton());
        tItems.push(this.createGetFromClipboardButton());

        DG.MenuPane.create({
          classNames: 'dg-attributes-popup'.w(),
          layout: {width: 200, height: 150},
          items: tItems
        }).popup(this.get('inspectorButtons')[1]);
      },

      resizeColumns: function () {
        var dataContext = this.dataContext;
        var caseTableModel = this.getPath('model.content');
        var adapters = this.get('caseTableAdapters');
        var columnWidths = dataContext.getAttributes().map(function (attr) {
          var id =  attr && attr.id;
          return {id: id, width: caseTableModel.getPreferredAttributeWidth(id)};
        }.bind(this));
        // var componentWidth = this.contentView.get('frame').width;
        DG.UndoHistory.execute(DG.Command.create({
          name: 'caseTable.resizeColumns',
          undoString: 'DG.Undo.caseTable.resizeColumns',
          redoString: 'DG.Redo.caseTable.resizeColumns',
          log: "resizeColumns: { dataContext: % }".fmt(dataContext),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'resize columns',
              type: 'DG.CaseTable'
            }
          },
          execute: function () {
            adapters.forEach( function (adapter) {
              adapter.autoResizeAllColumns();
            });
            this.attributesDidChange();
          }.bind(this),
          undo: function () {
            columnWidths.forEach(function (oldWidth) {
              if (oldWidth) {
                caseTableModel.setPreferredAttributeWidth(oldWidth.id, oldWidth.width);
              }
            }.bind(this));
            this.attributesDidChange();
          }.bind(this)
        }));
      },
      /**
       *
       * @returns {Array}
       */
      createInspectorButtons: function() {
        var tButtons = sc_super();
        tButtons.push(this.createInfoButton());
        // rescale item
        tButtons.push(DG.IconButton.create({
          layout: {width: 32, left: 0, height: 25},
          classNames: 'display-rescale'.w(),
          iconClass: 'moonicon-icon-scaleData',
          iconExtent: {width: 30, height: 25},
          target: this,
          action: 'resizeColumns',
          toolTip: 'DG.Inspector.resize.toolTip',  // "Rescale graph axes to encompass data"
          localize: true
        }));

        tButtons.push(this.createTrashButton());
        tButtons.push(this.createHideShowButton());
        tButtons.push(this.createRulerButton());

        return tButtons;
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
        this.resetProtoCaseRows();
        DG.UndoHistory.execute(DG.DataContextUtilities.createCollectionCommand(dropData.attribute,
            dropData.collection, context));
        this.setPath('contentView.leftDropTarget.dropData', null);
      }.observes('contentView.leftDropTarget.dropData')
    };
  }()) // function closure
);
