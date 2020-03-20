// ==========================================================================
//                    Date/Time Functions
//
//  Author:   Kirk Swenson
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

sc_require('formula/function_registry');

/**
  Implements the basic builtin functions and registers them with the FunctionRegistry.
 */
DG.functionRegistry.registerFunctions((function() {

  /**
    Utility function for converting to a Date object.
   */
  function convertToDate(x) {
    if (DG.isDate(x)) return x;
    return DG.createDate(x); // strings are subject to browser inconsistencies
  }

  return {

    /**
      Returns a new date created from its arguments. If a single large argument,
      it is treated as
      @param  {Number}  iYearOrEpochSecs - If multiple arguments, the first argument
                          is considered to be the year. If only a single argument,
                          it is considered to be the number of seconds since 1/1/1970.
      @param  {Number}  [iMonth] - the (1-based?) month (default: 0)
      @param  {Number}  [iDay] - the (1-based) day of the month (default: 1)
      @param  {Number}  [iHour] - the hour within the day (default: 0)
      @param  {Number}  [iMinute] - the minute within the hour (default: 0)
      @param  {Number}  [iSeconds] - the second within the minute
      @param  {Number}  [iMilliseconds] - the milliseconds within the second
      @returns  {Date}  the date created
     */
    'date': {
      minArgs:1, maxArgs:7, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(iYearOrEpochSecs, iMonth, iDay, iHour, iMinute, iSecond, iMillisec) {
        // check for valid arguments
        var i, firstEmpty, lastValid, numValid = 0;
        for (i = 0; i < arguments.length; ++i) {
          var arg = arguments[i];
          if (SC.empty(arg)) {
            if (!firstEmpty && (i > 0)) firstEmpty = i;
          }
          else {
            // can't have non-empty arguments after empty ones (except for empty year)
            if (firstEmpty) return '';
            // can't have non-numeric arguments
            if (!DG.isNumeric(arg)) return '';
            lastValid = i;
            ++numValid;
          }
        }
        // date() => now()
        if (numValid === 0) return DG.createDate();
        // convert epoch seconds
        if ((lastValid === 0) && DG.DateUtilities.defaultToEpochSecs(iYearOrEpochSecs))
          return DG.createDate(iYearOrEpochSecs);
        var now = new Date(),
            year = now.getFullYear(),
            // dividing line for two-digit years is 10 yrs from now
            cutoff = (year + 10) % 100,
            month = iMonth > 0 ? iMonth - 1 : 0,
            day = iDay || 1,
            hour = iHour || 0,
            min = iMinute || 0,
            sec = iSecond || 0,
            ms = iMillisec || 0;
        // empty year argument => current year
        if (SC.empty(iYearOrEpochSecs))
          iYearOrEpochSecs = year;
        // interpret two-digit years; will need to be adjusted before 2090
        else if (iYearOrEpochSecs < cutoff)
          iYearOrEpochSecs += 2000;
        else if (iYearOrEpochSecs < 100)
          iYearOrEpochSecs += 1900;
        return DG.createDate(iYearOrEpochSecs, month, day, hour, min, sec, ms);
      }
    },

    /**
      Returns the day of the month corresponding to the given date.
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {Number}      The month for the given date
     */
    'dayOfMonth': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        var date = convertToDate(x);
        return date && date.getDate();
      }
    },

    /**
      Returns the numeric day of the week corresponding to the given date.
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {Number}      The numeric day of the week for the given date
     */
    'dayOfWeek': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        var date = convertToDate(x);
        return date && (date.getDay() + 1);
      }
    },

    /**
      Returns the day of the week corresponding to the given date as a string.
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {String}      The day of the week for the given date as a string
     */
    'dayOfWeekName': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        var date = convertToDate(x),
            dayNames = [
              'DG.Formula.DateLongDaySunday',
              'DG.Formula.DateLongDayMonday',
              'DG.Formula.DateLongDayTuesday',
              'DG.Formula.DateLongDayWednesday',
              'DG.Formula.DateLongDayThursday',
              'DG.Formula.DateLongDayFriday',
              'DG.Formula.DateLongDaySaturday'
            ],
            dayName = date && dayNames[date.getDay()];
        return dayName && dayName.loc();
      }
    },

    /**
      Returns the hour of the day corresponding to the given date.
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {Number}      The numeric hour of the day for the given date
     */
    'hours': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        var date = convertToDate(x);
        return date && date.getHours();
      }
    },

    /**
      Returns the minute of the hour corresponding to the given date.
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {Number}      The numeric minute of the hour for the given date
     */
    'minutes': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        var date = convertToDate(x);
        return date && date.getMinutes();
      }
    },

    /**
      Returns the numeric month corresponding to the given date
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {String}  The month for the given date
     */
    'month': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        var date = convertToDate(x);
        return date && date.getMonth() + 1;
      }
    },

    /**
      Returns the month corresponding to the given date as a string
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {String}  The month for the given date as a string
     */
    'monthName': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        return DG.monthName(x);
      }
    },

//@if(debug)
    /**
      Returns the current date/time.
      Useful for debugging but potentially confusing for users.
      Only included in debug builds for the time being.
     */
    'now': {
      minArgs:0, maxArgs:0, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function() { return DG.createDate(); }
    },
//@endif

    /**
      Returns the seconds of the minute corresponding to the given date.
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {Number}      The numeric seconds of the minute for the given date
     */
    'seconds': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        var date = convertToDate(x);
        return date && date.getSeconds();
      }
    },

    /**
      Returns a date object corresponding to the current date with no time (i.e. midnight)
      @returns  {Date}    the corresponding date object
     */
    'today': {
      minArgs:0, maxArgs:0, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function() {
        var now = new Date();
        // eliminate time within the day
        return DG.createDate(now.getFullYear(), now.getMonth(), now.getDate());
      }
    },

    /**
      Returns the year corresponding to the given date
      @param    {Date|Number|String} A date object or value convertible to a date object
      @returns  {Number}  The year for the given date
     */
    'year': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryDateTime',
      evalFn: function(x) {
        var date = convertToDate(x);
        return date && date.getFullYear();
      }
    }

  };
})());
