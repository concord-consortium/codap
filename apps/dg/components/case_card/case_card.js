sc_require('components/case_card/column_resize_handle');
sc_require('components/case_card/text_input');
sc_require('controllers/data_context');
sc_require('react/dg-react');
/* global createReactClass, createReactFactory, PropTypes, ReactDOMFactories, ReactSizeMe */

DG.React.ready(function () {
  var div = ReactDOMFactories.div,
      table = ReactDOMFactories.table,
      tbody = ReactDOMFactories.tbody,
      tr = ReactDOMFactories.tr;

  var CaseCard = createReactClass(
      (function () {

        var kSelectDelay = 200,  // ms
            kSelectInterval = 100,  // ms
            gWaitingForSelect = false,
            gTimeOfLastSelectCall,  // time
            gSelectTimer, // SC.Timer
            gMoveArrowClickInProgress = false,
            // leave some room for collection name (left) and navigation buttons (right)
            kMinColumnWidth = 82;

        var kThresholdDistance2 = 0, // pixels^2
            tTouchID,
            tTouchTimer,
            tPointerIsDown = false,
            tStartCoordinates,
            tDragInProgress = false,
            tDragHandler;

        var ChangeListener = SC.Object.extend({
          dependent: null,
          _context: null,
          context: function( iKey, iValue) {
            if( iValue && iValue !== this._context) {
              if( this._context) {
                this._context.removeObserver('changeCount', this, this.contextDataDidChange);
              }
              this.guaranteeDataContextObserver(iValue);
              this._context = iValue;
            }
            return this._context;
          }.property(),

          init: function () {
            sc_super();
          },

          destroy: function () {
            this.removeDataContextObserver(this.get('context'));
            this.dependent = null;

            sc_super();
          },

          guaranteeDataContextObserver: function (iDataContext) {
            if (!iDataContext.hasObserverFor('changeCount', this, this.contextDataDidChange)) {
              iDataContext.addObserver('changeCount', this, this.contextDataDidChange);
            }
          },

          removeDataContextObserver: function (iDataContext) {
            if( iDataContext)
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
          currEditField: null,

          getInitialState: function () {
            return {
              count: 0,
              attrIdOfNameToEdit: null,
              attrIdOfValueToEdit: null,
              // map: collection => measured widths of attribute columns
              columnWidths: {},
              // map: collection => virtual position of resize handle during active resizing
              resizeWidths: {}
            };
          },

          componentDidMount: function () {
            this.changeListener = ChangeListener.create({
              dependent: this
            });
            this.changeListener.set('context', this.props.context);
          },

          componentDidUpdate: function() {
            this.changeListener.set('context', this.props.context);
          },

          componentWillUnmount: function () {
            this.changeListener.destroy();
            this.changeListener = null;
          },

          handleColumnWidthChange: function (collection, width) {
            this.setState(function(state) {
              if (width)
                state.columnWidths[collection] = width;
              else
                delete state.columnWidths[collection];
              return state;
            });
          },

          handleUserResizeColumn: function (collectionName, iWidth, isComplete) {
            // attempt to maintain minimum column width
            var width = iWidth,
                containerWidth = this.props.size && this.props.size.width;
            if (containerWidth) {
              if ((width < kMinColumnWidth) && (containerWidth >= 2 * kMinColumnWidth)) {
                width = kMinColumnWidth;
              }
              if ((containerWidth - width < kMinColumnWidth) &&
                  (containerWidth > kMinColumnWidth + 20)) {
                width = containerWidth - kMinColumnWidth;
              }
            }
            this.setState(function(state) {
              var newState;
              if (!isComplete) {
                // store current width; presence indicates resize-in-progress
                if (width !== state.resizeWidths[collectionName]) {
                  state.resizeWidths[collectionName] = width;
                  newState = state;
                }
              }
              else {
                // remove width/resize-in-progress indicator once complete
                if (state.resizeWidths[collectionName] !== undefined) {
                  delete state.resizeWidths[collectionName];
                  newState = state;
                }

                // only notify parent once resize is complete
                var widthPct = width / containerWidth;
                this.props.onResizeColumn &&
                  this.props.onResizeColumn(collectionName, widthPct);
              }
              return newState;
            });
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
              onDeselect: this.deselect,
              onNewCase: this.newCase,
              dragStatus: this.props.dragStatus,
              dropCallback: handleDropInCollectionHeader
            });
          },

          renderAttribute: function (iContext, iCollection, iCases,
                                     iAttr, iAttrIndex, iShouldSummarize, iChildmostSelected) {
            /**
             * -------------------------Dragging this attribute----------------
             */
            function stop(iEvent) {
              iEvent.preventDefault();
              iEvent.stopPropagation();
            }

            function cancelTouchTooltip(hide) {
              if (tTouchTimer) {
                clearTimeout(tTouchTimer);
                tTouchTimer = null;
              }
              hide && DG.TouchTooltips.hideAllTouchTooltips();
            }

            function handlePointerDown(iEvent) {
              tPointerIsDown = true;
              tStartCoordinates = {x: iEvent.clientX, y: iEvent.clientY};
              tDragInProgress = false;
            }

            function handlePointerMove(iEvent) {
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

            function handlePointerUp() {
              tTouchID = null;
              tTouchTimer = null;
              tPointerIsDown = false;
              tStartCoordinates = null;
              tDragInProgress = false;
              tDragHandler = null;
            }

            function handleMouseDown(iEvent) {
              cancelTouchTooltip(true);
              if (iEvent.button !== 0) return;
              handlePointerDown(iEvent);
            }

            function handleTouchStart(iEvent) {
              cancelTouchTooltip(true);
              var elt = iEvent.target,
                  touch = iEvent.changedTouches[0];
              tTouchID = touch.identifier;
              if (elt) {
                tTouchTimer = setTimeout(function() {
                                DG.TouchTooltips.showTouchTooltip(touch, elt, elt.title);
                                // prevent drag
                                handlePointerUp();
                              }, 500);
              }
              handlePointerDown(iEvent.changedTouches[0]);
            }

            function handleMouseMove(iEvent) {
              handlePointerMove(iEvent);
              tDragInProgress && stop(iEvent);
            }

            function handleTouchEvent(iEvent) {
              cancelTouchTooltip();
              for (var i = 0; i < iEvent.touches.length; ++i) {
                if (iEvent.touches[i].identifier === tTouchID) {
                  // initial touch is still active
                  handlePointerMove(iEvent.touches[i]);
                  tDragInProgress && stop(iEvent);
                  return;
                }
              }
              // initial touch is no longer active
              handlePointerUp();
            }

            function handleMouseUp() {
              handlePointerUp();
            }

            function handleMouseLeave(iEvent) {
              if (tPointerIsDown) {
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
              if (tPointerIsDown && tDistance > kThresholdDistance2) {
                doDragStart();
              }
            }

            /**
             * --------------------------Another attribute is dropped---------------
             */
            var moveWithinOwnContext = function(iMoveDirection) {
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

            var joinForeignContext = function() {
              var tKeyAttribute = this.props.dragStatus.dragObject.data.attribute,
                  tCollClient = iContext.getCollectionByID(iCollection.get('id'));
              if( tKeyAttribute && iContext && tCollClient && iAttr) {
                iContext.invokeLater( function() {
                  DG.DataContextUtilities.joinSourceToDestCollection( tKeyAttribute, iContext,
                      tCollClient, iAttr);
                });
              }
            }.bind( this);

            var handleDrop = function (iMoveDirection) {
              if( this.props.dragStatus.dragType === 'ownContext')
                moveWithinOwnContext( iMoveDirection);
              else if( this.props.dragStatus.dragType === 'foreignContext')
                joinForeignContext();
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
                      newName = iContext.getUniqueAttributeName(iNewName, [currName]);
                  if (newName !== currName) {
                    updateAttribute({ name: newName });
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
                  iContext.invokeLater( function () {
                    DG.DataContextUtilities.editAttributeFormula(iContext, iCollection,
                        iAttr.get('name'), iAttr.get('formula'));
                  }, 30);
                }.bind(this),

                hideAttribute = function () {
                  DG.DataContextUtilities.hideAttribute(iContext, iAttr.get('id'));
                }.bind(this),

                attributeCanBeHidden = function () {
                  return iAttr.get('collection').numberOfVisibleAttributes() > 1;
                }.bind(this),

                deleteAttribute = function () {
                  DG.DataContextUtilities.deleteAttribute(iContext, iAttr.get('id'));
                }.bind(this),

                deleteAttributeFormula = function () {
                  DG.DataContextUtilities.deleteAttributeFormula(iContext, iAttr.get('id'));
                }.bind(this),

                recoverAttributeFormula = function () {
                  DG.DataContextUtilities.recoverAttributeFormula(iContext, iAttr.get('id'));
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
            var getColumnWidthPct = function(collectionName, attrIndex) {
              // only apply column width to first row of table
              if (attrIndex !== 0) return;
              // if we're actively resizing, size is determined by current resizeWidth
              var resizeWidth = this.state.resizeWidths[collectionName],
                  containerWidth = this.props.size && this.props.size.width;
              if (resizeWidth && containerWidth)
                return resizeWidth / containerWidth;
              // otherwise, size is determined by columnWidthMap
              return this.props.columnWidthMap && this.props.columnWidthMap[collectionName];
            }.bind(this);

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
                  onTouchMove: handleTouchEvent,
                  onTouchEnd: handleTouchEvent,
                  onTouchCancel: handleTouchEvent
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
                  columnWidthPct: getColumnWidthPct(tCollectionName, iAttrIndex),
                  onColumnWidthChanged: (iAttrIndex === 0) &&
                                        function(width) {
                                          this.handleColumnWidthChange(tCollectionName, width);
                                        }.bind(this),
                  editAttributeCallback: editAttribute,
                  editFormulaCallback: editFormula,
                  attributeCanBeHiddenCallback: attributeCanBeHidden,
                  hideAttributeCallback: hideAttribute,
                  deleteAttributeCallback: deleteAttribute,
                  deleteAttributeFormulaCallback: deleteAttributeFormula,
                  recoverAttributeFormulaCallback: recoverAttributeFormula,
                  attributeIsEditableCallback: formulaIsEditable,
                  attributeCanBeRandomizedCallback: attributeCanBeRandomized,
                  rerandomizeCallback: rerandomizeAttribute,
                  newAttributeCallback: isNewAttributeEnabled() ? makeNewAttribute : null,
                  cellLeaveCallback: handleCellLeave
                }),
                tValueCell = DG.React.AttributeValueCell({
                  attribute: iAttr,
                  dataContext: this.props.context,
                  displayCase: tCase,
                  editableCase: iShouldSummarize ? null : iCases[0],
                  summaryCases: iShouldSummarize ? iCases : null,
                  deselectCallback: function() {
                    SC.run(function () {
                      if( this.props.isSelectedCallback())
                        this.props.context.applyChange({ operation: 'selectCases', select: false });
                    }.bind(this));
                  }.bind(this),
                  forceUpdateCallback: this.incrementStateCount,
                  editProps: {
                    isEditing: tAttrID === this.state.attrIdOfValueToEdit,
                    onToggleEditing: toggleEditing,
                    onEscapeEditing: escapeEditing,
                    onEditModeCallback: editModeCallback
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

          deselect: function() {
            SC.run(function() {
              this.props.context.applyChange({ operation: 'selectCases', select: false });
            }.bind(this));
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
                      tColumnWidth = this.state.resizeWidths[tCollectionName] || this.state.columnWidths[tCollectionName],
                      tContainerWidth = this.props.size && this.props.size.width,
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

                  if (tContainerWidth && tColumnWidth) {
                    var kResizeHandleClass = "case-card-column-resize-handle";
                    tResizeHandle = DG.React.ColumnResizeHandle({
                                      className: kResizeHandleClass,
                                      key: kResizeHandleClass + iCollIndex + '-' + tCollectionName,
                                      enabled: true,
                                      containerWidth: tContainerWidth,
                                      columnWidth: tColumnWidth,
                                      minWidth: kMinColumnWidth,
                                      onResize: function(width, isComplete) {
                                        this.handleUserResizeColumn(tCollectionName, width, isComplete);
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
              className: 'react-data-card dg-wants-wheel',
              onMouseDownCapture: DG.Core.setClickHandlingForReact,
            }, tCollEntries);
          }
        };
      }()), []);
  CaseCard.displayName = "CaseCard";
  CaseCard.propTypes = {
    size: PropTypes.shape({ width: PropTypes.number }),
    // the data context
    context: PropTypes.instanceOf(DG.DataContext).isRequired,
    // drag/drop support
    dragStatus: PropTypes.object,
    // map from collection name => column width percentage (0-1)
    columnWidthMap: PropTypes.objectOf(PropTypes.number).isRequired,
    // Is the component in which I'm contained the selected component in the document?
    isSelectedCallback: PropTypes.func.isRequired,
    // function(collectionName, columnWidth) - update column width in model
    onResizeColumn: PropTypes.func.isRequired,
  };

  // use ReactSizeMe to inject size prop into CaseCard
  DG.React.CaseCard = createReactFactory(ReactSizeMe.withSize()(CaseCard));
});
