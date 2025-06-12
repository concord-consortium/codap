// ==========================================================================
//                              DG.React.Components.RenderInBody
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

/* global ReactDOM, ReactDOMFactories */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      div = ReactDOMFactories.div;
  DG.React.Components.RenderInBody = DG.React.createComponent(
      (function () {
        return {

          componentDidMount: function () {
            this.popup = document.createElement("div");
            document.body.appendChild(this.popup);
            this._renderLayer();
          },


          componentDidUpdate: function () {
            this._renderLayer();
          },


          componentWillUnmount: function () {
            ReactDOM.unmountComponentAtNode(this.popup);
            document.body.removeChild(this.popup);
          },


          _renderLayer: function () {
            ReactDOM.render( this.props.children, this.popup);
          },


          render: function () {
            return div({});
          }
        };
      }()), []);

});