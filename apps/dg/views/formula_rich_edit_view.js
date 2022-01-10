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
/*global CodeMirror:true */
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
        isInsertingFunction = (completion.category === 'Functions'),
        replaceWithoutParens = isInsertingFunction && (nextChar === '('),
        canonicalString = isInsertingFunction ? completion.text :
            DG.Attribute.canonicalizeName(completion.text, true),
        newText;
    if( completion.text !== canonicalString)
      canonicalString = '`' + completion.text + '`';
    // if we're inserting a function reference, don't insert redundant parentheses
    newText = replaceWithoutParens
                ? canonicalString.slice(0, canonicalString.length - 2)
                : canonicalString;

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
    var isFunction1 = (c1.category === 'Functions'),
        isFunction2 = (c2.category === 'Functions'),
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
          list: (!curWord || !options.completionData
                  ? []
                  : options.completionData.reduce(function(memo, item) {
                      if (item && item.label && item.label.match(regex))
                        memo.push({ text: item.value, category: item.category.key, className: 'dg-wants-touch', hint: cmHintReplace });
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

  classNames: ['dg-wants-touch'],

  names: [],  // Will be filled with attribute and global variable names by client

  _disableNextSelectRoot: false,

  init: function() {
    sc_super();

    // only works for textarea at the moment
    this.set('isTextArea', true);
  },

  didAppendToDocument: function() {

    var textArea = this.$('textarea'),
        textAreaNode = textArea[0],
        placeholderText = this.get('hint');

    // not sure why this isn't happening automatically
    if (placeholderText) {
      textArea.attr('placeholder', placeholderText.loc());
    }

    this._cm = CodeMirror.fromTextArea(textAreaNode, {
      lineWrapping: true,
      extraKeys: {
        Tab: false
      },
      mode: 'codapFormula',
      hintOptions: {
        completeSingle: false,
        completionData: this.get('completionData'),
        hint: codapFormulaHints,
        extraKeys: {
          Esc: function(cm, menu) {
            menu.close();
            if (this._lastEscKeyEvent) {
              // prevent event from bubbling up to dialog
              this._lastEscKeyEvent.stopPropagation();
              this._lastEscKeyEvent = null;
            }
            return true;
          }
        }
      }
    });

    // initialize coloring
    this.addSemanticClasses(this._cm);

    // Propagation of the touchend event leads to touches that set focus()
    // and then immediately clear it among other oddities. CodeMirror's 
    // internal touchend handler ends with a call to preventDefault(), but
    // propagation still occurs. By piggy-backing our touchend handler on
    // CodeMirror's, we can stop the propagation without modifying the
    // CodeMirror code itself. The need for this should be revisited as
    // CodeMirror is upgraded moving forward. If it could be determined
    // (via simpler test case, for instance), that this is simply a
    // CodeMirror bug rather than an interaction with SproutCore, etc.,
    // then it would make sense to submit a PR to CodeMirror.
    if (this._cm.display && this._cm.display.scroller) {
      this._cm.display.scroller.addEventListener('touchend', function(evt) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
      });
    }

    this._cm.on('keydown', function(cm, evt) {
      if (evt.keyCode === SC.Event.KEY_ESC) {
        // capture event so it can be prevented from bubbling up to dialog
        this._lastEscKeyEvent = evt;
      }
    });

    this._cm.on('changes', function(cm, changes) {
      // semantic coloring; adds an appropriate CSS class indicating
      // the category of an identifier, e.g. 'codap-Attributes'.
      this.addSemanticClasses(cm);

      SC.run(function() {
        // synchronize SproutCore model
        this._cm.save();
        this.fieldValueDidChange();
      }.bind(this));
    }.bind(this));

    // show hints (autocomplete menu) on keystrokes
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

  // semantic coloring; adds an appropriate CSS class indicating
  // the category of an identifier, e.g. 'codap-Attributes'.
  addSemanticClasses: function(cm) {
    this.$('.cm-variable, .cm-function').each(function(index, node) {
      var classes = this.className
                        .split(' ')
                        .filter(function(iClass) {
                                  return !/codap-[A-Za-z]*/.test(iClass);
                                }),
          isVariable = classes.indexOf('cm-variable') >= 0,
          isFunction = classes.indexOf('cm-function') >= 0,
          nodeText = $(node).text(),
          nodeTextLength = nodeText ? nodeText.length : 0,
          completions = cm.options.hintOptions && cm.options.hintOptions.completionData,
          i, completionCount = completions && completions.length;
      if (isVariable && (nodeTextLength > 2) &&
          (nodeText[0] === '`') && (nodeText[nodeTextLength-1] === '`')) {
        nodeText = nodeText.substring(1, nodeTextLength - 1);
      }
      // linear search could be replaced with faster (e.g. binary) search
      // if performance becomes a problem.
      for (i = 0; i < completionCount; ++i) {
        if ((isVariable && (nodeText === completions[i].value)) ||
            (isFunction && (nodeText + '()' === completions[i].value))) {
          classes.push('codap-' + completions[i].category.key);
        }
      }
      this.className = classes.join(' ');
    });
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
      var cursor = this._cm.getCursor(),
          currentLine = this._cm.getLine(cursor.line),
          start = cursor.ch - 1,
          end = start;
      while (start && (currentLine.charAt(start - 1) !== '(')) --start;
      this._cm.setSelection({line: cursor.line, ch: start},
                            {line: cursor.line, ch: end});
    }
  }
};

})());
