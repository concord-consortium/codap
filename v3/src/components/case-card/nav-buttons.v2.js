import ReactDOMFactories from "react-dom-factories"
import { DG } from "../../v2/dg-compat.v2"
import { SC, v2t } from "../../v2/sc-compat"
import "../../assets/icon_fonts/icon_font_style.css"

DG.React.ready(function () {
  var
      // img = ReactDOMFactories.img,
      br = ReactDOMFactories.br,
      button = ReactDOMFactories.button,
      span = ReactDOMFactories.span

  DG.React.Components.NavButtons = DG.React.createComponent(
      (function () {

        return {

          getPrevious () {
            this.props.onPrevious(this.props.collectionClient, this.props.caseIndex)
          },

          deselect () {
            this.props.onDeselect()
          },

          getNext () {
            this.props.onNext(this.props.collectionClient, this.props.caseIndex)
          },

          getNewCase () {
            this.props.onNewCase(this.props.collectionClient)
          },

          render () {
            var tCaseIndex = this.props.caseIndex,
                tNumCases = this.props.numCases,
                tNumSelected = this.props.collectionClient
                    ? this.props.collectionClient.getPath('casesController.selection').toArray().length
                    : 0,
                tFirstTitle,
                tFirstButton,
                tDeselectTitle,
                tDeselectButton,
                tSecondTitle,
                tSecondButton,
                tAddCaseButton
            if (!(tNumCases === 0 || (!SC.none(tCaseIndex) && tCaseIndex <= 1))) {
              tFirstTitle = v2t(!SC.none(tCaseIndex) ? 'DG.CaseCard.navPrevCase' : 'DG.CaseCard.navLastCase')
              tFirstButton = span({
                className: 'moonicon-icon-reverse-play',
                style: {paddingRight: '4px'},
                onClick: this.getPrevious,
                title: tFirstTitle.loc()
              })
            }
            tDeselectTitle = v2t(tNumSelected === 0 ? 'DG.CaseCard.noDeselect' : 'DG.CaseCard.deselect')
            tDeselectButton = button({
              className: 'dg-card-deselect',
              disabled: tNumSelected === 0,
              onClick: this.deselect,
              title: tDeselectTitle.loc()
            })
            if (!(this.props.numCases === 0 || (!SC.none(tCaseIndex) && tCaseIndex >= this.props.numCases))) {
              tSecondTitle = v2t(!SC.none(tCaseIndex) ? 'DG.CaseCard.navNextCase' : 'DG.CaseCard.navFirstCase')
              tSecondButton = span({
                className: 'moonicon-icon-play',
                onClick: this.getNext,
                title: tSecondTitle.loc()
              })
            }
            else {
              tSecondButton = span({
                className: 'moonicon-icon-play',
                style: { 'color': 'transparent', 'cursor': 'default'}
              })
            }
            var tAddCaseLabelWords = v2t("DG.CaseCard.addCaseButton").loc(),
                tSpaceIndex = tAddCaseLabelWords.indexOf(' '),
                tFirstWord = tSpaceIndex >= 0 ? tAddCaseLabelWords.substring(0, tSpaceIndex) : tAddCaseLabelWords,
                tRemainder = tSpaceIndex >= 0 ? tAddCaseLabelWords.substring(tSpaceIndex) : '',
                tLabel = span({}, tFirstWord, br(), tRemainder)
            tAddCaseButton =
                button({
                  className: 'dg-floating-button-right',
                  title: v2t('DG.CaseCard.newCaseToolTip').loc(),
                  onClick: this.getNewCase
                }, tLabel)

            return span({className: 'nav-buttons dg-wants-touch'},
                tFirstButton, tDeselectButton, tSecondButton, tAddCaseButton)
          }
        }
      }()), [])

})
