/**
 * Interface for consumers that need WebGL contexts.
 * Consumers must implement callbacks for when contexts are granted or revoked.
 */
export interface IContextConsumer {
  /** Unique identifier for this consumer */
  readonly id: string
  /** Priority for context allocation (higher = more important, typically point count) */
  priority: number
  /** Called when a WebGL context is granted to this consumer */
  onContextGranted(): void
  /** Called when this consumer's WebGL context is being revoked */
  onContextRevoked(): void
}

/**
 * Manages WebGL context allocation across multiple renderers.
 *
 * Browsers typically limit WebGL contexts to ~16. This manager:
 * - Tracks active contexts (conservative limit of 14)
 * - Maintains a priority queue for context requests
 * - Evicts lower-priority consumers when higher-priority ones need contexts
 * - Notifies consumers when contexts are granted or revoked
 *
 * Usage:
 * ```
 * const manager = WebGLContextManager.getInstance()
 * manager.requestContext({
 *   id: 'graph-1',
 *   priority: 1000,  // e.g., point count
 *   onContextGranted: () => { ... },
 *   onContextRevoked: () => { ... }
 * })
 * ```
 */
export class WebGLContextManager {
  private static instance: WebGLContextManager | null = null

  /** Maximum number of contexts to allocate */
  readonly maxContexts = 14

  /** All registered consumers (both active and waiting) */
  private consumers = new Map<string, IContextConsumer>()

  /** Set of consumer IDs that currently have an active context */
  private activeConsumers = new Set<string>()

  /** Set of consumer IDs that have voluntarily yielded and should not be re-granted until they re-request */
  private yieldedConsumers = new Set<string>()

  /**
   * Counter for generating unique high-priority values for user interactions.
   * Each user click gets a priority higher than any previous click, ensuring
   * the most recently clicked graph always wins the context.
   * Starts at a high base value to ensure user interactions always beat
   * automatic priority (based on point count).
   */
  private userInteractionPriorityCounter = 1_000_000_000

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WebGLContextManager {
    if (!WebGLContextManager.instance) {
      WebGLContextManager.instance = new WebGLContextManager()
    }
    return WebGLContextManager.instance
  }

  /**
   * Reset the singleton instance (primarily for testing)
   */
  static resetInstance(): void {
    WebGLContextManager.instance = null
  }

  /**
   * Get the number of currently active contexts
   */
  get activeCount(): number {
    return this.activeConsumers.size
  }

  /**
   * Get the number of consumers waiting for a context (excludes yielded consumers)
   */
  get waitingCount(): number {
    return this.consumers.size - this.activeConsumers.size - this.yieldedConsumers.size
  }

  /**
   * Check if a consumer currently has an active context
   */
  hasContext(consumerId: string): boolean {
    return this.activeConsumers.has(consumerId)
  }

  /**
   * Get the next priority value for user interaction.
   * Each call returns a higher value than the previous, ensuring
   * the most recently interacted-with graph always gets priority.
   */
  getNextUserInteractionPriority(): number {
    return ++this.userInteractionPriorityCounter
  }

  /**
   * Request a WebGL context for a consumer.
   *
   * @param consumer The consumer requesting a context
   * @returns true if context was immediately granted, false if consumer must wait
   */
  requestContext(consumer: IContextConsumer): boolean {
    // Register/update the consumer
    this.consumers.set(consumer.id, consumer)

    // Clear yielded flag - consumer is actively requesting
    this.yieldedConsumers.delete(consumer.id)

    // If already active, nothing to do
    if (this.activeConsumers.has(consumer.id)) {
      return true
    }

    // If we have room, grant immediately
    if (this.activeConsumers.size < this.maxContexts) {
      this.grantContext(consumer.id)
      return true
    }

    // Try to evict a lower-priority consumer
    const evictedId = this.tryEvictLowestPriority(consumer.priority)
    if (evictedId) {
      this.grantContext(consumer.id)
      return true
    }

    // Consumer must wait
    return false
  }

  /**
   * Release a context held by a consumer.
   * This should be called when a consumer is disposed or no longer needs rendering.
   *
   * @param consumerId The ID of the consumer releasing its context
   */
  releaseContext(consumerId: string): void {
    const wasActive = this.activeConsumers.has(consumerId)
    this.activeConsumers.delete(consumerId)
    this.consumers.delete(consumerId)
    this.yieldedConsumers.delete(consumerId)

    // If this consumer was active, try to grant to highest-priority waiting consumer
    if (wasActive) {
      this.tryGrantToHighestPriorityWaiting()
    }
  }

  /**
   * Voluntarily yield a context (e.g., when minimized or scrolled off-screen).
   * The consumer remains registered but loses its context and is marked as yielded
   * so it won't be re-granted until it explicitly requests a context again.
   *
   * @param consumerId The ID of the consumer yielding its context
   */
  yieldContext(consumerId: string): void {
    if (this.activeConsumers.has(consumerId)) {
      this.activeConsumers.delete(consumerId)
      // Mark as yielded so it won't be re-granted until it re-requests
      this.yieldedConsumers.add(consumerId)

      const consumer = this.consumers.get(consumerId)
      if (consumer) {
        consumer.onContextRevoked()
      }
      this.tryGrantToHighestPriorityWaiting()
    }
  }

  /**
   * Update a consumer's priority.
   * This may trigger eviction if there are waiting consumers with higher priority.
   *
   * @param consumerId The ID of the consumer
   * @param priority The new priority value
   */
  updatePriority(consumerId: string, priority: number): void {
    const consumer = this.consumers.get(consumerId)
    if (consumer) {
      consumer.priority = priority

      // If this consumer is waiting (not active and not yielded) and now has higher priority
      // than an active consumer, try to get it a context
      if (!this.activeConsumers.has(consumerId) && !this.yieldedConsumers.has(consumerId)) {
        const evicted = this.tryEvictLowestPriority(priority)
        if (evicted) {
          this.grantContext(consumerId)
        }
      }
    }
  }

  /**
   * Re-request a context for a consumer that previously yielded.
   * Called when a component becomes visible again.
   *
   * @param consumerId The ID of the consumer
   * @returns true if context was granted, false if consumer must wait
   */
  reRequestContext(consumerId: string): boolean {
    const consumer = this.consumers.get(consumerId)
    if (!consumer) {
      return false
    }

    // Clear yielded flag - consumer is actively requesting
    this.yieldedConsumers.delete(consumerId)

    // If already active, nothing to do
    if (this.activeConsumers.has(consumerId)) {
      return true
    }

    // If we have room, grant immediately
    if (this.activeConsumers.size < this.maxContexts) {
      this.grantContext(consumerId)
      return true
    }

    // Try to evict a lower-priority consumer
    const evicted = this.tryEvictLowestPriority(consumer.priority)
    if (evicted) {
      this.grantContext(consumerId)
      return true
    }

    return false
  }

  /**
   * Grant a context to a consumer
   */
  private grantContext(consumerId: string): void {
    this.activeConsumers.add(consumerId)

    const consumer = this.consumers.get(consumerId)
    if (consumer) {
      consumer.onContextGranted()
    }
  }

  /**
   * Try to evict the lowest-priority active consumer if its priority is lower than the threshold.
   *
   * @param threshold Only evict if lowest priority is below this value
   * @returns true if a consumer was evicted, and the evicted ID
   */
  private tryEvictLowestPriority(threshold: number): string | null {
    let lowestPriority = Infinity
    let lowestPriorityId: string | null = null

    this.activeConsumers.forEach(id => {
      const consumer = this.consumers.get(id)
      if (consumer && consumer.priority < lowestPriority) {
        lowestPriority = consumer.priority
        lowestPriorityId = id
      }
    })

    if (lowestPriorityId && lowestPriority < threshold) {
      this.activeConsumers.delete(lowestPriorityId)
      const evicted = this.consumers.get(lowestPriorityId)
      if (evicted) {
        evicted.onContextRevoked()
      }
      return lowestPriorityId
    }

    return null
  }

  /**
   * Try to grant a context to the highest-priority waiting consumer.
   * Skips consumers that have yielded (they must explicitly re-request).
   */
  private tryGrantToHighestPriorityWaiting(): void {
    if (this.activeConsumers.size >= this.maxContexts) {
      return
    }

    let highestPriority = -Infinity
    let highestPriorityId: string | null = null

    this.consumers.forEach((consumer, id) => {
      // Skip active consumers and yielded consumers
      if (!this.activeConsumers.has(id) && !this.yieldedConsumers.has(id) && consumer.priority > highestPriority) {
        highestPriority = consumer.priority
        highestPriorityId = id
      }
    })

    if (highestPriorityId) {
      this.grantContext(highestPriorityId)
    }
  }
}

/**
 * Singleton instance of the WebGL context manager
 */
export const webGLContextManager = WebGLContextManager.getInstance()
