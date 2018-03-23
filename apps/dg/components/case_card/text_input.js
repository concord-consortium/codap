/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      // div = React.DOM.div//,
      // p = React.DOM.p,
      // ul = React.DOM.ul,
      // li = React.DOM.li,
      span = React.DOM.span,
      // italic = React.DOM.i,
      // h1 = React.DOM.h1,
      // h2 = React.DOM.h2,
      // table = React.DOM.table,
      // tbody = React.DOM.tbody,
      // tr = React.DOM.tr,
      td = React.DOM.td,
      input = React.DOM.input
      // kLeftAngleBracketChar = '&#x2039;',
      // kRightAngleBracketChar = '&#x203a;',
      // kInfoIconChar = '&#9432;';
  ;

  DG.React.Components.TextInput = DG.React.createComponent(
      (function () {

        return {

/*
          constructor: function( props) {
            super( props);
            this.setState({ value: props.value });
          },
*/

          getInitialState: function () {
            return {
              editing: false,
              value: this.props.value
            };
          },

          componentDidMount: function () {
          },

          componentWillUnmount: function () {
          },

          componentWillReceiveProps: function ( iNewProps) {
            if( iNewProps.value !== this.state.value)
              this.setState({ value: iNewProps.value});
          },

          handleChange: function( iEvent) {
            console.log('handleChange: ' + iEvent.target.value);
            this.setState({ value: iEvent.target.value});
          },

          render: function () {
            var tInput = input({
                  type: 'text',
                  value: this.state.value,
                  onChange: this.handleChange,
                  autoFocus: true,
                  onBlur: function( iEvent) {
                    console.log('blur');
                  }
                }),
                tValue =
                    span({
                      className: 'react-data-card-value',
                      onClick: function () {
                        if (!this.state.editing)
                          this.props.onToggleEditing(this);
                      }.bind(this)
                    }, this.state.value),
                tResult =
                    this.state.editing ?
                        tInput :
                        tValue;
            return td({}, tResult);
          }
        };
      })(), []);

});
