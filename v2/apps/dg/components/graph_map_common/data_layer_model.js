// ==========================================================================
//                            DG.DataLayerModel
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

/** @class  DG.DataLayerModel - The model for a for use in a display situation such as a graph or map.

 @extends SC.Object
 */
DG.DataLayerModel = SC.Object.extend( DG.Destroyable,
  /** @scope DG.DataLayerModel.prototype */
  {
    autoDestroyProperties: [ 'legend' ],

    /**
     * @property {number} May be used to access controller for calls to createComponentStorage and
     * restoreComponentStorage for purposes of undo/redo
     */
    componentID: null,

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
     * This function is passed as an accessor to certain plots and axes
     * @return {*}
     */
    getPointColor: function() {
      return this.get('pointColor');
    },

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
      var tLegendAttribute = this.hasLegendVar() &&
            this.getPath('dataConfiguration.legendAttributeDescription.attribute'),
          tLegendColorMap = tLegendAttribute && tLegendAttribute.get('categoryMap');
      if( iValue !== undefined) {
        this._strokeColor = iValue;
        if(tLegendColorMap)
            tLegendColorMap['stroke-color'] = iValue;
      }
      var tLegendStrokeColor = DG.ColorUtilities.getStrokeColorFromColorMap( tLegendColorMap),
          tResult = tLegendStrokeColor || this._strokeColor ||
              (tLegendAttribute ? DG.PlotUtilities.kDefaultStrokeColorWithLegend :
                  DG.PlotUtilities.kDefaultStrokeColor);
      return tResult;
    }.property(),

    strokeTransparency: function( iKey, iValue) {
      var tLegendAttribute = this.hasLegendVar() &&
            this.getPath('dataConfiguration.legendAttributeDescription.attribute'),
          tLegendColorMap = tLegendAttribute && tLegendAttribute.get('categoryMap');
      if( iValue !== undefined) {
        this._strokeTransparency = iValue;
        if(tLegendColorMap)
          tLegendColorMap['stroke-transparency'] = iValue;
      }
      var tLegendStrokeTransparency = tLegendColorMap ? tLegendColorMap['stroke-transparency'] : null,
          tResult;
      if (!SC.none(tLegendStrokeTransparency))
        tResult = tLegendStrokeTransparency;
      else if (!SC.none(this._strokeTransparency))
        tResult = this._strokeTransparency;
      else
        tResult = tLegendAttribute ? DG.PlotUtilities.kDefaultStrokeOpacityWithLegend :
            DG.PlotUtilities.kDefaultStrokeOpacity;
      return tResult;
    }.property(),

    /**
     * If true, then the stroke color/transparency will be the same as that used to fill the element
     * @property {Boolean}
     */
    strokeSameAsFill: false,

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

     },

    destroy: function() {
      if( this.get('dataContext'))
         this.get('dataContext').removeObserver('changeCount', this, 'handleDataContextNotification');
      sc_super();
      // Special case in which we have to destroy a property _after_ rest of destroy has happened in order to
      // allow all observers of dataConfiguration to get removed.
      this.destroyProperty('dataConfiguration');
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
     * Subclasses will append if necessary.
     * These appear in the configurationPane of the inspector
     * @property {[SC.Control]}
     */
    lastConfigurationControls: function() {
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
      else if( tContext && !tContext.hasObserverFor('changeCount', this)) {
        tContext.addObserver('changeCount', this, 'handleDataContextNotification');
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

    childmostCollectionTitle: function() {
      return this.getPath('dataConfiguration.childmostCollection.title');
    }.property(),

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
      this.setPath('dataConfiguration.displayOnlySelected', iStorage.displayOnlySelected);

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
      if( !SC.none( iStorage.strokeSameAsFill))
        this.set('strokeSameAsFill', iStorage.strokeSameAsFill);
    },

    handleOneDataContextChange: function( iNotifier, iChange) {
      var tOperation = iChange && iChange.operation;

      switch( tOperation) {
        case 'deleteAttributes':
          iChange.attrs.forEach(function (iAttr) {
            iAttr = iAttr.attribute || iAttr; // We get here with two forms. Cover both.
            ['x', 'y', 'legend', 'y2', 'area'].forEach(function (iKey) {
              var tDescKey = iKey + 'AttributeDescription',
                  tAxisKey = iKey + 'Axis',
                  tAttrs = this.getPath('dataConfiguration.' + tDescKey + '.attributes');
              if(tAttrs) {
                tAttrs.forEach(function (iPlottedAttr, iIndex) {
                  if (iPlottedAttr === iAttr) {
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
          this.reset();
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
      var tConfig = this.get('dataConfiguration');
      if(tConfig)
        tConfig.synchHiddenCases();
    },

    /**
     * Subclasses will override
     * @param iChange {Object}
     */
    handleUpdateAttributes: function( iChange) {
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
        getPointColor: this_.getPointColor.bind(this_),
        getStrokeColor: function() {
          return this_.get('strokeSameAsFill') ?  this_.get('pointColor') : this_.get('strokeColor');
        },
        getPointSizeMultiplier: function() {
          return this_.get('pointSizeMultiplier');
        },
        getTransparency: function() {
          return this_.get('transparency');
        },
        getStrokeTransparency: function() {
          return this_.get('strokeSameAsFill') ?  this_.get('transparency') : this_.get('strokeTransparency');
        },
        getStrokeSameAsFill: function() {
          return this_.get('strokeSameAsFill');
        }
      };
    },

    /** create a menu item that removes the attribute on the given axis/legend */
    createRemoveAttributeMenuItem: function( iAxisOrLegendView, iXYorLegend, isForSubmenu, iAttrIndex ) {
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
        case 'top':
        case 'right':
          tAction = this.removeSplitAttribute;
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
    createChangeAttributeTypeMenuItem: function( iAxisView, iXYorLegend ) {
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
          tSomethingIsUnselected = tSelection && tCases && (tSelection.get('length') < tCases.get('length')),
          tSomethingHidden = this.getPath('dataConfiguration.hiddenCases' ).length > 0,
          tHideSelectedNumber = (tSelection && tSelection.length > 1) ? 'Plural' : 'Sing',
          tHideUnselectedNumber = (tSelection && tCases &&
              (tCases.get('length') - tSelection.length > 1)) ? 'Plural' : 'Sing',
          tDisplayingOnlySelected = this.getPath('dataConfiguration.displayOnlySelected'),
          self = this;

      function hideSelectedCases() {
        DG.UndoHistory.execute(DG.Command.create({
          name: 'graph.display.hideSelectedCases',
          undoString: 'DG.Undo.hideSelectedCases',
          redoString: 'DG.Redo.hideSelectedCases',
          log: "Hide %@ selected cases".fmt(tSelection.length),
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'hideSelected',
              type: '',
              numberHidden: tSelection.length
            }
          },
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
        var tUnselected = DG.ArrayUtils.subtract( tCases, tSelection,
            function( iCase) {
              return iCase.get('id');
            });
        DG.UndoHistory.execute(DG.Command.create({
          name: 'graph.display.hideUnselectedCases',
          undoString: 'DG.Undo.hideUnselectedCases',
          redoString: 'DG.Redo.hideUnselectedCases',
          log: "Hide unselected cases",
          executeNotification: {
            action: 'notify',
            resource: 'component',
            values: {
              operation: 'hideUnselected',
              type: '',
              numberHidden: tUnselected.length
            }
          },
          execute: function() {
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
            self.setPath('dataConfiguration.displayOnlySelected', false );
            this._undoData = self.getPath('dataConfiguration.hiddenCases');
            self.get('dataConfiguration' ).showAllCases();
          },
          undo: function() {
            self.get('dataConfiguration' ).hideCases( this._undoData );
          }
        }));
      }

      function displayOnlySelected() {
        DG.UndoHistory.execute(DG.Command.create({
          name: 'graph.display.displayOnlySelected',
          undoString: 'DG.Undo.displayOnlySelected',
          redoString: 'DG.Redo.displayOnlySelected',
          log: "Display only selected cases",
          execute: function() {
            self.setPath('dataConfiguration.displayOnlySelected', true );
          },
        }));
      }

      return [
        // Note that these 'built' string keys will have to be specially handled by any
        // minifier we use
        { title: ('DG.DataDisplayMenu.hideSelected' + tHideSelectedNumber), isEnabled: tSomethingIsSelected,
          target: this, action: hideSelectedCases },
        { title: ('DG.DataDisplayMenu.hideUnselected' + tHideUnselectedNumber), isEnabled: tSomethingIsUnselected,
          target: this, action: hideUnselectedCases },
        { title: 'DG.DataDisplayMenu.showAll', isEnabled: tSomethingHidden || tDisplayingOnlySelected,
          target: this, action: showAllCases },
        { title: 'DG.DataDisplayMenu.displayOnlySelected', isEnabled: !tDisplayingOnlySelected,
          target: this, action: displayOnlySelected }
      ];
    },

    /**
     * Removing the attribute is just changing with null arguments
     */
    removeLegendAttribute: function() {
      this.changeAttributeForLegend( null, null);
    },

    /**
     * Subclasses will override
     */
    removeSplitAttribute: function() {
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

      function newAttributeCollectionIsDescendant() {

        function isDescendantOf(iColl1, iColl2) {
          // Is iColl1 a descendant of iColl2
          var tChildren = iColl2 && iColl2.get('children'),
              found = false;
          while (!found && tChildren) {
            var tChild = tChildren.length >= 0 && tChildren[0];
            if (tChild === iColl1)
              found = true;
            else tChildren = tChild && tChild.get('children');
          }
          return found;
        }

        if( !iAttrRefs)
          return false; // Since we didn't get an attribute, its collection is not a descendant

        // iAttrRefs.collection is actually a CollectionClient
        var tNewCollection = iAttrRefs.collection.get('collection'),
            tXCollection = dataConfiguration.getPath('xAttributeDescription.collectionClient.collection'),
            tYCollection = dataConfiguration.getPath('yAttributeDescription.collectionClient.collection'),
            tPolygonCollection = dataConfiguration.getPath('polygonAttributeDescription.collectionClient.collection'),
            tChildMost;
        if(tPolygonCollection)
          tChildMost = tPolygonCollection;
        else if( tXCollection && tYCollection){
          tChildMost = isDescendantOf(tXCollection, tYCollection) ? tXCollection : tYCollection;
        }
        else {
          tChildMost = tXCollection || tYCollection;
        }
        return isDescendantOf(tNewCollection, tChildMost);
      }

      var dataConfiguration = this.get('dataConfiguration');

      if( newAttributeCollectionIsDescendant())
        return; // Because legend attribute has to be at same level as or higher than existing data attributes

      this.set('aboutToChangeConfiguration', true ); // signals dependents to prepare

      if( iDataContext)
        dataConfiguration.set('dataContext', iDataContext);
      dataConfiguration.setAttributeAndCollectionClient('legendAttributeDescription', iAttrRefs);
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

