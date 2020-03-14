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
         *    columnWidthPct {Number} - percentage width of attribute column
         *    dragStatus {Object}
         */

        return {

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
                var tAttr = this_.props.dragStatus.dragObject.data.attribute,
                    tCallback = this_.props.dropCallback;
                // Postpone the actual change so that we'll be outside this render
                setTimeout(function () {
                  // Use SC.run to make Sproutcore happy with invokeLaters that will be called
                  SC.run(function () {
                    tCallback(tAttr);
                  });
                }, 0);
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
                tHeaderString = tNumSelected > 0 ?
                    'DG.CaseCard.namePlusSelectionCount'.loc(tNumSelected, tNumCases, tName) :
                    'DG.CaseCard.namePlusCaseCount'.loc(tNumCases, tName),
                tHeaderWidth = this.props.columnWidthPct != null
                                ? (Math.round(this.props.columnWidthPct * 1000) / 10) + '%'
                                : undefined,
                tNavButtons = DG.React.Components.NavButtons({
                  collectionClient: tCollClient,
                  caseIndex: tCaseIndex,
                  numCases: tNumCases,
                  onPrevious: this.props.onPrevious,
                  onNext: this.props.onNext,
                  onNewCase: this.props.onNewCase
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
                  style: { paddingLeft: (tIndex * 10 + 5) + 'px', width: tHeaderWidth },
                  className: 'react-data-card-coll-header-cell',
                  ref: function(elt) { this.props.onHeaderCellRef && this.props.onHeaderCellRef (elt); }.bind(this)
                }, tHeaderComponent),
                td({
                  className: 'react-data-card-nav-header-cell'
                }, tNavButtons)
            );
          }
        };
      }()), []);

});
