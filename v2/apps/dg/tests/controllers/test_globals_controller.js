// ==========================================================================
//                       DG.globalsController Unit Test
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

module("DG.globalsController", {
  setup: function() {
    DG.Document.createDocument();
  },
  teardown: function() {
    DG.Document.destroyDocument(DG.activeDocument);
  }
});

test("test DG.globalsController", function() {

  var v1 = DG.globalsController.createGlobalValue();
  equals(v1.get('name'), "v1", "initial value has default name of v1");
  equals(DG.globalsController.getUniqueName(), "v2", "next unique default value name is v2");
  equals(DG.globalsController.isNameInUse("v1"), true, "'v1' is now in use");
  equals(DG.globalsController.isNameInUse("v2"), false, "'v2' is not in use");
  equals(DG.globalsController.getGlobalValueByName("v1"), v1, "getGlobalValueByName('v1') should succeed");
  equals(DG.globalsController.getGlobalValueByName("v2"), undefined, "getGlobalValueByName('v2') should fail");
  
  var g1 = DG.globalsController.createGlobalValue( {}, "g");
  equals(g1.get('name'), "g1", "name of value created with 'g' prefix is g1");
  equals(DG.globalsController.getUniqueName("g"), "g2", "next unique name with prefix of g is g2");
  equals(DG.globalsController.isNameInUse("g1"), true, "'g1' is now in use");
  equals(DG.globalsController.isNameInUse("g2"), false, "'g2' is not in use");
  equals(DG.globalsController.getGlobalValueByName("g1"), g1, "getGlobalValueByName('g1') should succeed");
  equals(DG.globalsController.getGlobalValueByName("g2"), undefined, "getGlobalValueByName('g2') should fail");
  
  var names = DG.globalsController.getGlobalValueNames();
  ok(names.indexOf("v1") >= 0, "'v1' should be in list of names in use");
  ok(names.indexOf("v2") < 0, "'v2' should not be in list of names in use");
  ok(names.indexOf("g1") >= 0, "'g1' should be in list of names in use");
  ok(names.indexOf("g2") < 0, "'g2' should not be in list of names in use");
  
  v1.set('value', 2);
  same(DG.globalsController.get('globalValueChanges'), ['v1'], "globalValueChanges reflects change to v1");
  g1.set('value', 3);
  same(DG.globalsController.get('globalValueChanges'), ['g1'], "globalValueChanges reflects change to g1");
  
  var tNamespace = {};
  DG.globalsController.addGlobalValuesToNamespace( tNamespace);
  equals(tNamespace.v1, 2, "v1 should be in namespace");
  equals(tNamespace.g1, 3, "g1 should be in namespace");
  
  DG.globalsController.destroyGlobalValue( v1);
  equals(DG.globalsController.getGlobalValueByName("v1"), undefined, "getGlobalValueByName('v1') should fail");
  equals(DG.globalsController.isNameInUse("v1"), false, "'v1' is no longer in use");
  equals(DG.globalsController.getGlobalValueByName("v1"), undefined, "getGlobalValueByName('v1') should fail");
  names = DG.globalsController.getGlobalValueNames();
  ok(names.indexOf("v1") < 0, "'v1' should not be in list of names in use");
  tNamespace = {};
  DG.globalsController.addGlobalValuesToNamespace( tNamespace);
  equals(tNamespace.v1, undefined, "v1 should not be in namespace");
});

