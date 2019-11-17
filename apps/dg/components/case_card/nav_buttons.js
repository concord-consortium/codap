/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      img = React.DOM.img,
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

          getNewCase: function () {
            this.props.onNewCase(this.props.collectionClient);
          },

          render: function () {
            var tCaseIndex = this.props.caseIndex,
                tNumCases = this.props.numCases,
                tFirstTitle,
                tFirstButton,
                tSecondTitle,
                tSecondButton,
                tAddCaseButton;
            if (!(tNumCases === 0 || (!SC.none(tCaseIndex) && tCaseIndex <= 1))) {
              tFirstTitle = !SC.none( tCaseIndex) ? 'DG.CaseCard.navPrevCase' : 'DG.CaseCard.navLastCase';
              tFirstButton = span({
                className: 'moonicon-icon-reverse-play',
                onClick: this.getPrevious,
                title: tFirstTitle.loc()
              });
            }
            if(!(this.props.numCases === 0 || (!SC.none(tCaseIndex) && tCaseIndex >= this.props.numCases))) {
              tSecondTitle = !SC.none( tCaseIndex) ? 'DG.CaseCard.navNextCase' : 'DG.CaseCard.navFirstCase';
              tSecondButton = span({
                className: 'moonicon-icon-play',
                onClick: this.getNext,
                title: tSecondTitle.loc()
              });
            }
            else {
              tSecondButton = span({
                className: 'moonicon-icon-play',
                style: { 'color': 'transparent', 'cursor': 'default'}
              });
            }
            tAddCaseButton =
                img({
                  src: static_url('images/add_circle_blue_72x72.png'),
                  className: 'dg-floating-plus-right',
                  width: 19,
                  height: 19,
                  title: 'DG.CaseCard.newCaseToolTip'.loc(),
                  onClick: this.getNewCase
                });

            return span({className: 'react-data-card-navbuttons navbuttons-arrow'},
                tFirstButton, tSecondButton, tAddCaseButton);
          }
        };
      }()), []);

});
