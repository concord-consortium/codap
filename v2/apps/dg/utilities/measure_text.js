// ==========================================================================
//  
//  Author:   jsandoe
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
/**
 * A utility to measure the width of text.
 *
 * @param text {string} this text to measure
 * @param iStyle {object} font attributes if not default
 */
DG.measureText = (function () {
  /**
   * Whether or not the element contents being measured has exceeded its
   * container. This obviously depends on whether the style passed in defines
   * a container that can be exceeded. If, for example, the style specifies a
   * width and has overflow, 'auto'.
   * @param element
   * @return {boolean}
   */
  function hasOverflowed(element) {
    // For some versions of Safari, with some zoom settings, the scroll dimensions
    // exceed the client dimensions, but no overflow has occurred. We account for
    // for this possibility.
    return element.scrollHeight - 1 > element.clientHeight ||
        element.scrollWidth - 1 > element.clientWidth;
  }

  var kSelector = 'dg-text-measurer';
  var $el;

  return function (text, iStyle) {
    var style = {'font': 'initial'};
    if (iStyle) {
      style = iStyle;
    }
    $el = $('.' + kSelector);
    if ($el.length === 0) {
      $el = $('<div>').addClass(kSelector);
      $el.appendTo(document.body);
    }
    $el.attr('style', style).html(text);
    return { width: $el.outerWidth(), height: $el.outerHeight(), hasOverflowed:  hasOverflowed($el[0])};
  };
}());
