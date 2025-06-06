// ==========================================================================
//  
//  Author:   jsandoe
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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
/**
 * @class  DG.CaseTableDropTarget
 */
DG.CaseTableDropTarget = SC.View.extend(SC.SplitChild, (function () {

      return {
        /**
         * An arbitrary name
         * @type {String}
         */
        name: null,

        /**
         * The data context defining the valid attributes for a drop.
         * @type {DG.DataContext}
         */
        dataContext: null,

        /**
         * @type {[string]}
         */
        classNames: 'dg-table-drop-target'.w(),

        /**
         * @type {Object}
         */
        layout: { width: 50 },

        /**
         * Is the top-level drop target
         * @type {Boolean}
         */
        isTopLevel: false,

        /**
         * This is a drop target.
         * @type {boolean}
         */
        isDropTarget: function () {
          return YES;
        }.property(),

        /**
         * Drop is disabled if any of the following are true
         *   (a) the dataContext prevents the drop
         *   (b) the dragged attribute is from another dataContext,
         *   (c) the plugin prevents the drop
         * see DG.DataContextUtilities.canAcceptDrop() for details
         */
        isDropEnabled: function () {
          var dragAttribute = this.get('dragAttribute');
          var isTopLevelDrop = this.get('isTopLevel');
          return DG.DataContextUtilities
                    .canAcceptAttributeDrop(this.dataContext, dragAttribute, isTopLevelDrop);
        }.property('dragAttribute'),

        isDropEnabledDidChange: function () {
          this.notifyPropertyChange('isDropEnabled');
        }.observes('*dataContext.hasDataInteractive'),

        /**
         * @type {DG.Attribute|null}
         */
        dragAttribute: null,

        /**
         * Whether drag is in progress
         * @type {boolean}
         */
        isDragInProgress: false,

        /**
         * Whether drag has entered this view
         * @type {boolean}
         */
        isDragEntered: false,
        minimumSize: 10,
        size: 30,


        dropData: null,

        childViews: 'labelView'.w(),

        classNameBindings: [
          'isDragInProgress:dg-table-drop-target-show',
          'isDragEntered:dg-table-drop-target-highlight'
        ],

        labelView: SC.LabelView.extend({
          value: '',
          layout: {
            left: 2, right: 2, top: 2, bottom: 2
          }
        }),

        showDropHint: function () {
          this.set('isDragEntered', true);
          this.labelView.set('value', 'DG.CaseTableDropTarget.dropMessage'.loc());
        },

        hideDropHint: function () {
          this.labelView.set('value', '');
          this.set('isDragEntered', false);
        },

        extractDragInfo: function( iDrag) {
          if (iDrag && iDrag.data ) {
            this.set('dragAttribute', iDrag.data.attribute);
          }
        },

        /**
         * Adjustments needed to accommodate shared embedded mode CODAP
         * @override View.convertFrameToView
         **/
        convertFrameToView: function (frame, targetView) {
          var tOffset = $(this.containerLayer()).offset();
          return { x: tOffset.left - window.pageXOffset, y: tOffset.top - window.pageYOffset, width: frame.width, height: frame.height };
        },

        computeDragOperations: function( iDrag) {
          this.extractDragInfo( iDrag);
          if( this.get('isDropEnabled'))
            return SC.DRAG_LINK;
          else
            return SC.DRAG_NONE;
        },

        dragStarted: function( iDrag) {
          this.extractDragInfo(iDrag);
          if (this.get('isDropEnabled')) {
            this.set('isDragInProgress', true);
          }
        },

        dragEnded: function () {
          this.set('dragAttribute', null);
          this.set('isDragInProgress', false);
        },

        dragEntered: function( iDragObject, iEvent) {
          if (this.get('isDropEnabled')) {
            this.showDropHint();
          }
        },

        dragExited: function( iDragObject, iEvent) {
          this.hideDropHint();
        },

        acceptDragOperation: function() {
          return this.get('isDropEnabled');
        },

        performDragOperation:function ( iDragObject, iDragOp ) {
          this.hideDropHint();
          this.set('dropData', iDragObject.data);
        },

        /**
         * These methods -- dataDragEntered, dataDragHovered, dataDragDropped,
         * and dataDragExited -- support drags initiated outside the page,
         * specifically drags from plugins.
         */
        _externalDragObject: function () {
          var data = DG.mainPage.getPath('mainPane.dragAttributeData');
          if (data && data.context === this.get('dataContext')) {
            return {
              data: data
            };
          }
        }.property(),

        externalDragDidChange: function () {
          var tDrag = this.get('_externalDragObject');
          if (!tDrag) {
            return;
          }
          if (DG.mainPage.getPath('mainPane._isDraggingAttr')) {
            this.dragStarted(tDrag);
          } else {
            this.dragEnded();
          }
        }.observes('DG.mainPage.mainPane._isDraggingAttr'),

        dataDragEntered: function (iEvent) {
          var externalDragObject = this.get('_externalDragObject');
          if (externalDragObject) {
            this.dragEntered(null, externalDragObject);
            iEvent.preventDefault();
          }
        },
        dataDragHovered: function (iEvent) {
          var externalDragObject = this.get('_externalDragObject');
          if (externalDragObject ) {
            iEvent.dataTransfer.dropEffect = 'copy';
            iEvent.preventDefault();
            iEvent.stopPropagation();
          } else {
            return false;
          }
        },
        dataDragDropped: function(iEvent) {
          var externalDragObject = this.get('_externalDragObject');
          if (externalDragObject) {
            var data = DG.mainPage.getPath('mainPane.dragAttributeData');
            this.set('dropData', data);
            iEvent.preventDefault();
          } else {
            return false;
          }
        },
        dataDragExited: function (iEvent) {
          var externalDragObject = this.get('_externalDragObject');
          if (externalDragObject) {
            this.dragExited(null, externalDragObject);
            iEvent.preventDefault();
          }
        },
        click: function () {
          DG.globalEditorLock.commitCurrentEdit();

          var tComponentView = DG.ComponentView.findComponentViewParent( this);
          var dataContext = this.get('dataContext');
          var tChange = {
            operation: 'selectCases',
            cases: [],
            select: true,
            extend: false
          };
          if (tComponentView && !tComponentView.get('isSelected')) {
            tComponentView.select();
            return NO;
          }
          dataContext.applyChange(tChange);
        },
        touchStart: function() {
          return YES;
        },
        touchEnd: function(evt) {
          evt.allowDefault();
          return YES;
        },
        mouseDown: function () {
          return YES;
        }
      };
    }())
);
