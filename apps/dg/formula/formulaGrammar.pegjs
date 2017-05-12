/*
  PEG.js grammmar for the DG.Formula syntax.
  The DG.Formula syntax is JavaScript-like, with a few notable exceptions:
    -- Expressions only (no statements)
    -- No assignment
    -- No regular expressions
    -- No bitwise operators (bitwise '~', '^', '&', '|')
    -- Backticks around identifiers to support arbitrary identifier names
    -- '=' instead of '=='/'===' for equality comparison
    -- '!=' (not '!==') for inequality comparison
        (We also support single-character Unicode not-equals.)
    -- Unicode less than or equal and greater than or equal symbols recognized.
    -- '&','and','AND' for logical AND
    -- '|','or','OR' for logical OR
    -- Unicode multiplication/division symbols as well as dot operator parsed
        as synonyms for the corresponding multiplication/division operation.
    -- '^' for exponentiation (right-associative)
    -- The set of arithmetic functions differs from those in Math in several respects
        1. ln(x) -- natural logarithm
        2. log(x) -- base 10 logarithm
        3. random(max) -- pseudo-random number in range [0,max)
           random(min,max) -- pseudo-random number in range [min,max)
        4. round(x,digits) -- rounds to the specified number of decimal places
        5. trunc(x) -- truncates to the integer portion

  The grammar was developed by starting with the example JavaScript grammar at

    https://github.com/dmajda/pegjs/blob/master/examples/javascript.pegjs

  and then 1) eliminating the unneeded portions (statements, bitwise operators, etc.)
  and 2) making the additional changes mentioned above, e.g. support for '^' operator
  for exponentiation.

  To generate the parser itself, run "npm run build:parser". This will create
  "formulaParser.js" from this file.

 */

start
  = __ formula:Formula __ { return formula; }

/* ===== A.1 Lexical Grammar ===== */

SourceCharacter
  = .

WhiteSpace "whitespace"
  = [\t\v\f \u00A0]
  / Zs

LineTerminator
  = [\n\r]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"

Identifier "identifier"
  = !ReservedWord name:IdentifierName { return name; }
  / BacktickIdentifier

IdentifierName "identifier"
  = start:IdentifierStart parts:IdentifierPart* {
      return start + parts.join("");
    }

IdentifierStart
  = UnicodeLetter
  / "_"

IdentifierPart
  = IdentifierStart
  / UnicodeDigit
  / UnicodeConnectorPunctuation

BacktickIdentifier
  = parts:('`' BacktickIdentifierCharacters '`') { return parts[1]; }

BacktickIdentifierCharacters
  = chars:BacktickIdentifierChar+ { return chars.join(""); }

BacktickIdentifierChar
  = !("`" / "\\" / LineTerminator) char_:SourceCharacter { return char_; }
  / "\\" sequence:EscapeSequence { return sequence; }

UnicodeLetter
  = Lu / Ll

UnicodeDigit
  = Nd

UnicodeConnectorPunctuation
  = Pc

ReservedWord
  = /* Keyword
  / */ BooleanLiteral

/*
 * Commented out to remove keywords from the grammar.
 * Not completely removed in case we change our minds.
Keyword
  = (
        "else"
      / "if"
      / "switch"
      / "then"
    )
    !IdentifierPart
*/

Literal
  = BooleanLiteral
  / value:NumericLiteral {
      return {
        type:  "NumericLiteral",
        value: value
      };
    }
  / value:StringLiteral {
      return {
        type:  "StringLiteral",
        value: value
      };
    }

BooleanLiteral
  = TrueToken  { return { type: "BooleanLiteral", value: true  }; }
  / FalseToken { return { type: "BooleanLiteral", value: false }; }

NumericLiteral "number"
  = literal:(DecimalLiteral) !IdentifierStart {
      return literal;
    }

DecimalLiteral
  = before:DecimalIntegerLiteral
    "."
    after:DecimalDigits?
    exponent:ExponentPart? {
      return parseFloat(before + "." + after + exponent);
    }
  / "." after:DecimalDigits exponent:ExponentPart? {
      return parseFloat("." + after + exponent);
    }
  / before:DecimalIntegerLiteral exponent:ExponentPart? {
      return parseFloat(before + exponent);
    }

DecimalIntegerLiteral
  = "0" / digit:NonZeroDigit digits:DecimalDigits? { return digit + digits; }

DecimalDigits
  = digits:DecimalDigit+ { return digits.join(""); }

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]

ExponentPart
  = indicator:ExponentIndicator integer:SignedInteger {
      return indicator + integer;
    }

ExponentIndicator
  = [eE]

SignedInteger
  = sign:[-+]? digits:DecimalDigits { return sign + digits; }

HexDigit
  = [0-9a-fA-F]

StringLiteral "string"
  = parts:('"' DoubleStringCharacters? '"' / "'" SingleStringCharacters? "'") {
      return parts[1];
    }

DoubleStringCharacters
  = chars:DoubleStringCharacter+ { return chars.join(""); }

SingleStringCharacters
  = chars:SingleStringCharacter+ { return chars.join(""); }

DoubleStringCharacter
  = !('"' / "\\" / LineTerminator) char_:SourceCharacter { return char_;     }
  / "\\" sequence:EscapeSequence { return sequence; }

SingleStringCharacter
  = !("'" / "\\" / LineTerminator) char_:SourceCharacter { return char_;     }
  / "\\" sequence:EscapeSequence { return sequence; }

EscapeSequence
  = CharacterEscapeSequence
  / HexEscapeSequence
  / UnicodeEscapeSequence

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter
  = char_:['"\\bfnrtv] {
      return char_
        .replace("b", "\b")
        .replace("f", "\f")
        .replace("n", "\n")
        .replace("r", "\r")
        .replace("t", "\t")
        .replace("v", "\x0B") // IE does not recognize "\v".
    }

NonEscapeCharacter
  = (!EscapeCharacter / LineTerminator) char_:SourceCharacter { return char_; }

EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / "x"
  / "u"

HexEscapeSequence
  = "x" h1:HexDigit h2:HexDigit {
      return String.fromCharCode(parseInt("0x" + h1 + h2));
    }

UnicodeEscapeSequence
  = "u" h1:HexDigit h2:HexDigit h3:HexDigit h4:HexDigit {
      return String.fromCharCode(parseInt("0x" + h1 + h2 + h3 + h4));
    }

/* Tokens */

AndToken        = "and"              !IdentifierPart { return "&&"; }
                / "AND"              !IdentifierPart { return "&&"; }
OrToken         = "or"               !IdentifierPart { return "||"; }
                / "OR"               !IdentifierPart { return "||"; }

FalseToken      = "false"            !IdentifierPart
TrueToken       = "true"             !IdentifierPart

/*
 * Unicode Character Categories
 *
 * Source: http://www.fileformat.info/info/unicode/category/index.htm
 */

/*
 * Non-BMP characters are completely ignored to avoid surrogate pair handling
 * (JavaScript strings in most implementations are encoded in UTF-16, though
 * this is not required by the specification -- see ECMA-262, 5th ed., 4.3.16).
 *
 * If you ever need to correctly recognize all the characters, please feel free
 * to implement that and send a patch.
 */

// Letter, Lowercase
Ll = [a-z|\u03B1-\u03C9]

// Letter, Modifier
Lm = []

// Letter, Other
Lo = []

// Letter, Titlecase
Lt = []

// Letter, Uppercase
Lu = [A-Z|\u0391-\u03A9]

// Mark, Spacing Combining
Mc = []

// Mark, Nonspacing
Mn = []

// Number, Decimal Digit
Nd = [0-9]

// Number, Letter
Nl = []

// Punctuation, Connector
Pc = [\u005F]

// Separator, Space
Zs = [\u0020\u00A0]

/* Whitespace */

_
  = (WhiteSpace)*

__
  = (WhiteSpace / LineTerminatorSequence)*

/* ===== A.3 Expressions ===== */

PrimaryExpression
  = name:Identifier { return { type: "Variable", name: name }; }
  / Literal
  / "(" __ expression:Expression __ ")" { return expression; }

MemberExpression
  = base:(
        PrimaryExpression
    )

CallExpression
  = base:(
      name:MemberExpression __ args:Arguments {
        return {
          type:      "FunctionCall",
          name:      name,
          args:      args
        };
      }
    )
    argumentsOrAccessors:(
        __ args:Arguments {
          return {
            type:      "FunctionCallArguments",
            args:      args
          };
        }
    )* {
      var result = base;
      for (var i = 0; i < argumentsOrAccessors.length; i++) {
        switch (argumentsOrAccessors[i].type) {
          case "FunctionCallArguments":
            result = {
              type:      "FunctionCall",
              name:      result,
              args:      argumentsOrAccessors[i].args
            };
            break;
          default:
            throw new Error(
              "Invalid expression type: " + argumentsOrAccessors[i].type
            );
        }
      }
      return result;
    }

Arguments
  = "(" __ args:ArgumentList? __ ")" {
    return args !== "" ? args : [];
  }

ArgumentList
  = head:Expression tail:(__ "," __ Expression)* {
    var result = [head];
    for (var i = 0; i < tail.length; i++) {
      result.push(tail[i][3]);
    }
    return result;
  }

LeftHandSideExpression
  = CallExpression
  / MemberExpression

UnaryExpression
  = LeftHandSideExpression
  / operator:UnaryOperator __ expression:UnaryExpression {
      return {
        type:       "UnaryExpression",
        operator:   operator,
        expression: expression
      };
    }

UnaryOperator
  = "+"
  / "-"
  / "\u2212" { return "-"; }  // Unicode Minus Sign
  / "!"

PowerExpression
  = head:(__ UnaryExpression __ PowerOperator)*
    tail:UnaryExpression {
      var result = tail;
      for (var i = head.length - 1; i >= 0; i--) {
        result = {
          type:     "BinaryExpression",
          operator: "^",
          left:     head[i][1],
          right:    result
        };
      }
      return result;
    }

PowerOperator
  = "^"

MultiplicativeExpression
  = head:PowerExpression
    tail:(__ MultiplicativeOperator __ PowerExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        result = {
          type:     "BinaryExpression",
          operator: tail[i][1],
          left:     result,
          right:    tail[i][3]
        };
      }
      return result;
    }

MultiplicativeOperator
  = operator:("*" / "/" / "%") !"=" { return operator; }
  / "\u00D7" !"="                   { return "*"; }   // Unicode Multiplication Sign
  / "\u00F7" !"="                   { return "/"; }   // Unicode Division Sign
  / "\u22C5" !"="                   { return "*"; }   // Unicode Dot Operator

AdditiveExpression
  = head:MultiplicativeExpression
    tail:(__ AdditiveOperator __ MultiplicativeExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        result = {
          type:     "BinaryExpression",
          operator: tail[i][1],
          left:     result,
          right:    tail[i][3]
        };
      }
      return result;
    }

AdditiveOperator
  = "+" !("+" / "=") { return "+"; }
  / "-" !("-" / "=") { return "-"; }
  / "\u2212" !("\u2212" / "=") { return "-"; }  // Unicode Minus Sign

RelationalExpression
  = head:AdditiveExpression
    tail:(__ RelationalOperator __ AdditiveExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        result = {
          type:     "BinaryExpression",
          operator: tail[i][1],
          left:     result,
          right:    tail[i][3]
        };
      }
      return result;
    }

RelationalOperator
  = "<="
  / ">="
  / "<"
  / ">"
  / "\u2264" { return "<="; }   // Unicode LESS-THAN OR EQUAL TO
  / "\u2265" { return ">="; }   // Unicode GREATER-THAN OR EQUAL TO

EqualityExpression
  = head:RelationalExpression
    tail:(__ EqualityOperator __ RelationalExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        result = {
          type:     "BinaryExpression",
          operator: tail[i][1],
          left:     result,
          right:    tail[i][3]
        };
      }
      return result;
    }

EqualityOperator
  = "="       { return "=="; }
  / "!="      { return "!="; }
  / "\u2260"  { return "!="; }  // Unicode NOT EQUAL TO

LogicalANDExpression
  = head:EqualityExpression
    tail:(__ LogicalANDOperator __ EqualityExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        result = {
          type:     "BinaryExpression",
          operator: tail[i][1],
          left:     result,
          right:    tail[i][3]
        };
      }
      return result;
    }

LogicalANDOperator
  = "&" !"=" { return "&&"; }
  / AndToken

LogicalORExpression
  = head:LogicalANDExpression
    tail:(__ LogicalOROperator __ LogicalANDExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        result = {
          type:     "BinaryExpression",
          operator: tail[i][1],
          left:     result,
          right:    tail[i][3]
        };
      }
      return result;
    }

LogicalOROperator
  = "|" !"=" { return "||"; }
  / OrToken

ConditionalExpression
  = condition:LogicalORExpression __
    "?" __ trueExpression:Expression __
    ":" __ falseExpression:Expression {
      return {
        type:            "ConditionalExpression",
        condition:       condition,
        trueExpression:  trueExpression,
        falseExpression: falseExpression
      };
    }
  / LogicalORExpression

Expression
  = ConditionalExpression

Formula
  = Expression
