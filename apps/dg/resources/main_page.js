// ==========================================================================
//                              DG.mainPage
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

// This page describes the main user interface for your application.  
DG.mainPage = SC.Page.design((function() {

  var
      kToolbarHeight = 44;
  
  // begin compatible browser main page design
  return DG.Browser.isCompatibleBrowser() ? {

  // The main pane is made visible on screen as soon as your app is loaded.
  // Add childViews to this pane for views to display immediately on page load.
  mainPane: SC.MainPane.design({
    childViews: 'topView scrollView'.w(),
    
    topView: SC.ToolbarView.design({
      classNames: 'toolshelf-background'.w(),
      layout: { top: 0, height: kToolbarHeight },
      childViews: 'resetButton logoutButton versionLabel statusLabel'.w(),
      anchorLocation: SC.ANCHOR_TOP,

      resetButton: SC.ButtonView.design({
        layout: { centerY:0, height:24, right:280, width:100 },
        localize: true,
        title: 'DG.AppController.resetData.title', // "Reset Data..."
        target: 'DG.appController',
        action: 'deleteAllCaseData',
        toolTip: 'DG.AppController.resetData.toolTip' // "Delete all data from completed games"
      }),
  
      logoutButton: SC.ButtonView.design({
        layout: { centerY:0, height:24, right:160, width:80 },
        localize: true,
        title: 'DG.mainPage.mainPane.logoutButton.title', // "Logout"
        target: 'DG.appController',
        action: 'logout',
        toolTip: 'DG.mainPage.mainPane.logoutButton.toolTip'  // "Log out the current user"
      }),
  
      versionLabel: SC.LabelView.design({
        layout: { top: 0, height: 24, right: 25, width: 150 },
        controlSize: SC.REGULAR_CONTROL_SIZE,
        fontWeight: SC.BOLD_WEIGHT,
        textAlign: SC.ALIGN_RIGHT,
        value: DG.getVariantString('DG.mainPage.mainPane.versionString').loc( DG.VERSION, DG.BUILD_NUM )
      }),
  
      statusLabel: SC.LabelView.design({
        layout: { bottom: 5, right: 25, width: 100, height: 18 },
        textAlign: SC.ALIGN_RIGHT,
        valueBinding: 'DG.authorizationController.currLogin.user'
      }),
      
      init: function() {
        sc_super();
        var this_ = this,
            tLeft = 10;
        DG.ToolButtonData.forEach( function( iButton) {
          this_[ iButton.name] = DG.IconButton.create( iButton.desc);
          this_[ iButton.name].set('layout', { left: tLeft, width: 40 });
          this_.appendChild( this_[ iButton.name]);
          tLeft += 50;
        });
      }
      
    }), // topView

    scrollView: SC.ScrollView.design({
      layout: { top: kToolbarHeight },
      classNames: 'doc-background'.w(),
      alwaysBounceVertical: false,
      contentView: DG.ContainerView.design( {
      })
    }),
    
    flagsChanged: function( iEvent) {
//    if( iEvent.altKey)
//      console.log('altKey');
//    else
//      console.log('no altKey');
//    this.rootResponder.sendEvent('mouseMoved', iEvent);
    },

    /**
     * Decide whether the topView should be showing
     */
    init: function() {
      sc_super();
      if( DG.componentMode === 'yes') {
        var tScrollView = this.get('scrollView');
        this.setPath('topView.isVisible', false);
        tScrollView.adjust('top', 0);
        tScrollView.set('hasHorizontalScroller', false);
        tScrollView.set('hasVerticalScroller', false);
      }
    },
    
    /**
      The mainPane itself should be the default key view, rather than an arbitrary subview.
      
      When the window gets focus, the mainPane gets a chance to specify the default key view
      (i.e. first responder) via this computed property. (See SC.RootResponder.focus() for details.)
      The base class implementation of nextValidKeyView() returns an arbitrary subview which happens
      to accept firstResponder status. Thus, launching the app results in an arbitrary tool shelf
      button (e.g. Reset Data) having the keyboard focus by default. We fix this and other related
      bugs here by having the mainPane specify that it should be the key view itself rather than
      one of its subviews. If we ever determine that some other view should be the default key
      view (e.g. the game view), this would be the place to specify that.
     */
    nextValidKeyView: function() {
      return this;
    }.property(),

    /**
     * Handle keyboard shortcuts at the document level
     * @param keystring {String}
     * @param evt {Event}
     */
    performKeyEquivalent: function(keystring, evt) {
      var tResult = YES;
      switch( keystring) {
        case 'ctrl_o':
          if( DG.authorizationController.getPath('currLogin.isSaveEnabled'))
            DG.appController.openDocument();
          break;
        case 'ctrl_s':
          if( DG.authorizationController.getPath('currLogin.isSaveEnabled'))
            DG.appController.saveDocument();
          break;
        case 'alt_ctrl_shift_g':
          DG.gameSelectionController.menuPane.popup();
          break;
        case 'alt_ctrl_c':
          DG.mainPage.toggleCalculator();
          break;
        case 'alt_ctrl_t':
          DG.mainPage.toggleCaseTable();
          break;
        case 'alt_ctrl_g':
          DG.mainPage.addGraph();
          break;
        case 'alt_ctrl_s':
          DG.mainPage.addSlider();
          break;
        case 'alt_ctrl_shift_t':
          DG.mainPage.addText();
          break;
        default:
          tResult = sc_super();
      }
      return tResult;
    },
    
    /**
      Creates the specified component and its associated view.
      This is a handler for a sendAction() call. The original
      client calls sendAction() from the gameController.
      @param  {Object}    iSender -- The caller of sendAction()
      @param  {Object}    iContext -- Parameter object from the caller
              {String}      iContext.type -- The type of component to create
                                              e.g. 'DG.GraphView', 'DG.TableView'
     */
    createComponentAndView: function( iSender, iContext) {
      var typeString = iContext.type,
          dotPos = typeString && typeString.indexOf('.'),
          lastWord = dotPos >= 0 ? typeString.slice( dotPos + 1) : null,
          classProto = lastWord && DG[ lastWord],
          componentsOfType = classProto && DG.mainPage.getComponentsOfType( classProto);
      if( !componentsOfType || !componentsOfType.length)
        DG.currDocumentController().createComponentAndView( null, iContext.type);
    },

    /*
      addGame() - Will be called from main after mainPage.mainPane has been
        initialized. We can't describe the flashView as a childView because
        it isn't simple enough; i.e. it requires using DG.ComponentView.
     */
  addGame: function() {
    if( !DG.currDocumentController().get('gameView'))
      DG.currDocumentController().addGame( this.scrollView.contentView);
  }.observes('DG.gameSelectionController.currentGame')
  
  }), // mainPane

    /*
     * DG.mainPage methods
     */

    docView: SC.outlet('mainPane.scrollView.contentView'),

    /*
      updateLayout()
      Lays out the views to accommodate the dimensions of the game.
      Observes DG.gameSelectionController.menuPane.selectedItem so
      that it triggers primarily on user selection of a new game.
     */
    updateLayout: function() {
      var mainPane = this.get('mainPane');
      if (!mainPane)
        return;

      // Auto-update the size for user selection of a new game,
      // but not for restore of a game from document (which sets
      // the 'selectedItem' to null).
      var gameView = DG.currDocumentController().get('gameView');
      if( gameView) {
        var requestedDimensions = DG.gameSelectionController.get('requestedDimensions');
        if( !requestedDimensions) {
          // If specific dimensions were not requested (e.g. not restoring),
          // then we use the default dimensions specified in the DG.GameSpec.
          var gameSize = DG.gameSelectionController.get('currentDimensions'),
              newWidth = gameSize.width + DG.ViewUtilities.horizontalPadding(),
              newHeight = gameSize.height + DG.ViewUtilities.verticalPadding();
          gameView.adjust('width', newWidth);
          gameView.adjust('height', newHeight);
        }
      }
      // If we don't have a game component but we do have a selected menu item,
      // create the game component for the currently selected game.
      else if( DG.gameSelectionController.getPath('menuPane.selectedItem')) {
        this.addGameIfNotPresent();
      }
    }.observes('DG.gameSelectionController.currentDimensions')

  } // end compatible browser mainPage design
  
  : { // begin incompatible browser main page design
    // The main pane is made visible on screen as soon as your app is loaded.
    // Add childViews to this pane for views to display immediately on page load.
    mainPane: SC.MainPane.design({
      childViews: 'messageView'.w(),

      messageView: SC.LabelView.design({
        layout: { centerX: 0, centerY: 0, width: 400, height:300},
        controlSize: SC.LARGE_CONTROL_SIZE,
        fontWeight: SC.BOLD_WEIGHT,
        textAlign: SC.ALIGN_LEFT,
        localize: true,
        value: 'DG.mainPage.mainPane.messageView.value' // "Unfortunately, DG is not currently..."
      })
    }) // mainPane
  }; // end incompatible browser main page design
}()));

DG.mainPage.toggleCalculator = function() {
  DG.currDocumentController().
      toggleComponent( this.get('docView'), 'calcView');
};

DG.mainPage.toggleCaseTable = function() {

  DG.currDocumentController().
      toggleComponent( this.get('docView'), 'caseTableView');
};

DG.mainPage.toggleMap = function() {

  DG.currDocumentController().
      toggleComponent( this.get('docView'), 'mapView');
};

DG.mainPage.addSlider = function() {
  return DG.currDocumentController().addSlider( this.get('docView'));
};

DG.mainPage.addGraph = function() {
  // TO DO: The graph will currently (110828) crash if it's called while the game is still setting up.
  if( !DG.currGameController.get('gameIsReady')) {
    DG.log("DocumentController:addGraph called before gameIsReady.");
    return;
  }

  return DG.currDocumentController().addGraph( this.get('docView'));
};

DG.mainPage.addText = function() {
  return DG.currDocumentController().addText( this.get('docView'));
};

DG.mainPage.addMap = function() {
  return DG.currDocumentController().addMap( this.get('docView'));
};

/* DG.mainPage.getComponentsOfType - Given the prototype class of a type of component, e.g.
  DG.SliderView, return an array containing all of those objects that are content views of
  the document.
*/
DG.mainPage.getComponentsOfType = function( aPrototype) {
  var docView = this.get('docView'),
      tComponentViews = docView && docView.get('childViews'),
      tDesiredViews = tComponentViews && tComponentViews.filter( function( aComponentView) {
                        return aComponentView.contentIsInstanceOf( aPrototype);
                      });
  return tDesiredViews ? tDesiredViews.getEach('contentView') : [];
};

DG.mainPage.closeAllComponents = function() {
  this.get('docView').destroyAllChildren();
};

DG.mainPage.addGameIfNotPresent = function() {
  if( DG.mainPage.mainPane.addGame && (DG.mainPage.getComponentsOfType( DG.GameView).length === 0))
    DG.mainPage.mainPane.addGame();
  // addGameIfNotPresent() is only called on initial presentation of the document,
  // so it's a good time to synchronize the saved change count.
  DG.currDocumentController().updateSavedChangeCount();
};

