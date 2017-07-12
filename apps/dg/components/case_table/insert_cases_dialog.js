// ==========================================================================
//
//  Author:   kswenson
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
sc_require('views/inspector/picker_title_view');
sc_require('views/inspector/picker_control_view');
/** @class

   Provides an editor view for examining and modifying case attribute properties.

 @extends SC.View
 */
DG.InsertCasesDialog = SC.PalettePane.extend( (function() // closure
    /** @scope DG.InsertCasesDialog.prototype */ {
    var kRowHeight = 20;
    var kControlHeight = kRowHeight - 2;
    var kTitleHeight = 26;
    var kControlWidth = 80;
    var kMargin = 10;
    var kLeading = 5;

    return {
      buttonIconClass: 'moonicon-icon-styles',  // So we can identify closure through click on button icon
      classNames: 'dg-insert-cases-dialog'.w(),
      layout: {width: 250, height: 100, centerX: 0, centerY: 0},
      isModal: true,
      caseTableView: null,  // provided by caller
      contentView: SC.View.extend(SC.FlowedLayout, {
        layoutDirection: SC.LAYOUT_VERTICAL,
        isResizable: false,
        isClosable: false,
        defaultFlowSpacing: {left: kMargin, right: kMargin, bottom: kLeading},
        canWrap: false,
        align: SC.ALIGN_TOP,
        layout: {right: 5},
        childViews: [ 'title', 'countCtl', 'beforeAfterCtl', 'applyOrCancelCtl' ],

        title: DG.PickerTitleView.extend({
          layout: {height: kTitleHeight},
          flowSpacing: {left: 0, right: 0, bottom: kLeading},
          title: 'DG.CaseTable.insertCasesDialog.title',
          localize: true,
        }),

        countCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.insertCasesDialog.numCasesPrompt',
          localize: true,
          controlView: SC.TextFieldView.extend({
            layout: {
              centerY: 0,
              width: kControlWidth,
              height: kControlHeight
            },
            backgroundColor: 'white',
            didAppendToDocument: function() {
              this.becomeFirstResponder();
            }
          })
        }),

        beforeAfterCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.insertCasesDialog.beforeAfter.prompt',
          localize: true,
          controlView: SC.RadioView.design({
            layout: {
              centerY: 0,
              width: 140,
              height: kControlHeight
            },
            items: [
              {
                title: 'DG.CaseTable.insertCasesDialog.beforeAfter.before'.loc(),
                value: 'before',
                enabled: YES
              },
              {
                title: 'DG.CaseTable.insertCasesDialog.beforeAfter.after'.loc(),
                value: 'after',
                enabled: YES
              }
            ],
            value: 'after',
            itemTitleKey: 'title',
            itemValueKey: 'value',
            itemIsEnabledKey: 'enabled',
            isEnabled: YES,
            layoutDirection: SC.LAYOUT_HORIZONTAL
          })
        }),

        applyOrCancelCtl: SC.View.design(SC.FlowedLayout, {
          layoutDirection: SC.LAYOUT_VERTICAL,
          defaultFlowSpacing: 5,
          align: SC.ALIGN_CENTER,
          layout: {
            width: kControlWidth,
            height: 24,
          },
          childViews: 'cancel apply'.w(),
          cancel: SC.ButtonView.design({
            layout: {  width: 90 },
            titleMinWidth: 0,
            title: 'DG.AttrFormView.cancelBtnTitle',  // "Cancel"
            target: null,
            action: 'close',
            toolTip: 'DG.AttrFormView.cancelBtnTooltip',  // "Dismiss the dialog without making any changes"
            localize: true,
            isCancel: true
          }),
          apply: SC.ButtonView.design({
            layout: { width: 90 },
            titleMinWidth: 0,
            title: 'DG.CaseTable.insertCasesDialog.applyBtnTitle', // "Insert Cases"
            target: null,
            action: 'insertCases',
            toolTip: 'DG.CaseTable.insertCasesDialog.applyBtnTooltip',
            localize: true,
            isDefault: true
          })
        })
      }),

      insertCases: function () {
        var caseTableView = this.get('caseTableView'),
            caseCount = Number(this.getPath('contentView.countCtl.controlView.value')),
            beforeAfter = this.getPath('contentView.beforeAfterCtl.controlView.value');
        if (!caseTableView || !caseCount || !(caseCount > 0)) return; // jshint ignore: line

        caseTableView.doInsertCases(caseCount, beforeAfter === 'after');
        this.close();
      },
      close: function () {
        DG.log('Closing Insert Cases Dialog');
        this.remove();
        this.destroy();
      },
      init: function () {
        sc_super();
        var initialCaseCount = this.get('initialCaseCount') || 1;
        this.setPath('contentView.countCtl.controlView.value', initialCaseCount);
        this.setPath('contentView.applyOrCancelCtl.cancel.target', this);
        this.setPath('contentView.applyOrCancelCtl.apply.target', this);
      }
    };
  }())
);
