// ==========================================================================
//                        DG.WebViewController
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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
    theURL: '',

    /**
    Get the menu items from the graph and its components.
      @property { Array of menu items }
    */
    gearMenuItems: function() {
      return [
        { title: "Edit URL", target: this, itemAction: this.editURL, isEnabled: true }
      ];
    }.property(),

    editURL: function() {

      var this_ = this,
          tDialog = null;

      function setURL() {
        // User has pressed OK
        var tURL = tDialog.get('value');
        tDialog.close();
        if( !SC.empty( tURL)) {
          this_.set('theURL', tURL);
        }
      }

      tDialog = DG.CreateSingleTextDialog( {
                      prompt: DG.DocumentController.enterURLPrompt,
                      textValue: this.get('theURL'),
                      textHint: 'URL',
                      okTarget: null,
                      okAction: setURL,
                      okTooltip: DG.DocumentController.enterViewWebPageOKTip
                    });
    },

    createComponentStorage:function () {
      var tURL = this.get('theURL'),
        tStorage = {};
      if( !SC.empty( tURL))
        tStorage.URL = tURL;
      return tStorage;
    },

    restoreComponentStorage:function ( iComponentStorage ) {
      var tURL = iComponentStorage.URL || "";
      this.set('theURL', tURL);
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
    }.observes('view')

});

