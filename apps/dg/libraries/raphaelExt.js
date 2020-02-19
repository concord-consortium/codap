// ==========================================================================
//                          Raphael Extensions
//
//  Defines extensions to Raphael using Raphael's customization capabilities
//
//  Author:   Jonathan Sandoe
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

if (window.sc_require) {
    sc_require('libraries/raphael');
}

/**
 * @receiver {R}
 * @return {Raphael path element} line from (x1, y1) to (x2, y2)
 * @param {Number} each parameter is coordinate relative to the canvas
 * @example canvas.line(0, 0, 45, 70)
 */
if (!Raphael.fn.line) {
    Raphael.fn.line = function(x1, y1, x2, y2) {
        // first, create the line graphic using the existing path api
        var x = this.path("M" + x1 + "," + y1 + "L" + x2 + "," + y2)
        // create attributes, so they can be reported.
//        x.attrs.x1 = x1;
//        x.attrs.y1 = y1;
//        x.attrs.x2 = x2;
//        x.attrs.y2 = y2;
//        // next, create setters for the attributes.
//        x.paper.customAttributes["x1"] = function (num) {
//            var p = this.attr("path");
//            p[0][1] = num;
//            return{"path": p};
//        }
//        x.paper.customAttributes["y1"] = function (num) {
//            var p = this.attr("path");
//            p[0][2] = num;
//            return{"path": p};
//        }
//        x.paper.customAttributes["x2"] = function (num) {
//            var p = this.attr("path");
//            p[1][1] = num;
//            return{"path": p};
//        }
//        x.paper.customAttributes["y2"] = function (num) {
//            var p = this.attr("path");
//            p[1][2] = num;
//            return{"path": p};
//        }
        return x;
    }
}

/**
 * Add the given class name to the classnames belonging to the receiving element
 * The new name will not be added if already present.
 * @param {String}
  * @return {Raphael element}
 */
if (!Raphael.el.addClass) {
    Raphael.el.addClass = function (newClass) {
        var classNameEl = this.node.className;
        var classes = classNameEl.baseVal.trim().split(" ");

        if (classes.indexOf(newClass) < 0) {
            classes.push(newClass);
            classNameEl.baseVal = classes.join(' ');
        }
        return this;
    }
}
if (!Raphael.el.setClass) {
    Raphael.el.setClass = function (newClass) {
        var classNameEl = this.node.className;
        classNameEl.baseVal = newClass;
        return this;
    }
}

if (!Raphael.el.hasClass) {
  Raphael.el.hasClass = function (myClass) {
    var classNameEl = this.node.className;
    var classes = classNameEl.baseVal;
    if (classes.indexOf(myClass) < 0) {
      return false;
    } else {
      return new RegExp('\b' + myClass + '\b').test(classes);
    }

  }
}

/**
 * Remove the given class name from those belonging to the receiver.
 * Do nothing if not present.
 * @receiver {Raphael element}
 * @param {String}
 * @return {Raphael element }
 */
if (!Raphael.el.removeClass) {
  Raphael.el.removeClass = function (myClass) {
    function removeWord(str, word) {
      var rslt, words, wordIndex;
      if (str === word) {
        rslt = '';
      } else if (!str) {
        rslt = str;
      } else {
        words = str.split(" ");
        wordIndex = words.indexOf(word);
        if (wordIndex >= 0) {
          words.splice(wordIndex, 1)
          rslt = words.join(' ');
        } else {
          rslt = str;
        }
      }
      return rslt;
    }
    var classes = this.node.className.baseVal;

    var newClasses = removeWord(classes, myClass);

    this.node.className.baseVal = newClasses;
  }
}

/**
 * Set an id on the svg element belonging to the receiver.
 * @receiver {Raphael element}
 * @param {String}
 * @return {Raphael element }
 */
if (!Raphael.el.setId) {
    Raphael.el.setId = function (myId) {
        this.node.id.baseVal = myId;
        return this;
    }
}

/**
 * Returns true if the Raphael element has been hidden.
 * @receiver {Raphael element}
 * @returns  {Boolean}  True if the element is hidden, false otherwise.
 */
if (!Raphael.el.isHidden) {
  Raphael.el.isHidden = function() {
    return (this.node.style.display === "none");
  }
}
