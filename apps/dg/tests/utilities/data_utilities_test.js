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

test("Tests data utilities", function() {
  function testValidDateString(dateString) {
    ok(DG.isDateString(dateString), 'Valid date: ' + dateString);
  }
  function testInvalidDateString(dateString) {
    ok(!DG.isDateString(dateString), 'Invalid date: ' + dateString);
  }
  // test date only
  testValidDateString('11/9/2016');
  testValidDateString('11/09/2016');
  testValidDateString('4/1/1928');
  testValidDateString('11/9/16');
  testValidDateString('11/09/16');
  testValidDateString('04/1/28');
  // dates with times
  testValidDateString('11/9/2016 7:18');
  testValidDateString('11/9/2016 7:18am');
  testValidDateString('11/9/2016 7:18 am');
  testValidDateString('11/9/2016 7:18AM');
  testValidDateString('11/9/2016 7:18:02');
  testValidDateString('11/9/2016 7:18:02 AM');
  testValidDateString('11/9/2016 7:18:02PM');
  testValidDateString('11/9/2016 7:18:02.123');
  testValidDateString('11/9/2016 7:18:02.234 pm');
  testValidDateString('11/9/2016 7:18:02.234am');
  testValidDateString('11/9/2016 07:18');
  testValidDateString('11/9/2016 17:18');
  testValidDateString('11/9/2016 07:18 am');
  testValidDateString('11/9/2016 17:18');
  testValidDateString('11/9/2016 07:18:02 AM');
  testValidDateString('11/9/2016 17:18:02');
  testValidDateString('11/9/2016 07:18:02PM');
  testValidDateString('11/9/2016 17:18:02.123');
  testValidDateString('11/9/2016 07:18:02.234 pm');
  // time only (not supported, for now)
/*
  testValidDateString('7:18');
  testValidDateString('7:18:02');
  testValidDateString('7:18:02.123');
  testValidDateString('07:18');
  testValidDateString('07:18:02');
  testValidDateString('07:18:02.123');
  testValidDateString('7:18 am');
  testValidDateString('7:18:02pm');
  testValidDateString('7:18:02.123 pm');
  testValidDateString('07:18am');
  testValidDateString('07:18:02 am');
  testValidDateString('07:18:02.123pm');
*/
  // iso 8601
  // Support full dates, dates with times, dates with times and timezones,
  // no compressed format
  testValidDateString('2016-11-10');
  testValidDateString('2016-11-09T07:18:02');
  testValidDateString('2016-11-09T07:18:02-07:00');
  testValidDateString('2016-11-09T07:18:02+0700');
  testValidDateString('2016-11-10T21:27:42Z');
  testValidDateString('2016-11-09T07:18:02.123');
  testValidDateString('2016-11-09T07:18:02.123+07:00');
  testValidDateString('2016-11-09T07:18:02.123-0700');
  testValidDateString('2016-11-10T21:27:42.123Z');
  testValidDateString('September 1, 2016');
  testValidDateString('2016-11-10T21:27:42.12Z');
  // invalid strings
  testInvalidDateString();
  testInvalidDateString('');
  testInvalidDateString('a');
  testInvalidDateString('123');
  testInvalidDateString('123%');
  testInvalidDateString('//');
  testInvalidDateString(':');
  testInvalidDateString('::');
  // likely meant to be dates, but not recognized, yet.
  testInvalidDateString('11/ 9/2016');
  testInvalidDateString('12/31');
  testInvalidDateString('1/2');
  testInvalidDateString('2016-1-10T21:27:42.123Z');
  testInvalidDateString('2016-1-10T21:7:42.123Z');
  testInvalidDateString('2016-1-10T1:07:42.123Z');
});

test("Test canonicalizeInputValue()", function() {
  equals(DG.DataUtilities.canonicalizeInputValue(), "");
  equals(DG.DataUtilities.canonicalizeInputValue(null), "");
  equals(DG.DataUtilities.canonicalizeInputValue("undefined"), "");
  equals(DG.DataUtilities.canonicalizeInputValue(""), "");
  equals(DG.DataUtilities.canonicalizeInputValue("foo"), "foo");
  // ok(DG.DataUtilities.canonicalizeInputValue("2002-12-31T23:00:00+01:00") instanceof Date, "canonicalizeInputValue('2002-12-31T23:00:00+01:00')");
  // ok(DG.DataUtilities.canonicalizeInputValue("2016-02-01") instanceof Date, "canonicalizeInputValue('2016-02-01')");
});

test("Test canonicalizeInternalValue()", function() {
  equals(DG.DataUtilities.canonicalizeInternalValue(), "");
  equals(DG.DataUtilities.canonicalizeInternalValue(null), "");
  equals(DG.DataUtilities.canonicalizeInternalValue("undefined"), "");
  equals(DG.DataUtilities.canonicalizeInternalValue("foo"), "foo");
  ok(DG.DataUtilities.canonicalizeInternalValue("2002-12-31T23:00:00+01:00") instanceof Date, "canonicalizeInternalValue('2002-12-31T23:00:00+01:00')");
  equals(DG.DataUtilities.canonicalizeInternalValue("2016-02-01"), "2016-02-01", "canonicalizeInternalValue('2016-02-01')");
});
