// ==========================================================================
//                          DG.GameView
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

/* globals iframePhone */
sc_require('components/game/game_controller');
sc_require('controllers/game_selection');
sc_require('libraries/iframe-phone');

/** @class

  (Document Your View Here)

  @extends SC.WebView
*/
DG.GameView = SC.WebView.extend(
/** @scope DG.GameView.prototype */ {

  // Bind the 'value' property of the WebView, which determines
  // the URL of the page that is displayed, to the 'currentURL'
  // property of the global DG.gameSelectionController. If we
  // ever wanted to support multiple game instances in a single
  // document, we would need to bind to something like a
  // providerContext.currentUrl, where providerContext is an
  // instance of the DG.ProviderContext class, and a single
  // document can contain multiple DG.ProviderContext instances.
  valueBinding: 'DG.gameSelectionController.currentUrl',

  // Setup iframePhone communication with the child iframe before it loads, so that connection
  // (iframe src will change when 'value' changes, but observers fire before bindings are synced)
  valueDidChange: function() {
    var value = this.get('value');

    if (value !== this._previousValue) {

      // First discontinue listening to old game.
      if (DG.gamePhone) {
        DG.gamePhone.disconnect();
      }

      DG.gamePhone = new iframePhone.IframePhoneRpcEndpoint(

        // TODO put this handler function somewhere appropriate rather than inlining it in (what is
        // at notionally) view code?

        function(command, callback) {
          var ret = DG.doCommand(command);

          // Analysis shows that the object returned by DG.doCommand may contain Error values, which
          // are not serializable and thus will cause DataCloneErrors when we call 'callback' (which
          // sends the 'ret' to the game window via postMessage). The 'requestFormulaValue' and
          // 'requestAttributeValues' API commands are the guilty parties. The following is an
          // ad-hoc attempt to clean up the object for successful serialization.

          if (ret && ret.error && ret.error instanceof Error) {
            ret.error = ret.error.message;
          }

          if (ret && ret.values && ret.values.length) {
            ret.values = ret.values.map(function(value) {
              return value instanceof Error ? null : value;
            });
          }

          // If there's a DataCloneError anyway, at least let the client know something is wrong:
          try {
            callback(ret);
          } catch (e) {
            if (e instanceof window.DOMException && e.name === 'DataCloneError') {
              callback({ success: false });
            }
          }
        },
        'codap-game',
        this.$('iframe')[0],
        DG.gameSelectionController.getPath('currentGame.origin')
      );

      // Let games/interactives know that they are talking to CODAP, specifically (rather than any
      // old iframePhone supporting page) and can use its API.
      DG.gamePhone.call({ message: "codap-present" });
    }

    this._previousValue = value;

  }.observes('value'),

  destroy: function() {
    DG.gameSelectionController.gameViewWillClose();
    sc_super();
  },

  iframeDidLoad: function()
  {
    var iframe = this.$('iframe')[0];

    if (iframe && iframe.contentWindow) {
      var contentWindow = iframe.contentWindow,
          target = DG.currGameController;

      // Allow the iframe to take over the entire screen (requested by InquirySpace)
      $(iframe ).attr('allowfullscreen', true)
        .attr('webkitallowfullscreen', true)
        .attr('mozallowfullscreen', true);

      // Assign the callback functions as properties of the iframe's contentWindow.
      //
      // Note that the callbacks use SC.run() to make sure that SproutCore's runloop
      // has a chance to propagate bindings and data changes. See "Why Does SproutCore
      // Have a Run Loop and When Does It Execute?" at
      // http://frozencanuck.wordpress.com/2010/12/21/why-does-sproutcore-have-a-run-loop-and-when-does-it-execute/
      // for details of why this is necessary. In its concluding paragraph, it states
      // "Therefore the run loop is also used to drive data propagation via binding whenever
      // an asynchronous event is fired in order to drive the application." These callbacks
      // from the game are just such an asynchronous event, and so must invoke the runloop
      // to operate properly.
      //
      // Furthermore, note that these callbacks cannot be added, and an exception will be thrown, if
      // the game is hosted on another domain. Ignore that because we use HTML5 Web Messaging
      // ("postMessage") via IframePhone to talk to these games, which do not require the callbacks
      // below.

      try {

        // TODO: Eliminate all callbacks but DoCommand() once clients no longer call them.

        // NewCollectionWithAttributes
        contentWindow.NewCollectionWithAttributes =
          function(iCollectionName, iAttributeNames) {
            SC.run( function() {
                      target.newCollectionWithAttributes(iCollectionName,iAttributeNames);
                    });
          };

        // AddCaseToCollectionWithValues
        contentWindow.AddCaseToCollectionWithValues =
          function(iCollectionName, iValues) {
            SC.run( function() {
                      target.addCaseToCollectionWithValues(iCollectionName,iValues);
                    });
          };

        // LogUserAction
        contentWindow.LogUserAction =
          function(iActionString, iValues) {
            SC.run( function() {
                      target.logUserAction(iActionString,iValues);
                    });
          };

        // DoCommand
        contentWindow.DoCommand =
          function(iCmd) {
            var result;
            SC.run( function() {
                      result = target.doCommand(iCmd);
                    });
            return SC.json.encode( result);
          };
      } catch (e) {
        // e should be a SecurityError but I haven't found documentation regarding how standard
        // that error type is.
      }
    } else {
      DG.logWarn("DG.GameView:iframeDidLoad no contentWindow\n");
    }
    sc_super();
  }

});
