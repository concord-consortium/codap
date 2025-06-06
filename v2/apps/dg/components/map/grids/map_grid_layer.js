// ==========================================================================
//                        DG.MapGridLayer
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
/** @class DG.MapGridLayer - A plot of dots placed according to numeric values

  @extends SC.Object
*/
DG.MapGridLayer = SC.Object.extend(
/** @scope DG.MapGridLayer.prototype */ 
{
  /**
   * {@property DG.MapGridModel}
   */
  model: null,

  mapSource: null,

  /**
   * paperSource is the same as mapSource
   */
  paperSource: function() {
    return this.get('mapSource');
  }.property( 'mapSource'),

  map: function() {
    return this.getPath('mapSource.mapLayer.map');
  }.property(),

  /**
   * {@property L.rectangle[]}
   */
  grid: null,

  _infoTip: null,
  infoTip: function () {
    if (!this._infoTip) {
      var this_ = this;
      this._infoTip = DG.InfoTip.create({
        paperSource: function () {
          return this_.get('paperSource');
        }.property(),
      });
    }
    return this._infoTip;
  }.property(),

  showTips: false,

  /**
   * @property {Boolean}
   */
  isInMarqueeMode: false,

  marqueeContext: null,

  isVisible: function() {
    return this.getPath('model.isVisible');
  }.property(),

  init: function() {
    sc_super();
    this.visibilityHasChanged();
  },

  /**
    Draw the grid cells
  */
  addGridLayer: function() {
    var this_ = this,
        tMap = this.get('map'),
        tModel = this.get('model');
    if( !tMap || !tModel)
      return;
    var tOptions = { color: 'white', fillColor: 'red', weight: 1 },
        tRectangles = [],
        tMaxCount = tModel.get('rectArray').maxCount,
        tDataContext = tModel.getPath('dataConfiguration.dataContext'),
        tCollection = tModel.getPath('dataConfiguration.collectionClient'),
        tRect;
    tModel.forEachRect( function( iRect, iLongIndex, iLatIndex) {
      var handleClick = function( iEvent) {
            var tExtend = iEvent.originalEvent.shiftKey || iEvent.originalEvent.metaKey;
            // Below is the Leaflet Way to stop the click from propagating.
            L.DomEvent.stopPropagation(iEvent);
            SC.run(function () {
              tModel.selectCasesInRect( iLongIndex, iLatIndex, tExtend);
            });
            return false;
          }.bind( this),

          handleMouseover = function( iEvent) {
            var tLegendAttrID = tModel.getPath('dataConfiguration.legendAttributeDescription.attributeID');
            tRect = tModel.get('rectArray').getRect( iLongIndex, iLatIndex);
            if( (tRect.count === 0) || !this.get('showTips'))
              return;
            var tTipString = SC.none( tLegendAttrID) ?
                tDataContext.getCaseCountString(tCollection, tRect.count) :
                tModel.getCategoryBreakdownString( tRect.cases, tLegendAttrID),
                tCoords = this_.get('map').latLngToContainerPoint(tRect.rect[0]);
            this_.get('infoTip').show({
              x: tCoords.x, y: tCoords.y,
              tipString: tTipString
            });
          }.bind(this),

          handleMouseout = function( iEvent) {
            this_.get('infoTip').hide();
          }.bind( this);

      tOptions.fillOpacity = iRect.count / tMaxCount;
      var tLeafRect = L.rectangle( iRect.rect, tOptions)
                        .on('click', handleClick)
                        .on('mouseover', handleMouseover)
                        .on('mouseout', handleMouseout);
      tRectangles.push(tLeafRect);
    }.bind( this));

    this.set('grid', tRectangles);
  },

  show: function() {
    if( this.getPath('model.isVisible'))
      this.addGridToMap();
  },

  hide: function() {
    if( this.getPath('model.isVisible'))
      this.removeGridFromMap();
  },

  selectionDidChange: function() {
    var tIndex = 0,
        tRectangles = this.get('grid');
    if( !tRectangles || // We haven't been asked to construct them yet
        !this.getPath('model.isVisible'))
      return;
    this.get('model').forEachRect( function( iRect, iLongIndex, iLatIndex) {
      var tLeafRect = tRectangles[ tIndex],
          tSelected = iRect.selected;
      tLeafRect.setStyle( { color: tSelected ? 'black' : 'white',
                            weight: tSelected ? 2 : 1});
      if( tSelected)
        tLeafRect.bringToFront();
      tIndex++;
    });
  }.observes('model.selection'),

  /**
   * Add each rectangle to the map
   */
  addGridToMap: function() {
    var tMap = this.get('map'),
        tRectangles = this.get('grid');
    if( !tRectangles) {
      this.addGridLayer();
      tRectangles = this.get('grid');
    }
    tRectangles.forEach( function( iRect) {
      iRect.addTo( tMap);
    });
  },

  /**
   * Add each rectangle to the map
   */
  removeGridFromMap: function() {
    var tMap = this.get('map'),
        tRectangles = this.get('grid');
    if( tRectangles) {
      tRectangles.forEach(function (iRect) {
        tMap.removeLayer(iRect);
      });
    }
  },

  visibilityHasChanged: function() {
    if( this.getPath('model.isVisible')) {
      if(!this.get('grid'))
        this.addGridLayer();
      this.addGridToMap();
    }
    else {
      if(this.get('grid'))
        this.removeGridFromMap();
    }
  }.observes('model.isVisible'),

  gridRectArrayChanged: function() {
    this.removeGridFromMap();
    this.addGridLayer();
    this.visibilityHasChanged();
  }.observes('model.rectArray')

});

