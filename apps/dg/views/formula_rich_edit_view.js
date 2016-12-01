// ==========================================================================
//                      DG.FormulaTextEditView
// 
//  Provides a DG-specific text editor for entering a formula.
//  
//  Authors:  William Finzer, Kirk Swenson
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

sc_require('views/text_field_view');

/** @class

  This text editor deals specially with hyphens by turning them into true minus signs.
  Its functionality can be extended to enhance formula editing.

  @extends DG.TextFieldView
*/
DG.FormulaRichEditView = DG.TextFieldView.extend((function() {
/** @scope DG.FormulaTextEditView.prototype */

  function isMatchableChar(ch) {
    // to prevent autocomplete of literal strings, include any quotes in the string to match
    if ((ch === '"') || (ch === '\'')) return true;
    // digits are matchable, even though they can't be the first character of an identifier
    if ((ch >= '0') && (ch <= '9')) return true;
    // otherwise, it must be a valid identifier character
    return DG.Formula.identifierRegExp.test(ch);
  }

  function endsWithParentheses(str) {
    return /\(\)$/.test(str);
  }

  function cmHintReplace(cm, data, completion) {
    var rangeStart = completion.from || data.from,
        rangeEnd = completion.to || data.to,
        nextCharEnd = { line: rangeEnd.line, ch: rangeEnd.ch + 1 },
        nextChar = cm.getRange(rangeEnd, nextCharEnd),
        isInsertingFunction = endsWithParentheses(completion.text),
        replaceWithoutParens = isInsertingFunction && (nextChar === '('),
        // if we're inserting a function reference, don't insert redundant parentheses
        newText = replaceWithoutParens
                    ? completion.text.slice(0, completion.text.length - 2)
                    : completion.text;

    // insert the new text
    cm.replaceRange(newText, rangeStart, rangeEnd, "complete");

    // if we're inserting a function reference, put the cursor between the parentheses
    if (isInsertingFunction) {
      var cursor = cm.getCursor();
      cm.setCursor(cursor.line, replaceWithoutParens ? cursor.ch + 1 : cursor.ch - 1);
    }
  }

  function cmSortCompletions(c1, c2) {
    /* global removeDiacritics */
    var isFunction1 = endsWithParentheses(c1.text),
        isFunction2 = endsWithParentheses(c2.text),
        // ignore case and diacritics for sorting purposes
        canonical1 = removeDiacritics(c1.text).toLowerCase(),
        canonical2 = removeDiacritics(c2.text).toLowerCase();
    // sort non-functions before functions
    if (!isFunction1 && isFunction2) return -1;
    if (isFunction1 && !isFunction2) return 1;
    if (canonical1 < canonical2) return -1;
    if (canonical1 > canonical2) return 1;
    return 0;
  }

  /*
   * returns the set of available completions given the current caret position
   */
  function codapFormulaHints(cm, options) {
    var cursor = cm.getCursor(),
        currentLine = cm.getLine(cursor.line),
        start = cursor.ch,
        end = start;
    while (end < currentLine.length && isMatchableChar(currentLine.charAt(end))) ++end;
    while (start && isMatchableChar(currentLine.charAt(start - 1))) --start;
    var curWord = start !== end && currentLine.slice(start, end),
        regex = curWord ? new RegExp('^' + DG.StringUtilities.escapeRegExp(curWord), 'i') : null,
        result = {
          list: (!curWord ? [] : options.completionData.reduce(function(memo, item) {
            if (item && item.label && item.label.match(regex))
              memo.push({ text: item.value, hint: cmHintReplace });
            return memo;
          }, [])).sort(cmSortCompletions),
          from: CodeMirror.Pos(cursor.line, start),
          to: CodeMirror.Pos(cursor.line, end)
        };
    // don't show the menu if there's only one option and it's already complete
    if ((result.list.length === 1) && (result.list[0].text === curWord))
      result.list = [];

    return result;
  }

return {

  isTextArea: true,

  autoCorrect: false,

  autoCapitalize: false,
  
  names: [],  // Will be filled with attribute and global variable names by client

  _disableNextSelectRoot: false,

  init: function() {
    sc_super();

    // only works for textarea at the moment
    this.set('isTextArea', true);
  },

  didAppendToDocument: function() {

    var textArea = this.$('textarea'),
        textAreaNode = textArea[0];

    /* global CodeMirror */
    this._cm = CodeMirror.fromTextArea(textAreaNode, {
      lineWrapping: true,
      extraKeys: {
        Tab: false,
        '-': function(cm) { cm.replaceSelection(DG.UNICODE.MINUS_SIGN); }
      },
      mode: 'codapFormula',
      hintOptions: {
        completeSingle: false,
        completionData: this.get('completionData'),
        hint: codapFormulaHints
      }
    });

    this._cm.on('changes', function(cm, changes) {
      this.$('.cm-variable').each(function(index, node) {
        var classes = this.className
                          .split(' ')
                          .filter(function(iClass) {
                                    return !/codap-[A-Za-z]*/.test(iClass);
                                  }),
            nodeText = $(node).text(),
            completions = cm.options.hintOptions && cm.options.hintOptions.completionData,
            i, completionCount = completions && completions.length;
        for (i = 0; i < completionCount; ++i) {
          if ((nodeText === completions[i].value) ||
              (nodeText + '()' === completions[i].value)) {
            classes.push('codap-' + completions[i].category.key);
          }
        }
        this.className = classes.join(' ');
      });
      SC.run(function() {
        this._cm.save();
        this.fieldValueDidChange();
      }.bind(this));
    }.bind(this));

    this._cm.on("inputRead", function(editor, change) {
      if (DG.Formula.identifierRegExp.test(change.text))
        editor.showHint();
    });

    $('.CodeMirror').css({ height: '100%' });
  },

  becomeFirstResponder: function() {
    if (this._cm)
      this._cm.focus();
  },

  formulaExpression: function( iKey, iValue) {
    if( iValue === undefined) {
      var tCurrent = this._cm.getValue();
      return tCurrent ? tCurrent.trim() : "";
    }
    else {
      this._cm.setValue(iValue || "");
    }
  }.property('value'),
  
  /**
    Replace the current selection with the specified string.
    @param    {String}    iNewString -- the string to insert
   */
  replaceSelectionWithString: function(iNewString) {
    this._cm.replaceSelection(iNewString);

    // if we're inserting a function reference, put the cursor between the parentheses
    if (endsWithParentheses(iNewString)) {
      var cursor = this._cm.getCursor();
      this._cm.setCursor(cursor.line, cursor.ch - 1);
    }
  }
};

})());
