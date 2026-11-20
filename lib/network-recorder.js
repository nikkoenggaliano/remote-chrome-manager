'use strict';

/*
 * Per-tab network log, the way a browser's own Network panel works.
 *
 * The screenshot/input path in lib/cdp-client.js keeps one warm session per
 * tab and lets it be evicted when idle. That is exactly wrong for a recorder:
 * events only arrive while a session is attached with Network enabled, so a
 * dropped session is a hole in the log, and the body of a request Chrome has
 * already finished is only retrievable through the session that saw it. So a
 * recorder owns its own connection for as long as somebody is watching, and
 * closes it when nobody has polled for a while.
 */

const { connectTarget } = require('./cdp-raw');
const fetch = require('node-fetch');

function envInt(name, fallback, min, max) {
  const raw = parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

// How many requests one tab keeps. A busy single-page app can fire thousands,
// and the point of the panel is the recent ones.
const MAX_ENTRIES = envInt('NETWORK_LOG_MAX', 500, 10, 10000);
// A recorder with nobody watching is a socket and a growing buffer for
// nothing, so it is closed when the polling stops.
const IDLE_STOP_MS = envInt('NETWORK_LOG_IDLE_MS', 120000, 10000, 3600000);
const MAX_POST_DATA = 16 * 1024;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 300;

const recorders = new Map();

function keyOf(host, port, targetId) {
  return `${host}:${port}:${targetId}`;
}

async function resolveTargetWs(host, port, targetId) {
  let targets;
  try {
    const response = await fetch(`http://${host}:${port}/json`);
    targets = await response.json();
  } catch (error) {
    throw new Error(`Unable to list targets on ${host}:${port}: ${error.message}`);
  }
  const target = Array.isArray(targets) ? targets.find((t) => t.id === targetId) : null;
  if (!target) {
    const err = new Error(`Tab ${targetId} is no longer available on ${host}:${port}`);
    err.code = 'TARGET_GONE';
    throw err;
  }
  return target.webSocketDebuggerUrl || `ws://${host}:${port}/devtools/page/${targetId}`;
}

function headerMap(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const [name, value] of Object.entries(raw)) {
    out[String(name)] = typeof value === 'string' ? value : String(value);
  }
  return out;
}

function mergeHeaders(parsed, extra) {
  if (!parsed && !extra) return null;
  // The "extra info" events carry the headers as they actually went over the
  // wire, including Set-Cookie, which the parsed event omits. Where both have
  // an opinion the raw one wins.
  return { ...(parsed || {}), ...(extra || {}) };
}

function msFromMonotonic(start, end) {
  if (typeof start !== 'number' || typeof end !== 'number') return null;
  return Math.max(0, Math.round((end - start) * 1000));
}

class Recorder {
  constructor(host, port, targetId) {
    this.host = host;
    this.port = port;
    this.targetId = targetId;
    this.key = keyOf(host, port, targetId);

    this.client = null;
    this.connected = false;
    this.connecting = null;
    this.lastError = null;

    this.entries = new Map();          // our id -> entry (insertion ordered)
    this.liveByRequestId = new Map();  // CDP requestId -> our id
    this.pendingExtra = new Map();     // extra info that beat its request here

    this.seq = 0;
    this.counter = 0;
    this.dropped = 0;
    // Bumped by clear() so a poller can tell "nothing new" from "the log you
    // were following no longer exists" and resync instead of showing a list
    // that will never be updated again.
    this.generation = 1;
    this.startedAt = Date.now();
    this.lastPolled = Date.now();
  }

  async ensureConnected() {
    if (this.connected && this.client) return this.client;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const wsUrl = await resolveTargetWs(this.host, this.port, this.targetId);
      const client = await connectTarget(wsUrl);
      const drop = () => {
        if (this.client === client) {
          this.client = null;
          this.connected = false;
        }
      };
      client.on('disconnect', drop);
      client.on('error', drop);
      this._wire(client);
      await client.Network.enable();
      this.client = client;
      this.connected = true;
      this.lastError = null;
      return client;
    })();

    try {
      return await this.connecting;
    } catch (error) {
      this.lastError = error.message;
      throw error;
    } finally {
      this.connecting = null;
    }
  }

  _wire(client) {
    client.onEvent('Network.requestWillBeSent', (p) => this._onRequest(p));
    client.onEvent('Network.responseReceived', (p) => this._onResponse(p));
    client.onEvent('Network.loadingFinished', (p) => this._onFinished(p));
    client.onEvent('Network.loadingFailed', (p) => this._onFailed(p));
    client.onEvent('Network.requestWillBeSentExtraInfo', (p) => this._onRequestExtra(p));
    client.onEvent('Network.responseReceivedExtraInfo', (p) => this._onResponseExtra(p));
  }

  _touch(entry) {
    entry.seq = ++this.seq;
  }

  _entryFor(requestId) {
    const id = this.liveByRequestId.get(requestId);
    return id ? this.entries.get(id) || null : null;
  }

  _evict() {
    while (this.entries.size > MAX_ENTRIES) {
      const oldestId = this.entries.keys().next().value;
      const oldest = this.entries.get(oldestId);
      this.entries.delete(oldestId);
      if (oldest && this.liveByRequestId.get(oldest.cdp_request_id) === oldestId) {
        this.liveByRequestId.delete(oldest.cdp_request_id);
      }
      this.dropped += 1;
    }
  }

  _onRequest(params) {
    const { requestId, request = {}, type, timestamp, wallTime, initiator, documentURL, frameId, redirectResponse } = params;

    // A redirect reuses the request id, so the hop that just finished has to be
    // closed off before the new one takes the id over, or the log would show
    // only the final destination and lose every Location in between.
    if (redirectResponse) {
      const previous = this._entryFor(requestId);
      if (previous) {
        this._applyResponse(previous, redirectResponse, previous.resource_type);
        previous.finished = true;
        previous.superseded = true;
        previous.redirected_to = request.url || null;
        previous.ended_ts = timestamp;
        this._touch(previous);
      }
      this.liveByRequestId.delete(requestId);
    }

    const postData = typeof request.postData === 'string' ? request.postData : null;
    const entry = {
      id: `r${++this.counter}`,
      cdp_request_id: requestId,
      seq: 0,
      method: request.method || 'GET',
      url: request.url || '',
      resource_type: type || 'Other',
      status: null,
      status_text: '',
      mime_type: '',
      started_ts: timestamp,
      wall_time: typeof wallTime === 'number' ? Math.round(wallTime * 1000) : Date.now(),
      ended_ts: null,
      size_bytes: null,
      from_cache: false,
      remote_address: null,
      protocol: null,
      failed: false,
      error_text: null,
      finished: false,
      superseded: false,
      redirected_to: null,
      request_headers: headerMap(request.headers),
      extra_request_headers: null,
      response_headers: null,
      extra_response_headers: null,
      has_post_data: Boolean(postData || request.hasPostData),
      post_data: postData ? postData.slice(0, MAX_POST_DATA) : null,
      post_data_truncated: Boolean(postData && postData.length > MAX_POST_DATA),
      initiator: initiator ? { type: initiator.type, url: initiator.url || null, line: initiator.lineNumber ?? null } : null,
      document_url: documentURL || null,
      frame_id: frameId || null,
    };

    // Extra info can legitimately arrive before the request event it belongs
    // to; CDP makes no ordering promise between the two streams.
    const pending = this.pendingExtra.get(requestId);
    if (pending) {
      if (pending.request) entry.extra_request_headers = pending.request;
      if (pending.response) entry.extra_response_headers = pending.response;
      this.pendingExtra.delete(requestId);
    }

    this._touch(entry);
    this.entries.set(entry.id, entry);
    this.liveByRequestId.set(requestId, entry.id);
    this._evict();
  }

  _applyResponse(entry, response, type) {
    if (!response) return;
    entry.status = response.status ?? entry.status;
    entry.status_text = response.statusText || entry.status_text;
    entry.mime_type = response.mimeType || entry.mime_type;
    entry.response_headers = headerMap(response.headers) || entry.response_headers;
    entry.remote_address = response.remoteIPAddress
      ? `${response.remoteIPAddress}${response.remotePort ? `:${response.remotePort}` : ''}`
      : entry.remote_address;
    entry.protocol = response.protocol || entry.protocol;
    entry.from_cache = Boolean(response.fromDiskCache || response.fromPrefetchCache) || entry.from_cache;
    if (type) entry.resource_type = type;
  }

  _onResponse(params) {
    const entry = this._entryFor(params.requestId);
    if (!entry) return;
    this._applyResponse(entry, params.response, params.type);
    this._touch(entry);
  }

  _onFinished(params) {
    const entry = this._entryFor(params.requestId);
    if (!entry) return;
    entry.finished = true;
    entry.ended_ts = params.timestamp;
    if (typeof params.encodedDataLength === 'number' && params.encodedDataLength > 0) {
      entry.size_bytes = params.encodedDataLength;
    }
    this._touch(entry);
  }

  _onFailed(params) {
    const entry = this._entryFor(params.requestId);
    if (!entry) return;
    entry.finished = true;
    entry.failed = true;
    entry.ended_ts = params.timestamp;
    entry.error_text = params.blockedReason
      ? `${params.errorText || 'Blocked'} (${params.blockedReason})`
      : (params.errorText || (params.canceled ? 'Canceled' : 'Failed'));
    this._touch(entry);
  }

  _stashExtra(requestId, slot, headers) {
    if (!headers) return;
    const pending = this.pendingExtra.get(requestId) || {};
    pending[slot] = headers;
    this.pendingExtra.set(requestId, pending);
    // Unmatched extra info is rare; a hard cap keeps a pathological page from
    // turning it into a leak.
    while (this.pendingExtra.size > MAX_ENTRIES) {
      this.pendingExtra.delete(this.pendingExtra.keys().next().value);
    }
  }

  _onRequestExtra(params) {
    const headers = headerMap(params.headers);
    const entry = this._entryFor(params.requestId);
    if (!entry) return this._stashExtra(params.requestId, 'request', headers);
    entry.extra_request_headers = headers;
    this._touch(entry);
  }

  _onResponseExtra(params) {
    const headers = headerMap(params.headers);
    const entry = this._entryFor(params.requestId);
    if (!entry) return this._stashExtra(params.requestId, 'response', headers);
    entry.extra_response_headers = headers;
    if (entry.status === null && typeof params.statusCode === 'number') entry.status = params.statusCode;
    this._touch(entry);
  }

  slim(entry) {
    return {
      id: entry.id,
      seq: entry.seq,
      method: entry.method,
      url: entry.url,
      status: entry.status,
      status_text: entry.status_text,
      resource_type: entry.resource_type,
      mime_type: entry.mime_type,
      size_bytes: entry.size_bytes,
      duration_ms: msFromMonotonic(entry.started_ts, entry.ended_ts),
      started_at: entry.wall_time,
      finished: entry.finished,
      failed: entry.failed,
      error_text: entry.error_text,
      from_cache: entry.from_cache,
      remote_address: entry.remote_address,
      protocol: entry.protocol,
      redirected_to: entry.redirected_to,
      has_post_data: entry.has_post_data,
    };
  }

  full(entry) {
    return {
      ...this.slim(entry),
      request_headers: mergeHeaders(entry.request_headers, entry.extra_request_headers),
      response_headers: mergeHeaders(entry.response_headers, entry.extra_response_headers),
      post_data: entry.post_data,
      post_data_truncated: entry.post_data_truncated,
      initiator: entry.initiator,
      document_url: entry.document_url,
      frame_id: entry.frame_id,
      superseded: entry.superseded,
    };
  }

  list({ sinceSeq = 0, limit = DEFAULT_PAGE_SIZE } = {}) {
    this.lastPolled = Date.now();
    const since = Number.isFinite(sinceSeq) ? sinceSeq : 0;
    const capped = Math.min(Math.max(1, limit || DEFAULT_PAGE_SIZE), 2000);

    const changed = [];
    for (const entry of this.entries.values()) {
      if (entry.seq > since) changed.push(entry);
    }
    changed.sort((a, b) => a.seq - b.seq);
    const page = changed.slice(0, capped);

    return {
      recording: true,
      connected: this.connected,
      generation: this.generation,
      // Paging on seq means the next poll resumes exactly where this one
      // stopped, so a burst larger than one page is never silently skipped.
      next_seq: page.length ? page[page.length - 1].seq : since,
      pending: Math.max(0, changed.length - page.length),
      total: this.entries.size,
      dropped: this.dropped,
      max_entries: MAX_ENTRIES,
      started_at: this.startedAt,
      last_error: this.lastError,
      entries: page.map((entry) => this.slim(entry)),
    };
  }

  clear() {
    this.entries.clear();
    this.liveByRequestId.clear();
    this.pendingExtra.clear();
    this.seq = 0;
    this.counter = 0;
    this.dropped = 0;
    this.generation += 1;
    this.lastPolled = Date.now();
  }

  async body(entryId) {
    this.lastPolled = Date.now();
    const entry = this.entries.get(entryId);
    if (!entry) {
      const err = new Error(`No recorded request "${entryId}" for this tab`);
      err.code = 'NO_SUCH_REQUEST';
      throw err;
    }

    const detail = this.full(entry);
    if (entry.superseded) {
      // The id now belongs to the request this one redirected to, so asking
      // Chrome for "the body" would hand back the wrong response entirely.
      return { ...detail, body: null, body_available: false, body_error: 'This hop was a redirect; its body is not retained.' };
    }
    if (!entry.finished) {
      return { ...detail, body: null, body_available: false, body_error: 'Still in flight.' };
    }

    try {
      const client = await this.ensureConnected();
      const result = await client.Network.getResponseBody({ requestId: entry.cdp_request_id });
      let body = typeof result.body === 'string' ? result.body : '';
      const truncated = body.length > MAX_BODY_BYTES;
      if (truncated) body = body.slice(0, MAX_BODY_BYTES);
      return {
        ...detail,
        body,
        body_base64: Boolean(result.base64Encoded),
        body_truncated: truncated,
        body_available: true,
        body_error: null,
      };
    } catch (error) {
      // Routine, not exceptional: Chrome drops bodies it no longer needs, and
      // some responses (204, redirects, cached) never had one.
      return { ...detail, body: null, body_available: false, body_error: error.message };
    }
  }

  close() {
    const client = this.client;
    this.client = null;
    this.connected = false;
    if (client) client.close().catch(() => {});
  }
}

function getRecorder(host, port, targetId) {
  return recorders.get(keyOf(host, port, targetId)) || null;
}

async function start(host, port, targetId) {
  let recorder = getRecorder(host, port, targetId);
  if (!recorder) {
    recorder = new Recorder(host, port, targetId);
    recorders.set(recorder.key, recorder);
  }
  recorder.lastPolled = Date.now();
  try {
    await recorder.ensureConnected();
  } catch (error) {
    recorders.delete(recorder.key);
    recorder.close();
    throw error;
  }
  return recorder.list({ sinceSeq: 0, limit: 1 });
}

function stop(host, port, targetId) {
  const recorder = getRecorder(host, port, targetId);
  if (!recorder) return false;
  recorders.delete(recorder.key);
  recorder.close();
  return true;
}

function stopForEndpoint(host, port) {
  const prefix = `${host}:${port}:`;
  let stopped = 0;
  for (const [key, recorder] of [...recorders.entries()]) {
    if (!key.startsWith(prefix)) continue;
    recorders.delete(key);
    recorder.close();
    stopped += 1;
  }
  return stopped;
}

function idleStatus(host, port, targetId) {
  return {
    recording: false,
    connected: false,
    generation: 0,
    next_seq: 0,
    pending: 0,
    total: 0,
    dropped: 0,
    max_entries: MAX_ENTRIES,
    started_at: null,
    last_error: null,
    entries: [],
  };
}

async function list(host, port, targetId, options = {}) {
  const recorder = getRecorder(host, port, targetId);
  if (!recorder) return idleStatus(host, port, targetId);
  // Heal a session that dropped while nobody was looking (the tab navigated
  // across processes, the browser hiccuped) instead of reporting an empty log
  // forever.
  if (!recorder.connected) {
    try { await recorder.ensureConnected(); } catch { /* reported as last_error */ }
  }
  return recorder.list(options);
}

function clear(host, port, targetId) {
  const recorder = getRecorder(host, port, targetId);
  if (!recorder) return false;
  recorder.clear();
  return true;
}

async function body(host, port, targetId, entryId) {
  const recorder = getRecorder(host, port, targetId);
  if (!recorder) {
    const err = new Error('Network recording is not running for this tab');
    err.code = 'NOT_RECORDING';
    throw err;
  }
  return recorder.body(entryId);
}

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, recorder] of [...recorders.entries()]) {
    if (now - recorder.lastPolled > IDLE_STOP_MS) {
      recorders.delete(key);
      recorder.close();
    }
  }
}, 30000);
if (sweeper.unref) sweeper.unref();

module.exports = {
  start,
  stop,
  stopForEndpoint,
  list,
  clear,
  body,
  MAX_ENTRIES,
  IDLE_STOP_MS,
};
