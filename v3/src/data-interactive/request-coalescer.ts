import { DIItemValues } from "./data-interactive-data-set-types"
import { DIAction, DIRequest } from "./data-interactive-types"
import { parseResourceSelector } from "./resource-parser"

/*
 * Streamed plugin requests arrive as many consecutive single-item `create … item` requests
 * (e.g. Simmer emitting one case at a time). Processing each individually triggers a full
 * model-change + tile-reactivity cascade per item. The functions here identify the next
 * "work unit" at the head of a drained request queue, merging a run of consecutive,
 * coalescable create-item requests so it can be executed as a single batched create
 * (CODAP-1408). The request processor takes one work unit per drain tick, so capping the
 * run length both bounds the cost of a batch and preserves the visible sense of streaming.
 */

interface IRequestItem {
  request: DIRequest
}

export type RequestWorkUnit<T extends IRequestItem> =
  | { type: "single", item: T }
  | { type: "coalesced", resource: string, members: T[], segments: DIItemValues[][] }

// A request can join a coalesced run if it is a single (non-array) create action targeting
// an `item` resource with values present.
function coalescableResource<T extends IRequestItem>(pair: T): string | undefined {
  const { request } = pair
  if (Array.isArray(request)) return
  const { action, resource, values } = request
  if (action !== "create" || !resource || values == null) return
  if (parseResourceSelector(resource).type !== "item") return
  return resource
}

// The values of a single create request, normalized to an array (its "segment" of the batch).
function requestSegment(request: DIRequest): DIItemValues[] {
  const { values } = request as DIAction
  return (Array.isArray(values) ? values : [values]) as DIItemValues[]
}

// The number of requests a work unit consumes from the head of the queue.
export function workUnitSize<T extends IRequestItem>(unit: RequestWorkUnit<T>): number {
  return unit.type === "coalesced" ? unit.members.length : 1
}

/**
 * Return the work unit at the head of the queue: a run of two or more consecutive coalescable
 * create-item requests with identical resource strings (up to maxRunLength requests) becomes a
 * single "coalesced" unit (members + their value segments, in order); anything else is a
 * "single" unit. Returns undefined if there are no requests. Does not modify the array; the
 * caller removes `workUnitSize(unit)` requests from the queue when it processes the unit.
 */
export function takeNextWorkUnit<T extends IRequestItem>(
  pairs: readonly T[], maxRunLength = Infinity
): RequestWorkUnit<T> | undefined {
  if (pairs.length === 0) return
  const resource = coalescableResource(pairs[0])
  if (resource) {
    // extend the run as far as consecutive requests share the same coalescable resource
    let runEnd = 1
    while (runEnd < pairs.length && runEnd < maxRunLength && coalescableResource(pairs[runEnd]) === resource) {
      ++runEnd
    }
    if (runEnd > 1) {
      const members = pairs.slice(0, runEnd)
      return { type: "coalesced", resource, members, segments: members.map(member => requestSegment(member.request)) }
    }
  }
  return { type: "single", item: pairs[0] }
}
