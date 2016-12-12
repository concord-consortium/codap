/*

  https://github.com/sindresorhus/strip-json-comments

  The MIT License (MIT)

  Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

 */
var singleComment = 1;
var multiComment = 2;

function stripWithoutWhitespace() {
  return '';
}

function stripWithWhitespace(str, start, end) {
  return str.slice(start, end).replace(/\S/g, ' ');
}

window.stripJsonComments = function (str, opts) {
  'use strict';
  opts = opts || {};

  var currentChar;
  var nextChar;
  var insideString = false;
  var insideComment = false;
  var offset = 0;
  var ret = '';
  var strip = opts.whitespace === false ? stripWithoutWhitespace : stripWithWhitespace;

  for (var i = 0; i < str.length; i++) {
    currentChar = str[i];
    nextChar = str[i + 1];

    if (!insideComment && currentChar === '"') {
      var escaped = str[i - 1] === '\\' && str[i - 2] !== '\\';
      if (!escaped) {
        insideString = !insideString;
      }
    }

    if (insideString) {
      continue;
    }

    if (!insideComment && currentChar + nextChar === '//') {
      ret += str.slice(offset, i);
      offset = i;
      insideComment = singleComment;
      i++;
    } else if (insideComment === singleComment && currentChar + nextChar === '\r\n') {
      i++;
      insideComment = false;
      ret += strip(str, offset, i);
      offset = i;
      continue;
    } else if (insideComment === singleComment && currentChar === '\n') {
      insideComment = false;
      ret += strip(str, offset, i);
      offset = i;
    } else if (!insideComment && currentChar + nextChar === '/*') {
      ret += str.slice(offset, i);
      offset = i;
      insideComment = multiComment;
      i++;
      continue;
    } else if (insideComment === multiComment && currentChar + nextChar === '*/') {
      i++;
      insideComment = false;
      ret += strip(str, offset, i + 1);
      offset = i + 1;
      continue;
    }
  }

  return ret + (insideComment ? strip(str.substr(offset)) : str.substr(offset));
};
