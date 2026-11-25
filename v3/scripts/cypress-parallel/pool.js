// Runs specs on a fixed number of workers that each take the next spec from one shared queue.

// Starts specs in the given order, at most `workers` at a time, and resolves with their results
// in the order they finished. Once `signal` is aborted, no further specs start.
async function runPool(specs, workers, runSpecFn, { onResult, signal } = {}) {
  const queue = [...specs]
  const results = []

  async function worker() {
    while (queue.length && !signal?.aborted) {
      const result = await runSpecFn(queue.shift())
      results.push(result)
      onResult?.(result, results.length, specs.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(workers, specs.length) }, worker))
  return results
}

module.exports = { runPool }
