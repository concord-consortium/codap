// ==========================================================================
//                        DG.MapPolygonLayer
//
//  Author:   William Finzer
//
//  Copyright ©2014 Concord Consortium
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================
/* global L */
sc_require('components/graph_map_common/plot_layer');


/** @class DG.MapPolygonLayer - A plot of dots placed according to numeric values

  @extends DG.PlotLayer
*/
DG.MapPolygonLayer = DG.PlotLayer.extend(
/** @scope DG.MapPolygonLayer.prototype */
{
  displayProperties: [],

  autoDestroyProperties: [],

  mapSource: null,

  _areFeaturesAdded: false,
  _featuresRemainingToFetch: 0,
  features: null,

  map: function() {
    return this.getPath('mapSource.mapLayer.map');
  }.property(),

  init: function() {
    sc_super();

    this.features = [];
  },

  destroy: function() {
    var tMap = this.get('map');
    this.features.forEach( function( iFeature) {
      tMap.removeLayer( iFeature);
    });
    this.features = null;

    sc_super();
  },

  /**
   * Augment my base class by checking to make sure we have the attributes we need.
   * @returns {boolean}
   */
  readyToDraw: function() {
    var tModel = this.get('model');
    return tModel && !SC.none(tModel.getPath('dataConfiguration.polygonAttributeDescription.attributeID'));
  },

  /**
   * Computing this context once at beginning of display loop speeds things up
   * @return {*}
   */
  createRenderContext: function() {
    var tModel = this.get('model');
    if( !tModel)
      return; // not ready yet
    var tConfig = tModel.get('dataConfiguration'),
        tLegendDesc = tModel.getPath('dataConfiguration.legendAttributeDescription'),
        tStrokeColorIsDefault = this.get('areaStrokeColor') === DG.PlotUtilities.kDefaultMapStrokeColor,
        tStrokeSameAsFill = tModel.get('strokeSameAsFill'),
        tIsNumeric = tLegendDesc && tLegendDesc.get('isNumeric'),
        tQuantileValues = (tLegendDesc && tIsNumeric) ?
            DG.MathUtilities.nQuantileValues(
                tConfig.numericValuesForPlace( DG.GraphTypes.EPlace.eLegend), 5):
            [];
    return {
      map: this.get('map' ),
      polygonVarID: tModel.getPath('dataConfiguration.polygonAttributeDescription.attributeID'),
      legendDesc: tLegendDesc,
      legendVarID: tLegendDesc && tLegendDesc.get('attributeID'),
      legendName: tLegendDesc && tLegendDesc.getPath('attribute.name'),
      areaTransparency: tModel.get('areaTransparency'),
      areaStrokeColor: tModel.get('areaStrokeColor'),
      areaStrokeColorIsDefault: tStrokeColorIsDefault,
      areaStrokeTransparency: tStrokeSameAsFill ?
          tModel.get('areaTransparency') :
          tModel.get('areaStrokeTransparency'),
      calcCaseColorString: function( iCase ) {
        if( !this.legendVarID)
          return tModel.get('areaColor');

        DG.assert( iCase );
        var tColorValue = tIsNumeric ? iCase.getForcedNumericValue(this.legendVarID) : iCase.getValue( this.legendVarID),
            tCaseColor = tColorValue ?
                DG.ColorUtilities.calcCaseColor( tColorValue, this.legendDesc, null, tQuantileValues) :
                DG.ColorUtilities.kMapMissingValueCaseColor;
        return tCaseColor.colorString || tCaseColor;
      },
      calcStrokeColorString: function( iCase ) {
        if( tStrokeSameAsFill)
          return this.calcCaseColorString( iCase);
        else return this.areaStrokeColor;
      }
    };
  },

  calcTooltip: function( iCase) {

    function formatValue( iCase, iAttrDesc) {

      function getDigits() {
        return DG.PlotUtilities.findFractionDigitsForRange(iAttrDesc.getPath('attributeStats.minMax'));
      }

      return DG.PlotUtilities.getFormattedCaseValue( iCase, iAttrDesc, getDigits);
    }

    var tCaptionDesc = this.getPath('model.dataConfiguration.captionAttributeDescription'),
        tCaptionVarID = tCaptionDesc.get('attributeID'),
        tCaptionName = tCaptionDesc.getPath('attribute.name'),
        tLegendDesc = this.getPath('model.dataConfiguration.legendAttributeDescription'),
        tLegendVarID = tLegendDesc && tLegendDesc.get('attributeID'),
        tLegendName = tLegendDesc.getPath('attribute.name'),
        tTip = tCaptionName + ': ' + iCase.getValue( tCaptionVarID);
    if( tLegendVarID && (tLegendVarID !== tCaptionVarID)) {
      tTip += '<br>' + tLegendName + ': ' + formatValue(iCase, tLegendDesc);
    }
    return tTip;
  },

  handleAttributeChange: function() {
    this.dataDidChange();
  }.observes('model.dataConfiguration.attributeAssignment'),

  /**
   We should only have to worry about the fill color and fill opacity
   */
  doDraw: function() {
    if( !this.readyToDraw())
      return;   // not ready to create elements yet
    var tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext();
    if( tCases.get('length') !== this.features.length) {
      this.clear();
      this.addFeatures();
    }
    tCases.forEach( function( iCase, iIndex) {
      var tColorString = tRC.calcCaseColorString( iCase),
          tStrokeColorString = tRC.calcStrokeColorString( iCase),
          tFeature = this.features[ iIndex];
      if( tFeature) {
        tFeature.setStyle({
          fillColor: tColorString,
          color: tStrokeColorString,
          opacity: tRC.areaStrokeTransparency,
          fillOpacity: tRC.areaTransparency
        });
      }
    }.bind( this));
    this.updateSelection();
  }.observes('model.areaColor', 'model.areaTransparency', 'model.areaStrokeColor', 'model.areaStrokeTransparency',
      'model.strokeSameAsFill', 'model.pointColor', 'model.colorMap'),

  /**
   * Remove all features.
   */
  clear: function() {
    this._areFeaturesAdded = false;
    var tMap = this.get('map');
    this.features.forEach( function( iFeature) {
      tMap.removeLayer( iFeature);
    });
    this.features = [];
  },

  isVisibleChanged: function() {
    var tIsVisible = this.getPath('model.isVisible'),
        tMap = this.get('map');
    this.features.forEach( function( iFeature) {
      var tHasLayer = tMap.hasLayer( iFeature);
      if( tIsVisible && !tHasLayer) {
        tMap.addLayer( iFeature);
      }
      else if( !tIsVisible && tHasLayer) {
        tMap.removeLayer( iFeature);
      }
    });
  }.observes('model.isVisible'),

  hasLegendWithFormula: function () {
    return this.getPath('model.dataConfiguration.legendAttributeDescription.attribute.hasFormula');
  },

  /**
   Handle changes in assignment of legend attribute.
   */
  dataDidChange: function() {
    this.doDraw();
  },

  refreshComputedLegendColors: function() {
    if( this.hasLegendWithFormula())
      this.doDraw();
  },

  /**
    Observation function called when data values change.
    Method name is legacy artifact of SproutCore range observer implementation.
   */
  dataRangeDidChange: function( iSource, iQuestion, iKey, iChanges) {
    this.doDraw();
  },

  mustClearBecauseDataContextDidChange: function() {
    this.clear(); // So fresh features will get correct cases as option
  }.observes('model.dataContext'),

  /**
   For each case, set the fill of its corresponding point to show its selection state
   */
  updateSelection: function() {
    if( !this.get('model'))
      return;   // because this can get called by pending changes after I have been destroyed

    // Use long path for selection because we can call this before bindings have happened
    // There must be a better way?
    var tSelection = this.getPath('model.dataConfiguration.collectionClient.casesController.selection'),
    // Points are 'colored' if there is a legend or if there is more than one plot
        tHasLegend = (this.getPath('model.dataConfiguration.legendAttributeDescription.attribute') !==
            DG.Analysis.kNullAttribute),
        tCases = this.getPath('model.dataConfiguration.allCases'),
        tRC = this.createRenderContext();

    if(!tCases)
      return;

    tCases.forEach( function( iCase) {
      var tFeature = this.features.find( function (iFeature) {
              return iFeature && iFeature.options['case'] === iCase;
            }),
          tIsSelected = tSelection.containsObject( iCase),
          tFillColor = tHasLegend ? tRC.calcCaseColorString( iCase) :
              (tIsSelected ? DG.PlotUtilities.kMapAreaNoLegendSelectedColor : DG.PlotUtilities.kMapAreaNoLegendColor);
      if (!tFeature)
        return;
      if( tIsSelected) {
        tFeature.setStyle( {
          fillColor: tFillColor,
          color: tHasLegend ? DG.PlotUtilities.kMapAreaWithLegendSelectedBorderColor :
              DG.PlotUtilities.kMapAreaNoLegendSelectedBorderColor,
          fillOpacity: tHasLegend ? DG.PlotUtilities.kMapAreaWithLegendSelectedOpacity :
              DG.PlotUtilities.kMapAreaNoLegendSelectedOpacity,
          weight: DG.PlotUtilities.kMapAreaSelectedBorderWeight
        });
        if( !tHasLegend) {
          tFeature.setStyle( {
            fillColor: tFillColor
          });
        }
      }
      else {
        tFeature.setStyle( {
          color: tRC.calcStrokeColorString( iCase),
          opacity: tRC.areaStrokeTransparency,
          fillOpacity: tHasLegend ? DG.PlotUtilities.kMapAreaWithLegendUnselectedOpacity :
              tRC.areaTransparency,
          weight: DG.PlotUtilities.kMapAreaUnselectedBorderWeight,
          fillColor: tFillColor
        });
        tFeature.bringToBack();
      }
    }.bind( this));
  },

  selectionDidChange: function() {
    this.updateSelection();
  }.observes('model.selection'),

  addFeatures: function() {
    if( this._areFeaturesAdded || this._featuresRemainingToFetch > 0)
      return;

    this._featuresRemainingToFetch = 0;
    var tRC = this.createRenderContext(),
        tModel = this.get('model'),
        tCases = tModel.getPath( 'dataConfiguration.cases'),
        tIsVisible = tModel.get('isVisible');//,
        //tCaptionID = tModel.getPath('dataConfiguration.captionAttributeDescription.attributeID'),
        //tCaptionName = tModel.getPath('dataConfiguration.captionAttributeDescription.attribute.name');
    tCases.forEach( function( iCase, iIndex) {
      var tPopup,

          stashFeature = function( iJson, iError) {
            if( !iJson) {
              DG.logWarn( iError);
              return;
            }
            if( this._featuresRemainingToFetch > 0)
              this._featuresRemainingToFetch--;
            this.features[iIndex] = L.geoJson(iJson, {
              style: function (feature) {
                return {
                  color: 'yellow',
                  weight: 2,
                  fillColor: DG.PlotUtilities.kMapAreaNoLegendColor,
                  smoothFactor: 2
                };
              },
              'case': iCase // Stashes reference in features[iIndex].options.case
            })
                .on('click', handleClick) // unable to use 'mousedown' for unknown reason
                .on('mouseover', handleMouseover)
                .on('mouseout', handleMouseout)
                .addTo(tRC.map);
            if( !tIsVisible) {
              tRC.map.removeLayer( this.features[iIndex]);
            }
            else {
              this.features[iIndex].bringToBack();
            }
          }.bind( this),

          handleClick = function( iEvent) {
            SC.run(function() {
              this.get('model').selectCase(iCase, iEvent.originalEvent.shiftKey || iEvent.originalEvent.metaKey);
            }.bind(this));
          }.bind( this),

          handleMouseover = function( iEvent) {
            var tFeature = this.features[ iIndex];
            tPopup = L.popup({
                  closeButton: false,
                  autoPan: false,
                  offset: L.point(0, -20)
                },
                tFeature);
            tPopup.setContent( this.calcTooltip( iCase));
            SC.Timer.schedule( { target: this,
                                action: function() {
                                          if( tPopup)
                                            tFeature.bindPopup( tPopup).openPopup();
                                        },
                                interval: 500 });

          }.bind(this),

          handleMouseout = function( iEvent) {
            if( tPopup) {
              tPopup._close();
              tPopup = null;
            }
          }.bind( this);

      try {
        var tBoundaryValue = iCase.getValue(tRC.polygonVarID);
        if (!tBoundaryValue) return;
        if( tBoundaryValue instanceof Error) {
          stashFeature( null, tBoundaryValue.message);
        }
        else if( typeof tBoundaryValue === 'object') {
          if (tBoundaryValue.jsonBoundaryObject)
            tBoundaryValue = tBoundaryValue.jsonBoundaryObject;
          stashFeature( tBoundaryValue);
        }
        else if (tBoundaryValue.startsWith('http')) {
          this._featuresRemainingToFetch++;
          $.ajax({
            url: tBoundaryValue,
            context: this,
            data: '',
            success: stashFeature,
            error: function( iJqXHR, iStatus, iError) {
              console.log('Request for boundary failed. Status: ' + iStatus + ' Error: ' + iError);
            },
            dataType: 'json'
          });
        }
        else if(tBoundaryValue.startsWith('{')) // Assume it's the geojson itself
        {
          stashFeature( JSON.parse(tBoundaryValue));
        }
      }
      catch(er) {
        DG.logWarn("Invalid JSON for map area, reported from DG.MapPolygonLayer.addFeatures()");
      }
    }.bind( this));
    this._areFeaturesAdded = true;
  },

  /**
   * Return LatLngBounds of the geoJSON layer
   * @return {L.LatLngBounds}
   */
  getBounds: function() {
    var tMap = this.get('map'),
        tBounds;
    tMap.eachLayer( function( iLayer) {
      if( iLayer.getBounds) {
        var tLayerBounds = iLayer.getBounds();
        if (!tBounds)
          tBounds = tLayerBounds;
        else
          tBounds.extend(tLayerBounds);
      }
    });

    return tBounds;
  }

});

