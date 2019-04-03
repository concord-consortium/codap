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
        var tDataContext = this.get('dataContext'),
            tSelection = tDataContext && tDataContext.getSelectedCases(),
            tDeleteIsEnabled = tSelection && tSelection.get('length') > 0,
            tCaseCount = tDataContext.get('totalCaseCount'),
            tDeleteUnselectedIsEnabled = (tCaseCount > 0) &&
                (!tSelection || tSelection.get('length') < tCaseCount),
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
              },
              {
                title: 'DG.Inspector.selection.deleteUnselectedCases',
                localize: true,
                target: this,
                action: 'deleteUnselectedCases',
                isEnabled: tDeleteUnselectedIsEnabled
              },
              {
                title: 'DG.Inspector.deleteAll',
                localize: true,
                target: this,
                action: 'deleteAllCases',
                isEnabled: tCaseCount > 0
              }
            ],
            tMenu = DG.MenuPane.create({
              classNames: 'dg-delete-popup'.w(),
              layout: {width: 200, height: 150},
              items: tItems
            });
        tMenu.popup(this.get('inspectorButtons')[0]);
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
            setAside: iSetAside,
            cases: tCases
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

      _deleteOrSetAsideUnselectedCases: function(iSetAside){
        /**
         * Adds iValue to iArray if iKey is not already seen
         * @return {boolean} whether entry was added
         */
        function addIfNew(iKey, iValue, iSeenHash, iArray) {
          if (iSeenHash[iKey]) {
            return false;
          }
          iSeenHash[iKey] = true;
          iArray.push(iValue);
          return true;
        }
        var tContext = this.get('dataContext'),
            tSelectedCases = tContext.getSelectedCases(),
            tHash = {},
            tSelectedCasesAndParents = [],
            tAllCases = tContext.get('allCases'),
            tUnselected;

        // we extend the list of selected cases to include their parents (ie partially selected cases)
        tSelectedCases.forEach(function (iCase) {
          var parentCase = iCase.get('parent');
          if (addIfNew(iCase.get('id'), iCase, tHash, tSelectedCasesAndParents)) {
            while (parentCase && addIfNew(parentCase.get('id'), parentCase, tHash, tSelectedCasesAndParents)) {
              parentCase = parentCase.get('parent');
            }
          }
        });

        // we compute unselected
        tUnselected = DG.ArrayUtils.subtract( tAllCases, tSelectedCasesAndParents,
            function( iCase) {
              return iCase.get('id');
            });
        tContext.applyChange( {
          operation: 'deleteCases',
          setAside: iSetAside,
          cases: tUnselected
        });
      },

      /**
       * Delete all cases represented by the case table.
       * Passes the request on to the data context to do the heavy lifting.
       */
      deleteAllCases: function(){
        var tContext = this.get('dataContext'),
            tAllCases = tContext.get('allCases');
        var tChange = {
          operation: 'deleteCases',
          cases: tAllCases
        };
        tContext.applyChange( tChange);
      },

      restoreSetAsideCases: function () {
        var tContext = this.get('dataContext');
        tContext.restoreSetAsideCases();
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
      exportCaseData: function () {
        function getCollectionMenuItems() {
          var names = [];
          tDataContext.forEachCollection(function (collection) {
            var name = collection.get('name');
            names.push(name);
          });
          names.push('DG.CaseTableController.allTables'.loc());
          return names;
        }

        // callback to get export string from one of the menu item titles
        var exportCollection = function (whichCollection) {
          return tDataContext.exportCaseData(whichCollection);
        };
        // get array of exportable collection names for menu titles
        var tDataContext = this.get('dataContext'),
            tMenuItems = getCollectionMenuItems(),
            tStartingMenuItem = tMenuItems[0];

        DG.CreateExportCaseDataDialog({
          prompt: 'DG.AppController.exportCaseData.prompt',
          collectionMenuTitle: tStartingMenuItem,
          collectionMenuItems: tMenuItems,
          collectionMenuItemAction: exportCollection,
          exportTitle: 'DG.AppController.exportDocument.exportTitle',
          exportTooltip: 'DG.AppController.exportDocument.exportTooltip',
          cancelTitle: 'DG.AppController.exportDocument.cancelTitle',
          cancelTooltip: 'DG.AppController.exportDocument.cancelTooltip'
        });
      },

    };
  }()) // function closure
);
