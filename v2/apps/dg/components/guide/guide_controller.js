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

    reset: function() {
      this.guideModel.reset();
      this.set('view', null); // because it gets destroyed in closeAllComponents, so we don't want to hang onto it
    },

    updateViewTitle: function() {
      var tTitle = this.getPath('guideModel.title');
      this.setPath('view.title', tTitle);
    }.observes('guideModel.title'),

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

    isVisibleDidChange: function () {
      var tComponentView = this.get('view');
      var visibility = this.getPath('guideModel.isVisible');
      if (!SC.none(visibility) && tComponentView) {
        if (visibility) {
          tComponentView.set('isVisible', true);
          tComponentView.select();
          tComponentView.scrollToVisible();
        }
        else {
          tComponentView.set('isVisible', false);
        }
      }
    }.observes('guideModel.isVisible'),

    willCloseComponent: function () {
      this.setPath('guideModel.isVisible', false);
    },

    showGuide: function() {
      DG.UndoHistory.execute(DG.Command.create({
        name: 'guide.show',
        undoString: 'DG.Undo.guide.show',
        redoString: 'DG.Redo.guide.show',
        log: 'Show guide',
        execute: function() {
          this.setPath('guideModel.isVisible', true);
        }.bind(this),
        undo: function() {
          this.setPath('guideModel.isVisible', false);
        }.bind(this)
      }));
    },

    guideNavigation: function() {
      var this_ = this,
          tUrl = this_.getPath('guideMenuPane.selectedItem.url' ),
          tItemTitle = this_.getPath('guideMenuPane.selectedItem.title' ),
          tItemIndex = this_.getPath('guideMenuPane.selectedItem.index' );

      DG.UndoHistory.execute(DG.Command.create({
        name: 'guide.navigate',
        undoString: 'DG.Undo.guide.navigate',
        redoString: 'DG.Redo.guide.navigate',
        _previous: {
          index: this_.getPath('guideModel.currentItemIndex'),
          wasVisible: this_.getPath('view.isVisible')
        },
        execute: function() {
          // Guides are singletons that are never destroyed, so it's ok to reference the view directly
          this_.setPath('guideModel.currentItemIndex', tItemIndex);
          this_.showGuide();
          this.log = "Guide icon navigation: { Title: %@, itemTitle: %@, url: %@ }".fmt(this_.getPath('guideModel.title'), tItemTitle, tUrl);
        },
        undo: function() {
          this_.setPath('guideModel.currentItemIndex', this._previous.index);
          this_.setPath('view.isVisible', this._previous.wasVisible);
        }
      }));
    },

    /**
    Get the menu items from the graph and its components.
      @property { Array of menu items }
    */
    iconMenuItems: function() {
      var tItems = this.getPath('guideModel.items' ),
          tMenuItems = [],
          kAction = 'guideNavigation';
      tItems.forEach( function( iItem, ix) {
                tMenuItems.push({ title: iItem.itemTitle, url: iItem.url,
                                  index: ix, target: this, action: kAction });
              }.bind( this));
      return tMenuItems;
    }.property(),

    viewDidChange: function() {
      if( !SC.none( this.tempIsVisible))
        this.setPath('view.isVisible', this.tempIsVisible);
      this.tempIsVisible = undefined;
      this.updateViewTitle();
    }.observes('view'),

    createComponentStorage:function () {
      var tStorage = this.get('guideModel' ).createComponentStorage();
      tStorage.isVisible = this.getPath('guideModel.isVisible' );
      return tStorage;
    },

    restoreComponentStorage:function ( iComponentStorage ) {
      sc_super();
      this.get('guideModel' ).restoreComponentStorage( iComponentStorage);
    }

});

