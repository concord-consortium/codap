// ==========================================================================
//                      DG.FlexTableController
// 
//  The controller for case tables with flexible grouping.
//  
//  Authors:  Jonathan Sandoe
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

sc_require('controllers/component_controller');

/** @class

  DG.FlexTableController provides controller functionality for DG.FlexTableViews.

 @extends DG.ComponentController
 */
DG.FlexTableController = DG.ComponentController.extend(
  /** @scope DG.FlexTableController.prototype */
  (function() {
    return {
      /**
       The table will reflect the contents of this data context.
       @property   {DG.DataContext} or derived class
       */
      dataContext: null,

      collectionClient: null,

      view: null,

      contentView: null,

      /**
       Initialization function.
       */
      init: function() {
        sc_super();
      },
      /**
       Destruction function.
       */
      destroy: function() {
        //var dataContext = this.get('dataContext');
        //if( dataContext)
        //  dataContext.removeObserver('changeCount', this, 'contextDataDidChange');
        sc_super();
      },

      viewDidChange: function() {
        var tComponentView = this.get('view'),
          tContentView = tComponentView.get('contentView');
        this.set('contentView', tContentView);

        if( tContentView) {
          tContentView.bind('dataContext', this, 'dataContext');
        }
      }.observes('view'),

      columns: function () {
        var attributeIDs = this.collectionClient.getAttributeIDs();
        var columns = [];
        columns.push({caption: 'id', field: 'recid', hidden: true});
        this.contentView.reset();
        attributeIDs.forEach(function (id) {
          var attr = this.collectionClient.getAttributeByID(id);
          columns.push({caption: attr.name, field: id, size: '10%'});
        }.bind(this));
        return columns;
      }.property('collectionClient').cacheable(),

      records: function () {
        var cases = [];
        var attributeIDs = this.collectionClient.getAttributeIDs();
        var caseCount = this.collectionClient.getCaseCount();
        var ix, tCase, obj, jx;

        for (ix = 0; ix < caseCount; ix += 1) {
          tCase = this.collectionClient.getCaseAt(ix);
          obj = {recid: tCase.id};
          for (jx = 0; jx < attributeIDs.length; jx += 1) {
            var attributeID = attributeIDs[jx];
            obj[attributeID] = tCase.getValue(attributeID);
          }
          cases.push(obj);
        }

        return cases;
      }.property('collectionClient')
    };
  }())
);
