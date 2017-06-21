// ==========================================================================
//                        DG.MapAreaLayer
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


/** @class DG.MapAreaLayer - A plot of dots placed according to numeric values

  @extends DG.PlotLayer
*/
DG.MapAreaLayer = DG.PlotLayer.extend(
/** @scope DG.MapAreaLayer.prototype */
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
    this.features = null;

    sc_super();
  },

  /**
   * Augment my base class by checking to make sure we have the attributes we need.
   * @returns {boolean}
   */
  readyToDraw: function() {
    var tModel = this.get('model');
    return tModel && !SC.none(tModel.getPath('dataConfiguration.areaAttributeDescription.attributeID'));
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
        tQuantileValues = (tLegendDesc && tLegendDesc.get('isNumeric')) ?
            DG.MathUtilities.nQuantileValues(
                tConfig.numericValuesForPlace( DG.GraphTypes.EPlace.eLegend), 5):
            [];
    return {
      map: this.get('map' ),
      areaVarID: tModel.getPath('dataConfiguration.areaAttributeDescription.attributeID'),
      legendDesc: tLegendDesc,
      legendVarID: tLegendDesc && tLegendDesc.get('attributeID'),
      legendName: tLegendDesc && tLegendDesc.getPath('attribute.name'),
      areaTransparency: tModel.get('areaTransparency'),
      areaStrokeColor: tModel.get('areaStrokeColor'),
      areaStrokeColorIsDefault: tStrokeColorIsDefault,
      areaStrokeTransparency: tModel.get('areaStrokeTransparency'),
      calcCaseColorString: function( iCase ) {
        if( !this.legendVarID)
          return tModel.get('areaColor');

        DG.assert( iCase );
        var tColorValue = iCase.getValue( this.legendVarID),
            tCaseColor = DG.ColorUtilities.calcCaseColor( tColorValue, this.legendDesc, null, tQuantileValues);
        return tCaseColor.colorString || tCaseColor;
      }
    };
  },

  calcTooltip: function( iCase) {
    var tCaptionDesc = this.getPath('model.dataConfiguration.captionAttributeDescription'),
        tCaptionVarID = tCaptionDesc.get('attributeID'),
        tCaptionName = tCaptionDesc.getPath('attribute.name'),
        tLegendDesc = this.getPath('model.dataConfiguration.legendAttributeDescription'),
        tLegendVarID = tLegendDesc && tLegendDesc.get('attributeID'),
        tLegendName = tLegendDesc.getPath('attribute.name'),
        tTip = tCaptionName + ': ' + iCase.getValue( tCaptionVarID);
    if( tLegendVarID && (tLegendVarID !== tCaptionVarID)) {
      tTip += '<br>' + tLegendName + ': ' + iCase.getValue( tLegendVarID);
    }
    return tTip;
  },

  handleAttributeChange: function() {
    this.dataDidChange();
  }.observes('model.dataConfiguration.attributeAssignment'),

  /**
   We should only have to worry about the fill color
   */
  doDraw: function() {
    if( !this.readyToDraw())
      return;   // not ready to create elements yet
    var tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext();
    if( tCases.length !== this.features.length) {
      this.clear();
      this.addFeatures();
    }
    tCases.forEach( function( iCase, iIndex) {
      var tColorString = tRC.calcCaseColorString( iCase),
          tFeature = this.features[ iIndex];
      if( tFeature) {
        tFeature.setStyle({
          fillColor: tColorString
        });
      }
    }.bind( this));
    this.updateSelection();
  }.observes('model.areaColor', 'model.areaTransparency', 'model.areaStrokeColor', 'model.areaStrokeTransparency' ),

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

    tCases.forEach( function( iCase, iIndex) {
      var tFeature = this.features[ iIndex];
      if( !tFeature)
        return;
      if( tSelection.containsObject( iCase)) {
        tFeature.setStyle( {
          color: tHasLegend ? DG.PlotUtilities.kMapAreaWithLegendSelectedBorderColor :
              DG.PlotUtilities.kMapAreaNoLegendSelectedBorderColor,
          fillOpacity: tHasLegend ? DG.PlotUtilities.kMapAreaWithLegendSelectedOpacity :
              DG.PlotUtilities.kMapAreaNoLegendSelectedOpacity,
          weight: DG.PlotUtilities.kMapAreaSelectedBorderWeight
        });
        if( !tHasLegend) {
          tFeature.setStyle( {
            fillColor: DG.PlotUtilities.kMapAreaNoLegendSelectedColor
          });
        }
        tFeature.bringToFront();
      }
      else {
        tFeature.setStyle( {
          color: (tHasLegend && tRC.areaStrokeColorIsDefault) ?
              DG.PlotUtilities.kMapAreaWithLegendUnselectedBorderColor :
              tRC.areaStrokeColor,
          opacity: tRC.areaStrokeTransparency,
          fillOpacity: tHasLegend ? DG.PlotUtilities.kMapAreaWithLegendUnselectedOpacity :
              tRC.areaTransparency,
          weight: DG.PlotUtilities.kMapAreaUnselectedBorderWeight,
          fillColor: tRC.calcCaseColorString( iCase)
        });
      }
    }.bind( this));
  },

  addFeatures: function() {
    if( this._areFeaturesAdded || this._featuresRemainingToFetch > 0)
      return;

    this._featuresRemainingToFetch = 0;
    var tRC = this.createRenderContext(),
        tModel = this.get('model'),
        tCases = tModel.getPath( 'dataConfiguration.allCases');//,
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
              }
            })
                .on('click', handleClick) // unable to use 'mousedown' for unknown reason
                .on('mouseover', handleMouseover)
                .on('mouseout', handleMouseout)
                .addTo(tRC.map);
          }.bind( this),

          handleClick = function( iEvent) {
            SC.run(function() {
              this.get('model').selectCaseByIndex(iIndex, iEvent.originalEvent.shiftKey || iEvent.originalEvent.metaKey);
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
        var tBoundaryValue = iCase.getValue(tRC.areaVarID);
        if (!tBoundaryValue) return;
        if( typeof tBoundaryValue === 'object') {
          if (tBoundaryValue.jsonBoundaryObject)
            tBoundaryValue = tBoundaryValue.jsonBoundaryObject;
          stashFeature( tBoundaryValue);
        }
        if (tBoundaryValue.startsWith('http')) {
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
        else if(tBoundaryValue.startsWith('{"type"')) // Assume it's the geojson itself
        {
          stashFeature( JSON.parse(tBoundaryValue));
        }
        else {  // Assume it's a state boundary lookup
          this._featuresRemainingToFetch++;
          DG.GeojsonUtils.lookupBoundary('state', tBoundaryValue, stashFeature);
        }
      }
      catch(er) {
        DG.logWarn("Invalid JSON for map area, reported from DG.MapAreaLayer.addFeatures()");
      }
    }.bind( this));
    this._areFeaturesAdded = true;
    this.doDraw();
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

