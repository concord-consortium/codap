/* global React */
// sc_require('react/dg-react');
sc_require('components/case_card/text_input');

DG.React.ready(function () {
  var div = React.DOM.div,
      // p = React.DOM.p,
      // ul = React.DOM.ul,
      // li = React.DOM.li,
      span = React.DOM.span, //,
      // italic = React.DOM.i,
      // h1 = React.DOM.h1,
      h2 = React.DOM.h2,
      table = React.DOM.table,
      tbody = React.DOM.tbody,
      tr = React.DOM.tr
      // td = React.DOM.td //,
      // input = React.DOM.input
  ;
  // kLeftAngleBracketChar = '&#x2039;',
  // kRightAngleBracketChar = '&#x203a;',
  // kInfoIconChar = '&#9432;';

  DG.React.Components.CaseCard = DG.React.createComponent(
      (function () {

        var ChangeListener = SC.Object.extend({
          dependent: null,

          init: function () {
            sc_super();

            DG.currDocumentController().get('contexts').forEach(function (context) {
              this.guaranteeDataContextObserver(context);
            }.bind(this));

            DG.currDocumentController().addObserver('contexts.length', this, this.contextCountDidChange);
          },

          destroy: function () {
            DG.currDocumentController().removeObserver('contexts.length', this, this.contextCountDidChange);
            DG.currDocumentController().get('contexts').forEach(function (iContext) {
              this.removeDataContextObserver(iContext);
            }.bind(this));
            this.dependent = null;

            sc_super();
          },

          guaranteeDataContextObserver: function (iDataContext) {
            if (!iDataContext.hasObserverFor('changeCount', this, this.contextDataDidChange)) {
              iDataContext.addObserver('changeCount', this, this.contextDataDidChange);
            }
          },

          removeDataContextObserver: function (iDataContext) {
            iDataContext.removeObserver('changeCount', this, this.contextDataDidChange);
          },

          contextCountDidChange: function () {
            DG.currDocumentController().contexts.forEach(function (context) {
              this.guaranteeDataContextObserver(context);
            }.bind(this));
            this.dependent.incrementStateCount();
          },

          contextDataDidChange: function (iDataContext) {
            iDataContext.get('newChanges').forEach(function (iChange) {
              switch (iChange.operation) {
                  // case 'selectCases':
                  // case 'updateCases':
                  //   break;
                default:
                  this.dependent.incrementStateCount();
              }
            }.bind(this));
          }

        });

        return {
          changeListener: null,
          currEditField: null,

          getInitialState: function () {
            return {
              count: 0,
              attrIndex: 0
            };
          },

          componentDidMount: function () {
            this.changeListener = ChangeListener.create({
              dependent: this
            });
          },

          componentWillUnmount: function () {
            this.changeListener.destroy();
            this.changeListener = null;
          },

          incrementStateCount: function () {
            this.setState({count: this.state.count + 1});
          },

          /**
           * -------------------Drop functionality-------------------------------
           */
          /**
           *  ------------------Below here are rendering functions---------------
           */

          renderContext: function (iDataSetName, iIndex) {
            return div({key: 'cont-' + iIndex, className: 'react-data-card-header'},
                span({}, iDataSetName)
            );
          },

          renderCollection: function (iIndex, iCollClient, iCaseID) {
            var tCollection = iCollClient.get('collection'),
                tName = tCollection.get('name'),
                tNumCases = tCollection.get('cases').length,
                tNumSelected = iCollClient ?
                    iCollClient.getPath('casesController.selection').toArray().length : null,
                tCaseIndex = SC.none(iCaseID) ? null : tCollection.getCaseIndexByID(iCaseID) + 1,
                tHeaderString = tCaseIndex === null ?
                    (tNumSelected > 1 ?
                            'DG.CaseCard.namePlusSelectionCount'.loc(tName, tNumSelected, tNumCases) :
                            'DG.CaseCard.namePlusCaseCount'.loc(tName, tNumCases)
                    ) :
                    'DG.CaseCard.indexString'.loc(tName, tCaseIndex, tNumCases),
                tNavButtons = DG.React.Components.NavButtons({
                  collectionClient: iCollClient,
                  caseIndex: tCaseIndex,
                  numCases: tNumCases,
                  onPrevious: this.moveToPreviousCase,
                  onNext: this.moveToNextCase
                });
            return div({
                  key: 'coll-' + iIndex,
                  style: {'margin-left': iIndex * 10 + 'px'}
                },
                h2({}, tHeaderString),
                tNavButtons
            );
          },

          renderAttribute: function (iContext, iCollection, iCases, iAttr, iIndex) {
            var kThresholdDistance2 = 0, // pixels^2
                tMouseIsDown = false,
                tStartCoordinates,
                tDragInProgress = false,
                tDragHandler;

            function logit(iString) {
              // console.log( ++tIndex + ': ' + iString);
            }

            function isNotEmpty(iString) {
              return iString !== undefined && iString !== null && iString !== '';
            }

            /**
             * -------------------------Dragging this attribute----------------
             */
            function handleMouseDown(iEvent) {
              tMouseIsDown = true;
              tStartCoordinates = {x: iEvent.clientX, y: iEvent.clientY};
              tDragInProgress = false;
            }

            function handleMouseMove(iEvent) {
              if (!tStartCoordinates)
                return;
              if (!tDragInProgress) {
                handleDragStart(iEvent);
              }
              else {
                tDragHandler.handleDoDrag(iEvent.clientX - tStartCoordinates.x,
                    iEvent.clientY - tStartCoordinates.y,
                    iEvent.clientX, iEvent.clientY, iEvent);
              }
            }

            function handleMouseUp() {
              tMouseIsDown = false;
              tStartCoordinates = null;
              tDragInProgress = false;
              if (tDragHandler)
                tDragHandler.handleEndDrag();
              tDragHandler = null;
            }

            function handleMouseLeave(iEvent) {
              logit('in handleMouseLeave');
              if (tMouseIsDown && !tDragInProgress) {
                doDragStart(iEvent);
              }
            }

            function doDragStart(iEvent) {
              logit('In doDragStart');
              if (!tDragInProgress) {
                tDragHandler = DG.DragCaseCardItemHandler.create({
                  viewToAddTo: DG.mainPage.docView,
                  dataContext: iContext,
                  attribute: iAttr
                });
                tDragHandler.handleStartDrag(iEvent);
                tDragInProgress = true;
              }
            }

            function handleCellLeave(iEvent) {
              if (tDragInProgress)
                handleMouseMove(iEvent);
            }

            function handleDragStart(iEvent) {
              if (!tStartCoordinates)
                return;
              var tCurrent = {x: iEvent.clientX, y: iEvent.clientY},
                  tDistance = (tCurrent.x - tStartCoordinates.x) * (tCurrent.x - tStartCoordinates.x) +
                      (tCurrent.y - tStartCoordinates.y) * (tCurrent.y - tStartCoordinates.y);
              if (tMouseIsDown && tDistance > kThresholdDistance2) {
                doDragStart();
              }
            }

            /**
             * --------------------------Another attribute is dropped---------------
             */
            var handleDrop = function( iMoveDirection) {
              var tDroppedAttr = this.props.dragStatus.dragObject.data.attribute;
              console.log('handleDrop of %@ on %@-%@ %@'.fmt(
                  tDroppedAttr.get('name'), iIndex, iAttr.get('name'), iMoveDirection));
              var tPosition = iIndex + (iMoveDirection === 'up' ? 0 : 1),
                  tChange = {
                    operation: 'moveAttribute',
                    attr: tDroppedAttr,
                    toCollection: iCollection,
                    fromCollection: tDroppedAttr.get('collection'),
                    // subtract one for index column, which doesn't correspond to an attribute
                    position: tPosition
                  };
              iContext.applyChange(tChange);
            }.bind( this);

            /**
             * --------------------------Handling editing the value-----------------
             */
            var toggleEditing = function (iValueField) {
              var stashValue = function () {
                if (this.currEditField.props.value !== this.currEditField.state.value) {
                  var tCase = this.currEditField.props.case,
                      tAttrID = this.currEditField.props.attrID,
                      tValue = this.currEditField.state.value;
                  tCase.setValue(tAttrID, tValue);
                }
              }.bind(this);

              if (this.currEditField !== iValueField) {
                iValueField.setState({editing: true});
                if (this.currEditField) {
                  stashValue();
                  this.currEditField.setState({editing: false});
                }
                this.currEditField = iValueField;
              }
              else {  // Turn off editing
                stashValue();
                iValueField.setState({editing: false});
                this.currEditField = null;
              }
            }.bind(this);

            /**
             * --------------------------Body of renderAttribute-----------------
             */
            var tDescription = iAttr.get('description') || '',
                tAttrID = iAttr.get('id'),
                tUnit = iAttr.get('unit') || '',
                tUnitWithParens = '',
                tFormula = iAttr.get('formula'),
                tSummarize = iCases.length > 1,
                tCase = tSummarize ? null : iCases[0],
                tValue = tSummarize ? '' : tCase.getValue(tAttrID);
            this.state.attrIndex++;
            if (isNotEmpty(tUnit))
              tUnitWithParens = ' (' + tUnit + ')';
            if (DG.isNumeric(tValue)) {
              var tPrecision = iAttr.get('precision');
              tPrecision = SC.none(tPrecision) ? 2 : tPrecision;
              tValue = DG.MathUtilities.formatNumber(tValue, tPrecision);
            }
            else if (typeof tValue === 'object') {
              tValue = '';
            }
            tFormula = isNotEmpty(tFormula) ? ((isNotEmpty(tDescription) || isNotEmpty(tUnit)) ? '\n' : '')
                + tFormula : '';
            var tSpan = span({
                  className: 'react-data-card-attribute',
                  title: tDescription + tUnitWithParens + tFormula,
                  onMouseDown: handleMouseDown,
                  onMouseUp: handleMouseUp,
                  onMouseLeave: handleMouseLeave,
                  onMouseMove: handleMouseMove
                }, iAttr.get('name')),
                tCell = DG.React.Components.AttributeNameCell({
                  content: tSpan,
                  dragStatus: this.props.dragStatus,
                  dropCallback: handleDrop,
                  cellLeaveCallback: handleCellLeave
                }),
                tValueField = tSummarize ?
                    DG.React.Components.AttributeSummary({
                      cases: iCases,
                      attrID: tAttrID,
                      unit: tUnit
                    }) :
                    DG.React.Components.TextInput({
                      value: tValue,
                      attrID: tAttrID,
                      case: tCase,
                      unit: tUnit,
                      onToggleEditing: toggleEditing
                    });
            return tr({
              key: 'attr-' + iIndex
            }, tCell, tValueField);
          },

          /**
           *
           * @param iCollectionClient {DG.CollectionClient}
           * @param iCaseIndex { Number} zero-based
           */
          moveToCase: function (iCollectionClient, iCaseIndex) {
            var tCase = iCollectionClient.getCaseAt(iCaseIndex),
                tChange = {
                  operation: 'selectCases',
                  collection: iCollectionClient,
                  cases: [tCase],
                  select: true,
                  extend: false
                };
            SC.run(function () {
              this.props.context.applyChange(tChange);
            }.bind(this));
          },

          /**
           *
           * @param iCollectionClient
           * @param iCaseIndex  {
           */
          moveToPreviousCase: function (iCollectionClient, iCaseIndex) {
            if (SC.none(iCaseIndex) || iCaseIndex > 1) {
              var tNumCases = iCollectionClient.getPath('collection.cases').length,
                  tPrevIndex = SC.none(iCaseIndex) ? tNumCases - 1 : iCaseIndex - 2; // because we need zero-based
              this.moveToCase(iCollectionClient, tPrevIndex);
            }
          },

          moveToNextCase: function (iCollectionClient, iCaseIndex) {
            var tNumCases = iCollectionClient.getPath('collection.cases').length;
            if (SC.none(iCaseIndex) || iCaseIndex < tNumCases) {
              var tNext = SC.none(iCaseIndex) ? 0 : iCaseIndex; // because in zero-based this is the index of the next case
              this.moveToCase(iCollectionClient, tNext);
            }
          },

          render: function () {
            var tCardEntries = [], tCollEntries = [],
                tContext = this.props.context;
            tContext.get('collections').forEach(function (iCollection, iCollIndex) {
              var tCollClient = tContext.getCollectionByID(iCollection.get('id')),
                  tSelectedCases = tCollClient ? tCollClient.getPath('casesController.selection').toArray() : null,
                  // tCases = iCollection.get('cases'),
                  tSelLength = tSelectedCases ? tSelectedCases.length : 0,
                  tCase = tSelLength === 1 ? tSelectedCases[0] : null,
                  tCases = tSelLength > 0 ? tSelectedCases : iCollection.get('cases'),
                  tAttrEntries = [];

              tCollEntries.push(this.renderCollection(iCollIndex, tCollClient, tCase && tCase.get('id')));

              iCollection.get('attrs').forEach(function (iAttr, iAttrIndex) {
                tAttrEntries.push(this.renderAttribute(tContext, iCollection, tCases, iAttr, iAttrIndex));
              }.bind(this));
              tCollEntries.push(table({
                style: {'margin-left': (iCollIndex + 1) * 10 + 'px'}
              }, tbody({}, tAttrEntries)));
            }.bind(this));
            tCardEntries.push(tCollEntries);

            return div({className: 'react-data-card'}, tCardEntries);
          }
        };
      })(), []);

});
