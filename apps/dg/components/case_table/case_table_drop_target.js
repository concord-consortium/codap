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
         * This is a drop target.
         * @type {boolean}
         */
        isDropTarget: function () {
          return YES;
        }.property(),

        isDropEnabled: function () {
          return !this.dataContext.get('hasDataInteractive');
        }.property('.dataContext.hasDataInteractive'),

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
          this.labelView.set('value', 'DG.CaseTableDropTarget.dropMessage'.loc());
        },

        hideDropHint: function () {
          this.labelView.set('value', '');
        },

        isValidAttribute: function( iDrag) {
          var tDragAttr = iDrag.data.attribute;
          var dragContext = iDrag.data.context;
          return !SC.none( tDragAttr )  && (dragContext === this.dataContext);
        },

        computeDragOperations: function( iDrag) {
          if( this.isValidAttribute( iDrag))
            return SC.DRAG_LINK;
          else
            return SC.DRAG_NONE;
        },

        dragStarted: function( iDrag) {
          if (this.isValidAttribute(iDrag) && this.get('isDropEnabled')) {
            this.set('isDragInProgress', true);
          }
        },

        dragEnded: function () {
          this.set('isDragInProgress', false);
        },

        dragEntered: function( iDragObject, iEvent) {
          if (this.get('isDropEnabled')) {
            this.showDropHint();
            this.set('isDragEntered', true);
          }
        },

        dragExited: function( iDragObject, iEvent) {
          this.hideDropHint();
          this.set('isDragEntered', false);
        },

        acceptDragOperation: function() {
          return this.get('isDropEnabled');
        },

        performDragOperation:function ( iDragObject, iDragOp ) {
          this.set('dropData', iDragObject.data);
        }
      };
    }())
);