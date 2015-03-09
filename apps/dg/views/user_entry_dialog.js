// ==========================================================================
//                            DG.UserEntryDialog
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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

/** @class

  Dialog showing activity choices for when there is no current document.

  @extends SC.PanelPane
*/
DG.UserEntryDialog = SC.PanelPane.extend({
  layout: { width: 600, height: 400, centerX: 0, centerY: 0},
  contentView: SC.View.design({
    layout: { top: 0, right: 0, left: 0, bottom: 0, zIndex: 0 },
    childViews: 'welcomeHeader welcomeInstructions choiceViews choiceButtons'.w(),

    welcomeHeader: SC.LabelView.design({
      layout: { left: 10, right: 0, top: 10, height: 24 },
      controlSize: SC.LARGE_CONTROL_SIZE,
      fontWeight: SC.BOLD_WEIGHT,
      textAlign: SC.ALIGN_CENTER,
      localize: true,
      value: 'DG.UserEntryDialog.welcome'
    }),

    welcomeInstructions: SC.LabelView.design({
      layout: { left: 10, right: 0, top: 49, height: 18 },
      textAlign: SC.ALIGN_LEFT,
      localize: true,
      value: 'DG.UserEntryDialog.welcome2'
    }),

    choiceButtons: SC.SegmentedView.design({
      layout: { left: 10, top: 82, height: 72*3, width: 250 },
      controlSize: SC.JUMBO_CONTROL_SIZE,
      layoutDirection: SC.LAYOUT_VERTICAL,
      init: function() {
        sc_super();
        this.set('value', ['new']);
      },
      itemTitleKey: 'title',
      itemValueKey: 'value',
      items: function() {
        var items = [
          { title: 'DG.UserEntryDialog.openNew.option'.loc(), value: 'new' },
          { title: 'DG.UserEntryDialog.openFile.option'.loc(), value: 'file' }
        ];
        if (DG.authorizationController.get('isSaveEnabled')) {
          items.push({ title: 'DG.UserEntryDialog.documentServer.option'.loc(), value: 'cloud' });
        }
        return items;
      }.property(),
      value: null,
      valueChanged: function() {
        var val = this.get('value');
        switch(val) {
          case 'cloud':
            this.setPath('parentView.choiceViews.nowShowing', 'cloudBrowseView');
            break;
          case 'file':
            this.setPath('parentView.choiceViews.nowShowing', 'openFileView');
            break;
          case 'new':
            this.setPath('parentView.choiceViews.nowShowing', 'openNewView');
            break;
          default:
            this.setPath('parentView.choiceViews.nowShowing', 'openNewView');
        }
      }.observes('value')
    }),

    choiceViews: SC.WellView.design({
      layout: { left: 265, right: 10, top: 82, height: 72*3, zIndex: 5 },
      init: function() {
        sc_super();
        this.set('nowShowing', 'openNewView');
      },
      openNewView: SC.View.design({
        layout: {top: 0, left: 0, right: 0, bottom: 0},
        childViews: 'titleLabel titleField okButton'.w(),

        titleLabel: SC.LabelView.design({
          layout: { top: 10, left: 5, right: 5, height:24 },
          localize: true,
          value: 'DG.UserEntryDialog.openNew.prompt'
        }),

        titleField: SC.TextFieldView.design({
          layout: { top: 40, left: 5, right: 5, height:24 },
          localize: true,
          hint: 'DG.UserEntryDialog.openNew.titleFieldHint'
        }),

        okButton: SC.ButtonView.design({
          layout: { bottom:5, right: 5, height:24, width: 90 },
          localize: true,
          title: 'DG.UserEntryDialog.openNew.button',
          toolTip: 'DG.UserEntryDialog.openNew.buttonTooltip',
          target: 'DG.userEntryController',
          action: 'openNewDocument',
          isDefault: true
        })
      }),

      openFileView: SC.LabelView.design({
        layout: {top: 0, left: 0, right: 0, bottom: 0},
        childViews: 'promptView editView alertView okButton'.w(),
        promptView: SC.LabelView.extend({
          layout: { top: 10, left: 5, right: 5, height:24 },
          localize: true,
          value: 'DG.UserEntryDialog.openFile.prompt'
        }),
        editView: DG.FileImportView.design({
          layout: { top: 40, left: 5, right: 5, height:24 },
          value: '',
          isTextArea: false,
          spellCheckEnabled: false,
          action: function () {
            this.get('parentView').hideAlert();
          }
        }),
        // alertView: Initially invisible, only exposed if invalid file
        // uploaded
        alertView: SC.LabelView.extend({
          layout: { top: 70, left: 5, right: 5, height:24 },
          classNames: ['dg-alert'],
          localize: true,
          isVisible: NO,
          value: 'DG.AppController.importDocument.alert'
        }),
        okButton: SC.ButtonView.design({
          layout: { bottom:5, right: 5, height:24, width: 90 },
          titleMinWidth: 0,
          localize: true,
          title: 'DG.UserEntryDialog.openFile.button',  // "OK"
          toolTip: 'DG.UserEntryDialog.openFile.buttonTooltip',
          target: 'DG.userEntryController',
          action: 'openFile',
          isDefault: true
        }),

        showAlert: function () {
          this.setPath('alertView.isVisible', YES);
        },

        hideAlert: function () {
          this.setPath('alertView.isVisible', NO);
        },

        value: function() {
          return this.getPath('editView.files');
        }.property(),

        close: function() {
          // NOOP. Implemented to mimic the expected dialog API used in DG.appController.importFileWithConfirmation
        }
      }),

      cloudBrowseView: SC.View.design({
        layout: { left: 0, right: 0, top: 0, bottom: 0 },
        childViews: 'promptView documentListView okButton'.w(),

        promptView: SC.LabelView.design({
          layout: { top: 10, left: 5, right: 5, height:24 },
          localize: true,
          value: 'DG.AppController.openDocument.prompt'   // "Choose a document
        }),

        documentListView: SC.SelectFieldView.design({
          layout: { top: 40, left: 5, right: 5, height:24 },
          _listController: null,
          init: function() {
            sc_super();
            this.set('objects', DG.DocumentListController.create());
          },
          nameKey: 'name',
          valueKey: 'id',
          disableSort: true // clients should pass the array sorted appropriately
        }),

        okButton: SC.ButtonView.design({
          layout: { bottom:5, right: 5, height:24, width: 90 },
          titleMinWidth: 0,
          localize: true,
          title: 'DG.AppController.openDocument.okTitle',  // "Open"
          target: 'DG.userEntryController',
          action: 'openExistingDocument',
          toolTip: 'DG.AppController.openDocument.okTooltip',  // "Open",
          isDefault: true
        }),

        documentName: function() {
          var docList = this.getPath('documentListView.objects'),
              i, docCount = docList && docList.get('length'),
              docID = this.getPath('documentListView.fieldValue'),
              docEntry;
          for( i = 0; i < docCount; ++i) {
            docEntry = docList.objectAt( i);
            if( docEntry.id === docID)
              return docEntry.name;
          }
          return null;
        }.property('*documentListView.fieldValue'),

        documentID: function() {
          return this.getPath('documentListView.fieldValue');
        }.property('*documentListView.fieldValue'),

        close: function() {
          // NOOP. Implemented to mimic the expected dialog API used in DG.appController.openDocumentFromDialog
        }
      })
    }),

    isAppended: false,
    didAppendToDocument: function() {
      this.set('isAppended', true);
    },

    willRemoveFromDocument: function() {
      this.set('isAppended', false);
    }
  })
});

