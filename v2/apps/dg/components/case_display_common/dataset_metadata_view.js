// ==========================================================================
//  
//  Author:   jsandoe
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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

   Provides an editor view for examining and modifying dataset metadata.
   Dataset metadata includes a free form description, the file or url from which the data
   was drawn, time of creation, ...

 @extends SC.View
 */
DG.DatasetMetadataView = SC.PalettePane.extend( (function() // closure
    /** @scope DG.DatasetMetadataView.prototype */ {
  var kLeading = 5;

  var kPaneWidth = 290;
  var kControlWidth = 200;
  var kButtonWidth = 90;
  var kCancelSaveWidth = kPaneWidth;

  var kPaneHeight = 310;
  var kTitleHeight = 26;
  var kRowHeight = 20;
  var kControlHeight = kRowHeight - 2;
  var kButtonHeight = kControlHeight + 6;
  var kCancelSaveHeight = kControlHeight + 10;

  var kDescriptionLines = 8;

  return {
      dataContext: null,
      buttonIconClass: 'moonicon-icon-styles',  // So we can identify closure through click on button icon
      classNames: 'dg-inspector-picker'.w(),
      layout: {width: kPaneWidth, height: kPaneHeight, centerX: 0, centerY: 0},
      isModal: true,
      contentView: SC.View.extend(SC.FlowedLayout, {
        layoutDirection: SC.LAYOUT_VERTICAL,
        isResizable: false,
        isClosable: false,
        defaultFlowSpacing: {left: 0, right: 0, bottom: kLeading},
        canWrap: false,
        align: SC.ALIGN_TOP,
        childViews: [
          'title',
          'nameCtl',
          'urlCtl',
          'creationDateCtl',
          'descriptionCtl',
          'applyOrCancelCtl'
        ],

        title: DG.PickerTitleView.extend({
          layout: {height: kTitleHeight, width: kPaneWidth},
          flowSpacing: {left: 0, right: 0, bottom: kLeading},
          title: 'DG.TableController.datasetMetadata.title',
          localize: true,
        }),

        nameCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.attributeEditor.name',
          localize: true,
          toolTip: 'DG.TableController.attrEditor.nameHint',
          controlView: SC.TextFieldView.extend({
            layout: {
              centerY: 0,
              width: kControlWidth,
              height: kControlHeight
            },
            backgroundColor: 'white'
          })
        }),

        urlCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.datasetMetadata.url',
          localize: true,
          toolTip: 'DG.TableController.datasetMetadata.urlHint',
          controlView: SC.TextFieldView.extend({
            layout: {
              centerY: 0,
              width: kControlWidth,
              height: kControlHeight
            },
            backgroundColor: 'white'
          })
        }),

        creationDateCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.datasetMetadata.creationDate',
          localize: true,
          toolTip: 'DG.TableController.datasetMetadata.creationDateHint',
          controlView: SC.TextFieldView.extend({
            layout: {
              centerY: 0,
              width: kControlWidth,
              height: kControlHeight
            },
            backgroundColor: 'white'
          })
        }),

        descriptionCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight * kDescriptionLines},
          label: 'DG.CaseTable.attributeEditor.description',
          localize: true,
          controlView: SC.TextFieldView.extend({
            layout: {
              centerY: 0,
              width: kControlWidth,
              height: kControlHeight * kDescriptionLines
            },
            isTextArea: true,
            backgroundColor: 'white',
            hint: 'DG.TableController.datasetMetadata.descriptionHint',
            localize: true
          })
        }),

        applyOrCancelCtl: SC.View.design(SC.FlowedLayout, {
          layoutDirection: SC.LAYOUT_VERTICAL,
          defaultFlowSpacing: 5,
          align: SC.ALIGN_CENTER,
          layout: {
            width: kCancelSaveWidth,
            height: kCancelSaveHeight,
          },
          childViews: 'cancel apply'.w(),
          cancel: SC.ButtonView.design({
            layout: {  width: kButtonWidth, height: kButtonHeight },
            titleMinWidth: 0,
            title: 'DG.AttrFormView.cancelBtnTitle',  // "Cancel"
            target: null,
            action: 'close',
            toolTip: 'DG.AttrFormView.cancelBtnTooltip',  // "Dismiss the dialog without making any changes"
            localize: true,
            isCancel: true
          }),
          apply: SC.ButtonView.design({
            layout: { width: kButtonWidth, height: kButtonHeight },
            titleMinWidth: 0,
            title: 'DG.AttrFormView.applyBtnTitle', // "Apply"
            target: null,
            action: 'update',
            toolTip: '',
            localize: true,
            isDefault: true
          })
        })
      }),

      dataContextDidChange: function () {
        var dataContext = this.get('dataContext');
        var metadata = dataContext.getPath('model.metadata') || {};
        var importDate = metadata.importDate;
        if (DG.DateUtilities.isDate(importDate) || DG.DateUtilities.isDateString(importDate)) {
          importDate = DG.DateUtilities.formatDate(importDate, DG.Attribute.DATE_PRECISION_MINUTE);
        }
        var contentView = this.get('contentView');
        if (dataContext) {
          contentView.setPath('nameCtl.controlView.value', dataContext.get('title'));
          contentView.setPath('urlCtl.controlView.value', metadata.source);
          contentView.setPath('creationDateCtl.controlView.value', importDate);
          contentView.setPath('descriptionCtl.controlView.value', metadata.description);
        }
      }.observes('dataContext'),

      update: function () {
        var dataContext = this.get('dataContext');
        var metadata = dataContext.getPath('model.metadata') || {};
        var contentView = this.get('contentView');
        dataContext.set('title', contentView.getPath('nameCtl.controlView.value'));
        metadata.source = contentView.getPath('urlCtl.controlView.value');
        metadata.importDate = contentView.getPath('creationDateCtl.controlView.value');
        metadata.description = contentView.getPath('descriptionCtl.controlView.value');
        dataContext.setPath('model.metadata', metadata);

        DG.log('setting metadata: ' + JSON.stringify(metadata));
        this.close();
      },
      close: function () {
        DG.log('Closing Attribute Editor');
        this.remove();
        this.destroy();
      },
      init: function () {
        sc_super();
        if (this.get('dataContext')) {
          this.dataContextDidChange();
        }
      }
    };
  }())
);
