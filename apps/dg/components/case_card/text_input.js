/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  // var div = React.DOM.div//,
      // p = React.DOM.p,
      // ul = React.DOM.ul,
      // li = React.DOM.li,
      // span = React.DOM.span, //,
      // italic = React.DOM.i,
      // h1 = React.DOM.h1,
      // h2 = React.DOM.h2,
      // table = React.DOM.table,
      // tbody = React.DOM.tbody,
      // tr = React.DOM.tr,
  var td = React.DOM.td
  // kLeftAngleBracketChar = '&#x2039;',
  // kRightAngleBracketChar = '&#x203a;',
  // kInfoIconChar = '&#9432;';
  ;

  DG.React.Components.TextInput = DG.React.createComponent(
      (function () {

        return {

          getInitialState: function () {
            return {
              count: 0
            };
          },

          componentDidMount: function () {
          },

          componentWillUnmount: function() {
          },

          render: function () {
            var tValue = this.props.value;
            return td({}, tValue);
          }
        };
      })(), []);

});
