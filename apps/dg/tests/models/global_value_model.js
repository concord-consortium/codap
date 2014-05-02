// ==========================================================================
//                      DG.GlobalValue Unit Test
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

module("DG.GlobalValue", {
  setup: function() {
    DG.prevStore = DG.store;
    DG.store = DG.appStore;
  },
  teardown: function() {
    DG.store = DG.prevStore;
  }
});

test("test DG.GlobalValue", function() {
  var global = DG.GlobalValue.createGlobalValue(),
      globalID = global.get('id');
  
  // With a real back-end we'd need to worry about latency here
  DG.store.commitRecords();
  var found = DG.store.find( DG.GlobalValue, globalID);
  equals( found && found.get('id'), globalID, "newly-created global value should be findable in store");
  
  equals(global.get('name'), '', "default name should be empty string");

  global.set('name', "aName");
  equals(global.get('name'), 'aName', "set/get 'name' should work round-trip");

  global.set('value', 1);
  equals(global.get('value'), 1, "set/get numeric 'value' should work round-trip");

//  Note: only numeric values are currently supported
//   global.set('value', "aValue");
//   equals(global.get('value'), "aValue", "set/get string 'value' should work round-trip");
  
  DG.GlobalValue.destroyGlobalValue( found);
  DG.store.commitRecords();
  
  found = DG.store.find( DG.GlobalValue, globalID);

  // When finding by ID, a record that has been destroyed will be returned,
  // so we have to check status as well as whether or not anything was returned.
  // With a real back-end we'd need to worry about latency here.
  var isDestroyed = found && found.get('isDestroyed');
  ok( !found || isDestroyed, "destroyed global value should not be findable in store");
});

