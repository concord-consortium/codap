// ==========================================================================
//  
//  Author:   jsandoe
//
//  Copyright (c) 2016 by The Concord Consortium, Inc. All rights reserved.
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
sc_require('utilities/data_utilities');

module("DG.Utilities", {
  setup: function() {
    window.DG = window.DG || {};
  },
  teardown: function() {
  }
});


  test("Test canonicalizeInputValue()", function () {
    equals(DG.DataUtilities.canonicalizeInputValue(), "");
    equals(DG.DataUtilities.canonicalizeInputValue(null), "");
    equals(DG.DataUtilities.canonicalizeInputValue("undefined"), "");
    equals(DG.DataUtilities.canonicalizeInputValue(""), "");
    equals(DG.DataUtilities.canonicalizeInputValue("foo"), "foo");
    // ok(DG.DataUtilities.canonicalizeInputValue("2002-12-31T23:00:00+01:00") instanceof Date, "canonicalizeInputValue('2002-12-31T23:00:00+01:00')");
    // ok(DG.DataUtilities.canonicalizeInputValue("2016-02-01") instanceof Date, "canonicalizeInputValue('2016-02-01')");
  });

  test("Test canonicalizeInternalValue()", function () {
    equals(DG.DataUtilities.canonicalizeInternalValue(), "");
    equals(DG.DataUtilities.canonicalizeInternalValue(null), "");
    equals(DG.DataUtilities.canonicalizeInternalValue("undefined"), "");
    equals(DG.DataUtilities.canonicalizeInternalValue("foo"), "foo");
    ok(DG.DataUtilities.canonicalizeInternalValue(
        "2002-12-31T23:00:00+01:00") instanceof Date,
        "canonicalizeInternalValue('2002-12-31T23:00:00+01:00')");
    equals(DG.DataUtilities.canonicalizeInternalValue("2016-02-01"),
        "2016-02-01", "canonicalizeInternalValue('2016-02-01')");
  });
