// ==========================================================================
//                        DG.Formula Unit Test
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

  /*
  function performanceTest( iSource, iFormula, iContext, iEvalContext) {
    var i, count = 10000,
        start, jsTime, treeTime, rpnTime;
    if( iContext) iFormula.set('context', iContext);

    start = +new Date();
    for( i = 0; i < count; ++i) {
      iFormula.evaluate( iEvalContext);
    }
    jsTime = +new Date() - start;
    
    start = +new Date();
    for( i = 0; i < count; ++i) {
      iFormula.evaluateDirect( iEvalContext);
    }
    treeTime = +new Date() - start;
    
    //@if(debug)
    start = +new Date();
    for( i = 0; i < count; ++i) {
      iFormula.evaluatePostfix( iEvalContext);
    }
    rpnTime = +new Date() - start;
    //@endif
    
    DG.log("Formula (cached):  %@, JS: %@, Tree: %@, RPN: %@",
            iSource, jsTime/10, treeTime/10, rpnTime/10); 
    
    count /= 10;
    start = +new Date();
    for( i = 0; i < count; ++i) {
      iFormula.invalidateContext();
      iFormula.evaluate( iEvalContext);
    }
    jsTime = +new Date() - start;
    
    start = +new Date();
    for( i = 0; i < count; ++i) {
      iFormula.invalidateContext();
      iFormula.evaluateDirect( iEvalContext);
    }
    treeTime = +new Date() - start;
    
    //@if(debug)
    start = +new Date();
    for( i = 0; i < count; ++i) {
      iFormula.invalidateContext();
      iFormula.evaluatePostfix( iEvalContext);
    }
    rpnTime = +new Date() - start;
    //@endif
    
    DG.log("Formula (!cached): %@, JS: %@, Tree: %@, RPN: %@",
            iSource, jsTime, treeTime, rpnTime); 
  }
  */
  
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
        type2 = typeof iValue2;
    if( type1 !== type2) return false;
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
    return ok( diff < tolerance, "%@:  Result: %@, Expected: %@".fmt( iDescription, iResult, iExpected));
  }
  
  function inRange( iVal, iMin, iMax, iDescription) {
    return ok( (iMin <= iVal) && (iVal <= iMax), iDescription);
  }
 
  //console.profile("formula unit test profile");
  
  equals( buildAndEval("1"), 1, "numeric literal");
  equals( buildAndEval("-1"), -1, "numeric literal with unary minus");
  equals( buildAndEval("'Hello'"), "Hello", "string literal -- single quotes");
  equals( buildAndEval('"Hello"'), "Hello", "string literal -- double quotes");
  equals( buildAndEval("true"), true, "boolean literal -- true");
  equals( buildAndEval("false"), false, "boolean literal -- false");
  equals( buildAndEval("!false"), true, "unary boolean not");
  equals( buildAndEval("!true"), false, "unary boolean not");
  floatEquals( buildAndEval("e"), Math.E, "'e' constant literal");
  floatEquals( buildAndEval("pi"), Math.PI, "'pi' constant literal");
  floatEquals( buildAndEval("π"), Math.PI, "'π' constant literal");
  equals( buildAndEval("1+1"), 2, "simple numeric addition");
  equals( buildAndEval("1+2*3"), 7, "addition/multiplication precedence");
  equals( buildAndEval("(1+2)*3"), 9, "parentheses precedence");
  equals( buildAndEval("2-1"), 1, "simple numeric subtraction");
  equals( buildAndEval("2*3"), 6, "simple numeric multiplication");
  equals( buildAndEval("6/2"), 3, "simple numeric division");
  equals( buildAndEval("3%2"), 1, "modulo division");
  equals( buildAndEval("2^3"), 8, "two-term power expression");
  equals( buildAndEval("2^3^2"), 512, "three-term power expression");
  equals( buildAndEval("abs(-1)"), 1, "abs() -- absolute value");
  equals( buildAndEval("acos(1)"), 0, "acos() -- arccosine");
  equals( buildAndEval("asin(0)"), 0, "asin() -- arcsine");
  equals( buildAndEval("atan(0)"), 0, "atan() -- arctangent");
  equals( buildAndEval("atan2(0,1)"), 0, "atan2() -- arctangent (two arguments)");
  equals( buildAndEval("exp(1)"), Math.E, "exp() -- exponential (e^x)");
  floatEquals( buildAndEval("frac(1.5)"), 0.5, "frac(x) -- the fractional part of x");
  floatEquals( buildAndEval("frac(-1.5)"), -0.5, "frac(x) -- the fractional part of x");
  floatEquals( buildAndEval("ln(10)"), Math.LN10, "ln(x) -- natural logarithm");
  floatEquals( buildAndEval("log(e)"), Math.LOG10E, "log(x) -- base 10 logarithm");
  equals( buildAndEval("max(1,2,3,4,5)"), 5, "max(x1,...) -- max of arbitrary arguments");
  equals( buildAndEval("min(1,2,3,4,5)"), 1, "min(x1,...) -- min of arbitrary arguments");
  equals( buildAndEval("pow(2,3)"), 8, "pow(x,y) -- x^y");
  inRange( buildAndEval("random()"), 0, 1, "random() -- pseudo-random number generation");
  inRange( buildAndEval("random(10)"), 0, 10, "random(max) -- pseudo-random number generation");
  inRange( buildAndEval("random(5,10)"), 5, 10, "random(min,max) -- pseudo-random number generation");
  equals( buildAndEval("round(1.9)"), 2, "round() -- round to integer");
  floatEquals( buildAndEval("round(1.987,2)"), 1.99, "round(x,n) -- round to decimal");
  floatEquals( buildAndEval("round(2012,-2)"), 2000, "round(x,n) -- round to decimal");
  floatEquals( buildAndEval("sqrt(2)"), Math.SQRT2, "sqrt(x) -- square root");
  floatEquals( buildAndEval("sqrt(1/2)"), Math.SQRT1_2, "sqrt(x) -- square root");
  equals( buildAndEval("trunc(1.5)"), 1, "trunc(x) -- truncate to integer");
  equals( buildAndEval("trunc(-1.5)"), -1, "trunc(x) -- truncate to integer");
  ok( buildAndEval("1=1"), "equality test");
  ok( buildAndEval("!(1=2)"), "equality test");
  ok( buildAndEval("1!=2"), "not equal test");
  ok( buildAndEval("!(1!=1)"), "not equal test");
  equals( buildAndEval("0<1"), true, "less than");
  equals( buildAndEval("1<0"), false, "less than");
  equals( buildAndEval("0>1"), false, "less than");
  equals( buildAndEval("1>0"), true, "less than");
  equals( buildAndEval("0<=1"), true, "less than or equal");
  equals( buildAndEval("1<=0"), false, "less than or equal");
  equals( buildAndEval("1<=1"), true, "less than or equal");
  equals( buildAndEval("0>=1"), false, "greater than or equal");
  equals( buildAndEval("1>=0"), true, "greater than or equal");
  equals( buildAndEval("1>=1"), true, "greater than or equal");
  ok( buildAndEval("(1=1)&(2=2)"), "logical and (&)");
  ok( buildAndEval("(1=1)and(2=2)"), "logical and (and)");
  ok( buildAndEval("(1=1)AND(2=2)"), "logical and (AND)");
  ok( buildAndEval("!((1=2)&(2=2))"), "logical and (&&)");
  ok( buildAndEval("!((1=2)and(2=2))"), "logical and (and)");
  ok( buildAndEval("!((1=2)AND(2=2))"), "logical and (AND)");
  ok( buildAndEval("(1=1)|(1=2)"), "logical or (|)");
  ok( buildAndEval("(1=1)or(1=2)"), "logical or (and)");
  ok( buildAndEval("(1=1)OR(1=2)"), "logical or (AND)");
  equals( buildAndEval("true?1:2"), 1, "conditional expression");
  equals( buildAndEval("false?1:2"), 2, "conditional expression");
  floatEquals( buildAndEval("!((1=2)and(2=2)) ? atan2(pi,2) : cos(pi/2)"),
                Math.atan2(Math.PI,2), "a more complicated formula");
  equals( buildAndEval("1-(1?2:3)"), -1, "conditional precedence test");
  
  var formulaContext = DG.FormulaContext.create({
                            fns: {
                              zero: function() { return 0; },
                              one: function() { return 1; },
                              two: function() { return 2; },
                              three: function () { return 3; },
                              add: function(x1,x2) { return x1 + x2; }
                            },
                            vars: {
                              a: 0,
                              b: 1,
                              c: 2,
                              d: 3
                            }
                        });
  equals( buildAndEval("zero()", formulaContext), 0, "compile context function");
  equals( buildAndEval("add(1,2)", formulaContext), 3, "compile context function with arguments");
  equals( buildAndEval("a", formulaContext), 0, "compile context variable");
  
  //console.profileEnd();
  //ok(false, "End-of-tests sentinel: All other tests processed to completion!");
});

