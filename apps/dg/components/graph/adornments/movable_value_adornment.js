// ==========================================================================
//                      DG.MovableValueAdornment
//
//  Author:   William Finzer
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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

sc_require('components/graph/adornments/plot_adornment');
sc_require('components/graph/adornments/line_label_mixin');
sc_require('components/graph/adornments/value_axis_view_mixin');

/** @class  Draws a movable line.
 *          Mixes in the DG.ValueAxisViewMixin for handling axis notifications that trigger updates.

  @extends DG.PlotAdornment
*/
DG.MovableValueAdornment = DG.PlotAdornment.extend( DG.LineLabelMixin, DG.ValueAxisViewMixin,
/** @scope DG.MovableValueAdornment.prototype */ 
{
  kLineSlideHCur: DG.Browser.customCursorStr(static_url('cursors/LineSlideH.cur'), 8, 8),
  kLineSlideVCur: DG.Browser.customCursorStr(static_url('cursors/LineSlide.cur'), 8, 8),

  /**
    The movable value itself is a single line element
    @property { Raphael line element }
  */
  lineSeg: null,

  /**
    We cover the line segment with a wider segment for hit-testing and hilighting
    @property { Raphael line element }
  */
  coverSeg: null,

  /**
    @property { Number }
  */
  value: function() {
    return this.getPath('model.value');
  }.property('model.value'),

  /**
    The returned string should have a reasonable number of significant digits for the
      circumstances.
    @property { String read only }
  */
  valueString: function() {
    var tValue = this.get('value'),
        tDigits = DG.PlotUtilities.findFractionDigitsForAxis( this.get('valueAxisView')),
        tNumFormat = pv.Format.number().fractionDigits( 0, tDigits),
        tVar = this.getPath('valueAxisView.model.firstAttributeName');
    return tVar + " = " + tNumFormat( tValue);
  }.property('model.value', 'valueAxisView.model.firstAttributeName' ).cacheable(),
  
  /**
    Concatenated array of ['PropertyName','ObserverMethod'] pairs used for indicating
    which observers to add/remove from the model.
    
    @property   {Array of [{String},{String}]}  Elements are ['PropertyName','ObserverMethod']
   */
  modelPropertiesToObserve: [ ['value', 'updateToModel'] ],

  /**
    Make the movable line. This only needs to be done once.
  */
  createElements: function() {
    var this_ = this,
        tLayer = this.get('layer' ),
        tDragCoord;
  
    //=============Event handling functions===============
    function beginTranslate( iWindowX, iWindowY) {
      var tDragPoint = DG.ViewUtilities.windowToViewCoordinates( 
                    { x: iWindowX, y: iWindowY }, this_.parentView);
      tDragCoord = (this_.getPath('valueAxisView.orientation') === 'horizontal') ?
                        tDragPoint.x : tDragPoint.y;
    }
    
    function continueTranslate( idX, idY) {
      var tAxisView = this_.get('valueAxisView'),
          tDelta = (tAxisView.get('orientation') === 'horizontal') ? idX : idY,
          tNewValue = tAxisView.coordinateToData( tDragCoord + tDelta);
      this_.setPath('model.value', tNewValue);
    }
  
    function endTranslate( idX, idY) {
      DG.logUser("dragMovableValue: '%@'", this_.get('valueString'));
    }

    function overScope() {
      var tAttributes = { stroke: DG.PlotUtilities.kLineHighlightColor };
      this_.coverSeg.stop();
      this_.coverSeg.animate( tAttributes, DG.PlotUtilities.kHighlightShowTime);
    }

    function outScope() {
      var tAttributes = { stroke: DG.RenderingUtilities.kSeeThrough };
      this_.coverSeg.stop();
      this_.coverSeg.animate( tAttributes, DG.PlotUtilities.kHighlightHideTime);
    }

    //=============Main body of createElements===============

    if( this.myElements && (this.myElements.length > 0))
      return; // already created
    var tPaper = this.get('paper'),
        tCur = (this.getPath('valueAxisView.orientation') === 'horizontal') ?
                  this.kLineSlideHCur : this.kLineSlideVCur;
    this.lineSeg = tPaper.line( 0, 0, 0, 0)
              .attr({ stroke: DG.PlotUtilities.kDefaultMovableLineColor,
                      'stroke-opacity': 0 });
    this.coverSeg = this.lineSeg.clone()
              .attr( { 'stroke-width': 5, stroke: DG.RenderingUtilities.kSeeThrough,
                        cursor: tCur, title: "Drag the value" })
              .hover( overScope, outScope)
              .drag( continueTranslate, beginTranslate, endTranslate);

    this.myElements = [ this.lineSeg, this.coverSeg ];
    this.myElements.push( this.createTextElement());
    this.lineSeg.animatable = true;
    this.textElement.animatable = true;
    this.lineSeg.animate({ 'stroke-opacity': 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
    this.textElement.animate({ opacity: 1 }, DG.PlotUtilities.kDefaultAnimationTime, '<>');
    this.myElements.forEach( function( iElement) {
      tLayer.push( iElement);
    });
  },

  /**
    Compute the positions of the line segment and text element
  */
  updateToModel: function() {
    if( this.myElements === null)
      this.createElements();

    var tAxisView = this.get('valueAxisView'),
        tValue = this.getPath('model.value'),
        tValueCoord = tAxisView && tAxisView.dataToCoordinate( tValue),
        tPaper = this.get('paper'),
        tPt1, tPt2;
    
    if( !tAxisView) return;
    
    if( this.getPath('model.isVisible')) {
      if( tAxisView.get('orientation') === 'horizontal') {
        tPt1 = { x: tValueCoord, y: tPaper.height };
        tPt2 = { x: tValueCoord, y: 0 };
      }
      else {
        tPt1 = { x: 0, y: tValueCoord };
        tPt2 = { x: tPaper.width, y: tValueCoord };
      }
      
      DG.RenderingUtilities.updateLine( this.lineSeg, tPt1, tPt2);
      DG.RenderingUtilities.updateLine( this.coverSeg, tPt1, tPt2);
  
      this.updateTextToModel( 1/3); // Offset 1/3 way down from top
    }
  }

});

