// ==========================================================================
//                          DG.DataDisplayController
//
//  Author:   William Finzer
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

  DG.DataDisplayController provides controller functionaly, particular gear menu items,
  for scatter plots.

  @extends SC.Controller
*/
DG.DataDisplayController = DG.ComponentController.extend(
/** @scope DG.DataDisplayController.prototype */ 
  (function() {

    function getCollectionClientFromDragData( iContext, iDragData) {
      var collectionID = iDragData.collection && iDragData.collection.get('id');
      return iContext && !SC.none( collectionID) && iContext.getCollectionByID( collectionID);
    }

    return {
      dataContext: null,
      dataDisplayModel: null,
      legendView: null,
      attributeMenu: null,
      menuAnchorView: null,

      storeDimension: function( iDataConfiguration, iStorage, iDim) {
        var tCollection = iDataConfiguration && iDataConfiguration.get(iDim + 'CollectionClient' ),
            tAttrDesc = iDataConfiguration && iDataConfiguration.get(iDim + 'AttributeDescription' ),
            tAttrs = (tAttrDesc && tAttrDesc.get('attributes')) || [];
        if( tCollection && (tAttrs.length > 0)) {
          iStorage._links_[iDim + 'Coll'] = tCollection.toLink();
          var tKey = iDim + 'Attr';
          tAttrs.forEach( function( iAttr) {
            DG.ArchiveUtils.addLink( iStorage, tKey, iAttr);
          });
        }
        iStorage[iDim + 'Role'] = tAttrDesc.get('role');  // Has a role even without an attribute
        iStorage[iDim + 'AttributeType'] = tAttrDesc.get('attributeType');
      },

      createComponentStorage: function() {
        var storage = { _links_: {} },
            dataContext = this.get('dataContext'),
            dataConfiguration = this.getPath('dataDisplayModel.dataConfiguration'),
            hiddenCases = dataConfiguration && dataConfiguration.get('hiddenCases' );

        if( dataContext)
          storage._links_.context = dataContext.toLink();

        this.storeDimension( dataConfiguration, storage, 'legend');

        if( hiddenCases) {
          storage._links_.hiddenCases = hiddenCases.map( function( iCase) {
            return iCase.toLink();
          });
        }
        return storage;
      },

      restoreComponentStorage: function( iStorage, iDocumentID) {
        var contextID = this.getLinkID( iStorage, 'context'),
            dataContext = null;
        
        if( !SC.none( contextID)) {
          dataContext = DG.DataContext.retrieveContextFromMap( iDocumentID, contextID);
          if( dataContext) {
            this.set('dataContext', dataContext);
            this.setPath('dataDisplayModel.dataConfiguration.dataContext', dataContext);
          }
        }
      },

      /**
      	When our 'dataContext' is changed, we must let our model know.
       */
      dataContextDidChange: function() {
        var dataDisplayModel = this.get('dataDisplayModel');
        if( dataDisplayModel)
          dataDisplayModel.set('dataContext', this.get('dataContext'));
      }.observes('dataContext'),

      /**
        When our model changes, make sure it has the right 'dataContext'.
       */
      modelDidChange: function() {
        // Our model is our component; its content is the graph model
        var dataDisplayModel = this.getPath('model.content');
        this.set('dataDisplayModel', dataDisplayModel);
        if( dataDisplayModel)
          dataDisplayModel.set('dataContext', this.get('dataContext'));
      }.observes('model'),

      init: function() {
        sc_super();

        // To Do: We need to have the menu dynamically compute its layout.
        this.attributeMenu = SC.MenuPane.create( {
                  layout: { width: 200, height: 150 }
                });
        this.attributeMenu.selectedAxis = null;
        this.attributeMenu.addObserver('selectedItem', this,
                        this.attributeMenuItemChanged);
        this.menuAnchorView = SC.View.create( {
                    layout: { left: 0, width: 20, top: 0, height: 20 },
                    backgroundColor: 'transparent',
                    isVisible: false
                  });
      },

      addAxisHandler: function( iAxisView) {
        var this_ = this,
            tNodes = iAxisView.get('labelNodes');

        if( SC.isArray( tNodes)) {
          tNodes.forEach( function( iNode, iIndex) {

            function mouseDownHandler( iEvent) {
              this_.setupAttributeMenu( iEvent, iAxisView, iIndex);
            }

            if( !SC.none( iNode.events))
              iNode.unmousedown( mouseDownHandler); // In case it got added already
            iNode.mousedown( mouseDownHandler);
          });
        }
      },

      /**
        An axis view has been assigned to the property named iPropertyKey.
        We want to hook up to its labelNode so that clicking on it will bring
        up an attribute menu.
      */
      axisViewChanged: function( iThis, iPropertyKey) {
        var this_ = this,
            tView = this.get( iPropertyKey);
        if( !SC.none( tView))
          tView.addObserver( 'labelNode', this,
              function() {
                this_.addAxisHandler( tView);
              });
      }.observes('xAxisView', 'yAxisView', 'y2AxisView', 'legendView'),

      setupAttributeMenu: function( event, iAxisView, iAttrIndex) {
        var tDataDisplayModel = this.get('dataDisplayModel'),
            tMenuLayout = { left: event.layerX, top: event.layerY, height: 20, width: 20 },
            tOrientation = iAxisView.get('orientation'),
            // The following parameter is supposed to specify the preferred position of the menu
            // relative to the anchor. But it doesn't seem to have any effect.
            // SC.POINTER_LAYOUT = ["perfectRight", "perfectLeft", "perfectTop", "perfectBottom"];
            tPreferMatrix = (tOrientation === 'horizontal') ?
                    [ 0, 2, 1, 3, 0 ] :
                    [ 0, 1, 3, 2, 0],
            tAxisKey = '',
            tMenuItems;

        if( iAxisView.instanceOf( DG.LegendView))
          tAxisKey = 'legend';
        else {
          switch( tOrientation) {
            case 'horizontal':
              tAxisKey = 'x';
              break;
            case 'vertical':
              tAxisKey = 'y';
              break;
            case 'vertical2':
              tAxisKey = 'y2';
              break;
          }
        }

        tMenuItems = this.getAttributeMenuItems();
        // WARNING: before we added this separator, the "Remove Attribute" menu item had a bug where it would not respond correctly
        // on the first click.  It appears that SC.MenuItemView.mouseUp() gets a null 'targetMenuItem' at that point,
        // which prevents our menu handler from being called.  This may or may not a bug related to the submenu just above this point.
        // --Craig and Kirk 2012-06-07
        tMenuItems.push( { isSeparator: YES } );
        var kNotForSubmenu = false;
        tMenuItems.push( tDataDisplayModel.createRemoveAttributeMenuItem( tAxisKey, kNotForSubmenu, iAttrIndex ));
        if( tAxisKey !== 'y2')
          tMenuItems.push( tDataDisplayModel.createChangeAttributeTypeMenuItem( tAxisKey, kNotForSubmenu, iAttrIndex ));
        this.attributeMenu.set( 'items', tMenuItems);
        this.attributeMenu.selectedAxis = tOrientation;
        this.attributeMenu.isLegend = iAxisView.instanceOf( DG.LegendView);

        // We need SC to accomplish the layout of the anchor view before we
        // show the popup menu. Initiating and ending a runloop seems to be one way
        // to accomplish this.
        SC.RunLoop.begin();
          this.menuAnchorView.removeFromParent();
          iAxisView.appendChild( this.menuAnchorView);
          this.menuAnchorView.set('layout', tMenuLayout);
          this.menuAnchorView.set('isVisible', true);
        SC.RunLoop.end();
        this.attributeMenu.popup( this.menuAnchorView, tPreferMatrix);
      },

      getAttributeMenuItems: function() {

        var tChildCollection = this.getPath('dataContext.childCollection'),
            tChildCollectionName = tChildCollection && tChildCollection.get('name'),
            tChildNames = tChildCollection ? tChildCollection.getAttributeNames() : [],
            tChildItems = tChildNames.map(
                            function( aName) {
                              return { title: aName, collection: tChildCollection };
                            }),
            tParentCollection = this.getPath('dataContext.parentCollection'),
            tParentCollectionName = tParentCollection && tParentCollection.get('name'),
            tParentNames = tParentCollection ? tParentCollection.getAttributeNames() : [],
            tParentItems = tParentNames.map(
                              function( aName) {
                                return { title: aName, collection: tParentCollection };
                              });
        if( tParentItems.length === 0) {
          return tChildItems;
        }
        else if (tChildItems.length === 0) {
          return tParentItems;
        }
        else
          return [ { title: tChildCollectionName, subMenu: tChildItems },
                    { title: tParentCollectionName, subMenu: tParentItems } ];
      },

      /** 
        Handle a 'Change...' or 'Remove {location} Attribute' menu item.
        Menu items set up by setupAttributeMenu()
      */
      attributeMenuItemChanged: function() {
        var tNewItem = this.attributeMenu.selectedItem,
            tCollectionClient = tNewItem && tNewItem.collection,
            tAxisOrientation = this.attributeMenu.selectedAxis,
            tAttrRefs,
            tDataDisplayModel = this.get('dataDisplayModel'),
            tDataContext = this.get('dataContext');
        if( ! tNewItem )
          return;
        if( tCollectionClient ) {
          // change attribute
          tAttrRefs = { collection: tCollectionClient,
                       attributes: [tCollectionClient.attrsController.objectAt( tNewItem.contentIndex)] };
          if( this.attributeMenu.isLegend)
            tDataDisplayModel.changeAttributeForLegend( tDataContext, tAttrRefs);
          else
            tDataDisplayModel.changeAttributeForAxis( tDataContext, tAttrRefs, tAxisOrientation);
        } else if ( tNewItem.target === tDataDisplayModel ) {
          // remove or change attribute
          tNewItem.itemAction.apply( tNewItem.target, tNewItem.args );
        }
        this.menuAnchorView.set('isVisible', false);
      },

      /**
        The plot or legend view has received a drop of an attribute. Our job is to forward this properly on to
        the graph so that the configuration can be changed.
      */
      plotOrLegendViewDidAcceptDrop: function( iView, iKey, iDragData) {
        if( SC.none(iDragData)) // The over-notification caused by the * in the observes
          return;       // means we get here at times there isn't any drag data.

        var tDragContext = iDragData.context;
        if (!SC.none(tDragContext) && (tDragContext !== this.get('dataContext'))) {
          this.get('dataDisplayModel').reset();
          this.set('dataContext', tDragContext);
        }

        var tDataContext = this.get('dataContext'),
            tCollectionClient = getCollectionClientFromDragData(tDataContext, iDragData);

        iView.dragData = null;

        this.get('dataDisplayModel').changeAttributeForLegend(
                  tDataContext,
                  { collection: tCollectionClient,
                    attributes: [ iDragData.attribute ]});
        DG.dirtyCurrentDocument();
      }.observes('*plotView.dragData', '*legendView.dragData', '*mapView.dragData'),

      convertToImage: function(svgs, x, y, width, height) {

        var getCSSText = function () {
          var text = [], ix, jx;
          for (ix = 0; ix < document.styleSheets.length; ix += 1) {
            var styleSheet = document.styleSheets[ix];
            var rules = styleSheet.rules || styleSheet.cssRules;
            for (jx = 0; jx < rules.length; jx += 1) {
              var rule = rules[jx];
              text.push(rule.cssText);
            }
          }
          return text.join('\n');
        };

        var makeDataURLFromSVGElement = function (svgEl) {
          var svgClone = $(svgEl).clone();
          var css = $('<style>').text(getCSSText());
          svgClone.prepend(css);
          var svgData = new XMLSerializer().serializeToString( svgClone[0] );
          // The use of unescape and encodeURIComponent are part of a well-
          // known hack work around btoa's handling of unicode characters.
          // see, eg:
          // http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
          return "data:image/svg+xml;base64,"
            + window.btoa(window.unescape(window.encodeURIComponent(svgData)));
        };

        /**
         * Create a canvas element with a white background. Not yet appended to
         * the DOM.
         * @param {number} width
         * @param {number} height
         * @returns {Canvas}
         */
        var makeCanvasEl = function (width, height) {
          var canvas = $( "<canvas>").prop({width: width, height: height})[0];
          var ctx = canvas.getContext( "2d" );
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          return canvas;
        };

        /**
         * Add an image to the canvas at the specified location.
         * @param {Canvas} canvas DOM Element
         * @param {img} image DOM Element
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */
        var addImageToCanvas = function (canvas, image, x, y, width, height) {
          var ctx = canvas.getContext( "2d" );
          ctx.drawImage( image, x, y, width, height);
        };

        /**
         * Convert a canvas object to a blob.
         * @param canvas
         * @returns {*}
         */
        var makeCanvasBlob = function(canvas) {
          var canvasDataURL = canvas.toDataURL( "image/png" );
          var canvasData = atob( canvasDataURL.substring( "data:image/png;base64,".length ) );
          var canvasAsArray = new Uint8Array(canvasData.length);

          for( var i = 0, len = canvasData.length; i < len; ++i ) {
            canvasAsArray[i] = canvasData.charCodeAt(i);
          }

          return new Blob([ canvasAsArray.buffer ], {type: "image/png"} );
        };

        /**
         * @returns a promise of an image.
         * @param dataURL
         */
        var makeSVGImage = function (dataURL) {
          var promise = new Promise(function (resolve, reject) {
              try{
                var img = $('<img/>')[0];
                img.onload = function () {
                  resolve(img);
                };
                img.src = dataURL;
              } catch (ex) {
                reject(ex);
              }
            }
          );
          return promise;
        };

        var saveImage = function (pngObject) {
          var saveImageFromDialog = function () {
            var rawDocName = tDialog.get('value');
            var docName = (/.*\.png$/.test(rawDocName))
              ? rawDocName
              : (rawDocName + '.png');

            if (!SC.empty(docName)) {
              docName = docName.trim();
              window.saveAs(pngObject, docName);
            }

            // Close the open/save dialog.
            tDialog.close();
          };
          var tDialog = DG.CreateSingleTextDialog({
            prompt: 'DG.AppController.exportDocument.prompt'.loc() +
            " (Safari users may need to control-click <a href=\"" + pngObject +
            "\">this link</a>)",
            escapePromptHTML: false,
            okTitle: 'DG.AppController.saveDocument.okTitle', // "Save"
            okTooltip: 'DG.AppController.saveDocument.okTooltip', // "Save the document with the specified name"
            okAction: function () {
              saveImageFromDialog();
            },
            cancelVisible: true
          });
        };

        var canvas = makeCanvasEl(width, height);
        var promises = [];

        //if (imgs) {
        //  imgs.forEach(function (img) {
        //    var width = img.width;
        //    var height = img.height;
        //    var left = img.offsetParent? img.offsetParent.offsetLeft: (img.parentElement? img.parentElement.offsetLeft: 0);
        //    var top = img.offsetParent? img.offsetParent.offsetTop: (img.parentElement? img.parentElement.offsetTop: 0);
        //    // copy image? I don't think it is necessary
        //    addImageToCanvas(canvas, img, left, top, width, height);
        //  });
        //}

        // for each svg we calculate its geometry, then add it to the canvas
        // through a promise.
        if (svgs) {
          svgs.forEach(function (svg) {
            var width = svg.offsetWidth || svg.width.baseVal.value;
            var height = svg.offsetHeight || svg.height.baseVal.value;
            var left = svg.offsetParent? svg.offsetParent.offsetLeft: (svg.parentElement? svg.parentElement.offsetLeft: 0);
            var top = svg.offsetParent? svg.offsetParent.offsetTop: (svg.parentElement? svg.parentElement.offsetTop: 0);
            var imgPromise = makeSVGImage(makeDataURLFromSVGElement(svg));
            imgPromise.then(function(img) {
                addImageToCanvas(canvas, img, left, top, width, height);
              },
              function (error) {
                DG.logError(error);
              }
            );
            promises.push(imgPromise);
          });
        }

        // when all promises have been fulfilled we make a blob, then invoke the
        // save image dialog.
        Promise.all(promises).then(function () {
            return makeCanvasBlob(canvas);
          },
          function (error) {
            DG.logError(error);
          }
        ).then(function (blob) {
            saveImage(blob);
          });
      }


    };

  }()) // function closure
);

