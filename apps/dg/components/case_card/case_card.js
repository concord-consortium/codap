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
      tr = React.DOM.tr,
      td = React.DOM.td,
      input = React.DOM.input
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

          renderContext: function (iDataSetName, iIndex) {
            return div({key: 'cont-' + iIndex, className: 'react-data-card-header'},
                span({}, iDataSetName)
            );
          },

          renderCollection: function (iIndex, iCollection) {
            var tName = iCollection.get('name'),
                tNumCases = iCollection.get('cases').length;
            return div({key: 'coll-' + iIndex},
                h2({}, tName + ' (' + tNumCases + ')')
            );
          },

          renderAttribute: function (iContext, iCase, iAttr, iIndex) {
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

            function handleCellLeave(iEvent) {
              logit('cellLeave');
              if (tDragInProgress)
                handleMouseMove(iEvent);
            }

            var tDescription = iAttr.get('description') || '',
                tUnit = iAttr.get('unit') || '',
                tFormula = iAttr.get('formula'),
                tAttrIndex = this.state.attrIndex++,
                tValue = iCase ? iCase.getValue(iAttr.get('id')) : '';
            if (isNotEmpty(tDescription) && isNotEmpty(tUnit))
              tUnit = ' (' + tUnit + ')';
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
                  title: tDescription + tUnit + tFormula,
                  onMouseDown: handleMouseDown,
                  onMouseUp: handleMouseUp,
                  onMouseLeave: handleMouseLeave,
                  onMouseMove: handleMouseMove
                }, iAttr.get('name')),
                tCell = td({
                  onMouseLeave: handleCellLeave
                }, tSpan),
                tValueField = DG.React.Components.TextInput({
                  value: tValue,
                  attrIndex: tAttrIndex,
                  case: iCase,
                  attrID: iAttr.get('id'),
                  onToggleEditing: function (iValueField, iAttrIndex) {
                    if (this.currEditField !== iValueField) {
                      iValueField.setState({editing: true});
                      if (this.currEditField) {
                        if( this.currEditField.props.value !== this.currEditField.state.value)
                          this.currEditField.props.case.setValue( this.currEditField.props.attrID,
                              this.currEditField.state.value);
                        this.currEditField.setState({editing: false});
                      }
                      this.currEditField = iValueField;
                    }
                  }.bind(this)
                });
            return tr({key: 'attr-' + iIndex}, tCell, tValueField);
          },

          render: function () {
            var tCardEntries = [], tCollEntries = [],
                tContext = this.props.context;
            tContext.get('collections').forEach(function (iCollection, iCollIndex) {
              tCollEntries.push(this.renderCollection(iCollIndex, iCollection));

              var tCollClient = tContext.getCollectionByID(iCollection.get('id')),
                  tSelectedCases = tCollClient ? tCollClient.getPath('casesController.selection') : null,
                  tCases = iCollection.get('cases'),
                  tLength = tSelectedCases ? tSelectedCases.length() : 0,
                  tCase = tLength > 0 ? tSelectedCases.toArray()[tLength - 1] :
                      (tCases.length > 0 ? tCases[0] : null),
                  tAttrEntries = [];
              iCollection.get('attrs').forEach(function (iAttr, iAttrIndex) {
                tAttrEntries.push(this.renderAttribute(tContext, tCase, iAttr, iAttrIndex));
              }.bind(this));
              tCollEntries.push(table({}, tbody({}, tAttrEntries)));
            }.bind(this));
            tCardEntries.push(tCollEntries);

            return div({className: 'react-data-card', style: this.state.style}, tCardEntries/*, tPara*/);
          }
        };
      })(), []);

});
