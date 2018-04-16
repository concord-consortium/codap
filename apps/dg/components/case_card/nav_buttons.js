/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      div = React.DOM.div,
      // p = React.DOM.p,
      // ul = React.DOM.ul,
      // li = React.DOM.li,
      span = React.DOM.span//,
      // italic = React.DOM.i,
      // h1 = React.DOM.h1,
      // h2 = React.DOM.h2,
      // table = React.DOM.table,
      // tbody = React.DOM.tbody,
      // tr = React.DOM.tr,
      // td = React.DOM.td,
      // input = React.DOM.input
      // kLeftAngleBracketChar = '&#x2039;',
      // kRightAngleBracketChar = '&#x203a;',
      // kInfoIconChar = '&#9432;';
  ;

  DG.React.Components.NavButtons = DG.React.createComponent(
      (function () {

        return {

          getInitialState: function () {
            return {};
          },

          componentDidMount: function () {
          },

          componentWillUnmount: function () {
          },

          componentWillReceiveProps: function (iNewProps) {
          },

          handleChange: function (iEvent) {
          },

          getPrevious: function () {
            this.props.onPrevious(this.props.collectionClient, this.props.caseIndex);
          },

          getNext: function () {
            this.props.onNext(this.props.collectionClient, this.props.caseIndex);
          },

          render: function () {
            var tCaseIndex = this.props.caseIndex,
                tFirstButton = (!SC.none(tCaseIndex) && tCaseIndex <= 1) ? '' :
                span({
                  className: 'moonicon-inspectorArrow-expand',
                  onClick: this.getPrevious
                }),
                tSecondButton = (!SC.none(tCaseIndex) && tCaseIndex >= this.props.numCases) ? '' :
                    span({
                      className: 'moonicon-inspectorArrow-collapse',
                      onClick: this.getNext
                    }),
                tButtonPair = span({
                      className: 'navbuttons-arrow'
                    }, tFirstButton, tSecondButton
                );
            return span({className: 'react-data-card-navbuttons'}, tButtonPair);
          }
        };
      })(), []);

});
