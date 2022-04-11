// ==========================================================================
//                            DG.DateUtilities
//
//  Author:   William Finzer
//
//  Copyright (c) 2017 by The Concord Consortium, Inc. All rights reserved.
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
    @namespace Date value utility functions
*/
DG.DateUtilities = {
  // DateTime levels
   EDateTimeLevel: {
    eSecond: 0,
    eMinute: 1,
    eHour: 2,
    eDay: 3,
    eMonth: 4,
    eYear: 5
  },
  kSecond: 1000,
  kMinute: (1000) * 60,
  kHour: ((1000) * 60) * 60,
  kDay: (((1000) * 60) * 60) * 24,
  kMonth: ((((1000) * 60) * 60) * 24) * 30,
  kYear: ((((1000) * 60) * 60) * 24) * 365

};

/**
 * 1. Compute the outermost date-time level that changes from the
 * minimum to the maximum date.
 * 2. The inner level is one smaller than this unless the difference of
 * the min and max outer levels is greater than some arbitrary minimum,
 * in which case the inner is the same as the outer.
 *
 * @param iMinDate { Number } milliseconds
 * @param iMaxDate { Number } milliseconds
 * @return {{outerLevel: EDateTimeLevel, innerLevel: EDateTimeLevel, increment: {Number}}
 */
DG.DateUtilities.determineLevels = function(iMinDate, iMaxDate) {
  var tDateDiff = iMaxDate - iMinDate,
      tIncrement = 1, // Will only be something else if inner level is year
      tOuterLevel, tInnerLevel;

  if (tDateDiff < 3 * this.kMinute) {
    tOuterLevel = this.EDateTimeLevel.eDay;
    tInnerLevel = this.EDateTimeLevel.eSecond;
  }
  else if (tDateDiff < 3 * this.kHour) {
    tOuterLevel = this.EDateTimeLevel.eDay;
    tInnerLevel = this.EDateTimeLevel.eMinute;
  }
  else if (tDateDiff < 3 * this.kDay) {
    tOuterLevel = this.EDateTimeLevel.eDay;
    tInnerLevel = this.EDateTimeLevel.eHour;
  }
  else if (tDateDiff < 3 * this.kMonth) {
    tOuterLevel = this.EDateTimeLevel.eMonth;
    tInnerLevel = this.EDateTimeLevel.eDay;
  }
  else if (tDateDiff < 3 * this.kYear) {
    tOuterLevel = this.EDateTimeLevel.eYear;
    tInnerLevel = this.EDateTimeLevel.eMonth;
  }
  else {
    tOuterLevel = this.EDateTimeLevel.eYear;
    tInnerLevel = this.EDateTimeLevel.eYear;
    tIncrement = Math.max( 1, DG.MathUtilities.goodTickValue( tDateDiff / (this.kYear * 5)));
  }
  return {
    increment: tIncrement,
    outerLevel: tOuterLevel,
    innerLevel: tInnerLevel
  };
};

DG.DateUtilities.mapLevelToPrecision = function( iLevel) {
  var tPrecision = DG.Attribute.DATE_PRECISION_NONE;
  switch (iLevel) {
    case this.EDateTimeLevel.eSecond:
      tPrecision = DG.Attribute.DATE_PRECISION_SECOND;
      break;
    case this.EDateTimeLevel.eMinute:
      tPrecision = DG.Attribute.DATE_PRECISION_MINUTE;
      break;
    case this.EDateTimeLevel.eHour:
      tPrecision = DG.Attribute.DATE_PRECISION_HOUR;
      break;
    case this.EDateTimeLevel.eDay:
      tPrecision = DG.Attribute.DATE_PRECISION_DAY;
      break;
    case this.EDateTimeLevel.eMonth:
      tPrecision = DG.Attribute.DATE_PRECISION_MONTH;
      break;
    case this.EDateTimeLevel.eYear:
      tPrecision = DG.Attribute.DATE_PRECISION_YEAR;
      break;
  }
  return tPrecision;
};

/**
  Returns true if the specified value should be treated as epoch
  seconds when provided as the only argument to the date() function,
  false if the value should be treated as a year.
  date(2000) should be treated as a year, but date(12345) should not.
 */
DG.DateUtilities.defaultToEpochSecs = function(iValue) {
  return Math.abs(iValue) >= 5000;
};

/**
  Returns a DG date object constructed from its arguments.
  Currently this is a JavaScript Date object, but could be
  replaced with another (e.g. moment.js) object at some point.
 */
DG.DateUtilities.createDate = function(/* iArgs */) {
  var args = [Date].concat(Array.prototype.slice.call(arguments)),
      date;

  if (args.length === 2 && typeof args[1] === 'string' && isNaN(args[1])) {
    return DG.DateUtilities.dateParser.parseDate(args[1], true);
  }

  if ((args.length === 2)) {  // We have either seconds since 1970 or a year
    if (DG.DateUtilities.defaultToEpochSecs(args[1]))
      args[1] = Number(args[1]) * 1000;// convert from seconds to milliseconds
    else {  // We have a value < 5000.
      args[2] = 0;  // This will force the constructor to treat args[1] as a year
    }
  }
  // Call Date constructor with specified arguments
  // cf. http://stackoverflow.com/a/8843181
  /* jshint -W058 */
  date = new (Function.bind.apply(Date, args))();

  if (isNaN(date)) {
    date = null;
  }

  // replace default numeric conversion (milliseconds) with our own (seconds)
  if (date) {
    date.valueOf = function() { return Date.prototype.valueOf.apply(this) / 1000; };
  }

  return date;
};
DG.createDate = DG.DateUtilities.createDate;

/**
  Returns true if the specified value is a DG date object.
 */
DG.DateUtilities.isDate = function(iValue) {
  return iValue instanceof Date;
};
DG.isDate = DG.DateUtilities.isDate;

DG._isDateRegex = null;

/**
 * Returns true if the specified value is a string that can be converted to a
 * valid date.
 * If iLoose is true, applies a looser definition of date. For example, a four
 * digit number is interpreted as a year.
 */
DG.DateUtilities.isDateString = function(iValue, iLoose) {
  return DG.DateUtilities.dateParser.isDateString(iValue, iLoose);
};
DG.isDateString = DG.DateUtilities.isDateString;

/**
 * Default formatting for Date objects.
 * @param date {Date | number }
 * @param precision {number}
 * @param useShortFormat {boolean} default is false
 * @return {string}
 */

DG.DateUtilities.formatDate = function(x, precision, useShortFormat) {
  var formatPrecisions = {
    'year': {year: 'numeric'},
    'month': {year: 'numeric', month: 'numeric'},
    'day': {year: 'numeric', month: 'numeric', day: 'numeric'},
    'hour': {year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric'},
    'minute': {year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'},
    'second': {year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'},
    'millisecond': {year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', fractionalSecondDigits: 3}
  };

  var precisionFormat = formatPrecisions[precision] || formatPrecisions.minute;

  if (!(x && (DG.isDate(x) || DG.isDateString(x) || DG.MathUtilities.isNumeric(x)))) return;

  if ( DG.MathUtilities.isNumeric(x)) {
    x = new Date(x*1000);
  } else if (DG.isDateString(x)) {
    x = new Date(x);
  }

  var locale = DG.get('currentLanguage');
  return new Intl.DateTimeFormat(locale, precisionFormat).format(x);
};
DG.formatDate = DG.DateUtilities.formatDate;

/**
  Default formatting for Date objects.
  Uses toLocaleDateString() for default date formatting.
  Optionally uses toLocaleTimeString() for default time formatting.
 */
DG.DateUtilities.monthName = function(x) {
  if (!(x && (DG.isDate(x) || DG.isDateString(x) || DG.MathUtilities.isNumeric(x)))) return "";
  var date;
  if (DG.isDate(x))
    date = x;
  else
    date = DG.createDate(x);
  var monthNames = [
        'DG.Formula.DateLongMonthJanuary',
        'DG.Formula.DateLongMonthFebruary',
        'DG.Formula.DateLongMonthMarch',
        'DG.Formula.DateLongMonthApril',
        'DG.Formula.DateLongMonthMay',
        'DG.Formula.DateLongMonthJune',
        'DG.Formula.DateLongMonthJuly',
        'DG.Formula.DateLongMonthAugust',
        'DG.Formula.DateLongMonthSeptember',
        'DG.Formula.DateLongMonthOctober',
        'DG.Formula.DateLongMonthNovember',
        'DG.Formula.DateLongMonthDecember'
      ],
      monthName = monthNames[date.getMonth()];
  return monthName && monthName.loc();
};
DG.monthName = DG.DateUtilities.monthName;

/**
 * parseDate - Parses dates in a uniform manner across browser
 *
 * Has two modes: strict (default) and loose
 *
 * In strict mode recognizes year, month or year, month, day iso calendar date
 * or date/time strings (not just year) and local dates and date/time strings.
 * In loose mode recognizes all iso calendar dates and iso date-time strings and
 * a variety of date and date/time formats.
 *
 * Recognized in strict mode or loose mode, en/US locale:
 *   * 2019-05
 *   * 2019-05-25
 *   * 2019-05-25 10:04Z
 *   * 2019-05-25T10:04Z
 *   * 2019-05-25T10:04:03+01:00
 *   * 2019-05-25T10:04:03.123+01:00
 *   * 5/25/2019
 *   * 5/25/2019 10:04
 *   * 5/25/2019 10:04am
 *   * 5/25/2019 10:04:32.123 AM
 *
 * Recognized in loose mode
 *   * 2019
 *   * 2019.05.25
 *   * 25 Oct 2019
 *   * Oct 25, 2019
 *   * Oct. 25, 2019
 *   * October 25, 2019
 * Not recognized as dates
 *   * relative dates (e.g. today, tomorrow, next week)
 *   * anniversary dates (e.g. June 5)
 *   * out of range dates (e.g. June 32, 2019)
 */
DG.DateUtilities.dateParser = (function () {
  var timePart = '(\\d\\d?)(?::(\\d\\d?)(?::(\\d\\d)(?:\\.(\\d+))?)?)?';
  var monthsFull = [
    'DG.Formula.DateLongMonthJanuary',
    'DG.Formula.DateLongMonthFebruary',
    'DG.Formula.DateLongMonthMarch',
    'DG.Formula.DateLongMonthApril',
    'DG.Formula.DateLongMonthMay',
    'DG.Formula.DateLongMonthJune',
    'DG.Formula.DateLongMonthJuly',
    'DG.Formula.DateLongMonthAugust',
    'DG.Formula.DateLongMonthSeptember',
    'DG.Formula.DateLongMonthOctober',
    'DG.Formula.DateLongMonthNovember',
    'DG.Formula.DateLongMonthDecember'
  ].map(function (m) {return m.loc().toLowerCase(); });

  var monthsAbbr = [
    'DG.Formula.DateShortMonthJanuary',
    'DG.Formula.DateShortMonthFebruary',
    'DG.Formula.DateShortMonthMarch',
    'DG.Formula.DateShortMonthApril',
    'DG.Formula.DateShortMonthMay',
    'DG.Formula.DateShortMonthJune',
    'DG.Formula.DateShortMonthJuly',
    'DG.Formula.DateShortMonthAugust',
    'DG.Formula.DateShortMonthSeptember',
    'DG.Formula.DateShortMonthOctober',
    'DG.Formula.DateShortMonthNovember',
    'DG.Formula.DateShortMonthDecember'
  ].map(function(m) {return m.loc().toLowerCase();});

  var daysOfWeek = [
    "DG.Formula.DateLongDaySunday",
    "DG.Formula.DateLongDayMonday",
    "DG.Formula.DateLongDayTuesday",
    "DG.Formula.DateLongDayWednesday",
    "DG.Formula.DateLongDayThursday",
    "DG.Formula.DateLongDayFriday",
    "DG.Formula.DateLongDaySaturday",
  ].map( function (dow) {return dow.loc().toLowerCase();});

  var daysOfWeekAbbr = [
    "DG.Formula.DateShortDaySunday",
    "DG.Formula.DateShortDayMonday",
    "DG.Formula.DateShortDayTuesday",
    "DG.Formula.DateShortDayWednesday",
    "DG.Formula.DateShortDayThursday",
    "DG.Formula.DateShortDayFriday",
    "DG.Formula.DateShortDaySaturday",
  ].map( function (dow) {return dow.loc().toLowerCase();});

  var monthsProperAbbrRE = monthsAbbr.map(function (str) {return str + '\\.';});
  var monthsProperAbbr = monthsAbbr.map(function (str) {return str + '.';});
  // var ordinals='0th,1st,2nd,3rd,4th,5th,6th,7th,8th,9th';
  var monthsArray = monthsAbbr.concat(monthsProperAbbr, monthsFull);
  var monthsArrayRE = monthsAbbr.concat(monthsProperAbbrRE, monthsFull);
  var daysOfWeekArray = daysOfWeek.concat(daysOfWeekAbbr);

  // yyyy-MM-dd hh:mm:ss.SSSZ
  var isoDateTimeRE = /^(\d{4})-([01]\d)(?:-([0-3]\d)(?:[T ]([0-2]\d)(?::([0-5]\d)(?::([0-5]\d)(?:[.,](\d+))?)?)?(Z|(?:[+-]\d\d:?\d\d?)| ?[a-zA-Z]{1,4}T)?)?)?$/;
  var isoDateTimeGroupMap = {year:1, month:2, day:3, hour:4, min:5, sec: 6, subsec: 7, timezone: 8};

  // MM/dd/yyyy hh:mm:ss.SSS PM
  var localDateTimeRE = /^([01]?\d)\/([0-3]?\d)\/(\d{4}|\d{2})(?:,? (\d\d?)(?::(\d\d?)(?::(\d\d)(?:\.(\d+))?)?)?(?: ?(am|pm|AM|PM))?)?$/;
  var localDateTimeGroupMap = {year:3, month:1, day:2, hour:4, min:5, sec: 6, subsec: 7, ampm: 8, timezone: 9};

  // dd MMM, yyyy or MMM, yyyy
  var  dateVar1 = new RegExp('^(\\d\\d?) (' + monthsArrayRE.join('|') + '),? (\\d{4})(?: ' + timePart + '(?: (am|pm))?)?$', 'i');
  var dateVar1GroupMap = {year:3, month:2, day:1, hour:4, min:5, sec: 6, subsec: 7, ampm: 8};

  // yyyy-mm-dd, yyyy.mm.dd, yyyy/mm/dd
  // Require all three parts
  var dateVar2 = new RegExp('^(\\d{4})[./-](\\d\\d?)[./-](\\d\\d?)(?: ' + timePart + '(?: (am|pm|AM|PM))?)?$');
  var dateVar2GroupMap = {year:1, month:2, day:3, hour:4, min:5, sec: 6, subsec: 7, ampm: 8};

  // MMM dd, yyyy or MMM yyyy
  var dateVar3 = new RegExp('^(?:(?:' + daysOfWeekArray.join('|') + '),? )?(' + monthsArrayRE.join('|') + ')(?: (\\d\\d?),)? (\\d{4})(?: ' + timePart + '(?: (am|pm))?)?$', 'i');
  var dateVar3GroupMap = {year:3, month:1, day:2, hour:4, min:5, sec: 6, subsec: 7, ampm: 8};

  // 'hh:mm:ss AM/PM on dd/MM/yyyy'
  var dateVar4 = /(\d\d?):(\d\d)(?::(\d\d))? (AM|PM) on (\d\d?)\/(\d\d?)\/(\d{4})/;
  var dateVar4GroupMap = {year:5, month: 6, day: 7, hour: 1, min: 2, sec: 3, ampm: 4};

  // unix dates: Tue Jul  9 18:16:04 PDT 2019
  var unixDate = new RegExp('^(?:(?:' + daysOfWeekAbbr.join('|') + ') )?(' + monthsAbbr.join('|') + ') ([ \\d]\\d) ([ \\d]\\d):(\\d\\d):(\\d\\d) ([A-Z]{3}) (\\d{4})$', 'i');
  var unixDateGroupMap = {year: 7, month: 1, day: 2, hour: 3, min: 4, sec:5, timezone: 6};

  // new Date().toString(), most browsers
  var browserDate = new RegExp('^(?:' + daysOfWeekAbbr.join('|') + ') (' + monthsAbbr.join('|') + ') (\\d\\d?),? (\\d{4})(?: ' + timePart + ' (GMT(?:[+-]\\d{4})?(?: \\([\\w ]+\\))?))', 'i');
  var browserDateGroupMap = {year:3, month:1, day:2, hour:4, min:5, sec: 6, subsec: 7, timezone: 8};

  var utcDate = new RegExp('^(?:' + daysOfWeekAbbr.join('|') + '),? (\\d\\d?) (' + monthsAbbr.join('|') + ') (\\d{4}) ' + timePart + ' GMT$', 'i');
  var utcDateGroupMap = {year:3, month:2, day:1, hour:4, min:5, sec: 6, subsec: 7, timezone: 8};

  // yyyy
  var dateVarYearOnly = /^\d{4}$/;
  var dateVarYearOnlyGroupMap = {year:0};



// MMMM dd, yyyy hh:mm:ss.SSS PM

  var formatSpecs = [
    { strict: true, regex: localDateTimeRE, groupMap: localDateTimeGroupMap },
    { strict: true, regex: isoDateTimeRE, groupMap: isoDateTimeGroupMap },
    { strict: true, regex: unixDate, groupMap: unixDateGroupMap },
    { strict: true, regex: browserDate, groupMap: browserDateGroupMap},
    { strict: true, regex: utcDate, groupMap: utcDateGroupMap},
    { strict: false, regex: dateVar2, groupMap: dateVar2GroupMap },
    { strict: true, regex: dateVar1, groupMap: dateVar1GroupMap },
    { strict: true, regex: dateVar3, groupMap: dateVar3GroupMap },
    { strict: false, regex: dateVarYearOnly, groupMap: dateVarYearOnlyGroupMap },
    { strict: false, regex: dateVar4, groupMap: dateVar4GroupMap }
  ];

  function extractDateProps(match, map) {
    function fixHour(hr, amPm) {
      if (isNaN(hr)) {
        return null;
      }
      var newHr = Number(hr);
      if (amPm != null && (0<newHr<=12)) {
        newHr = newHr % 12;
        if (amPm && amPm.toLowerCase() === 'pm') {
          newHr += 12;
        }
      }
      return newHr;
    }
    function fixMonth(m) {
      if (!isNaN(m)) {
        return Number(m);
      }
      var lcMonth = m.toLowerCase();
      var monthIx = monthsArray.findIndex(function (monthName) { return monthName === lcMonth; });
      return (monthIx % 12) + 1;
    }
    function fixYear(y) {
      if (y.length === 2) {
        y = Number(y);
        if (y<49) {
          return 2000 + y;
        } else {
          return 1900 + y;
        }
      }
      else {
        return y;
      }
    }
    return {
      year: Number(fixYear(match[map.year])),
      month: fixMonth(match[map.month] || 1),
      day: Number(match[map.day] || 1),
      hour: fixHour(match[map.hour] || 0,match[map.ampm]) ,
      min: Number(match[map.min] || 0) ,
      sec: Number(match[map.sec] || 0),
      subsec: Number(match[map.subsec] || 0),
    };
  }
  function isValidDateSpec(dateSpec) {
    var isValid =
        !isNaN(dateSpec.year) &&
        (!isNaN(dateSpec.month) && (1<=dateSpec.month<=12)) &&
        (!isNaN(dateSpec.day) && (1<=dateSpec.day<=31)) &&
        (!isNaN(dateSpec.hour) && (0<=dateSpec.hour<=23)) &&
        (!isNaN(dateSpec.min) && (0<=dateSpec.min<=59)) &&
        (!isNaN(dateSpec.sec) && (0<=dateSpec.sec<=59)) &&
        !isNaN(dateSpec.subsec);
    if (isValid) { return dateSpec; }
  }


  function parseDate(iValue, iLoose) {
    if (iValue == null) {
      return iValue;
    }
    if (iValue instanceof Date) {
      return iValue;
    }
    iValue = String(iValue);
    var match;
    var dateSpec;
    var groupMap;
    var date;
    var spec = formatSpecs.some(function (spec) {
      var m;
      var parsed = false;
      if (spec.strict || iLoose) {
        m = iValue.match(spec.regex);
        if (m) {
          match = m;
          groupMap = spec.groupMap;
          parsed = true;
        }
      }
      return parsed;
    });

    if (spec && match) {
      dateSpec = isValidDateSpec(extractDateProps(match, groupMap));
      if (dateSpec) {
        date = new Date(dateSpec.year, (-1 + dateSpec.month), dateSpec.day,
            dateSpec.hour, dateSpec.min, dateSpec.sec, dateSpec.subsec);
        if (date) date.valueOf = function() { return Date.prototype.valueOf.apply(this) / 1000; };
        return date;
      }
    }
  }
  function isDateString(iValue, iLoose) {
    return (typeof iValue === 'string') && !!formatSpecs.find(function (spec) {
      if (!(spec.strict || iLoose)) {
        return false;
      }
      return spec.regex.test(iValue);
    });
  }

  return {
    parseDate: parseDate,
    isDateString: isDateString
  };

}());

DG.parseDate = DG.DateUtilities.dateParser.parseDate;
