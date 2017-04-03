// ==========================================================================
//                            DG.DataDisplayModel
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

sc_require('alpha/destroyable');
sc_require('components/graph/utilities/plot_utilities');

/** @class  DG.DataDisplayModel - The model for a for use in a display situation such as a graph or map.

 @extends SC.Object
 */
DG.DataDisplayModel = SC.Object.extend( DG.Destroyable,
  /** @scope DG.DataDisplayModel.prototype */
  {
    autoDestroyProperties: [ 'dataConfiguration', 'legend' ],

    /**
     @property { DG.LegendModel }
     */
    legend: null,

    /**
     @property { DG.GraphDataConfiguration }
     */
    dataConfiguration: null,

    /**
     * @property {String}
     */
    defaultTitle: function() {
      return this.getPath('dataConfiguration.defaultTitle');
    }.property(),

    defaultTitleChanged: function() {
      this.notifyPropertyChange('defaultTitle');
    }.observes('*dataConfiguration.defaultTitle'),

    /**
      @property { DG.CollectionClient }
    */
    collectionClient: null,
    collectionClientBinding: '*dataConfiguration.collectionClient',

    /**
      The plot model needs access to the cases controller that is stored in my dataConfiguration's
        collection client.
      @property { SC.ArrayController }
    */
    casesController: null,
    casesControllerBinding: '*dataConfiguration.collectionClient.casesController',

    /**
     * @property {Array} of DG.Case
     */
    cases: function() {
      return this.getPath('dataConfiguration.cases');
    }.property(),

    casesDidChange: function() {
      this.notifyPropertyChange('cases');
    }.observes('*dataConfiguration.cases'),
    
    /**
      @property { SC.SelectionSet }
    */
    selection: function() {
      return this.getPath('dataConfiguration.selection');
    }.property(),

    selectionDidChange: function() {
      this.notifyPropertyChange('selection');
    }.observes('*dataConfiguration.selection'),
    
    /**
     Work around current notification bug whereby we get notified that number of cases has
     changed even when it hasn't.
     @property {Number}
     */
    _oldNumberOfCases: 0,

    /**
     * Point color default can be changed by user.
     * @property {String} representing a color
     */
    pointColor: DG.PlotUtilities.kDefaultPointColor,

    /**
     * Stroke color default can be changed by user.
     * @property {String} representing a color
     */
    _strokeColor: null,
    /**
     * @property{Number} between 0 and 1
     */
    _strokeTransparency: null,

    strokeColor: function( iKey, iValue) {
      if( iValue !== undefined)
        this._strokeColor = iValue;
      return this._strokeColor ||
          ( this.hasLegendVar() ?
              DG.PlotUtilities.kDefaultStrokeColorWithLegend :
              DG.PlotUtilities.kDefaultStrokeColor);
    }.property(),

    strokeTransparency: function( iKey, iValue) {
      if( iValue !== undefined)
        this._strokeTransparency = iValue;
      return this._strokeTransparency ||
          ( this.hasLegendVar() ?
              DG.PlotUtilities.kDefaultStrokeOpacityWithLegend :
              DG.PlotUtilities.kDefaultStrokeOpacity);
    }.property(),

    hasLegendVar: function() {
      return !SC.none( this.getPath('dataConfiguration.legendAttributeDescription.attributeID'));
    },

    /**
     * Point size is computed at the view level and then multiplied by this number. Default is 1.
     * @property {Number} between 0 and 2
     */
    pointSizeMultiplier: 1,

    /**
     * Needed for MapPointLayer that relies on this accessor in call to PlotLayer::CalcPointRadius
     * @returns {Number}
     */
    getPointSizeMultiplier: function() {
      return this.get('pointSizeMultiplier');
    },

    /**
     * Point size is computed at the view level and then multiplied by this number. Default is 1.
     * @property {Number} between 0 and 2
     */
    transparency: DG.PlotUtilities.kDefaultPointOpacity,

    /**
     Prepare dependencies.
     */
    init: function() {
      sc_super();

      var tConfiguration = this.get('dataConfigurationClass').create(),
          tContext = tConfiguration.get('dataContext');
      // If the context has been discovered in the init of the configuration, we take this opportunity
      // to hook up our observer to it.
      if( tContext) {
        tContext.addObserver('changeCount', this, 'handleDataContextNotification');
      }
      this.set( 'dataConfiguration', tConfiguration);

      var tLegendDescription = tConfiguration.get('legendAttributeDescription');

      this.set('legend', DG.LegendModel.create( { dataConfiguration: tConfiguration }));
      this.setPath('legend.attributeDescription', tLegendDescription);
    },

    destroy: function() {
      if( this.get('dataContext'))
         this.get('dataContext').removeObserver('changeCount', this, 'handleDataContextNotification');
      sc_super();
    },

    /**
     * This is called when the dataContext has changed. We prepare to accept a new dataContext and be
     * reconfigured with new axes, plots, and legends.
     */
    reset: function() {
      this.init();
    },

    /**
     * Subclasses will append if necessary.
     * These appear in the valuePane of the inspector
     * @property {[SC.Control]}
     */
    lastValueControls: function() {
      return [];
    }.property(),

    /**
     * Default is true. Subclasses will override as desired.
     * @returns {boolean}
     */
    wantsInspector: function() {
      return true;
    },

    /**
      The data context for the graph. Set by caller after construction initially and
      reset for graphs restored from document to point to the restored data context.
      @property   {DG.DataContext}
     */
    dataContext: function( iKey, iValue) {
      var tContext = this.getPath('dataConfiguration.dataContext');
      if( iValue) {
        if( iValue !== tContext) {
          if( tContext){
            tContext.removeObserver('changeCount', this, 'handleDataContextNotification');
          }
          this.setPath('dataConfiguration.dataContext', iValue);
          iValue.addObserver('changeCount', this, 'handleDataContextNotification');
        }
        return this;
      }
      return this.getPath('dataConfiguration.dataContext');
    }.property(),  // Todo: Figure out if this can be cacheable

    _dataContextDidChange: function() {
      this.notifyPropertyChange('dataContext');
    }.observes('*dataConfiguration.dataContext'),
    
    /**
      Called when the 'dataContext' property is changed.
     */
    dataContextDidChange: function() {
      var tContext = this.get('dataConfiguration.dataContext');
      if( tContext && !tContext.hasObserverFor('changeCount'))
        tContext.addObserver('changeCount', this, 'handleDataContextNotification');
    }.observes('dataContext'),

    /**
      Delete the currently selected cases.
      Passes the request on to the data context to do the heavy lifting.
     */
    deleteSelectedCases: function() {
      var tContext = this.get('dataContext'),
          tSelectedCases = this.get('selection'),
          tChange;
      if( tContext) {
        tChange = {
          operation: 'selectCases',
          select: false,
          cases: tSelectedCases
        };
        tContext.applyChange( tChange);
        tChange = {
          operation: 'deleteCases',
          cases: tSelectedCases
        };
        tContext.applyChange( tChange);
      }
    },

    /**
      Delete the currently unselected cases.
      Passes the request on to the data context to do the heavy lifting.
     */
    deleteUnselectedCases: function(){
      var tCases = this.getPath('dataConfiguration.cases');
      var tUnselected = DG.ArrayUtils.subtract( tCases, this.get('selection'),
                                                            function( iCase) {
                                                              return iCase.get('id');
                                                            });
      var tChange = {
            operation: 'deleteCases',
            cases: DG.copy(tUnselected)
          };
      this.get('dataContext').applyChange( tChange);
    },

    /**
      Select/deselect all of the points in all the plots.
      @param  {Boolean}   iSelect -- True to select all points, false to deselect all.
                                      Defaults to true (select all) if undefined/null.
     */
    selectAll: function( iSelect) {
      var tSelect = SC.none( iSelect) ? true : !!iSelect,
          tCases = tSelect ? this.get('cases') : null,  // null means all cases, even hidden ones
          tContext = this.get('dataContext'),
          tChange = {
            operation: 'selectCases',
            collection: this.get('collectionClient'),
            cases: tCases,
            select: tSelect
          };
      if (tContext) {
        tContext.applyChange( tChange);
      }
      DG.logUser( iSelect ? "selectAll" : "deselectAll");
    },

    /**
     * Utility function for use by subclasses.
     * @param iStorage
     * @param iCollLinkName
     * @param iAttrLinkName
     * @returns {*}
     */
    instantiateAttributeRefFromStorage: function( iStorage, iCollLinkName, iAttrLinkName) {
      var kNullResult = { collection: null, attributes: [] },
          tDataContext = this.getPath('dataConfiguration.dataContext');
      if( SC.empty( iCollLinkName) || SC.empty( iAttrLinkName) || !iStorage || !iStorage._links_)
        return kNullResult;

      var collLink = iStorage._links_[ iCollLinkName],
          coll = collLink && collLink.id && tDataContext.getCollectionByID( collLink.id),
          attrs = [],
          tLinkCount = DG.ArchiveUtils.getLinkCount( iStorage, iAttrLinkName ),
          tIndex;
      if( !coll)
        return kNullResult;

      for( tIndex = 0; tIndex < tLinkCount; tIndex++) {
        var tAttr = coll.getAttributeByID( DG.ArchiveUtils.getLinkID( iStorage, iAttrLinkName, tIndex));
        if( tAttr)
          attrs.push(tAttr);
      }
      return { collection: coll, attributes: attrs };
    },

    /**
     * Use the properties of the given object to restore my hidden cases.
     * Subclasses can override but should call sc_super.
     * @param iStorage {Object}
     */
    restoreStorage: function( iStorage) {
      // CODAP builds prior to 0289 stored hidden cases not as links, but as simple case IDs.
      // More recent builds store links, which we now convert on restore.
      var tHiddenCasesLinks = iStorage._links_ && iStorage._links_.hiddenCases;
      if( SC.isArray( tHiddenCasesLinks)) {
        var tLinkCount = DG.ArchiveUtils.getLinkCount( iStorage, 'hiddenCases'),
            tIndex;
        iStorage.hiddenCases = [];
        for( tIndex = 0; tIndex < tLinkCount; tIndex++) {
          iStorage.hiddenCases.push( DG.ArchiveUtils.getLinkID( iStorage, 'hiddenCases', tIndex));
        }
      }
      this.get('dataConfiguration').restoreHiddenCases( iStorage.hiddenCases);

      if( !SC.none( iStorage.pointColor))
        this.set('pointColor', iStorage.pointColor);
      if( !SC.none( iStorage.strokeColor))
        this.set('strokeColor', iStorage.strokeColor);
      if( !SC.none( iStorage.pointSizeMultiplier))
        this.set('pointSizeMultiplier', iStorage.pointSizeMultiplier);
      if( !SC.none( iStorage.transparency))
        this.set('transparency', iStorage.transparency);
      if( !SC.none( iStorage.strokeTransparency))
        this.set('strokeTransparency', iStorage.strokeTransparency);
    },

    handleOneDataContextChange: function( iNotifier, iChange) {
      var tOperation = iChange && iChange.operation;

      switch( tOperation) {
        case 'deleteAttributes':
          iChange.attrs.forEach(function (iAttr) {
            ['x', 'y', 'legend', 'y2', 'area'].forEach(function (iKey) {
              var tDescKey = iKey + 'AttributeDescription',
                  tAxisKey = iKey + 'Axis',
                  tAttrs = this.getPath('dataConfiguration.' + tDescKey + '.attributes');
              if(tAttrs) {
                tAttrs.forEach(function (iPlottedAttr, iIndex) {
                  if (iPlottedAttr === iAttr.attribute) {
                    if (iKey === 'legend')
                      this.removeLegendAttribute();
                    else
                      this.removeAttribute(tDescKey, tAxisKey, iIndex);
                  }
                }.bind(this));
              }
            }.bind(this));
          }.bind( this));
          break;
        case 'deleteCollection':
          this.dataContextOrCollectionWasDeleted(iChange.collection); // jshint ignore:line
          // fallthrough deliberate
        case 'updateAttributes':
          this.handleUpdateAttributes( iChange);
          break;
        case 'createCollection':
          this.notifyPropertyChange('caseOrder');
          break;
        case 'deleteDataContext':
          this.dataContextOrCollectionWasDeleted();
          break;
        default:
          // Nothing to do
      }
      // Give the legend a chance
      var tLegend = this.get('legend');
      if( tLegend)
          tLegend.handleOneDataContextChange( iNotifier, iChange);
    },


    dataContextOrCollectionWasDeleted: function ( iCollection) {
      DG.log('dataContextWasDeleted');
      ['x', 'y', 'legend', 'y2', 'area'].forEach(function (iKey) {
        var tDescKey = iKey + 'AttributeDescription',
            tAxisKey = iKey + 'Axis',
            tCollectionClient = this.getPath('dataConfiguration.'
                + tDescKey + '.collectionClient'),
            tAttrs = this.getPath('dataConfiguration.' + tDescKey + '.attributes');
        if (tCollectionClient && tAttrs) {
          if (!iCollection || tCollectionClient === iCollection) {
            tAttrs.forEach(function (iPlottedAttr, iIndex) {
              if (iKey === 'legend')
                this.removeLegendAttribute();
              else
                this.removeAttribute(tDescKey, tAxisKey, iIndex);
            }.bind(this));
          }
        }
      }.bind(this));
      this.get('dataConfiguration').synchHiddenCases();
    },
    /**
     * One or more of the attributes used on this graph has been changed; e.g. by having its name changed.
     * We pass responsibility for dealing with the change to the appropriate sub-model.
     * @param iChange {Object}
     */
    handleUpdateAttributes: function( iChange) {
      var tDataConfiguration = this.get('dataConfiguration'),
          tChangedAttrIDs = iChange && iChange.result && iChange.result.attrIDs;
      if( SC.isArray( tChangedAttrIDs)) {
        tChangedAttrIDs.forEach( function( iAttrID) {
          ['x', 'y', 'y2', 'legend'].forEach( function( iKey) {
            var tAssignedAttrs = tDataConfiguration.getPath( iKey + 'AttributeDescription.attributes'),
                tAssignedAttrIDs = tAssignedAttrs && tAssignedAttrs.map(function (iAttr) {
                      return iAttr.get('id');
                    });
            if( tAssignedAttrIDs && tAssignedAttrIDs.indexOf( iAttrID) >= 0) {
              var tSubModel = (iKey === 'legend') ? this.get( iKey) : this.get( iKey + 'Axis');
              if( tSubModel)
                tSubModel.handleUpdateAttribute( iAttrID);
            }
          }.bind( this));
        }.bind( this));
      }
    },

    /**
      Returns an array of indices corresponding to the indices
      of the cases affected by the specified change.
     */
    buildIndices: function( iChange) {
      var srcCases = this.getPath('dataConfiguration.cases');
      if( (iChange.operation === 'updateCases') &&
          srcCases && !SC.none( iChange.cases) &&
          !this.getPath('dataConfiguration.hasAggregates')) {
        var updatedCasesByID = {},
            indices = SC.IndexSet.create();
        // Build a map of IDs for affected cases
        iChange.cases.forEach( function( iCase) {
                                updatedCasesByID[ iCase.get('id')] = iCase;
                               });
        // Loop through source cases to determine indices for the affected cases
        srcCases.forEach( function( iCase, iIndex) {
                            var caseID = iCase.get('id');
                            if( updatedCasesByID[ caseID])
                              indices.add( iIndex);
                          });
        return indices;
      }
      return SC.IndexSet.create( 0, this.getPath('dataConfiguration.cases.length'));
    },

    /**
      Responder for notifications from the DataContext.
     */
    handleDataContextNotification: function( iNotifier) {
      var newChanges = iNotifier.get('newChanges' ),
          tNumChanges = newChanges.length,
          i;
      for( i = 0; i < tNumChanges; i++) {
        this.handleOneDataContextChange( iNotifier, newChanges[ i]);
      }
    },

    getModelPointStyleAccessors: function() {
      var this_ = this;
      return {
        getPointColor: function() {
          return this_.get('pointColor');
        },
        getStrokeColor: function() {
          return this_.get('strokeColor');
        },
        getPointSizeMultiplier: function() {
          return this_.get('pointSizeMultiplier');
        },
        getTransparency: function() {
          return this_.get('transparency');
        },
        getStrokeTransparency: function() {
          return this_.get('strokeTransparency');
        }
      };
    },

    /** create a menu item that removes the attribute on the given axis/legend */
    createRemoveAttributeMenuItem: function( iXYorLegend, isForSubmenu, iAttrIndex ) {
      iAttrIndex = iAttrIndex || 0;
      var tDescKey = iXYorLegend + 'AttributeDescription',
          tAxisKey = iXYorLegend + 'Axis', // not used by removeLegendAttribute()
          tAttributes = this.getPath( 'dataConfiguration.' + tDescKey + '.attributes'),
          tAttribute = (SC.isArray( tAttributes) && iAttrIndex < tAttributes.length) ?
              tAttributes[ iAttrIndex] : DG.Analysis.kNullAttribute,
          tName = (tAttribute === DG.Analysis.kNullAttribute) ? '' : tAttribute.get( 'name'),
          tResourceName = isForSubmenu ? 'attribute_' : 'removeAttribute_',
          tTitle = ('DG.DataDisplayMenu.' + tResourceName + iXYorLegend).loc( tName ),
          tAction;
      switch( iXYorLegend) {
        case 'x':
        case 'y':
        case 'y2':
          tAction = this.removeAttribute;
          break;
        case 'legend':
          tAction = this.removeLegendAttribute;
          break;
      }
      return {
        title: tTitle,
        target: this,
        itemAction: tAction,
        isEnabled: (tAttribute !== DG.Analysis.kNullAttribute),
        log: "attributeRemoved: { attribute: %@, axis: %@ }".fmt(tName, iXYorLegend),
        args: [ tDescKey, tAxisKey, iAttrIndex ] };
    },

    /** create a menu item that changes the attribute type on the given axis/legend */
    createChangeAttributeTypeMenuItem: function( iXYorLegend ) {
      var tDescKey = iXYorLegend + 'AttributeDescription',
          tAxisKey = iXYorLegend + 'Axis',
          tDescription = this.getPath( 'dataConfiguration.' + tDescKey),
          tAttribute = tDescription && tDescription.get( 'attribute'),
          tAttributeName = tAttribute && (tAttribute !== -1) ? tAttribute.get('name') : '',
          tIsNumeric = tDescription && tDescription.get( 'isNumeric'),
          tTitle =( tIsNumeric ? 'DG.DataDisplayMenu.treatAsCategorical' : 'DG.DataDisplayMenu.treatAsNumeric').loc();
      return {
        title: tTitle,
        target: this,
        itemAction: this.changeAttributeType, // call with args, toggling 'numeric' setting
        isEnabled: (tAttribute !== DG.Analysis.kNullAttribute),
        log: "plotAxisAttributeChangeType: { axis: %@, attribute: %@, numeric: %@ }".fmt( tAxisKey, tAttributeName, !tIsNumeric),
        args: [ tDescKey, tAxisKey, !tIsNumeric ] };
    },

    /** Submenu items for hiding selected or unselected cases, or showing all cases */
    createHideShowSelectionMenuItems: function() {
      var tSelection = this.getPath('dataConfiguration.selection' ).toArray(),
          tSomethingIsSelected = tSelection && tSelection.get('length') !== 0,
          tCases = this.getPath('dataConfiguration.cases' ),
          tSomethingIsUnselected = tSelection && tCases && (tSelection.get('length') < tCases.length),
          tSomethingHidden = this.getPath('dataConfiguration.hiddenCases' ).length > 0,
          tHideSelectedNumber = (tSelection && tSelection.length > 1) ? 'Plural' : 'Sing',
          tHideUnselectedNumber = (tSelection && tCases &&
              (tCases.length - tSelection.length > 1)) ? 'Plural' : 'Sing',
          self = this;

      function hideSelectedCases() {
        DG.UndoHistory.execute(DG.Command.create({
          name: 'graph.display.hideSelectedCases',
          undoString: 'DG.Undo.hideSelectedCases',
          redoString: 'DG.Redo.hideSelectedCases',
          log: "Hide %@ selected cases".fmt(tSelection.length),
          execute: function() {
            this._undoData = tSelection;
            self.get('dataConfiguration' ).hideCases( tSelection );
          },
          undo: function() {
            self.get('dataConfiguration' ).showCases( this._undoData );
          },
          redo: function() {
            self.get('dataConfiguration' ).hideCases( this._undoData );
          }
        }));
      }

      function hideUnselectedCases() {
        DG.UndoHistory.execute(DG.Command.create({
          name: 'graph.display.hideUnselectedCases',
          undoString: 'DG.Undo.hideUnselectedCases',
          redoString: 'DG.Redo.hideUnselectedCases',
          log: "Hide unselected cases",
          execute: function() {
            var tUnselected = DG.ArrayUtils.subtract( tCases, tSelection,
                function( iCase) {
                  return iCase.get('id');
                });
            this._undoData = tUnselected;

            this.log = "Hide %@ unselected cases".fmt(tUnselected.length);
            self.get('dataConfiguration' ).hideCases( tUnselected );
          },
          undo: function() {
            self.get('dataConfiguration' ).showCases( this._undoData );
          },
          redo: function() {
            self.get('dataConfiguration' ).hideCases( this._undoData );
          }
        }));
      }

      function showAllCases() {
        DG.UndoHistory.execute(DG.Command.create({
          name: 'graph.display.showAllCases',
          undoString: 'DG.Undo.showAllCases',
          redoString: 'DG.Redo.showAllCases',
          log: "Show all cases",
          execute: function() {
            this._undoData = self.getPath('dataConfiguration.hiddenCases');
            self.get('dataConfiguration' ).showAllCases();
          },
          undo: function() {
            self.get('dataConfiguration' ).hideCases( this._undoData );
          }
        }));
      }

      return [
        // Note that these 'built' string keys will have to be specially handled by any
        // minifier we use
        { title: ('DG.DataDisplayMenu.hideSelected' + tHideSelectedNumber), isEnabled: tSomethingIsSelected,
          target: this, action: hideSelectedCases },
        { title: ('DG.DataDisplayMenu.hideUnselected' + tHideUnselectedNumber), isEnabled: tSomethingIsUnselected,
          target: this, action: hideUnselectedCases },
        { title: 'DG.DataDisplayMenu.showAll', isEnabled: tSomethingHidden,
          target: this, action: showAllCases }
      ];
    },

    /**
     * Removing the attribute is just changing with null arguments
     */
    removeLegendAttribute: function() {
      this.changeAttributeForLegend( null, null);
    },

    /**
     * Change the attribute type (EAttributeType) on the axis described by the given key,
     * to treat a Numeric attribute as Categorical.
     * @param{String} iDescKey - key to the desired attribute description (x...|y...|legendAttributeDescription)
     * @param{String} iAxisKey - key to the axis whose attribute is to be removed (x...|yAxis)
     * @param{Boolean} true if we want to treat the attribute as numeric (else categorical).
     */
    changeAttributeType: function( iDescKey, iAxisKey, iTreatAsNumeric ) {
      var tDataConfiguration = this.get('dataConfiguration');

      // We're handling a case specific to graphs here for convenience
      if( !iTreatAsNumeric && this.getY2Plot && this.getY2Plot()) {
        this.removeAttribute('y2AttributeDescription', 'y2Axis', 0);
      }

      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      tDataConfiguration.setAttributeType( iDescKey, iTreatAsNumeric );

      if( iDescKey === 'xAttributeDescription' || iDescKey === 'yAttributeDescription')
        this.privSyncAxisWithAttribute( iDescKey, iAxisKey );
      this.invalidate( null, true /* also invalidate plot caches */);
      this.set('aboutToChangeConfiguration', false ); // reset for next time
    },

    /**
     Sets the attribute for the legend.
     @param  {DG.DataContext}      iDataContext -- The data context for this graph
     @param  {Object}              iAttrRefs -- The attribute to set for the axis
     {DG.CollectionClient} iAttrRefs.collection -- The collection that contains the attribute
     {DG.Attribute}        iAttrRefs.attribute -- Array of attributes to set for the legend
     */
    changeAttributeForLegend: function( iDataContext, iAttrRefs) {
      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      var dataConfiguration = this.get('dataConfiguration'),
          tStartingLegendAttrID = dataConfiguration.getPath('legendAttributeDescription.attributeID');
      if( iDataContext)
        dataConfiguration.set('dataContext', iDataContext);
      dataConfiguration.setAttributeAndCollectionClient('legendAttributeDescription', iAttrRefs);
      var tNewLegendAttrID = dataConfiguration.getPath('legendAttributeDescription.attributeID');
      // If we're going from having a legend to no legend or vice versa, reset the stroke color and transparency
      if( (SC.none( tStartingLegendAttrID) && !SC.none( tNewLegendAttrID)) ||
          (!SC.none( tStartingLegendAttrID) && SC.none( tNewLegendAttrID))) {
        this.set('strokeColor', null);
        this.set('strokeTransparency', null);
      }
      this.invalidate();
      this.set('aboutToChangeConfiguration', false ); // reset for next time
    },

    /**
     @private
     */
    dataRangeDidChange: function( iSource, iKey, iObject, iIndices) {
      this.invalidate();
    },

    /**
     *
     * @param iChange
     * @param iInvalidateDisplayCaches {Boolean}
     */
    invalidate: function( iChange, iInvalidateDisplayCaches) {
      this.get( 'dataConfiguration' ).invalidateCaches( null, iChange);
    }

  } );

