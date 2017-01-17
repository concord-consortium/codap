// ==========================================================================
//  DG.DataUtilities
//
//  Functions and constants for consistent handling of data values
//  in plots, tables, etc.
//
//  Author:   Craig D. Miller
//
//  Copyright ©2011-13 Scientific Reasoning Research Institute,
//                  University of Massachusetts Amherst
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
DG.DataUtilities = {
    // add constants here
};

/** Get the standard internal representation of "missing" value,
 *  to be excluded from statistical calculations and plotted points.
 *  See also isMissingValue()
 *  @returns null
 */
DG.DataUtilities.getMissingValue = function() {
    return null;
};

/** Is the given data value a "missing" value, to be excluded
 *  from statistical calculations and plotted points?
 *  See also getMissingValue()
 *  @param iValue
 */
DG.DataUtilities.isMissingValue = function( iValue ) {
    switch( typeof iValue ) {
        case 'string':  return iValue === '';
        case 'number':  return ! isFinite( iValue );
        case 'boolean': return false;
    }
    return true; // null, undefined, objects, functions, etc.
};

/**
  Returns a DG date object constructed from its arguments.
  Currently this is a JavaScript Date object, but could be
  replaced with another (e.g. moment.js) object at some point.
 */
DG.DataUtilities.createDate = function(/* iArgs */) {
  var args = [Date].concat(Array.prototype.slice.call(arguments)),
      date;

  // convert from seconds to milliseconds
  if ((args.length >= 2) && (Number(args[1]) >= 10000))
    args[1] = Number(args[1]) * 1000;

  // Call Date constructor with specified arguments
  // cf. http://stackoverflow.com/a/8843181
  /* jshint -W058 */
  date = new (Function.bind.apply(Date, args))();

  // replace default numeric conversion (milliseconds) with our own (seconds)
  date.valueOf = function() { return Date.prototype.valueOf.apply(this) / 1000; };

  return date;
};
DG.createDate = DG.DataUtilities.createDate;

/**
  Returns true if the specified value is a DG date object.
 */
DG.DataUtilities.isDate = function(iValue) {
  return iValue instanceof Date;
};
DG.isDate = DG.DataUtilities.isDate;

DG._isDateRegex = null;

/**
  Returns true if the specified value is a string that can be converted to a valid date.
 Note that a string that can be coerced to a number is not a valid date string even though
 it could be converted to a date.
 */
DG.DataUtilities.isDateString = function(iValue) {
  if (!this._isDateRegex) {
    // assemble the regular expression from localized strings
    //
    this._isDateRegex = new RegExp('^(?:(?:'
        + 'DG.Utilities.date.localDatePattern'.loc() + '(?: '
        + 'DG.Utilities.date.timePattern'.loc() + ')?)|'
        + 'DG.Utilities.date.iso8601Pattern'.loc() + ')$', 'i');
  }
  return (typeof iValue === 'string' && this._isDateRegex.test(iValue.toLowerCase()));
};
DG.isDateString = DG.DataUtilities.isDateString;

/**
  Default formatting for Date objects.
  Uses toLocaleDateString() for default date formatting.
  Optionally uses toLocaleTimeString() for default time formatting.
 */
DG.DataUtilities.formatDate = function(x) {
  if (!(x && DG.isDate(x))) return "";
  // use a JS Date object for formatting, since our valueOf()
  // change seems to affect string formatting
  var date = new Date(Number(x) * 1000),
      h = date.getHours(),
      m = date.getMinutes(),
      s = date.getSeconds(),
      ms = date.getMilliseconds(),
      hasTime = (h + m + s + ms) > 0,
      dateStr = date.toLocaleDateString(),
      timeStr = hasTime ? " " + date.toLocaleTimeString() : "";
  return dateStr + timeStr;
};

/**
  Canonicalize/sanitize case values sent to us from the game.
  Currently, we only check for the "undefined" string, but this is
  the appropriate place to perform any other validation as well.
  @param    iValue  The value sent by the game, e.g. a string value
  @returns          The canonicalized value
 */
DG.DataUtilities.canonicalizeInputValue = function( iValue) {
  // canonicalize null, undefined, and "undefined"
  if ((iValue == null) || (iValue === "undefined")) return "";
  if( typeof iValue !== 'string')
      return iValue;

  var value = iValue.trim();
  return DG.DataUtilities.isDateString(value) ? DG.DataUtilities.createDate(value) : value;
};

/**
  Canonicalize/sanitize case values converted to strings internally.
  Currently, we only check for the "undefined" string and canonical
  (ISO 8601) date strings.
  @param    iValue  The string value to be converted
  @returns          The canonicalized value
 */
DG.DataUtilities.canonicalizeInternalValue = function(iValue) {
  // canonicalize null, undefined, and "undefined"
  if ((iValue == null) || (iValue === "undefined")) return "";
  if( typeof iValue !== 'string')
      return iValue;

  var isIso8601DateString = function(iValue) {
    // canonicalize dates (cf. http://stackoverflow.com/a/37563868)
    var ISO_8601_FULL = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(([+-]\d\d:\d\d)|Z)?$/i;
    return (typeof iValue === 'string' && ISO_8601_FULL.test(iValue));
  }.bind(this);

  var value = iValue.trim();
  return isIso8601DateString(value) ? DG.DataUtilities.createDate(value) : value;
};

/**
  Canonicalize/sanitize case values sent to us from the game.
  This function also converts a map of property names to values
  to one that maps attribute IDs to values.
  @param    iAttrs  The set of attributes
  @param    iDataMap  A map from attribute names to values
  @returns          The canonicalized value map (attribute IDs to values)
 */
DG.DataUtilities.canonicalizeAttributeValues = function(iAttrs, iDataMap) {
  var valuesMap = {};
  DG.ObjectMap.forEach(iDataMap, function (iKey, iValue) {

    var attr = iAttrs.findProperty('name', iKey) ||
            iAttrs.findProperty('name', DG.Attribute.legalizeAttributeName(iKey)),
        value = DG.DataUtilities.canonicalizeInputValue(iValue);
    if(attr != null) {
      valuesMap[attr.id] = value;
    }
    else {
      valuesMap[iKey] = value;
    }
  });
  return valuesMap;
};

/**
 * Return true if the two data values are equal, ignoring case if they are both strings.
 * Data values are primitive case-attribute values, e.g. the return value of DG.Case.getValue()
 * @param iDataValue1
 * @param iDataValue2
 * @returns {Boolean}
 */
DG.DataUtilities.isEqualIgnoreCase = function( iDataValue1, iDataValue2 ) {
    var     tType1 = typeof iDataValue1,
            tType2 = typeof iDataValue2,
            tLowerStr1,
            tLowerStr2;
    if( tType1 === tType2 && tType1 === 'string' ) {
        tLowerStr1 = iDataValue1.toLowerCase();
        tLowerStr2 = iDataValue2.toLowerCase();
        return tLowerStr1 === tLowerStr2;
    } else {
        return iDataValue1 === iDataValue2;
    }

};

/**
 * Converts the input value to a string value, if it is not already.
 *
 * Converts dates according to the default date format.
 * Converts nulls and undefined to the empty string.
 *
 * @param {*} iValue The value to be converted.
 * @returns {String}
 */
DG.DataUtilities.toString = function (iValue) {
    var valType = typeof iValue;
    if (DG.isDate(iValue)) {
      // treat dates as strings
      iValue = DG.DataUtilities.formatDate(iValue);
      valType = "string";
    }
    switch( valType) {
      case "string":
        return iValue;
      case "number":
      case "boolean":
        return String( iValue);
    }
    return "";
}