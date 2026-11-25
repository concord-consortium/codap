import { parse } from "mathjs/number"
import { comparer, makeObservable, observable, reaction, action } from "mobx"
import { addDisposer } from "mobx-state-tree"
import { uniqueId } from "../../utilities/js-utils"
import { boundaryManager, BoundaryManager } from "../boundaries/boundary-manager"
import { IDataSet } from "../data/data-set"
import { ICase } from "../data/data-set-types"
import { IGlobalValueManager } from "../global/global-value-manager"
import { IFormula } from "./formula"
import {
  IFormulaExtraMetadata, IFormulaManagerAdapter, IFormulaMetadata, IFormulaManager, CaseList
} from "./formula-manager-types"
import { IFormulaAdapterApi } from "./formula-manager-adapter"
import {
  observeBoundaries, observeGlobalValues, observeLocalAttributes, observeLookupDependencies, observeSymbolNameChanges
} from "./formula-observers"
import { canonicalToDisplay, displayToCanonical, preprocessDisplayFormula } from "./utils/canonicalization-utils"
import { getAggregateAndOrderSensitivity, getFormulaDependencies } from "./utils/formula-dependency-utils"
import {
  getAffectedFormulas, getDataSetHierarchyStructureKey, getHierarchySnapshot, HierarchySnapshot, IAffectedFormula,
  IHierarchyFormulaInfo
} from "./utils/hierarchy-change-utils"
import { formulaError, isRandomFunctionPresent } from "./utils/misc"
import { getCanonicalNameMap, getDisplayNameMap } from "./utils/name-mapping-utils"

// Maps `${dataSetId}:${attrId}` to the formulas that depend on that attribute. Each formula maps to true unless
// it references the attribute only inside prev().
type AttributeDependentsIndex = Map<string, Map<string, boolean>>

export class FormulaManager implements IFormulaManager {
  formulaMetadata = new Map<string, IFormulaMetadata>()
  extraMetadata = new Map<string, IFormulaExtraMetadata>()

  @observable.shallow dataSets = new Map<string, IDataSet>()
  // disposers for the per-data-set hierarchy change reactions
  hierarchyDisposers = new Map<string, () => void>()

  boundaryManager?: BoundaryManager
  globalValueManager?: IGlobalValueManager

  adapters: IFormulaManagerAdapter[] = []

  // Tracks formulas currently being recalculated, to prevent infinite recursion through
  // cycle-safe (selfReferenceAllowed) edges where recalculateDownstreamFormulas could
  // otherwise propagate back into a formula that is already higher in the call stack.
  recalculatingFormulas = new Set<string>()

  @observable
  areAdaptersInitialized = false

  // Unique identifier of this formula manager instance, useful for debugging.
  id = uniqueId()

  constructor() {
    makeObservable(this)
    this.boundaryManager = boundaryManager
  }

  getAdapterApi(): IFormulaAdapterApi {
    return {
      getDatasets: () => this.dataSets,
      getBoundaryManager: () => this.boundaryManager,
      getGlobalValueManager: () => this.globalValueManager,
      getFormulaContext: (formulaId: string) => this.getFormulaContext(formulaId),
      getFormulaExtraMetadata: (formulaId: string) => this.getExtraMetadata(formulaId)
    }
  }

  @action addAdapters(adapters: IFormulaManagerAdapter[]) {
    this.adapters.push(...adapters)
    this.registerActiveFormulas()
    this.areAdaptersInitialized = true
  }

  @action addDataSet(dataSet: IDataSet) {
    // addDataSet may be called more than once for the same dataset (e.g. an explicit
    // caller plus the document's dataset-sync reaction); registering twice would leak a
    // redundant disposer, so treat a repeat registration as a no-op.
    if (this.dataSets.has(dataSet.id)) return
    this.dataSets.set(dataSet.id, dataSet)
    this.hierarchyDisposers.set(dataSet.id, this.observeHierarchyChanges(dataSet))
    // remove the DataSet if it is destroyed
    addDisposer(dataSet, () => this.removeDataSet(dataSet.id))
  }

  @action removeDataSet(dataSetId: string) {
    // unregister all formulas associated with the removed DataSet
    const formulasToUnregister: string[] = []
    this.extraMetadata.forEach((extraMetadata, formulaId) => {
      if (extraMetadata.dataSetId === dataSetId) {
        formulasToUnregister.push(formulaId)
      }
    })
    formulasToUnregister.forEach(formulaId => this.unregisterFormula(formulaId))

    this.hierarchyDisposers.get(dataSetId)?.()
    this.hierarchyDisposers.delete(dataSetId)
    this.dataSets.delete(dataSetId)
  }

  // Recalculates only the attribute formulas affected when collections are added or removed or attributes are
  // added, removed or moved between collections. Changes are always measured against the stored snapshot rather
  // than the reaction's previous value, so the result doesn't depend on which reaction validates the cases first.
  observeHierarchyChanges(dataSet: IDataSet) {
    // Initialized when the reaction first runs, which is deferred to the end of the action that added the data
    // set, so collections built later in that action aren't treated as a change.
    let lastSnapshot: HierarchySnapshot | undefined
    let lastStructureKey: string | undefined
    return reaction(
      () => ({
        structure: getDataSetHierarchyStructureKey(dataSet),
        // observing the hashes does not force validation
        hashes: dataSet.collections.map(collection => collection.caseIdsOrderedHash)
      }),
      ({ structure }) => {
        if (!lastSnapshot || structure === lastStructureKey) {
          // Either the first run or the structure is unchanged (cases were added, removed, hidden, reordered or
          // regrouped by value edits). Only the snapshot is updated; this reaction doesn't recalculate formulas
          // for these changes.
          lastSnapshot = getHierarchySnapshot(dataSet)
          lastStructureKey = structure
          return
        }
        lastStructureKey = structure
        const formulaInfos = this.getHierarchyFormulaInfos(dataSet.id)
        if (formulaInfos.length === 0) {
          // Without formulas there is nothing to recalculate, so the cases can regroup whenever they're next used.
          lastSnapshot = getHierarchySnapshot(dataSet)
          return
        }
        // Undo/redo can change the structure before the data set's own reaction relinks the collections and
        // invalidates the cases, so relink and regroup explicitly.
        dataSet.syncCollectionLinks()
        dataSet.validateCases()
        const after = getHierarchySnapshot(dataSet)
        const affected = getAffectedFormulas(lastSnapshot, after, formulaInfos)
        lastSnapshot = after
        this.recalculateFormulasInOrder(affected)
      },
      { equals: comparer.structural, fireImmediately: true, name: "FormulaManager.observeHierarchyChanges.reaction" }
    )
  }

  // Returns the initialized attribute formulas of the given data set that have a canonical expression.
  getHierarchyFormulaInfos(dataSetId: string): IHierarchyFormulaInfo[] {
    const infos: IHierarchyFormulaInfo[] = []
    this.formulaMetadata.forEach(({ formula, isInitialized }, formulaId) => {
      const extraMetadata = this.extraMetadata.get(formulaId)
      const attrId = extraMetadata?.attributeId
      if (!isInitialized || !attrId || extraMetadata.dataSetId !== dataSetId) return
      const { canonical } = formula
      if (formula.empty || !canonical) return
      const localAttrDeps = getFormulaDependencies(canonical, attrId, extraMetadata.defaultArgument)
        .flatMap(dep => dep.type === "localAttribute" ? [dep.attrId] : [])
      infos.push({ formulaId, attrId, localAttrDeps, ...getAggregateAndOrderSensitivity(canonical) })
    })
    return infos
  }

  addGlobalValueManager(globalValueManager: IGlobalValueManager) {
    this.globalValueManager = globalValueManager
  }

  getFormulaMetadata(formulaId: string) {
    const formulaMetadata = this.formulaMetadata.get(formulaId)
    if (!formulaMetadata) {
      throw new Error(`Formula ${formulaId} not registered`)
    }
    return formulaMetadata
  }

  updateFormulaMetadata(formulaId: string, metadata: Partial<IFormulaMetadata>) {
    const prevMetadata = this.getFormulaMetadata(formulaId)
    this.formulaMetadata.set(formulaId, { ...prevMetadata, ...metadata })
  }

  getExtraMetadata(formulaId: string) {
    const extraMetadata = this.extraMetadata.get(formulaId)
    if (!extraMetadata) {
      throw new Error(`Formula ${formulaId} not registered`)
    }
    return extraMetadata
  }

  // Retrieves formula context like its attribute, dataset, etc. It also validates correctness of the formula
  // and its context.
  getFormulaContext(formulaId: string) {
    const formulaMetadata = this.getFormulaMetadata(formulaId)
    const extraMetadata = this.getExtraMetadata(formulaId)
    const dataSet = this.dataSets.get(extraMetadata.dataSetId)
    if (!dataSet) {
      throw new Error(`Dataset ${extraMetadata.dataSetId} not available`)
    }
    return { dataSet, ...formulaMetadata }
  }

  recalculateFormula(formulaId: string, casesToRecalculate?: ICase[] | "ALL_CASES") {
    // Skip re-entry for a formula already mid-recalculation in the current call stack.
    // Mutual prev() references (e.g. sunny = prev(rainy), rainy = prev(sunny)) now pass
    // cycle detection but their dependency edges are still walked by the downstream cascade,
    // which would otherwise recurse indefinitely.
    if (this.recalculatingFormulas.has(formulaId)) return
    const formulaContext = this.getFormulaContext(formulaId)
    const { adapter, isInitialized } = formulaContext
    if (!isInitialized) {
      return
    }
    this.recalculatingFormulas.add(formulaId)
    try {
      const extraMetadata = this.getExtraMetadata(formulaId)
      adapter.recalculateFormula(formulaContext, extraMetadata, casesToRecalculate)

      // After evaluating, recalculate any downstream formulas that depend on this formula's
      // output attribute. This replaces the reactive onAnyAction cascade for formula-to-formula
      // dependencies, using the static dependency graph instead of MST action dispatch.
      this.recalculateDownstreamFormulas(formulaId)
    } finally {
      this.recalculatingFormulas.delete(formulaId)
    }
  }

  // Maps each attribute (keyed by data set and attribute ID) to the initialized formulas that depend on it,
  // either as a local attribute dependency (same data set) or a lookup dependency (another data set).
  // Each formula's dependencies are parsed once.
  getAttributeDependentsIndex(): AttributeDependentsIndex {
    const index: AttributeDependentsIndex = new Map()
    const addDependent = (dataSetId: string, attrId: string | undefined, formulaId: string, isDirect: boolean) => {
      if (!attrId) return
      const key = `${dataSetId}:${attrId}`
      let dependents = index.get(key)
      if (!dependents) index.set(key, dependents = new Map())
      dependents.set(formulaId, isDirect || !!dependents.get(formulaId))
    }
    this.formulaMetadata.forEach((metadata, formulaId) => {
      const extraMetadata = this.extraMetadata.get(formulaId)
      const { formula } = metadata
      if (!metadata.isInitialized || !extraMetadata || formula.empty || !formula.canonical) return
      const { attributeId, dataSetId, defaultArgument } = extraMetadata
      getFormulaDependencies(formula.canonical, attributeId, defaultArgument).forEach(dep => {
        if (dep.type === "localAttribute") {
          addDependent(dataSetId, dep.attrId, formulaId, !dep.selfReferenceAllowed)
        } else if (dep.type === "lookup") {
          addDependent(dep.dataSetId, dep.attrId, formulaId, true)
          addDependent(dep.dataSetId, dep.otherAttrId, formulaId, true)
        }
      })
    })
    return index
  }

  // Returns the initialized formulas that depend directly on the given formula's output attribute, excluding
  // formulas that compute the same attribute. Pass an index from getAttributeDependentsIndex() to reuse it.
  // With `excludePrevOnly`, formulas that reference the attribute only inside prev() are excluded.
  getDirectDownstreamFormulaIds(
    formulaId: string, index?: AttributeDependentsIndex, options?: { excludePrevOnly?: boolean }
  ): string[] {
    const sourceMetadata = this.extraMetadata.get(formulaId)
    const sourceDataSetId = sourceMetadata?.dataSetId
    const sourceAttributeId = sourceMetadata?.attributeId
    // Formulas without an output attribute (e.g. filter formulas) have no dependents, so skip building the index.
    if (!sourceDataSetId || !sourceAttributeId) return []

    const dependents = (index ?? this.getAttributeDependentsIndex()).get(`${sourceDataSetId}:${sourceAttributeId}`)
    return Array.from(dependents ?? []).flatMap(([otherFormulaId, isDirect]) => {
      if (options?.excludePrevOnly && !isDirect) return []
      const extraMetadata = this.extraMetadata.get(otherFormulaId)
      const isSameAttribute = extraMetadata?.dataSetId === sourceDataSetId &&
        extraMetadata?.attributeId === sourceAttributeId
      return isSameAttribute ? [] : [otherFormulaId]
    })
  }

  // Recalculate all formulas that depend on the given formula's output attribute.
  recalculateDownstreamFormulas(formulaId: string) {
    this.getDirectDownstreamFormulaIds(formulaId).forEach(downstreamId => {
      // Recalculate this downstream formula (which will recursively handle its own downstream)
      this.recalculateFormula(downstreamId, "ALL_CASES")
    })
  }

  // Recalculates the affected formulas and everything downstream of them, each at most once and in
  // dependency order.
  recalculateFormulasInOrder(affected: IAffectedFormula[]) {
    // Build the closure of the affected formulas and their transitive downstream formulas.
    const index = this.getAttributeDependentsIndex()
    const downstreamIds = new Map<string, string[]>()
    const getDownstreamIds = (formulaId: string) => {
      let ids = downstreamIds.get(formulaId)
      if (!ids) downstreamIds.set(formulaId, ids = this.getDirectDownstreamFormulaIds(formulaId, index))
      return ids
    }
    const closure = new Map<string, IAffectedFormula>()
    affected.forEach(entry => {
      if (!closure.has(entry.formulaId)) closure.set(entry.formulaId, entry)
    })
    const queue = Array.from(closure.keys())
    for (let i = 0; i < queue.length; ++i) {
      getDownstreamIds(queue[i]).forEach(downstreamId => {
        const existing = closure.get(downstreamId)
        if (!existing) {
          closure.set(downstreamId, { formulaId: downstreamId, cases: "ALL_CASES", forceWrite: false })
          queue.push(downstreamId)
        } else if (existing.cases !== "ALL_CASES") {
          // a directly affected formula downstream of another recalculated formula needs all of its cases
          closure.set(downstreamId, { ...existing, cases: "ALL_CASES" })
        }
      })
    }

    // Sort in dependency order. Edges through prev() count too: a prev() dependent reads its source's new
    // values, so it must run after the source. Cycle detection ignores references inside prev(), so every
    // cycle includes at least one prev() edge. Group the formulas into strongly connected components
    // (Tarjan's algorithm), order the components by their dependencies, and order the members of each cycle
    // by their other edges, which can't form a cycle, and then by registration order. No single order gives
    // consistent results for mutual prev() references, so those depend on registration order.
    const registrationOrder = Array.from(this.formulaMetadata.keys()).filter(id => closure.has(id))
    const registrationIndex = new Map(registrationOrder.map((id, i) => [id, i]))
    // the closure includes every downstream formula, so these edges stay within it
    const edges = new Map(registrationOrder.map(id => [id, getDownstreamIds(id)]))
    const visitIndex = new Map<string, number>()
    const lowLink = new Map<string, number>()
    const stack: string[] = []
    const onStack = new Set<string>()
    // Tarjan's algorithm completes each component after every component downstream of it.
    const componentsDownstreamFirst: string[][] = []
    const visit = (id: string) => {
      visitIndex.set(id, visitIndex.size)
      lowLink.set(id, visitIndex.get(id)!)
      stack.push(id)
      onStack.add(id)
      edges.get(id)?.forEach(downId => {
        if (!visitIndex.has(downId)) {
          visit(downId)
          lowLink.set(id, Math.min(lowLink.get(id)!, lowLink.get(downId)!))
        } else if (onStack.has(downId)) {
          lowLink.set(id, Math.min(lowLink.get(id)!, visitIndex.get(downId)!))
        }
      })
      if (lowLink.get(id) === visitIndex.get(id)) {
        const component: string[] = []
        let memberId: string
        do {
          memberId = stack.pop()!
          onStack.delete(memberId)
          component.push(memberId)
        } while (memberId !== id)
        componentsDownstreamFirst.push(component)
      }
    }
    registrationOrder.forEach(id => { if (!visitIndex.has(id)) visit(id) })
    const orderComponent = (component: string[]) => {
      const members = component.sort((a, b) => registrationIndex.get(a)! - registrationIndex.get(b)!)
      if (members.length < 2) return members
      const memberSet = new Set(members)
      const directEdges = new Map(members.map(id => {
        const downIds = this.getDirectDownstreamFormulaIds(id, index, { excludePrevOnly: true })
        return [id, downIds.filter(downId => memberSet.has(downId))]
      }))
      const sourceCounts = new Map(members.map(id => [id, 0]))
      directEdges.forEach(downIds => {
        downIds.forEach(downId => sourceCounts.set(downId, sourceCounts.get(downId)! + 1))
      })
      const ordered: string[] = []
      const remaining = new Set(members)
      while (remaining.size > 0) {
        // the first-registered member whose direct sources have all run (the fallback is only defensive)
        const next = members.find(id => remaining.has(id) && sourceCounts.get(id) === 0) ??
          members.find(id => remaining.has(id))!
        remaining.delete(next)
        ordered.push(next)
        directEdges.get(next)!.forEach(downId => sourceCounts.set(downId, sourceCounts.get(downId)! - 1))
      }
      return ordered
    }
    const sorted = componentsDownstreamFirst.reverse().flatMap(orderComponent)

    // Recalculate each formula once, without the per-formula downstream cascade.
    sorted.forEach(formulaId => {
      // a formula already being recalculated further up the call stack will finish with current values
      if (this.recalculatingFormulas.has(formulaId)) return
      const formulaMetadata = this.formulaMetadata.get(formulaId)
      if (!formulaMetadata?.isInitialized) return
      const { cases, forceWrite } = closure.get(formulaId)!
      const formulaContext = this.getFormulaContext(formulaId)
      const extraMetadata = this.getExtraMetadata(formulaId)
      const casesToRecalculate = cases === "ALL_CASES" ? cases : cases.map(__id__ => ({ __id__ }))
      this.recalculatingFormulas.add(formulaId)
      try {
        formulaContext.adapter.recalculateFormula(formulaContext, extraMetadata, casesToRecalculate, { forceWrite })
      } finally {
        this.recalculatingFormulas.delete(formulaId)
      }
    })
  }

  updateFormulaCanonicalExpression(formulaId: string) {
    const { formula } = this.getFormulaContext(formulaId)
    // This action will be called by formula manager when it detects that the display formula has changed.
    // It can happen either as a result of user editing the formula, or when a document with display formulas is loaded.
    formula.setCanonicalExpression("") // reset canonical formula immediately, in case of errors that are handled below
    if (formula.empty || !formula.valid) {
      return
    }
    const displayNameMap = this.getDisplayNameMap(formulaId)
    formula.setCanonicalExpression(displayToCanonical(formula.display, displayNameMap))
  }

  updateFormulaDisplayExpression(formulaId: string) {
    const { formula } = this.getFormulaContext(formulaId)
    // This action should be called when one of the attributes is renamed. The canonical form is still valid, while
    // display form needs to be updated. The old display form is used to preserve the user's whitespace / formatting.
    if (formula.empty || !formula.valid) {
      return
    }
    const canonicalNameMap = this.getCanonicalNameMap(formulaId)
    try {
      formula.setDisplayExpression(canonicalToDisplay(formula.canonical, formula.display, canonicalNameMap))
    } catch {
      // If the canonical formula can't be converted to display formula, it usually means there are some unresolved
      // canonical names. It usually happens when an attribute is removed. Nothing to do here, just keep the original
      // display form.
    }
  }

  getActiveFormulas() {
    return this.adapters.flatMap(a => a.getActiveFormulas())
  }

  recalculateActiveFormulas() {
    this.getActiveFormulas().forEach(({ formula }) => {
      this.recalculateFormula(formula.id)
    })
  }

  registerActiveFormulas() {
    reaction(() => {
      // Observe all the formulas
      return this.getActiveFormulas().map(({ formula, extraMetadata }) => (
        { id: formula.id, formula: formula.display, extraMetadata }
      ))
    }, () => {
      const activeFormulas = new Set<string>()
      // Register formulas. For simplicity, we unregister all formulas and register them again when canonical form is
      // updated. Note that even empty formulas are registered, so the metadata is always available when cycle detection
      // is executed.
      const updatedFormulas: string[] = []
      this.adapters.forEach(adapter => {
        adapter.getActiveFormulas().forEach(({ formula, extraMetadata }) => {
          activeFormulas.add(formula.id)
          const metadata = this.formulaMetadata.get(formula.id)
          const prevExtraMetadata = this.extraMetadata.get(formula.id)
          // Formula is considered to be updated by user when its display form changes, or when its extra metadata
          // is updated (e.g. default argument might have changed and the formula needs to be re-registered and
          // re-calculated).
          const isFormulaUpdated = metadata?.registeredDisplay !== formula.display ||
            !comparer.structural(prevExtraMetadata, extraMetadata)
          if (isFormulaUpdated) {
            this.unregisterFormula(formula.id)
            this.registerFormula(formula, adapter, extraMetadata)
            this.updateFormulaCanonicalExpression(formula.id)
            // Note that we need to delay processing of updated formulas until all the formulas are registered.
            // This is necessary for the dependency cycle detection to work correctly.
            updatedFormulas.push(formula.id)
          }
        })
      })
      updatedFormulas.forEach(formulaId => {
        const errorPresent = this.registerFormulaErrors(formulaId)
        if (!errorPresent) {
          this.updateFormulaMetadata(formulaId, { isInitialized: true })
          this.setupFormulaObservers(formulaId)
          this.recalculateFormula(formulaId)
        }
      })
      // Note that formula doesn't need to be deleted from MST tree to be considered deleted or "unregistered".
      // It's enough for the adapter not to return given formula from getActiveFormulas() method to consider it deleted.
      // Graph formulas do that when the adornment is hidden by user.
      this.unregisterInactiveFormulas(activeFormulas)
    }, {
      equals: comparer.structural,
      fireImmediately: true,
      name: "FormulaManager.registerActiveFormulas.reaction"
    })
  }

  unregisterInactiveFormulas(activeFormulas: Set<string>) {
    this.formulaMetadata.forEach((metadata, formulaId) => {
      if (!activeFormulas.has(formulaId)) {
        this.unregisterFormula(formulaId)
      }
    })
  }

  unregisterFormula(formulaId: string) {
    const formulaMetadata = this.formulaMetadata.get(formulaId)
    if (formulaMetadata) {
      formulaMetadata.dispose?.() // dispose MST observers
      this.formulaMetadata.delete(formulaId)
    }
    this.extraMetadata.delete(formulaId)
  }

  registerFormula(formula: IFormula, adapter: IFormulaManagerAdapter, extraMetadata: IFormulaExtraMetadata) {
    this.formulaMetadata.set(formula.id, {
      formula,
      adapter,
      registeredDisplay: formula.display,
      isInitialized: false
    })
    this.extraMetadata.set(formula.id, extraMetadata)
    // unregister formulas when they're destroyed
    addDisposer(formula, () => this.unregisterFormula(formula.id))
  }

  registerFormulaErrors(formulaId: string) {
    const formulaContext = this.getFormulaContext(formulaId)
    const extraMetadata = this.getExtraMetadata(formulaId)
    const { adapter, formula } = formulaContext
    // Generic errors that can be applied to all the formulas:
    if (formula.syntaxError) {
      adapter.setFormulaError(
        formulaContext, extraMetadata, formulaError("DG.Formula.SyntaxErrorMiddle", [ formula.syntaxError ])
      )
      return true
    }
    // Errors specific to given formula context (e.g. attribute formulas can have dependency cycle):
    const formulaTypeSpecificError = adapter.getFormulaError(formulaContext, extraMetadata)
    if (formulaTypeSpecificError) {
      adapter.setFormulaError(formulaContext, extraMetadata, formulaTypeSpecificError)
      return true
    }
    return false
  }

  getDisplayNameMap(formulaId: string) {
    const { dataSet: localDataSet } = this.getFormulaContext(formulaId)
    return getDisplayNameMap({
      localDataSet,
      dataSets: this.dataSets,
      boundaryManager: this.boundaryManager,
      globalValueManager: this.globalValueManager,
    })
  }

  getCanonicalNameMap(formulaId: string) {
    const { dataSet: localDataSet } = this.getFormulaContext(formulaId)
    return getCanonicalNameMap({
      localDataSet,
      dataSets: this.dataSets,
      globalValueManager: this.globalValueManager,
    })
  }

  setupFormulaObservers(formulaId: string) {
    const formulaContext = this.getFormulaContext(formulaId)
    const formulaMetadata = this.getFormulaMetadata(formulaId)
    const extraMetadata = this.getExtraMetadata(formulaId)
    const { dataSet } = formulaContext
    const { formula, adapter } = formulaMetadata
    const { defaultArgument } = extraMetadata

    if (formula.empty) {
      return
    }
    const dependencies = getFormulaDependencies(formula.canonical, extraMetadata.attributeId, defaultArgument)

    const recalculate = (casesToRecalculate: CaseList) => {
      this.recalculateFormula(formulaId, casesToRecalculate)
    }
    const updateDisplay = () => {
      this.updateFormulaDisplayExpression(formulaId)
      // Note that when attribute is removed or renamed, this can also affect the formula's canonical form.
      // 1. Attribute is removed - its ID needs to be removed from the canonical form and the formula should be
      //    recalculated (usually to show the error about undefined symbol).
      // 2. Attribute is renamed - if the previous display form had undefined symbols, they might now be resolved
      //    to the renamed attribute. This means that the canonical form needs to be updated.
      const oldCanonical = formula.canonical
      this.updateFormulaCanonicalExpression(formulaId)
      if (oldCanonical !== formula.canonical) {
        // The dependency set may have changed (e.g. a previously-unresolved symbol now
        // resolves to a newly-added global value or attribute). Tear down and re-register
        // observers from the new canonical form so subsequent value changes are tracked.
        this.formulaMetadata.get(formulaId)?.dispose?.()
        this.setupFormulaObservers(formulaId)
        this.recalculateFormula(formula.id)
      }
    }

    const disposeLocalAttributeObservers = observeLocalAttributes(dependencies, dataSet, recalculate)
    const disposeBoundaryObservers = observeBoundaries(dependencies, this.boundaryManager, recalculate)
    const disposeGlobalValueObservers = observeGlobalValues(dependencies, this.globalValueManager, recalculate)
    const disposeLookupObservers = observeLookupDependencies(dependencies, this.dataSets, recalculate, dataSet.id)
    const disposeNameChangeObservers = observeSymbolNameChanges(this.dataSets, this.globalValueManager, updateDisplay)
    const disposeAdapterSpecificObservers = adapter.setupFormulaObservers?.(formulaContext, extraMetadata)

    this.formulaMetadata.set(formulaId, {
      ...formulaMetadata,
      dispose: () => {
        disposeLocalAttributeObservers()
        disposeBoundaryObservers()
        disposeGlobalValueObservers()
        disposeLookupObservers()
        disposeNameChangeObservers()
        disposeAdapterSpecificObservers?.()
      }
    })
  }

  getSyntaxError(displayString: string) {
    try {
      parse(preprocessDisplayFormula(displayString))
    } catch (error: any) {
      return error.message
    }
    return null
  }

  isRandomFunctionPresent(canonicalString: string) {
    return isRandomFunctionPresent(canonicalString)
  }

  rerandomize(formulaId: string) {
    this.recalculateFormula(formulaId)
  }

}
