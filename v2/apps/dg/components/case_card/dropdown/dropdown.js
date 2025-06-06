// ==========================================================================
//                              DG.React.Components.Dropdown
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

DG.React.ready(function () {
  var
      div = ReactDOMFactories.div;

  DG.React.Components.Dropdown = DG.React.createComponent(
      (function () {

        return {

          getInitialState: function () {
            return {
              active: false
            };
          },

          componentDidMount: function () {
            window.addEventListener("touchstart", this._onWindowClick, true);
            window.addEventListener("mousedown", this._onWindowClick, true);
          },

          componentWillUnmount: function () {
            window.removeEventListener("touchstart", this._onWindowClick, true);
            window.removeEventListener("mousedown", this._onWindowClick, true);
          },

          hide: function () {
            this.setState({
              active: false,
              location: null
            });
          },

          show: function ( iLocation) {
            this.setState({
              active: true,
              location: iLocation
            });
          },

          _onWindowClick: function( event) {
            if (this.state.active &&
                !event.target.classList.contains("react-data-card-attribute-menu-item") &&
                !event.target.classList.contains("dropdown__content")) {
              this.hide();
            }
          },

          _onToggleClick: function( event) {
            event.preventDefault();
            if (this.state.active) {
              this.hide();
            } else {
              this.show({ left: event.clientX, top: event.clientY + 12 });
            }
          },

          render: function () {
            var tClassName = this.props.className || '',
                tDisabled = this.props.disabled,
                tActive = this.state.active,
                tClasses = 'dropdown' + (tActive ? ' dropdown--active' : '') + (tDisabled ? ' dropdown--disabled' : ''),
                tTrigger = DG.React.Components.DropdownTrigger({},
                    div({
                      onClick: function( iEvent) {
                        if( !tDisabled) {
                          this._onToggleClick( iEvent);
                        }
                      }.bind( this)
                    }, this.props.trigger)),
                tMenuItems = tActive ?
                    DG.React.Components.DropdownContent({
                  location: this.state.location
                }, this.props.menuItems) : null,
                tCleanProps = Object.assign({
                  ref: function( iElement) {
                    this.props.onRefCallback( iElement);
                  }.bind( this)
                }, this.props);
            delete tCleanProps.onRefCallback;
            delete tCleanProps.trigger;
            delete tCleanProps.menuItems;
            tCleanProps.className = tClasses + ' ' + tClassName;
            return div( tCleanProps, tTrigger, tMenuItems);
          }
        };
      }()), []);

});
