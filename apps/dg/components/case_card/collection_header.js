/* global React */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      tr = React.DOM.tr,
      th = React.DOM.th,
      td = React.DOM.td;

  DG.React.Components.CollectionHeader = DG.React.createComponent(
      (function () {

        /**
         * Props are
         *    index {Number}
         *    collClient {DG.CollectionClient}
         *    caseID {Number}
         *    dragStatus {Object}
         */

        return {

          moveDirection: '',

          getInitialState: function () {
            return {

            };
          },

          componentDidMount: function () {
          },

          componentWillUnmount: function () {
          },

          componentWillReceiveProps: function (iNewProps) {
          },

          render: function () {
            var this_ = this;

            function assignCellRef(iElement) {
              this_.cellRef = iElement;
            }

            function dragIsInMe() {
              var tResult;
              if (this_.props.dragStatus && this_.props.dragStatus.event && this_.cellRef) {
                var tEvent = this_.props.dragStatus.event,
                    tX = tEvent.clientX,
                    tY = tEvent.clientY,
                    tRect = this_.cellRef.getBoundingClientRect();
                tResult = tX >= tRect.x && tX <= tRect.x + tRect.width &&
                    tY >= tRect.y && tY <= tRect.y + tRect.height;
              }
              this_.dragIsInMe = tResult;
              return tResult;
            }

            function handleDropIfAny() {
              if (this_.dragIsInMe && this_.props.dragStatus &&
                  this_.props.dragStatus.op === SC.DRAG_LINK &&
                  this_.props.dropCallback) {
                this_.props.dropCallback(this_.props.dragStatus.dragObject.data.attribute);
              }
            }

            handleDropIfAny();

            var toggleEditing = function () {

            }.bind(this);

            var tCollClient = this.props.collClient,
                tCaseID = this.props.caseID,
                tIndex = this.props.index,
                tRowClass = 'react-data-card-collection-header' + (dragIsInMe() ? ' drop' : ''),
                tCollection = tCollClient.get('collection'),
                tName = tCollection.get('name'),
                tNumCases = tCollection.get('cases').length,
                tNumSelected = tCollClient ?
                    tCollClient.getPath('casesController.selection').toArray().length : null,
                tCaseIndex = SC.none(tCaseID) ? null : tCollection.getCaseIndexByID(tCaseID) + 1,
                tHeaderString = tCaseIndex === null ?
                    (tNumSelected > 1 ?
                            'DG.CaseCard.namePlusSelectionCount'.loc(tName, tNumSelected, tNumCases) :
                            'DG.CaseCard.namePlusCaseCount'.loc(tName, tNumCases)
                    ) :
                    'DG.CaseCard.indexString'.loc(tName, tCaseIndex, tNumCases),
                tNavButtons = DG.React.Components.NavButtons({
                  collectionClient: tCollClient,
                  caseIndex: tCaseIndex,
                  numCases: tNumCases,
                  onPrevious: this.moveToPreviousCase,
                  onNext: this.moveToNextCase
                }),
                tHeaderComponent = DG.React.Components.TextInput({
                  value: tHeaderString,
                  onToggleEditing: toggleEditing
                });
            return tr({
                  key: 'coll-' + tIndex,
                  className: tRowClass,
                  ref: assignCellRef
                },
                th({
                  style: {'paddingLeft': (tIndex * 10 + 5) + 'px'},
                  className: 'react-data-card-coll-header-cell'
                }, tHeaderComponent),
                td({
                  className: 'react-data-card-nav-header-cell'
                }, tNavButtons)
            );
          }
        };
      })(), []);

});
