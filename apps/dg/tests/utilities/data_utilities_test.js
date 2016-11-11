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
    ok(DG.DataUtilities.isDateString(dateString), 'Valid date: ' + dateString);
  }
  function testInvalidDateString(dateString) {
    ok(!DG.DataUtilities.isDateString(dateString), 'Invalid date: ' + dateString);
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
  testValidDateString('2016-11-10T21:27:42Z');
  // invalid strings
  testInvalidDateString('');
  testInvalidDateString('a');
  testInvalidDateString('123');
  testInvalidDateString('123%');
  testInvalidDateString('September 1, 2016');
  testInvalidDateString('11/ 9/2016');
  testInvalidDateString('//');
  testInvalidDateString(':');
  testInvalidDateString('::');

});