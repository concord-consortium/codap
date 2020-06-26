window.categorizedFunctionInfo = function() {
  return (

{  
  "Arithmetic Functions":{  
    "abs":{  
      "name":"abs",
      "displayName":"abs",
      "category":"Arithmetic Functions",
      "description":"Returns the absolute value of its numeric argument.",
      "minArgs":1,
      "maxArgs":1,
      "args":[  
        {  
          "name":"number",
          "type":"number",
          "description":"a numeric value",
          "required":true
        }
      ],
      "examples":[  
        "abs(-1) returns 1",
        "abs(speed) returns 10 when speed is -10 or 10"
      ]
    },
    "ceil":{  
      "name":"ceil",
      "displayName":"ceil",
      "category":"Arithmetic Functions",
      "description":"Returns the smallest integer greater than or equal to its numeric argument.",
      "minArgs":1,
      "maxArgs":1,
      "args":[  
        {  
          "name":"number",
          "type":"number",
          "description":"a numeric value",
          "required":true
        }
      ],
      "examples":[  
        "ceil(1) returns 1",
        "ceil(1.5) returns 2",
        "ceil(-1.5) returns -1"
      ]
    },
    "exp":{  
      "name":"exp",
      "displayName":"exp",
      "category":"Arithmetic Functions",
      "description":"Returns the result of computing the constant e to the power of its numeric argument.",
      "minArgs":1,
      "maxArgs":1,
      "args":[  
        {  
          "name":"number",
          "type":"number",
          "description":"a numeric value",
          "required":true
        }
      ],
      "examples":[  

      ]
    },
    "floor":{  
      "name":"floor",
      "displayName":"floor",
      "category":"Arithmetic Functions",
      "description":"Returns the largest integer less than or equal to its numeric argument.",
      "minArgs":1,
      "maxArgs":1,
      "args":[  
        {  
          "name":"number",
          "type":"number",
          "description":"a numeric value",
          "required":true
        }
      ],
      "examples":[  
        "floor(1) returns 1",
        "floor(1.5) returns 1",
        "floor(-1.5) returns -2"
      ]
    },
    "pow":{  
      "name":"pow",
      "displayName":"pow",
      "category":"Arithmetic Functions",
      "description":"",
      "minArgs":2,
      "maxArgs":2,
      "examples":[  

      ]
    },
    "sqrt":{  
      "name":"sqrt",
      "displayName":"sqrt",
      "category":"Arithmetic Functions",
      "description":"",
      "minArgs":1,
      "maxArgs":1,
      "examples":[  

      ]
    },
    "frac":{  
      "name":"frac",
      "displayName":"frac",
      "category":"Arithmetic Functions",
      "description":"",
      "minArgs":1,
      "maxArgs":1,
      "examples":[  

      ]
    },
    "ln":{  
      "name":"ln",
      "displayName":"ln",
      "category":"Arithmetic Functions",
      "description":"",
      "minArgs":1,
      "maxArgs":1,
      "examples":[  

      ]
    },
    "log":{  
      "name":"log",
      "displayName":"log",
      "category":"Arithmetic Functions",
      "description":"",
      "minArgs":1,
      "maxArgs":1,
      "examples":[  

      ]
    },
    "round":{  
      "name":"round",
      "displayName":"round",
      "category":"Arithmetic Functions",
      "description":"",
      "minArgs":1,
      "maxArgs":2,
      "examples":[  

      ]
    },
    "trunc":{  
      "name":"trunc",
      "displayName":"trunc",
      "category":"Arithmetic Functions",
      "description":"",
      "minArgs":1,
      "maxArgs":1,
      "examples":[  

      ]
    }
  },
  "Trigonometric Functions":{  
    "acos":{  
      "name":"acos",
      "displayName":"acos",
      "category":"Trigonometric Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "asin":{  
      "name":"asin",
      "displayName":"asin",
      "category":"Trigonometric Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "atan":{  
      "name":"atan",
      "displayName":"atan",
      "category":"Trigonometric Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "atan2":{  
      "name":"atan2",
      "displayName":"atan2",
      "category":"Trigonometric Functions",
      "minArgs":2,
      "maxArgs":2
    },
    "cos":{  
      "name":"cos",
      "displayName":"cos",
      "category":"Trigonometric Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "sin":{  
      "name":"sin",
      "displayName":"sin",
      "category":"Trigonometric Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "tan":{  
      "name":"tan",
      "displayName":"tan",
      "category":"Trigonometric Functions",
      "minArgs":1,
      "maxArgs":1
    }
  },
  "Other Functions":{  
    "boolean":{  
      "name":"boolean",
      "displayName":"boolean",
      "category":"Other Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "if":{  
      "name":"if",
      "displayName":"if",
      "category":"Other Functions",
      "minArgs":2,
      "maxArgs":3
    },
    "isFinite":{  
      "name":"isFinite",
      "displayName":"isFinite",
      "category":"Other Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "number":{  
      "name":"number",
      "displayName":"number",
      "category":"Other Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "random":{  
      "name":"random",
      "displayName":"random",
      "category":"Other Functions",
      "minArgs":0,
      "maxArgs":2
    },
    "string":{  
      "name":"string",
      "displayName":"string",
      "category":"Other Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "greatCircleDistance":{  
      "name":"greatCircleDistance",
      "displayName":"greatCircleDistance",
      "category":"Other Functions",
      "minArgs":4,
      "maxArgs":4
    }
  },
  "Lookup Functions":{  
    "lookupByIndex":{  
      "name":"lookupByIndex",
      "displayName":"lookupByIndex",
      "category":"Lookup Functions",
      "minArgs":3,
      "maxArgs":3
    },
    "lookupByKey":{  
      "name":"lookupByKey",
      "displayName":"lookupByKey",
      "category":"Lookup Functions",
      "minArgs":4,
      "maxArgs":4
    },
    "first":{  
      "name":"first",
      "displayName":"first",
      "category":"Lookup Functions",
      "minArgs":1,
      "maxArgs":2
    },
    "last":{  
      "name":"last",
      "displayName":"last",
      "category":"Lookup Functions",
      "minArgs":1,
      "maxArgs":2
    },
    "next":{  
      "name":"next",
      "displayName":"next",
      "category":"Lookup Functions",
      "minArgs":1,
      "maxArgs":3
    },
    "prev":{  
      "name":"prev",
      "displayName":"prev",
      "category":"Lookup Functions",
      "minArgs":1,
      "maxArgs":3
    }
  },
  "Date/Time Functions":{  
    "date":{  
      "name":"date",
      "displayName":"date",
      "category":"Date/Time Functions",
      "description":"",
      "minArgs":1,
      "maxArgs":7,
      "examples":[  

      ]
    },
    "dayOfMonth":{  
      "name":"dayOfMonth",
      "displayName":"dayOfMonth",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "dayOfWeek":{  
      "name":"dayOfWeek",
      "displayName":"dayOfWeek",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "dayOfWeekName":{  
      "name":"dayOfWeekName",
      "displayName":"dayOfWeekName",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "hours":{  
      "name":"hours",
      "displayName":"hours",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "minutes":{  
      "name":"minutes",
      "displayName":"minutes",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "month":{  
      "name":"month",
      "displayName":"month",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "monthName":{  
      "name":"monthName",
      "displayName":"monthName",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "now":{  
      "name":"now",
      "displayName":"now",
      "category":"Date/Time Functions",
      "minArgs":0,
      "maxArgs":0
    },
    "seconds":{  
      "name":"seconds",
      "displayName":"seconds",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "today":{  
      "name":"today",
      "displayName":"today",
      "category":"Date/Time Functions",
      "minArgs":0,
      "maxArgs":0
    },
    "year":{  
      "name":"year",
      "displayName":"year",
      "category":"Date/Time Functions",
      "minArgs":1,
      "maxArgs":1
    }
  },
  "String Functions":{  
    "beginsWith":{  
      "name":"beginsWith",
      "displayName":"beginsWith",
      "category":"String Functions",
      "minArgs":2,
      "maxArgs":2
    },
    "charAt":{  
      "name":"charAt",
      "displayName":"charAt",
      "category":"String Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "concat":{  
      "name":"concat",
      "displayName":"concat",
      "category":"String Functions",
      "minArgs":1,
      "maxArgs":99
    },
    "endsWith":{  
      "name":"endsWith",
      "displayName":"endsWith",
      "category":"String Functions",
      "minArgs":2,
      "maxArgs":2
    },
    "findString":{  
      "name":"findString",
      "displayName":"findString",
      "category":"String Functions",
      "minArgs":2,
      "maxArgs":3
    },
    "patternMatches":{
      "name":"patternMatches",
      "displayName":"patternMatches",
      "category":"String Functions",
      "minArgs":2,
      "maxArgs":2
    },
    "includes":{
      "name":"includes",
      "displayName":"includes",
      "category":"String Functions",
      "minArgs":2,
      "maxArgs":2
    },
    "join":{  
      "name":"join",
      "displayName":"join",
      "category":"String Functions",
      "minArgs":1,
      "maxArgs":99
    },
    "repeatString":{  
      "name":"repeatString",
      "displayName":"repeatString",
      "category":"String Functions",
      "minArgs":2,
      "maxArgs":2
    },
    "replaceChars":{  
      "name":"replaceChars",
      "displayName":"replaceChars",
      "category":"String Functions",
      "minArgs":4,
      "maxArgs":4
    },
    "replaceString":{  
      "name":"replaceString",
      "displayName":"replaceString",
      "category":"String Functions",
      "minArgs":3,
      "maxArgs":3
    },
    "split":{  
      "name":"split",
      "displayName":"split",
      "category":"String Functions",
      "minArgs":2,
      "maxArgs":3
    },
    "subString":{  
      "name":"subString",
      "displayName":"subString",
      "category":"String Functions",
      "minArgs":2,
      "maxArgs":3
    },
    "stringLength":{  
      "name":"stringLength",
      "displayName":"stringLength",
      "category":"String Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "toLower":{  
      "name":"toLower",
      "displayName":"toLower",
      "category":"String Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "toUpper":{  
      "name":"toUpper",
      "displayName":"toUpper",
      "category":"String Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "trim":{  
      "name":"trim",
      "displayName":"trim",
      "category":"String Functions",
      "minArgs":1,
      "maxArgs":1
    }
  },
  "Statistical Functions":{  
    "count":{  
      "name":"count",
      "displayName":"count",
      "category":"Statistical Functions",
      "description":"Returns the number of cases with non-empty/non-false values for its expression argument.",
      "minArgs":0,
      "maxArgs":1,
      "args":[  
        {  
          "name":"expression",
          "type":"any",
          "description":"The values to be counted."
        },
        {  
          "name":"filter",
          "type":"boolean",
          "description":"An expression that determines the cases to be considered."
        }
      ],
      "examples":[  
        "count() with no arguments is interpreted differently depending on the context. In an attribute formula it returns the number of child cases. In a plotted value, it is equivalent to count(xAxisAttribute).",
        "count(height) returns 3 if the 'height' attribute contains [1, \"yes\", true, false, \"\"].",
        "count(height, age<18) returns 3 if the 'height' attribute contains [1, \"yes\", true, false, \"\"] for the cases with a value for the age attribute that is less than 18."
      ]
    },
    "min":{  
      "name":"min",
      "displayName":"min",
      "category":"Statistical Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "max":{  
      "name":"max",
      "displayName":"max",
      "category":"Statistical Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "mean":{  
      "name":"mean",
      "displayName":"mean",
      "category":"Statistical Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "median":{  
      "name":"median",
      "displayName":"median",
      "category":"Statistical Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "variance":{  
      "name":"variance",
      "displayName":"variance",
      "category":"Statistical Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "stdDev":{  
      "name":"stdDev",
      "displayName":"stdDev",
      "category":"Statistical Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "stdErr":{  
      "name":"stdErr",
      "displayName":"stdErr",
      "category":"Statistical Functions",
      "minArgs":1,
      "maxArgs":1
    },
    "percentile":{  
      "name":"percentile",
      "displayName":"percentile",
      "category":"Statistical Functions",
      "minArgs":2,
      "maxArgs":2
    },
    "sum":{  
      "name":"sum",
      "displayName":"sum",
      "category":"Statistical Functions",
      "minArgs":1,
      "maxArgs":1
    }
  }
}

  );
};
