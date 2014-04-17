// ==========================================================================
//                        DG.GuideController
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

sc_require('controllers/component_controller');
sc_require('utilities/string_utilities');

/** @class

  Coordinates save and restore for the GuideModel singleton.

  @extends DG.ComponentController
*/
DG.GuideController = DG.ComponentController.extend(
/** @scope DG.GuideController.prototype */ {

    /**
     *  @property {DG.GuideModel}
     */
    guideModel: null,

    guideButton: null,

    guideMenuPane: null,

    updateViewTitle: function() {
      var tTitle = this.getPath('guideModel.title'),
          tCurrentItemTitle = this.getPath('guideModel.currentItemTitle' );
      this.setPath('view.title', tTitle + (SC.empty( tCurrentItemTitle) ? '' : ' - ' + tCurrentItemTitle));
    }.observes('guideModel.title', 'guideModel.currentItemTitle'),

    modelContentsDidChange: function() {
      var tTitle = this.getPath('guideModel.title' ),
          tItems = this.getPath('guideModel.items' ),
          tIconMenuItems = this.get('iconMenuItems' ),
          tButton = this.get('guideButton' ),
          tPane = this.get('guideMenuPane' ),
          tHasContent = !SC.empty( tTitle) || (tItems.length > 0),
          tCurrentURL = this.getPath('guideModel.currentURL');
      if( tButton)
        tButton.set('isVisible', tHasContent);
      if( tPane) {
        var tShowGuide = 'DG.ToolButtonData.guideMenu.showGuide'.loc(),
            tMenuItems = [ { title: tShowGuide, isEnabled: true, target: this, action: 'showGuide' },
                          { isSeparator: true }];
        tPane.set('items', tMenuItems.concat( tIconMenuItems));
      }
      // Set the currentURL to the first in the list
      if( (tIconMenuItems.length > 0) && SC.empty( tCurrentURL)) {
        var tFirstItem = tIconMenuItems[ 0];
        this.setPath('guideModel.currentURL', tFirstItem.url);
        this.setPath('guideModel.currentItemTitle', tFirstItem.title);
      }
    }.observes('guideModel.title', 'guideModel.items'),

    showGuide: function() {
      var tComponentView = this.get('view');
      tComponentView.setPath('isVisible', true);
      tComponentView.bringToFront();
      tComponentView.scrollToVisible();
    },

    guideNavigation: function() {
      var tUrl = this.getPath('guideMenuPane.selectedItem.url' ),
          tItemTitle = this.getPath('guideMenuPane.selectedItem.title' );
      this.setPath('guideModel.currentURL', tUrl);
      this.setPath('guideModel.currentItemTitle', tItemTitle);
      this.showGuide();
      DG.logUser( "Guide icon navigation: { Title: %@, itemTitle: %@, url: %@ }",
                  this.getPath('guideModel.title'), tItemTitle, tUrl);
    },

    /**
    Get the menu items from the graph and its components.
      @property { Array of menu items }
    */
    gearMenuItems: function() {
      var tItems = this.getPath('guideModel.items' ),
          tMenuItems = [],
          tAction = function( iItem) {
            this.setPath('guideModel.currentURL', iItem.url);
            this.setPath('guideModel.currentItemTitle', iItem.itemTitle);
            DG.logUser( "Guide gear navigation: { Title: %@, itemTitle: %@, url: %@ }",
                        this.getPath('guideModel.title'), iItem.itemTitle, iItem.url);
          }.bind( this);

      tItems.forEach( function( iItem) {
                tMenuItems.push({ title: iItem.itemTitle, url: iItem.url,
                                  target: this, itemAction: tAction,
                                  args: [iItem]});
              }.bind( this));
      return tMenuItems;
    }.property('guideModel.items'),

    /**
    Get the menu items from the graph and its components.
      @property { Array of menu items }
    */
    iconMenuItems: function() {
      var tItems = this.getPath('guideModel.items' ),
          tMenuItems = [],
          kAction = 'guideNavigation';
      tItems.forEach( function( iItem) {
                tMenuItems.push({ title: iItem.itemTitle, url: iItem.url,
                                  target: this, action: kAction });
              }.bind( this));
      return tMenuItems;
    }.property(),

    viewDidChange: function() {
      if( !SC.none( this.tempIsVisible))
        this.setPath('view.isVisible', this.tempIsVisible);
      this.tempIsVisible = undefined;
    }.observes('view'),

    createComponentStorage:function () {
      var tStorage = this.get('guideModel' ).createComponentStorage();
      tStorage.isVisible = this.getPath('view.isVisible' );
      return tStorage;
    },

    restoreComponentStorage:function ( iComponentStorage ) {
      this.get('guideModel' ).restoreComponentStorage( iComponentStorage);
      if( !SC.none( iComponentStorage.isVisible))
        this.tempIsVisible = iComponentStorage.isVisible;
    }

});

