// ==========================================================================
//                        DG.Formula Unit Test
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

sc_require('formula/formula');

module("DG.Formula", {
  setup: function() {
  },
  teardown: function() {
  }
});

test("Basic tests with default compile and evaluation contexts", function() {

  // Returns true if the expression is volatile, i.e. repeated
  // evaluation doesn't give the same result.
  function isVolatile( iSource) {
    return iSource.indexOf('random') >= 0;
  }
  
  // Returns true if the two values specified are essentially equivalent.
  // Uses a proportion test for real numbers so rounding errors aren't
  // interpreted as incorrect results.
  function isEquivalent( iValue1, iValue2) {
    // Must have same JavaScript types
    var type1 = typeof iValue1,
        type2 = typeof iValue2,
        isDate1 = DG.isDate(iValue1),
        isDate2 = DG.isDate(iValue2);
    if((type1 !== type2) || (isDate1 !== isDate2)) return false;
    // Numeric results require a bit more consideration
    if( type1 === 'number') {
      // NaN-status must be equivalent
      if( isNaN( iValue1) !== isNaN( iValue2)) return false;
      if( isNaN( iValue1) && isNaN( iValue2)) return true;
      // Identical values are clearly equivalent
      if( iValue1 === iValue2) return true;
      // Use proportional difference to compare real numbers
      var diffProportion = Math.abs( iValue1 - iValue2) / 
                          Math.max( Math.abs( iValue1), Math.abs( iValue2));
      return diffProportion < 1e-10;
    }
    else if (isDate1 && isDate2) {
      return Number(iValue1) === Number(iValue2);
    }
    // All non-numeric results must be identical
    return iValue1 === iValue2;
  }

  function buildAndEval( iSource, iContext, iEvalContext) {
    var formula = DG.Formula.create({ source: iSource });

    if( iContext) formula.set('context', iContext);
    
    //performanceTest( iSource, formula, iContext, iEvalContext);

    var compiledResult = formula.evaluate( iEvalContext),
        directResult = formula.evaluateDirect( iEvalContext),
        returnedResult = compiledResult;
    if( !isVolatile( iSource) && !isEquivalent( compiledResult, directResult)) {
      returnedResult = "Compiled (%@) !== Direct (%@)".fmt( compiledResult, directResult);
    }
    return returnedResult;
  }
  
  function floatEquals( iResult, iExpected, iDescription, iTolerance) {
    var diff = Math.abs( iResult - iExpected),
        tolerance = iTolerance || 1e-10;
    return ok( diff < tolerance, "%@: Result: %@, Expected: %@".fmt( iDescription, iResult, iExpected));
  }
  
  function inRange( iVal, iMin, iMax, iDescription) {
    return ok( (iMin <= iVal) && (iVal <= iMax), iDescription);
  }

  function dateEquals(iDate1, iDate2, iDescription) {
    // facillitate comparison between JS/DG Dates by converting
    // to milliseconds for DG Dates
    var numDate1 = iDate1.valueOf === Date.prototype.valueOf
                      ? Number(iDate1)          // JS Date object
                      : Number(iDate1) * 1000,  // DG Date object
        numDate2 = iDate2.valueOf === Date.prototype.valueOf
                      ? Number(iDate2)          // JS Date object
                      : Number(iDate2) * 1000;  // DG Date object
    return ok((iDate1 === iDate2) || (numDate1 === numDate2), iDescription);
  }
 
  //console.profile("formula unit test profile");
  
  // arithmetic functions
  equals( buildAndEval("abs(-1)"), 1, "abs() -- absolute value");
  equals( buildAndEval("abs(0)"), 0, "abs() -- absolute value");
  equals( buildAndEval("abs(1)"), 1, "abs() -- absolute value");
  equals( buildAndEval("ceil(-1.5)"), -1, "ceil() -- ceiling");
  equals( buildAndEval("ceil(1.5)"), 2, "ceil() -- ceiling");
  equals( buildAndEval("exp(0)"), 1, "exp() -- exponential (e^x)");
  equals( buildAndEval("exp(1)"), Math.E, "exp() -- exponential (e^x)");
  equals( buildAndEval("floor(-1.5)"), -2, "floor() -- floor");
  equals( buildAndEval("floor(1.5)"), 1, "floor() -- floor");
  floatEquals( buildAndEval("frac(1.5)"), 0.5, "frac(x) -- the fractional part of x");
  floatEquals( buildAndEval("frac(-1.5)"), -0.5, "frac(x) -- the fractional part of x");
  floatEquals( buildAndEval("ln(10)"), Math.LN10, "ln(x) -- natural logarithm");
  floatEquals( buildAndEval("log(e)"), Math.LOG10E, "log(x) -- base 10 logarithm");
  equals( buildAndEval("pow(2,3)"), 8, "pow(x,y) -- x^y");
  equals( buildAndEval("pow(-2,3)"), -8, "pow(x,y) -- x^y");
  equals( buildAndEval("round(1.9)"), 2, "round() -- round to integer");
  floatEquals( buildAndEval("round(1.987,2)"), 1.99, "round(x,n) -- round to decimal");
  floatEquals( buildAndEval("round(2012,-2)"), 2000, "round(x,n) -- round to decimal");
  floatEquals( buildAndEval("sqrt(2)"), Math.SQRT2, "sqrt(x) -- square root");
  floatEquals( buildAndEval("sqrt(1/2)"), Math.SQRT1_2, "sqrt(x) -- square root");
  equals( buildAndEval("trunc(1.5)"), 1, "trunc(x) -- truncate to integer");
  equals( buildAndEval("trunc(-1.5)"), -1, "trunc(x) -- truncate to integer");

  // date/time functions
  var d99 = new Date(1999, 11, 31, 12, 34, 56), // 12/31/1999 12:34:56
      d00 = new Date(2000, 11, 31, 12, 34, 56), // 12/31/2000 12:34:56
      d99Secs = Number(d99) / 1000,
      d2000101 = new Date(2000, 0, 1),          // 1/1/2000 00:00:00
      c = DG.FormulaContext.create({ vars: { d99: d99, d99Secs: d99Secs, d00: d00 } });
  dateEquals(buildAndEval("date(1999, 12, 31, 12, 34, 56)"), d99, "date(1999, 12, 31, 12, 34, 56)");
  dateEquals(buildAndEval("date(99, 12, 31, 12, 34, 56)"), d99, "date(99, 12, 31, 12, 34, 56)");
  dateEquals(buildAndEval("date(0, 12, 31, 12, 34, 56)"), d00, "date(0, 12, 31, 12, 34, 56)");
  dateEquals(buildAndEval("date(2000, 1, 1)"), d2000101, "date(2000, 1, 1)");
  dateEquals(buildAndEval("date(d99Secs)", c), d99, "date(d99Secs)");
  equals(buildAndEval("number(date(d99Secs))", c), d99Secs, "number(date(d99Secs))");
  equals(buildAndEval("year(d99)", c), 1999, "year(d99)");
  equals(buildAndEval("month(d99)", c), 12, "month(d99)");
  equals(buildAndEval("month(date(2000, 1, 1))"), 1, "month(date(2000, 1, 1))");
  equals(buildAndEval("monthName(d99)", c), "December", "monthName(d99)");
  equals(buildAndEval("monthName(date(2000, 1, 1))"), "January", "monthName(date(2000, 1, 1))");
  equals(buildAndEval("dayOfMonth(d99)", c), 31, "dayOfMonth(d99)");
  equals(buildAndEval("dayOfWeek(d99)", c), 6, "dayOfWeek(d99)");
  equals(buildAndEval("dayOfWeekName(d99)", c), "Friday", "dayOfWeekName(d99)");
  equals(buildAndEval("hours(d99)", c), 12, "hours(d99)");
  equals(buildAndEval("minutes(d99)", c), 34, "minutes(d99)");
  equals(buildAndEval("seconds(d99)", c), 56, "seconds(d99)");
  dateEquals(buildAndEval("date(1999, 12, 31, 12, 34, 55)+1"), d99, "date(1999, 12, 31, 12, 34, 55)+1");
  dateEquals(buildAndEval("date(1999, 12, 31, 12, 34, 57)-1"), d99, "date(1999, 12, 31, 12, 34, 57)-1");

  // other functions
  equals( buildAndEval("if(true,1,0)"), 1, "if(true,1,0)");
  equals( buildAndEval("if(true,1)"), 1, "if(true,1)");
  equals( buildAndEval("if(false,1,0)"), 0, "if(false,1,0)");
  equals( buildAndEval("if(false,1)"), '', "if(false,1)");
  equals( buildAndEval("isFinite(0)"), true, "isFinite(0)");
  equals( buildAndEval("isFinite('0')"), true, "isFinite('0')");
  equals( buildAndEval("isFinite('')"), false, "isFinite('')");
  equals( buildAndEval("isFinite('string')"), false, "isFinite('string')");
  equals( buildAndEval("isFinite(0/1)"), true, "isFinite(0/1)");
  equals( buildAndEval("isFinite(1/0)"), false, "isFinite(1/0)");
  equals( buildAndEval("isFinite(0/0)"), false, "isFinite(0/0)");
  equals( buildAndEval("number('0')"), 0, "number('0')");
  equals( buildAndEval("number(date(2000, 1, 1))"), 946713600, "number(date(2000, 1, 1))");
  inRange( buildAndEval("random()"), 0, 1, "random() -- pseudo-random number generation");
  inRange( buildAndEval("random(10)"), 0, 10, "random(max) -- pseudo-random number generation");
  inRange( buildAndEval("random(5,10)"), 5, 10, "random(min,max) -- pseudo-random number generation");

  // string functions
  equals(buildAndEval("beginsWith('abcdef', 'abc')"), true, "beginsWith('abcdef', 'abc')");
  equals(buildAndEval("beginsWith('abcdef', 'def')"), false, "beginsWith('abcdef', 'def')");
  equals(buildAndEval("beginsWith('abcdef', '')"), true, "beginsWith('abcdef', '') -- all strings contain empty string");
  equals(buildAndEval("beginsWith('', '')"), true, "beginsWith('', '') -- all strings contain empty string");
  equals(buildAndEval("beginsWith(12345, 12)"), true, "beginsWith(12345, 12) -- numbers treated as strings");
  equals(buildAndEval("charAt('abcdef', 0)"), '', "charAt('abcdef', 0)");
  equals(buildAndEval("charAt('abcdef', 1)"), 'a', "charAt('abcdef', 1)");
  equals(buildAndEval("charAt('abcdef', 1.5)"), 'a', "charAt('abcdef', 1.5)");
  equals(buildAndEval("charAt('abcdef', 3)"), 'c', "charAt('abcdef', 3)");
  equals(buildAndEval("charAt('abcdef', -3)"), 'd', "charAt('abcdef', -3)");
  equals(buildAndEval("charAt('abcdef', 8)"), '', "charAt('abcdef', 8)");
  equals(buildAndEval("charAt(12345, 3)"), '3', "charAt(12345, 3)");
  equals(buildAndEval("concat('a')"), 'a', "concat('a')");
  equals(buildAndEval("concat('a', 'b', 'c')"), 'abc', "concat('a', 'b', 'c')");
  equals(buildAndEval("endsWith('abcdef', 'abc')"), false, "endsWith('abcdef', 'abc')");
  equals(buildAndEval("endsWith('abcdef', 'def')"), true, "endsWith('abcdef', 'def')");
  equals(buildAndEval("endsWith('abcdef', '')"), true, "endsWith('abcdef', '') -- all strings contain empty string");
  equals(buildAndEval("endsWith('', '')"), true, "endsWith('', '') -- all strings contain empty string");
  equals(buildAndEval("endsWith(12345, 45)"), true, "endsWith(12345, 45)");
  equals(buildAndEval("findString('abcdef', 'a')"), 1, "findString('abcdef', 'a')");
  equals(buildAndEval("findString('abcdef', 'f')"), 6, "findString('abcdef', 'f')");
  equals(buildAndEval("findString('abcdef', 'g')"), 0, "findString('abcdef', 'g')");
  equals(buildAndEval("findString('abcdef', '')"), 1, "findString('abcdef', '')");
  equals(buildAndEval("findString('abcdef', 'a', 2)"), 0, "findString('abcdef', 'a', 2)");
  equals(buildAndEval("findString('abcabc', 'a', 2)"), 4, "findString('abcabc', 'a', 2)");
  equals(buildAndEval("findString('abcabc', 'a', -3)"), 4, "findString('abcabc', 'a', -3)");
  equals(buildAndEval("findString(12345, 234)"), 2, "findString(12345, 234)");
  equals(buildAndEval("includes('abcdef', 'a')"), true, "includes('abcdef', 'a')");
  equals(buildAndEval("includes('abcdef', 'f')"), true, "includes('abcdef', 'f')");
  equals(buildAndEval("includes('abcdef', 'g')"), false, "includes('abcdef', 'g')");
  equals(buildAndEval("includes('abcdef', '')"), true, "includes('abcdef', '')");
  equals(buildAndEval("includes(12345, 3)"), true, "includes(12345, 3)");
  equals(buildAndEval("includes('', 'a')"), false, "includes('', 'a')");
  equals(buildAndEval("includes('', '')"), true, "includes('', '')");
  equals(buildAndEval("join(':', 'a')"), 'a', "join(':', 'a')");
  equals(buildAndEval("join(':', 'a', 'b', 'c')"), 'a:b:c', "join(':', 'a', 'b', 'c'");
  equals(buildAndEval("join('', 'a', 'b', 'c')"), 'abc', "join('', 'a', 'b', 'c'");
  equals(buildAndEval("repeatString('#', 3)"), '###', "repeatString('#', 3)");
  equals(buildAndEval("repeatString('', 3)"), '', "repeatString('', 3)");
  equals(buildAndEval("repeatString('#', 0)"), '', "repeatString('#', 0)");
  equals(buildAndEval("repeatString('#', 'a')"), '', "repeatString('#', 'a')");
  equals(buildAndEval("repeatString('#', 3)"), '###', "repeatString('#', 3)");
  equals(buildAndEval("repeatString(3, 3)"), '333', "repeatString(3, 3)");
  equals(buildAndEval("replaceChars('xyzdef', 1, 3, 'abc')"), 'abcdef', "replaceChars('xyzdef', 1, 3, 'abc')");
  equals(buildAndEval("replaceChars('abcxyz', -3, 3, 'def')"), 'abcdef', "replaceChars('abcxyz', -3, 3, 'def')");
  equals(buildAndEval("replaceChars('', 1, 3, 'abc')"), '', "replaceChars('', 1, 3, 'abc')");
  equals(buildAndEval("replaceChars('abcxyzdef', 4, 3, '')"), 'abcdef', "replaceChars('abcxyzdef', 4, 3, '')");
  equals(buildAndEval("replaceChars(12345, 1, 3, 678)"), '67845', "replaceChars(12345, 1, 3, 678)");
  equals(buildAndEval("replaceString('xyzdef', 'xyz', 'abc')"), 'abcdef', "replaceString('xyzdef', 'xyz', 'abc')");
  equals(buildAndEval("replaceString('abcxyz', 'xyz', 'def')"), 'abcdef', "replaceString('abcxyz', 'xyz', 'def')");
  equals(buildAndEval("replaceString('ababab', 'a', 'c')"), 'cbcbcb', "replaceString('ababab', 'a', 'c')");
  equals(buildAndEval("replaceString(12345, 3, 8)"), '12845', "replaceString(12345, 3, 8)");
  equals(buildAndEval("replaceString('', 'xyz', 'abc')"), '', "replaceString('', 'xyz', 'abc')");
  equals(buildAndEval("replaceString('abcxyzdef', 'xyz', '')"), 'abcdef', "replaceString('abcxyzdef', 'xyz', '')");
  equals(buildAndEval("stringLength('abcdef')"), 6, "stringLength('abcdef')");
  equals(buildAndEval("stringLength('abcxyzdef')"), 9, "stringLength('abcxyzdef')");
  equals(buildAndEval("stringLength(12345)"), 5, "stringLength(12345)");
  equals(buildAndEval("stringLength('')"), 0, "stringLength('')");
  equals(buildAndEval("split('12/31/2015', '/')"), '12', "split('12/31/2015', '/')");
  equals(buildAndEval("split('12/31/2015', '/', 1)"), '12', "split('12/31/2015', '/', 1)");
  equals(buildAndEval("split('12/31/2015', '/', 2)"), '31', "split('12/31/2015', '/', 2)");
  equals(buildAndEval("split('12/31/2015', '/', 3)"), '2015', "split('12/31/2015', '/', 3)");
  equals(buildAndEval("split('12/31/2015', '/', 0)"), '12', "split('12/31/2015', '/', 0)");
  equals(buildAndEval("split(12345, 3)"), '12', "split('12/31/2015', '/', 0)");
  equals(buildAndEval("split('12', '/', 1)"), '12', "split(12345, 3)");
  equals(buildAndEval("subString('abcdef', 4)"), 'def', "subString('abcdef', 4)");
  equals(buildAndEval("subString('abcdef', 0, 3)"), 'abc', "subString('abcdef', 0, 3)");
  equals(buildAndEval("subString('abcdef', 1, 3)"), 'abc', "subString('abcdef', 1, 3)");
  equals(buildAndEval("subString('abcdef', -3)"), 'def', "subString('abcdef', -3)");
  equals(buildAndEval("subString(12345, 3)"), '345', "subString(12345, 3)");
  equals(buildAndEval("subString('', 1, 3)"), '', "subString('', 1, 3)");
  equals(buildAndEval("subString('', -10)"), '', "subString('', -10)");
  equals(buildAndEval("toLower('abcdef')"), 'abcdef', "toLower('abcdef')");
  equals(buildAndEval("toLower('ABCDEF')"), 'abcdef', "toLower('ABCDEF')");
  equals(buildAndEval("toLower('')"), '', "toLower('')");
  equals(buildAndEval("toUpper('abcdef')"), 'ABCDEF', "toUpper('abcdef')");
  equals(buildAndEval("toUpper('ABCDEF')"), 'ABCDEF', "toUpper('ABCDEF')");
  equals(buildAndEval("toUpper('')"), '', "toUpper('')");
  equals(buildAndEval("trim('')"), '', "trim('')");
  equals(buildAndEval("trim('  a  ')"), 'a', "trim('  a  ')");
  equals(buildAndEval("trim('  a   b  ')"), 'a b', "trim('  a   b  ')");

  // trigonometric functions
  equals( buildAndEval("acos(1)"), 0, "acos() -- arccosine");
  equals( buildAndEval("asin(0)"), 0, "asin() -- arcsine");
  equals( buildAndEval("atan(0)"), 0, "atan() -- arctangent");
  equals( buildAndEval("atan2(0,1)"), 0, "atan2() -- arctangent (two arguments)");
  
  //console.profileEnd();
  //ok(false, "End-of-tests sentinel: All other tests processed to completion!");
});

