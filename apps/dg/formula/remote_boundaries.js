// ==========================================================================
//                          DG.RemoteBoundaries
//
//  Author:   Kirk Swenson
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('formula/remote_resource');
sc_require('controllers/document_controller');


/** @class DG.PendingBoundaries

  "Error" class for pending boundaries.

  @extends PendingRequest
*/
DG.PendingBoundaries = function() {
  this.name = 'DG.Formula.PendingBoundaries.name'.loc();
  this.message = 'DG.Formula.PendingBoundaries.message'.loc();
  this.description = 'DG.Formula.PendingBoundaries.description'.loc();
};
DG.PendingBoundaries.prototype = new DG.PendingRequest();
DG.PendingBoundaries.prototype.constructor = DG.PendingBoundaries;


/** @class DG.FailedBoundaries

  "Error" class for failed boundary requests.

  @extends FailedRequest
*/
DG.FailedBoundaries = function(error) {
  this.name = 'DG.Formula.FailedBoundaries.name'.loc();
  this.message = 'DG.Formula.FailedBoundaries.message'.loc(error);
  this.description = 'DG.Formula.FailedBoundaries.description'.loc(error);
};
DG.FailedBoundaries.prototype = new DG.FailedRequest();
DG.FailedBoundaries.prototype.constructor = DG.FailedBoundaries;


DG.RemoteBoundaries = DG.RemoteResource.extend({

  pendingValue: new DG.PendingBoundaries(),

  init: function() {
    sc_super();
  },

  destroy: function() {
    sc_super();
  },

  _handleSuccess: function(data) {
    var tBoundariesObject,
        tBoundariesCollection,
        tBoundariesIDIndex = {},
        tIndexCollection,
        mapValues = new DG.BoundaryMap();

    tBoundariesObject = data.contexts[0];
    tBoundariesObject.collections.forEach(function (iCollection) {
      switch (iCollection.name) {
        case 'boundaries':
          tBoundariesCollection = iCollection;
          break;
        case 'index':
          tIndexCollection = iCollection;
          break;
      }
    });
    tBoundariesCollection.cases.forEach(function (iCase) {
      tBoundariesIDIndex[iCase.guid] = iCase.values.boundary;
    });

    tIndexCollection.cases.forEach(function (iKeyCase) {
      var boundaryKey = iKeyCase && iKeyCase.values && iKeyCase.values.key &&
                          iKeyCase.values.key.toLowerCase(),
          boundaryData = null;

      try {
        boundaryData = JSON.parse(tBoundariesIDIndex[iKeyCase.parent]);
      }
      catch(e) {
        boundaryData = new DG.SyntaxError('JSON boundary');
      }

      mapValues.map[boundaryKey] = { jsonBoundaryObject: boundaryData };
    }.bind( this));

    return mapValues;
  },

  _handleError: function(jqXHR, status, error) {
    return new DG.FailedBoundaries(error || status);
  }
});

DG.remoteBoundaries = null;

DG.RemoteBoundaries.addBoundaries = function(boundaries) {
  DG.globalsController.registerGlobalValue(boundaries);
  if (DG.activeDocument) {
    boundaries.set('document', DG.activeDocument);
    DG.activeDocument.globalValues[boundaries.get('id')] = boundaries;
  }
};

DG.RemoteBoundaries.registerDefaultBoundaries = function() {
  if (!DG.currDocumentController().get('ready')) return;

  // first time - create internal array of boundaries
  if (!DG.remoteBoundaries) {
    var boundarySpecs = [
          {
            name: 'US_states',
            format: 'codap',
            url: 'http://codap.concord.org/~bfinzer/boundaries/US_State_Boundaries.codap'
          }
        ];

    DG.remoteBoundaries = [];
    boundarySpecs.forEach(function(spec) {
      DG.remoteBoundaries.push(DG.RemoteBoundaries.create(spec));
    });
  }

  // every time - add boundaries to globalsController and document
  DG.remoteBoundaries.forEach(function(remoteBoundary) {
    DG.RemoteBoundaries.addBoundaries(remoteBoundary);
  });
};

