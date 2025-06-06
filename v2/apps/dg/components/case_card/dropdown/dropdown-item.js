// ==========================================================================
//                              DG.React.Components.DropdownItem
//
//  Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.
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

/* global ReactDOMFactories */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      div = ReactDOMFactories.div;

  /**
   * props
   *  disabled: Boolean
   *  clickHandler: function
   *
   */

  DG.React.Components.DropdownItem = DG.React.createComponent(
      (function () {

        return {
          classNameDefault: 'react-data-card-attribute-menu-item',

          render: function () {

            var tClassName = this.classNameDefault + (this.props.disabled ? ' disabled' : ''),
                tClickHandler = this.props.disabled ? null : this.props.clickHandler;

            return div({
              className: tClassName,
              onMouseDown: tClickHandler,
              onTouchStart: tClickHandler
            }, this.props.children);
          }
        };
      }()), []);

});
