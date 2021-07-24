// ==========================================================================
//                          Basic Functions
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
/*global RandVarGen:true */
sc_require('formula/function_registry');

/**
  Implements the basic builtin functions and registers them with the FunctionRegistry.
 */
DG.functionRegistry.registerFunctions((function() {

  function trunc(x) {
    return SC.empty(x) ? '' :
        (x < 0 ? Math.ceil(x) : Math.floor(x));
  }

  var savedRandomGaussian = 0;  // The routine for generating random numbers drawn from a gaussian
                                // distribution generates two such numbers. We save one for next call
  var rvg;

  return {
    // JavaScript standard Math library functions
    'abs': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.abs(x);
      }
    },
    'acos': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryTrigonometric',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.acos(x);
      }
    },
    'asin': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryTrigonometric',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.asin(x);
      }
    },
    'atan': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryTrigonometric',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.atan(x);
      }
    },
    'atan2': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryTrigonometric',
      evalFn: function(y, x) {
        return SC.empty(x) || SC.empty(y) ? '' : Math.atan2(y, x);
      }
    },
    'ceil': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.ceil(x);
      }
    },
    'combinations': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(n, k) {

        function isInteger(num) {
          return Math.floor(Number(num)) === Number(num);
        }

        var tResult = '';
        if( !SC.empty(n) && !SC.empty(k) && isInteger(k) && isInteger(n)) {
          k = Number(k);
          n = Number(n);
          if( k < 0 || k > n) {
            tResult = 0;
          } else {
            if (n > 0 && isInteger(n)) {
              k = Math.min(k, n - k);
            }
            tResult = 1;
            var j = 1;
            while (j <= k) {
              tResult *= n--;
              if (isFinite(tResult)) {
                tResult /= j++;
              } else {
                tResult = "---OVERFLOW---";
                j = k;  // So we can escape with the overflow result
              }
            }
          }
        }
        return tResult;
      }
    },
    'cos': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryTrigonometric',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.cos(x);
      }
    },
    'exp': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.exp(x);
      }
    },
    'floor': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.floor(x);
      }
    },
    //'ln': { minArgs:1, maxArgs:1 },     // replaced by DG version
    //'log': { minArgs:1, maxArgs:1 },    // replaced by DG version
    //'max': { minArgs:1, maxArgs:'n' },  // replaced by DG (aggregate) version
    //'min': { minArgs:1, maxArgs:'n' },  // replaced by DG (aggregate) version
    'pow': {
      minArgs:2, maxArgs:2, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x, y) {
        return SC.empty(x) || SC.empty(y) ? '' : Math.pow(x, y);
      }
    },
    //'random': { minArgs:0, maxArgs:0 }, // replaced by DG version
    //'round': { minArgs:1, maxArgs:1 },  // replaced by DG version
    'sin': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryTrigonometric',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.sin(x);
      }
    },
    'sqrt': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.sqrt(x);
      }
    },
    'tan': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryTrigonometric',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.tan(x);
      }
    },

    /**
      Returns the fractional part of its argument.
      @param    {Number}  The numeric value whose fractional part is to be returned
      @returns  {Number}  The fractional part of its numeric argument
     */
    'frac': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x) {
        return SC.empty(x) ? '' : x - trunc(x);
      }
    },

    'if': {
      minArgs: 2, maxArgs: 3, category: 'DG.Formula.FuncCategoryOther',
      evalFn: function(condition, trueValue, falseValue) {
        if (SC.empty(condition)) return '';
        return condition
                ? (trueValue != null ? trueValue : '')
                : (falseValue != null ? falseValue : '');
      }
    },

    /**
      Returns the natural logarithm of its argument.
      @param    {Number}  The numeric value whose natural log is to be returned
      @returns  {Number}  The natural logarithm of its numeric argument
     */
    'ln': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.log(x);
      }
    },

    /**
      Returns the base 10 logarithm of its argument. Note: We override Math.log
      to provide the base 10 log here. Use ln() for the natural log.
      @param    {Number}  The numeric value whose base 10 log is to be returned
      @returns  {Number}  The base 10 log of its numeric argument
     */
    'log': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x) {
        return SC.empty(x) ? '' : Math.log(x) / Math.LN10;
      }
    },

    /**
      Coerces its argument to a numeric value.
      @param    {Object}  The argument to be coerced to a number
      @returns  {Number}  The converted numeric value
     */
    'number': {
      minArgs: 1, maxArgs: 1, category: 'DG.Formula.FuncCategoryConversion',
      evalFn: function (x) {
        if (DG.isDate(x))
          return Number(x);
        else if (DG.isDateString(x))
          return Number(DG.parseDate(x));
        else
          return DG.MathUtilities.extractNumeric(x);
      }
    },

    /**
      Random number generator. Override of Math.random() to provide more flexibility.
      random()        -- Generates a random number in the range [0,1).
      random(max)     -- Generates a random number in the range [0,max).
      random(min,max) -- Generates a random number in the range [min,max).
      @param    {Number}  x1 -- If present alone, the maximum value of the random number.
                                If first of two argument, the minimum value of the random number.
      @param    {Number}  x2 -- The maximum value of the random number.
      @returns  {Number}  The generated random number
     */
    'random': {
      minArgs:0, maxArgs:2, isRandom: true, category: 'DG.Formula.FuncCategoryRandom',
      evalFn: function(x1,x2) {
        // random()
        if( SC.empty(x1)) return Math.random();
        // random(max)
        if( SC.empty(x2)) return x1 * Math.random();
        // random(min,max)
        return x1 + (x2 - x1) * Math.random();
      }
    },

    /**
      Generator for random numbers drawn from a normal distribution.
      randomNormal()        -- Generates a random number from a normal distribution with mean 0 and sd 1.
      randomNormal(mean)    -- Generates a random number from a normal distribution with mean mean and sd 1.
      randomNormal(mean,sd)  -- Generates a random number from a normal distribution with mean mean and sd sd.
      @param    {Number}  x1 -- The mean value of the normal distribution.
      @param    {Number}  x2 -- The value of the sd of the normal distribution
      @returns  {Number}  The generated random number
     */
    'randomNormal': {
      minArgs:0, maxArgs:2, isRandom: true, category: 'DG.Formula.FuncCategoryRandom',
      evalFn: function(mu,sigma) {
        var	fac, rsq, v1, v2;
        mu = mu || 0;
        sigma = SC.empty(sigma) ? 1 : sigma;

        if (savedRandomGaussian !== 0) {		// Is there one left?
          v1 = savedRandomGaussian;
          savedRandomGaussian = 0;
          return sigma*v1 + mu;
        }
        do {
          v1 = 2 * Math.random() - 1;
          v2 = 2 * Math.random() - 1;
          rsq = v1*v1 + v2*v2;
        } while (rsq >= 1);
        fac = Math.sqrt(-2.0*Math.log(rsq)/rsq);
        savedRandomGaussian = fac*v2;					// Save the first N(0,1) as double
        return sigma*fac*v1 + mu;	// and return the second.
      }
    },

  /**
      Generator for random numbers drawn from a binomial distribution.
      @param    {Number}  n -- The number of independent events
      @param    {Number}  p -- The probability of success for a single event
      @returns  {Number}  An integer drawn from a random binomial distribution with the given n and p
     */
    'randomBinomial': {
      minArgs:2, maxArgs:2, isRandom: true, category: 'DG.Formula.FuncCategoryRandom',
      evalFn: function(n,p) {
        if( SC.empty(n) || SC.empty(p) || n < 0 || Math.floor(n) !== n || p < 0 || p > 1)
          return '';
        else {
          if( !rvg)
            rvg = new RandVarGen.RandVarGen();
          return rvg.binomial( p, n);
        }
      }
    },

  /**
      Chooses one at random from its list of arguments
      @param    {any}  the arguments can have any type
      @returns  {any}
     */
    'randomPick': {
      minArgs:2, maxArgs:1000, isRandom: true, category: 'DG.Formula.FuncCategoryRandom',
      evalFn: function() {
        var tChosen = Math.floor(arguments.length * Math.random());
        return arguments[tChosen];
      }
    },

    /**
      Rounds a number to the nearest integer or specified decimal place.
      @param    {Number}  x -- The number to be rounded
      @param    {Number}  n -- {optional} The number of decimal places to round to (default 0).
      @returns  {Number}  The rounded result
     */
    'round': {
      minArgs:1, maxArgs:2, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: function(x,n) {
        if (SC.empty(x)) return '';
        if (SC.empty(n)) return Math.round(x);
        var npow = Math.pow(10, trunc(n));
        return Math.round(npow * x) / npow;
      }
    },

    /**
      Coerces its argument to a string value.
      @param    {Object}  The argument to be coerced to a string
      @returns  {String}  The converted string value
     */
    'string': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryConversion',
      evalFn: function(x) {
        return SC.empty(x) ? '' : String(x);
      }
    },

    /**
      Returns the integer part of its argument.
      @param    {Number}  The numeric value whose integer part is to be returned
      @returns  {Number}  The integer part of its numeric argument
     */
    'trunc': {
      minArgs:1, maxArgs:1, category: 'DG.Formula.FuncCategoryArithmetic',
      evalFn: trunc
    },

    /**
      Returns the great circle distance between the two lat/long points on the earth's surface.
      @param    {Number}  The latitude in degrees of the first point
      @param    {Number}  The longitude in degrees of the first point
      @param    {Number}  The latitude in degrees of the second point
      @param    {Number}  The longitude in degrees of the second point
      @returns  {Number}  The distance in kilometers between the two points
     */
    'greatCircleDistance': {
      minArgs:4, maxArgs:4, category: 'DG.Formula.FuncCategoryOther',
      evalFn: function(lat1, long1, lat2, long2) {
        if( DG.isNumeric(lat1) && DG.isNumeric(lat2) && DG.isNumeric(long1) && DG.isNumeric(long2)) {
          var deltaLat = lat2 - lat1,
              deltaLong = long2 - long1,
              a = Math.pow(Math.sin((Math.PI / 180) * deltaLat / 2), 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.pow(Math.sin((Math.PI / 180) * deltaLong / 2), 2);
          return 2 * 6371 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        else {
          return '';
        }
      }
    }
  };
})());
