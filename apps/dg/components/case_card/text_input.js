/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      span = React.DOM.span,
      td = React.DOM.td,
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
          },

          componentWillUnmount: function () {
          },

          componentWillReceiveProps: function (iNewProps) {
            if (iNewProps.value !== this.state.value)
              this.setState({value: iNewProps.value});
            if (iNewProps.unit !== this.state.unit)
              this.setState({unit: iNewProps.unit});
          },

          handleChange: function (iEvent) {
            console.log('handleChange: ' + iEvent.target.value);
            this.setState({value: iEvent.target.value});
          },

          render: function () {
            var tInput = input({
                  type: 'text',
                  value: this.state.value,
                  onChange: this.handleChange,
                  autoFocus: true,
                  onKeyDown: function (iEvent) {
                    if (iEvent.keyCode === 13) {
                      this.props.onToggleEditing(this);
                    }
                  }.bind(this)
                }),
                tUnits = SC.empty(this.state.value) ? '' : ' ' + (this.state.unit || ''),
                tValue = span({
                  className: 'react-data-card-value',
                  onClick: function () {
                    if (!this.state.editing && this.props.onToggleEditing)
                      this.props.onToggleEditing(this);
                  }.bind(this)
                }, this.state.value + tUnits),
                tResult =
                    this.state.editing ?
                        tInput :
                        tValue;
            return tResult;
          }
        };
      })(), []);

});
