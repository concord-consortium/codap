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
 * Created by jsandoe on 10/17/14.
 */

module("DG.Document", {
  setup: function () {
  },
  teardown: function () {
  }
});

test("test DG.Document", function () {
  var document;

  ok(SC.empty(DG.activeDocument), "Before document creation there is no DG.activeDocument");

  document = DG.Document.createDocument({
      name: "myName",
      appName: "myApp",
      appVersion: "myVersion",
      appBuildNum: "myBuildNum"
    });

  ok(!SC.empty(document), "Can create document");
  ok(!SC.empty(DG.activeDocument), "After creation there is an DG.activeDocument");
  equals(document, DG.activeDocument, "DG.activeDocument is the document we created.");
  ok(document.id, "Document has an ID");
  equals(document.get("name"), "myName", "Document name should be accessible");
  equals(document.get("appName"), "myApp", "App name should be accessible");
  equals(document.get("appVersion"), "myVersion", "Version name should be accessible");
  equals(document.get("appBuildNum"), "myBuildNum", "Version name should be accessible");
  ok(!SC.empty(DG.store.find(DG.Document, document.id)), "Document is registered");
  DG.Document.destroyDocument(document);
  ok(SC.empty(DG.store), "Destroyed document should not be registered");
  ok(SC.empty(DG.activeDocument), "After document destroyed, DG.activeDocument is unset");
});

