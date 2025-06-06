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
    /** @scope DG.AttributeEditorView.prototype */ {
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
      classNames: 'dg-inspector-picker'.w(),
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
          toolTip: 'DG.TableController.attrEditor.typeHint',
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
          toolTip: 'DG.TableController.attrEditor.unitHint',
          controlView: SC.TextFieldView.extend({
            layout: {
              width: kControlWidth,
              height: kControlHeight
            },
            backgroundColor: 'white',
            localize: true
          })
        }),

        precisionCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight * 1.5},
          label: 'DG.CaseTable.attributeEditor.precision',
          localize: true,
          controlView: SC.SelectView.extend({
            layout: {
              width: kControlWidth,
              height: 24
            },
            itemTitleKey: 'title',
            itemValueKey: 'value'
          })
        }),

        editableCtl: DG.PickerControlView.design({
          layout: {height: kRowHeight},
          label: 'DG.CaseTable.attributeEditor.editable',
          localize: true,
          toolTip: 'DG.TableController.attrEditor.editableHint',
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

      typeDidChange: function() {
        this.updatePrecisionMenu( this.getPath('contentView.typeCtl.controlView.value'),
            this.getPath('attrRef.attribute.precision'));
      }.observes('contentView.typeCtl.controlView.value'),

      updatePrecisionMenu: function( iType, iPrecisionValue) {
        var tNumericPrecisions = [' ','0','1','2','3','4','5','6','7','8'],
            tDatePrecisions = DG.Attribute.datePrecisionOptions;

        function isValueOfGivenType() {
          var result = false;
          if( iType === 'date')
            result = tDatePrecisions.indexOf( iPrecisionValue) >= 0;
          else
            result = tNumericPrecisions.indexOf( String(iPrecisionValue)) >= 0;
          return result;
        }

        var control = this.getPath('contentView.precisionCtl.controlView'),
            precisionList;
        control.set('isEnabled', true);
        if( isValueOfGivenType())
          control.set('value', String(iPrecisionValue));
        else control.set('value', '');
        this.setPath('contentView.precisionCtl.toolTip', 'DG.TableController.attrEditor.precisionNumericHint'.loc());
        switch (iType) {
          case 'numeric':
          case 'none':
            precisionList = tNumericPrecisions.map(function (iInteger) {
              return {
                value: iInteger.trim(),
                title: iInteger
              };
            });
            break;
          case 'date':
            precisionList = "DG.CaseTable.attributeEditor.datePrecisionOptions".loc().w();
            precisionList.unshift(" ");
            precisionList = precisionList.map(function (iOption, iIndex) {
              var tValue = DG.Attribute.datePrecisionOptions[iIndex];
              return {
                value: tValue,
                title: iOption
              };
            });
            this.setPath('contentView.precisionCtl.toolTip', 'DG.TableController.attrEditor.precisionDateHint'.loc());
            break;
          default:
            control.set('isEnabled', false);
        }
        control.set('items', precisionList);
      },

      attrRefDidChange: function () {
        var attrRef = this.get('attrRef');
        var attr = attrRef.attribute;
        var contentView = this.get('contentView');
        if (attrRef) {
          DG.ObjectMap.forEach(attr.toArchive(), function(key, val) {
            var ctlName = key + 'Ctl';
            // Don't allow non-renameable attributes to be renamed
            if (key === 'name') {
              var isEditable = attr.get('renameable');
              contentView.setPath('nameCtl.controlView.enabledState',
                                  isEditable ? SC.CoreView.ENABLED : SC.CoreView.DISABLED);
            }
            // Convert attribute type nominal to categorical
            if (key === 'type' && val === DG.Attribute.TYPE_NOMINAL) {
              val = DG.Attribute.TYPE_CATEGORICAL;
            }
            if (!SC.none(contentView.get(ctlName)) && !SC.none(val)) {
              contentView.setPath(ctlName + '.controlView.value', val);
            }
          }.bind(this));
          this.updatePrecisionMenu(this.getPath('contentView.typeCtl.controlView.value'),
              this.getPath('attrRef.attribute.precision'));
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
