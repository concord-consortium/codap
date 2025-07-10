// ==========================================================================
//                        DG.GuideConfigurationView
// 
//  Implements a modal dialog used to configure the Guide menu in the tool shelf
//  
//  Authors:  William Finzer
//
//  Copyright ©2014 Concord Consortium
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

  Implements a modal dialog used to configure the Guide menu in the tool shelf

 @extends SC.PalettePane
 */
DG.GuideConfigurationView = SC.PalettePane.extend(
  /** @scope DG.GuideConfigurationView.prototype */ {

    itemRow: SC.View.extend({
      blurAction: null,
      blurTarget: null,
      childViews: 'itemTitle itemURL'.w(),
        itemTitle: SC.TextFieldView.design({
          hint: 'DG.GuideConfigView.itemTitleHint'
        }),
        itemURL: SC.TextFieldView.design({
          hint: 'DG.GuideConfigView.itemURLHint'
        }),
      init: function() {
        sc_super();
        var tBlurAction = this.get('blurAction' ),
            tBlurTarget = this.get('blurTarget');
        this.setPath( 'itemTitle.layout', { left: 5, width: 140 });
        this.setPath( 'itemURL.layout', { left: 150, right: 5 });
        this.get('childViews' ).forEach( function( iView) {
          iView.set('fieldDidBlur', function() {
            if( tBlurAction)
              tBlurAction.call( tBlurTarget);
          });
        });
      },
      rowObject: function() {
        var tTitle = this.getPath('itemTitle.value' ),
            tURL = this.getPath('itemURL.value' );
        if(!SC.empty(tTitle) || !SC.empty( tURL)) {
          return { itemTitle: tTitle, url: tURL};
        }
        return null;
      }.property(),

      /**
       *
       * @param iItem {Object {itemTitle: {String} url: {String}}
       */
      setItem: function( iItem) {
        if( iItem) {
          this.setPath('itemTitle.value', iItem.itemTitle);
          this.setPath('itemURL.value', iItem.url);
        }
      }
    }),

    model: null,

    isModal: YES,

    layout: { width: 400, height: 400, centerX: 0, centerY: 0 },

    contentView: SC.View.extend( {
      childViews: 'titleField menuItems okButton cancel warning'.w(),
      titleField: SC.TextFieldView.design( {
        layout: { top: 5, left: 5, right: 25, height: 24 },
        value: '',
        spellCheckEnabled: true,
        hint: 'DG.GuideConfigView.titleHint',
        leftAccessoryView: SC.LabelView.create( {
          layout: { left: 1, width: 95, height: 22, centerY: 0 },
          value: 'DG.GuideConfigView.titlePrompt',  // "Guide Title"
          backgroundColor: 'lightgray',
          localize: true
        } )
      } ),
      menuItems: SC.View.design( {
        layout: { left: 5, right: 5, top: 34, bottom: 34 },
        backgroundColor: 'white'
      } ),
      okButton: SC.ButtonView.design( {
        layout: { bottom: 5, right: 5, height: 24, width: 90 },
        titleMinWidth: 0,
        title: 'DG.GuideConfigView.okBtnTitle', // "OK"
        toolTip: 'DG.GuideConfigView.okBtnToolTip',
        target: null,
        action: null,
        localize: true,
        isDefault: true
      } ),
      cancel: SC.ButtonView.design( {
        layout: { bottom: 5, right: 115, height: 24, width: 90 },
        titleMinWidth: 0,
        title: 'DG.GuideConfigView.cancelBtnTitle',  // "Cancel"
        target: null,
        action: null,
        toolTip: 'DG.GuideConfigView.cancelBtnTooltip',  // "Dismiss the dialog without making any changes"
        localize: true,
        isCancel: true
      } ),
      warning: SC.LabelView.design( {
        value: 'DG.GuideConfigView.httpWarning',  // "The URL must start with either http:// or https://"
        classNames: 'dg-guide-alert',
        isVisible: false,
        transitionShow: SC.View.FADE_IN,
        localize: true
      } )
    } ),

    title: function() {
      return this.getPath('contentView.titleField.value');
    }.property(),

    items: function() {
      return this.get('rowObjects');
    }.property(),

    addMenuItemRow: function( iItem) {
      var tMenuItemsView = this.getPath('contentView.menuItems' ),
          tNumRows = this.get('rowViews' ).length,
          tTop = 5 + tNumRows * 27,
          tSection = this.itemRow.create({
            layout: { border: 1, left: 5, right: 5, top: tTop + 5, height: 22 },
            blurAction: this.configureRows,
            blurTarget: this
          });
      tSection.setItem( iItem);
      tMenuItemsView.appendChild( tSection);
    },

    rowViews: function() {
      return this.getPath('contentView.menuItems.childViews' );
    }.property(),

    rowObjects: function() {
      return this.get('rowViews' )
        .map( function( iRowView) {
                return iRowView.get('rowObject');
              } )
        .filter( function( iObject) {
                  return !!iObject;
                });
    }.property(),

    configureRows: function() {

      var checkURLs = function() {
        var tRowObjects = this.get('rowObjects'),
            tWarning = this.getPath('contentView.warning'),
            tTitleLayout = this.getPath('contentView.titleField.layout');
        tWarning.set('isVisible', false);
        tRowObjects.forEach( function( iObject, iIndex) {
          var tUrl = SC.empty(iObject.url) ? '' : iObject.url.toLowerCase();
          if( !SC.empty( tUrl) && (tUrl.indexOf('http://') !== 0) && (tUrl.indexOf('https://') !== 0)) {
            var tItemLayout = this.get('rowViews')[iIndex].get('layout'),
                tItemViewBottom = tTitleLayout.top + tTitleLayout.height + tItemLayout.top + tItemLayout.height - 3;
            tWarning.set('layout', { left: 160, top: tItemViewBottom, height: 12 });
            tWarning.set('isVisible', true);
          }
        }.bind( this));
      }.bind( this);

      var tNumRowViews = this.get('rowViews' ).length,
          tNumRowObjects = this.get('rowObjects').length;

      checkURLs();

      while( tNumRowViews < tNumRowObjects + 1) {
        this.addMenuItemRow();
        tNumRowViews++;
      }
    },

    /**
     *
     * @param iModel {DG.GuideModel}
     */
    setupFromModel: function( iModel) {
      var tModel = this.get('model');
      this.setPath('contentView.titleField.value', tModel.get('title'));
      tModel.get('items' ).forEach( function( iItem) {
        this.addMenuItemRow( iItem);
      }.bind( this));
    },

    /**
     Initialization function.
     */
    init: function () {
      sc_super();
      this.setPath( 'contentView.cancel.target', this );
      this.setPath( 'contentView.cancel.action', 'close' );
      this.setupFromModel();
      this.configureRows();
    },

    /**
     Close the dialog.
     */
    close: function () {
      this.remove();
      this.destroy();
    }
  } );

DG.CreateGuideConfigurationView = function ( iProperties ) {
  var tDialog = DG.GuideConfigurationView.create( iProperties ),
      tContentView = tDialog.get('contentView' ),
      tEditView = tDialog.getPath( 'contentView.titleField' );

  tContentView.setPath('okButton.target', iProperties.okTarget);
  tContentView.setPath('okButton.action', iProperties.okAction);
  tDialog.append();
  tEditView.becomeFirstResponder();

  return tDialog;
};
