sc_require('models/attribute_model');
sc_require('models/case_model');
sc_require('react/dg-react');
/* global React, createReactFC, PropTypes, ReactDOMFactories, tinycolor */

DG.React.ready(function () {
  var img = ReactDOMFactories.img,
      span = ReactDOMFactories.span,
      input = ReactDOMFactories.input,
      td = ReactDOMFactories.td;

  /**
   * AttributeValueCell
   *    displays the contents of the attribute value cell in the case card
   */
  var config = {
    displayName: "AttributeValueCell",
    propTypes: {
      // {DG.Attribute} the attribute to display
      attribute: PropTypes.instanceOf(DG.Attribute).isRequired,
      dataContext: PropTypes.instanceOf(DG.DataContext).isRequired,
      // {DG.Case} the case to display; undefined to summarize
      displayCase: PropTypes.instanceOf(DG.Case),
      // {DG.Case} the case to whose values to edit; undefined to summarize
      editableCase: PropTypes.instanceOf(DG.Case),
      // {[DG.Case]} - the cases to summarize; undefined for single case
      summaryCases: PropTypes.arrayOf(PropTypes.instanceOf(DG.Case)),
      deselectCallback: PropTypes.func.isRequired,
      forceUpdateCallback: PropTypes.func.isRequired,
      editProps: PropTypes.exact({
        isEditing: PropTypes.bool.isRequired,
        // function(attribute) - toggle into/out of editing mode
        onToggleEditing: PropTypes.func.isRequired,
        // function(attribute) - escape out of editing mode
        onEscapeEditing: PropTypes.func.isRequired,
        // function(attribute) - callback to inform caller of TextInput
        onEditModeCallback: PropTypes.func.isRequired
      }).isRequired
    }
  };

  function AttributeValueCell(props) {

    function isBoolean(v) {
      if (typeof v === 'string') {
        v = v.toLowerCase();
      }
      return ['', 'false', 'true', false, true, null].includes(v) || v === undefined;
    }

    var CheckboxFormatter = function (cellValue) {

      function handleChange(iEvent) {
        var newValue = iEvent.target.checked,
            newState = newValue ? 'checked' : 'unchecked';
        var tChange = {
          operation: 'updateCases',
          cases: [props.displayCase],
          caseIDs: [props.displayCase.get('id')],
          attributeIDs: [tAttr.get('id')],
          values: [[newValue]]
        };
        props.dataContext.applyChange(tChange);
        setTriState(newState);
      }

      React.useEffect(function () {
        var newState,
            newCellValue = (typeof cellValue === 'string') ? cellValue.toLowerCase() : cellValue;
        if (newCellValue && newCellValue !== 'false') {
          newState = 'checked';
          checkRef.current.checked = true;
          checkRef.current.indeterminate = false;
        } else if (newCellValue === false) {
          newState = 'unchecked';
          checkRef.current.checked = false;
          checkRef.current.indeterminate = false;
        } else {
          newState = 'indeterminate';
          checkRef.current.checked = false;
          checkRef.current.indeterminate = true;
        }
        setTriState(newState);
      }, [cellValue, setTriState]);

      var readOnly = (tAttr && (tAttr.formula || !tAttr.editable)),
          checkRef = React.useRef();

      var triStateState = React.useState('indeterminate'),
          setTriState = triStateState[1];


      return span({
            className: 'dg-checkbox-cell dg-wants-mouse dg-wants-touch',
          },
          input({
            type: 'checkbox', disabled: readOnly,
            onChange: handleChange, ref: checkRef
          }));
    };

    var tAttr = props.attribute,
        tAttrID = tAttr.get('id'),
        tUnit = tAttr.get('unit') || '',
        tHasFormula = tAttr.get('hasFormula'),
        tValue = props.displayCase && props.displayCase.getValue(tAttrID),
        tType = tValue && tValue.jsonBoundaryObject
            ? 'boundary'
            : tAttr.get('type'),
        tColorValueField,
        tQualitativeValueField,
        tBoundaryValueField,
        tCheckboxField,
        tColor,
        spanStyle,
        tBoundaryInternalImage,
        tQualitativeInternalSpan,
        tValueClassName = '';
    if (tType === 'numeric' && !DG.isNumeric(tValue)) {
      tValue = props.displayCase && props.displayCase.getForcedNumericValue(tAttrID);
    }
    if (tValue instanceof Error) {
      tValue = tValue.name + tValue.message;
    } else if (DG.isColorSpecString(tValue)) {
      tColor = tinycolor(tValue.toLowerCase().replace(/\s/gi, ''));
      spanStyle = {
        backgroundColor: tColor.toString('rgb')
      };
      tColorValueField = span({
        className: 'react-data-card-color-table-cell',
        style: spanStyle
      });
    } else if (tType === 'qualitative') {
      if (SC.empty(tValue)) {
        tValue = "";
      } else {
        tColor = DG.PlotUtilities.kDefaultPointColor;
        spanStyle = {
          backgroundColor: tColor,
          width: tValue + '%',
        };
        tQualitativeInternalSpan = span({
          className: 'react-data-card-qualitative-bar',
          style: spanStyle
        });
        tQualitativeValueField = span({
          className: 'react-data-card-qualitative-backing'
        }, tQualitativeInternalSpan);
      }
    } else if (tType === DG.Attribute.TYPE_CHECKBOX
        && isBoolean(tValue) && !props.summaryCases) {
      tCheckboxField = CheckboxFormatter(tValue, this); // jshint ignore:line
    } else if (tType === 'boundary') {
      var tResult = 'a boundary',
          tBoundaryObject = DG.GeojsonUtils.boundaryObjectFromBoundaryValue(tValue),
          tThumb = tBoundaryObject && tBoundaryObject.jsonBoundaryObject &&
              tBoundaryObject.jsonBoundaryObject.properties &&
              tBoundaryObject.jsonBoundaryObject.properties.THUMB;
      if (tThumb !== null && tThumb !== undefined) {
        tBoundaryInternalImage = img({
          className: 'react-data-card-thumbnail',
          src: tThumb
        });
        tBoundaryValueField = span({}, tBoundaryInternalImage);
      } else if (tBoundaryObject && (tBoundaryObject.jsonBoundaryObject instanceof Error)) {
        tValue = tBoundaryObject.jsonBoundaryObject.name + tBoundaryObject.jsonBoundaryObject.message;
      }
      tValue = tResult;
    } else if (DG.isNumeric(tValue) && typeof tValue !== 'boolean') {
      var tPrecision = tAttr.get('precision');
      tPrecision = SC.none(tPrecision) ? 2 : tPrecision;
      tValue = DG.MathUtilities.formatNumber(tValue, tPrecision);
      tValueClassName += ' react-data-card-numeric ';
    } else if (tType === 'date' && !props.summaryCases) {
      tValueClassName += ' react-data-card-date ';
    } else if (SC.none(tValue) || (typeof tValue === 'object')) {
      tValue = '';
    }
    var tValueField = props.summaryCases
        ? DG.React.Components.AttributeSummary({
          cases: props.summaryCases,
          attr: tAttr,
          unit: tUnit
        })
        : DG.React.Components.TextInput({
          attr: tAttr,
          'case': props.editableCase,
          value: tValue,
          unit: tUnit,
          isEditable: tAttr.get('editable') && !tAttr.get('hasFormula'),
          createInEditMode: props.editProps.isEditing,
          onToggleEditing: props.editProps.onToggleEditing,
          onEscapeEditing: props.editProps.onEscapeEditing,
          onEditModeCallback: props.editProps.onEditModeCallback
        });
    tValueClassName += tHasFormula ? 'react-data-card-formula' : '';
    if (tColorValueField) {
      tValueField = tColorValueField;
    } else if (tCheckboxField) {
      tValueField = tCheckboxField;
    } else if (tBoundaryValueField) {
      tValueField = tBoundaryValueField;
    } else if (tQualitativeValueField) {
      tValueField = tQualitativeValueField;
    }
    return (
        td({
          className: 'dg-wants-touch ' + tValueClassName
        }, tValueField)
    );
  }

  // two-stage definition required for React-specific eslint rules
  DG.React.AttributeValueCell = createReactFC(config, AttributeValueCell);
});
