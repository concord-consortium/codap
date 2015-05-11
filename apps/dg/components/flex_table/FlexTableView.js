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
    classNames: ['dg-flex-table'],
    layout: { left: 0, right: 0, top: 0, bottom: 0 },
    childViews: [],
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
        //this.set('gridWidth', this._grid.getContentSize().width);
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
      $(gridSelector).append('<div class="w2ui-grid" style="height: 450px"></div>');
      this._grid = $('.w2ui-grid', gridSelector).w2grid({
        name   : 'myGrid',
        columns: [
          { field: 'fname', caption: 'First Name', size: '30%' },
          { field: 'lname', caption: 'Last Name', size: '30%' },
          { field: 'email', caption: 'Email', size: '40%' },
          { field: 'sdate', caption: 'Start Date', size: '120px' }
        ],
        records: [
          { recid: 1, fname: 'John', lname: 'Doe', email: 'jdoe@gmail.com', sdate: '4/3/2012' },
          { recid: 2, fname: 'Stuart', lname: 'Motzart', email: 'jdoe@gmail.com', sdate: '4/3/2012' },
          { recid: 3, fname: 'Jin', lname: 'Franson', email: 'jdoe@gmail.com', sdate: '4/3/2012' },
          { recid: 4, fname: 'Susan', lname: 'Ottie', email: 'jdoe@gmail.com', sdate: '4/3/2012' },
          { recid: 5, fname: 'Kelly', lname: 'Silver', email: 'jdoe@gmail.com', sdate: '4/3/2012' },
          { recid: 6, fname: 'Francis', lname: 'Gatos', email: 'jdoe@gmail.com', sdate: '4/3/2012' },
          { recid: 7, fname: 'Mark', lname: 'Welldo', email: 'jdoe@gmail.com', sdate: '4/3/2012' },
          { recid: 8, fname: 'Thomas', lname: 'Bahh', email: 'jdoe@gmail.com', sdate: '4/3/2012' },
          { recid: 9, fname: 'Sergei', lname: 'Rachmaninov', email: 'jdoe@gmail.com', sdate: '4/3/2012' }
        ]
      });
      this._grid.refresh();
    },
    viewDidResize: function () {
      this.invokeLast(
        function() {
          this._grid && this._grid.refresh();
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
    }
  };
}()));
