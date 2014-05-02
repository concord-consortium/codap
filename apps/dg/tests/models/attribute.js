// ==========================================================================
//                        DG.Attribute Unit Test
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

sc_require('models/attribute_model');

module("DG.Attribute", {
  setup: function() {
    DG.prevStore = DG.store;
    DG.store = DG.appStore;
  },
  teardown: function() {
    DG.store = DG.prevStore;
  }
});

test("test description", function() {
  var attr = DG.Attribute.createAttribute({ name: "noFormula" }),
      formAttr = DG.Attribute.createAttribute({ name: "yesFormula", formula: "42" });

  equals( attr.hasFormula(), false, "empty attribute has no formula");
  equals( formAttr.hasFormula(), true, "formula attribute has a formula");
  
  equals( formAttr.evalFormula(), 42, "simple formula with no namespace");
  formAttr.set('formula', "sqrt(49)");
  equals( formAttr.evalFormula(), 7, "simple formula with sqrt()");
  formAttr.set('formula', "foo");
  ok( isNaN( formAttr.evalFormula()), "unrecognized name reference --> NaN");
});

