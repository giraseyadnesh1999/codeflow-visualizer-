/*
 * Runs a learner's solution against test cases, off the main thread.
 *
 * The page terminates this worker if it takes too long, so an accidental
 * infinite loop can never freeze the UI. Results stream back one case at a
 * time so the cases that finished before a timeout still get reported.
 */

function show(value) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function postResult(message, actual) {
  try {
    self.postMessage(message)
  } catch {
    // The return value could not be cloned (e.g. it contains a function).
    message.actual = undefined
    message.actualText = String(actual)
    self.postMessage(message)
  }
}

self.onmessage = function (event) {
  var data = event.data
  var logs = []
  var capture = function (kind) {
    return function () {
      if (logs.length >= 100) return
      logs.push({ kind: kind, text: Array.prototype.map.call(arguments, show).join(' ') })
    }
  }
  var sandboxConsole = { log: capture('log'), info: capture('info'), warn: capture('warn'), error: capture('error') }

  var solution
  try {
    solution = new Function(
      'console',
      data.code + '\n;return typeof ' + data.fn + ' === "function" ? ' + data.fn + ' : undefined;',
    )(sandboxConsole)
  } catch (err) {
    self.postMessage({ type: 'compile-error', message: (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err)) })
    return
  }

  if (!solution) {
    self.postMessage({
      type: 'compile-error',
      message: 'Could not find a function named `' + data.fn + '`. Keep the function name from the starter code.',
    })
    return
  }

  for (var i = 0; i < data.cases.length; i++) {
    var start = performance.now()
    try {
      var actual = solution.apply(null, data.cases[i])
      postResult({ type: 'case', index: i, ok: true, actual: actual, ms: performance.now() - start, logs: logs.splice(0) }, actual)
    } catch (err) {
      self.postMessage({
        type: 'case',
        index: i,
        ok: false,
        error: (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err)),
        ms: performance.now() - start,
        logs: logs.splice(0),
      })
    }
  }
  self.postMessage({ type: 'done' })
}
