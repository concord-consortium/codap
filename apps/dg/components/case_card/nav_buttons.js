/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      span = React.DOM.span//,
  ;

  DG.React.Components.NavButtons = DG.React.createComponent(
      (function () {

        return {

          getPrevious: function () {
            this.props.onPrevious(this.props.collectionClient, this.props.caseIndex);
          },

          getNext: function () {
            this.props.onNext(this.props.collectionClient, this.props.caseIndex);
          },

          render: function () {
            var tCaseIndex = this.props.caseIndex,
                tFirstButton = (this.props.numCases === 0 || (!SC.none(tCaseIndex) && tCaseIndex <= 1)) ? '' :
                span({
                  className: 'moonicon-icon-reverse-play',
                  onClick: this.getPrevious
                }),
                tSecondButton = (this.props.numCases === 0 || (!SC.none(tCaseIndex) && tCaseIndex >= this.props.numCases)) ?
                    span({
                      className: 'moonicon-icon-play',
                      style: { 'color': 'transparent', 'cursor': 'default'}
                    }) :
                    span({
                      className: 'moonicon-icon-play',
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
