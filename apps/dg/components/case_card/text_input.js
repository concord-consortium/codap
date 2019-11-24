/* global React */
/* global ReactDOM */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      findDOMNode = ReactDOM.findDOMNode,
      span = React.DOM.span,
      input = React.DOM.input;

  DG.React.Components.TextInput = DG.React.createComponent(
      (function () {

        /**
         * props are
         *    value: {string | number}
         *    unit: {string}
         *    onToggleEditing: {function}
         */

        return {

          getInitialState: function () {
            return {
              editing: false,
              value: this.props.value,
              unit: this.props.unit
            };
          },

          componentDidMount: function () {
            // Note that this depends on SproutCore in the midst of a React component. Not good!
            DG.mainPage.mainPane.addListener({action: 'click', target: this, method: this._onWindowClick});
            DG.mainPage.mainPane.addListener({action: 'touchstart', target: this, method: this._onWindowClick});
          },
          componentWillUnmount: function () {
            DG.mainPage.mainPane.removeListener({action: 'click', target: this, method: this._onWindowClick});
            DG.mainPage.mainPane.removeListener({action: 'touchstart', target: this, method: this._onWindowClick});
          },

          componentWillReceiveProps: function (iNewProps) {
            if (iNewProps.value !== this.state.value)
              this.setState({value: iNewProps.value});
            if (iNewProps.unit !== this.state.unit)
              this.setState({unit: iNewProps.unit});
            if(iNewProps.createInEditMode && iNewProps.editModeCallback)
              iNewProps.editModeCallback( this);
          },

          componentDidUpdate: function( iPrevProps) {
            if( this.props.createInEditMode !== iPrevProps.createInEditMode) {
              this.setState( { editing: this.props.createInEditMode });
            }
          },

          _onWindowClick: function (event) {
            var inputElement = findDOMNode(this);
            if (event.target !== inputElement && !inputElement.contains(event.target) && this.state.editing) {
              this.props.onToggleEditing(this);
            }
          },

          handleChange: function (iEvent) {
            this.setState({value: iEvent.target.value});
          },

          render: function () {
            var
                tUnits = SC.empty(this.state.value) ? '' : ' ' + (this.state.unit || ''),
                tValueClassName = this.props.isEditable ? 'react-data-card-value ' : '',
                tValue = SC.empty( this.state.value) ? '____' : this.state.value,
                kCompletionCodes = [13, 9],
                tResult = this.state.editing ?
                    input({
                      className: 'dg-wants-mouse',
                      type: 'text',
                      // ref is called on creation of the input element
                      ref: function( input) {
                        input && input.focus();
                      },
                      value: this.state.value,
                      onChange: this.handleChange,
                      onKeyDown: function (iEvent) {
                        if (kCompletionCodes.indexOf( iEvent.keyCode) >= 0) {
                          this.props.onToggleEditing(this, iEvent.shiftKey ? 'up' : 'down' );
                          iEvent.preventDefault();
                        }
                        else if( iEvent.keyCode === 27) {
                          this.props.onEscapeEditing( this);
                        }
                      }.bind(this),
                      onFocus: function(iEvent) {
                        iEvent.target.select();
                      }
                    }) :
                    span({
                      className: tValueClassName + this.props.className,
                      onClick: function ( iEvent) {
                        if (!this.state.editing && this.props.onToggleEditing && this.props.isEditable) {
                          this.props.onToggleEditing(this);
                        }
                      }.bind(this)
                    }, tValue + tUnits);
            return tResult;
          }
        };
      }()), []);

});
