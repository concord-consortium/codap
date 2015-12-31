// ==========================================================================
//                            DG.MapGridMarqueeView
//
//  Author:   William Finzer
//
//  Copyright (c) 2015 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('views/raphael_base');
sc_require('libraries/leaflet-src');

/** @class  DG.MapGridMarqueeView - Made visible over a map when we're in marquee mode to select grid rectangles.

  @extends DG.RaphaelBaseView
*/
DG.MapGridMarqueeView = DG.RaphaelBaseView.extend(
/** @scope DG.MapGridMarqueeView.prototype */ 
{
  autoDestroyProperties: [ '_backgroundForClick' ],

  classNames: 'marquee-mode'.w(),

  /**
   * @property {DG.MapGridModel}
   */
  mapGridModel: function() {
    return this.getPath('mapGridLayer.model');
  }.property('mapGridLayer.model'),

  /**
    @property { DG.MapGridLayer}
  */
  mapGridLayer: null,

  /**
   * @property {L.Map}
   */
  map: function() {
    return this.getPath('mapGridLayer.map');
  }.property(),

  mapDidChange: function() {
    this.notifyPropertyChange('map', this.get('map'));
  }.observes('*mapGridLayer.map'),

  // Private properties
  _backgroundForClick: null,  // We make this once and keep it sized properly.

  /**
    We just have the background to draw. But it has a marquee behavior and a background click
    behavior to install.
  */
  doDraw: function doDraw() {
    var this_ = this,
        tMarquee,
        tLastRect,
        tStartPt,
        tBaseSelection = [];

    function startMarquee( iWindowX, iWindowY, iEvent) {
      if( iEvent.shiftKey) {
        //tBaseSelection = this_.getPath( 'mapGridModel.selection').toArray();
      }
      else
        this_.get('mapGridModel').deselectAll();
      tStartPt = DG.ViewUtilities.windowToViewCoordinates(
                    { x: iWindowX, y: iWindowY }, this_);
      tMarquee = this_._paper.rect( tStartPt.x, tStartPt.y, 0, 0)
              .attr( { fill: DG.PlotUtilities.kMarqueeColor,
                    stroke: DG.RenderingUtilities.kTransparent });
      tLastRect = {x: tStartPt.x, y: tStartPt.y, width: 0, height: 0};
    }

    function continueMarquee( idX, idY) {
      if( SC.none( tMarquee))
        return; // Alt key was down when we started

      /* global L */
      var tMap = this_.get('map'),
          tMapGridModel = this_.get('mapGridModel'),
          tLatLngBounds,
          tX = (idX > 0) ? tStartPt.x : tStartPt.x + idX,
          tY = (idY > 0) ? tStartPt.y : tStartPt.y + idY,
          tWidth = Math.abs( idX),
          tHeight = Math.abs( idY),
          tRect = { x: tX, y: tY, width: tWidth, height: tHeight };
      tMarquee.attr( tRect);
      tLatLngBounds = L.latLngBounds([ tMap.containerPointToLatLng([ tX, tY + tHeight]),
                        tMap.containerPointToLatLng([ tX + tWidth, tY])]);
      tMapGridModel.forEachRect( function( iGridRect, iLngIndex, iLatIndex) {
        if( tLatLngBounds.intersects( L.latLngBounds(iGridRect.rect))) {
          if( !iGridRect.selected)
            tMapGridModel.selectCasesInRect(iLngIndex, iLatIndex, true /* extend */);
        }
        else {
          if( iGridRect.selected)
            tMapGridModel.deselectCasesInRect(iLngIndex, iLatIndex);
        }
      });
      // We compute the lat/lng bounds of tRect with the help of the map
      tLastRect = tRect;
    }

    function endMarquee( idX, idY) {
      if( SC.none( tMarquee))
        return; // Alt key was down when we started

      tMarquee.remove();
      tMarquee = null;
      tBaseSelection = [];
      this_.setPath('mapGridLayer.isInMarqueeMode', false);

/*
      var tNumCases = this_.getPath( 'mapGridModel.casesController.selection.length');
      if( tNumCases > 0)  // We must have something > 0
        DG.logUser("marqueeSelection: %@", tNumCases);
*/
    }

    if( SC.none( this._backgroundForClick)) {
      this._backgroundForClick = this._paper.rect( 0, 0, 0, 0 )
                .attr( { fill: DG.RenderingUtilities.kSeeThrough,
                         stroke: DG.RenderingUtilities.kTransparent })
                .drag( continueMarquee, startMarquee, endMarquee);
    }

    this._backgroundForClick.attr( { width: this.get('drawWidth'),
                                    height: this.get('drawHeight') } );

  }
});

