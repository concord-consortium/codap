/* global ReactDOMFactories */
// sc_require('react/dg-react');

DG.React.ready(function () {
  var
      tr = ReactDOMFactories.tr,
      th = ReactDOMFactories.th,
      div = ReactDOMFactories.div;

  DG.React.Components.CollectionHeader = DG.React.createComponent(
      (function () {

        /**
         * Props are
         *    index {Number}
         *    collClient {DG.CollectionClient}
         *    caseID {Number}
         *    columnWidthPct {Number} - percentage width of attribute column
         *    onCollectionNameChange(newName: string) {function} - called when name is edited
         *    onHeaderWidthChange(width: number) {function} - called with pixel width of column
         *    dragStatus {Object}
         */

        return {

          domRow: null,

          getInitialState: function () {
            return {
              isEditingLabel: false
            };
          },

          render: function () {
            var this_ = this;

            function dragIsInMe() {
              var tResult;
              if (this_.props.dragStatus && this_.props.dragStatus.dragType === 'ownContext'
                  && this_.props.dragStatus.event && this_.domRow) {
                var tEvent = this_.props.dragStatus.event,
                    tX = tEvent.clientX,
                    tY = tEvent.clientY,
                    tRect = this_.domRow.getBoundingClientRect();
                tResult = tX >= tRect.left && tX < tRect.right &&
                          tY >= tRect.top && tY < tRect.bottom;
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

            var renderStaticLabel = function(iCollectionClient, iCollectionName, iNumCases) {
              var numSelected = iCollectionClient
                      ? iCollectionClient.getPath('casesController.selection').toArray().length
                      : 0,
                  headerLabel = numSelected > 0
                      ? 'DG.CaseCard.namePlusSelectionCount'.loc(numSelected, iNumCases, iCollectionName)
                      : 'DG.CaseCard.namePlusCaseCount'.loc(iNumCases, iCollectionName);
              return (
                div({
                  className: 'collection-label',
                  onClick: function() {
                    this.setState({ isEditingLabel: true });
                  }.bind(this)
                }, headerLabel)
              );
            }.bind(this);

            var renderEditableLabel = function(iCollectionName) {
              return (
                DG.React.SimpleEdit({
                  className: 'collection-label',
                  value: iCollectionName,
                  onCompleteEdit: function(iNewName) {
                    if (iNewName && (iNewName !== iCollectionName) && this.props.onCollectionNameChange) {
                      this.props.onCollectionNameChange(iCollectionName, iNewName);
                    }
                    this.setState({ isEditingLabel: false });
                  }.bind(this)
                })
              );
            }.bind(this);

            handleDropIfAny();

            var tCollClient = this.props.collClient,
                tCaseID = this.props.caseID,
                tIndex = this.props.index,
                tRowClass = 'collection-header-row' + (dragIsInMe() ? ' drop' : ''),
                tCollection = tCollClient.get('collection'),
                tName = tCollection.get('name'),
                tNumCases = tCollection.get('cases').length,
                tCaseIndex = SC.none(tCaseID) ? null : tCollection.getCaseIndexByID(tCaseID) + 1,
                tNavButtons = DG.React.Components.NavButtons({
                  collectionClient: tCollClient,
                  caseIndex: tCaseIndex,
                  numCases: tNumCases,
                  onPrevious: this.props.onPrevious,
                  onNext: this.props.onNext,
                  onNewCase: this.props.onNewCase,
                  onDeselect: this.props.onDeselect
                });
            return (
              tr({
                  key: 'coll-' + tIndex,
                  className: tRowClass,
                  ref: function(elt) { this.domRow = elt; }.bind(this)
                },
                th({
                    colSpan: 2,
                    style: { paddingLeft: (tIndex * 10 + 5) + 'px' },
                    className: 'collection-header-cell',
                  },
                  div({ className: 'collection-header-contents' }, 
                      this.state.isEditingLabel
                        ? renderEditableLabel(tName)
                        : renderStaticLabel(tCollClient, tName, tNumCases),
                      div({ className: 'nav-header' }, tNavButtons)
                  )
                )
              )
            );
          }
        };
      }()), []);

});
