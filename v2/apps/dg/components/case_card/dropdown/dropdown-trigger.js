// ==========================================================================
//                              DG.React.Components.DropdownTrigger
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
      a = ReactDOMFactories.a;

  DG.React.Components.DropdownTrigger = DG.React.createComponent(
      (function () {

        return {

          render: function () {
            var tChildren = this.props.children,
                tClassName = this.props.className || '',
                tDropdownTriggerProps = Object.assign({}, this.props);
            delete tDropdownTriggerProps.children;
            tDropdownTriggerProps.className = 'dropdown__trigger ' + tClassName;
            return a( tDropdownTriggerProps, tChildren);
          }
        };
      }()), []);

});
