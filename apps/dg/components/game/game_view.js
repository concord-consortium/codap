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

sc_require('components/game/game_controller');
sc_require('views/web_view');

/** @class
 *
 *  A container for a Data Interactive.
 *
 * @extends DG.WebView
 */

DG.GameView = (function () {
  function formatDragData (op, iDragData, pos) {
    return {
      action: 'notify',
      resource: 'dragDrop[attribute]',
      values: {
        operation: op,
        text: iDragData.text,
        attribute: {
          id: iDragData.attribute.get('id'),
          name: iDragData.attribute.get('name'),
          title: iDragData.attribute.get('title')
        },
        collection: {
          id: iDragData.collection.get('id'),
          name: iDragData.collection.get('name'),
          title: iDragData.collection.get('title')
        },
        context: {
          id: iDragData.context.get('id'),
          name: iDragData.context.get('name'),
          title: iDragData.context.get('title')
        },
        position: pos
      }
    };
  }
  function getViewCoords(iView) {
    var tLayer = iView.get('layer');
    if( !SC.none( tLayer))
      return { left: tLayer.offsetLeft, top: tLayer.offsetTop,
        width: tLayer.offsetWidth, height: tLayer.offsetHeight };
  }
  function getWindowCoords(view) {
    var parentView = view.parentView;
    var viewCoords = getViewCoords(view);
    viewCoords.right = (viewCoords.width == null)?viewCoords.right: viewCoords.left + viewCoords.width;
    viewCoords.bottom = (viewCoords.height == null)?viewCoords.bottom: viewCoords.top + viewCoords.height;
    var ul = DG.ViewUtilities.viewToWindowCoordinates(
        {x: viewCoords.left, y: viewCoords.top+DG.ViewUtilities.kTitleBarHeight},
        parentView);
    var lr = DG.ViewUtilities.viewToWindowCoordinates({x: viewCoords.right, y: viewCoords.bottom}, parentView);
    return {left: ul.x, right: lr.x, top: ul.y, bottom: lr.y, width: lr.x - ul.x, height: lr.y - ul.y};
  }

  return DG.WebView.extend(
      /** @scope DG.GameView.prototype */ {

        classNames: ['dg-game-view'],
        classNameBindings: ['connected:dg-interactive-connected'],

        /**
         * @property {DG.GameController}
         */
        controller: null,

        connected: null,

        didConnect: function () {
          this.set('connected', !SC.none(this.getPath('controller.activeChannel')));
        }.observes('.controller.activeChannel'),

        backgroundColor: 'white',

        destroy: function () {
          this.controller.gameViewWillClose();
          sc_super();
        },

        webView: SC.WebView.extend({
          classNames: ['dg-web-view-frame'],

          // append language string to url as a query parameter
          value: function () {
            function parseUrl( url ) {
              var a = document.createElement('a');
              a.href = url;
              return a;
            }
            var url = this.getPath('parentView._url');
            var parsedUrl = parseUrl(url);
            var qp = parseUrl(url).search;
            var lang = DG.get('currentLanguage');
            var isBinaryDataURL = parsedUrl.protocol === 'data:';
            if (!isBinaryDataURL) {
              if (!qp || qp.length === 0) {
                qp = '?lang=' + lang;
              } else {
                qp += '&lang=' + lang;
              }
            }
            parsedUrl.search = qp;
            return parsedUrl.href;
          }.property(),

          controllerBinding: '*parentView.controller',

          _previousValue: null,

          // Setup iframePhone communication with the child iframe before it loads, so that connection
          // (iframe src will change when 'value' changes, but observers fire before bindings are synced)
          valueDidChange: function () {
            var tValue = this.get('value');
            var controller = this.parentView.get('controller');

            if (tValue !== this._previousValue) {
              controller.setUpChannels(this.$('iframe')[0], tValue);
            }

            this._previousValue = tValue;

          }.observes('value'),

          /**
           * @override SC.WebView.iframeDidLoad
           */
          iframeDidLoad: function () {
            if (!SC.none(this.value)) {
              this.setPath('parentView.isLoading', false);
            }
            var iframe = this.$('iframe')[0];
            if (this.value) {
              this.valueDidChange();
            }
            if (iframe && iframe.contentWindow) {
              // Allow the iframe to take over the entire screen (requested by InquirySpace)
              $(iframe).attr('allowfullscreen', true)
                  .attr('webkitallowfullscreen', true)
                  .attr('mozallowfullscreen', true);

            } else {
              DG.logWarn("DG.GameView:iframeDidLoad no contentWindow\n");
            }
            sc_super();
          }

        }),

        isDropTarget: YES,
        isDropEnabled: YES,

        acceptDragOperation: function() {
          return YES;
        },

        dragEntered: function (iDrag) {
          var curDoc = DG.currDocumentController();
          curDoc.notificationManager.sendChannelNotification(this.controller,
              formatDragData('dragenter', iDrag.data));
        },

        dragExited: function (iDrag) {
          var curDoc = DG.currDocumentController();
          curDoc.notificationManager.sendChannelNotification(this.controller,
              formatDragData('dragleave', iDrag.data));
        },

        dragUpdated: function (iDrag) {
          var curDoc = DG.currDocumentController();
          var iFrameRect = getWindowCoords(this);
          var x = iDrag.getPath('location.x');
          var y = iDrag.getPath('location.y');

          // TODO: use drag enter / exit info?
          if (x >= iFrameRect.left && x <= iFrameRect.right && y >= iFrameRect.top && y <= iFrameRect.bottom) {
            curDoc.notificationManager.sendChannelNotification(this.controller,
                formatDragData('drag', iDrag.data, {x: x-iFrameRect.left, y: y - iFrameRect.top}));
          }
        },

        isValidAttribute: function (iDrag) {
          var tDragAttr = iDrag.data.attribute;
          var tAttrs = iDrag.getPath('data.context').getAttributes();
          return tAttrs.indexOf(tDragAttr) >= 0;
        },

        computeDragOperations: function (iDrag) {
          return this.isValidAttribute(iDrag) ? SC.DRAG_LINK : SC.DRAG_NONE;
        },

        performDragOperation: function (iDrag) {
          var curDoc = DG.currDocumentController();
          var iFrameRect = getWindowCoords(this);
          var x = iDrag.getPath('location.x');
          var y = iDrag.getPath('location.y');

          if (x >= iFrameRect.left && x <= iFrameRect.right && y >= iFrameRect.top && y <= iFrameRect.bottom) {
            curDoc.notificationManager.sendChannelNotification(this.controller,
                formatDragData('drop', iDrag.data, {x: x-iFrameRect.left, y: y - iFrameRect.top}),
                '*');
          }
          return SC.DRAG_LINK;
        },

        dragStarted: function (iDrag) {
          var curDoc = DG.currDocumentController();
          curDoc.notificationManager.sendChannelNotification(this.controller,
              formatDragData('dragstart', iDrag.data));
        },

        dragEnded: function (iDrag) {
          var curDoc = DG.currDocumentController();
          curDoc.notificationManager.sendChannelNotification(this.controller,
              formatDragData('dragend', iDrag.data));
        }
      });
})();
