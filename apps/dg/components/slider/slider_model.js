// ==========================================================================
//                            DG.SliderModel
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

/** @class  DG.SliderModel - The model for a slider. Holds onto a global value.

 @extends SC.Object
 */
DG.SliderModel = SC.Object.extend(
  /** @scope DG.SliderModel.prototype */
  {
    /**
     @property { DG.AxisCellLinearModel }
     */
    axis: null,

    /**
     @property { DG.GlobalValue }
     */
    content: null,
  
    id: null,
    idBinding: '*content.id',
  
    name: null,
    nameBinding: '*content.name',
  
    value: null,
    valueBinding: '*content.value',

    /**
     * DG.GraphAnimator
     */
    animator: null,

    /**
     Prepare dependencies.
     */
    init: function() {
      sc_super();

      var axisModel = DG.CellLinearAxisModel.create();
      axisModel.setDataMinAndMax( 0, 10);
      this.set('axis', axisModel);
    },

    destroy: function() {
      DG.globalsController.destroyGlobalValue( this.get('content'));
      sc_super();
    },

    /**
     * Make sure the axis bounds encompass the current value. If they don't, use animation in the rescaling.
     */
    encompassValue: function() {
      var tAxis = this.get('axis'),
          tLower = tAxis.get('lowerBound'),
          tUpper = tAxis.get('upperBound'),
          tValue = this.get('value');
      if( (tValue < tLower) || (tValue > tUpper)) {
        var tNewLower = tLower,
            tNewUpper = tUpper,
            tAxisInfoArray = [];
        if( tValue < tLower)
          tNewLower = tValue - (tUpper - tValue) / 10;
        else
          tNewUpper = tValue + (tValue - tLower) / 10;
        if( SC.none( this.get('animator')))
          this.set('animator', DG.GraphAnimator.create());
        tAxisInfoArray.push ( { axis: tAxis, newBounds: { lower: tNewLower, upper: tNewUpper } });
        DG.sounds.playDrag();
        this.get('animator').set('axisInfoArray', tAxisInfoArray)
                            .animate();
      }
    },

    /**
     Return the plot's notion of gear menu items concatenated with mine.
     @return {Array of menu items}
     */
    getGearMenuItems: function() {
      return [];
    },

    /**
     * The axis bounds have been changed such that the thumb is no longer visible; i.e. the value is no longer
     * within these bounds. Bring them back in.
     */
    bringValueInBounds: function() {
      // If the axis is animating, it's probably animating so that it will
      // encompass the new value. Wait until it's finished before trying
      // to adjust the value so it fits within the axis bounds.
      if( this.getPath('animator.isAnimating'))
        return;
      var tAxis = this.get('axis'),
          tLower = tAxis.get('lowerBound'),
          tUpper = tAxis.get('upperBound'),
          tValue = this.get('value');
      if( tValue < tLower)
        this.set('value', tLower);
      else if( tValue > tUpper)
        this.set('value', tUpper);
    }.observes('.axis.lowerBound', '.axis.upperBound'),
    
    toLink: function() {
      var content = this.get('content');
      return content ? content.toLink() : null;
    }
    
  } );

