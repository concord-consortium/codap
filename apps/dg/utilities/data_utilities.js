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
  return DG.isDateString(value) ? DG.createDate(value) : value;
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
  return isIso8601DateString(value) ? DG.createDate(value) : value;
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
            iAttrs.findProperty('name', DG.Attribute.canonicalizeName(iKey)),
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
    var valType = typeof iValue,
        value = iValue;
    if (DG.isDate(iValue)) {
      // treat dates as strings
      value = DG.formatDate(iValue);
      valType = "string";
    }
    else if (iValue instanceof Error) {
      value = iValue.name + " " + iValue.message;
      valType = "string";
    }
    else if (iValue instanceof DG.SimpleMap) {
      // map has its own toString() function
      valType = "map";
    }
    switch( valType) {
      case "string":
        return value;
      case "number":
      case "boolean":
      case "map":
        return String(iValue);
    }
    return "";
};

var kTypeNumber = 1,
    kTypeBoolean = 2,
    kTypeString = 3,
    kTypeNaN = 4,
    kTypeError = 5,
    kTypeSimpleMap = 6, // e.g. boundaries
    kTypeUnknown = 7,
    kTypeEmpty = 8;

/**
  Returns the type code corresponding to the specified value.
 */
DG.DataUtilities.typeCode = function(value) {
  if ((value == null) || (value === '')) return kTypeEmpty;
  if (value instanceof DG.SimpleMap) return kTypeSimpleMap;
  if (value instanceof Error) return kTypeError;
  switch (typeof value) {
    case 'number': return isNaN(value) ? kTypeNaN : kTypeNumber;
    case 'boolean': return kTypeBoolean;
    case 'string': return kTypeString;
    default: return kTypeUnknown;
  }
};

/**
  Comparison function for ascending sorts.
 */
DG.DataUtilities.compareAscending = function(value1, value2) {
  var type1 = DG.DataUtilities.typeCode(value1),
      type2 = DG.DataUtilities.typeCode(value2),
      num1 = type1 === kTypeNumber ? value1 : NaN,
      num2 = type2 === kTypeNumber ? value2 : NaN;
  if (type1 === kTypeString) {
    num1 = Number(value1);
    if (!isNaN(num1))
      type1 = kTypeNumber;
  }
  if (type2 === kTypeString) {
    num2 = Number(value2);
    if (!isNaN(num2))
      type2 = kTypeNumber;
  }
  if (type1 !== type2) return type1 - type2;

  function strCompareAscending(str1, str2) {
    // cf. https://stackoverflow.com/a/25775469 for performance issues with localeCompare
    return str1.localeCompare(str2, undefined, { sensitivity: 'base' });
  }

  switch(type1) {
    case kTypeNumber: return num1 - num2;
    case kTypeBoolean: return value1 - value2;
    case kTypeString:
    case kTypeError: return strCompareAscending(String(value1), String(value2));
    default: return 0;  // other types are not ordered
  }
};

/**
  Comparison function for descending sorts.
 */
DG.DataUtilities.compareDescending = function(value1, value2) {
  var type1 = DG.DataUtilities.typeCode(value1),
      type2 = DG.DataUtilities.typeCode(value2),
      num1 = type1 === kTypeNumber ? value1 : NaN,
      num2 = type2 === kTypeNumber ? value2 : NaN;
  if (type1 === kTypeString) {
    num1 = Number(value1);
    if (!isNaN(num1))
      type1 = kTypeNumber;
  }
  if (type2 === kTypeString) {
    num2 = Number(value2);
    if (!isNaN(num2))
      type2 = kTypeNumber;
  }
  if (type1 !== type2) return type1 - type2;

  function strCompareDescending(str1, str2) {
    // cf. https://stackoverflow.com/a/25775469 for performance issues with localeCompare
    return -str1.localeCompare(str2, undefined, { sensitivity: 'base' });
  }

  switch(type1) {
    case kTypeNumber: return num2 - num1;
    case kTypeBoolean: return value2 - value1;
    case kTypeString:
    case kTypeError: return strCompareDescending(String(value1), String(value2));
    default: return 0;  // other types are not ordered
  }
};
