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
        name: null,
        classNames: 'dg-table-drop-target'.w(),
        layout: { width: 50 },
        isDropTarget: function () {
          return YES;
        }.property(),
        isDragInProgress: false,
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
          return !SC.none( tDragAttr);
        },

        computeDragOperations: function( iDrag) {
          if( this.isValidAttribute( iDrag))
            return SC.DRAG_LINK;
          else
            return SC.DRAG_NONE;
        },

        dragStarted: function( iDrag) {
          this.set('isDragInProgress', true);
        },

        dragEnded: function () {
          this.set('isDragInProgress', false);
        },

        dragEntered: function( iDragObject, iEvent) {
          this.showDropHint();
          this.set('isDragEntered', true);
        },

        dragExited: function( iDragObject, iEvent) {
          this.hideDropHint();
          this.set('isDragEntered', false);
        },

        acceptDragOperation: function() {
          return YES;
        },

        performDragOperation:function ( iDragObject, iDragOp ) {
          this.set('dropData', iDragObject.data);
        }
      };
    }())
);