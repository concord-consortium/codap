// this is the result of running JSON.stringify(DG.functionRegistry.functions(), null, 2) in the console
// plus a fake localizer

// NOTE: this is missing the aggregate functions because the function regsitry does not support exposing them

String.prototype.loc = function () {
  var strings = {
    'DG.Formula.FuncCategoryArithmetic': "Arithmetic Functions",
    'DG.Formula.FuncCategoryConversion': "Other Functions", // put into "Other" for now
    'DG.Formula.FuncCategoryDateTime': "Date/Time Functions",
    'DG.Formula.FuncCategoryLookup': "Lookup Functions",
    'DG.Formula.FuncCategoryOther': "Other Functions",
    'DG.Formula.FuncCategoryRandom': "Other Functions", // put into "Other" for now
    'DG.Formula.FuncCategoryStatistical': "Statistical Functions",
    'DG.Formula.FuncCategoryString': "String Functions",
    'DG.Formula.FuncCategoryTrigonometric': "Trigonometric Functions"
  };
  return strings[this] || this;
};

DG.functionRegistry = {
  functions: function () {
    return{
      "abs": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic",

        "args": [{
          "name": "value",
          "type": "number",
          "description": "A value that is a number"
        }],
        "description": "Returns the absolute value of the given number.",
        "examples": [
          "abs(-1) returns 1",
          "abs(speed) returns 10 when speed is -10 or 10"
        ]
      },
      "acos": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryTrigonometric"
      },
      "asin": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryTrigonometric"
      },
      "atan": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryTrigonometric"
      },
      "atan2": {
        "minArgs": 2,
        "maxArgs": 2,
        "category": "DG.Formula.FuncCategoryTrigonometric"
      },
      "ceil": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "cos": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryTrigonometric"
      },
      "exp": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "floor": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "pow": {
        "minArgs": 2,
        "maxArgs": 2,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "sin": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryTrigonometric"
      },
      "sqrt": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "tan": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryTrigonometric"
      },
      "boolean": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryConversion"
      },
      "frac": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "if": {
        "minArgs": 2,
        "maxArgs": 3,
        "category": "DG.Formula.FuncCategoryOther"
      },
      "isFinite": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryOther"
      },
      "ln": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "log": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "number": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryConversion"
      },
      "random": {
        "minArgs": 0,
        "maxArgs": 2,
        "isRandom": true,
        "category": "DG.Formula.FuncCategoryRandom"
      },
      "round": {
        "minArgs": 1,
        "maxArgs": 2,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "string": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryConversion"
      },
      "trunc": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryArithmetic"
      },
      "greatCircleDistance": {
        "minArgs": 4,
        "maxArgs": 4,
        "category": "DG.Formula.FuncCategoryOther"
      },
      "date": {
        "minArgs": 1,
        "maxArgs": 7,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "dayOfMonth": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "dayOfWeek": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "dayOfWeekName": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "hours": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "minutes": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "month": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "monthName": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "seconds": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "today": {
        "minArgs": 0,
        "maxArgs": 0,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "year": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryDateTime"
      },
      "beginsWith": {
        "minArgs": 2,
        "maxArgs": 2,
        "category": "DG.Formula.FuncCategoryString"
      },
      "charAt": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryString"
      },
      "concat": {
        "minArgs": 1,
        "maxArgs": 99,
        "category": "DG.Formula.FuncCategoryString"
      },
      "endsWith": {
        "minArgs": 2,
        "maxArgs": 2,
        "category": "DG.Formula.FuncCategoryString"
      },
      "findString": {
        "minArgs": 2,
        "maxArgs": 3,
        "category": "DG.Formula.FuncCategoryString"
      },
      "patternMatches": {
        "minArgs": 2,
        "maxArgs": 2,
        "category": "DG.Formula.FuncCategoryString"
      },
      "wordListMatches": {
        "minArgs": 3,
        "maxArgs": 4,
        "category": "DG.Formula.FuncCategoryString"
      },
      "includes": {
        "minArgs": 2,
        "maxArgs": 2,
        "category": "DG.Formula.FuncCategoryString"
      },
      "join": {
        "minArgs": 1,
        "maxArgs": 99,
        "category": "DG.Formula.FuncCategoryString"
      },
      "repeatString": {
        "minArgs": 2,
        "maxArgs": 2,
        "category": "DG.Formula.FuncCategoryString"
      },
      "replaceChars": {
        "minArgs": 4,
        "maxArgs": 4,
        "category": "DG.Formula.FuncCategoryString"
      },
      "replaceString": {
        "minArgs": 3,
        "maxArgs": 3,
        "category": "DG.Formula.FuncCategoryString"
      },
      "split": {
        "minArgs": 2,
        "maxArgs": 3,
        "category": "DG.Formula.FuncCategoryString"
      },
      "subString": {
        "minArgs": 2,
        "maxArgs": 3,
        "category": "DG.Formula.FuncCategoryString"
      },
      "stringLength": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryString"
      },
      "toLower": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryString"
      },
      "toUpper": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryString"
      },
      "trim": {
        "minArgs": 1,
        "maxArgs": 1,
        "category": "DG.Formula.FuncCategoryString"
      }
    };
  }
};