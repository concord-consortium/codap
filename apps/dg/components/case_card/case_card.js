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
      // h2 = React.DOM.h2,
      table = React.DOM.table,
      tbody = React.DOM.tbody,
      th = React.DOM.th,
      tr = React.DOM.tr,
      td = React.DOM.td //,
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
           *  ------------------Below here are rendering functions---------------
           */

          renderCollectionHeader: function (iIndex, iCollClient, iCaseID) {

            var toggleEditing = function () {

            }.bind(this);

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
                }),
                tHeaderComponent = DG.React.Components.TextInput({
                  value: tHeaderString,
                  onToggleEditing: toggleEditing
                });
            return tr({
                  key: 'coll-' + iIndex,
                  className: 'react-data-card-collection-header'
                },
                th({
                  style: {'paddingLeft': (iIndex * 10 + 5) + 'px'},
                  className: 'react-data-card-coll-header-cell'
                }, tHeaderComponent),
                td({
                  className: 'react-data-card-nav-header-cell'
                }, tNavButtons)
            );
          },

          renderAttribute: function (iContext, iCollection, iCases,
                                     iAttr, iIndex, iShouldSummarize, iChildmostSelected) {
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

            function handleTouchStart(iEvent) {
              iEvent.preventDefault();
              handleMouseDown(iEvent.touches[0]);
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

            function handleTouchMove(iEvent) {
              iEvent.preventDefault();
              handleMouseMove(iEvent.touches[0]);
            }

            function handleMouseUp() {
              tMouseIsDown = false;
              tStartCoordinates = null;
              tDragInProgress = false;
              if (tDragHandler)
                tDragHandler.handleEndDrag();
              tDragHandler = null;
            }

            function handleTouchEnd(iEvent) {
              iEvent.preventDefault();
              handleMouseUp();
            }

            function handleTouchCancel(iEvent) {
              iEvent.preventDefault();
            }

            function handleMouseLeave(iEvent) {
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
            var handleDrop = function (iMoveDirection) {
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
              // Apply the change, but not as part of the current render
              iContext.invokeLater(function () {
                iContext.applyChange(tChange);
              });
            }.bind(this);

            /**
             * --------------------------Handling editing the value-----------------
             */
            var toggleEditing = function (iValueField) {
              /**
               * Apply the edited value, by storing it in the DG data context.
               * Here we override the standard TextEditor.applyValue() method
               * Because the default editor modifies our row data, instead
               * of allowing the adapter to do it.  With this override we
               * don't need to handle the "onCellChanged" event.
               * @param item {DG.Case}
               * @param state {String} -- the edited string value
               */
              var stashValue = function () {
                var tCase = iCases[0],
                    tValue = this.currEditField.state.value,
                    tAttrID = iAttr.get('id'),
                    originalValue = tCase.getStrValue(tAttrID),
                    newValue = DG.DataUtilities.canonicalizeInputValue(tValue),
                    contextName = iContext.get('name'),
                    collection = tCase.get('collection'),
                    collectionName = collection && collection.get('name') || "",
                    attr = collection && collection.getAttributeByID(tAttrID),
                    attrName = attr && attr.get('name'),
                    caseIndex = collection.getCaseIndexByID(tCase.get('id'));

                function applyEditChange(attrID, iValue, isUndoRedo) {
                  SC.run(function () {
                    iContext.applyChange({
                      operation: 'updateCases',
                      cases: [tCase],
                      attributeIDs: [attrID],
                      values: [[iValue]]
                    });
                  });
                }

                var cmd = DG.Command.create({
                  name: 'caseTable.editCellValue',
                  undoString: 'DG.Undo.caseTable.editCellValue',
                  redoString: 'DG.Redo.caseTable.editCellValue',
                  log: "editValue: { collection: %@, case: %@, attribute: '%@', old: '%@', new: '%@' }"
                      .fmt(collectionName, caseIndex + 1, tAttrID, originalValue, newValue),
                  causedChange: true,
                  execute: function () {
                    applyEditChange(tAttrID, newValue);
                  },
                  undo: function () {
                    applyEditChange(tAttrID, originalValue, true);
                  },
                  redo: function () {
                    iContext = DG.currDocumentController().getContextByName(contextName);
                    collection = iContext && iContext.getCollectionByName(collectionName);
                    attr = collection && collection.getAttributeByName(attrName);
                    tAttrID = attr.get('id');
                    var cases = collection && collection.get('casesController');
                    tCase = cases && cases.objectAt(caseIndex);
                    if (tCase)
                      applyEditChange(tAttrID, newValue, true);
                  }
                });
                DG.UndoHistory.execute(cmd);
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
             * ---------------------------Handlers for dropdown menu------------
             */

            var editAttribute = function () {

                  this.updateAttribute = function (iAttrRef, iChangedAttrProps) {
                    DG.DataContextUtilities.updateAttribute(iContext, iCollection,
                        iAttrRef.attribute, iChangedAttrProps);
                  };

                  var attributePane = DG.AttributeEditorView.create({attrRef: {attribute: iAttr}, attrUpdater: this});
                  attributePane.append();
                }.bind(this),

                editFormula = function () {
                  DG.DataContextUtilities.editAttributeFormula(iContext, iCollection,
                      iAttr.get('name'), iAttr.get('formula'));
                }.bind(this),

                deleteAttribute = function () {
                  DG.DataContextUtilities.deleteAttribute(iContext, iCollection,
                      iAttr.get('name'), iAttr.get('formula'));
                }.bind(this);

            /**
             * --------------------------Body of renderAttribute-----------------
             */
            var tDescription = iAttr.get('description') || '',
                tAttrID = iAttr.get('id'),
                tUnit = iAttr.get('unit') || '',
                tUnitWithParens = '',
                tFormula = iAttr.get('formula'),
                tCase = iShouldSummarize ? null : iChildmostSelected || iCases[0],
                tValue = iShouldSummarize ? '' : tCase.getValue(tAttrID);
            this.state.attrIndex++;
            if (isNotEmpty(tUnit))
              tUnitWithParens = ' (' + tUnit + ')';
            if (DG.isNumeric(tValue)) {
              var tPrecision = iAttr.get('precision');
              tPrecision = SC.none(tPrecision) ? 2 : tPrecision;
              tValue = DG.MathUtilities.formatNumber(tValue, tPrecision);
            }
            else if (SC.none(tValue) || (typeof tValue === 'object')) {
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
                  onMouseMove: handleMouseMove,
                  onTouchStart: handleTouchStart,
                  onTouchMove: handleTouchMove,
                  onTouchEnd: handleTouchEnd,
                  onTouchCancel: handleTouchCancel
                }, iAttr.get('name')),
                tCell = DG.React.Components.AttributeNameCell({
                  content: tSpan,
                  dragStatus: this.props.dragStatus,
                  dropCallback: handleDrop,
                  editAttributeCallback: editAttribute,
                  editFormulaCallback: editFormula,
                  deleteAttributeCallback: deleteAttribute,
                  cellLeaveCallback: handleCellLeave
                }),
                tValueField = iShouldSummarize ?
                    DG.React.Components.AttributeSummary({
                      cases: iCases,
                      attrID: tAttrID,
                      unit: tUnit
                    }) :
                    DG.React.Components.TextInput({
                      value: tValue,
                      unit: tUnit,
                      onToggleEditing: toggleEditing
                    });
            return tr({
              key: 'attr-' + iIndex
            }, tCell, td({}, tValueField));
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

            function childmostSingleSelection(iContext) {
              var tSingleton,
                  tCollections = iContext.get('collections'),
                  tCurrColl = tCollections[0],
                  tCurrIndex = 0;
              while (tCurrColl) {
                var tSelectedCases = iContext.getCollectionByID(tCurrColl.get('id')).getPath('casesController.selection').toArray(),
                    tNumSelected = tSelectedCases.length;
                if (tNumSelected === 1) {
                  tSingleton = tSelectedCases[0];
                  tCurrColl = tCollections[++tCurrIndex];
                }
                else if (tNumSelected === 0) {
                  tCurrColl = tCollections[++tCurrIndex];
                }
                else {  // tNumSelected > 1
                  tCurrColl = null;
                }
              }
              return tSingleton;
            }

            var tCardEntries = [], tCollEntries = [],
                tContext = this.props.context,
                tChildmostSingletonSelection = childmostSingleSelection(tContext);
            tContext.get('collections').forEach(function (iCollection, iCollIndex) {

              function shouldSummarize() {
                var tShould = (tCases.length > 1) &&
                    (!tChildmostSingletonSelection ||
                        !tChildmostSingletonSelection.get('collection').isDescendantOf(iCollection));
                return tShould;
              }

              var tCollClient = tContext.getCollectionByID(iCollection.get('id')),
                  tSelectedCases = tCollClient ? tCollClient.getPath('casesController.selection').toArray() : null,
                  tSelLength = tSelectedCases ? tSelectedCases.length : 0,
                  tCase = tSelLength === 1 ? tSelectedCases[0] : null,
                  tCases = tSelLength > 0 ? tSelectedCases : iCollection.get('cases'),
                  tShouldSummarize = shouldSummarize(),
                  tAttrEntries = [],
                  tCollectionHeader = this.renderCollectionHeader(iCollIndex, tCollClient, tCase && tCase.get('id'));

              iCollection.get('attrs').forEach(function (iAttr, iAttrIndex) {
                tAttrEntries.push(this.renderAttribute(tContext, iCollection, tCases,
                    iAttr, iAttrIndex, tShouldSummarize, tChildmostSingletonSelection));
              }.bind(this));
              tCollEntries.push(table({
                    // style: {'marginLeft': (iCollIndex * 10 + 5) + 'px'}
                  },
                  tbody({},
                      tCollectionHeader, tAttrEntries)));
            }.bind(this));
            tCardEntries.push(tCollEntries);
            return div({className: 'react-data-card'}, tCardEntries);
          }
        };
      })(), []);

});
