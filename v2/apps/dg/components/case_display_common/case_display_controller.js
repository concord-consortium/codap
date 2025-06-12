// ==========================================================================
//  
//  Author:   jsandoe
//
//  Copyright (c) 2019 by The Concord Consortium, Inc. All rights reserved.
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
sc_require('utilities/clipboard_utilities');
DG.CaseDisplayController = DG.ComponentController.extend(
  /** @scope DG.CaseDisplayController.prototype */
  (function() {
    return {
      /**
       The table will reflect the contents of this data context.
       @property   {DG.DataContext} or derived class
       */
      dataContext: null,

      /**
       Initialization function.
       */
      init: function () {
        sc_super();
      },

      /**
       * Destruction function.
       */
      destroy: function () {
        sc_super();
      },

      willDestroy: function () {
        sc_super();
      },

      /**
       * Responds to a notification that this component's data context was deleted.
       * We need to remove ourself, too.
       */
      dataContextWasDeleted: function () {
        var tComponentView = this.get('view'),
            tContainerView = tComponentView.get('parentView');
        this.willCloseComponent();
        this.willSaveComponent();
        tContainerView.removeComponentView( tComponentView);
      },

      /**
       * Hides or shows component.
       */
      toggleViewVisibility: function() {
        // to be overridden in subclass
      },

      /**
       * Creates a serializable object sufficient to restore state of component
       *
       * @return {Object}
       */
      createComponentStorage: function () {
        // to be overridden in subclass
      },

      /**
       * Restores the state of the component from the serializable object
       * created in createComponentStorage.
       *
       * @param iComponentStorage {Object}
       * @param iDocumentID {String}
       */
      restoreComponentStorage: function (iComponentStorage, iDocumentID) {
        // subclasses override
      },

      /**
       * Creates the items in the inspector menu.
       * This is a vertical menu.
       * When active it can be found on the side of a selected Component.
       *
       * @returns {[DG.Button]}
       */
      createInspectorButtons: function() {
        var buttons = sc_super();
        return buttons;
      },

      createTrashButton: function () {
        return DG.IconButton.create({
              layout: {width: 32},
              classNames: 'dg-table-trash'.w(),
              iconClass: 'moonicon-icon-trash',
              showBlip: true,
              target: this,
              action: 'showDeletePopup',
              toolTip: 'DG.Inspector.delete.toolTip',
              localize: true
            });
      },

      createInfoButton: function () {
        return DG.IconButton.create({
          layout: {width: 32},
          classNames: 'dg-display-dataset-info'.w(),
          iconClass: 'moonicon-icon-info',
          showBlip: true,
          target: this,
          action: 'showInfoPopup',
          toolTip: 'DG.Inspector.datasetInfo.toolTip',  // "Show information about dataset"
          localize: true
        });
      },

      createHideShowButton: function () {
        return DG.IconButton.create({
          layout: {width: 32},
          classNames: 'dg-display-hideshow'.w(),
          iconClass: 'moonicon-icon-hideShow',
          showBlip: true,
          target: this,
          action: 'showHideShowPopup',
          toolTip: 'DG.Inspector.hideShow.toolTip',  // "Show all cases or hide selected/unselected cases"
          localize: true
        });
      },

      createRulerButton: function () {
        // ruler
        return DG.IconButton.create({
              layout: {width: 32},
              classNames: 'dg-table-attributes'.w(),
              iconClass: 'moonicon-icon-values',
              showBlip: true,
              target: this,
              action: 'showAttributesPopup',
              toolTip: 'DG.Inspector.attributes.toolTip',
              localize: true
            });
      },

      createExportCaseButton: function () {
        return {
          title: 'DG.Inspector.exportCaseData', // "Export Case Data..."
          localize: true,
          target: this,
          dgAction: 'exportCaseData'
        };
      },

      createCopyToClipboardButton: function () {
        return {
          title: 'DG.Inspector.copyCaseDataToClipboard', // "Copy Case Data..."
          localize: true,
          isEnabled: DG.ClipboardUtilities.canCopy(),
          target: this,
          dgAction: 'exportCaseDataToClipboard'
        };
      },

      createGetFromClipboardButton: function () {
        return {
          title: 'DG.Inspector.getCaseDataFromClipboard', // "Import Case Data..."
          localize: true,
          isEnabled: DG.ClipboardUtilities.canPaste(),
          target: this,
          dgAction: 'importCaseDataFromClipboard'
        };
      },

      createRandomizeButton: function () {
        var tDataContext = this.get('dataContext');
        return {
          title: 'DG.Inspector.randomizeAllAttributes', // "Randomize Attributes"
          localize: true,
          target: this,
          dgAction: 'randomizeAllAttributes',
          isEnabled: !!(function() {
            var depMgr = tDataContext && tDataContext.get('dependencyMgr'),
                randomNode = depMgr && depMgr.findNode({ type: DG.DEP_TYPE_SPECIAL,
                  id: 'random' }),
                dependents = randomNode && depMgr.findDependentsOfNodes([randomNode]);
            // enabled if any attributes are dependents
            return dependents && dependents.some(function(iDependent) {
              return iDependent.type === DG.DEP_TYPE_ATTRIBUTE;
            });
          }.bind(this))()
        };
      },

      showAttributesPopup: function () {
        // implemented in subclasses
      },

      /**
       * Creates and renders a menu of delete-related actions.
       * Menu is common to the CaseTable and CaseCard components.
       * The menu is instantiated from the Inspector.
       */
      showDeletePopup: function() {
        function deletableCounts(dataContext, cases) {
          var count = cases ? cases.length : 0,
              deletable = cases && cases.map(function(aCase) {
                return DG.DataContextUtilities.isCaseEditable(dataContext, aCase);
              }),
              deletableCount = deletable
                                ? deletable.reduce(function(total, isDeletable) {
                                    return isDeletable ? ++total : total;
                                  }, 0)
                                : 0;
          return { count: count, deletable: deletableCount };
        }
        var tDataContext = this.get('dataContext'),
            tCases = tDataContext && tDataContext.getSelectedCases(true),
            tSelectedCounts = deletableCounts(tDataContext, tCases.selected),
            tUnselectedCounts = deletableCounts(tDataContext, tCases.unselected),
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
                isEnabled: tSelectedCounts.deletable > 0
              },
              {
                title: 'DG.Inspector.selection.deleteUnselectedCases',
                localize: true,
                target: this,
                action: 'deleteUnselectedCases',
                isEnabled: tUnselectedCounts.deletable > 0
              },
              {
                title: 'DG.Inspector.deleteAll',
                localize: true,
                target: this,
                action: 'deleteAllCases',
                isEnabled: tSelectedCounts.deletable + tUnselectedCounts.deletable > 0
              }
            ],
            tMenu = DG.MenuPane.create({
              classNames: 'dg-delete-popup'.w(),
              layout: {width: 200, height: 150},
              items: tItems
            });
        tMenu.popup(this.get('inspectorButtons')[0]);
      },

      showInfoPopup: function () {
        var attributePane = DG.DatasetMetadataView.create({dataContext: this.dataContext});
        attributePane.append();
      },

      /**
       * Creates and renders a menu of hide/show-related actions.
       * Menu is common to the CaseTable and CaseCard components.
       * The menu is instantiated from the Inspector.
       */
      showHideShowPopup: function () {
        var tDataContext = this.get('dataContext'),
            tSelection = tDataContext && tDataContext.getSelectedCases(),
            tSelectedIsEnabled = tSelection && tSelection.get('length') > 0,
            tCaseCount = tDataContext.get('totalCaseCount'),
            tSetAsideCount = tDataContext.get('setAsideCount'),
            tUnselectedIsEnabled = (tCaseCount > 0) &&
                (!tSelection || tSelection.get('length') < tCaseCount),
            tHiddenAttributeCount = tDataContext.getHiddenAttributes().length,
            tHiddenAttributePrompt = tHiddenAttributeCount === 0 ?
              'DG.Inspector.attributes.showAllHiddenAttributesDisabled' :
                (tHiddenAttributeCount === 1 ? 'DG.Inspector.attributes.showAllHiddenAttributesSing' :
                     'DG.Inspector.attributes.showAllHiddenAttributesPlural'),
            tItems = [
              {
                title: 'DG.Inspector.setaside.setAsideSelectedCases',
                localize: true,
                target: this,
                action: 'setAsideSelectedCases',
                isEnabled: tSelectedIsEnabled
              },
              {
                title: 'DG.Inspector.setaside.setAsideUnselectedCases',
                localize: true,
                target: this,
                action: 'setAsideUnselectedCases',
                isEnabled: tUnselectedIsEnabled
              },
              {
                title: 'DG.Inspector.setaside.restoreSetAsideCases'.loc(tSetAsideCount),
                localize: false,
                target: this,
                action: 'restoreSetAsideCases',
                isEnabled: (tSetAsideCount > 0)
              },
              {
                title: tHiddenAttributePrompt.loc(tHiddenAttributeCount),
                localize: false,
                target: this,
                action: 'showAllHiddenAttributes',
                isEnabled: (tHiddenAttributeCount > 0)
              }
            ],
            tMenu = DG.MenuPane.create({
              classNames: 'dg-hideshow-popup'.w(),
              layout: {width: 200, height: 150},
              items: tItems
            });
        tMenu.popup(this.get('inspectorButtons')[0]);
      },

      /**
       * Selects all cases in this object's dataset.
       */
      selectAll: function () {
        var tContext = this.get('dataContext'),
            tCollection = tContext && tContext.getCollectionAtIndex(0),
            tChange;
        if (tCollection) {
          tChange = {
            operation: 'selectCases',
            collection: tCollection,
            cases: null,// null selects all
            select: true
          };
        }
        tContext.applyChange( tChange);
      },

      /**
       * Deletes the currently selected cases from their collections.
       */
      deleteSelectedCases: function () {
        this._deleteOrSetAsideSelectedCases(false);
      },

      /**
       * Sets aside the currently selected cases from their collections.
       */
      setAsideSelectedCases: function () {
        this._deleteOrSetAsideSelectedCases(true);
      },

      _deleteOrSetAsideSelectedCases: function(iSetAside) {
        var tContext = this.get('dataContext'),
            tCases = tContext.getSelectedCases(),
            tDeletable = tCases.filter(function(aCase) {
                          return DG.DataContextUtilities.isCaseEditable(tContext, aCase);
                        }),
            tChange;
        if (tContext && tDeletable.length) {
          // We deselect the cases before deleting them for performance
          // reasons. Deleting selected cases is much less efficient because
          // of list reconstruction.
          tChange = {
            operation: 'selectCases',
            select: false,
            cases: tDeletable
          };
          tContext.applyChange( tChange);
          tChange = {
            operation: 'deleteCases',
            setAside: iSetAside,
            cases: tDeletable
          };
          tContext.applyChange( tChange);
        }
      },

      /**
       * Deletes the currently unselected cases.
       */
      deleteUnselectedCases: function () {
        this._deleteOrSetAsideUnselectedCases(false);
      },

      /**
       * Sets aside the currently unselected cases.
       */
      setAsideUnselectedCases: function () {
        this._deleteOrSetAsideUnselectedCases(true);
      },

      _deleteOrSetAsideUnselectedCases: function(iSetAside) {
        var tContext = this.get('dataContext'),
            tCases = tContext.getSelectedCases(true),
            tDeletable = tCases.unselected
                          .filter(function(aCase) {
                            return DG.DataContextUtilities.isCaseEditable(tContext, aCase);
                          });
        if (tCases.unselected.length) {
          tContext.applyChange({
            operation: 'deleteCases',
            setAside: iSetAside,
            cases: tDeletable
          });
        }
      },

      /**
       * Delete all cases represented by the case table.
       * Passes the request on to the data context to do the heavy lifting.
       */
      deleteAllCases: function(){
        var tContext = this.get('dataContext'),
            tAllCases = tContext.get('allCases'),
            tDeletable = tAllCases.filter(function(aCase) {
                          return DG.DataContextUtilities.isCaseEditable(tContext, aCase);
                        });
        if (tDeletable.length) {
          var tChange = {
            operation: 'deleteCases',
            cases: tDeletable
          };
          tContext.applyChange( tChange);
        }
      },

      restoreSetAsideCases: function () {
        var tContext = this.get('dataContext');
        tContext.restoreSetAsideCases();
      },

      showAllHiddenAttributes: function () {
        DG.DataContextUtilities.showAllHiddenAttributes( this.get('dataContext'));
      },

      /**
       * Randomize all attributes
       */
      randomizeAllAttributes: function() {
        var dataContext = this.get('dataContext'),
            dependencyMgr = dataContext && dataContext.get('dependencyMgr'),
            randomNode = dependencyMgr &&
                dependencyMgr.findNode({ type: DG.DEP_TYPE_SPECIAL,
                  id: 'random' });
        if (dataContext)
          dataContext.invalidateDependentsAndNotify([randomNode]);
      },

      /**
       Handler for the Export Case Data... menu command.
       Displays a dialog, so user can select and copy the case data from the current document.
       */
      _exportCaseData: function (dataContext, prompt, doIt, tooltip, callback) {
        function getCollectionMenuItems(dataContext) {
          var names = [];
          dataContext.forEachCollection(function (collection) {
            var name = collection.get('name');
            names.push(name);
          });
          names.push('DG.CaseTableController.allTables'.loc());
          return names;
        }

        // callback to get export string from one of the menu item titles

        // get array of exportable collection names for menu titles
        var tMenuItems = getCollectionMenuItems(dataContext),
            tStartingMenuItem = tMenuItems[0];

        // If we have only one collection then we will have two items in this
        // array. If we only have one collection, then we can bypass the dialog.
        if (tMenuItems.length > 2) {
          DG.CreateExportCaseDataDialog({
            prompt: prompt,
            collectionMenuTitle: tStartingMenuItem,
            collectionMenuItems: tMenuItems,
            collectionMenuItemAction: callback,
            exportTitle: doIt,
            exportTooltip: tooltip,
            cancelTitle: 'DG.AppController.exportDocument.cancelTitle',
            cancelTooltip: 'DG.AppController.exportDocument.cancelTooltip'
          });
        } else {
          callback(tMenuItems[1]);
        }
      },

      exportCaseData: function () {
        var tDataContext = this.get('dataContext');
        var exportCollection = function (whichCollection) {
          var caseDataString = tDataContext.exportCaseData(whichCollection);
          DG.exportFile(caseDataString, "csv", "text/plain");
        };
        this._exportCaseData(tDataContext,
            'DG.AppController.exportCaseData.prompt',
            'DG.AppController.exportDocument.exportTitle',
            'DG.AppController.exportDocument.exportTooltip',
            exportCollection);
      },

      /**
       * Export case data to clipboard.
       * Puts up dialog to select a collection to export, then copies to
       * clipboard both as text/plain and text/csv. The later is important for
       * reimport.
       *
       * As of 8/2020 browser support varies. Firefox does not support
       * the ClipboardItem API. Chrome does not support setting the ClipboardItem
       * to mime types other than text/plain and image/png. Weirdly, Safari
       * implements everything correctly. So, we attempt to use the API correctly,
       * and if there is a failure we back down to an alternate method that uses
       * the deprecated document command, 'copy'.
       */
      exportCaseDataToClipboard: function () {
        var tDataContext = this.get('dataContext');
        var exportCollection = function (whichCollection) {
          /*
           * This is the fallback copy method. We create a copy event handler which
           * modifies the copy data, perform the copy, then remove the handler.
           */
          function clipboardCopyAlt(data) {
            document.oncopy = function (e) {
              e.preventDefault(); // we handle it
              var dT = e.clipboardData;
              dT.setData( 'text/plain', data ); // as plain text
              dT.setData( 'text/csv', data ); // as csv
            };
            document.execCommand( 'copy' );
            SC.run(function(){
              DG.AlertPane.info({
                localization: true,
                message: copyMessage
              });
            });
            document.oncopy = null;
          }

          function makeCopyMessage(dataContext, collectionName) {
            var isAllTables = (collectionName === 'DG.CaseTableController.allTables'.loc());
            // var groupName = isAllTables? dataContext.get('name') : collectionName;
            var collection = isAllTables? dataContext.get('childCollection'): dataContext.getCollectionByName(collectionName);
            var caseCount = collection.getCaseCount();
            var caseCountString = dataContext.getCaseCountString(collection, caseCount);
            return "DG.Inspector.caseTable.exportCaseDialog.copiedData".loc(caseCountString);
          }

          var caseDataString = tDataContext.exportCaseData(whichCollection);
          var copyMessage = makeCopyMessage(tDataContext, whichCollection);
          if (window.ClipboardItem) {
            var blob = new Blob([caseDataString], {type: 'text/plain'});
            window.navigator.clipboard.write([new window.ClipboardItem({
              'text/csv': blob, 'text/plain': blob
            })]).then(function (data) {
              SC.run(function () {
                DG.AlertPane.info({
                  localization: true,
                  message: copyMessage
                });
              });
            }, function (err) {
              clipboardCopyAlt(caseDataString);
            });
          } else {
            clipboardCopyAlt(caseDataString);
          }
        };
        this._exportCaseData(tDataContext,
            "DG.Inspector.caseTable.exportCaseDialog.copyFrom",
            "DG.Inspector.caseTable.exportCaseDialog.copy",
            "DG.Inspector.caseTable.exportCaseDialog.copyTooltip",
            exportCollection);
      },
      importCaseDataFromClipboard: function() {
        var dataContext = this.get('dataContext');
        var contextName = dataContext && dataContext.get('name');

        window.focus();
        if (document.activeElement) {
          document.activeElement.blur();
        }

        window.navigator.clipboard.readText().then(
          function(data) {

            SC.run(function () {
              DG.appController.openCSVImporter({
                contentType: 'text/csv',
                text: data,
                targetDatasetName: contextName,
                name: 'clipboard',
                showCaseTable: false
              });
            });
          },
          function (err) {
            // maybe user didn't grant access to read from clipboard
            console.log('Error importing from clipboard: ', err);
          }
        );
      }
    };
  }()) // function closure
);
