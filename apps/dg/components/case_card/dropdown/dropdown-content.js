// ==========================================================================
//                              DG.React.Components.DropdownContent
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

  DG.React.Components.DropdownContent = DG.React.createComponent(
      (function () {

        return {

          getInitialState: function () {
            return {
              location: {
                left: -1000,
                top: -1000
              }
            };
          },

          render: function () {

            var tChildren = this.props.children,
                tLocation = this.props.location || this.state.location;
            return DG.React.Components.RenderInBody({}, div({
              className: 'dropdown__content dg-wants-touch',
              style: {
                left: tLocation.left,
                top: tLocation.top
              },
            }, tChildren));
          }
        };
      }()), []);

});
