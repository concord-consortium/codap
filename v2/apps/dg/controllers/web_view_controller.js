// ==========================================================================
//                        DG.WebViewController
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

  Coordinates save and restore for web views.

  @extends DG.ComponentController
*/
DG.WebViewController = DG.ComponentController.extend(
/** @scope DG.WebViewController.prototype */ {

  /**
   *  The URL the WebView is viewing.
   *  This property is bound to the 'value' property of the WebView.
   *  @property {String}
   */
  theURL: function (k, v) {
    if (!SC.none(v)) {
      this.setPath('model.content.URL', v);
    }
    return this.getPath('model.content.URL');
  }.property(),

  theURLDidChange: function () {
    this.notifyPropertyChange('theURL');
  }.observes('model.content.URL'),

  title: 'DG.WebView.defaultTitle'.loc(),

  /**
   *
   * @returns {Array}
   */
  createInspectorButtons: function() {
    var tButtons = sc_super();
    tButtons.push(DG.IconButton.create({
          layout: {width: 32},
          classNames: 'dg-web-view-url'.w(),
          iconClass: 'moonicon-icon-mediaTool',
          showBlip: false,
          target: this,
          action: 'editURL',
          toolTip: 'DG.Inspector.webViewEditURL.toolTip',
          localize: true
        })
    );
    return tButtons;
  },

  editURL: function() {

    var this_ = this,
        tDialog = null;

    function setURL() {
      // User has pressed OK: can only do so if non-empty
      var tURL = tDialog.get('value');
      tDialog.close();
      this_.set('theURL', tURL);
    }

    tDialog = DG.CreateSingleTextDialog( {
                    prompt: 'DG.DocumentController.enterURLPrompt',
                    textValue: this_.get('theURL'),
                    textHint: 'URL',
                    okTarget: null,
                    okAction: setURL,
                    okTooltip: DG.DocumentController.enterViewWebPageOKTip
                  });
  },

  createComponentStorage:function () {
    var tURL = this.get('theURL'),
      tStorage = {
        title: this.title
      };
    if( !SC.empty( tURL))
      tStorage.URL = tURL;
    return tStorage;
  },

  restoreComponentStorage:function ( iComponentStorage ) {
    var tURL = iComponentStorage.URL || "";
    this.set('theURL', tURL);
    this.set('title', iComponentStorage.title);
  },

  /**
   *  Called when the view is connected to the controller.
   */
  viewDidChange: function() {
    // Bind the contents of the webView to our 'theURL' property.
    var tWebView = this.getPath('view.containerView.contentView');
    if( tWebView) {
      if( SC.empty( this.theURL)) // then it's safe to stuff it with the web view's URL
        this.set('theURL', tWebView.get('value'));
      tWebView.bind('value', this, 'theURL');
      tWebView.set('controller', this);
    }
  }.observes('view.containerView.contentView')

});

