// ==========================================================================
//  DG.ExportCaseDataDialog
//
//  An 'export case data' dialog box with a label, popup menu, a text edit
//  view, and an OK button. Used to allow the user to cut and paste case data
//  from DG to TinkerPlots/Fathom/spreadsheet.
//
//  See also DG.SingleTextDialog
//
//  Author:   Craig D. Miller
//
//  Copyright ©2013 Scientific Reasoning Research Institute,
//                  University of Massachusetts Amherst
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

/**
 * @class   DG.ExportCaseDataDialog
 * @extends SC.PalettePane
 * An 'export case data' dialog box with a label, popup menu, a text edit view, and an OK button.
 * To allow the user to cut and paste case data from DG to TinkerPlots/Fathom/spreadsheet.
 */
DG.ExportCaseDataDialog = SC.PalettePane.extend(
/** @scope DG.ExportCaseDataDialog.prototype */ {

  isModal: true,

  layout: { width: 400, height: 120, centerX: 0, centerY: 0 },

  contentView: SC.View.extend({

    childViews: 'promptView collectionPopup exportButton cancelButton'.w(),
    promptView: SC.LabelView.extend({
      layerId: 'export_case_data_prompt', // use dg.css #export_case_data_prompt for text properties
      layout: { top: 10, left: 10, right: 210, height:24 },
      localize: true,
      value: ''
    }),
    collectionPopup: SC.PopupButtonView.extend({
      layout: { top: 10, left: 200, right: 10, height: 24 },
      title: '',
      menu: SC.MenuPane.extend({
        layout: { width: 250 },
        items: null // filled in later
      })
    }),
    exportButton: SC.ButtonView.design({
      layout: { bottom:5, right: 110, height:24, width: 90 },
      titleMinWidth: 0,
      localize: true,
      title: '',
      target: null,
      action: null,
      isDefault: true
    }),
    cancelButton: SC.ButtonView.design({
      layout: { bottom:5, right: 10, height:24, width: 90 },
      titleMinWidth: 0,
      localize: true,
      title: '',
      target: null,
      action: null,
      isDefault: false
    })
  }),

  init: function() {
    sc_super();

    this.setPath('contentView.exportButton.target', this);
    this.setPath('contentView.exportButton.action', 'export');

    this.setPath('contentView.cancelButton.target', this);
    this.setPath('contentView.cancelButton.action', 'close');
  },

  /**
   * Observer function called when the user selects an item from the collection popup menu.
   */
  collectionSelected: function() {
    // Extract the text of the selected item
    var menuItemString = this.getPath('contentView.collectionPopup.menu.selectedItem.title');
    if( !SC.empty( menuItemString)) {
      this.setPath('contentView.collectionPopup.title', menuItemString ); // update menu
    }
  }.observes('.contentView.collectionPopup.menu.selectedItem'),

  /**
   * Exports the data using the CFM
   */
  // We quote export below because it is a javascript reserved word. The
  // yuicompressor embedded in Sproutcore build chokes.
  'export': function() {
    var menuItemString = this.getPath('contentView.collectionPopup.title'),
        menuItemAction = this.getPath('contentView.collectionPopup.itemAction');
    if( !SC.empty( menuItemString)) {
      this.close();
      menuItemAction( menuItemString); // get new case data to match the menu item
    }
  },

  /**
   * Close the dialog. Used by cancelButton.action.
   */
  close: function() {
    this.remove();
    this.destroy();
  }
});

/**
  Brings up the export dialog with the properties specified by the client.

  @param {Object} iProperties   Configuration properties for export dialog.
                                See the kParamMap below for details.
  @returns  {DG.ExportCaseDataDialog} the created dialog
 */
DG.CreateExportCaseDataDialog = function( iProperties) {
  var tDialog = DG.ExportCaseDataDialog.create( iProperties),
      kParamMap = {
        prompt: 'promptView.value',

        exportTitle: 'exportButton.title',
        exportTooltip: 'exportButton.toolTip',
        cancelTitle: 'cancelButton.title',
        cancelTooltip: 'cancelButton.toolTip',

        collectionMenuTitle: 'collectionPopup.title',
        collectionMenuItems: 'collectionPopup.menu.items',
        collectionMenuItemAction: 'collectionPopup.itemAction' // non-standard param used by collectionSelected()
      },
      tContentView = tDialog.get('contentView');

  // Loop through client-specified properties, applying them to the
  // appropriate property via its path given in the kParamMap.
  DG.ObjectMap.forEach( iProperties,
              function( iKey, iValue) {
                var tParamPath = kParamMap[ iKey];
                if( !SC.empty( tParamPath))
                  tContentView.setPath( tParamPath, iValue);
              } );

  // Put up the dialog
  tDialog.append();

  return tDialog;
};

