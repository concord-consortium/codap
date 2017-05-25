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
sc_require('models/attribute_model');
sc_require('views/inspector/picker_title_view');
sc_require('views/inspector/picker_control_view');
/** @class

   Provides an editor view for examining and modifying case attribute properties.

 @extends SC.View
 */
DG.AttributeEditorView = SC.PalettePane.extend( (function() // closure
    /** @scope DG.AttribueEditorView.prototype */ {
    var kRowHeight = 20;
    var kControlHeight = kRowHeight - 2;
    var kTitleHeight = 26;
    var kControlWidth = 140;
    var kMargin = 10;
    var kLeading = 5;

    return {
      attrRef: null,
      attrUpdater: null,
      buttonIconClass: 'moonicon-icon-styles',  // So we can identify closure through click on button icon
      classNames: 'inspector-picker'.w(),
      layout: {width: 250, height: 280, centerX: 0, centerY: 0},
      isModal: true,
      contentView: SC.View.extend(SC.FlowedLayout, {
        layoutDirection: SC.LAYOUT_VERTICAL,
        isResizable: false,
        isClosable: false,
        defaultFlowSpacing: {left: kMargin, right: kMargin, bottom: kLeading},
        canWrap: false,
        align: SC.ALIGN_TOP,
        layout: {right: 5},
        childViews: [
          'title',
          'nameCtl',
          'descriptionCtl',
          'typeCtl',
          'unitCtl',
          'precisionCtl',
          'editableCtl',
          'applyOrCancelCtl'
        ],

        title: DG.PickerTitleView.extend({
          layout: {height: kTitleHeight},
          flowSpacing: {left: 0, right: 0, bottom: kLeading},
          title: 'DG.TableController.attributeEditor.title',
          localize: true,
        }),

        nameCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.attributeEditor.name',
          localize: true,
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
          layout: {height: kRowHeight*4},
          label: 'DG.CaseTable.attributeEditor.description',
          localize: true,
          controlView: SC.TextFieldView.extend({
            layout: {
              centerY: 0,
              width: kControlWidth,
              height: kControlHeight*4
            },
            isTextArea: true,
            backgroundColor: 'white',
            hint: 'DG.TableController.attrEditor.descriptionHint',
            localize: true
          })
        }),

        typeCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight * 1.5},
          label: 'DG.CaseTable.attributeEditor.type',
          localize: true,
          controlView: SC.SelectView.extend({
            layout: {
              width: kControlWidth,
              height: 24
            },
            itemTitleKey: 'title',
            itemValueKey: 'value',
            items: DG.Attribute.attributeTypes.map(function (type) {
              return {
                value: type,
                title: 'DG.CaseTable.attribute.type.' + type
              };
            }),
            value: null
          })
        }),

        unitCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.attributeEditor.unit',
          localize: true,
          controlView: SC.TextFieldView.extend({
            layout: {
              width: kControlWidth,
              height: kControlHeight
            },
            backgroundColor: 'white',
            hint: 'DG.TableController.attrEditor.unitHint',
            localize: true
          })
        }),

        precisionCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.attributeEditor.precision',
          localize: true,
          controlView: SC.TextFieldView.extend({
            layout: {width: kControlWidth},
            backgroundColor: 'white',
            validator: SC.Validator.PositiveInteger,
            hint: 'DG.TableController.attrEditor.precisionHint',
            localize: true
          })
        }),

        editableCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.attributeEditor.editable',
          localize: true,
          controlView: SC.RadioView.extend({
            layout: {width: kControlWidth},
            items: [
              { title: 'True', value: true, enabled: true},
              { title: 'False', value: false, enabled: true}
            ],
            value: [true],
            itemTitleKey: 'title',
            itemValueKey: 'value',
            itemIsEnabledKey: 'enabled',
            layoutDirection: SC.LAYOUT_HORIZONTAL,
            localize: true
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
            title: 'DG.AttrFormView.applyBtnTitle', // "Apply"
            target: null,
            action: 'update',
            toolTip: '',
            localize: true,
            isDefault: true
          })
        })
      }),

      attrRefDidChange: function () {
        var attrRef = this.get('attrRef');
        var attr = attrRef.attribute;
        var contentView = this.get('contentView');
        if (attrRef) {
          DG.ObjectMap.forEach(attr, function(key, val) {
            var ctlName = key + 'Ctl';
            // Convert attribute type nominal to categorical
            if (key === 'type' && val === DG.Attribute.TYPE_NOMINAL) {
              val = DG.Attribute.TYPE_CATEGORICAL;
            }
            if (!SC.none(contentView.get(ctlName)) && !SC.none(val)) {
              contentView.setPath(ctlName + '.controlView.value', val);
            }
          }.bind(this));
        }
      }.observes('attrRef'),

      update: function () {
        var attr = {
          name: this.getPath('contentView.nameCtl.controlView.value'),
          description: this.getPath('contentView.descriptionCtl.controlView.value'),
          type: this.getPath('contentView.typeCtl.controlView.value'),
          unit: this.getPath('contentView.unitCtl.controlView.value'),
          precision: this.getPath('contentView.precisionCtl.controlView.value'),
          editable: this.getPath('contentView.editableCtl.controlView.value')
        };
        DG.log('setting attribute: ' + JSON.stringify(attr));
        this.attrUpdater.updateAttribute(this.get('attrRef'), attr);
        this.close();
      },
      close: function () {
        DG.log('Closing Attribute Editor');
        this.remove();
        this.destroy();
      },
      init: function () {
        sc_super();
        this.setPath( 'contentView.applyOrCancelCtl.cancel.target', this );
        this.setPath( 'contentView.applyOrCancelCtl.cancel.action', 'close' );
        this.setPath( 'contentView.applyOrCancelCtl.apply.target', this );
        this.setPath( 'contentView.applyOrCancelCtl.apply.action', 'update' );
        if (this.get('attrRef')) {
          this.attrRefDidChange();
        }
      }
    };
  }())
);
