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
      value: DG.getVariantString('DG.UserEntryDialog.welcome')
    }),

    welcomeInstructions: SC.LabelView.design({
      layout: { left: 10, right: 0, top: 49, height: 18 },
      textAlign: SC.ALIGN_LEFT,
      localize: true,
      value: DG.getVariantString('DG.UserEntryDialog.welcome2')
    }),

    choiceButtons: SC.SegmentedView.design({
      layout: { left: 10, top: 82, height: 72*3, width: 250 },
      controlSize: SC.JUMBO_CONTROL_SIZE,
      layoutDirection: SC.LAYOUT_VERTICAL,
      _openNewText: DG.getVariantString('DG.UserEntryDialog.openNew.option').loc(),
      _openFileText: DG.getVariantString('DG.UserEntryDialog.openFile.option').loc(),
      _cloudBrowseText: DG.getVariantString('DG.UserEntryDialog.documentServer.option').loc(),
      init: function() {
        sc_super();
        this.set('value', [this._openNewText]);
      },
      items: function() {
        var items = [
          this._openNewText,
          this._openFileText
        ];
        if (DG.authorizationController.get('isSaveEnabled')) {
          items.push(this._cloudBrowseText);
        }
        return items;
      }.property(),
      value: null,
      valueChanged: function() {
        var val = this.get('value');
        switch(val) {
          case this._cloudBrowseText:
            this.setPath('parentView.choiceViews.nowShowing', 'cloudBrowseView');
            break;
          case this._openFileText:
            this.setPath('parentView.choiceViews.nowShowing', 'openFileView');
            break;
          case this._openNewText:
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
          value: DG.getVariantString('DG.UserEntryDialog.openNew.prompt')
        }),

        titleField: SC.TextFieldView.design({
          layout: { top: 40, left: 5, right: 5, height:24 },
          localize: true,
          hint: DG.getVariantString('DG.UserEntryDialog.openNew.titleFieldHint')
        }),

        okButton: SC.ButtonView.design({
          layout: { bottom:5, right: 5, height:24, width: 90 },
          localize: true,
          title: DG.getVariantString('DG.UserEntryDialog.openNew.button'),
          target: 'DG.userEntryController',
          action: 'openNewDocument',
          isDefault: true
        })
      }),

      openFileView: SC.LabelView.design({
        layout: { left: 0, right: 0, top: 0, bottom: 0 },
        controlSize: SC.JUMBO_CONTROL_SIZE,
        value: 'Open File'
      }),
      cloudBrowseView: SC.LabelView.design({
        layout: { left: 0, right: 0, top: 0, bottom: 0 },
        controlSize: SC.JUMBO_CONTROL_SIZE,
        value: 'Browse Cloud'
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

