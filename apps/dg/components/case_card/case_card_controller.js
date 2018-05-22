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

sc_require('controllers/component_controller');

/** @class

    Coordinating controller for data card singleton.

 @extends DG.ComponentController
 */
DG.CaseCardController = DG.ComponentController.extend(
    /** @scope DG.CaseCardController.prototype */ {

      reactDiv: null,

      init: function() {
        sc_super();
        this.get('specialTitleBarButtons').push(
            DG.CaseTableToggleButton.create()
        );
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
            tCaseCardView.toggleProperty('isVisible');
          },
          undo: function () {
            this.execute();
          },
          redo: function () {
            this.execute();
          }
        }));
      },

      createComponentStorage: function() {
        var caseCardModel = this.getPath('model.content'),
            dataContext = caseCardModel.get('context'),
            storage = {};
        if( dataContext) {
          this.addLink(storage, 'context', dataContext);
        }

        return storage;
      },

      restoreComponentStorage: function( iStorage, iDocumentID) {
        var caseCardModel = this.getPath('model.content');
        if (caseCardModel) {
          var contextID = this.getLinkID( iStorage, 'context'),
              dataContext = contextID
                  && DG.currDocumentController().getContextByID(contextID);
          if( dataContext) {
            caseCardModel.set('context', dataContext);
            this.set('dataContext', dataContext);
          }
        }
      }

    });

