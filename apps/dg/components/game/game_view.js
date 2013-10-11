// ==========================================================================
//                          DG.GameView
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

sc_require('components/game/game_controller');
sc_require('controllers/game_selection');

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
      // Note that the callbacks use SC.run() to make sure that SproutCore's runloop
      // has a chance to propagate bindings and data changes. See "Why Does SproutCore
      // Have a Run Loop and When Does It Execute?" at 
      // http://frozencanuck.wordpress.com/2010/12/21/why-does-sproutcore-have-a-run-loop-and-when-does-it-execute/
      // for details of why this is necessary. In its concluding paragraph, it states
      // "Therefore the run loop is also used to drive data propagation via binding whenever 
      // an asynchronous event is fired in order to drive the application." These callbacks
      // from the game are just such an asynchronous event, and so must invoke the runloop
      // to operate properly.

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
    } else {
      DG.logWarn("DG.GameView:iframeDidLoad no contentWindow\n");
    }
    sc_super();
  }

});
