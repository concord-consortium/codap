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

/* global React */
/* global ReactDOM */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      findDOMNode = ReactDOM.findDOMNode,
      td = React.DOM.td;

  DG.React.Components.Dropdown = DG.React.createComponent(
      (function () {

        /**
         * Props are
         *
         */

        return {

          getInitialState: function () {
            return {
              active: false
            };
          },

          componentDidMount: function () {
            DG.mainPage.mainPane.addListener({action: 'click', target: this, method: this._onWindowClick});
            DG.mainPage.mainPane.addListener({action: 'touchstart', target: this, method: this._onWindowClick});
          },

          componentWillUnmount: function () {
            DG.mainPage.mainPane.removeListener({action: 'click', target: this, method: this._onWindowClick});
            DG.mainPage.mainPane.removeListener({action: 'touchstart', target: this, method: this._onWindowClick});
          },

          componentWillReceiveProps: function (iNewProps) {
          },

          isActive: function () {
            return (typeof this.props.active === 'boolean') ?
                this.props.active :
                this.state.active;
          },

          hide: function () {
            this.setState({
              active: false
            });
            if (this.props.onHide) {
              this.props.onHide();
            }
          },

          show: function () {
            this.setState({
              active: true
            });
            if (this.props.onShow) {
              this.props.onShow();
            }
          },

          _onWindowClick: function( event) {
            var dropdownElement = findDOMNode(this);
            if (event.target !== dropdownElement && !dropdownElement.contains(event.target) && this.isActive()) {
              this.hide();
            }
          },

          _onToggleClick: function( event) {
            event.preventDefault();
            if (this.isActive()) {
              this.hide();
            } else {
              this.show();
            }
          },

          render: function () {
            var tChildren = this.props.children,
                tClassName = this.props.className || '',
                tDisabled = this.props.disabled,
                tRemoveElement = this.props.removeElement,
                tActive = this.isActive(),
                tClasses = 'dropdown' + (tActive ? ' dropdown--active' : '') + (tDisabled ? ' dropdown--disabled' : ''),
                tBoundChildren = React.Children.map( tChildren, function( iChild) {
                  if( iChild.type === DG.React.Components.DropdownTrigger.type) {
                    var tOriginalOnClick = iChild.props.onClick;
                    iChild = React.cloneElement( iChild, {
                      ref: 'trigger',
                      onClick: function( iEvent) {
                        if( !tDisabled) {
                          this._onToggleClick( iEvent);
                          if( tOriginalOnClick)
                            tOriginalOnClick.apply( iChild, arguments);
                        }
                      }.bind( this)
                    });
                  }
                  else if( iChild.type === DG.React.Components.DropdownContent.type && tRemoveElement && !tActive) {
                    iChild = null;
                  }
                  return iChild;
                }.bind( this)),
                tCleanProps = Object.assign({}, this.props);
            delete tCleanProps.active;
            delete tCleanProps.onShow;
            delete tCleanProps.onHide;
            delete tCleanProps.removeElement;
            tCleanProps.className = tClasses + ' ' + tClassName;
            return td( tCleanProps, tBoundChildren);
          }
        };
      })(), []);

});
