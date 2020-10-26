sc_require('models/attribute_model');
sc_require('models/case_model');
sc_require('react/dg-react');
/* global createReactFC, PropTypes, ReactDOMFactories, tinycolor */

DG.React.ready(function () {
  var img = ReactDOMFactories.img,
      span = ReactDOMFactories.span,
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
      // {DG.Case} the case to display; undefined to summarize
      displayCase: PropTypes.instanceOf(DG.Case),
      // {DG.Case} the case to whose values to edit; undefined to summarize
      editableCase: PropTypes.instanceOf( DG.Case),
      // {[DG.Case]} - the cases to summarize; undefined for single case
      summaryCases: PropTypes.arrayOf(PropTypes.instanceOf(DG.Case)),
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
        tColor,
        spanStyle,
        tBoundaryInternalImage,
        tQualitativeInternalSpan;
    if( tType === 'numeric' && !DG.isNumeric(tValue)) {
      tValue = props.displayCase && props.displayCase.getForcedNumericValue(tAttrID);
    }
    if (tValue instanceof Error) {
      tValue = tValue.name + tValue.message;
    } else if (DG.isColorSpecString(tValue)) {
      tColor = tinycolor( tValue.toLowerCase().replace(/\s/gi,''));
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
      }
      else if( tBoundaryObject && (tBoundaryObject.jsonBoundaryObject instanceof Error)) {
        tValue = tBoundaryObject.jsonBoundaryObject.name + tBoundaryObject.jsonBoundaryObject.message;
      }
      tValue = tResult;
    } else if (DG.isNumeric(tValue) && typeof tValue !== 'boolean') {
      var tPrecision = tAttr.get('precision');
      tPrecision = SC.none(tPrecision) ? 2 : tPrecision;
      tValue = DG.MathUtilities.formatNumber(tValue, tPrecision);
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
            }),
        tValueClassName = tHasFormula ? 'react-data-card-formula' : '';
    if (tColorValueField) {
      tValueField = tColorValueField;
    }
    else if (tBoundaryValueField) {
      tValueField = tBoundaryValueField;
    }
    else if (tQualitativeValueField) {
      tValueField = tQualitativeValueField;
    }
    return (
      td({className: 'dg-wants-touch ' + tValueClassName}, tValueField)
    );
  }
  // two-stage definition required for React-specific eslint rules
  DG.React.AttributeValueCell = createReactFC(config, AttributeValueCell);
});
