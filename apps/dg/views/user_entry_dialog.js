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
  layout: { width: 400, height: 400, centerX: 0, centerY: 0},
  contentView: SC.View.design({
    layout: { top: 10, right: 10, left: 10, bottom: 10, zIndex: 0 },
    childViews: function() {
      var children = 'welcomeHeader welcomeInstructions openFile openNew'.w();
      if (DG.authorizationController.get('isSaveEnabled')) {
        children.push('documentServer');
      }
      return children;
    }.property(),

    welcomeHeader: SC.LabelView.design({
      layout: { left: 0, right: 0, top: 0, height: 24 },
      controlSize: SC.LARGE_CONTROL_SIZE,
      fontWeight: SC.BOLD_WEIGHT,
      textAlign: SC.ALIGN_CENTER,
      localize: true,
      value: DG.getVariantString('DG.UserEntryDialog.welcome')
    }),

    welcomeInstructions: SC.LabelView.design({
      layout: { left: 0, right: 0, top: 39, height: 18 },
      textAlign: SC.ALIGN_LEFT,
      localize: true,
      value: DG.getVariantString('DG.UserEntryDialog.welcome2')
    }),

    openNew: SC.ButtonView.design({
      layout: { left: 0, right: 0, top: 72, height: 44 },
      controlSize: SC.JUMBO_CONTROL_SIZE,
      localize: true,
      title: DG.getVariantString('DG.UserEntryDialog.openNewButton'),
      action: function() {
        DG.setPath('currDocumentController.content._isPlaceholder', false);
      }
    }),

    openFile: SC.ButtonView.design({
      layout: { left: 0, right: 0, top: 121, height: 44 },
      controlSize: SC.JUMBO_CONTROL_SIZE,
      localize: true,
      title: DG.getVariantString('DG.UserEntryDialog.openFileButton'),
      target: 'DG.appController',
      action: 'importDocument'
    }),

    documentServer: SC.ButtonView.design({
      layout: { left: 0, right: 0, top: 170, height: 44 },
      controlSize: SC.JUMBO_CONTROL_SIZE,
      localize: true,
      title: DG.getVariantString('DG.UserEntryDialog.documentServerButton'),
      target: 'DG.appController',
      action: 'openDocument'
    })
  })
});

