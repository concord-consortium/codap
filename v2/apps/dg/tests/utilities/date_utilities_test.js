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
sc_require('utilities/date_utilities');

module("DG.Utilities", {
  setup: function() {
    window.DG = window.DG || {};
  },
  teardown: function() {
  }
});

test("Tests date utilities", function() {
  function testValidDateString(dateString) {
    ok(DG.isDateString(dateString), 'Valid date: ' + dateString);
  }
  function testParseDate(dateString, date) {
    var newDate = DG.parseDate(dateString, true);
    ok(newDate != null, "Parsed date: " + dateString);
    if (newDate) {
      date.valueOf = function() { return Date.prototype.valueOf.apply(this) / 1000; };
      ok(newDate.valueOf() === date.valueOf(), 'Match Date: ' + dateString);
    }
  }
  function testInvalidDateString(dateString) {
    ok(!DG.isDateString(dateString), 'Invalid date: ' + dateString);
  }
  // test date only
  // local date format
  testParseDate('11/9/2016', new Date(2016, 10, 9));
  testParseDate('11/09/2016', new Date(2016, 10, 9));
  testParseDate('4/1/1928', new Date(1928, 3, 1));
  testParseDate('11/9/16', new Date(2016, 10, 9));
  testParseDate('11/09/16', new Date(2016, 10, 9));
  testParseDate('04/1/28', new Date(2028, 3, 1));

  // iso dates
  testParseDate('2016-01', new Date(2016, 0, 1));
  testParseDate('2016-02-02', new Date(2016, 1, 2));

  // day, month name year dates
  testParseDate('03 Mar 2016', new Date(2016, 2, 3));

  // traditional US dates
  testParseDate('April 4, 2016', new Date(2016, 3, 4));
  testParseDate('Apr 5, 2016', new Date(2016, 3, 5));
  testParseDate('Monday, May 5, 2016', new Date(2016, 4,5));

  // year.month.day dates
  testParseDate('2016.6.6', new Date(2016, 5,6));

  // unix dates
  testParseDate('Thu Jul 11 09:12:47 PDT 2019', new Date(2019, 6, 11, 9, 12, 47));

  // UTC dates
  testParseDate('Thu, 11 Jul 2019 16:17:01 GMT', new Date(2019, 6, 11, 16, 17, 1));

  // ISO Date/time
  testParseDate('2019-07-11T16:20:38.575Z', new Date(2019, 6, 11, 16, 20, 38, 575));

  // dates with times
  testParseDate('11/9/2016 7:18', new Date(2016, 10, 9, 7, 18));
  testParseDate('11/9/2016 7:18am', new Date(2016, 10, 9, 7, 18));
  testParseDate('11/9/2016 7:18 am', new Date(2016, 10, 9, 7, 18));
  testParseDate('11/9/2016 7:18AM', new Date(2016, 10, 9, 7, 18));
  testParseDate('11/9/2016 7:18:02', new Date(2016, 10, 9, 7, 18, 2));
  testParseDate('11/9/2016 7:18:02 AM', new Date(2016, 10, 9, 7, 18, 2));
  testParseDate('11/9/2016 7:18:02PM', new Date(2016, 10, 9, 19, 18, 2));
  testParseDate('11/9/2016 7:18:02.123', new Date(2016, 10, 9, 7, 18, 2, 123));
  testParseDate('11/9/2016 7:18:02.234 pm', new Date(2016, 10, 9, 19, 18, 2, 234));
  testParseDate('11/9/2016 7:18:02.234am', new Date(2016, 10, 9, 7, 18, 2, 234));
  testParseDate('11/9/2016 17:18:02', new Date(2016, 10, 9, 17, 18, 2));
  testParseDate('11/9/2016 17:18:02.123', new Date(2016, 10, 9, 17, 18, 2, 123));
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
