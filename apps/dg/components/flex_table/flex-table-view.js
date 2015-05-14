// ==========================================================================
//                        DG.FlexTableView
// 
//  A provides flexible grouping tables.
//  
//  Author:   Jonathan Sandoe
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

/** @class

 A FlexTable view contains a grid view with flexible grouping.

 @extends SC.View
 */
DG.FlexTableView = SC.View.extend( (function() {
/** @scope DG.FlexTableView.prototype */
  return {
    /** @param {[string]} classNames Array of css classes. */
    classNames: ['dg-flex-table'],

    /** @param {{left: number, right: number, top: number, bottom: number}}
     *  layout Layout geometry. */
    layout: { left: 0, right: 0, top: 0, bottom: 0 },

    /** @param {{SC.View}} childViews None that sproutcore manages. */
    childViews: [],

    container: null,

    /** @param {[{W2UI.w2grid}]} grids Array of grids */
    grids: null,

    /** @param {DG.FlexTableController} controller */
    controllerBinding: '.parentView.parentView.controller',

    /**
     * init
     *
     * Implements SC.view method. Initializes this object.
     */
    init: function () {
      sc_super();

      this.grids = [];
    },

    render: function( iContext, iFirstTime) {
      sc_super();

      // W2ui.Grid requires that we pass it a reference to its container element,
      // which in this case is the <div> created by this view. But that <div>
      // element doesn't exist the first time through render() -- it's created
      // as a result of the first time through -- so the first time we get here
      // we simply call displayDidChange() to make sure we get a second call to
      // render(), by which time the <div> has been created and we can pass it
      // to w2ui.grid.
      if( iFirstTime) {
        this.displayDidChange();
      }
      else if( !this._grid) {
        this.initGridView();
      }

      // SlickGrid adds to the set of CSS classes. We need to capture these
      // and add them to the context or else the context will overwrite
      // the CSS classes and eliminate the ones added by SlickGrid.
      // This is not a particularly elegant solution in that it clobbers
      // the complete set of classes every time we render. It's not
      // obvious how to do better, however, in that the view's 'classNames'
      // are copied to the context before render() is called, but the
      // SlickGrid isn't created until render(), so setting 'classNames'
      // wouldn't have the desired effect until the next time we render().
      //if( this._grid)
      //  iContext.classNames( this.$().attr("class"), YES);
    },

    initGridView: function () {
      var gridSelector = "#" + this.get('layerId');

      this.container = this.createLayout(gridSelecter, 0);

      this.createGrid(
        { num: 0, layout: this.container, panel: 'main'},
        this.collectionName,
        this.getPath('controller.columns'),
        this.getPath('controller.records')
      );

      this._grid.refresh();
    },

    /**
     * Creates a container for the grids.
     *
     * @param {{jQuery}} rootSelector
     * @param {number} iNum
     * @returns {w2layout}
     */
    createLayout: function(iLayoutContainer, iNum) {
      var tID = 'layout_' + iNum,
        tDiv = '<div id="' + tID + '" style="height:100%"></div>',
        panelStyle = 'border: 1px solid #dfdfdf; padding: 0px;',
        tNewLayout;
      iLayoutContainer.append(tDiv);

      tNewLayout = $('#'+tID).w2layout({
        name: tID,
        number: iNum,
        panels: [
          { type: 'left', size: 20, style: panelStyle },
          { type: 'main', style: panelStyle }
        ]
      });

      var tGridID = 'grid_' + iNum,
        tGridDiv = '<div id="' + tGridID + '" class="dgGrid"></div>';
      tNewLayout.content('main', tGridDiv);
      return tNewLayout;
    },

    createGrid: function( iSpecs, iGroupName, iColumns, iRecords) {
      var tName = 'grid_' + iSpecs.num,
        tNewGrid =
          $('#'+tName).w2grid({
            name: tName,
            number: iSpecs.num,
            location: { layout: iSpecs.layout, panel: iSpecs.panel },
            reorderColumns: true,
            columnGroups: [
              { caption: iGroupName, span: iColumns.length }
            ],
            columns: iColumns,
            records: iRecords,
            onExpand: this.doNothing.bind(this)
          });
      this.grids.push( tNewGrid);

      tNewGrid.on('columnDragOver', this.handleColumnDragOver.bind(this));
      tNewGrid.on('columnDragEnd', this.handleSplit.bind(this));

      return tNewGrid;
    },

    viewDidResize: function () {
      this.invokeLast(
        function() {
          this._grid && this._grid.resize();
        }.bind(this)
      );
    },
    /**
     Destroys the SlickGrid object, its DataView object, and the CaseTableAdapter.
     */
    _destroy: function() {
      this._grid.destroy();
    },

    /**
     Called when the component is about to be destroyed.
     */
    willDestroy: function() {
      this._destroy();
    },

    reset: function () {
    }

  };
}()));
