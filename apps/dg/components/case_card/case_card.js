/* global React */
// sc_require('react/dg-react');
sc_require('components/case_card/text_input');

DG.React.ready(function () {
  var div = React.DOM.div,
      span = React.DOM.span, //,
      table = React.DOM.table,
      tbody = React.DOM.tbody,
      tr = React.DOM.tr,
      td = React.DOM.td //,
      // input = React.DOM.input
  ;

  DG.React.Components.CaseCard = DG.React.createComponent(
      (function () {

        var ChangeListener = SC.Object.extend({
          dependent: null,
          context: null,

          init: function () {
            sc_super();

            this.guaranteeDataContextObserver(this.context);

          },

          destroy: function () {
            this.removeDataContextObserver(this.context);
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
              dependent: this,
              context: this.props.context
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

            var handleDropInCollectionHeader = function (iAttribute) {
              var tCollection = iCollClient.get('collection'),
                  tParentCollection = tCollection.get('parent'),
                  tCmd = DG.DataContextUtilities.createCollectionCommand(
                      iAttribute, tCollection, this.props.context, tParentCollection);
              DG.UndoHistory.execute(tCmd);
            }.bind(this);

            return DG.React.Components.CollectionHeader({
              index: iIndex,
              collClient: iCollClient,
              caseID: iCaseID,
              onNext: this.moveToNextCase,
              onPrevious: this.moveToPreviousCase,
              dragStatus: this.props.dragStatus,
              dropCallback: handleDropInCollectionHeader
            });
          },

          renderAttribute: function (iContext, iCollection, iCases,
                                     iAttr, iIndex, iShouldSummarize, iChildmostSelected) {
            var kThresholdDistance2 = 0, // pixels^2
                tMouseIsDown = false,
                tStartCoordinates,
                tDragInProgress = false,
                tDragHandler,
                tIndex = 0;

            function logit(iString) {
              console.log(++tIndex + ': ' + iString);
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
              logit('In doDragStart with tDragInProgress = ' + tDragInProgress);
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
              var tDroppedAttr = this.props.dragStatus.dragObject.data.attribute,
                  tPosition = iIndex + (iMoveDirection === 'up' ? 0 : 1),
                  tFromCollection = tDroppedAttr.get('collection');
              // If we're not actually moving the attribute, bail now
              if (iCollection === tFromCollection &&
                  tPosition === tFromCollection.get('attrs').indexOf(tDroppedAttr))
                return;

              var tChange = {
                operation: 'moveAttribute',
                attr: tDroppedAttr,
                toCollection: iCollection,
                fromCollection: tFromCollection,
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
              if (this.currEditField !== iValueField) {
                iValueField.setState({editing: true});
                if (this.currEditField) {
                  DG.DataContextUtilities.stashAttributeValue( iContext, iCases [0], iAttr, this.currEditField.state.value);
                  this.currEditField.setState({editing: false});
                }
                this.currEditField = iValueField;
              }
              else {  // Turn off editing
                DG.DataContextUtilities.stashAttributeValue( iContext, iCases[0], iAttr, this.currEditField.state.value);
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
                  DG.DataContextUtilities.deleteAttribute(iContext, iAttr.get('id'));
                }.bind(this),

                attributeIsEditable = function () {
                  return iAttr.get('editable');
                },

                attributeCanBeRandomized = function () {
                  return DG.DataContextUtilities.attributeCanBeRandomized(iContext, iAttr.get('id'));
                },

                rerandomizeAttribute = function () {
                  DG.DataContextUtilities.randomizeAttribute(iContext, iAttr.get('id'));
                };

            /**
             * --------------------------Body of renderAttribute-----------------
             */
            var tDescription = iAttr.get('description') || '',
                tAttrID = iAttr.get('id'),
                tUnit = iAttr.get('unit') || '',
                tUnitWithParens = '',
                tHasFormula = iAttr.get('hasFormula'),
                tFormula = iAttr.get('formula'),
                tCase = iShouldSummarize ? null : iChildmostSelected[0] || iCases[0],
                tValue = iShouldSummarize ? '' : tCase && tCase.getValue(tAttrID);
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
                  attributeIsEditableCallback: attributeIsEditable,
                  attributeCanBeRandomizedCallback: attributeCanBeRandomized,
                  rerandomizeCallback: rerandomizeAttribute,
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
                    }),
                tValueClassName = tHasFormula ? 'react-data-card-formula' : '';
            return tr({
              key: 'attr-' + iIndex
            }, tCell, td({className: tValueClassName}, tValueField));
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

            function getChildmostSelection(iContext) {
              var tChildmostSel,
                  tCollections = iContext.get('collections'),
                  tCurrColl = tCollections[0],
                  tCurrIndex = 0;
              while (tCurrColl) {
                var tSelectedCases = iContext.getCollectionByID(tCurrColl.get('id')).getPath('casesController.selection').toArray(),
                    tNumSelected = tSelectedCases.length;
                if (tNumSelected > 0) {
                  tChildmostSel = tSelectedCases;
                  tCurrColl = tCollections[++tCurrIndex];
                }
                else if (tNumSelected === 0) {
                  tCurrColl = tCollections[++tCurrIndex];
                }
              }
              return tChildmostSel;
            }

            var tCollEntries = [],
                tContext = this.props.context,
                tChildmostSelection = getChildmostSelection(tContext);
            // collection loop
            tContext.get('collections').forEach(function (iCollection, iCollIndex) {

                  function getDescendantsOfCaseInCollection(iCase, iTargetColl) {
                    var tChildren = iCase.get('children');
                    if (tChildren && tChildren.length > 0) {
                      if (tChildren[0].get('collection') === iTargetColl) {
                        return tChildren;
                      } else {
                        var tResult = [];
                        tChildren.forEach(function (iChild) {
                          tResult = tResult.concat(getDescendantsOfCaseInCollection(iChild, iTargetColl));
                        });
                        return tResult;
                      }
                    }
                    return [];
                  }

                  function getParentsOfChildmostSelection() {
                    var tParents = [],
                        tCollOfChildMostSelection = tChildmostSelection && tChildmostSelection[0].get('collection');
                    if (tChildmostSelection &&
                        tChildmostSelection[0].get('collection').isDescendantOf(iCollection)) {
                      iCollection.get('cases').forEach(function (iCase) {
                        // Which of my cases have descendants in tChildmostSelection?
                        var tCandidates = getDescendantsOfCaseInCollection(iCase, tCollOfChildMostSelection);
                        if (tCandidates.some(function (iCandidate) {
                          return tChildmostSelection.indexOf(iCandidate) >= 0;
                        })) {
                          tParents.push(iCase);
                        }
                      });
                    }
                    return tParents;
                  }

                  var tCollClient = tContext.getCollectionByID(iCollection.get('id')),
                      tSelectedCases = tCollClient ? tCollClient.getPath('casesController.selection').toArray() : null,
                      tSelLength = tSelectedCases ? tSelectedCases.length : 0,
                      tCase = tSelLength === 1 ? tSelectedCases[0] : null,
                      tCases = tSelLength > 0 ? tSelectedCases :
                          (tChildmostSelection ? getParentsOfChildmostSelection() : iCollection.get('cases')),
                      tShouldSummarize = SC.none( tCase),
                      tAttrEntries = [],
                      tCollectionHeader = this.renderCollectionHeader(iCollIndex, tCollClient, tCase && tCase.get('id'));

                  iCollection.get('attrs').forEach(function (iAttr, iAttrIndex) {
                    tAttrEntries.push(this.renderAttribute(tContext, iCollection, tCases,
                        iAttr, iAttrIndex, tShouldSummarize, tChildmostSelection));
                  }.bind(this));
                  tCollEntries.push(table({
                        key: 'table-' + iCollIndex
                        // style: {'marginLeft': (iCollIndex * 10 + 5) + 'px'}
                      },
                      tbody({},
                          tCollectionHeader, tAttrEntries)));
                }

                    .bind(this)
            );
            return div({className: 'react-data-card'}, tCollEntries);
          }
        };
      })(), []);

});
