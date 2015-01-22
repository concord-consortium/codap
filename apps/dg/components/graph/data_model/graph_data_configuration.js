// ==========================================================================
//                      DG.GraphDataConfiguration
//
//  Author:   William Finzer
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
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

sc_require('components/graph_map_common/plot_data_configuration');

/** @class  DG.GraphDataConfiguration - The object that describes the manner in which attributes are
    assigned to places in a graph.

  @extends DG.PlotDataConfiguration
*/
DG.GraphDataConfiguration = DG.PlotDataConfiguration.extend(
/** @scope DG.GraphDataConfiguration.prototype */ 
{
  /**
   * It is in initialization that we specialize from base class
   */
  init: function() {

    var attributeDescriptions = {
                                  x: DG.AttributePlacementDescription.create(),
                                  y: DG.AttributePlacementDescription.create(),
                                  legend: DG.AttributePlacementDescription.create()
                                },
        tPlace,
        tDefaults = DG.currDocumentController().collectionDefaults();

    sc_super();
    
    /**
        Utility function for use in confuguring the attribute descriptions
        @param  {String}    iAttrPrefix -- {'x','y','legend'}
        @param  {String}    iAttrInfix -- {'X','Y','Legend'}
        @param  {Number}    iNumericRole -- Numeric analysis role
        @param  {Number}    iCategoricalRole -- Categorical analysis role
     */
    var configAttrDesc = function( iAttrPrefix, iAttrInfix, iNumericRole, iCategoricalRole) {
      var attrDesc = attributeDescriptions[ iAttrPrefix],
          attrSpec = tDefaults['plot' + iAttrInfix + 'Attr'],
          isAttrNumeric = tDefaults['plot' + iAttrInfix + 'AttrIsNumeric'];
          
      DG.assert( attrDesc);
      
      // Configure the attribute description for the specified default attribute
      //if( attrSpec) {
      //  // Must set collection before attribute for attribute stats to be configured properly
      //  attrDesc.set('collectionClient', tDefaults.collectionClient);
      //  attrDesc.set('attribute', attrSpec);
      //  attrDesc.setPath('attributeStats.attributeType',
      //                  SC.none( attrSpec)
      //                      ? DG.Analysis.EAttributeType.eNone
      //                      : isAttrNumeric
      //                          ? DG.Analysis.EAttributeType.eNumeric
      //                          : DG.Analysis.EAttributeType.eCategorical);
      //  attrDesc.set('role',
      //                SC.none( attrSpec)
      //                    ? DG.Analysis.EAnalysisRole.eNone
      //                    : isAttrNumeric ? iNumericRole : iCategoricalRole);
      //}
      //
      //// Null out the attribute description when no default attribute is specified.
      //else {
        attrDesc.set('collectionClient', null);
        attrDesc.removeAllAttributes();
      //}
      
      // We must set these up manually, because the infrastructure isn't in place by
      // the time sc_super() (i.e. SC.Object.init()) is called.
      attrDesc.addObserver('collectionClient', this, iAttrPrefix + 'CollectionDidChange');
    }.bind( this);
    
    configAttrDesc('x', 'X', DG.Analysis.EAnalysisRole.ePrimaryNumeric,
                             DG.Analysis.EAnalysisRole.ePrimaryCategorical);
    configAttrDesc('y', 'Y', DG.Analysis.EAnalysisRole.eSecondaryNumeric,
                             DG.Analysis.EAnalysisRole.eSecondaryCategorical);
    configAttrDesc('legend', 'Legend', DG.Analysis.EAnalysisRole.eLegendNumeric,
                                       DG.Analysis.EAnalysisRole.eLegendCategorical);

    // Prepare the attributes array. It has as many elements as there are places,
    //  and, initially, those elements are empty arrays.
    this.attributesByPlace = [];
    for( tPlace = 0; tPlace < DG.GraphTypes.EPlace.eNumPlaces; tPlace++)
      this.attributesByPlace[tPlace] = [];
    
    // Actually, during this coding transition, we're going to stash the previously
    // initialized attribute descriptions in attributesByPlace.
    this.attributesByPlace[ DG.GraphTypes.EPlace.eX][0] = attributeDescriptions.x;
    this.attributesByPlace[ DG.GraphTypes.EPlace.eY][0] = attributeDescriptions.y;
    this.attributesByPlace[ DG.GraphTypes.EPlace.eLegend][0] = attributeDescriptions.legend;
  }

});

