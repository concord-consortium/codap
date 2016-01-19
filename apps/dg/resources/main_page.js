// ==========================================================================
//                              DG.mainPage
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

sc_require('views/inspector_view');

// This page describes the main user interface for your application.  
DG.mainPage = SC.Page.design((function() {

  var kButtonWidth = 40,
      kToolbarHeight = 70,
      kInfobarHeight = 0,
      kIconTopPadding = 17;

  // begin compatible browser main page design
  return DG.Browser.isCompatibleBrowser() ? {

  // The main pane is made visible on screen as soon as your app is loaded.
  // Add childViews to this pane for views to display immediately on page load.
  mainPane: SC.MainPane.design({

    sendEvent: function(action, evt, target) {
      if( (action === 'mouseDown' || action === 'touchStart') && this.get('inspectorPicker')) {
        this.get('inspectorPicker').remove();
        this.set('inspectorPicker', null);
      }
      else if( action === 'doubleClick') {
        console.log('doubleClick');
      }
      return sc_super();
    },

    /**
     * When a DG.InspectorPickerPane inits, it sets this property. When we receive a mouseDown,
     * we tell it to remove.
     *
     * @property {DG.InspectorPickerPane}
     */
    inspectorPicker: null,

    childViews: 'navBar topView scrollView inspectorView'.w(),

    containerViewBinding: 'scrollView.contentView',

    navBar: SC.View.design({
      classNames: 'navBar'.w(),
      layout: { height: kInfobarHeight },
      childViews: 'leftSide rightSide'.w(),
      anchorLocation: SC.ANCHOR_TOP,

      leftSide: SC.View.design(SC.FlowedLayout, {
        layout: { width: 0, left: 5, height: kInfobarHeight, zIndex: 1  },
        childViews: 'documentTitle navPopupButton saveNotification'.w(),
        defaultFlowSpacing: { left: 5, right: 5, top: (kInfobarHeight - 18) / 2},
        canWrap: false,
        shouldResizeHeight: false,

        documentTitle: SC.LabelView.design(SC.AutoResize, {
          classNames: 'doc-title'.w(),
          layout: { height: 18 },
          toolTip: 'DG.Document.documentName.toolTip'.loc(),  // "Click to edit document name"
          localize: true,
          needsEllipsis: YES,
          isEditable: YES,
          valueBinding: 'DG._currDocumentController.documentName',
          originalValue: null,
          inlineEditorDidBeginEditing: function(editor, value) {
            this.set('originalValue', value);
          },
          valueChanged: function() {
            var original = this.get('originalValue'),
                newValue = this.get('value');

            if (original) {
              DG.appController.renameDocument(original, newValue);
              this.set('originalValue', null);
            }
            return true;
          }.observes('value'),
          click: function() {
            this.beginEditing();
          }
        }),

        navPopupButton: DG.IconButton.design( {
          layout: { width: 20 },
          flowSpacing: { left: 0, top: -3, right: 5 },
          iconClass: 'moonicon-arrow-expand',
          target: 'DG.appController.fileMenuPane',
          action: 'popup',
          toolTip: 'DG.Document.documentPopup.toolTip',  // "Open, Save, Close, Import, Export, ..."
          localize: true
        }),

        saveNotification: SC.LabelView.design(SC.AutoResize, {
          classNames: ['invisible'],
          layout: { height: 18},
          textAlign: SC.ALIGN_LEFT,
          value: 'DG.mainPage.titleBar.saved',
          localize: true,
          // accommodate error in text width computation
          autoResizePadding: {width: 100}
        })
      }),

      rightSide: SC.View.design(SC.FlowedLayout, {
        layout: { width: 0, right: 0 },
        classNames: 'right-side'.w(),
        childViews: 'statusLabel versionLabel helpButton'.w(),
        align: SC.ALIGN_RIGHT,
        canWrap: false,
        shouldResizeHeight: false,
        defaultFlowSpacing: { top: (kInfobarHeight - 18) / 2 },

        versionLabel: SC.LabelView.design(SC.AutoResize, {
          classNames: 'navBar-version'.w(),
          flowSpacing: { right: 25, top: (kInfobarHeight - 18) / 2 },
          layout: { height: 18 },
          textAlign: SC.ALIGN_RIGHT,
          value: DG.getVariantString('DG.mainPage.mainPane.versionString').loc( DG.VERSION, DG.BUILD_NUM )
        }),

        statusLabel: SC.LabelView.design(SC.AutoResize, {
          classNames: 'navBar-status'.w(),
          layout: { height: 18 },
          flowSpacing: { right: 25, top: (kInfobarHeight - 18) / 2 },
          textAlign: SC.ALIGN_RIGHT,
          currUsernameBinding: 'DG.authorizationController.currLogin.user',
          value: function() {
            return this.get('currUsername');
          }.property('currUsername')
        }),

        helpButton: DG.IconButton.design( {
          layout: { width: 18 },
          flowSpacing: { left: 5, top: 0, right: 5 },
          iconClass: 'moonicon-icon-help',
          target: 'DG.appController',
          action: 'showHelp',
          toolTip: 'DG.ToolButtonData.help.toolTip',  // "Open a web view showing help for CODAP"
          localize: true
        })
      })
    }),

    topView: SC.View.design({
      classNames: 'toolshelf-background'.w(),
      layout: { top: kInfobarHeight, height: kToolbarHeight - 1 },
      childViews: 'iconButtons rightButtons'.w(),

      iconButtons: SC.View.design(SC.FlowedLayout, {
        classNames: 'buttons'.w(),
        layout: { width: 0, height: kToolbarHeight - 1 },
        align: SC.ALIGN_LEFT,
        canWrap: false,
        shouldResizeHeight: false,
        defaultFlowSpacing: { left: 5, top: kIconTopPadding, right: 5 },
        init: function() {
          sc_super();
          // create tool buttons, left-justified
          DG.toolButtons.forEach( function( iButtonName, iIndex ) {
            var tButton = DG.ToolButtonData[iButtonName];
            if( iIndex === 0) {
              tButton.flowSpacing = { left: 10, top: kIconTopPadding, right: 5 };
            }
            tButton.classNames = tButton.classNames || '';
            tButton.classNames = (tButton.classNames + ' toolshelf-button').w();
            this[ iButtonName] = DG.IconButton.create( tButton);
            this[ iButtonName].set('layout', { width: kButtonWidth, height: 40 });
            this.appendChild( this[ iButtonName ]);
          }.bind(this));
        }

      }),

      rightButtons: SC.View.design(SC.FlowedLayout, {
        layout: { top: 0, right: 10, width: 0, height: kToolbarHeight - 1 },
        align: SC.ALIGN_RIGHT,
        canWrap: false,
        shouldResizeHeight: false,
        defaultFlowSpacing: { right: 10, top: kIconTopPadding },
        childViews: 'logoutButton'.w(),

        logoutButton: SC.ButtonView.design({
          layout: { centerY:0, height:24, width:80 },
          localize: true,
          title: (DG.documentServer ? 'DG.Authorization.loginPane.login' : 'DG.mainPage.mainPane.logoutButton.title'), // "Logout"
          target: 'DG.appController',
          action: 'logout',
          userBinding: 'DG.authorizationController.currLogin.user',
          isVisible: function() {
            return DG.documentServer && this.get('user') === 'guest';
          }.property('user'),
          toolTip: (DG.documentServer ? 'DG.Authorization.loginPane.login' : 'DG.mainPage.mainPane.logoutButton.toolTip'),  // "Log out the current user"
          userDidChange: function () {
            var user = this.get('user');
            this.set('title', DG.documentServer && user === 'guest' ?
                'DG.Authorization.loginPane.login' : 'DG.mainPage.mainPane.logoutButton.title'); // "Logout"
          }.observes('user')
        }),
      init: function() {
        sc_super();
          // create right buttons, right-justified
          DG.rightButtons.forEach( function( iButtonName ) {
            var tButton = DG.RightButtonData[iButtonName];
            tButton.classNames.push('toolshelf-button');
            this[ iButtonName] = DG.IconButton.create( tButton);
            this[ iButtonName].set('layout', { width: kButtonWidth/*, height: 40*/ });
            this.appendChild( this[ iButtonName ]);
          }.bind(this));
          DG.currDocumentController().set('guideButton', this.guideButton);
        },
        /**
         * Override this so that the child views will have a height that fits with their icon and label.
         * Without this, the menu for the options popup appears too low.
         * @param iChild {SC.View}
         * @param iLayout {Object}
         */
        applyPlanToView: function( iChild, iLayout) {
          SC.FlowedLayout.applyPlanToView.apply(this, arguments);
          if( iChild.adjustHeight)
            iChild.adjustHeight();
        }
      })

    }), // topView

    scrollView: SC.ScrollView.design({
      layout: { top: kInfobarHeight + kToolbarHeight },
      classNames: 'doc-background'.w(),
      alwaysBounceVertical: false,
      contentView: DG.ContainerView.design( {
      })
    }),
    
    inspectorView: DG.InspectorView.design( {
      classNames: 'inspector-view'.w()
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
      this.setPath('inspectorView.componentContainer', this.getPath('scrollView.contentView'));
      this.invokeLater( 'setupDragDrop', 300);
    },

    setupDragDrop: function() {
      var isIE = (SC.browser.engine === SC.ENGINE.trident);
      var cancel = function( iEvent) {
            if (iEvent.preventDefault) iEvent.preventDefault(); // required by FF + Safari
            iEvent.dataTransfer.dropEffect = 'copy';
            return false; // required by IE
          },
          dragEnter = function( iEvent) {
            cancel( iEvent);
            $(tElement).addClass('dg-receive-outside-drop');
          }.bind( this),
          dragEnd = function( iEvent) {
            cancel( iEvent);
            $(tElement).removeClass('dg-receive-outside-drop');
          }.bind( this);

      var handleDrop = function( iEvent) {

        function adjustTypeBasedOnSuffix() {
          var tRegEx = /\.[^\/]+$/,
              tSuffix = tFile.name.match(tRegEx),
              tNewType = tType;
          if( !SC.empty(tSuffix))
            tSuffix = tSuffix[0];
          switch( tSuffix) {
            case '.csv':
              tNewType = 'text/csv';
              break;
            case '.txt':
              tNewType = 'text/plain';
              break;
            case '.json':
              tNewType = 'application/json';
              break;
          }
          tType = tNewType;
        }

        var tAlertDialog = {
          showAlert: function( iError) {
            DG.AlertPane.show( {
              message: 'DG.AppController.dropFile.error'.loc( iError.message)
            });
          },
          close: function() {
            // Do nothing
          }
        };

        if (iEvent.preventDefault) iEvent.preventDefault(); // required by FF + Safari

        var tDataTransfer = iEvent.dataTransfer,
            tFiles = tDataTransfer.files,
            tURIType = isIE ? 'URL': 'text/uri-list',
            tURI = tDataTransfer.getData(tURIType);
        if( tFiles && (tFiles.length > 0)) {
          var tFile = tFiles[0],  // We only deal with the first file
              tType = tFile.type;
          if( tType === '')
            adjustTypeBasedOnSuffix();

          if( tType === 'application/json') {
            DG.appController.importFileWithConfirmation(tFile, 'JSON', tAlertDialog);
          }
          else if( (tType === 'text/csv')
              || (tType === 'text/plain')
              || (tType === 'text/tab-separated-values')) {
            DG.appController.importFileWithConfirmation(tFile, 'TEXT', tAlertDialog);
          }
        }
        else if( !SC.empty(tURI)) {
          DG.appController.importURL( tURI);
        }
        $(tElement).removeClass('dg-receive-outside-drop');

        return false;
      };

      var tElement = this._view_layer;
      tElement.ondragover = cancel;
      tElement.ondragenter = dragEnter;
      tElement.ondragleave = dragEnd;
      tElement.ondrop = handleDrop;
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
            DG.appController.saveCODAPDocument();
          break;
        case 'alt_ctrl_shift_g':
          DG.gameSelectionController.menuPane.popup();
          break;
        case 'alt_ctrl_c':
          DG.mainPage.toggleCalculator();
          break;
        case 'alt_ctrl_t':
          DG.mainPage.openCaseTablesForEachContext();
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
        case 'ctrl_z':
          DG.UndoHistory.undo();
          break;
        case 'ctrl_y':
        case 'ctrl_shift_z':
          DG.UndoHistory.redo();
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
        4/15/14 (wff) Removed observes('DG.gameSelectionController.currentGame') in order
          to prevent a second gameview from being created during restore document.
          Seems not to be needed at all for choosing from game menu.
     */
  addGame: function() {
    if( !DG.currDocumentController().get('gameView'))
      DG.currDocumentController().addGame( this.scrollView.contentView);
  }//.observes('DG.gameSelectionController.currentGame')
  
  }), // mainPane

    /*
     * DG.mainPage methods
     */

    docView: SC.outlet('mainPane.scrollView.contentView')


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

DG.mainPage.openCaseTablesForEachContext = function () {
  DG.currDocumentController().openCaseTablesForEachContext();
};

DG.mainPage.addMap = function() {
  DG.currDocumentController().addMap( this.get('docView'));
};

DG.mainPage.addSlider = function() {
  return DG.currDocumentController().addSlider( this.get('docView'));
};

DG.mainPage.addGraph = function() {
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

