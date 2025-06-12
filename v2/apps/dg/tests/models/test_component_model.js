// ==========================================================================
//                      DG.Component Unit Test
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
/**
 * Created by jsandoe on 10/20/14.
 */

module('DG.Component', {
  setup: function () {
    DG.Document.createDocument();
  },
  teardown: function () {
    DG.activeDocument = null;
    DG.store = DG.ModelStore.create();
  }
});

test('test DG.Component', function () {
  var tProps = {
      type: 'DG.GameView',
      layout: {
        width: 566,
        height: 347,
        left: 5,
        top: 5
      },
      document: DG.activeDocument,
      componentStorage: {
        currentGameName: 'Markov',
        currentGameUrl: 'DataGames/JavaScriptGames/Markov/index.html'
      }
    },
    tTestContent = {name: 'test'},
    tObj = DG.Component.createComponent(tProps),
    tID = tObj.get('id'),
    tLayout = tObj.get('layout'),
    tStorage = tObj.get('componentStorage'),
    tFoundInDocument = DG.activeDocument.components[tID],
    tFoundInStore = DG.store.find(DG.Component, tID);

  ok(tObj, 'Can create Component');
  ok(tID, 'Can get Component ID');
  equals(tFoundInDocument && tFoundInDocument.get('id'), tID,
    'Newly-created component is findable in Document');
  equals(tFoundInStore && tFoundInStore.get('id'), tID,
    'Newly-created component is findable in store');
  equals(tLayout && tLayout.width, 566, 'Can get layout from Component.');
  equals(tStorage && tStorage.currentGameName, 'Markov', 'Can get game name.');

  tObj.set('Content', tTestContent);
  equals(tObj.get('Content'), tTestContent, 'Can set and get content.');

  DG.Component.destroyComponent(tFoundInDocument);

  // When finding by ID, a record that has been destroyed will be returned,
  // so we have to check status as well as whether or not anything was returned.
  tFoundInDocument = DG.activeDocument.components[tID];
  // ok(!tFoundInDocument, 'Destroyed component is not findable in document');
  tFoundInStore = DG.store.find(DG.Component, tID);
  ok(!tFoundInStore, 'Destroyed component is findable in store');
});
