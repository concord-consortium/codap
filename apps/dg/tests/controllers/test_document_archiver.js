// ==========================================================================
//                       DG.DocumentArchiver Unit Test
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

module("DG.DocumentArchiver", {
  setup: function () {
  },
  teardown: function () {
  }
});

test("test DG.DocumentArchiver", function () {
  var tTestCases = {
    'Empty Document': {
      doc: {},
      tests: function (docName, doc) {
        ok(SC.empty(doc.get('name')), '"' + docName + '": Empty document has no name');
        equals(doc.constructor, 'DG.Document', '"' + docName + '": Document has correct type');
      }
    },
    'No sub-objects': {
      doc: {
        "name": "n1",
        "guid": 12,
        "appName": "DG",
        "appVersion": "1.1",
        "appBuildNum": "0259"
      },
      tests: function (docName, doc) {
        equals(doc.get('name'), 'n1', '"' + docName + '": Can get document name.');
        equals(doc.constructor, 'DG.Document', '"' + docName + '": Document has correct type');
      }
    },
    'Empty sub-objects': {
      doc: {
        "name": "n2",
        "guid": 12,
        "components": [],
        "contexts": [],
        "appName": "DG",
        "appVersion": "1.1",
        "appBuildNum": "0259",
        "globalValues": []
      },
      tests: function (docName, doc) {
        equals(doc.get('name'), 'n2', '"' + docName + '": Can get document name.');
        equals(doc.constructor, 'DG.Document', '"' + docName + '": Document has correct type');
      }
    },
    'A Component': {
      doc: {
        "name": "n3",
        "guid": 12,
        "components": [
          {
            "type": "DG.GameView",
            "guid": 102,
            "componentStorage": {
              "currentGameName": "Markov",
              "currentGameUrl": "DataGames/JavaScriptGames/Markov/index.html",
              "_links_": {
                "context": {
                  "type": "DG.DataContextRecord",
                  "id": 401
                }
              },
              "currentGameFormulas": null
            },
            "layout": { "width": 566, "height": 347, "left": 5, "top": 5 }
          }
        ],
        "contexts": [],
        "appName": "DG",
        "appVersion": "1.1",
        "appBuildNum": "0259",
        "globalValues": []
      },
      tests: function (docName, doc) {
        equals(doc.get('name'), 'n3', '"' + docName + '": Can get document name.');
        equals(doc.constructor, 'DG.Document', '"' + docName + '": Document has correct type');
        equals(doc.get('type'), 'DG.Document', '"' + docName + '": Document has correct type');
        equals(DG.ObjectMap.length(doc.components), 1, '"' + docName + '": Document has a component');
        equals(DG.ObjectMap.values(doc.components)[0].constructor, 'DG.Component', '"' + docName + '": Document has correct object type');
        equals(DG.ObjectMap.values(doc.components)[0].get('type'), 'DG.GameView', '"' + docName + '": Document has correct component type');
      }
    },
    'Markov': {
      doc: {
        "name": "n4", "guid": 12, "components": [
          {
            "type": "DG.GameView",
            "guid": 102,
            "componentStorage": {
              "currentGameName": "Markov",
              "currentGameUrl": "DataGames/JavaScriptGames/Markov/index.html",
              "_links_": {
                "context": { "type": "DG.DataContextRecord", "id": 401 }
              },
              "currentGameFormulas": null
            },
            "layout": { "width": 566, "height": 347, "left": 5, "top": 5 } }
        ], "contexts": [
          {
            "type": "DG.GameContext", "document": 12, "guid": 401,
            "collections": [
              { "name": "Games", "areParentChildLinksConfigured": true,
                "guid": 601, "attrs": [
                { "name": "game", "type": "numeric", "precision": 0,
                  "defaultMin": 1, "defaultMax": 5,
                  "description": "game number", "guid": 1001 },
                { "name": "turns", "type": "numeric", "precision": 0,
                  "defaultMin": 0, "defaultMax": 10,
                  "description": "number of turns in the game", "guid": 1002 },
                { "name": "winner", "type": "nominal",
                  "description": "who won? You or Markov?", "guid": 1003, "precision": 2 },
                { "name": "level", "type": "nominal",
                  "description": "what level of the game was played",
                  "guid": 1004, "precision": 2 }
              ], "cases": [
                { "guid": 2001, "values": { "game": 1, "turns": "", "winner": "", "level": "Tethys" } }
              ] },
              { "name": "Turns", "areParentChildLinksConfigured": true, "parent": 601, "guid": 602, "attrs": [
                { "name": "turn", "type": "numeric", "precision": 0,
                  "defaultMin": 0, "defaultMax": 10, "description": "the turn number in the game", "guid": 1005 },
                { "name": "markovs_move", "type": "nominal", "description": "the move markov made this turn", "colormap": { "R": "red", "P": "blue", "S": "green" }, "guid": 1006, "precision": 2 },
                { "name": "your_move", "type": "nominal", "description": "the move you made this turn", "colormap": { "R": "red", "P": "blue", "S": "green" }, "guid": 1007, "precision": 2 },
                { "name": "result", "type": "nominal", "description": "did you win or lose this turn?", "guid": 1008, "precision": 2 },
                { "name": "up_down", "type": "numeric", "precision": 0, "defaultMin": -1, "defaultMax": 1, "description": "the number of steps up or down Madeline moved", "guid": 1009 },
                { "name": "previous_2_markov_moves", "type": "nominal", "description": "the two moves Markov made prior to this one", "guid": 1010, "precision": 2 }
              ], "cases": [
                { "parent": 2001, "guid": 2002, "values": {
                  "turn": 1, "markovs_move": "S", "your_move": "R", "result": "win", "up_down": 1, "previous_2_markov_moves": "" } },
                { "parent": 2001, "guid": 2003, "values": {
                  "turn": 2, "markovs_move": "S", "your_move": "R", "result": "win", "up_down": 1, "previous_2_markov_moves": "" } },
                { "parent": 2001, "guid": 2004, "values": {
                  "turn": 3, "markovs_move": "R", "your_move": "R", "result": "lose", "up_down": -1, "previous_2_markov_moves": "SS" } },
                { "parent": 2001, "guid": 2005, "values": {
                  "turn": 4, "markovs_move": "R", "your_move": "R", "result": "lose", "up_down": -1, "previous_2_markov_moves": "SR" } },
                { "parent": 2001, "guid": 2006, "values": {
                  "turn": 5, "markovs_move": "P", "your_move": "R", "result": "lose", "up_down": -1, "previous_2_markov_moves": "RR" } },
                { "parent": 2001, "guid": 2007, "values": {
                  "turn": 6, "markovs_move": "P", "your_move": "R", "result": "lose", "up_down": -1, "previous_2_markov_moves": "RP" } },
                { "parent": 2001, "guid": 2008, "values": {
                  "turn": 7, "markovs_move": "S", "your_move": "R", "result": "win", "up_down": 1, "previous_2_markov_moves": "PP" } }
              ] }
            ], "contextStorage": {
            "gameName": "Markov", "gameUrl": "DataGames/JavaScriptGames/Markov/index.html", "gameState": {
              "gameNumber": 1, "currentLevel": "Tethys", "levelsMap": { "Tethys": true, "Deimos": true, "Phobos": true, "Callisto": true }, "strategy": { "RR": { "move": "", "weight": 2 }, "RP": { "move": "", "weight": 2 }, "RS": { "move": "", "weight": 2 }, "PP": { "move": "", "weight": 2 }, "PR": { "move": "", "weight": 2 }, "PS": { "move": "", "weight": 2 }, "SS": { "move": "", "weight": 2 }, "SR": { "move": "", "weight": 2 }, "SP": { "move": "", "weight": 2 } } } } }
        ], "appName": "DG", "appVersion": "1.1", "appBuildNum": "0259", "globalValues": [] },
      tests: function (docName, doc) {
        var contexts;
        equals(doc.get('name'), 'n4', '"' + docName + '": Can get document name.');
        equals(doc.constructor, 'DG.Document', '"' + docName + '": Document has correct object type');
        equals(doc.get('type'), 'DG.Document', '"' + docName + '": Document has correct document type');
        equals(DG.ObjectMap.length(doc.components), 1, '"' + docName + '": Document has a component');
        equals(DG.ObjectMap.values(doc.components)[0].constructor, 'DG.Component', '"' + docName + '": Component has correct object type');
        equals(DG.ObjectMap.values(doc.components)[0].get('type'), 'DG.GameView', '"' + docName + '": Component has correct component type');
        equals(DG.ObjectMap.length(doc.contexts), 1, '"' + docName + '": Document has a context');
        equals(DG.ObjectMap.values(doc.contexts)[0].constructor, 'DG.DataContextRecord', '"' + docName + '": Context has correct object type');
        equals(DG.ObjectMap.values(doc.contexts)[0].get('type'), 'DG.GameContext', '"' + docName + '": Context has correct context type');
        contexts = DG.ObjectMap.values(doc.contexts)[0];
        equals(DG.ObjectMap.length(contexts.collections), 2, '"' + docName + '": Document has two collections');
        equals(DG.ObjectMap.values(contexts.collections)[0].constructor, 'DG.CollectionRecord', '"' + docName + '": Component has correct object type');
        equals(DG.ObjectMap.values(contexts.collections)[0].get('type'), 'DG.CollectionRecord', '"' + docName + '": Component has correct component type');
        equals(DG.ObjectMap.values(contexts.collections)[0].get('name'), 'Games', '"' + docName + '": Component has correct component type');
        equals(DG.ObjectMap.values(contexts.collections)[0].attrs.length, 4, '"' + docName + '": Parent collection has attributes');
        equals(DG.ObjectMap.values(contexts.collections)[0].cases.length, 1, '"' + docName + '": Parent collection has cases');
        equals(DG.ObjectMap.values(contexts.collections)[1].constructor, 'DG.CollectionRecord', '"' + docName + '": Component has correct object type');
        equals(DG.ObjectMap.values(contexts.collections)[1].get('type'), 'DG.CollectionRecord', '"' + docName + '": Component has correct component type');
        equals(DG.ObjectMap.values(contexts.collections)[1].get('name'), 'Turns', '"' + docName + '": Component has correct component type');
        equals(DG.ObjectMap.values(contexts.collections)[1].attrs.length, 6, '"' + docName + '": Parent collection has attributes');
        equals(DG.ObjectMap.values(contexts.collections)[1].cases.length, 7, '"' + docName + '": Parent collection has cases');
      }
    }
  }, tArchiver = DG.DocumentArchiver.create({});

  [
    'Empty sub-objects' , 'A Component' , 'Markov'
  ].forEach(function (tDocName, tIx) {
      var tTestCase = tTestCases[tDocName], tDocSource = tTestCase.doc, tDoc;
      ok(tDoc = tArchiver.openDocument(null, JSON.stringify(tDocSource)), 'Can create document "' + tDocName + '"');
      DG.currDocumentController().setDocument(tDoc);
      if (tTestCase.tests) {
        tTestCase.tests(tDocName, tDoc);
      }
//      equals(JSON.stringify(tDoc.toArchive()).length, JSON.stringify(tDocSource).length, 'exported JSON matches original');
      DG.currDocumentController().closeDocument();
      ok(SC.empty(DG.activeDocument), 'Can clean up context: "' + tDocName + '"');
    });
});

