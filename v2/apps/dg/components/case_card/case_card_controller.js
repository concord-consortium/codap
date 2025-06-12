// ==========================================================================
//                        DG.CaseCardController
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

/** @class

    Coordinating controller for data card singleton.

 @extends DG.CaseDisplayController
 */
DG.CaseCardController = DG.CaseDisplayController.extend(
    /** @scope DG.CaseCardController.prototype */ {

      reactDiv: null,

      init: function() {
        sc_super();
        this.get('specialTitleBarButtons').push(
            DG.CaseTableToggleButton.create()
        );
      },

      /**
       Destruction function.
       */
      destroy: function() {
        var dataContext = this.get('dataContext');
        if( dataContext && dataContext.removeObserver)
          dataContext.removeObserver('changeCount', this, 'handleDataContextChanges');
        sc_super();
      },

      /**
       Configure the table for the new data context.
       */
      dataContextDidChange: function() {
        var dataContext = this.get('dataContext');

        if( dataContext !== this._prevDataContext) {
          if( this._prevDataContext)
            this._prevDataContext.removeObserver('changeCount', this, 'handleDataContextChanges');
          if( dataContext)
            dataContext.addObserver('changeCount', this, 'handleDataContextChanges');
          this._prevDataContext = dataContext;
          // In case the previous dataContext was destroyed, we are removed from the registry, so reregister
          DG.currDocumentController().tableCardRegistry.registerView(dataContext, this.get('view'));
        }
      }.observes('dataContext', 'view'),

      /**
       Observer function called when the data context notifies that it has changed.
       */
      handleDataContextChanges: function() {
        var changes = this.getPath('dataContext.newChanges');

        /**
         Process each change that has occurred since the last notification.
         */
        var handleOneChange = function( iChange) {
          var operation = iChange && iChange.operation;
          switch( operation) {
            case 'deleteDataContext':
              this.dataContextWasDeleted();
              break;
            default:
          }
        }.bind( this);

        // Process all changes that have occurred since the last notification.
        if( changes) {
          changes.forEach( function( iChange) {
            handleOneChange( iChange);
          });
        }
      },

      toggleViewVisibility: function() {
        var tCaseCardView = this.get('view'),
            tOperation = tCaseCardView.get('isVisible') ? 'delete' : 'add',
            tViewName = 'caseCardView';
        DG.UndoHistory.execute(DG.Command.create({
          name: 'component.toggle.delete',
          undoString: 'DG.Undo.toggleComponent.' + tOperation + '.' + tViewName,
          redoString: 'DG.Redo.toggleComponent.' + tOperation + '.' + tViewName,
          log: 'Toggle component: %@'.fmt('caseCard'),
          execute: function () {
            var layout = tCaseCardView.get('layout');
            tCaseCardView.set('savedLayout', layout);
            var isVisible = tCaseCardView.toggleProperty('isVisible');
            if( !isVisible && tCaseCardView.parentView && tCaseCardView.parentView.select)
              tCaseCardView.parentView.select(null);

          },
          undo: function () {
            this.execute();
          },
          redo: function () {
            this.execute();
          }
        }));
      },

      /**
       * @returns {[DG.IconButton]}
       */
      createInspectorButtons:  function () {
        var tButtons = sc_super();

        tButtons.push(this.createInfoButton());
        tButtons.push(this.createTrashButton());
        tButtons.push(this.createHideShowButton());
        tButtons.push(this.createRulerButton());

        return tButtons;
      },

      showAttributesPopup: function() {
        var tItems = [];

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

      createComponentStorage: function() {
        var caseCardModel = this.getPath('model.content'),
            dataContext = caseCardModel.get('context'),
            isActive = caseCardModel.get('isActive'),
            columnWidthMap = caseCardModel.get('columnWidthMap'),
            storage = {
              isActive: isActive
            };
        if( dataContext) {
          this.addLink(storage, 'context', dataContext);
        }
        if (columnWidthMap) {
          var columnWidthMapArchive = {};
          DG.ObjectMap.forEach(columnWidthMap, function(key, value) {
            // round to four decimal places for saving
            columnWidthMapArchive[key] = DG.MathUtilities.roundToDecimalPlaces(value, 4);
          });
          storage.columnWidthMap = columnWidthMapArchive;
        }
        return storage;
      },

      restoreComponentStorage: function( iStorage, iDocumentID) {
        sc_super();
        var caseCardModel = this.getPath('model.content');
        if (caseCardModel) {
          var contextID = this.getLinkID( iStorage, 'context'),
              dataContext = contextID
                  && DG.currDocumentController().getContextByID(contextID);
          if( dataContext) {
            caseCardModel.set('context', dataContext);
            this.set('dataContext', dataContext);
          }
          caseCardModel.set('isActive', iStorage.isActive);
          if (iStorage.columnWidthMap)
            caseCardModel.set('columnWidthMap', SC.clone(iStorage.columnWidthMap));
        }
      }

    });

