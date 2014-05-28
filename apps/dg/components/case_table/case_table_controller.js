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
       *  The table will reflect the contents of the currently selected game context
       *  unless we are in a restored document, in which case it will reflect the
       *  contents of the restored data context.
       *  @property {DG.DataContext} or derived class
       */
      _currentGameContext: null,
      _currentGameContextBinding: SC.Binding.oneWay('DG.gameSelectionController.currentContext'),
      
      /**
        Observer function called when the currently selected game context changes.
       */
      currentGameContextDidChange: function( iNotifier, iKey) {
        if( !this.restoredDataContext) {
          this.notifyPropertyChange('dataContext');
        }
        // 'gameIsReady' affects our labels, which affects our group headers
        else if( iKey === 'gameIsReady') {
          var hierTableView = this.getPath('view.contentView');
          if( hierTableView)
            hierTableView.refresh();
        }
      }.observes('_currentGameContext','DG.currGameController.gameIsReady'),
      
      /**
        The restored data context for tables restored from documents.
        The table will reflect the contents of the restored data context if there is one.
        Otherwise, it will reflect the contents of the current game context.
        @property   {DG.DataContext} or derived class
       */
      restoredDataContext: null,
      
      /**
        The table will reflect the contents of the restored data context if there is one.
        Otherwise, it will reflect the contents of the current game context.
        Will notify when 'restoredDataContext' changes.
        @property   {DG.DataContext} or derived class
       */
      dataContext: function() {
        return this.get('restoredDataContext') || this.get('_currentGameContext');
      }.property('restoredDataContext'),
      
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
        
        if( this.get('dataContext'))
          this.dataContextDidChange();
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
            collectionRecords = this.getPath('dataContext.collections') || [],
            prevAdapters = this.caseTableAdapters,
            newAdapters = [];
        
        this.caseTableAdapters = newAdapters;
        
        // Utility function for identifying existing adapters for the specified collection
        function findAdapterForCollection( iCollectionID) {
          var i, count = prevAdapters.length;
          for( i = 0; i < count; ++i) {
            if( prevAdapters[i] && (prevAdapters[i].getPath('collection.id') === iCollectionID))
              return prevAdapters[i];
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
            adapter = DG.CaseTableAdapter.create({ dataContext: dataContext,
                                                    collection: collection });

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
          childCollection.casesController.addObserver('[]', this, 'caseCountDidChange');
          dataContext.forEachCollection( function( iCollection) {
                                          iCollection.attrsController.
                                            addObserver('[]', this_, 'attributeCountDidChange');
                                         });
        }
      }.observes('dataContext'),
      
      createComponentStorage: function() {
        var storage = {},
            dataContext = this.get('dataContext');
        if( dataContext)
          this.addLink( storage, 'context', dataContext);
        return storage;
      },
      
      restoreComponentStorage: function( iStorage, iDocumentID) {
        var contextID = this.getLinkID( iStorage, 'context'),
            dataContext = contextID && DG.DataContext.retrieveContextFromMap( iDocumentID, contextID);
        if( dataContext)
          this.set('restoredDataContext', dataContext);
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
            // fallthrough intentional
            /* jshint -W086 */  // Expected a 'break' statement before 'case'. (W086)
          case 'selectCases':
            this.doSelectCases( iChange);
            // selection changes don't require aggregate invalidation
            if( operation === 'selectCases')
              invalidateAggregates = false;
            break;
          case 'createAttributes':
          case 'deleteAttributes':
            this.attributeCountDidChange( iChange);
            break;
          case 'updateAttributes':
            this.doUpdateAttributes( iChange);
            break;
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
      
      /**
        Called when the data context notifies that the set of selected cases has changed.
        @param  {Object}  An object describing the nature of the change
       */
      doSelectCases: function( iChange) {
        var hierTableView = this.getPath('view.contentView');
        if( hierTableView)
          hierTableView.updateSelectedRows();
      },
      
      /**
        Called when the data context notifies that case values have changed.
        @param  {Object}  An object describing the nature of the change
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
        @param  {Object}  An object describing the nature of the change
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
        var hierTableView = this.getPath('view.contentView');
        if( hierTableView)
          hierTableView.updateRowCount();
      },
      
      /**
        Called when the array observer indicates that the number of attributes has changed.
       */
      attributeCountDidChange: function() {
        var hierTableView = this.getPath('view.contentView');
        if( hierTableView)
          hierTableView.updateColumnInfo();
      },
      
      gearMenuItems: function() {
        var tDataContext = this.get('dataContext'),
            tChildCollection = tDataContext && tDataContext.get('childCollection'),
            tChildCollectionName = tChildCollection && tChildCollection.get('name'),
            tParentCollection = tDataContext && tDataContext.get('parentCollection'),
            tParentCollectionName = tParentCollection && tParentCollection.get('name'),
            tSelection = tDataContext && tDataContext.getSelectedCases(),
            tDeleteIsEnabled = tSelection && tSelection.get('length'),
            tNewAttrMenuItemStringKey = 'DG.TableController.gearMenuItems.newAttribute',
            tItems = [];
        if( !SC.empty( tChildCollectionName)) {
          tItems.push({ title: tNewAttrMenuItemStringKey.loc( tChildCollectionName),
                        target: this, itemAction: this.newChildAttribute });
        }
        if( !SC.empty( tParentCollectionName)) {
          tItems.push({ title: tNewAttrMenuItemStringKey.loc( tParentCollectionName),
                        target: this, itemAction: this.newParentAttribute });
        }
        tItems.push({ title: 'DG.TableController.gearMenuItems.deleteCases', localize: true,
                      target: this, itemAction: this.deleteSelectedCases, isEnabled: tDeleteIsEnabled });
        return tItems;
      }.property(),
      
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

      /**
        Deletes the currently selected cases from their collections.
       */
      deleteSelectedCases: function() {
        var tContext = this.get('dataContext'),
            tChange = {
              operation: 'deleteCases',
              cases: tContext.getSelectedCases()
            };
        tContext.applyChange( tChange);
      },

      // The following two functions pass the name of the DG.GameSpec property which specifies
      // the collection to operate on to the newAttribute() method, which will pass it on to
      // the new attribute dialog, which will hang on to it until we reference it in the
      // applyNewAttribute() method.
      newChildAttribute: function() {
        var tDataContext = this.get('dataContext'),
            tChildCollection = tDataContext && tDataContext.get('childCollection');
        this.newAttribute({ collection: tChildCollection });
      },
      newParentAttribute: function() {
        var tDataContext = this.get('dataContext'),
            tParentCollection = tDataContext && tDataContext.get('parentCollection');
        this.newAttribute({ collection: tParentCollection });
      },

      /**
       * Method to create a new attribute with formula.
       * NOTE: this method will also replace the formula of an existing attribute of the same name (case sensitive)
       * @param iProperties --properties to pass on to the applyNewAttribute() method.
       * @param iDefaultAttrName {string} --(optional) default attribute name for the new attribute dialog
       * @param iDefaultAttrFormula {string} --(optional) default attribute formula string for the new attribute dialog
       */
      newAttribute: function( iProperties, iDefaultAttrName, iDefaultAttrFormula ) {
        var tParentCollection = this.getPath('dataContext.parentCollection'),
            tParentAttrNames = tParentCollection && tParentCollection.collection.getAttributeNames(),
            tChildCollection = this.getPath('dataContext.childCollection'),
            tChildAttrNames = tChildCollection && tChildCollection.collection.getAttributeNames(),
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
        
        appendArrayOfNamesToMenu( tParentAttrNames);
        appendArrayOfNamesToMenu( tChildAttrNames);
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
            tAttributeName = this.newAttributeDialog.get('attributeName');
        // Should also test for attribute name validity as well
        if( !SC.empty( tAttributeName)) {
          // Retrieve the name of the target collection that was passed by the client originally.
          var tCollection = this.newAttributeDialog.get('collection'),
              tFormula = this.newAttributeDialog.get('formula'),
              tChange = {
                          operation: 'createAttributes',
                          collection: tCollection,
                          attrPropsArray: [{ name: tAttributeName, formula: tFormula }]
                        },
              tResult = tContext && tContext.applyChange( tChange);
          if( tResult.success) {
            DG.logUser("attributeCreate: { name: '%@', collection: '%@', formula: '%@' }",
                        tAttributeName, tCollection.get('name'), tFormula);
          }
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
            tCollectionRecord = tAttrRef && tAttrRef.collection,
            tCollectionClient = tDataContext && tAttrRef &&
                                tDataContext.getCollectionForAttribute( tAttrRef.attribute),
            tAttrName = tAttrRef && tAttrRef.attribute.get('name'),
            tDialog;
        if( !DG.assert( tAttrRef, "renameAttribute() is missing the attribute reference"))
          return;
        
        function doRenameAttribute( iAttrID, iAttrName) {
          var change = {
                          operation: 'updateAttributes',
                          collection: tCollectionRecord,
                          attrPropsArray: [{ id: iAttrID, name: iAttrName }]
                        };
          tDataContext.applyChange( change);
        }
        
        function handleRenameAttributeOK() {
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
            doRenameAttribute( iAttrID, newAttrName);
          }
          else if( tExistingAttr) {
            DG.AlertPane.info({
              message: 'DG.TableController.renameAttributeDuplicateMsg',
              description: 'DG.TableController.renameAttributeDuplicateDesc',
              localize: true
            });
          }
          else if( !newAttrName) {
            DG.AlertPane.info({
              message: 'DG.TableController.renameAttributeInvalidMsg',
              description: 'DG.TableController.renameAttributeInvalidDesc',
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
            tCollectionRecord = tAttrRef && tAttrRef.collection,
            tAttrName = tAttrRef && tAttrRef.attribute.get('name');
      
        function doDeleteAttribute() {
          var change = {
                          operation: 'deleteAttributes',
                          collection: tCollectionRecord,
                          attrs: [{ id: iAttrID, attribute: tAttrRef.attribute }]
                        };
          tDataContext.applyChange( change);
        }
      
        DG.AlertPane.warn({
          message: 'DG.TableController.deleteAttribute.confirmMessage'.loc( tAttrName),
          description: 'DG.TableController.deleteAttribute.confirmDescription'.loc(),
          buttons: [
            { title: 'DG.TableController.deleteAttribute.okButtonTitle',
              action: doDeleteAttribute,
              localize: YES
            },
            { title: 'DG.TableController.deleteAttribute.cancelButtonTitle',
              localize: YES
            }
          ],
          localize: false
        });
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
      }

    };
  }()) // function closure
);

