'use strict';

/*
 * Per-tab console, the way a browser's own Console panel works: what the page
 * logs, the exceptions nobody caught, the warnings the browser itself raises,
 * and a prompt to run an expression inside the page.
 *
 * Built like lib/network-recorder.js, and for the same reason: console messages
 * are only delivered to a session that is attached with Runtime enabled, so a
 * session that gets dropped is a hole in the log - not a gap that can be filled
 * in later, because nothing in Chrome remembers a message no client was
 * listening for. So the recorder owns its own connection for as long as
 * somebody is watching, and closes it once the polling stops.
 *
 * One thing measured rather than assumed: Chrome replays the messages it had
 * buffered when a session attaches, so the transcript opens with the page's
 * history rather than with nothing. A replayed argument arrives as a bare
 * handle with the engine's one-word description and no preview, though, which
 * would render every object the page ever logged as "Object" - so where the
 * handle is still alive the preview is asked for after the fact. Where the
 * context it came from is gone, the description is all there is, and a reload
 * (which the panel offers) is what gets the detail back.
 */

const { connectTarget } = require('./cdp-raw');
const fetch = require('node-fetch');

function envInt(name, fallback, min, max) {
  const raw = parseInt(process.env[name] || '', 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

// A chatty page can log thousands of lines a minute; the point of the panel is
// the recent ones.
const MAX_ENTRIES = envInt('CONSOLE_LOG_MAX', 1000, 20, 20000);
// A recorder nobody reads is a socket and a growing buffer for nothing.
const IDLE_STOP_MS = envInt('CONSOLE_LOG_IDLE_MS', 120000, 10000, 3600000);
const MAX_TEXT = 100 * 1024;
const DEFAULT_PAGE_SIZE = 300;
const EVAL_TIMEOUT_MS = envInt('CONSOLE_EVAL_TIMEOUT_MS', 15000, 1000, 120000);
// How many replayed arguments are worth a round trip to fill in. The replay is
// a one-off burst at attach, but a page that logged thousands of objects should
// not turn opening the panel into thousands of commands.
const PREVIEW_BUDGET = envInt('CONSOLE_PREVIEW_BUDGET', 300, 0, 5000);
// Everything an evaluation leaves behind goes in one group so it can be
// released in a single call; without that, every object the operator inspects
// stays alive in the page for as long as the tab does.
const EVAL_OBJECT_GROUP = 'chrome-fleet-console';

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

function clip(text) {
  const str = String(text ?? '');
  return str.length > MAX_TEXT ? `${str.slice(0, MAX_TEXT)}\n… (truncated)` : str;
}

// --- Turning CDP's remote objects into something readable -----------------
// Chrome hands over a handle plus a shallow "preview", not a value: the object
// itself stays in the page. Its own console renders exactly this preview until
// you expand a row, and so do we - fetching every logged object in full would
// mean a round trip per argument on a page that may log in a loop, and would
// pin every one of those objects in the page's heap for as long as the tab
// lives.

function firstLine(text) {
  const str = String(text ?? '');
  const cut = str.indexOf('\n');
  return cut === -1 ? str : `${str.slice(0, cut)} …`;
}

function previewValue(property) {
  if (!property) return 'undefined';
  if (property.type === 'string') return JSON.stringify(property.value ?? '');
  if (property.type === 'object') {
    if (property.subtype === 'null') return 'null';
    return property.value || property.subtype || 'Object';
  }
  if (property.type === 'function') return 'ƒ';
  if (property.value === undefined) return property.type || 'undefined';
  return String(property.value);
}

function previewToString(preview) {
  const overflow = preview.overflow ? ', …' : '';

  if (preview.subtype === 'array' || preview.subtype === 'typedarray') {
    const items = (preview.properties || []).map(previewValue).join(', ');
    const label = preview.description && !/^Array\(/.test(preview.description) ? `${preview.description} ` : '';
    return `${label}[${items}${overflow}]`;
  }

  if (preview.subtype === 'map' || preview.subtype === 'set') {
    const entries = (preview.entries || []).map((entry) => {
      const value = entry.value ? (entry.value.description || entry.value.type) : '';
      return entry.key ? `${entry.key.description || entry.key.type} => ${value}` : value;
    }).join(', ');
    return `${preview.description || preview.subtype} {${entries}${overflow}}`;
  }

  if (preview.subtype === 'promise') {
    // The engine reports the state and the settled value as internal
    // properties; "Promise" on its own says nothing anyone wanted to know.
    const fields = {};
    for (const property of preview.properties || []) fields[property.name] = property;
    const state = fields['[[PromiseState]]'] ? String(fields['[[PromiseState]]'].value) : 'pending';
    if (state === 'pending') return 'Promise {<pending>}';
    return `Promise {<${state}>: ${fields['[[PromiseResult]]'] ? previewValue(fields['[[PromiseResult]]']) : ''}}`;
  }

  if (preview.subtype === 'node') return preview.description || 'node';
  if (preview.subtype === 'error') return preview.description || 'Error';
  if (preview.subtype === 'regexp' || preview.subtype === 'date') return preview.description || '';

  const fields = (preview.properties || [])
    .map((property) => `${property.name}: ${previewValue(property)}`)
    .join(', ');
  const name = preview.description && preview.description !== 'Object' ? `${preview.description} ` : '';
  if (!fields) return `${name}{}`;
  return `${name}{${fields}${overflow}}`;
}

// A logged argument, rendered the way console.log renders it: a string argument
// appears as itself, not quoted, because that is what the page meant to print.
function formatRemote(object) {
  if (!object) return 'undefined';
  switch (object.type) {
    case 'undefined': return 'undefined';
    case 'string': return object.value !== undefined ? String(object.value) : String(object.description ?? '');
    case 'number':
    case 'boolean':
      return String(object.value !== undefined ? object.value : (object.description ?? ''));
    case 'bigint': return String(object.description ?? `${object.value}n`);
    case 'symbol': return String(object.description ?? 'Symbol()');
    case 'function': return object.description ? `ƒ ${firstLine(object.description)}` : 'ƒ';
    default: break;
  }
  if (object.subtype === 'null') return 'null';
  if (object.subtype === 'error') return String(object.description ?? 'Error');
  if (object.preview) return previewToString(object.preview);
  return String(object.description ?? object.className ?? 'Object');
}

// The same object as the answer to something the operator typed, where a string
// does need its quotes: at a prompt, `"4"` and `4` are different answers and
// the difference is the whole point of asking.
function formatResult(object) {
  if (object && object.type === 'string') return JSON.stringify(object.value ?? object.description ?? '');
  return formatRemote(object);
}

// console.log('%s scored %d', name, points) is one message, not three, and a
// page that uses the format string and then reads the substituted line back is
// not helped by seeing its own placeholders.
const FORMAT_SPECIFIER = /%([sdifoOjc%])/g;

function formatConsoleArgs(args) {
  const list = Array.isArray(args) ? args : [];
  if (!list.length) return '';

  const first = list[0];
  const isFormat = first && first.type === 'string' && typeof first.value === 'string'
    && FORMAT_SPECIFIER.test(first.value);
  FORMAT_SPECIFIER.lastIndex = 0;

  if (!isFormat) return list.map(formatRemote).join(' ');

  let next = 1;
  const head = String(first.value).replace(FORMAT_SPECIFIER, (match, kind) => {
    if (kind === '%') return '%';
    // %c carries CSS, which a plain-text log cannot honour: it consumes its
    // argument and prints nothing, exactly as the page intended visually.
    if (kind === 'c') { next += 1; return ''; }
    if (next >= list.length) return match;
    const argument = list[next++];
    if (kind === 'd' || kind === 'i') {
      const number = Number(argument && argument.value);
      return Number.isFinite(number) ? String(Math.trunc(number)) : formatRemote(argument);
    }
    if (kind === 'f') {
      const number = Number(argument && argument.value);
      return Number.isFinite(number) ? String(number) : formatRemote(argument);
    }
    return formatRemote(argument);
  });

  const rest = list.slice(next).map(formatRemote);
  return [head, ...rest].filter((part) => part !== '').join(' ');
}

function stackFrames(stackTrace) {
  if (!stackTrace || !Array.isArray(stackTrace.callFrames) || !stackTrace.callFrames.length) return null;
  return stackTrace.callFrames.slice(0, 30).map((frame) => ({
    function: frame.functionName || '(anonymous)',
    url: frame.url || '',
    line: typeof frame.lineNumber === 'number' ? frame.lineNumber + 1 : null,
    column: typeof frame.columnNumber === 'number' ? frame.columnNumber + 1 : null,
  }));
}

// console.<type> -> the four levels anyone filters on. Everything that is not
// an error or a warning is "log" with its own text; console.table and
// console.dir print their argument, which the preview already describes.
const CONSOLE_LEVELS = {
  error: 'error',
  assert: 'error',
  warning: 'warn',
  info: 'info',
  debug: 'debug',
  trace: 'log',
  dir: 'log',
  dirxml: 'log',
  table: 'log',
  count: 'log',
  timeEnd: 'log',
  log: 'log',
  startGroup: 'log',
  startGroupCollapsed: 'log',
  endGroup: 'log',
  profile: 'log',
  profileEnd: 'log',
};

const LOG_LEVELS = { error: 'error', warning: 'warn', info: 'info', verbose: 'debug' };

// The page-side serializer, for the answer to something the operator typed.
//
// A handle is not a value, and a prompt that answers "Object" has not answered.
// So the object is rendered where it lives, by a function CDP calls with `this`
// bound to it. That does mean the page's own code could in principle interfere
// with the rendering - it cannot with the shallow preview above, which comes
// from the engine - but a prompt whose whole purpose is to show you what the
// page holds is the one place where reading it the way the page sees it is the
// right trade.
//
// Caps everywhere: depth, items per object, string length and a budget of
// rendered nodes, because `window` or a React fibre would otherwise serialise
// most of the heap into a log line.
const SERIALIZE_FUNCTION = `function () {
  var MAX_DEPTH = 4;
  var MAX_ITEMS = 100;
  var MAX_STRING = 2000;
  var budget = 3000;

  function cut(s) { return s.length > MAX_STRING ? s.slice(0, MAX_STRING) + '\\u2026' : s; }
  function q(s) { try { return JSON.stringify(cut(s)); } catch (e) { return '"' + cut(s) + '"'; } }
  function pad(n) { var out = ''; for (var i = 0; i < n; i += 1) out += '  '; return out; }
  function keyish(k) { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : q(k); }

  function label(value) {
    try {
      if (value.nodeType === 1) {
        var out = '<' + String(value.nodeName).toLowerCase();
        if (value.id) out += ' id="' + value.id + '"';
        if (value.classList && value.classList.length) out += ' class="' + Array.prototype.join.call(value.classList, ' ') + '"';
        return out + '>';
      }
      if (value.nodeType === 3) return '#text ' + q(String(value.nodeValue || ''));
      if (value.nodeType === 9) return '#document';
    } catch (e) { /* a detached or cross-origin node */ }
    try {
      var ctor = value.constructor && value.constructor.name;
      if (ctor && ctor !== 'Object') return '[' + ctor + ']';
    } catch (e) { /* constructor can throw on a Proxy */ }
    return '[object]';
  }

  function render(value, depth, seen) {
    if (value === null) return 'null';
    var t = typeof value;
    if (t === 'undefined') return 'undefined';
    if (t === 'string') return q(value);
    if (t === 'number' || t === 'boolean') return String(value);
    if (t === 'bigint') return String(value) + 'n';
    if (t === 'symbol') { try { return String(value); } catch (e) { return 'Symbol()'; } }
    if (t === 'function') {
      var name = value.name ? ' ' + value.name : '';
      var head = '';
      try { head = String(value).split('\\n')[0]; } catch (e) { /* bound or native */ }
      return '\\u0192' + name + (head ? '   // ' + cut(head) : '');
    }

    if (seen.has(value)) return '[circular]';
    budget -= 1;
    if (budget <= 0) return label(value) + ' \\u2026';

    try {
      if (value instanceof Error) return String(value.stack || (value.name + ': ' + value.message));
      if (value instanceof Date) return value.toISOString();
      if (value instanceof RegExp) return String(value);
      if (typeof Node !== 'undefined' && value instanceof Node) return label(value);
      if (typeof Window !== 'undefined' && value instanceof Window) return '[Window ' + value.location.href + ']';
      if (typeof Promise !== 'undefined' && value instanceof Promise) return '[Promise]';
    } catch (e) { /* cross-realm: fall through to the generic path */ }

    if (depth >= MAX_DEPTH) return label(value) + ' \\u2026';

    seen.add(value);
    try {
      if (Array.isArray(value)) {
        if (!value.length) return '[]';
        var items = [];
        for (var i = 0; i < value.length && i < MAX_ITEMS; i += 1) {
          try { items.push(pad(depth + 1) + render(value[i], depth + 1, seen)); }
          catch (e) { items.push(pad(depth + 1) + '[unreadable]'); }
        }
        if (value.length > MAX_ITEMS) items.push(pad(depth + 1) + '\\u2026 ' + (value.length - MAX_ITEMS) + ' more');
        return '[\\n' + items.join(',\\n') + '\\n' + pad(depth) + ']';
      }

      if (typeof Map !== 'undefined' && value instanceof Map) {
        var pairs = [];
        var n = 0;
        value.forEach(function (v, k) {
          if (n++ >= MAX_ITEMS) return;
          pairs.push(pad(depth + 1) + render(k, depth + 1, seen) + ' => ' + render(v, depth + 1, seen));
        });
        return 'Map(' + value.size + ') {' + (pairs.length ? '\\n' + pairs.join(',\\n') + '\\n' + pad(depth) : '') + '}';
      }

      if (typeof Set !== 'undefined' && value instanceof Set) {
        var members = [];
        var m = 0;
        value.forEach(function (v) {
          if (m++ >= MAX_ITEMS) return;
          members.push(pad(depth + 1) + render(v, depth + 1, seen));
        });
        return 'Set(' + value.size + ') {' + (members.length ? '\\n' + members.join(',\\n') + '\\n' + pad(depth) : '') + '}';
      }

      var keys;
      try { keys = Object.keys(value); } catch (e) { return label(value); }
      if (!keys.length) return label(value) === '[object]' ? '{}' : label(value) + ' {}';

      var rows = [];
      for (var j = 0; j < keys.length && j < MAX_ITEMS; j += 1) {
        var key = keys[j];
        var rendered;
        // A getter can throw, or do work; either way that is the property's
        // business and not a reason to lose the rest of the object.
        try { rendered = render(value[key], depth + 1, seen); }
        catch (e) { rendered = '[threw: ' + (e && e.message ? e.message : 'error') + ']'; }
        rows.push(pad(depth + 1) + keyish(key) + ': ' + rendered);
      }
      if (keys.length > MAX_ITEMS) rows.push(pad(depth + 1) + '\\u2026 ' + (keys.length - MAX_ITEMS) + ' more');
      var prefix = label(value) === '[object]' ? '' : label(value) + ' ';
      return prefix + '{\\n' + rows.join(',\\n') + '\\n' + pad(depth) + '}';
    } finally {
      seen.delete(value);
    }
  }

  try {
    return render(this, 0, new WeakSet());
  } catch (e) {
    return '[could not be read: ' + (e && e.message ? e.message : 'error') + ']';
  }
}`;

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
    this.replMode = true;

    this.entries = [];
    // Every incoming event is handled through one chain. Some entries need a
    // round trip to the page before they can be written, and without a queue
    // those would land after events that arrived later - a transcript out of
    // order is worse than one that is a few milliseconds late.
    this.pipeline = Promise.resolve();
    this.previewBudget = PREVIEW_BUDGET;
    this.seq = 0;
    this.counter = 0;
    this.dropped = 0;
    // Bumped by clear() so a poller can tell "nothing new" from "the log you
    // were following no longer exists" and resync instead of waiting forever
    // on a cursor that will never come round again.
    this.generation = 1;
    this.startedAt = Date.now();
    this.lastPolled = Date.now();
    // Uncaught errors reach us twice, once per domain (measured: a page that
    // throws produces both Runtime.exceptionThrown and a Log entry with source
    // "javascript" and the same text). The exception carries the stack, so it
    // wins and the Log copy is dropped if it lands in the same moment.
    this.recentErrors = [];
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
      // Said before the replay rather than after it: Chrome's buffer survives
      // navigations, so what comes over on attach can be several page loads'
      // worth of history with no divider between them - and an operator who
      // reads that as "the page just did all this" would be reading it wrong.
      // The marker goes in first because the ordering of the replay against
      // the enable response is Chrome's business, not something to rely on.
      this._enqueue(() => {
        this._push({
          kind: 'notice',
          level: 'info',
          text: '\u2014 attached. What follows starts with the lines Chrome had already buffered for this tab, which may span more than one page load; an object in those shows only its type. Reload to record a page in full. \u2014',
        });
      });
      await client.Runtime.enable();
      // Browser-side messages: a blocked mixed-content load, a CSP violation, a
      // deprecation. The page never logged them, so Runtime alone would not
      // show them, and they are often the actual answer to "why is this page
      // behaving like that".
      try { await client.Log.enable(); } catch (error) { /* older Chrome: Runtime alone, then */ }
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

  // Each handler is given the connection the event came in on, rather than
  // reading this.client: the replay burst arrives while Runtime.enable is still
  // being awaited, so at that point this.client is still null - and an
  // enrichment that quietly skipped itself was exactly how every object the
  // page had logged came out as the word "Object".
  _wire(client) {
    client.onEvent('Runtime.consoleAPICalled', (p) => this._enqueue(() => this._onConsoleApi(p, client)));
    client.onEvent('Runtime.exceptionThrown', (p) => this._enqueue(() => this._onException(p)));
    client.onEvent('Log.entryAdded', (p) => this._enqueue(() => this._onLogEntry(p)));
    client.onEvent('Runtime.executionContextsCleared', () => this._enqueue(() => this._onContextsCleared()));
  }

  _enqueue(task) {
    this.pipeline = this.pipeline.then(task).catch(() => { /* one bad event must not stall the rest */ });
  }

  // Ask for the preview of an argument that came through without one. The
  // handle is the same object the page logged, so a no-op call that just hands
  // it back, with generatePreview set, produces exactly the preview a live
  // message would have carried.
  async _withPreview(argument, client) {
    if (!argument || !argument.objectId || argument.preview) return argument;
    // A function already describes itself with its own source.
    if (argument.type === 'function') return argument;
    if (this.previewBudget <= 0 || !client) return argument;
    this.previewBudget -= 1;

    try {
      const res = await client.Runtime.callFunctionOn({
        objectId: argument.objectId,
        functionDeclaration: 'function () { return this; }',
        generatePreview: true,
        silent: true,
      }, { timeoutMs: 3000 });
      const filled = res && res.result;
      if (filled && filled.objectId) {
        // Our own handle on an object the page still owns; letting go of it
        // does not touch the object itself.
        client.Runtime.releaseObject({ objectId: filled.objectId }).catch(() => {});
      }
      if (filled && filled.preview) return { ...argument, preview: filled.preview };
    } catch (error) {
      // The context it belonged to is gone, which is ordinary for a message
      // replayed from before a navigation.
    }
    return argument;
  }

  async _withPreviews(args, client) {
    const list = Array.isArray(args) ? args : [];
    if (!list.some((argument) => argument && argument.objectId && !argument.preview)) return list;
    const filled = [];
    for (const argument of list) filled.push(await this._withPreview(argument, client));
    return filled;
  }

  _push(entry) {
    const full = {
      id: `c${++this.counter}`,
      seq: ++this.seq,
      kind: 'console',
      level: 'log',
      text: '',
      source: null,
      url: null,
      line: null,
      column: null,
      stack: null,
      timestamp: Date.now(),
      ...entry,
    };
    full.text = clip(full.text);
    this.entries.push(full);
    while (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
      this.dropped += 1;
    }
    return full;
  }

  _rememberError(text) {
    const now = Date.now();
    this.recentErrors = this.recentErrors.filter((item) => now - item.at < 1500);
    this.recentErrors.push({ text, at: now });
  }

  _isRecentError(text) {
    const now = Date.now();
    this.recentErrors = this.recentErrors.filter((item) => now - item.at < 1500);
    return this.recentErrors.some((item) => item.text === text);
  }

  async _onConsoleApi(params, client) {
    const type = params.type || 'log';
    const text = formatConsoleArgs(await this._withPreviews(params.args, client));

    // console.clear() is the page asking for the evidence to be wiped. Said,
    // not obeyed: a log that a page can erase is no use for working out what
    // the page did, and this one is the operator's, not the page's.
    if (type === 'clear') {
      this._push({ kind: 'notice', level: 'info', text: 'The page called console.clear(). The log above was kept.' });
      return;
    }
    // console.groupEnd() takes no arguments and means nothing on its own line.
    if (type === 'endGroup' && !text) return;

    const stack = stackFrames(params.stackTrace);
    const top = stack && stack[0];
    const prefix = type === 'startGroup' || type === 'startGroupCollapsed' ? '▸ ' : '';
    this._push({
      kind: 'console',
      level: CONSOLE_LEVELS[type] || 'log',
      text: `${prefix}${text}`,
      source: `console.${type}`,
      url: top ? top.url : null,
      line: top ? top.line : null,
      column: top ? top.column : null,
      stack: type === 'trace' || CONSOLE_LEVELS[type] === 'error' ? stack : null,
    });
  }

  _onException(params) {
    const detail = params.exceptionDetails || {};
    const text = detail.exception?.description || detail.text || 'Uncaught error';
    this._rememberError(text);
    this._push({
      kind: 'exception',
      level: 'error',
      text,
      source: 'javascript',
      url: detail.url || null,
      line: typeof detail.lineNumber === 'number' ? detail.lineNumber + 1 : null,
      column: typeof detail.columnNumber === 'number' ? detail.columnNumber + 1 : null,
      stack: stackFrames(detail.stackTrace),
    });
  }

  _onLogEntry(params) {
    const entry = params.entry || {};
    // Console calls arrive through Runtime with their arguments intact; the Log
    // copy is a flattened string of the same thing.
    if (entry.source === 'console-api') return;
    const text = String(entry.text || '');
    if (entry.source === 'javascript' && this._isRecentError(text)) return;

    this._push({
      kind: 'browser',
      level: LOG_LEVELS[entry.level] || 'log',
      text,
      source: entry.source || 'browser',
      url: entry.url || null,
      line: typeof entry.lineNumber === 'number' ? entry.lineNumber + 1 : null,
      stack: stackFrames(entry.stackTrace),
    });
  }

  _onContextsCleared() {
    this._push({ kind: 'notice', level: 'info', text: '— navigated: a new document, and a fresh global —' });
  }

  list({ sinceSeq = 0, limit = DEFAULT_PAGE_SIZE } = {}) {
    this.lastPolled = Date.now();
    const since = Number.isFinite(sinceSeq) ? sinceSeq : 0;
    const capped = Math.min(Math.max(1, limit || DEFAULT_PAGE_SIZE), 2000);
    const changed = this.entries.filter((entry) => entry.seq > since);
    const page = changed.slice(0, capped);

    return {
      recording: true,
      connected: this.connected,
      generation: this.generation,
      next_seq: page.length ? page[page.length - 1].seq : since,
      pending: Math.max(0, changed.length - page.length),
      total: this.entries.length,
      dropped: this.dropped,
      max_entries: MAX_ENTRIES,
      started_at: this.startedAt,
      last_error: this.lastError,
      entries: page,
    };
  }

  clear() {
    this.entries = [];
    this.seq = 0;
    this.counter = 0;
    this.dropped = 0;
    this.generation += 1;
    this.recentErrors = [];
    this.previewBudget = PREVIEW_BUDGET;
    this.lastPolled = Date.now();
  }

  async _evaluateRaw(client, expression) {
    const params = {
      expression,
      objectGroup: EVAL_OBJECT_GROUP,
      // The command line API is what makes this a console rather than an eval
      // box: $0, $$('a'), copy(), keys(), dir().
      includeCommandLineAPI: true,
      generatePreview: true,
      // Some pages gate on it, and a prompt the operator typed into is a user
      // gesture by any honest reading.
      userGesture: true,
      awaitPromise: true,
      returnByValue: false,
      timeout: EVAL_TIMEOUT_MS,
      replMode: true,
    };
    if (!this.replMode) delete params.replMode;

    try {
      return await client.Runtime.evaluate(params);
    } catch (error) {
      // replMode is what lets `let x = 1` be typed twice without a redeclaration
      // error. Chrome versions that do not know the parameter reject the whole
      // command, so the capability is probed once and then remembered.
      if (this.replMode && /replMode|Invalid parameters/i.test(error.message || '')) {
        this.replMode = false;
        delete params.replMode;
        return client.Runtime.evaluate(params);
      }
      throw error;
    }
  }

  // Resolve a promise the evaluate handed back. A promise that never settles is
  // not an error and not worth waiting out: the deadline passes, nothing is
  // resolved, and the answer stays the promise itself - which renders as
  // `Promise {<pending>}`, the true answer to what was asked.
  async _settle(client, remote) {
    try {
      return await client.Runtime.awaitPromise({
        promiseObjectId: remote.objectId,
        returnByValue: false,
        generatePreview: true,
      }, { timeoutMs: EVAL_TIMEOUT_MS });
    } catch (error) {
      return null;
    }
  }

  async _format(client, remote) {
    if (!remote || !remote.objectId) return formatResult(remote);
    // A promise still unsettled after the deadline: only the engine knows its
    // state, and the preview carries it. Serialising it in the page could not,
    // because JavaScript cannot read a promise's state synchronously.
    if (remote.subtype === 'promise') return formatResult(remote);
    try {
      const res = await client.Runtime.callFunctionOn({
        objectId: remote.objectId,
        functionDeclaration: SERIALIZE_FUNCTION,
        returnByValue: true,
        awaitPromise: false,
        // The serializer must never turn into an exception of its own: the
        // answer the operator asked for is still there in the preview.
        silent: true,
      });
      if (!res.exceptionDetails) {
        const value = res.result && res.result.value;
        if (typeof value === 'string' && value) return value;
      }
    } catch (error) { /* fall back to the engine's own description */ }
    return formatResult(remote);
  }

  async evaluate(expression) {
    this.lastPolled = Date.now();
    const client = await this.ensureConnected();

    // The prompt line goes in first, so the log reads as a transcript even when
    // the answer takes a while or never comes.
    const echo = this._push({ kind: 'input', level: 'input', text: expression });

    let result;
    try {
      result = await this._evaluateRaw(client, expression);
    } catch (error) {
      const text = `Could not run it: ${error.message}`;
      this._push({ kind: 'result', level: 'error', text });
      return { ok: false, threw: false, text, error: error.message, input_id: echo.id };
    }

    if (result.exceptionDetails) {
      const detail = result.exceptionDetails;
      const text = detail.exception?.description || detail.text || 'Evaluation failed';
      const entry = this._push({
        kind: 'result',
        level: 'error',
        text,
        source: 'console',
        stack: stackFrames(detail.stackTrace),
      });
      return { ok: false, threw: true, text, input_id: echo.id, entry_id: entry.id };
    }

    let remote = result.result || {};
    // Measured: an evaluate carrying both replMode and awaitPromise hands back
    // the promise itself, not what it resolved to. replMode is what lets
    // `let x = 1` be typed twice, so it stays, and the promise is settled in a
    // second step - which is what DevTools does as well.
    if (remote.subtype === 'promise' && remote.objectId) {
      const settled = await this._settle(client, remote);
      if (settled && settled.exceptionDetails) {
        const detail = settled.exceptionDetails;
        const thrownText = detail.exception?.description || detail.text || 'The promise rejected';
        const rejected = this._push({
          kind: 'result',
          level: 'error',
          text: thrownText,
          source: 'console',
          stack: stackFrames(detail.stackTrace),
        });
        try { await client.Runtime.releaseObjectGroup({ objectGroup: EVAL_OBJECT_GROUP }); }
        catch (error) { /* nothing retained */ }
        return { ok: false, threw: true, text: thrownText, input_id: echo.id, entry_id: rejected.id };
      }
      if (settled) remote = settled.result || {};
    }

    const text = await this._format(client, remote);
    // Whatever the expression left behind is let go immediately; the text above
    // is already a copy of what mattered.
    try { await client.Runtime.releaseObjectGroup({ objectGroup: EVAL_OBJECT_GROUP }); }
    catch (error) { /* nothing retained, or a Chrome without the command */ }

    const entry = this._push({
      kind: 'result',
      level: 'result',
      text,
      source: 'console',
    });
    return {
      ok: true,
      threw: false,
      text,
      type: remote.type || 'undefined',
      subtype: remote.subtype || null,
      class_name: remote.className || null,
      input_id: echo.id,
      entry_id: entry.id,
    };
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

async function ensureRecorder(host, port, targetId) {
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
  return recorder;
}

async function start(host, port, targetId) {
  const recorder = await ensureRecorder(host, port, targetId);
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

function idleStatus() {
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
  if (!recorder) return idleStatus();
  // Heal a session that dropped while nobody was looking (a cross-process
  // navigation, a browser hiccup) rather than reporting an empty log forever.
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

// Typing at the prompt starts the recorder if it is not running: the answer is
// of no use without the transcript it belongs to, and a caller that only wants
// to run one expression has POST /tabs/{tabId}/evaluate for that.
async function evaluate(host, port, targetId, expression) {
  const recorder = await ensureRecorder(host, port, targetId);
  return recorder.evaluate(expression);
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
  evaluate,
  MAX_ENTRIES,
  IDLE_STOP_MS,
  // Exported for tests: the formatting is where the subtle bugs live.
  _internals: { formatRemote, formatResult, formatConsoleArgs, previewToString },
};
