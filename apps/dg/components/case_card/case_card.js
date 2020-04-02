sc_require('components/case_card/case_card_collection');
sc_require('components/case_card/column_resize_handle');
sc_require('components/case_card/text_input');
sc_require('react/dg-react');
/* global PropTypes, ReactDOMFactories */

DG.React.ready(function () {
  var div = ReactDOMFactories.div,
      table = ReactDOMFactories.table,
      tbody = ReactDOMFactories.tbody,
      tr = ReactDOMFactories.tr;

  DG.React.Components.CaseCard = DG.React.createComponent(
      (function () {

        var kSelectDelay = 1000,  // ms
            kSelectInterval = 100,  // ms
            gWaitingForSelect = false,
            gTimeOfLastSelectCall,  // time
            gSelectTimer, // SC.Timer
            gMoveArrowClickInProgress = false,
            // leave some room for collection name (left) and navigation buttons (right)
            kMinColumnWidth = 82;

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
            var this_ = this;

            function doIncrement() {
              if( this_.dependent)
                this_.dependent.incrementStateCount();
            }

            function checkTime() {
              var tNow = Date.now();
              if( tNow - gTimeOfLastSelectCall > kSelectDelay) {
                doIncrement();
                gWaitingForSelect = false;
                gSelectTimer.invalidate();
                gSelectTimer = null;
              }
              else {
                gSelectTimer = SC.Timer.schedule({target: this, action: checkTime, interval: kSelectInterval});
              }
            }

            function respondToSelectCases() {
              if( gMoveArrowClickInProgress) {
                gMoveArrowClickInProgress = false;
                doIncrement();
              }
              else {
                gTimeOfLastSelectCall = Date.now();
                if (!gWaitingForSelect) {
                  gWaitingForSelect = true;
                  gSelectTimer = SC.Timer.schedule({target: this, action: checkTime, interval: kSelectInterval});
                }
              }
            }

            function selectNewCases(iCaseIDs) {
              var tCases = iCaseIDs.map( function( iID) {
                return iDataContext.getCaseByID( iID);
              });
              iDataContext.doSelectCases( {
                operation: 'selectCases',
                cases: tCases,
                select: true
              });
            }

            iDataContext.get('newChanges').forEach(function (iChange) {
              switch (iChange.operation) {
                  case 'selectCases':
                    respondToSelectCases();
                    break;
                  case 'createCases':
                    selectNewCases(iChange.result.caseIDs);
                    doIncrement();
                    break;
                default:
                  doIncrement();
              }
            }.bind(this));
          }

        });

        return {
          changeListener: null,
          caseCardElt: null,
          currEditField: null,

          getInitialState: function () {
            return {
              count: 0,
              attrIdOfNameToEdit: null,
              attrIdOfValueToEdit: null,
              containerWidth: null,
              columnWidths: {}
            };
          },

          componentDidMount: function () {
            this.changeListener = ChangeListener.create({
              dependent: this,
              context: this.props.context
            });
            this.componentDidRender();
          },

          componentWillUnmount: function () {
            this.changeListener.destroy();
            this.changeListener = null;
          },

          componentDidUpdate: function () {
            this.componentDidRender();
          },

          componentDidRender: function () {
            var containerBounds = this.caseCardElt && this.caseCardElt.getBoundingClientRect(),
                containerWidth = containerBounds && containerBounds.width;
            if (containerWidth !== this.state.containerWidth) {
              this.setState({ containerWidth: containerWidth });
            }
          },

          updateColumnWidth: function (collection, width) {
            // attempt to maintain minimum column width
            var adjustedWidth = null;
            if ((width < kMinColumnWidth) && (this.state.containerWidth >= 2 * kMinColumnWidth)) {
              adjustedWidth = kMinColumnWidth;
            }
            if ((this.state.containerWidth - width < kMinColumnWidth) &&
                (this.state.containerWidth > kMinColumnWidth + 20)) {
              adjustedWidth = this.state.containerWidth - kMinColumnWidth;
            }

            width = adjustedWidth || width;
            if (width !== this.state.columnWidths[collection]) {
              if (adjustedWidth && this.props.onResizeColumn)
                this.props.onResizeColumn(collection, adjustedWidth / this.state.containerWidth);
              this.setState(function(state) {
                if (width)
                  state.columnWidths[collection] = width;
                else
                  delete state.columnWidths[collection];
              });
            }
          },

          incrementStateCount: function () {
            this.setState({count: this.state.count + 1});
          },

          stashEditValueInCaseAttributeValue: function() {
            if (this.currEditField) {
              DG.DataContextUtilities.stashAttributeValue( this.props.context, this.currEditField.props['case'],
                  this.currEditField.props.attr, this.currEditField.state.value);
              this.currEditField = null;
              this.setState({ attrIdOfValueToEdit: null });
            }
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
              onCollectionNameChange: function(iOldName, iNewName) {
                SC.run(function() {
                  DG.CaseDisplayUtils
                    .setCollectionNameWithCommand(this.props.context, iOldName, iNewName);
                }.bind(this));
              }.bind(this),
              onNext: this.moveToNextCase,
              onPrevious: this.moveToPreviousCase,
              onNewCase: this.newCase,
              dragStatus: this.props.dragStatus,
              dropCallback: handleDropInCollectionHeader
            });
          },

          renderAttribute: function (iContext, iCollection, iCases,
                                     iAttr, iAttrIndex, iShouldSummarize, iChildmostSelected) {
            var kThresholdDistance2 = 0, // pixels^2
                tMouseIsDown = false,
                tStartCoordinates,
                tDragInProgress = false,
                tDragHandler;

            /**
             * -------------------------Dragging this attribute----------------
             */
            function handleMouseDown(iEvent) {
              if ((iEvent.type === 'mousedown') && (iEvent.button !== 0)) return;
              tMouseIsDown = true;
              tStartCoordinates = {x: iEvent.clientX, y: iEvent.clientY};
              tDragInProgress = false;
            }

            function handleTouchStart(iEvent) {
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
              handleMouseUp();
            }

            function handleTouchCancel(iEvent) {
              iEvent.preventDefault();
            }

            function handleMouseLeave(iEvent) {
              if (tMouseIsDown) {
                if (!tDragInProgress) {
                  doDragStart(iEvent);
                }
                if (tDragHandler) {
                  tDragHandler.handleDoDrag(iEvent.clientX - tStartCoordinates.x,
                    iEvent.clientY - tStartCoordinates.y,
                    iEvent.clientX, iEvent.clientY, iEvent);
                }
              }
            }

            function doDragStart(iEvent) {
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
                  tPosition = iAttrIndex + (iMoveDirection === 'up' ? 0 : 1),
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
            var toggleEditing = function (iValueField, iMoveDirection ) {
              var tAttrs = iCollection.get('attrs'),
                  tEditFieldOnEntry = this.currEditField;

              function isEditableIndex(index) {
                var attr;
                return (index >= 0) && (index < tAttrs.length) &&
                        (attr = tAttrs[index]) && attr.get('editable') && !attr.hasFormula();
              }

              this.stashEditValueInCaseAttributeValue();
              if (tEditFieldOnEntry !== iValueField) {
                this.currEditField = iValueField;
                this.setState({ attrIdOfValueToEdit: iAttr.get('id') });
              }
              else if( iMoveDirection) {  // Turn off editing
                var tIncrement,
                    tIndexToMount = iAttrIndex;

                switch (iMoveDirection) {
                  case 'up':
                    tIncrement = -1;
                    break;
                  case 'down':
                    tIncrement = 1;
                    break;
                }
                tIndexToMount += tIncrement;
                while ((tIndexToMount >= 0) && (tIndexToMount < tAttrs.length) && !isEditableIndex(tIndexToMount)) {
                  tIndexToMount += tIncrement;
                }
                if (isEditableIndex(tIndexToMount))
                  this.setState({ attrIdOfValueToEdit: tAttrs[tIndexToMount].get('id') });
              }
            }.bind(this);

            var escapeEditing = function (iValueField) {
              this.currEditField = null;
              this.setState({ attrIdOfValueToEdit: null });
            }.bind(this);

            var editModeCallback = function( iValueField) {
              this.currEditField = iValueField;
            }.bind(this);

            /**
             * ---------------------------Handlers for dropdown menu------------
             */

            var updateAttribute = function(iChangedAttrProps) {
                  DG.DataContextUtilities.updateAttribute(iContext, iCollection, iAttr, iChangedAttrProps);
                },
                renameAttribute = function(iNewName) {
                  var currName = iAttr.get('name'),
                      currUnit = iAttr.get('unit'),
                      newName = iContext.getUniqueAttributeName(iNewName, [currName]),
                      newUnit = DG.Attribute.extractUnitFromNameString(iNewName);
                  if ((newName !== currName) || (newUnit !== currUnit)) {
                    updateAttribute({ name: newName, unit: newUnit });
                  }
                }.bind(this),
                editAttribute = function () {
                  this.updateAttribute = function(iAttrRef, iChangedAttrProps) {
                    updateAttribute(iChangedAttrProps);
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

                formulaIsEditable = function () {
                  return iAttr.get('editable');
                },

                attributeCanBeRandomized = function () {
                  return DG.DataContextUtilities.attributeCanBeRandomized(iContext, iAttr.get('id'));
                },

                rerandomizeAttribute = function () {
                  DG.DataContextUtilities.randomizeAttribute(iContext, iAttr.get('id'));
                },

                isNewAttributeEnabled = function () {
                  var isTopLevel = !iCollection.get('parent');
                  return !(isTopLevel && DG.DataContextUtilities.isTopLevelReorgPrevented(iContext));
                },

                makeNewAttribute = function() {
                  var collection = iContext.getCollectionByID(iCollection.get('id')),
                      position = 1, // Just after the first attribute
                      onComplete = function(attrName) {
                                    var attrRef = iContext.getAttrRefByName(attrName),
                                        attrID = attrRef && attrRef.attribute.get('id');
                                    attrID && this.setState({ attrIdOfNameToEdit: attrID });
                                  }.bind(this);
                  DG.DataContextUtilities.newAttribute(iContext, collection, position, onComplete);
                }.bind(this);

            /**
             * --------------------------Body of renderAttribute-----------------
             */
            var tCollectionName = iCollection.get('name'),
                tAttrID = iAttr.get('id'),
                tCase = iShouldSummarize ? null : (iChildmostSelected && iChildmostSelected[0]) || iCases[0],
                tDiv = div({
                  className: 'react-data-card-attribute',
                  title: DG.CaseDisplayUtils.getTooltipForAttribute(iAttr),
                  onMouseDown: handleMouseDown,
                  onMouseUp: handleMouseUp,
                  onMouseLeave: handleMouseLeave,
                  onMouseMove: handleMouseMove,
                  onTouchStart: handleTouchStart,
                  onTouchMove: handleTouchMove,
                  onTouchEnd: handleTouchEnd,
                  onTouchCancel: handleTouchCancel
                }, iAttr.get('name')),
                tNameCell = DG.React.AttributeNameCell({
                  content: tDiv,
                  attribute: iAttr,
                  showNewAttrButton: (iAttrIndex === 0) && (tAttrID !== this.state.attrIdOfNameToEdit),
                  isEditing: tAttrID === this.state.attrIdOfNameToEdit,
                  dragStatus: this.props.dragStatus,
                  dropCallback: handleDrop,
                  onBeginRenameAttribute: function() {
                    this.setState({ attrIdOfNameToEdit: tAttrID });
                  }.bind(this),
                  onEndRenameAttribute: function(iNewName) {
                    iNewName && renameAttribute(iNewName);
                    this.setState({ attrIdOfNameToEdit: null });
                  }.bind(this),
                  columnWidthPct: (iAttrIndex === 0) && this.props.columnWidthMap
                                    ? this.props.columnWidthMap[tCollectionName]
                                    : undefined,
                  onColumnWidthChanged: (iAttrIndex === 0) &&
                                        function(width) {
                                          this.updateColumnWidth(tCollectionName, width);
                                        }.bind(this),
                  editAttributeCallback: editAttribute,
                  editFormulaCallback: editFormula,
                  deleteAttributeCallback: deleteAttribute,
                  attributeIsEditableCallback: formulaIsEditable,
                  attributeCanBeRandomizedCallback: attributeCanBeRandomized,
                  rerandomizeCallback: rerandomizeAttribute,
                  newAttributeCallback: isNewAttributeEnabled() ? makeNewAttribute : null,
                  cellLeaveCallback: handleCellLeave
                }),
                tValueCell = DG.React.AttributeValueCell({
                  attribute: iAttr,
                  displayCase: tCase,
                  summaryCases: iShouldSummarize ? iCases : null,
                  editProps: {
                    isEditing: tAttrID === this.state.attrIdOfValueToEdit,
                    onToggleEditing: toggleEditing,
                    onEscapeEditing: escapeEditing,
                    editModeCallback: editModeCallback
                  }
                });

            return (
              tr({ key: 'attr-' + iAttrIndex, className: 'react-data-card-row' },
                tNameCell,
                tValueCell
              )
            );
          },

          /**
           *
           * @param iCollectionClient {DG.CollectionClient}
           * @param iCaseIndex { Number} zero-based
           */
          moveToCase: function (iCollectionClient, iCaseIndex) {
            gMoveArrowClickInProgress = true; // So we won't delay reflecting move
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
           * -------------------Get first child case of selected case-----------------
           */
          getSelectedCaseFirstChildCaseID: function (iCollection) {
              var tSelectedCaseFirstChildCaseID,
                  tContext = this.props.context;
              var tSelectedCases = tContext.getCollectionByID(iCollection.get('id')).getPath('casesController.selection').toArray();
              if (tSelectedCases.length) {
                tSelectedCaseFirstChildCaseID = tSelectedCases[0].get('children')[0].id;
              }
              return tSelectedCaseFirstChildCaseID;
          },

          getSelectedCaseIndices: function (iCollectionClient) {
            var tSelectedCases = iCollectionClient.getPath('casesController.selection').toArray(),
                tSortedSelection = tSelectedCases.map(function(iCase) {
                  return {
                    id: iCase.id,
                    index: iCollectionClient.getCaseIndexByID(iCase.id)
                  };
                });
            tSortedSelection.sort(function(a, b) {
              return a.index - b.index;
            });
            return tSortedSelection.map(function(iEntry) {
              return iEntry.index;
            });
          },

          /**
           *
           * @param iCollectionClient
           * @param iCaseIndex  {
           */
          moveToPreviousCase: function (iCollectionClient, iCaseIndex) {
            this.stashEditValueInCaseAttributeValue();

            var tPrevIndex = null;
            var tParentCollection = iCollectionClient.getPath('collection.parent');
            var tNumCases = iCollectionClient.getPath('collection.cases').length;
            if (SC.none(iCaseIndex)) {
              if (tParentCollection) {
                var tSelectedParentFirstCaseID = this.getSelectedCaseFirstChildCaseID(tParentCollection);
                if (tSelectedParentFirstCaseID) {
                  tPrevIndex = iCollectionClient.getCaseIndexByID(tSelectedParentFirstCaseID) - 1;
                  if (tPrevIndex < 0) {
                    tPrevIndex = tNumCases - 1;
                  }
                }
              }
              else {
                // get index of last selected case
                var tSelectedIndices = this.getSelectedCaseIndices(iCollectionClient);
                if (tSelectedIndices.length)
                  tPrevIndex = tSelectedIndices[tSelectedIndices.length - 1];
              }
            }
            if (SC.none(iCaseIndex) || iCaseIndex > 1) {
              if (SC.none(tPrevIndex)) {
                tPrevIndex = SC.none(iCaseIndex) ? tNumCases - 1 : iCaseIndex - 2; // because we need zero-based
              }
              this.moveToCase(iCollectionClient, tPrevIndex);
            }
          },

          moveToNextCase: function (iCollectionClient, iCaseIndex) {
            this.stashEditValueInCaseAttributeValue();

            var tParentCollection = iCollectionClient.getPath('collection.parent');
            if (SC.none(iCaseIndex)) {
              if (tParentCollection) {
                var tSelectedParentFirstCaseID = this.getSelectedCaseFirstChildCaseID(tParentCollection);
                if (tSelectedParentFirstCaseID) {
                  iCaseIndex = iCollectionClient.getCaseIndexByID(tSelectedParentFirstCaseID);
                }
              }
              else {
                // get index of first selected case
                var tSelectedIndices = this.getSelectedCaseIndices(iCollectionClient);
                if (tSelectedIndices.length)
                  iCaseIndex = tSelectedIndices[0];
              }
            }
            var tNumCases = iCollectionClient.getPath('collection.cases').length;
            if (SC.none(iCaseIndex) || iCaseIndex < tNumCases) {
              var tNext = SC.none(iCaseIndex) ? 0 : iCaseIndex; // because in zero-based this is the index of the next case
              this.moveToCase(iCollectionClient, tNext);
            }
          },

          newCase: function( iCollectionClient) {
            var tCollection = iCollectionClient.get('collection'),
                tContext = this.props.context,
                tAttrIDs = tCollection && tCollection.getAttributeIDs(),
                tParentCollectionClient = this.props.context.getCollectionByID( tCollection.getPath('parent.id')),
                tSelectedParentCases = tParentCollectionClient ?
                    tParentCollectionClient.getPath('casesController.selection').toArray() :
                    null,
                tNumSelected = tSelectedParentCases ? tSelectedParentCases.length : null,
                tParentCase = tNumSelected === 1 ? tSelectedParentCases[0] : null;
            SC.run(function () {
              DG.DataContextUtilities.createCaseUndoable(tContext,
                  {
                    collection: iCollectionClient,
                    parent: tParentCase,
                    attrIDs: tAttrIDs,
                    values: []
                  });
            });
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
                      tCollectionName = tCollClient.get('name'),
                      tSelectedCases = tCollClient ? tCollClient.getPath('casesController.selection').toArray() : null,
                      tSelLength = tSelectedCases ? tSelectedCases.length : 0,
                      tCases = tSelLength > 0 ? tSelectedCases :
                          (tChildmostSelection ? getParentsOfChildmostSelection() : iCollection.get('cases')),
                      tCasesLength = tCases ? tCases.length : 0,
                      tCase = tSelLength === 1 ? tSelectedCases[0] :
                          (tCasesLength === 1 ? tCases[0] : null),
                      tShouldSummarize = SC.none( tCase),
                      tCollectionHeader = this.renderCollectionHeader(iCollIndex, tCollClient, tCase && tCase.get('id')),
                      tColumnWidth = this.state.columnWidths[tCollectionName],
                      tAttrEntries = [],
                      tResizeHandle;

                  iCollection.get('attrs').forEach(function (iAttr, iAttrIndex) {
                    if (!iAttr.get('hidden')) {
                      tAttrEntries.push(
                          this.renderAttribute(tContext, iCollection, tCases,
                              iAttr, iAttrIndex, tShouldSummarize,
                              tChildmostSelection));
                    }
                  }.bind(this));

                  if (this.state.containerWidth && tColumnWidth) {
                    var kResizeHandleClass = "case-card-column-resize-handle";
                    tResizeHandle = DG.React.ColumnResizeHandle({
                                      className: kResizeHandleClass,
                                      key: kResizeHandleClass + iCollIndex + '-' + tCollectionName,
                                      enabled: true,
                                      containerWidth: this.state.containerWidth,
                                      columnWidth: tColumnWidth,
                                      minWidth: kMinColumnWidth,
                                      onResize: function(width, isComplete) {
                                        var widthPct = width / this.state.containerWidth;
                                        this.props.onResizeColumn &&
                                          this.props.onResizeColumn(tCollectionName, widthPct, isComplete);
                                      }.bind(this)
                                    });
                  }

                  tCollEntries.push(
                    div({ className: 'case-card-collection',
                          key: 'collection-' + iCollIndex + '-' + tCollectionName },
                      table({},
                        tbody({},
                          tCollectionHeader, tAttrEntries)
                      ),
                      tResizeHandle
                    )
                  );
                }.bind(this)
            );

            return div({
              className: 'react-data-card',
              ref: function(elt) { this.caseCardElt = elt; }.bind(this)
            }, tCollEntries);
          }
        };
      }()), []);

  DG.React.Components.CaseCard.propTypes = {
    // the data context
    context: PropTypes.instanceOf(DG.DataContext).isRequired,
    // drag/drop support
    dragStatus: PropTypes.object,
    // map from collection name => column width percentage (0-1)
    columnWidthMap: PropTypes.objectOf(PropTypes.number).isRequired,
    // function(collectionName, columnWidth) - update column width in model
    onResizeColumn: PropTypes.func.isRequired,
  };

});
