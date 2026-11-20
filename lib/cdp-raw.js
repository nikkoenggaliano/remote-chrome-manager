// Minimal Chrome DevTools Protocol client over a raw WebSocket.
//
// Why this exists: chrome-remote-interface@0.33.3 (its target connection path)
// crashes modern Chromium (150+) on connect — the whole browser dies with a
// silent SIGTRAP the moment a screenshot/input session is opened. A raw
// WebSocket carrying byte-identical CDP commands works perfectly (verified end
// to end producing real PNG/JPEG frames). This client implements just the slice
// of the cri API that lib/cdp-client.js depends on: send(), close(),
// on('disconnect'|'error'), and the Page / Runtime / Network domain helpers.
const WebSocket = require('ws');

// A CDP command has no deadline of its own: if Chrome never answers, the
// promise never settles. That is not theoretical - a Page.captureScreenshot
// issued at the moment device emulation changes the page's surface is simply
// never answered, and before this timeout existed that one dead request took
// the whole live view down with it, because every later frame request for the
// same tab was de-duplicated onto it.
const DEFAULT_COMMAND_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.CDP_COMMAND_TIMEOUT_MS || '', 10);
  return Number.isFinite(raw) && raw >= 1000 ? raw : 30000;
})();

class RawCDP {
  constructor(ws) {
    this._ws = ws;
    this._nextId = 0;
    this._pending = new Map();
    this._listeners = { disconnect: [], error: [] };
    // CDP events, by method name. Kept apart from the lifecycle listeners
    // above because those are our own names; every protocol event is
    // "Domain.event", so the two sets can never collide.
    this._events = new Map();
    this._closed = false;

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.id === undefined) { this._emitEvent(msg); return; }
      const pending = this._pending.get(msg.id);
      if (!pending) return;
      this._pending.delete(msg.id);
      if (pending.timer) clearTimeout(pending.timer);
      if (msg.error) {
        const err = new Error(msg.error.message || 'CDP error');
        err.code = msg.error.code;
        pending.reject(err);
      } else {
        pending.resolve(msg.result || {});
      }
    });
    ws.on('close', () => this._teardown('disconnect'));
    ws.on('error', (err) => this._teardown('error', err));
  }

  _teardown(event, err) {
    if (this._closed) return;
    this._closed = true;
    const failure = err || new Error('CDP connection closed');
    for (const pending of this._pending.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.reject(failure);
    }
    this._pending.clear();
    for (const fn of this._listeners[event] || []) {
      try { fn(err); } catch { /* ignore listener errors */ }
    }
    this._events.clear();
  }

  // Send a CDP command and resolve with its `result` object (or reject on error
  // / disconnect). Mirrors chrome-remote-interface's `client.send(method, params)`.
  send(method, params = {}, options = {}) {
    if (this._closed || this._ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`CDP connection not open (cannot send ${method})`));
    }
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_COMMAND_TIMEOUT_MS;
    const id = ++this._nextId;
    return new Promise((resolve, reject) => {
      const entry = { resolve, reject, timer: null };
      if (timeoutMs > 0) {
        entry.timer = setTimeout(() => {
          if (!this._pending.delete(id)) return;
          const err = new Error(`CDP command ${method} did not answer within ${timeoutMs} ms`);
          err.code = 'CDP_TIMEOUT';
          reject(err);
        }, timeoutMs);
        if (entry.timer.unref) entry.timer.unref();
      }
      this._pending.set(id, entry);
      this._ws.send(JSON.stringify({ id, method, params }), (err) => {
        if (err) {
          this._pending.delete(id);
          if (entry.timer) clearTimeout(entry.timer);
          reject(err);
        }
      });
    });
  }

  on(event, fn) {
    if (this._listeners[event]) this._listeners[event].push(fn);
  }

  _emitEvent(msg) {
    if (!msg || typeof msg.method !== 'string') return;
    const subscribers = this._events.get(msg.method);
    if (!subscribers) return;
    for (const fn of subscribers) {
      // One bad subscriber must not take the socket's message pump down with
      // it, or every later event for every other subscriber is lost too.
      try { fn(msg.params || {}); } catch { /* ignore subscriber errors */ }
    }
  }

  // Subscribe to a CDP event such as "Network.responseReceived". Returns an
  // unsubscribe function.
  onEvent(method, fn) {
    let subscribers = this._events.get(method);
    if (!subscribers) {
      subscribers = new Set();
      this._events.set(method, subscribers);
    }
    subscribers.add(fn);
    return () => {
      const current = this._events.get(method);
      if (!current) return;
      current.delete(fn);
      if (!current.size) this._events.delete(method);
    };
  }

  close() {
    try { this._ws.close(); } catch { /* ignore */ }
    return Promise.resolve();
  }

  // Domain helpers — only the methods lib/cdp-client.js uses.
  get Page() {
    return {
      enable: () => this.send('Page.enable'),
      captureScreenshot: (params, options) => this.send('Page.captureScreenshot', params, options),
      navigate: (params) => this.send('Page.navigate', params),
      bringToFront: () => this.send('Page.bringToFront'),
      reload: (params) => this.send('Page.reload', params),
      getLayoutMetrics: (options) => this.send('Page.getLayoutMetrics', {}, options),
      printToPDF: (params) => this.send('Page.printToPDF', params),
      getNavigationHistory: () => this.send('Page.getNavigationHistory'),
      navigateToHistoryEntry: (params) => this.send('Page.navigateToHistoryEntry', params),
    };
  }

  get Runtime() {
    return {
      enable: () => this.send('Runtime.enable'),
      evaluate: (params) => this.send('Runtime.evaluate', params),
      callFunctionOn: (params) => this.send('Runtime.callFunctionOn', params),
      releaseObject: (params) => this.send('Runtime.releaseObject', params),
    };
  }

  get DOM() {
    return {
      enable: () => this.send('DOM.enable'),
      getNodeForLocation: (params) => this.send('DOM.getNodeForLocation', params),
      resolveNode: (params) => this.send('DOM.resolveNode', params),
    };
  }

  // The DevTools element highlight is painted by the renderer, so it shows up
  // in Page.captureScreenshot — which is what lets the live view highlight the
  // element you inspected.
  get Overlay() {
    return {
      enable: () => this.send('Overlay.enable'),
      highlightNode: (params) => this.send('Overlay.highlightNode', params),
      hideHighlight: () => this.send('Overlay.hideHighlight'),
    };
  }

  get Network() {
    return {
      enable: (params) => this.send('Network.enable', params),
      disable: () => this.send('Network.disable'),
      setCookie: (params) => this.send('Network.setCookie', params),
      getAllCookies: () => this.send('Network.getAllCookies'),
      deleteCookies: (params) => this.send('Network.deleteCookies', params),
      getResponseBody: (params) => this.send('Network.getResponseBody', params),
      getRequestPostData: (params) => this.send('Network.getRequestPostData', params),
    };
  }

  // Device emulation. Chrome resets every override when the session that set
  // them detaches, which is why lib/cdp-client.js re-applies them whenever it
  // rebuilds a session for a target.
  get Emulation() {
    return {
      setDeviceMetricsOverride: (params) => this.send('Emulation.setDeviceMetricsOverride', params),
      clearDeviceMetricsOverride: () => this.send('Emulation.clearDeviceMetricsOverride'),
      setUserAgentOverride: (params) => this.send('Emulation.setUserAgentOverride', params),
      setTouchEmulationEnabled: (params) => this.send('Emulation.setTouchEmulationEnabled', params),
      setEmitTouchEventsForMouse: (params) => this.send('Emulation.setEmitTouchEventsForMouse', params),
    };
  }
}

// Open a CDP session to a target's WebSocket debugger URL; resolve once the
// socket is open, reject on error/timeout.
function connectTarget(wsUrl, { timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(arg);
    };
    const ws = new WebSocket(wsUrl, { maxPayload: 256 * 1024 * 1024 });
    const timer = setTimeout(() => {
      try { ws.close(); } catch { /* ignore */ }
      finish(reject, new Error(`Timed out connecting to CDP target ${wsUrl}`));
    }, timeoutMs);
    ws.once('open', () => finish(resolve, new RawCDP(ws)));
    ws.once('error', (err) => finish(reject, err));
  });
}

module.exports = { connectTarget, RawCDP };
