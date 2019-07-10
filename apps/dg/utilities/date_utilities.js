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
    @namespace Data value utility functions
*/
DG.DateUtilities = {
    // add constants here
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

  // convert from seconds to milliseconds
  if ((args.length === 2) && DG.DateUtilities.defaultToEpochSecs(args[1]))
    args[1] = Number(args[1]) * 1000;

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
  Returns true if the specified value is a string that can be converted to a valid date.
 Note that a string that can be coerced to a number is not a valid date string even though
 it could be converted to a date.
 */
DG.DateUtilities.isDateString = function(iValue) {
  if (!this._isDateRegex) {
    // assemble the regular expression from localized strings
    //
    this._isDateRegex = new RegExp('^(?:(?:'
        + 'DG.Utilities.date.localDatePattern'.loc() + '(?:(?:, |,| )'
        + 'DG.Utilities.date.timePattern'.loc() + ')?)|'
        + 'DG.Utilities.date.iso8601Pattern'.loc() + ')$', 'i');
  }
  return (typeof iValue === 'string' && this._isDateRegex.test(iValue.toLowerCase()));
};
DG.isDateString = DG.DateUtilities.isDateString;

/**
  Default formatting for Date objects.
  Uses toLocaleDateString() for default date formatting.
  Optionally uses toLocaleTimeString() for default time formatting.
 */
DG.DateUtilities.formatDate = function(x, precision) {
  if (!(x && (DG.isDate(x) || DG.MathUtilities.isNumeric(x)))) return "";
  // use moment.js for formatting to avoid browser bugs
  /* global moment */
  var mom = DG.isDate(x) ? moment(x) : moment(Number(x) * 1000),
      formatString = 'l';
  if(precision) {
    switch (precision) {
      case DG.Attribute.DATE_PRECISION_YEAR:
        formatString = "DG.AttributeFormat.DatePrecision.year".loc();
        break;
      case DG.Attribute.DATE_PRECISION_MONTH:
        formatString = "DG.AttributeFormat.DatePrecision.month".loc();
        break;
      case DG.Attribute.DATE_PRECISION_DAY:
        formatString = "DG.AttributeFormat.DatePrecision.day".loc();
        break;
      case DG.Attribute.DATE_PRECISION_HOUR:
        formatString = "DG.AttributeFormat.DatePrecision.hour".loc();
        break;
      case DG.Attribute.DATE_PRECISION_MINUTE:
        formatString = "DG.AttributeFormat.DatePrecision.minute".loc();
        break;
      case DG.Attribute.DATE_PRECISION_SECOND:
        formatString = "DG.AttributeFormat.DatePrecision.second".loc();
        break;
    }
  }
  else {
    var h = mom.hours(),
        m = mom.minutes(),
        s = mom.seconds(),
        ms = mom.milliseconds(),
        hasTime = (h + m + s + ms) > 0,
        hasSeconds = (s + ms) > 0,
        hasMilliseconds = ms > 0;
    if (hasTime) {
      if (hasSeconds) {
        formatString += ' h:mm:ss' + (hasMilliseconds ? '.SSS A' : ' A');
      }
      else
        formatString += ' LT';
    }
  }
  return mom.format( formatString);
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

