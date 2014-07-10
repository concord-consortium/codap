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
    var tLegendDesc = tModel.getPath('dataConfiguration.legendAttributeDescription');
    return {
      map: this.get('map' ),
      areaVarID: tModel.getPath('dataConfiguration.areaAttributeDescription.attributeID'),
      legendDesc: tLegendDesc,
      legendVarID: tLegendDesc && tLegendDesc.get('attributeID'),
      legendName: tLegendDesc.getPath('attribute.name'),
      calcCaseColorString: function( iCase ) {
        if( !this.legendVarID)
          return 'red'; // DG.ColorUtilities.kNoAttribCaseColor.colorString;

        DG.assert( iCase );
        var tColorValue = iCase.getValue( this.legendVarID),
            tCaseColor = DG.ColorUtilities.calcCaseColor( tColorValue, this.legendDesc);
        return tCaseColor.colorString;
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
    var this_ = this,
        tCases = this.getPath('model.cases'),
        tRC = this.createRenderContext(),
        tDataLength = tCases && tCases.length,
        tIndex;
    tCases.forEach( function( iCase, iIndex) {
      var tColorString = tRC.calcCaseColorString( iCase),
          tFeature = this.features[ iIndex];
      if( tFeature) {
        tFeature.setStyle({
          fillColor: tColorString,
          fillOpacity: 0.5
        });
      }
    }.bind( this));
    this.updateSelection();
  },

  /**
   Handle changes in assignment of legend attribute.
   */
  dataDidChange: function() {
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
        tCases = this.getPath('model.cases');

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
        tFeature.bringToFront();
      }
      else {
        tFeature.setStyle( {
          color: tHasLegend ? DG.PlotUtilities.kMapAreaWithLegendUnselectedBorderColor :
              DG.PlotUtilities.kMapAreaNoLegendUnselectedBorderColor,
          fillOpacity: tHasLegend ? DG.PlotUtilities.kMapAreaWithLegendUnselectedOpacity :
              DG.PlotUtilities.kMapAreaNoLegendUnselectedOpacity,
          weight: DG.PlotUtilities.kMapAreaUnselectedBorderWeight
        });
      }
    }.bind( this));
  },

  addFeatures: function() {
    if( this._areFeaturesAdded)
      return;

    var tRC = this.createRenderContext(),
        tModel = this.get('model'),
        tCases = tModel.get( 'cases'),
        tCaptionID = tModel.getPath('dataConfiguration.captionAttributeDescription.attributeID'),
        tCaptionName = tModel.getPath('dataConfiguration.captionAttributeDescription.attribute.name');
    tCases.forEach( function( iCase, iIndex) {

      var handleClick = function( iEvent) {
            this.get('model').selectCaseByIndex(iIndex, iEvent.originalEvent.shiftKey || iEvent.originalEvent.metaKey);
          }.bind( this),

          handleMouseover = function( iEvent) {
            var tFeature = this.features[ iIndex],
                tPopup = L.popup({ closeButton: false }, tFeature);
            tPopup.options.offset[1] = -20;
            tPopup.setContent( this.calcTooltip( iCase));
            tFeature.bindPopup( tPopup).openPopup();
          }.bind(this),

          handleMouseout = function( iEvent) {
            //this.features[ iIndex].unbindPopup(); // Would like to explicitly hide the popup
          }.bind( this);

      try {
        var tFeature = JSON.parse(iCase.getValue(tRC.areaVarID));
        this.features[ iIndex] = L.geoJson(tFeature, {
          style: function (feature) {
            return {color: 'yellow',
                    weight: 2,
                    fillColor: 'red',
                    smoothFactor: 2};
          }
        })
            .on('click', handleClick) // unable to use 'mousedown' for unknown reason
            .on('mouseover', handleMouseover)
            .on('mouseout', handleMouseout)
            .addTo(tRC.map);
      }
      catch(er) {
        DG.logWarn("Invalid JSON for map area, reported from DG.MapAreaLayer.addFeatures()");
      }
    }.bind( this));
    this._areFeaturesAdded = true;
  }

});

