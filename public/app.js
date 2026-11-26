const socket = io();

// --- Elements ---
const pageTitle = document.getElementById('page-title');
const btnAddInstance = document.getElementById('btnAddInstance');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const htmlEl = document.documentElement;

// Navigation
const navDashboard = document.getElementById('nav-dashboard');
const navServer = document.getElementById('nav-server');
const navConfig = document.getElementById('nav-config');
const views = {
    dashboard: document.getElementById('view-dashboard'),
    server: document.getElementById('view-server'),
    config: document.getElementById('view-config')
};

// Dashboard
const viewToggleBtns = document.querySelectorAll('#viewToggle button');
const instancesList = document.getElementById('instances-list');
const instancesTableContainer = document.getElementById('instances-table-container');
const instancesTableBody = document.getElementById('instances-table-body');
let currentViewMode = 'grid'; 

// Add Instance
const addInstanceForm = document.getElementById('addInstanceForm');
const instanceType = document.getElementById('instanceType');
const localOptionsInputs = document.getElementById('localOptionsInputs');
const localOptionsCheckboxes = document.getElementById('localOptionsCheckboxes');
const launchMode = document.getElementById('launchMode');
const useSocat = document.getElementById('use_socat');
const inputDebugPort = document.getElementById('inputDebugPort');
const inputForwardPort = document.getElementById('inputForwardPort');
const editInstanceForm = document.getElementById('editInstanceForm');
const editInstanceName = document.getElementById('editInstanceName');
const editLaunchModeGroup = document.getElementById('editLaunchModeGroup');
const editLaunchMode = document.getElementById('editLaunchMode');
const editInstanceNotes = document.getElementById('editInstanceNotes');
const editChromeFlags = document.getElementById('editChromeFlags');
const editForwardGroup = document.getElementById('editForwardGroup');
const editUseSocat = document.getElementById('editUseSocat');
const editForwardPort = document.getElementById('editForwardPort');
const editForwardHint = document.getElementById('editForwardHint');
const editInstanceModal = new bootstrap.Modal(document.getElementById('editInstanceModal'));
const importCookiesModalEl = document.getElementById('importCookiesModal');
const importCookiesModal = new bootstrap.Modal(importCookiesModalEl);
const importCookiesForm = document.getElementById('importCookiesForm');
const importCookiesInstanceName = document.getElementById('importCookiesInstanceName');
const importCookiesFilesInput = document.getElementById('importCookiesFiles');
const importCookiesSelectedFiles = document.getElementById('importCookiesSelectedFiles');
const importCookiesResult = document.getElementById('importCookiesResult');
const importCookiesSubmitBtn = document.getElementById('importCookiesSubmitBtn');
const importStorageOptions = document.getElementById('importStorageOptions');
const importSessionOrigin = document.getElementById('importSessionOrigin');
const importSessionOpenUrl = document.getElementById('importSessionOpenUrl');
const importSessionMirror = document.getElementById('importSessionMirror');
const importSessionClear = document.getElementById('importSessionClear');

// Control Modal
const controlModalEl = document.getElementById('controlModal');
const controlModal = new bootstrap.Modal(controlModalEl);
const tabList = document.getElementById('tabList');
const tabContent = document.getElementById('tabContent');
const noTabSelected = document.getElementById('noTabSelected');
const tabScreenshot = document.getElementById('tabScreenshot');
const activeTabUrl = document.getElementById('activeTabUrl');
const tabCountBadge = document.getElementById('tabCountBadge');
const screenWrapper = document.getElementById('screenWrapper');
const focusHint = document.getElementById('focusHint');
const btnLiveToggle = document.getElementById('btnLiveToggle');
const liveToggleLabel = document.getElementById('liveToggleLabel');
const liveFps = document.getElementById('liveFps');
const liveScale = document.getElementById('liveScale');
const streamStatusDot = document.getElementById('streamStatusDot');
const streamStatusText = document.getElementById('streamStatusText');
const streamLatency = document.getElementById('streamLatency');
const btnDeviceDesktop = document.getElementById('btnDeviceDesktop');
const btnDeviceMobile = document.getElementById('btnDeviceMobile');
const devicePresetSelect = document.getElementById('devicePreset');
const btnNetworkToggle = document.getElementById('btnNetworkToggle');
const btnCopySelection = document.getElementById('btnCopySelection');
const btnPasteIntoPage = document.getElementById('btnPasteIntoPage');
const networkPanel = document.getElementById('networkPanel');
const networkRows = document.getElementById('networkRows');
const networkEmpty = document.getElementById('networkEmpty');
const networkRequestModal = document.getElementById('networkRequestModal');
const netModalDialog = networkRequestModal.querySelector('.net-modal-dialog');
const netModalMethod = document.getElementById('netModalMethod');
const netModalUrl = document.getElementById('netModalUrl');
const netModalMeta = document.getElementById('netModalMeta');
const netModalPosition = document.getElementById('netModalPosition');
const netModalBody = document.getElementById('netModalBody');
const netModalFallback = document.getElementById('netModalFallback');
const netModalFallbackText = document.getElementById('netModalFallbackText');
const netModalFallbackLabel = document.getElementById('netModalFallbackLabel');
const btnNetPrev = document.getElementById('btnNetPrev');
const btnNetNext = document.getElementById('btnNetNext');
const networkFilter = document.getElementById('networkFilter');
const networkTypeFilter = document.getElementById('networkTypeFilter');
const networkFailedOnly = document.getElementById('networkFailedOnly');
const networkCount = document.getElementById('networkCount');
const networkStatusDot = document.getElementById('networkStatusDot');
const pasteBox = document.getElementById('pasteBox');
const pasteBoxText = document.getElementById('pasteBoxText');
const controlNotice = document.getElementById('controlNotice');
const importSessionPaste = document.getElementById('importSessionPaste');
const importPasteSniff = document.getElementById('importPasteSniff');

// Dashboard toolbar
const instanceSearch = document.getElementById('instanceSearch');
const fleetSummary = document.getElementById('fleetSummary');
const btnStartAll = document.getElementById('btnStartAll');
const btnStopAll = document.getElementById('btnStopAll');

// Log Modal
const logModal = new bootstrap.Modal(document.getElementById('logModal'));
const logContent = document.getElementById('instance-logs-content');

// Stats
const serverLogsContainer = document.getElementById('server-logs');

// --- State ---
let allInstances = [];
let currentInstanceId = null;
let currentTabId = null;
let statsInterval = null;
let currentLogInstanceId = null;
let currentEditInstanceId = null;
let currentImportInstanceId = null;
let searchQuery = '';
let serverCaps = { platform: null, xvfb_supported: true };

// Control / streaming state
let liveEnabled = true;       // is live streaming toggled on
let streamLoopActive = false; // is the async capture loop currently running
let controlModalOpen = false;
let currentTabObjectUrl = null; // object URL of the frame currently shown
let dragging = false;           // mouse drag in progress over the screenshot

// Device emulation state for the tab being controlled
let devicePresets = [];
let defaultPresetId = null;
let currentEmulation = null;    // null means the real desktop browser

// Network panel state
let networkOpen = false;
let networkTabId = null;        // the tab the recorder is attached to
let networkEntries = new Map(); // id -> entry, newest last
let networkCursor = 0;          // last seq seen
let networkGeneration = 0;
let networkPollTimer = null;
let networkSelectedId = null;
let networkDropped = 0;
let networkVisibleIds = [];      // ids in the order the list shows them
let networkModalOpen = false;
let networkModalRequest = null;  // the request the popup is showing
let networkModalToken = 0;       // drops the answer to a superseded fetch
let networkModalOpener = null;   // element to hand focus back to on close

// --- Init ---

// Theme Init
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

themeToggle.addEventListener('click', () => {
    const current = htmlEl.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

function setTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
        themeIcon.className = 'bi bi-moon-stars-fill';
    } else {
        themeIcon.className = 'bi bi-sun-fill';
    }
}

socket.on('instances_updated', (instances) => {
    allInstances = instances;
    renderInstances(instances);
});

// --- Platform capabilities (e.g. Xvfb is Linux-only) ---
async function loadCapabilities() {
    try {
        const caps = await fetchAPI('/api/capabilities');
        if (caps && typeof caps === 'object') serverCaps = caps;
    } catch (e) {
        // Keep optimistic defaults if the probe fails.
    }
    applyCapabilities();
}

function applyCapabilities() {
    // Disable the Xvfb option on platforms that don't support it (macOS/Windows)
    // and relabel it so the limitation is obvious.
    [launchMode, editLaunchMode].forEach((select) => {
        if (!select) return;
        const opt = select.querySelector('option[value="xvfb"]');
        if (!opt) return;
        if (serverCaps.xvfb_supported) {
            opt.disabled = false;
            opt.textContent = 'Headless via Xvfb';
        } else {
            opt.disabled = true;
            opt.textContent = 'Headless via Xvfb (Linux only)';
            // If anything left an unsupported value selected, fall back.
            if (select.value === 'xvfb') select.value = 'chrome_headless';
        }
    });
}

loadCapabilities();

// Prepare Add Instance Form with Random Values
const addInstanceModalEl = document.getElementById('addInstanceModal');
addInstanceModalEl.addEventListener('show.bs.modal', () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const nameInput = addInstanceForm.querySelector('[name="name"]');
    
    // Generate Unique Name
    let name = `Chrome-${randomId}`;
    while (allInstances.some(inst => inst.name === name)) {
        name = `Chrome-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    nameInput.value = name;

    // Generate Unique Debug Port (Range 9222-9999)
    let dPort = 9222 + Math.floor(Math.random() * 700);
    // Ensure dPort is even or just check uniqueness for both dPort and dPort+1
    while (allInstances.some(inst => inst.port === dPort || inst.forward_port === dPort + 1)) {
        dPort += 2;
    }
    inputDebugPort.value = dPort;

    // Forward Port is always Debug Port + 1
    inputForwardPort.value = dPort + 1;
    
    // Default checkboxes
    instanceType.value = 'local';
    launchMode.value = serverCaps.xvfb_supported ? 'xvfb' : 'chrome_headless';
    useSocat.checked = true;
    syncInstanceTypeOptions();
});

// View Toggle
viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        viewToggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentViewMode = btn.dataset.view;
        toggleDashboardView();
    });
});

function toggleDashboardView() {
    if (currentViewMode === 'grid') {
        instancesList.classList.remove('d-none');
        instancesTableContainer.classList.add('d-none');
    } else {
        instancesList.classList.add('d-none');
        instancesTableContainer.classList.remove('d-none');
    }
}

// Navigation
function switchView(viewName) {
    Object.values(views).forEach(el => el.classList.add('d-none'));
    [navDashboard, navServer, navConfig].forEach(el => el.classList.remove('active'));

    views[viewName].classList.remove('d-none');
    
    if (viewName === 'dashboard') {
        navDashboard.classList.add('active');
        pageTitle.innerText = 'Dashboard';
        btnAddInstance.parentElement.classList.remove('d-none'); 
        stopStats();
    } else if (viewName === 'server') {
        navServer.classList.add('active');
        pageTitle.innerText = 'My Server';
        btnAddInstance.parentElement.classList.add('d-none');
        startStats();
    } else if (viewName === 'config') {
        navConfig.classList.add('active');
        pageTitle.innerText = 'Configuration';
        btnAddInstance.parentElement.classList.add('d-none');
        loadConfig();
        loadRestSettings();
        stopStats();
    }
}

navDashboard.onclick = () => switchView('dashboard');
navServer.onclick = () => switchView('server');
navConfig.onclick = () => switchView('config');

// --- Render Logic ---

function getFilteredInstances(instances) {
    if (!searchQuery) return instances;
    const q = searchQuery.toLowerCase();
    return instances.filter(inst =>
        (inst.name || '').toLowerCase().includes(q) ||
        (inst.notes || '').toLowerCase().includes(q) ||
        (inst.host || '').toLowerCase().includes(q) ||
        String(inst.port || '').includes(q) ||
        (inst.status || '').toLowerCase().includes(q)
    );
}

function renderFleetSummary(instances) {
    if (!fleetSummary) return;
    const running = instances.filter(i => i.status === 'running').length;
    const total = instances.length;
    const tabs = instances.reduce((sum, i) => sum + (typeof i.tab_count === 'number' ? i.tab_count : 0), 0);
    fleetSummary.innerText = `${running}/${total} running · ${tabs} tab${tabs === 1 ? '' : 's'}`;
}

// Human-readable bytes (e.g. 412 MB, 1.3 GB). Returns '—' for non-numbers.
function formatBytes(bytes) {
    if (typeof bytes !== 'number' || !isFinite(bytes) || bytes < 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024;
        i++;
    }
    return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

// My Server page: live fleet overview (stat card + fleet table).
function renderServerFleet(instances) {
    const running = instances.filter(i => i.status === 'running');
    const totalTabs = instances.reduce((sum, i) => sum + (typeof i.tab_count === 'number' ? i.tab_count : 0), 0);

    const instStat = document.getElementById('stats-instances');
    if (instStat) instStat.innerText = `${running.length}/${instances.length}`;
    const tabsStat = document.getElementById('stats-total-tabs');
    if (tabsStat) tabsStat.innerText = totalTabs;

    const summary = document.getElementById('fleet-status-summary');
    if (summary) summary.innerText = `${running.length} running · ${instances.length - running.length} stopped`;

    const body = document.getElementById('fleet-status-body');
    if (!body) return;
    if (!instances.length) {
        body.innerHTML = '<tr><td colspan="8" class="text-center text-theme-muted py-3">No instances configured.</td></tr>';
        return;
    }
    body.innerHTML = instances.map(inst => `
        <tr>
            <td><span class="status-indicator status-${inst.status}"></span> <span class="x-small text-uppercase">${inst.status}</span></td>
            <td class="fw-bold">${escapeHtml(inst.name)}</td>
            <td><span class="badge ${inst.type === 'local' ? 'bg-info' : 'bg-warning'} text-dark">${inst.type}</span></td>
            <td class="font-monospace x-small">${escapeHtml(inst.host)}:${inst.port}</td>
            <td class="x-small text-theme-muted">${escapeHtml(inst.launch_backend_label || inst.launch_mode_label || '—')}</td>
            <td class="x-small ${inst.status === 'running' ? 'uptime' : 'text-theme-muted'}" ${inst.status === 'running' && inst.started_at ? `data-started-at="${escapeHtml(inst.started_at)}"` : ''}>${inst.status === 'running' && inst.started_at ? `<i class="bi bi-clock-history"></i> ${formatUptimeFrom(inst.started_at)}` : '—'}</td>
            <td class="x-small">${inst.status === 'running' ? (typeof inst.tab_count === 'number' ? inst.tab_count : '…') : '—'}</td>
            <td class="x-small">${inst.status === 'running' ? (typeof inst.memory_bytes === 'number' ? formatBytes(inst.memory_bytes) : (inst.type === 'local' ? '…' : '—')) : '—'}</td>
        </tr>
    `).join('');
}

function renderInstanceMeta(inst) {
    if (inst.status !== 'running') return '';
    const uptime = inst.started_at
        ? `<span class="meta-chip uptime" data-started-at="${escapeHtml(inst.started_at)}" title="Running since ${escapeHtml(inst.started_at)}">
               <i class="bi bi-clock-history"></i> ${formatUptimeFrom(inst.started_at)}
           </span>`
        : '';
    const tabLabel = typeof inst.tab_count === 'number' ? inst.tab_count : '…';
    const tabs = `<span class="meta-chip" title="Open tabs"><i class="bi bi-window-stack"></i> ${tabLabel} tab${tabLabel === 1 ? '' : 's'}</span>`;
    return `<div class="d-flex flex-wrap gap-2 mb-3">${uptime}${tabs}</div>`;
}

function renderInstances(instances) {
    renderFleetSummary(instances);
    renderServerFleet(instances);
    const filtered = getFilteredInstances(instances);

    if (!filtered.length) {
        const emptyMsg = searchQuery
            ? `No instances match "${escapeHtml(searchQuery)}".`
            : 'No instances yet. Click "New Instance" to add one.';
        instancesList.innerHTML = `<div class="col-12"><div class="text-center text-theme-muted py-5">${emptyMsg}</div></div>`;
        instancesTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-theme-muted py-4">${emptyMsg}</td></tr>`;
        return;
    }

    // Grid Render
    instancesList.innerHTML = filtered.map(inst => {
        let interfaceList = '';
        if (inst.interfaces && inst.forward_port) {
            interfaceList = inst.interfaces.map(iface =>
                `<div class="text-info" style="font-size: 0.8rem;">${iface.address}:${inst.forward_port}</div>`
            ).join('');
        }

        return `
        <div class="col">
            <div class="card card-theme h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0 fs-6 text-truncate cursor-pointer text-primary"
                        title="Click to Control"
                        onclick="openControl(${inst.id}, '${escapeAttr(inst.name)}')">
                        <i class="bi bi-browser-chrome me-1"></i> ${escapeHtml(inst.name)}
                    </h5>
                    <span class="badge ${inst.type === 'local' ? 'bg-info' : 'bg-warning'} text-dark">${inst.type}</span>
                </div>
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <span class="status-indicator status-${inst.status}"></span>
                        <span class="text-uppercase small fw-bold">${inst.status}</span>
                        <span class="ms-auto x-small text-theme-muted font-monospace user-select-all text-nowrap"
                              title="Use this id in the REST API, e.g. /rest/instances/${inst.id}/tabs">ID of instance: ${inst.id}</span>
                    </div>

                    ${renderInstanceMeta(inst)}

                    <div class="mb-3" title="${escapeHtml(inst.launch_reason || '')}">
                        <small class="text-theme-muted d-block fw-bold" style="font-size: 0.7rem;">MODE</small>
                        <div class="d-flex flex-wrap gap-2 mb-1">
                            ${renderLaunchFlags(inst)}
                        </div>
                        <span class="small text-theme-muted">${escapeHtml(inst.launch_backend_label || inst.launch_mode_label || 'Unknown')}</span>
                        ${(inst.chrome_flags || []).length ? `<span class="badge bg-secondary ms-1" title="${escapeAttr(inst.chrome_flags.join('\n'))}"><i class="bi bi-flag"></i> ${inst.chrome_flags.length} switch${inst.chrome_flags.length === 1 ? '' : 'es'}</span>` : ''}
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-theme-muted d-block fw-bold" style="font-size: 0.7rem;">HOST</small>
                        <span class="font-monospace user-select-all">${inst.host}:${inst.port}</span>
                    </div>

                    ${inst.forward_port ? `
                    <div class="mb-2">
                        <small class="text-theme-muted d-block fw-bold" style="font-size: 0.7rem;">FORWARD</small>
                        ${interfaceList || `<span class="font-monospace">:${inst.forward_port}</span>`}
                    </div>` : ''}

                    ${inst.notes ? `
                    <div class="mt-3 p-2 bg-theme-surface rounded small text-theme-muted border-theme border-start border-4">
                        <i class="bi bi-sticky me-1"></i> ${escapeHtml(inst.notes)}
                    </div>` : ''}
                </div>
                <div class="card-footer d-flex flex-wrap gap-2 p-2">
                     ${getActions(inst)}
                </div>
            </div>
        </div>`;
    }).join('');

    // Table Render
    instancesTableBody.innerHTML = filtered.map(inst => `
        <tr>
            <td><span class="status-indicator status-${inst.status}"></span> ${inst.status}</td>
            <td class="font-monospace user-select-all">${inst.id}</td>
            <td>
                <div class="fw-bold cursor-pointer text-primary" onclick="openControl(${inst.id}, '${escapeAttr(inst.name)}')">${escapeHtml(inst.name)}</div>
                ${inst.notes ? `<div class="x-small text-theme-muted">${escapeHtml(inst.notes)}</div>` : ''}
            </td>
            <td><span class="badge ${inst.type === 'local' ? 'bg-info' : 'bg-warning'} text-dark">${inst.type}</span></td>
            <td>
                ${inst.status === 'running'
                    ? `<div class="x-small uptime" data-started-at="${escapeHtml(inst.started_at || '')}"><i class="bi bi-clock-history"></i> ${inst.started_at ? formatUptimeFrom(inst.started_at) : '—'}</div>
                       <div class="x-small text-theme-muted"><i class="bi bi-window-stack"></i> ${typeof inst.tab_count === 'number' ? inst.tab_count : '…'} tabs</div>`
                    : '<span class="x-small text-theme-muted">—</span>'}
            </td>
            <td title="${escapeHtml(inst.launch_reason || '')}">
                <div class="d-flex flex-wrap gap-1 mb-1">
                    ${renderLaunchFlags(inst)}
                </div>
                <div class="x-small text-theme-muted">${escapeHtml(inst.launch_backend_label || inst.launch_mode_label || 'Unknown')}</div>
            </td>
            <td class="font-monospace">${inst.host}:${inst.port}</td>
            <td class="font-monospace">${inst.forward_port || '-'}</td>
            <td>
                <div class="d-flex flex-wrap gap-2">
                    ${getActions(inst, true)}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderLaunchFlags(inst) {
    return [
        getLaunchFlagBadge('GUI', inst.launch_mode === 'gui', inst.launch_mode === 'gui' ? 'warning text-dark' : 'secondary'),
        getLaunchFlagBadge('HEADLESS', Boolean(inst.headless_enabled), inst.headless_enabled ? 'success' : 'secondary'),
        getLaunchFlagBadge('XVFB', Boolean(inst.xvfb_enabled), inst.xvfb_enabled ? 'primary' : 'secondary')
    ].join('');
}

function getLaunchFlagBadge(label, enabled, variant) {
    return `<span class="badge bg-${variant}">${label} ${enabled ? 'ON' : 'OFF'}</span>`;
}

function getActions(inst, small = false) {
    const btnClass = small ? 'btn-sm btn-theme-secondary' : 'btn-sm flex-grow-1 btn-theme-secondary';
    const canImportCookies = inst.type === 'external' || inst.status === 'running';
    
    let startStopBtn = '';
    if (inst.status === 'stopped') {
        startStopBtn = `<button class="btn ${small ? 'btn-sm btn-success' : 'btn-sm flex-grow-1 btn-success'}" onclick="startInstance(${inst.id})"><i class="bi bi-play-fill"></i> ${small ? '' : 'Start'}</button>`;
    } else {
        startStopBtn = `<button class="btn ${small ? 'btn-sm btn-danger' : 'btn-sm flex-grow-1 btn-danger'}" onclick="stopInstance(${inst.id})"><i class="bi bi-stop-fill"></i> ${small ? '' : 'Stop'}</button>`;
    }

    return `
        ${startStopBtn}
        <button class="btn ${btnClass}" onclick="openControl(${inst.id}, '${inst.name}')" ${inst.status !== 'running' ? 'disabled' : ''}>
            <i class="bi bi-gear-fill"></i> ${small ? '' : 'Control'}
        </button>
        <button class="btn ${btnClass}" onclick="openLogs(${inst.id})">
            <i class="bi bi-journal-text"></i> ${small ? '' : 'Logs'}
        </button>
        <button class="btn ${btnClass}" onclick="openImportCookies(${inst.id})" title="Import Session" ${canImportCookies ? '' : 'disabled'}>
            <i class="bi bi-box-arrow-in-down"></i> ${small ? '' : 'Import Session'}
        </button>
        <button class="btn ${btnClass}" onclick="openEditInstance(${inst.id})" ${inst.status !== 'stopped' ? 'disabled' : ''}>
            <i class="bi bi-pencil-square"></i> ${small ? '' : 'Edit'}
        </button>
        <button class="btn ${small ? 'btn-sm btn-outline-danger' : 'btn-sm btn-outline-danger'}" onclick="deleteInstance(${inst.id})">
            <i class="bi bi-trash"></i>
        </button>
    `;
}

// --- Reusable confirmation modal -----------------------------------------
// Stopping an instance tears down a live browser and every tab in it, so it
// must never be one stray click away. Resolves true only if the user confirms;
// dismissing the modal any other way (Cancel, backdrop, Esc, the X) resolves
// false. Falls back to the native confirm() if Bootstrap or the markup is
// missing, so an action can never silently proceed unconfirmed.
let confirmModalInstance = null;
let confirmModalGeneration = 0;

// Bootstrap's hide() is a no-op while the show transition is still running, so
// a confirm click that lands inside that window would leave the dialog open
// *and* never resolve — a safety prompt that silently swallows the action.
// Retry briefly until the modal is actually gone; the generation token stops a
// stale retry from closing a dialog that has since been reopened.
function hideConfirmModal(generation, attempt = 0) {
    if (!confirmModalInstance || generation !== confirmModalGeneration) return;
    confirmModalInstance.hide();
    const el = document.getElementById('confirmModal');
    if (attempt < 20 && el && el.classList.contains('show')) {
        setTimeout(() => hideConfirmModal(generation, attempt + 1), 50);
    }
}

function confirmAction(options = {}) {
    const {
        title = 'Are you sure?',
        messageHtml = '',
        detailHtml = '',
        confirmLabel = 'Confirm',
        confirmClass = 'btn-danger',
        icon = 'bi-exclamation-triangle-fill text-warning',
    } = options;

    const el = document.getElementById('confirmModal');
    if (!el || typeof bootstrap === 'undefined') {
        const plain = String(messageHtml).replace(/<[^>]*>/g, '');
        return Promise.resolve(window.confirm(`${title}\n\n${plain}`));
    }

    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalMessage').innerHTML = messageHtml;
    document.getElementById('confirmModalIcon').className = `bi ${icon} me-2`;

    const detail = document.getElementById('confirmModalDetail');
    detail.innerHTML = detailHtml;
    detail.classList.toggle('d-none', !detailHtml);

    const btn = document.getElementById('confirmModalConfirmBtn');
    btn.className = `btn ${confirmClass} px-4`;
    btn.innerText = confirmLabel;

    if (!confirmModalInstance) confirmModalInstance = new bootstrap.Modal(el);
    const generation = ++confirmModalGeneration;

    return new Promise((resolve) => {
        let settled = false;
        // Resolve on the click itself rather than on hidden.bs.modal: the
        // outcome must not depend on the dialog finishing its animation.
        const finish = (value) => {
            if (settled) return;
            settled = true;
            btn.removeEventListener('click', onConfirm);
            el.removeEventListener('hidden.bs.modal', onDismiss);
            resolve(value);
        };
        const onConfirm = () => { finish(true); hideConfirmModal(generation); };
        const onDismiss = () => finish(false);

        btn.addEventListener('click', onConfirm);
        el.addEventListener('hidden.bs.modal', onDismiss);
        confirmModalInstance.show();
    });
}

// Render label/value pairs into the modal's detail panel.
function confirmDetailRows(rows) {
    return rows
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value]) => `
            <div class="d-flex justify-content-between gap-3 py-1">
                <span class="text-theme-muted">${escapeHtml(label)}</span>
                <span class="fw-bold text-end">${escapeHtml(value)}</span>
            </div>`)
        .join('');
}

// --- Instance Actions ---
async function startInstance(id) {
    try {
        await fetchJsonOrThrow(`/api/instances/${id}/start`, { method: 'POST' });
    } catch (e) {
        alert('Failed to start instance: ' + (e.message || 'Unknown error'));
    }
}
async function stopInstance(id) {
    // Read the instance fresh rather than trusting the cached list: tab_count
    // and memory_bytes are filled in by the periodic sync, so a card opened
    // shortly after start would show the dialog without the very numbers that
    // make it worth reading. Fall back to the cache if the request fails.
    let inst = null;
    try { inst = await fetchAPI(`/api/instances/${id}`); } catch { /* fall back below */ }
    if (!inst || !inst.id) inst = allInstances.find(item => item.id === id) || null;

    const name = inst ? inst.name : `#${id}`;
    const tabs = inst && typeof inst.tab_count === 'number' ? inst.tab_count : null;

    const confirmed = await confirmAction({
        title: 'Stop instance?',
        messageHtml: `<b>${escapeHtml(name)}</b> will be shut down. Chrome and every tab it has open are closed.`
            + ' The profile on disk is kept, but anything in flight — uploads, unsaved form input — is lost.',
        detailHtml: confirmDetailRows([
            ['Endpoint', inst ? `${inst.host}:${inst.port}` : null],
            ['Mode', inst ? (inst.launch_mode_label || inst.launch_mode) : null],
            ['Open tabs', tabs === null ? null : `${tabs} tab${tabs === 1 ? '' : 's'} will be closed`],
            ['Memory', inst && typeof inst.memory_bytes === 'number' ? formatBytes(inst.memory_bytes) : null],
            ['Uptime', inst && inst.started_at ? formatUptimeFrom(inst.started_at) : null],
        ]),
        confirmLabel: 'Stop instance',
    });
    if (!confirmed) return;

    try {
        await fetchJsonOrThrow(`/api/instances/${id}/stop`, { method: 'POST' });
    } catch (e) {
        alert('Failed to stop instance: ' + (e.message || 'Unknown error'));
    }
}
async function deleteInstance(id) { if (confirm('Delete this instance?')) await fetchAPI(`/api/instances/${id}`, 'DELETE'); }

// --- Search & Bulk Actions ---
if (instanceSearch) {
    instanceSearch.addEventListener('input', () => {
        searchQuery = instanceSearch.value.trim();
        renderInstances(allInstances);
    });
}

async function bulkAction(targets, action, label, btn) {
    if (!targets.length) return;
    const original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${label}...`; }
    try {
        // Sequential to avoid hammering the host / port-allocation races on start.
        for (const inst of targets) {
            try { await fetchAPI(`/api/instances/${inst.id}/${action}`, 'POST'); }
            catch (e) { console.error(`Failed to ${action} ${inst.name}:`, e); }
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}

if (btnStartAll) {
    btnStartAll.addEventListener('click', () => {
        const targets = getFilteredInstances(allInstances).filter(i => i.status === 'stopped');
        if (!targets.length) { alert('No stopped instances to start.'); return; }
        bulkAction(targets, 'start', 'Starting', btnStartAll);
    });
}

if (btnStopAll) {
    btnStopAll.addEventListener('click', async () => {
        // Same reason as stopInstance: one fresh list so the tab total shown is
        // the real one. /api/instances is a single request for the whole fleet.
        let fleet = allInstances;
        try {
            const fresh = await fetchAPI('/api/instances');
            if (Array.isArray(fresh) && fresh.length) fleet = fresh;
        } catch { /* fall back to the cached list */ }

        const targets = getFilteredInstances(fleet).filter(i => i.status !== 'stopped');
        if (!targets.length) { alert('No running instances to stop.'); return; }

        const totalTabs = targets.reduce((sum, i) => sum + (typeof i.tab_count === 'number' ? i.tab_count : 0), 0);
        // Name every instance that is about to go down — "Stop all" acts on the
        // current search filter, so the set is not always what's on screen.
        const list = targets.map(i => `
            <div class="d-flex justify-content-between gap-3 py-1">
                <span class="fw-bold">${escapeHtml(i.name)}</span>
                <span class="text-theme-muted">${escapeHtml(`${i.host}:${i.port}`)}</span>
            </div>`).join('');

        const confirmed = await confirmAction({
            title: `Stop ${targets.length} instance${targets.length === 1 ? '' : 's'}?`,
            messageHtml: `Every instance listed below is shut down, closing <b>${totalTabs}</b> open tab${totalTabs === 1 ? '' : 's'} in total.`,
            detailHtml: list,
            confirmLabel: `Stop ${targets.length} instance${targets.length === 1 ? '' : 's'}`,
        });
        if (!confirmed) return;

        bulkAction(targets, 'stop', 'Stopping', btnStopAll);
    });
}

function openEditInstance(id) {
    const inst = allInstances.find(item => item.id === id);
    if (!inst) {
        alert('Instance not found');
        return;
    }
    currentEditInstanceId = id;
    editInstanceName.value = inst.name || '';
    editLaunchMode.value = inst.launch_mode && inst.launch_mode !== 'external' ? inst.launch_mode : 'chrome_headless';
    editLaunchModeGroup.style.display = inst.type === 'local' ? 'block' : 'none';
    editLaunchMode.disabled = inst.type !== 'local';
    editInstanceNotes.value = inst.notes || '';
    // Stored as an array; shown one per line, which is how people read them.
    editChromeFlags.value = (inst.chrome_flags || []).join('\n');

    // Forwarding is a local-spawner concern: an external resource is reached at
    // whatever address it already listens on, so there is nothing to publish.
    editForwardGroup.style.display = inst.type === 'local' ? 'block' : 'none';
    editUseSocat.checked = Boolean(inst.use_socat);
    editForwardPort.value = inst.forward_port || '';
    syncEditForwardControls();

    editInstanceModal.show();
}

function openImportCookies(id) {
    const inst = allInstances.find(item => item.id === id);
    if (!inst) {
        alert('Instance not found');
        return;
    }

    currentImportInstanceId = id;
    importCookiesForm.reset();
    importCookiesInstanceName.value = inst.name || '';
    setImportCookiesResult('', 'secondary', true);
    renderImportCookieFiles([]);
    importPasteSniff.classList.add('d-none');
    importStorageOptions.classList.add('d-none');
    importCookiesModal.show();

    // Whatever the instance is already looking at is nearly always the site the
    // session belongs to, so offer it rather than making someone type an origin.
    prefillImportOrigin(id);
}

async function prefillImportOrigin(instanceId) {
    try {
        const tabs = await fetchJsonOrThrow(`/api/instances/${instanceId}/tabs`);
        const page = (Array.isArray(tabs) ? tabs : []).find((tab) => tab.type === 'page' && /^https?:/i.test(tab.url || ''));
        if (!page || currentImportInstanceId !== instanceId) return;
        if (importSessionOrigin.value.trim()) return;
        importSessionOrigin.value = new URL(page.url).origin;
    } catch (error) {
        // A blank field is a fine fallback; this is a convenience, not a step.
    }
}

// The toggle owns the port field: with forwarding off there is no port to set,
// and turning it on without a port would mean guessing, so we suggest the same
// default the server would pick (debug port + 1) and show what it will publish.
function syncEditForwardControls() {
    const inst = allInstances.find(item => item.id === currentEditInstanceId);
    const debugPort = Number(inst?.port) || 0;
    const on = editUseSocat.checked;

    editForwardPort.disabled = !on;
    if (on && !editForwardPort.value.trim() && debugPort > 0) {
        editForwardPort.value = debugPort + 1;
    }

    if (!inst) {
        editForwardHint.textContent = '';
        return;
    }
    if (!on) {
        editForwardHint.textContent = `Forwarding off: the CDP port stays on ${inst.host}:${debugPort} only.`;
        return;
    }
    const forwardPort = editForwardPort.value.trim() || (debugPort + 1);
    editForwardHint.textContent =
        `Publishes ${forwardPort} on every interface and routes it to 127.0.0.1:${debugPort}. Applied the next time this instance starts.`;
}

editUseSocat.addEventListener('change', syncEditForwardControls);
editForwardPort.addEventListener('input', syncEditForwardControls);

editInstanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditInstanceId) return;

    const payload = {
        name: editInstanceName.value.trim(),
        notes: editInstanceNotes.value.trim(),
        chrome_flags: editChromeFlags.value
    };
    const inst = allInstances.find(item => item.id === currentEditInstanceId);
    if (inst?.type === 'local') {
        payload.launch_mode = editLaunchMode.value;
        payload.use_socat = editUseSocat.checked;
        // Only meaningful while forwarding is on; turning it off makes the
        // server drop the port itself, so sending one would just be noise.
        if (editUseSocat.checked) {
            const typed = editForwardPort.value.trim();
            // null, not "", asks the server for the default (debug port + 1).
            payload.forward_port = typed === '' ? null : Number(typed);
        }
    }

    const res = await fetch(`/api/instances/${currentEditInstanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Error: ' + (err.error || 'Failed to update instance'));
        return;
    }

    editInstanceModal.hide();
    currentEditInstanceId = null;
});

importCookiesModalEl.addEventListener('hidden.bs.modal', () => {
    currentImportInstanceId = null;
    importCookiesForm.reset();
    setImportCookiesResult('', 'secondary', true);
    renderImportCookieFiles([]);
    importPasteSniff.classList.add('d-none');
    importStorageOptions.classList.add('d-none');
    setImportSubmitState(false);
});

// A session can arrive as files, as pasted text, or as both. Everything here
// works off that combined list so the two are never second-class to each other.
async function collectImportSources() {
    const files = Array.from(importCookiesFilesInput.files || []);
    const sources = await Promise.all(files.map(async (file) => {
        try {
            return { name: file.name, content: await file.text(), file };
        } catch (error) {
            return { name: file.name, content: '', file, unreadable: true };
        }
    }));

    const pasted = importSessionPaste.value.trim();
    if (pasted) sources.push({ name: 'pasted text', content: pasted, pasted: true });
    return sources;
}

// Say what each source is before anything is sent. "Unsupported JSON cookie
// structure" after the fact is a poor way to learn that a localStorage dump is
// not a cookie file.
async function refreshImportSources() {
    const sources = await collectImportSources();
    const sniffed = sources.map((source) => ({
        ...source,
        kind: source.unreadable
            ? { kind: 'unknown', label: 'could not be read' }
            : sniffSessionFile(source.content),
    }));

    const fileItems = sniffed.filter((item) => item.file);
    renderImportCookieFiles(fileItems.map((item) => item.file), fileItems.map((item) => ({ file: item.file, kind: item.kind })));

    const paste = sniffed.find((item) => item.pasted);
    if (paste) {
        const tone = { cookies: 'text-primary', storage: 'text-info', mixed: 'text-success', unknown: 'text-danger' };
        importPasteSniff.className = `x-small mt-1 ${tone[paste.kind.kind] || 'text-theme-muted'}`;
        importPasteSniff.textContent = `Pasted text reads as: ${paste.kind.label}`;
        importPasteSniff.classList.remove('d-none');
    } else {
        importPasteSniff.classList.add('d-none');
    }

    const needsOrigin = sniffed.some((item) => item.kind.kind === 'storage' || item.kind.kind === 'mixed');
    importStorageOptions.classList.toggle('d-none', !needsOrigin);
    return sniffed;
}

importCookiesFilesInput.addEventListener('change', () => { refreshImportSources(); });

let importPasteSniffTimer = null;
importSessionPaste.addEventListener('input', () => {
    // Sniffing on every keystroke of a 40 KB paste is wasted work; one pass
    // once the pasting stops is enough.
    clearTimeout(importPasteSniffTimer);
    importPasteSniffTimer = setTimeout(() => refreshImportSources(), 180);
});

importCookiesForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentImportInstanceId) {
        alert('Instance not selected');
        return;
    }

    const sources = await collectImportSources();
    if (!sources.length) {
        setImportCookiesResult('Select a file or paste the session in.', 'danger');
        return;
    }

    setImportSubmitState(true);
    setImportCookiesResult('', 'secondary', true);

    try {
        const payload = { files: sources.map((source) => ({ name: source.name, content: source.content })) };

        if (!importStorageOptions.classList.contains('d-none')) {
            const origin = importSessionOrigin.value.trim();
            const openUrl = importSessionOpenUrl.value.trim();
            const mirror = importSessionMirror.value.trim();
            if (origin) payload.origin = origin;
            if (openUrl) payload.open_url = openUrl;
            if (mirror) payload.mirror_cookies = mirror;
            if (importSessionClear.checked) payload.clear = true;
        }

        const result = await fetchJsonOrThrow(`/api/instances/${currentImportInstanceId}/session/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const summary = formatSessionImportSummary(result);
        const hadTrouble = result.cookies?.failed
            || result.file_errors?.length
            || (result.storage?.mirrored_cookies || []).some((m) => !m.applied);
        setImportCookiesResult(summary, hadTrouble ? 'warning' : 'success');
        if (!hadTrouble) {
            setTimeout(() => importCookiesModal.hide(), 1200);
        }
    } catch (error) {
        setImportCookiesResult(error.message || 'Failed to import the session.', 'danger');
    } finally {
        setImportSubmitState(false);
    }
});

addInstanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(addInstanceForm);
    const data = Object.fromEntries(formData.entries());
    data.use_socat = formData.get('use_socat') === 'on';
        const res = await fetch('/api/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    
        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addInstanceModal')).hide();
            addInstanceForm.reset();
            launchMode.value = serverCaps.xvfb_supported ? 'xvfb' : 'chrome_headless';
            applyCapabilities();
            syncInstanceTypeOptions();
        } else {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Failed to save instance'));
        }
    });
    

[useSocat, inputDebugPort].forEach(el => { el.addEventListener('change', updateForwardPort); el.addEventListener('input', updateForwardPort); });
function updateForwardPort() { if (useSocat.checked) { const debugPort = parseInt(inputDebugPort.value) || 0; if (debugPort > 0) inputForwardPort.value = debugPort + 1; } }

function syncInstanceTypeOptions() {
    const isLocal = instanceType.value === 'local';
    localOptionsInputs.style.display = isLocal ? 'block' : 'none';
    localOptionsCheckboxes.style.display = isLocal ? 'block' : 'none';

    localOptionsInputs.querySelectorAll('input, textarea, select').forEach((el) => {
        el.disabled = !isLocal;
    });
    localOptionsCheckboxes.querySelectorAll('input, textarea, select').forEach((el) => {
        el.disabled = !isLocal;
    });
}

instanceType.addEventListener('change', syncInstanceTypeOptions);
syncInstanceTypeOptions();

// --- Logs ---
async function openLogs(id) { currentLogInstanceId = id; logContent.innerText = 'Loading...'; logModal.show(); refreshInstanceLogs(); }
async function refreshInstanceLogs() { if (!currentLogInstanceId) return; const res = await fetchAPI(`/api/instances/${currentLogInstanceId}/logs`); logContent.innerText = res.logs || 'No logs found.'; logContent.scrollTop = logContent.scrollHeight; }

// Emptying the logs loses the record of why an instance did what it did, and
// there is no undo, so it asks first.
async function clearInstanceLogs() {
    if (!currentLogInstanceId) return;
    const inst = allInstances.find(item => item.id === currentLogInstanceId);
    const confirmed = await confirmAction({
        title: 'Clear logs?',
        messageHtml: `Both log files for <b>${escapeHtml(inst ? inst.name : `#${currentLogInstanceId}`)}</b> are emptied:`
            + ' the manager log that records why it launched and stopped, and Chrome\'s own log.'
            + ' The instance keeps running and starts writing fresh lines straight away.',
        confirmLabel: 'Clear logs',
        icon: 'bi-trash text-danger',
    });
    if (!confirmed) return;

    try {
        const res = await fetchJsonOrThrow(`/api/instances/${currentLogInstanceId}/logs`, { method: 'DELETE' });
        const freed = (res?.cleared || []).reduce((sum, c) => sum + (c.freed_bytes || 0), 0);
        await refreshInstanceLogs();
        logContent.innerText = `Cleared ${formatBytes(freed)} of logs.\n\n` + logContent.innerText;
    } catch (e) {
        alert(`Could not clear the logs: ${e.message}`);
    }
}

// --- Control Logic ---
let currentTabs = [];
let streamToken = 0;     // increments to cancel an in-flight streaming loop
let dragButton = 'left'; // button held during a drag
let lastMoveSent = 0;    // throttle timestamp for drag mousemove

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openControl(id, name) {
    currentInstanceId = id;
    document.getElementById('controlModalTitle').innerText = `Control: ${name}`;
    resetControlView();
    controlModalOpen = true;
    controlModal.show();
    lastTabsSignature = '';
    await loadTabs();
    startTabPoll();
    // Auto-select the first tab so the operator lands on a live view.
    if (!currentTabId && currentTabs.length) selectTab(currentTabs[0].id);
}

function resetControlView() {
    lastCaptureScale = 1;
    lastViewport = null;
    stopStream();
    closeNetworkPanel({ stopRecorder: true });
    closeConsolePanel({ stopRecorder: true });
    closeStoragePanel();
    hidePasteBox();
    currentEmulation = null;
    renderDeviceButtons();
    currentTabId = null;
    currentTabs = [];
    tabContent.classList.add('d-none');
    noTabSelected.classList.remove('d-none');
    tabScreenshot.removeAttribute('src');
    if (currentTabObjectUrl) { URL.revokeObjectURL(currentTabObjectUrl); currentTabObjectUrl = null; }
    screenWrapper.classList.remove('has-focus');
    setStreamStatus('idle');
}

controlModalEl.addEventListener('hidden.bs.modal', () => {
    controlModalOpen = false;
    currentInstanceId = null;
    stopTabPoll();
    resetControlView();
});

// Re-rendering the list on every poll would flicker and drop hover state, so
// the markup is only rebuilt when something a viewer can actually see changed.
let lastTabsSignature = '';

async function loadTabs() {
    if (!currentInstanceId) return;
    const tabs = await fetchAPI(`/api/instances/${currentInstanceId}/tabs`);
    currentTabs = Array.isArray(tabs) ? tabs.filter(t => t.type === 'page' || t.type === undefined) : [];
    tabCountBadge.innerText = currentTabs.length;

    const signature = `${currentTabId}::` + currentTabs.map(t => `${t.id}|${t.title}|${t.url}|${t.favIconUrl || ''}`).join('~');
    if (signature === lastTabsSignature) {
        syncAddressBar();
        return;
    }
    lastTabsSignature = signature;

    tabList.innerHTML = currentTabs.map(tab => `
        <button type="button" class="list-group-item list-group-item-action tab-list-item d-flex align-items-center gap-2 ${currentTabId === tab.id ? 'active' : ''}"
                data-tab-id="${escapeAttr(tab.id)}">
            ${tab.favIconUrl ? `<img src="${escapeAttr(tab.favIconUrl)}" width="16" height="16" onerror="this.style.display='none'">` : '<i class="bi bi-window"></i>'}
            <div class="overflow-hidden w-100">
                <div class="text-truncate small fw-bold">${escapeHtml(tab.title || 'No Title')}</div>
                <div class="text-truncate x-small opacity-75" style="font-size: 0.7rem;">${escapeHtml(tab.url)}</div>
            </div>
            <span class="tab-inspect px-1" role="button" tabindex="-1" title="Inspect loaded HTML"
                  data-inspect-tab-id="${escapeAttr(tab.id)}"><i class="bi bi-code-slash"></i></span>
        </button>
    `).join('');

    syncAddressBar();

    // If the previously controlled tab is gone, drop back to the empty state.
    if (currentTabId && !currentTabs.some(t => t.id === currentTabId)) {
        stopStream();
        currentTabId = null;
        tabContent.classList.add('d-none');
        noTabSelected.classList.remove('d-none');
        tabScreenshot.removeAttribute('src');
        setStreamStatus('idle');
    }
}

// The page can move on its own — a link click sent through the live view, a
// redirect, a back/forward — so the address bar follows the tab's real URL.
// Never while the operator is typing in it, or their half-typed URL vanishes.
function syncAddressBar() {
    const active = currentTabs.find(t => t.id === currentTabId);
    if (!active) return;
    if (document.activeElement === activeTabUrl) return;
    if (activeTabUrl.value !== (active.url || '')) activeTabUrl.value = active.url || '';
}

// Keep titles, URLs and the tab set fresh while the control view is open.
let tabPollTimer = null;
function startTabPoll() {
    stopTabPoll();
    tabPollTimer = setInterval(() => { if (controlModalOpen) loadTabs(); }, 3000);
}
function stopTabPoll() {
    if (tabPollTimer) clearInterval(tabPollTimer);
    tabPollTimer = null;
}

tabList.addEventListener('click', (e) => {
    // The inspect affordance lives inside the tab button, so it has to be
    // checked first or the row's own click handler swallows it.
    const inspect = e.target.closest('[data-inspect-tab-id]');
    if (inspect) {
        e.preventDefault();
        e.stopPropagation();
        openHtmlInspector(inspect.getAttribute('data-inspect-tab-id'));
        return;
    }
    const btn = e.target.closest('[data-tab-id]');
    if (btn) selectTab(btn.getAttribute('data-tab-id'));
});

function selectTab(id) {
    const tab = currentTabs.find(t => t.id === id);
    if (!tab) return;
    const switching = currentTabId !== id;

    // Cancel any streaming bound to the previous tab BEFORE switching ids, then
    // clear the stale frame so we never show the old tab's screenshot.
    stopStream();
    if (switching) {
        tabScreenshot.removeAttribute('src');
        if (currentTabObjectUrl) { URL.revokeObjectURL(currentTabObjectUrl); currentTabObjectUrl = null; }
    }

    currentTabId = id;
    tabContent.classList.remove('d-none');
    noTabSelected.classList.add('d-none');
    activeTabUrl.value = tab.url || '';
    tabList.querySelectorAll('[data-tab-id]').forEach(el =>
        el.classList.toggle('active', el.getAttribute('data-tab-id') === id));

    // Emulation and every drawer panel belong to a tab, not to the instance, so
    // switching tabs has to re-point them - otherwise a panel would show one
    // tab's traffic, console or storage while the view shows another's.
    lastViewport = null;
    loadEmulation(id);
    if (networkOpen && networkTabId !== id) startNetworkForCurrentTab();
    if (consoleOpen && consoleTabId !== id) startConsoleForCurrentTab();
    if (storageOpen && storageTabId !== id) { closeStorageItemModal(); loadStorage(); }

    // Bring the target tab to the foreground (best effort) then start the view.
    fetchAPI(`/api/instances/${currentInstanceId}/tabs/${id}/activate`, 'POST').catch(() => {});
    if (liveEnabled) startStream();
    else { setStreamStatus('paused'); grabAndSwap(); }
    screenWrapper.focus();
}

// --- Streaming (flicker-free double-buffered frames) ---
function setStreamStatus(state, latencyMs) {
    if (!streamStatusDot) return;
    const map = {
        idle:    { cls: 'status-stopped',  text: 'Idle' },
        loading: { cls: 'status-partial',  text: 'Connecting…' },
        live:    { cls: 'streaming',       text: 'Streaming' },
        paused:  { cls: 'status-partial',  text: 'Paused (manual)' },
        error:   { cls: 'status-stopped',  text: 'Reconnecting…' },
    };
    const s = map[state] || map.idle;
    streamStatusDot.className = `status-indicator ${s.cls}`;
    streamStatusText.innerText = s.text;
    streamLatency.innerText = (state === 'live' && typeof latencyMs === 'number') ? `${latencyMs} ms` : '—';
}

// The scale the server actually applied to the frame on screen, reported back
// in X-Capture-Scale. Everything that converts between the image and the page
// needs it: at scale 0.45 the image is 864 px wide while the page is still
// 1920, so a click read straight off the image lands less than half way across.
let lastCaptureScale = 1;

// How many CSS pixels of page the frame on screen covers, straight from the
// server (X-Viewport-Width / -Height). Working it out from the image instead
// only holds while the tab is an ordinary desktop one: emulate a phone and the
// device pixel ratio and the visual viewport's zoom both come between image
// pixels and page pixels, so a click read off the image lands somewhere else
// entirely. Null when the server did not report it, which falls back to the
// old arithmetic.
let lastViewport = null;

// Width of the page's viewport in CSS pixels, recovered from the frame we are
// showing. Deriving it from naturalWidth alone is what made the old version
// oscillate: naturalWidth is itself the *result* of the scale, so asking for a
// smaller frame made the next computation ask for a bigger one, and the live
// view flipped between two resolutions on every single frame.
function viewportWidthFromFrame() {
    if (lastViewport && lastViewport.width > 0) return lastViewport.width;
    const natural = tabScreenshot.naturalWidth;
    if (!natural) return 0;
    return natural / (lastCaptureScale || 1);
}

// Capture resolution to ask for. "Auto" requests exactly what the panel will
// display: the image is scaled to fit anyway, so anything sharper is pixels
// Chrome reads back and the browser immediately throws away.
function currentCaptureScale() {
    const choice = liveScale ? liveScale.value : 'auto';
    if (choice !== 'auto') return Number(choice);
    const shown = tabScreenshot.clientWidth;
    const viewport = viewportWidthFromFrame();
    if (!shown || !viewport) return 1;
    // Round up to a 0.05 step so small panel resizes do not churn the value and
    // defeat the server's frame sharing.
    return Math.min(1, Math.max(0.25, Math.ceil((shown / viewport) * 20) / 20));
}

// Longer than any healthy capture (which is tens of milliseconds) and shorter
// than the server's own capture deadline, so the viewer recovers first.
const FRAME_TIMEOUT_MS = 6000;

async function grabAndSwap() {
    if (!currentInstanceId || !currentTabId) return false;
    // Remember which tab this frame belongs to so a late-arriving frame from a
    // previously selected tab can never overwrite the current view.
    const reqInstance = currentInstanceId;
    const reqTab = currentTabId;
    const t0 = performance.now();
    // A frame request that never answers would freeze the loop for good, since
    // the loop waits for one frame before asking for the next. Giving up on it
    // turns a stall into a missed frame.
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), FRAME_TIMEOUT_MS);
    try {
        const res = await fetch(`/api/instances/${reqInstance}/tabs/${reqTab}/screenshot?scale=${currentCaptureScale()}&t=${Date.now()}`,
            { signal: controller.signal });
        if (res.status === 401) { window.location.reload(); return false; }
        if (!res.ok) throw new Error(`screenshot ${res.status}`);
        // Recorded before the image is swapped in, so coordinate mapping and
        // the next scale decision both describe the frame actually on screen.
        const appliedScale = parseFloat(res.headers.get('X-Capture-Scale'));
        if (Number.isFinite(appliedScale) && appliedScale > 0) lastCaptureScale = appliedScale;
        const vw = parseFloat(res.headers.get('X-Viewport-Width'));
        const vh = parseFloat(res.headers.get('X-Viewport-Height'));
        if (Number.isFinite(vw) && vw > 0 && Number.isFinite(vh) && vh > 0) {
            lastViewport = { width: vw, height: vh };
        }
        // A frame that arrived without the headers says nothing new about the
        // viewport - mid-navigation Chrome reports a zero-sized one, and an
        // older server does not report it at all - so the last known size is
        // kept rather than dropping back to arithmetic on the image, which is
        // wrong by the device pixel ratio the moment a phone is emulated.
        // It is cleared deliberately when the tab or the device changes.
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                if (reqInstance !== currentInstanceId || reqTab !== currentTabId) {
                    URL.revokeObjectURL(url); // stale: tab changed while decoding
                    resolve();
                    return;
                }
                tabScreenshot.src = url;
                if (currentTabObjectUrl) URL.revokeObjectURL(currentTabObjectUrl);
                currentTabObjectUrl = url;
                resolve();
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
            img.src = url;
        });
        if (liveEnabled && streamLoopActive) setStreamStatus('live', Math.round(performance.now() - t0));
        return true;
    } catch (e) {
        if (streamLoopActive) setStreamStatus('error');
        return false;
    } finally {
        clearTimeout(abortTimer);
    }
}

function startStream() {
    if (!liveEnabled || !currentTabId || !controlModalOpen) return;
    if (streamLoopActive) return;
    streamLoopActive = true;
    const token = ++streamToken;
    setStreamStatus('loading');
    (async () => {
        let fails = 0;
        while (controlModalOpen && liveEnabled && currentTabId && token === streamToken) {
            const frameStart = performance.now();
            const ok = await grabAndSwap();
            if (ok) {
                fails = 0;
            } else {
                fails += 1;
                // After a few consecutive failures, resync the tab list: the tab
                // may have been closed or its target swapped while controlling it.
                // loadTabs() drops currentTabId if it's gone, which ends this loop.
                if (fails >= 3 && token === streamToken) {
                    fails = 0;
                    await loadTabs();
                }
            }
            // The selector is a target frame *rate*, so the wait is whatever is
            // left of the frame's budget after the capture, not a flat delay
            // added on top of it. Treating it as a flat delay is why "10 fps"
            // used to deliver about 6: a ~70 ms capture plus a 100 ms sleep.
            const target = parseInt(liveFps.value, 10);
            const budget = Number.isFinite(target) && target > 0 ? 1000 / target : 0;
            const elapsed = performance.now() - frameStart;
            const wait = ok ? Math.max(0, budget - elapsed) : Math.max(budget, 1000);
            await sleep(wait); // back off on error
        }
        streamLoopActive = false;
    })();
}

function stopStream() {
    streamToken++;          // any running loop sees a token mismatch and exits
    streamLoopActive = false;
}

// Single refresh used by the manual refresh button.
function refreshScreenshot() { grabAndSwap(); }

// When not live-streaming, pull a fresh frame shortly after an interaction.
let nudgeTimer = null;
function nudge(delay = 150) {
    if (liveEnabled) return; // live loop already refreshes
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(grabAndSwap, delay);
}

// Live toggle + FPS controls
btnLiveToggle.addEventListener('click', () => {
    liveEnabled = !liveEnabled;
    btnLiveToggle.classList.toggle('active', liveEnabled);
    btnLiveToggle.classList.toggle('btn-success', liveEnabled);
    btnLiveToggle.classList.toggle('btn-outline-secondary', !liveEnabled);
    liveToggleLabel.innerText = liveEnabled ? 'Live' : 'Paused';
    if (liveEnabled) startStream();
    else { stopStream(); setStreamStatus('paused'); }
});

// --- Navigation / tab buttons ---
function ensureProtocol(url) { return url.match(/^[a-zA-Z]+:\/\//) ? url : 'https://' + url; }

document.getElementById('btnGo').addEventListener('click', async () => {
    if (!currentTabId) return;
    let url = ensureProtocol(activeTabUrl.value.trim());
    activeTabUrl.value = url;
    await fetchAPI(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/navigate`, 'POST', { url });
    nudge(800);
});
activeTabUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnGo').click(); } });

document.getElementById('btnNewTab').addEventListener('click', async () => {
    const input = document.getElementById('newTabUrl');
    let url = input.value.trim();
    url = url ? ensureProtocol(url) : 'about:blank';
    const tab = await fetchAPI(`/api/instances/${currentInstanceId}/tabs/new`, 'POST', { url });
    input.value = '';
    await loadTabs();
    if (tab && tab.id) selectTab(tab.id);
});

document.getElementById('btnCloseTab').addEventListener('click', async () => {
    if (!currentTabId) return;
    if (!confirm('Close tab?')) return;
    const closingId = currentTabId;
    stopStream();
    currentTabId = null;
    tabContent.classList.add('d-none');
    noTabSelected.classList.remove('d-none');
    tabScreenshot.removeAttribute('src');
    setStreamStatus('idle');
    // The server refuses to leave the browser with zero tabs — closing the last
    // one kills the instance in gui/xvfb mode — so it hands back the blank tab
    // it opened in its place. Focus that instead of falling back to tab 0.
    const res = await fetchAPI(`/api/instances/${currentInstanceId}/tabs/${closingId}`, 'DELETE');
    await loadTabs();
    const replacementId = res && res.replacement && res.replacement.id;
    if (replacementId && currentTabs.some(t => t.id === replacementId)) selectTab(replacementId);
    else if (currentTabs.length) selectTab(currentTabs[0].id);
});

// --- Tab navigation (back / forward / reload) ---
async function tabAction(path, options, failureMessage) {
    if (!currentInstanceId || !currentTabId) return;
    try {
        await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${currentTabId}${path}`, {
            method: 'POST',
            ...options,
        });
        nudge(900);
        setTimeout(loadTabs, 1200); // let the new document settle, then refresh titles/URLs
    } catch (e) {
        // "nothing to go back to" is a normal outcome, not an error worth a dialog.
        if (e.message && /No (back|forward) entry/.test(e.message)) return;
        alert(`${failureMessage}: ${e.message}`);
    }
}

document.getElementById('btnTabBack').addEventListener('click', () => tabAction('/history/back', {}, 'Back failed'));
document.getElementById('btnTabForward').addEventListener('click', () => tabAction('/history/forward', {}, 'Forward failed'));
document.getElementById('btnTabReload').addEventListener('click', (e) => tabAction('/reload', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ignore_cache: e.shiftKey }),
}, 'Reload failed'));

// --- Loaded HTML inspector ---
// Shows the DOM as the browser currently holds it — after scripts have run —
// which is what you actually want to look at, and is not what re-fetching the
// URL would give you.
let htmlModalInstance = null;
let htmlInspectorTabId = null;
let htmlInspectorSource = '';
// Rendering an enormous document into a <pre> locks the tab up, so the preview
// is capped; Download and Copy still hand over the whole thing.
const HTML_PREVIEW_LIMIT = 400000;

const htmlModalUrl = document.getElementById('htmlModalUrl');
const htmlModalMeta = document.getElementById('htmlModalMeta');
const htmlModalBody = document.getElementById('htmlModalBody');
const htmlModalNotice = document.getElementById('htmlModalNotice');

async function loadHtmlInspector(tabId) {
    htmlInspectorTabId = tabId;
    htmlInspectorSource = '';
    htmlModalBody.textContent = 'Loading…';
    htmlModalNotice.classList.add('d-none');
    htmlModalMeta.innerText = '—';

    try {
        const dump = await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${tabId}/html`);
        if (!dump) return;
        htmlInspectorSource = dump.html || '';
        htmlModalUrl.innerText = dump.url || '';
        htmlModalUrl.title = dump.url || '';
        htmlModalMeta.innerText = `${formatBytes(dump.html_bytes)} · readyState: ${dump.ready_state}`;

        if (htmlInspectorSource.length > HTML_PREVIEW_LIMIT) {
            htmlModalNotice.innerText = `Document is ${formatBytes(dump.html_bytes)}; showing the first ${formatBytes(HTML_PREVIEW_LIMIT)}. Download or Copy gives you all of it.`;
            htmlModalNotice.classList.remove('d-none');
        }
        htmlModalBody.textContent = htmlInspectorSource.slice(0, HTML_PREVIEW_LIMIT);
    } catch (e) {
        htmlModalBody.textContent = `Could not read the document: ${e.message}`;
    }
}

function openHtmlInspector(tabId) {
    if (!currentInstanceId || !tabId) return;
    if (!htmlModalInstance) htmlModalInstance = new bootstrap.Modal(document.getElementById('htmlModal'));
    htmlModalInstance.show();
    loadHtmlInspector(tabId);
}

document.getElementById('btnInspectHtml').addEventListener('click', () => openHtmlInspector(currentTabId));
document.getElementById('btnHtmlRefresh').addEventListener('click', () => {
    if (htmlInspectorTabId) loadHtmlInspector(htmlInspectorTabId);
});

document.getElementById('btnHtmlCopy').addEventListener('click', async () => {
    if (!htmlInspectorSource) return;
    // Through writeClipboardText, not navigator.clipboard: that one does not
    // exist at all on a plain-HTTP origin, which is where this dashboard
    // usually lives.
    if (await writeClipboardText(htmlInspectorSource)) {
        htmlModalNotice.className = 'alert alert-success rounded-0 mb-0 small';
        htmlModalNotice.innerText = 'Full HTML copied to clipboard.';
        htmlModalNotice.classList.remove('d-none');
    } else {
        htmlModalNotice.className = 'alert alert-warning rounded-0 mb-0 small';
        htmlModalNotice.innerText = 'Clipboard is blocked by the browser here — use Download instead.';
        htmlModalNotice.classList.remove('d-none');
    }
});

document.getElementById('btnHtmlDownload').addEventListener('click', () => {
    if (!htmlInspectorSource) return;
    const blob = new Blob([htmlInspectorSource], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let name = 'page';
    try { name = new URL(htmlModalUrl.innerText).hostname || 'page'; } catch { /* keep default */ }
    a.download = `${name}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
});

// --- Input helpers ---
function postInput(type, params) {
    if (!currentInstanceId || !currentTabId) return Promise.resolve();
    return fetchAPI(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/input`, 'POST', { type, params })
        .catch(() => {});
}
const sendMouse = (params) => postInput('mouse', params);
const sendKey = (params) => postInput('key', params);
const sendText = (text) => postInput('text', { text });

// Screen position -> page coordinates in CSS pixels, which is what CDP input
// and DOM.getNodeForLocation expect. Two conversions are involved: the panel
// scales the image to fit, and the image may itself be a downscaled capture.
// Dividing by lastCaptureScale undoes the second one; without it every click,
// drag, scroll and inspect landed short by exactly that factor.
function toCanvasCoords(e) {
    const rect = tabScreenshot.getBoundingClientRect();
    if (!tabScreenshot.naturalWidth || !rect.width) return null;

    // Preferred: the server said how much page the frame covers, so the only
    // conversion left is panel pixels -> page pixels.
    if (lastViewport && lastViewport.width > 0 && lastViewport.height > 0) {
        return {
            x: Math.round((e.clientX - rect.left) * (lastViewport.width / rect.width)),
            y: Math.round((e.clientY - rect.top) * (lastViewport.height / rect.height)),
        };
    }

    const capture = lastCaptureScale || 1;
    const scaleX = tabScreenshot.naturalWidth / capture / rect.width;
    const scaleY = tabScreenshot.naturalHeight / capture / rect.height;
    return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY),
    };
}
function buttonName(b) { return b === 2 ? 'right' : b === 1 ? 'middle' : 'left'; }
function buttonMask(b) { return b === 2 ? 2 : b === 1 ? 4 : 1; }

// Mouse: press / drag / release for clicks, text selection and dragging.
tabScreenshot.addEventListener('mousedown', (e) => {
    const c = toCanvasCoords(e);
    if (!c) return;
    e.preventDefault();
    screenWrapper.focus();
    dragging = true;
    dragButton = buttonName(e.button);
    sendMouse({ type: 'mousePressed', x: c.x, y: c.y, button: dragButton, buttons: buttonMask(e.button), clickCount: 1 });
});

window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    if (now - lastMoveSent < 33) return; // ~30 moves/sec max
    lastMoveSent = now;
    const c = toCanvasCoords(e);
    if (!c) return;
    sendMouse({ type: 'mouseMoved', x: c.x, y: c.y, button: dragButton, buttons: buttonMask(dragButton === 'right' ? 2 : dragButton === 'middle' ? 1 : 0) });
});

window.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    const c = toCanvasCoords(e);
    if (!c) return;
    sendMouse({ type: 'mouseReleased', x: c.x, y: c.y, button: dragButton, buttons: 0, clickCount: 1 });
    nudge(120);
});

// --- Right-click menu over the live page ---------------------------------
// Chrome's own context menu is drawn by the browser, not the renderer, so it
// never appears in Page.captureScreenshot: forwarding the right-click alone
// would look like nothing happened. The dashboard draws its own menu instead
// and backs the entries with CDP. Sites that implement their own in-page menu
// still work, via "Send right-click to page".
const pageContextMenu = document.getElementById('pageContextMenu');
let contextPoint = null;
let inspectedNode = null;
let inspectModalInstance = null;

function closeContextMenu() {
    pageContextMenu.classList.add('d-none');
    pageContextMenu.innerHTML = '';
}

function contextItem(label, icon, onClick, options = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<i class="bi ${icon}"></i><span>${escapeHtml(label)}</span>`;
    if (options.disabled) b.disabled = true;
    else b.addEventListener('click', () => { closeContextMenu(); onClick(); });
    return b;
}

function openContextMenu(clientX, clientY, canvas) {
    contextPoint = canvas;
    pageContextMenu.innerHTML = '';

    pageContextMenu.append(contextItem('Inspect element', 'bi-bullseye', () => inspectAtPoint(canvas)));
    pageContextMenu.append(contextItem('Copy element selector', 'bi-code-slash', () => copySelectorAtPoint(canvas)));
    pageContextMenu.append(contextItem('Clear highlight', 'bi-eraser', clearHighlight));

    const sep = document.createElement('div');
    sep.className = 'ctx-sep';
    pageContextMenu.append(sep);

    pageContextMenu.append(contextItem('Back', 'bi-arrow-left', () => tabAction('/history/back', {}, 'Back failed')));
    pageContextMenu.append(contextItem('Forward', 'bi-arrow-right', () => tabAction('/history/forward', {}, 'Forward failed')));
    pageContextMenu.append(contextItem('Reload', 'bi-arrow-clockwise', () => tabAction('/reload', {
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ignore_cache: false }),
    }, 'Reload failed')));

    const sep2 = document.createElement('div');
    sep2.className = 'ctx-sep';
    pageContextMenu.append(sep2);

    pageContextMenu.append(contextItem('Copy selected text', 'bi-clipboard-check', () => copySelectionFromPage()));
    pageContextMenu.append(contextItem('Paste into page', 'bi-clipboard-plus', () => pasteIntoPage()));

    const sep3 = document.createElement('div');
    sep3.className = 'ctx-sep';
    pageContextMenu.append(sep3);

    pageContextMenu.append(contextItem('View loaded HTML', 'bi-filetype-html', () => openHtmlInspector(currentTabId)));
    pageContextMenu.append(contextItem('Send right-click to page', 'bi-mouse2', () => {
        // For sites that render their own context menu in the document; that
        // one does show up in the screenshot.
        sendMouse({ type: 'mousePressed', x: canvas.x, y: canvas.y, button: 'right', buttons: 2, clickCount: 1 });
        sendMouse({ type: 'mouseReleased', x: canvas.x, y: canvas.y, button: 'right', buttons: 0, clickCount: 1 });
        nudge(250);
    }));

    const hint = document.createElement('div');
    hint.className = 'ctx-hint';
    hint.textContent = `at ${canvas.x}, ${canvas.y}`;
    pageContextMenu.append(hint);

    // Position within the scroll container, flipping near the right/bottom edge
    // so the menu never spills outside the view.
    const wrap = screenWrapper.getBoundingClientRect();
    pageContextMenu.classList.remove('d-none');
    const mw = pageContextMenu.offsetWidth;
    const mh = pageContextMenu.offsetHeight;
    let left = clientX - wrap.left + screenWrapper.scrollLeft;
    let top = clientY - wrap.top + screenWrapper.scrollTop;
    if (left + mw > screenWrapper.scrollLeft + wrap.width) left = Math.max(0, left - mw);
    if (top + mh > screenWrapper.scrollTop + wrap.height) top = Math.max(0, top - mh);
    pageContextMenu.style.left = `${left}px`;
    pageContextMenu.style.top = `${top}px`;
}

tabScreenshot.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const c = toCanvasCoords(e);
    if (!c) return;
    openContextMenu(e.clientX, e.clientY, c);
});

document.addEventListener('click', (e) => {
    if (!pageContextMenu.classList.contains('d-none') && !pageContextMenu.contains(e.target)) closeContextMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeContextMenu(); }, true);
screenWrapper.addEventListener('scroll', closeContextMenu);

// --- Element inspection ---------------------------------------------------
async function requestInspect(point, highlight = true) {
    return fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: point.x, y: point.y, highlight }),
    });
}

async function clearHighlight() {
    if (!currentInstanceId || !currentTabId) return;
    try {
        await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/highlight`, { method: 'DELETE' });
        nudge(200);
    } catch { /* best effort */ }
}

async function copySelectorAtPoint(point) {
    try {
        const res = await requestInspect(point, false);
        const ok = await writeClipboardText(res.node.selector);
        showControlNotice(ok ? `Copied ${res.node.selector}` : 'Your browser blocked the clipboard here', ok ? 'good' : 'bad');
    } catch (e) {
        showControlNotice(`Could not copy the selector: ${e.message}`, 'bad');
    }
}

function inspectRow(label, value, mono = false) {
    return `
        <div class="row g-2 py-1 border-bottom border-theme">
            <div class="col-4 col-sm-3 text-theme-muted small">${escapeHtml(label)}</div>
            <div class="col-8 col-sm-9 small ${mono ? 'font-monospace' : ''}" style="word-break:break-all">${value}</div>
        </div>`;
}

function renderInspectedNode(node) {
    inspectedNode = node;
    document.getElementById('inspectSelector').innerText = node.selector || '';
    document.getElementById('inspectTag').innerText = `<${node.tag}>`;
    document.getElementById('inspectSize').innerText = `${node.rect.width} x ${node.rect.height} at ${node.rect.x}, ${node.rect.y}`;

    const attrs = node.attributes.length
        ? node.attributes.map(a => `<div><span class="text-info">${escapeHtml(a.name)}</span>="${escapeHtml(a.value)}"</div>`).join('')
        : '<span class="text-theme-muted">none</span>';

    const styles = Object.entries(node.styles)
        .map(([k, v]) => `<div><span class="text-theme-muted">${escapeHtml(k)}</span>: ${escapeHtml(v)}</div>`).join('');

    document.getElementById('inspectBody').innerHTML = [
        inspectRow('Selector', `<code>${escapeHtml(node.selector)}</code>`, true),
        node.id ? inspectRow('Id', `<code>${escapeHtml(node.id)}</code>`, true) : '',
        node.classes.length ? inspectRow('Classes', node.classes.map(c => `<code>${escapeHtml(c)}</code>`).join(' '), true) : '',
        node.link ? inspectRow('Link', `<a href="${escapeAttr(node.link)}" target="_blank" rel="noopener">${escapeHtml(node.link)}</a>`) : '',
        node.image ? inspectRow('Image', `<a href="${escapeAttr(node.image)}" target="_blank" rel="noopener">${escapeHtml(node.image)}</a>`) : '',
        inspectRow('Children', String(node.child_count)),
        node.text ? inspectRow('Text', escapeHtml(node.text.slice(0, 500))) : '',
        inspectRow('Attributes', `<div class="font-monospace x-small">${attrs}</div>`),
        inspectRow('Computed style', `<div class="font-monospace x-small">${styles}</div>`),
        `<div class="mt-3">
            <div class="text-theme-muted small mb-1">outerHTML</div>
            <pre class="terminal-box mb-0" style="max-height:220px;white-space:pre-wrap;word-break:break-all;font-size:0.72rem">${escapeHtml(node.outer_html)}</pre>
        </div>`,
    ].join('');
}

function inspectNotice(kind, message) {
    const n = document.getElementById('inspectNotice');
    n.className = `alert alert-${kind} rounded-0 mb-0 small`;
    n.innerText = message;
    n.classList.remove('d-none');
    setTimeout(() => n.classList.add('d-none'), 2600);
}

async function inspectAtPoint(point) {
    if (!currentInstanceId || !currentTabId) return;
    if (!inspectModalInstance) inspectModalInstance = new bootstrap.Modal(document.getElementById('inspectModal'));
    document.getElementById('inspectBody').innerHTML = '<div class="text-theme-muted small">Inspecting…</div>';
    document.getElementById('inspectNotice').classList.add('d-none');
    inspectModalInstance.show();

    try {
        const res = await requestInspect(point, true);
        renderInspectedNode(res.node);
        nudge(250); // pull a frame so the highlight shows in the live view
    } catch (e) {
        document.getElementById('inspectBody').innerHTML =
            `<div class="text-danger small">${escapeHtml(e.message)}</div>`;
    }
}

document.getElementById('btnInspectCopySelector').addEventListener('click', async () => {
    if (!inspectedNode) return;
    if (await writeClipboardText(inspectedNode.selector)) inspectNotice('success', 'Selector copied.');
    else inspectNotice('warning', 'Clipboard blocked by the browser here.');
});
document.getElementById('btnInspectCopyHtml').addEventListener('click', async () => {
    if (!inspectedNode) return;
    if (await writeClipboardText(inspectedNode.outer_html)) inspectNotice('success', 'outerHTML copied.');
    else inspectNotice('warning', 'Clipboard blocked by the browser here.');
});
document.getElementById('btnInspectClear').addEventListener('click', async () => {
    await clearHighlight();
    inspectNotice('success', 'Highlight cleared.');
});

// Scroll / wheel
tabScreenshot.addEventListener('wheel', (e) => {
    const c = toCanvasCoords(e);
    if (!c) return;
    e.preventDefault();
    sendMouse({ type: 'mouseWheel', x: c.x, y: c.y, deltaX: e.deltaX, deltaY: e.deltaY });
    nudge(120);
}, { passive: false });

// --- Keyboard ---
const SPECIAL_KEYS = {
    Enter:      { code: 'Enter', vk: 13 },
    Backspace:  { code: 'Backspace', vk: 8 },
    Tab:        { code: 'Tab', vk: 9 },
    Escape:     { code: 'Escape', vk: 27 },
    Delete:     { code: 'Delete', vk: 46 },
    ArrowUp:    { code: 'ArrowUp', vk: 38 },
    ArrowDown:  { code: 'ArrowDown', vk: 40 },
    ArrowLeft:  { code: 'ArrowLeft', vk: 37 },
    ArrowRight: { code: 'ArrowRight', vk: 39 },
    Home:       { code: 'Home', vk: 36 },
    End:        { code: 'End', vk: 35 },
    PageUp:     { code: 'PageUp', vk: 33 },
    PageDown:   { code: 'PageDown', vk: 34 },
};

function modifiersFor(e) {
    return (e.altKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.metaKey ? 4 : 0) | (e.shiftKey ? 8 : 0);
}

screenWrapper.addEventListener('focus', () => screenWrapper.classList.add('has-focus'));
screenWrapper.addEventListener('blur', () => screenWrapper.classList.remove('has-focus'));

screenWrapper.addEventListener('keydown', async (e) => {
    if (!currentInstanceId || !currentTabId) return;
    // The paste box is a real textarea floating over the view; it keeps its own
    // keystrokes instead of sending them to the page.
    if (e.target && e.target !== screenWrapper && e.target.closest && e.target.closest('input, textarea')) return;

    const hasCmdCtrl = e.ctrlKey || e.metaKey;

    // Clipboard shortcuts are answered here rather than forwarded. The browser
    // at the other end has its own clipboard that the operator cannot see or
    // reach: a forwarded Ctrl+C would copy into that one, and a forwarded
    // Ctrl+V would paste whatever happened to be in it.
    if (hasCmdCtrl && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        copySelectionFromPage();
        return;
    }
    if (hasCmdCtrl && !e.altKey && (e.key === 'x' || e.key === 'X')) {
        // Take a copy, then let the key through so the page does the cutting.
        copySelectionFromPage({ quiet: true });
    }
    if (hasCmdCtrl && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        // Deliberately NOT prevented: letting the keystroke run is what makes
        // the browser raise the paste event below, which carries the clipboard
        // text with it and needs no permission, unlike clipboard.readText().
        return;
    }
    const printable = e.key.length === 1;
    const special = SPECIAL_KEYS[e.key];

    // Plain printable character -> insert text (handles all layouts/IME nicely).
    if (printable && !hasCmdCtrl && !e.altKey) {
        e.preventDefault();
        await sendText(e.key);
        nudge();
        return;
    }

    // Special keys and keyboard shortcuts -> real key events.
    if (special || hasCmdCtrl || !printable) {
        e.preventDefault();
        let code, vk;
        if (special) {
            code = special.code; vk = special.vk;
        } else if (printable) {
            const ch = e.key.toUpperCase();
            vk = ch.charCodeAt(0);
            code = /[A-Z]/.test(ch) ? `Key${ch}` : (/[0-9]/.test(ch) ? `Digit${ch}` : (e.code || ''));
        } else {
            code = e.code || ''; vk = e.keyCode || 0;
        }
        const base = {
            modifiers: modifiersFor(e),
            key: e.key,
            code,
            windowsVirtualKeyCode: vk,
            nativeVirtualKeyCode: vk,
        };
        await sendKey({ ...base, type: 'rawKeyDown' });
        await sendKey({ ...base, type: 'keyUp' });
        nudge();
    }
});

// --- Device emulation (Web / Mobile) --------------------------------------
// Sites decide what to serve from the viewport, the user agent and whether
// touch exists, so the switch sets all three together and reloads. Setting one
// without the others produces the worst possible preview: a desktop page
// squeezed into a phone-sized window, which looks broken and tells you nothing.

function renderDeviceButtons() {
    const mobile = Boolean(currentEmulation);
    btnDeviceDesktop.classList.toggle('active', !mobile);
    btnDeviceMobile.classList.toggle('active', mobile);
    devicePresetSelect.classList.toggle('d-none', !mobile);
    if (mobile && currentEmulation.preset_id) devicePresetSelect.value = currentEmulation.preset_id;

    // Show the device at its own size. The frame is scaled to fit the panel by
    // default, which is right for a desktop page and useless for a phone: a
    // 393 px page stretched across 1100 px of panel looks nothing like the
    // thing you are trying to preview.
    tabScreenshot.style.maxWidth = mobile ? `${currentEmulation.width}px` : '';
    tabScreenshot.classList.toggle('device-frame', mobile);
    btnDeviceMobile.title = mobile
        ? `Emulating ${currentEmulation.label} (${currentEmulation.width}x${currentEmulation.height})`
        : 'Emulate a phone: viewport, user agent and touch together, then reload so the site re-renders';
}

function populatePresetOptions() {
    const current = devicePresetSelect.value;
    devicePresetSelect.innerHTML = devicePresets
        .map((preset) => `<option value="${escapeAttr(preset.id)}">${escapeHtml(preset.label)} ${preset.width}x${preset.height}</option>`)
        .join('');
    const keep = devicePresets.some((preset) => preset.id === current) ? current : defaultPresetId;
    if (keep) devicePresetSelect.value = keep;
}

async function loadEmulation(tabId) {
    if (!currentInstanceId || !tabId) return;
    try {
        const res = await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${tabId}/emulation`);
        // The answer is about one tab; by the time it lands the operator may
        // have moved to another one.
        if (currentTabId !== tabId) return;
        devicePresets = res.presets || [];
        defaultPresetId = res.default_preset || (devicePresets[0] && devicePresets[0].id) || null;
        populatePresetOptions();
        currentEmulation = res.emulation || null;
        renderDeviceButtons();
    } catch (error) {
        // A tab that cannot report its emulation still controls fine; leaving
        // the switch alone is better than guessing.
    }
}

let deviceSwitchBusy = false;
async function applyDevice(device, presetId) {
    if (!currentInstanceId || !currentTabId || deviceSwitchBusy) return;
    deviceSwitchBusy = true;
    btnDeviceDesktop.disabled = true;
    btnDeviceMobile.disabled = true;
    devicePresetSelect.disabled = true;

    const payload = device === 'desktop'
        ? { device: 'desktop', reload: true }
        : { device: 'mobile', preset: presetId || devicePresetSelect.value || defaultPresetId, reload: true };

    try {
        const res = await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/emulation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        currentEmulation = res.emulation || null;
        renderDeviceButtons();
        // The frame is about to change shape, and the old viewport reading
        // would map clicks wrongly until the next one arrives.
        lastViewport = null;
        showControlNotice(currentEmulation
            ? `Showing ${currentEmulation.label} - ${currentEmulation.width}x${currentEmulation.height}, reloaded`
            : 'Back to the real desktop browser', 'good');
        nudge(600);
    } catch (error) {
        showControlNotice(error.message || 'Could not switch device', 'bad');
    } finally {
        deviceSwitchBusy = false;
        btnDeviceDesktop.disabled = false;
        btnDeviceMobile.disabled = false;
        devicePresetSelect.disabled = false;
    }
}

btnDeviceDesktop.addEventListener('click', () => { if (currentEmulation) applyDevice('desktop'); });
btnDeviceMobile.addEventListener('click', () => applyDevice('mobile'));
devicePresetSelect.addEventListener('change', () => applyDevice('mobile', devicePresetSelect.value));

// --- Clipboard across the wire --------------------------------------------
// The controlled browser has its own clipboard, which the operator can neither
// see nor reach, so Ctrl+C and Ctrl+V are answered here instead of being
// forwarded: a copy reads the page's selection and puts it on the local
// clipboard, a paste takes the local clipboard and types it into the page.

let controlNoticeTimer = null;
function showControlNotice(message, tone = '') {
    if (!controlNotice) return;
    controlNotice.textContent = message;
    controlNotice.className = `control-notice${tone ? ` is-${tone}` : ''}`;
    clearTimeout(controlNoticeTimer);
    controlNoticeTimer = setTimeout(() => controlNotice.classList.add('d-none'), 3200);
}

// navigator.clipboard needs a secure context, which a dashboard served over
// plain HTTP on a LAN address never has. execCommand still works there, and is
// the reason this is not a one-liner.
//
// The second reason is nastier. The old-style copy needs a focused, selected
// textarea, and Bootstrap keeps a focus trap on every open modal: it listens
// for focusin on the document and, for any target outside the modal element,
// drags focus straight back inside. A textarea appended to <body> therefore
// lost focus before execCommand ran - and execCommand still returned true, so
// every copy button in the control view reported success while the clipboard
// never changed. Measured: after pressing "copy as curl" the focus sat on
// #btnLiveToggle and the system clipboard still held its previous contents.
//
// So the holder goes inside the open modal, where the trap leaves it alone,
// and the result is only believed if the holder really did keep focus and the
// selection.
async function writeClipboardText(text) {
    const payload = String(text ?? '');

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(payload);
            return true;
        }
    } catch (error) { /* fall through to the old way */ }

    const modals = document.querySelectorAll('.modal.show');
    const host = modals.length ? modals[modals.length - 1] : document.body;
    const previous = document.activeElement;
    const holder = document.createElement('textarea');
    try {
        holder.value = payload;
        holder.setAttribute('readonly', '');
        holder.setAttribute('aria-hidden', 'true');
        // Off-screen rather than hidden: display:none and visibility:hidden
        // both make the selection unreachable, which defeats the whole thing.
        holder.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none;';
        host.appendChild(holder);
        holder.focus({ preventScroll: true });
        holder.select();
        holder.setSelectionRange(0, payload.length);

        const kept = document.activeElement === holder
            && holder.selectionEnd - holder.selectionStart === payload.length;
        const ok = kept && document.execCommand('copy');
        return Boolean(ok);
    } catch (error) {
        return false;
    } finally {
        holder.remove();
        // Removing the focused element drops focus to <body>; put it back so a
        // copy does not quietly change where the next keystroke goes.
        if (previous && previous.isConnected && typeof previous.focus === 'function') {
            try { previous.focus({ preventScroll: true }); } catch (error) { /* not focusable any more */ }
        }
    }
}

async function copySelectionFromPage(options = {}) {
    if (!currentInstanceId || !currentTabId) return;
    try {
        const res = await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/selection`);
        if (!res.has_selection) {
            if (!options.quiet) showControlNotice('Nothing is selected in the page. Drag across some text first.', 'bad');
            return;
        }
        const copied = await writeClipboardText(res.text);
        if (copied) {
            showControlNotice(`Copied ${res.text.length} characters from the page`, 'good');
        } else {
            // Last resort: show it so it can be selected by hand rather than
            // claiming a copy that did not happen.
            showPasteBox(res.text, { readingBack: true });
            showControlNotice('Your browser blocked the clipboard here, so the text is shown instead', 'bad');
        }
    } catch (error) {
        showControlNotice(error.message || 'Could not read the selection', 'bad');
    }
}

async function sendPasteText(text) {
    if (!text || !currentInstanceId || !currentTabId) return;
    try {
        await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/paste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        showControlNotice(`Pasted ${text.length} characters into the page`, 'good');
        nudge(150);
    } catch (error) {
        showControlNotice(error.message || 'Paste failed', 'bad');
    }
}

async function pasteIntoPage() {
    if (!currentInstanceId || !currentTabId) return;
    try {
        if (navigator.clipboard && window.isSecureContext && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
                await sendPasteText(text);
                return;
            }
        }
    } catch (error) { /* blocked or denied: use the box below */ }
    showPasteBox('');
}

function showPasteBox(prefill = '', options = {}) {
    pasteBox.classList.remove('d-none');
    pasteBoxText.value = prefill;
    pasteBox.querySelector('#btnPasteSend').classList.toggle('d-none', Boolean(options.readingBack));
    pasteBox.querySelector('.fw-bold').innerHTML = options.readingBack
        ? '<i class="bi bi-clipboard-check"></i> Text from the page'
        : '<i class="bi bi-clipboard-plus"></i> Paste into the page';
    pasteBoxText.focus();
    if (options.readingBack) pasteBoxText.select();
}

function hidePasteBox() {
    pasteBox.classList.add('d-none');
    pasteBoxText.value = '';
}

document.getElementById('btnPasteCancel').addEventListener('click', hidePasteBox);
document.getElementById('btnPasteSend').addEventListener('click', async () => {
    const text = pasteBoxText.value;
    hidePasteBox();
    screenWrapper.focus();
    await sendPasteText(text);
});
pasteBoxText.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); hidePasteBox(); screenWrapper.focus(); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); document.getElementById('btnPasteSend').click(); }
});

btnCopySelection.addEventListener('click', () => copySelectionFromPage());
btnPasteIntoPage.addEventListener('click', () => pasteIntoPage());

// A real paste event carries the clipboard with it and needs no permission,
// which is the only way to read it on a plain-HTTP dashboard.
document.addEventListener('paste', (e) => {
    if (!controlModalOpen || !currentTabId) return;
    if (!pasteBox.classList.contains('d-none')) return;   // the box takes its own
    if (networkModalOpen) return;                         // so does the request popup
    if (storageModalOpen) return;                         // and the storage item editor
    const inControl = document.activeElement === screenWrapper || screenWrapper.classList.contains('has-focus');
    if (!inControl) return;
    const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    if (!text) return;
    e.preventDefault();
    sendPasteText(text);
});

// --- Network panel ---------------------------------------------------------

const NETWORK_POLL_MS = 1200;
let networkInstanceId = null;
let networkRenderSignature = '';

function setNetworkStatus(state) {
    const map = {
        idle: 'status-stopped',
        loading: 'status-partial',
        live: 'streaming',
        error: 'status-stopped',
    };
    networkStatusDot.className = `status-indicator ${map[state] || map.idle}`;
}

function resetNetworkBuffer() {
    networkEntries = new Map();
    networkCursor = 0;
    networkGeneration = 0;
    networkDropped = 0;
    networkSelectedId = null;
    networkRenderSignature = '';
    networkVisibleIds = [];
    networkRows.innerHTML = '';
    closeNetworkRequestModal();
    networkEmpty.classList.remove('d-none');
    networkEmpty.textContent = 'Recording. Click around in the page and the requests land here.';
    networkCount.textContent = 'no requests yet';
}

function openNetworkPanel() {
    closeOtherDrawers('network');
    networkOpen = true;
    networkPanel.classList.remove('d-none');
    networkPanel.classList.add('d-flex');
    btnNetworkToggle.classList.add('active');
    startNetworkForCurrentTab();
}

function closeNetworkPanel(options = {}) {
    const { stopRecorder = true } = options;
    const previousInstance = networkInstanceId;
    const previousTab = networkTabId;

    networkOpen = false;
    closeNetworkRequestModal();
    networkPanel.classList.add('d-none');
    networkPanel.classList.remove('d-flex');
    btnNetworkToggle.classList.remove('active');
    stopNetworkPoll();
    setNetworkStatus('idle');
    networkInstanceId = null;
    networkTabId = null;

    // The ids are captured above because this also runs as the control modal
    // closes, by which time the current instance is already cleared.
    if (stopRecorder && previousInstance && previousTab) {
        fetchAPI(`/api/instances/${previousInstance}/tabs/${previousTab}/network/stop`, 'POST').catch(() => {});
    }
}

async function startNetworkForCurrentTab() {
    if (!currentInstanceId || !currentTabId) return;

    if (networkInstanceId && networkTabId && networkTabId !== currentTabId) {
        const previousInstance = networkInstanceId;
        const previousTab = networkTabId;
        fetchAPI(`/api/instances/${previousInstance}/tabs/${previousTab}/network/stop`, 'POST').catch(() => {});
    }

    networkInstanceId = currentInstanceId;
    networkTabId = currentTabId;
    resetNetworkBuffer();
    setNetworkStatus('loading');

    try {
        const status = await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/network/start`, { method: 'POST' });
        networkGeneration = status.generation;
        setNetworkStatus('live');
        startNetworkPoll();
    } catch (error) {
        setNetworkStatus('error');
        networkEmpty.textContent = `Could not start recording: ${error.message}`;
        networkEmpty.classList.remove('d-none');
    }
}

function startNetworkPoll() {
    stopNetworkPoll();
    pollNetwork();
    networkPollTimer = setInterval(pollNetwork, NETWORK_POLL_MS);
}

function stopNetworkPoll() {
    if (networkPollTimer) clearInterval(networkPollTimer);
    networkPollTimer = null;
}

async function pollNetwork() {
    if (!networkOpen || !networkInstanceId || !networkTabId) return;
    try {
        const res = await fetchJsonOrThrow(
            `/api/instances/${networkInstanceId}/tabs/${networkTabId}/network?since_seq=${networkCursor}&limit=500`);
        if (!networkOpen) return;

        if (!res.recording) {
            // The recorder stopped on its own: the tab went away, or the
            // instance did. Say so instead of showing a log frozen in time.
            setNetworkStatus('error');
            networkEmpty.textContent = 'Recording stopped. Close and reopen the panel to start again.';
            networkEmpty.classList.remove('d-none');
            stopNetworkPoll();
            return;
        }

        // A cleared log is a different log; keeping the old rows would mean
        // showing entries that can never be updated again.
        if (networkGeneration && res.generation !== networkGeneration) {
            resetNetworkBuffer();
            networkGeneration = res.generation;
            return;
        }
        networkGeneration = res.generation;

        for (const entry of res.entries) {
            networkEntries.set(entry.id, { ...(networkEntries.get(entry.id) || {}), ...entry });
        }
        networkCursor = res.next_seq;
        networkDropped = res.dropped;

        const cap = res.max_entries || 500;
        while (networkEntries.size > cap) {
            networkEntries.delete(networkEntries.keys().next().value);
        }

        setNetworkStatus(res.connected ? 'live' : 'error');
        renderNetworkRows();
    } catch (error) {
        setNetworkStatus('error');
    }
}

function networkTypeBucket(entry) {
    const type = String(entry.resource_type || '').toLowerCase();
    if (type === 'xhr' || type === 'fetch' || type === 'eventsource' || type === 'websocket') return 'xhr';
    if (type === 'document') return 'document';
    if (type === 'script') return 'script';
    if (type === 'stylesheet') return 'stylesheet';
    if (type === 'image' || type === 'media' || type === 'font') return 'image';
    return 'other';
}

function networkMatches(entry) {
    const text = networkFilter.value.trim().toLowerCase();
    if (text && !entry.url.toLowerCase().includes(text)) return false;
    const type = networkTypeFilter.value;
    if (type && networkTypeBucket(entry) !== type) return false;
    if (networkFailedOnly.checked && !(entry.failed || (entry.status && entry.status >= 400))) return false;
    return true;
}

function networkStatusCell(entry) {
    if (entry.failed) return `<span class="text-danger" title="${escapeAttr(entry.error_text || 'Failed')}">failed</span>`;
    if (entry.status === null || entry.status === undefined) return '<span class="text-theme-muted">...</span>';
    const tone = entry.status >= 500 ? 'text-danger'
        : entry.status >= 400 ? 'text-warning'
        : entry.status >= 300 ? 'text-info'
        : 'text-success';
    return `<span class="${tone}">${entry.status}</span>`;
}

function networkNameCell(entry) {
    let path = entry.url;
    let host = '';
    try {
        const url = new URL(entry.url);
        host = url.host;
        path = `${url.pathname}${url.search}` || '/';
    } catch (error) { /* data: and blob: URLs have no host */ }
    const icon = entry.from_cache ? 'bi-archive' : (entry.failed ? 'bi-exclamation-octagon' : 'bi-arrow-left-right');
    return `<div class="network-name"><i class="bi ${icon} opacity-50"></i>
                <span class="net-path">${escapeHtml(path)}</span>
                <span class="net-host">${escapeHtml(host)}</span></div>`;
}

function renderNetworkRows() {
    const all = [...networkEntries.values()];
    const rows = all.filter(networkMatches);

    // Recorded before the early return below: prev/next walks the list the
    // operator is looking at, so it has to stay in step with the filters even
    // on a poll that changes nothing else.
    networkVisibleIds = rows.map((entry) => entry.id);
    if (networkModalOpen) updateNetworkModalNav();

    const signature = `${rows.map((e) => `${e.id}:${e.seq}`).join(',')}|${networkSelectedId}`;
    if (signature === networkRenderSignature) return;
    networkRenderSignature = signature;

    const list = networkRows.closest('.network-list');
    const atBottom = list ? (list.scrollHeight - list.scrollTop - list.clientHeight) < 40 : false;

    networkRows.innerHTML = rows.map((entry) => `
        <tr data-net-id="${escapeAttr(entry.id)}"
            class="${entry.id === networkSelectedId ? 'active' : ''} ${entry.failed ? 'net-failed' : (entry.status >= 400 ? 'net-warn' : '')}">
            <td title="${escapeAttr(entry.url)}">${networkNameCell(entry)}</td>
            <td class="font-monospace">${escapeHtml(entry.method)}</td>
            <td class="font-monospace">${networkStatusCell(entry)}</td>
            <td class="text-theme-muted">${escapeHtml(entry.resource_type || '')}</td>
            <td class="font-monospace text-theme-muted">${entry.from_cache ? 'cache' : (entry.size_bytes ? formatBytes(entry.size_bytes) : '-')}</td>
            <td class="font-monospace text-theme-muted">${entry.duration_ms === null || entry.duration_ms === undefined ? '-' : `${entry.duration_ms} ms`}</td>
        </tr>`).join('');

    networkEmpty.classList.toggle('d-none', rows.length > 0);
    if (!rows.length && all.length) {
        networkEmpty.textContent = `${all.length} request(s) recorded, none match the filter.`;
    }

    const dropped = networkDropped ? `, ${networkDropped} dropped` : '';
    networkCount.textContent = rows.length === all.length
        ? `${all.length} request(s)${dropped}`
        : `${rows.length} of ${all.length}${dropped}`;

    // Follow the tail the way a console does, but only if the operator was
    // already at the bottom; yanking the list while they read it is worse than
    // missing the newest row.
    if (atBottom && list) list.scrollTop = list.scrollHeight;
}

networkRows.addEventListener('click', (e) => {
    const row = e.target.closest('[data-net-id]');
    if (!row) return;
    openNetworkRequestModal(row.getAttribute('data-net-id'));
});

[networkFilter, networkTypeFilter, networkFailedOnly].forEach((el) => {
    el.addEventListener('input', () => { networkRenderSignature = ''; renderNetworkRows(); });
    el.addEventListener('change', () => { networkRenderSignature = ''; renderNetworkRows(); });
});

// --- The request popup ----------------------------------------------------
// One request is a document, not a row: headers, payload and body all want
// width. It opens over the control view, walks the list with the arrows, and
// closes with the button, the backdrop or Escape.

function openNetworkRequestModal(id) {
    if (!id) return;
    networkSelectedId = id;
    networkRenderSignature = '';
    renderNetworkRows();

    if (!networkModalOpen) {
        networkModalOpener = document.activeElement;
        networkModalOpen = true;
        networkRequestModal.classList.remove('d-none');
        // Focus moves into the sheet so the keystrokes the operator types next
        // steer the popup instead of being forwarded into the remote page.
        netModalDialog.focus({ preventScroll: true });
    }
    hideNetModalFallback();
    netModalBody.innerHTML = '<div class="text-theme-muted small">Loading…</div>';
    updateNetworkModalNav();
    loadNetworkRequest(id);
}

async function loadNetworkRequest(id) {
    const token = ++networkModalToken;
    const instance = networkInstanceId;
    const tab = networkTabId;
    const summary = networkEntries.get(id);

    // Header first, from what the list already knows: the sheet should never
    // sit there blank while the full request is on its way.
    netModalMethod.innerText = summary ? summary.method : '—';
    netModalUrl.innerText = summary ? summary.url : id;
    netModalUrl.title = summary ? summary.url : '';
    netModalMeta.innerText = '';
    networkModalRequest = null;

    if (!instance || !tab) {
        netModalBody.innerHTML = '<div class="text-danger small">This tab is no longer being recorded.</div>';
        return;
    }

    try {
        const res = await fetchJsonOrThrow(
            `/api/instances/${instance}/tabs/${tab}/network/${encodeURIComponent(id)}`);
        if (token !== networkModalToken || !networkModalOpen) return;
        networkModalRequest = res.request;
        renderNetworkDetail(res.request);
    } catch (error) {
        if (token !== networkModalToken || !networkModalOpen) return;
        netModalBody.innerHTML = `<div class="text-danger small">${escapeHtml(error.message || 'Could not load the request')}</div>`;
    }
}

function closeNetworkRequestModal() {
    if (!networkModalOpen) {
        networkRequestModal.classList.add('d-none');
        return;
    }
    networkModalOpen = false;
    networkModalRequest = null;
    networkModalToken++;
    networkRequestModal.classList.add('d-none');
    hideNetModalFallback();
    netModalBody.innerHTML = '';

    const opener = networkModalOpener;
    networkModalOpener = null;
    if (opener && opener.isConnected && typeof opener.focus === 'function') {
        try { opener.focus({ preventScroll: true }); } catch (error) { /* gone */ }
    }
}

// Walks the filtered list, not the whole log: what the arrows do has to match
// what the operator can see behind the sheet.
function stepNetworkRequest(delta) {
    if (!networkVisibleIds.length) return;
    const at = networkVisibleIds.indexOf(networkSelectedId);
    const next = at === -1
        ? (delta > 0 ? 0 : networkVisibleIds.length - 1)
        : at + delta;
    if (next < 0 || next >= networkVisibleIds.length) return;
    openNetworkRequestModal(networkVisibleIds[next]);
}

function updateNetworkModalNav() {
    const at = networkVisibleIds.indexOf(networkSelectedId);
    const total = networkVisibleIds.length;
    if (at === -1) {
        // The request on screen is not in the list any more, because the
        // filters changed under it. The arrows then jump back into the list
        // rather than going dead.
        btnNetPrev.disabled = total === 0;
        btnNetNext.disabled = total === 0;
    } else {
        btnNetPrev.disabled = at <= 0;
        btnNetNext.disabled = at >= total - 1;
    }
    netModalPosition.innerText = at === -1 ? `— / ${total}` : `${at + 1} / ${total}`;
}

function headerRows(headers) {
    if (!headers || !Object.keys(headers).length) return '<span class="text-theme-muted">none recorded</span>';
    return `<div class="net-kv">${Object.entries(headers)
        .map(([name, value]) => `<span>${escapeHtml(name)}</span><span>${escapeHtml(String(value))}</span>`)
        .join('')}</div>`;
}

function prettyBody(request) {
    if (!request.body_available) {
        return `<span class="text-theme-muted">${escapeHtml(request.body_error || 'No body kept for this request.')}</span>`;
    }
    if (request.body_base64 && /^image\//.test(request.mime_type || '')) {
        return `<img src="data:${escapeAttr(request.mime_type)};base64,${request.body}" alt="response" style="max-width:100%;border-radius:4px;">`;
    }
    if (request.body_base64) {
        return `<pre>${escapeHtml(request.body.slice(0, 4000))}</pre><div class="text-theme-muted x-small mt-1">Base64 of a binary response.</div>`;
    }
    let text = request.body || '';
    if (/json/i.test(request.mime_type || '')) {
        try { text = JSON.stringify(JSON.parse(text), null, 2); } catch (error) { /* leave it raw */ }
    }
    return `<pre>${escapeHtml(text)}</pre>${request.body_truncated ? '<div class="text-theme-muted x-small mt-1">Truncated at 2 MB.</div>' : ''}`;
}

// A request someone wants to look at twice is usually one they want to replay
// in a terminal, so hand it over in the form that does that.
function toCurl(request) {
    const parts = [`curl -i -X ${request.method}`, `'${request.url.replace(/'/g, "'\\''")}'`];
    for (const [name, value] of Object.entries(request.request_headers || {})) {
        if (/^:/.test(name)) continue; // HTTP/2 pseudo-headers are not real headers
        parts.push(`-H '${`${name}: ${value}`.replace(/'/g, "'\\''")}'`);
    }
    if (request.post_data) parts.push(`--data-raw '${request.post_data.replace(/'/g, "'\\''")}'`);
    return parts.join(' \\\n  ');
}

// Two columns, split the way the exchange itself is: everything that went out
// on the left, everything that came back on the right.
function renderNetworkDetail(request) {
    const started = request.started_at ? new Date(request.started_at).toLocaleTimeString() : '-';
    const status = request.failed
        ? `failed: ${escapeHtml(request.error_text || '')}`
        : `${request.status ?? '-'} ${escapeHtml(request.status_text || '')}`;

    netModalMethod.innerText = request.method || '—';
    netModalUrl.innerText = request.url || '';
    netModalUrl.title = request.url || '';
    netModalMeta.innerHTML = [
        status,
        escapeHtml(request.resource_type || ''),
        request.from_cache ? 'from cache' : (request.size_bytes ? formatBytes(request.size_bytes) : ''),
        request.duration_ms === null || request.duration_ms === undefined ? '' : `${request.duration_ms} ms`,
    ].filter(Boolean).join(' · ');

    netModalBody.innerHTML = `
        <div class="net-col">
            <h6>General</h6>
            <div class="net-kv mb-3">
                <span>Status</span><span>${status}</span>
                <span>Type</span><span>${escapeHtml(request.resource_type || '-')}${request.mime_type ? ` (${escapeHtml(request.mime_type)})` : ''}</span>
                <span>Remote</span><span>${escapeHtml(request.remote_address || '-')} ${escapeHtml(request.protocol || '')}</span>
                <span>Size</span><span>${request.from_cache ? 'from cache' : (request.size_bytes ? formatBytes(request.size_bytes) : '-')}</span>
                <span>Time</span><span>${request.duration_ms === null || request.duration_ms === undefined ? '-' : `${request.duration_ms} ms`}</span>
                <span>Started</span><span>${escapeHtml(started)}</span>
                ${request.redirected_to ? `<span>Redirects to</span><span>${escapeHtml(request.redirected_to)}</span>` : ''}
                ${request.initiator ? `<span>Initiator</span><span>${escapeHtml(request.initiator.type || '')} ${escapeHtml(request.initiator.url || '')}</span>` : ''}
            </div>

            <h6>Request headers</h6>
            <div class="mb-3">${headerRows(request.request_headers)}</div>

            ${request.post_data ? `${netSection('Payload', 'payload', true)}<div class="mb-3"><pre>${escapeHtml(request.post_data)}</pre>${request.post_data_truncated ? '<div class="text-theme-muted x-small mt-1">Truncated.</div>' : ''}</div>` : ''}
        </div>
        <div class="net-col">
            <h6>Response headers</h6>
            <div class="mb-3">${headerRows(request.response_headers)}</div>

            ${netSection('Response body', 'body', Boolean(request.body_available))}
            <div>${prettyBody(request)}</div>
        </div>`;
}

// What each copy button hands over, decided in one place so the button in the
// header and the one beside the section can never disagree.
//
// Bodies are copied raw, exactly as they came off the wire, even where the
// sheet pretty-prints the JSON above them: a copy that reformats what it
// copies is no longer the response, and anything hashed or diffed against the
// server's own output would not match.
function networkCopySource(request, what) {
    if (what === 'curl') return { text: toCurl(request), label: 'curl command' };
    if (what === 'payload') {
        if (!request.post_data) return { error: 'This request was sent without a payload' };
        return { text: request.post_data, label: 'payload', truncated: Boolean(request.post_data_truncated) };
    }
    if (!request.body_available) return { error: request.body_error || 'No body was kept for this request' };
    return { text: request.body || '', label: 'response body', truncated: Boolean(request.body_truncated) };
}

// Copying is attempted for real and only reported as done if it happened; when
// the browser refuses, the text is handed over to be copied by hand instead.
async function copyFromNetworkModal(what) {
    const request = networkModalRequest;
    if (!request) { showControlNotice('The request is still loading', 'bad'); return; }

    const source = networkCopySource(request, what);
    if (source.error) { showControlNotice(source.error, 'bad'); return; }

    // Said out loud rather than quietly: what reached the clipboard is only as
    // much of the body as the recorder kept.
    const caveat = source.truncated ? ' (only the part that was kept)' : '';

    const ok = await writeClipboardText(source.text);
    if (ok) {
        hideNetModalFallback();
        showControlNotice(`Copied the ${source.label}${caveat}`, 'good');
        return;
    }
    showNetModalFallback(source.text, source.label);
    showControlNotice('Your browser blocked the clipboard, so the text is shown instead', 'bad');
}

// A section heading with its own copy button, for the parts worth taking out
// of the sheet whole.
function netSection(title, what, available) {
    if (!available) return `<h6>${escapeHtml(title)}</h6>`;
    return `<h6 class="net-section"><span>${escapeHtml(title)}</span>
        <button type="button" class="net-copy-btn" data-net-copy="${escapeAttr(what)}" title="Copy the ${escapeAttr(title.toLowerCase())}">
            <i class="bi bi-clipboard"></i> Copy
        </button></h6>`;
}

function showNetModalFallback(text, label) {
    netModalFallbackLabel.innerText = `Your browser blocked the clipboard — select the ${label} below and press Cmd/Ctrl+C`;
    netModalFallback.classList.remove('d-none');
    netModalFallbackText.value = text;
    netModalFallbackText.focus({ preventScroll: true });
    netModalFallbackText.select();
}

function hideNetModalFallback() {
    netModalFallback.classList.add('d-none');
    netModalFallbackText.value = '';
}

btnNetPrev.addEventListener('click', () => stepNetworkRequest(-1));
btnNetNext.addEventListener('click', () => stepNetworkRequest(1));
document.getElementById('btnNetModalClose').addEventListener('click', () => closeNetworkRequestModal());
document.getElementById('btnNetFallbackHide').addEventListener('click', () => {
    hideNetModalFallback();
    netModalDialog.focus({ preventScroll: true });
});
document.getElementById('btnNetCopyCurl').addEventListener('click', () => copyFromNetworkModal('curl'));
document.getElementById('btnNetCopyBody').addEventListener('click', () => copyFromNetworkModal('body'));
// Delegated: the section buttons are rewritten with the sheet on every request.
netModalBody.addEventListener('click', (e) => {
    const button = e.target.closest('[data-net-copy]');
    if (!button) return;
    copyFromNetworkModal(button.getAttribute('data-net-copy'));
});
networkRequestModal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-net-dismiss')) closeNetworkRequestModal();
});

// Capture phase, and the event stops here: Bootstrap dismisses a modal on
// Escape from a listener on the modal element, and this popup lives inside it,
// so a bubbling Escape would close the whole control view behind it.
document.addEventListener('keydown', (e) => {
    if (!networkModalOpen) return;
    const typing = e.target && e.target.closest && e.target.closest('input, textarea, select');

    if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!netModalFallback.classList.contains('d-none')) {
            hideNetModalFallback();
            netModalDialog.focus({ preventScroll: true });
            return;
        }
        closeNetworkRequestModal();
        return;
    }
    if (typing) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        stepNetworkRequest(e.key === 'ArrowRight' ? 1 : -1);
    }
}, true);
btnNetworkToggle.addEventListener('click', () => {
    if (networkOpen) closeNetworkPanel();
    else openNetworkPanel();
});
document.getElementById('btnNetworkPanelClose').addEventListener('click', () => closeNetworkPanel());
document.getElementById('btnNetworkClear').addEventListener('click', async () => {
    if (!networkInstanceId || !networkTabId) return;
    try {
        await fetchJsonOrThrow(`/api/instances/${networkInstanceId}/tabs/${networkTabId}/network`, { method: 'DELETE' });
        resetNetworkBuffer();
    } catch (error) {
        showControlNotice(error.message || 'Could not clear the log', 'bad');
    }
});

// --- The drawer -----------------------------------------------------------
// Network, console and storage share one strip under the live view, and only
// one of them holds it at a time: three panels in a 42% slice would each be too
// short to read, and the live page would be left with nothing.
function closeOtherDrawers(keep) {
    if (keep !== 'network' && networkOpen) closeNetworkPanel();
    if (keep !== 'console' && consoleOpen) closeConsolePanel();
    if (keep !== 'storage' && storageOpen) closeStoragePanel();
}

// --- Console panel ---------------------------------------------------------
// The page's own console, over the wire: what it logged, what it threw, and
// what the browser said about it. Plus a prompt - half of what a console is for
// is asking the page a question rather than waiting for it to volunteer one.

const CONSOLE_POLL_MS = 1000;
const CONSOLE_HISTORY_MAX = 100;

const consolePanel = document.getElementById('consolePanel');
const consoleLog = document.getElementById('consoleLog');
const consoleEmpty = document.getElementById('consoleEmpty');
const consoleInput = document.getElementById('consoleInput');
const consoleFilter = document.getElementById('consoleFilter');
const consoleLevelFilter = document.getElementById('consoleLevelFilter');
const consoleCount = document.getElementById('consoleCount');
const consoleStatusDot = document.getElementById('consoleStatusDot');
const btnConsoleToggle = document.getElementById('btnConsoleToggle');
const btnConsoleRun = document.getElementById('btnConsoleRun');

let consoleOpen = false;
let consoleInstanceId = null;
let consoleTabId = null;
let consoleEntries = [];
let consoleCursor = 0;
let consoleGeneration = 0;
let consolePollTimer = null;
let consoleDropped = 0;
let consoleRenderSignature = '';
let consoleHistory = [];
let consoleHistoryAt = -1;   // -1 means "at the live line, not in the history"
let consoleHistoryDraft = '';
let consoleRunning = false;
let consoleExpanded = new Set();

function setConsoleStatus(state) {
    const map = { idle: 'status-stopped', loading: 'status-partial', live: 'streaming', error: 'status-stopped' };
    consoleStatusDot.className = `status-indicator ${map[state] || map.idle}`;
}

function resetConsoleBuffer() {
    consoleEntries = [];
    consoleCursor = 0;
    consoleGeneration = 0;
    consoleDropped = 0;
    consoleRenderSignature = '';
    consoleExpanded = new Set();
    consoleLog.innerHTML = '';
    consoleLog.appendChild(consoleEmpty);
    consoleEmpty.classList.remove('d-none');
    consoleEmpty.textContent = 'Recording. Anything the page logs from now on lands here.';
    consoleCount.textContent = 'nothing logged yet';
}

function openConsolePanel() {
    closeOtherDrawers('console');
    consoleOpen = true;
    consolePanel.classList.remove('d-none');
    consolePanel.classList.add('d-flex');
    btnConsoleToggle.classList.add('active');
    startConsoleForCurrentTab();
    consoleInput.focus({ preventScroll: true });
}

function closeConsolePanel(options = {}) {
    const { stopRecorder = true } = options;
    const previousInstance = consoleInstanceId;
    const previousTab = consoleTabId;

    consoleOpen = false;
    consolePanel.classList.add('d-none');
    consolePanel.classList.remove('d-flex');
    btnConsoleToggle.classList.remove('active');
    stopConsolePoll();
    setConsoleStatus('idle');
    consoleInstanceId = null;
    consoleTabId = null;

    // Captured above: this also runs as the control modal closes, by which time
    // the current instance has already been cleared.
    if (stopRecorder && previousInstance && previousTab) {
        fetchAPI(`/api/instances/${previousInstance}/tabs/${previousTab}/console/stop`, 'POST').catch(() => {});
    }
}

async function startConsoleForCurrentTab() {
    if (!currentInstanceId || !currentTabId) return;

    if (consoleInstanceId && consoleTabId && consoleTabId !== currentTabId) {
        fetchAPI(`/api/instances/${consoleInstanceId}/tabs/${consoleTabId}/console/stop`, 'POST').catch(() => {});
    }

    consoleInstanceId = currentInstanceId;
    consoleTabId = currentTabId;
    resetConsoleBuffer();
    setConsoleStatus('loading');

    try {
        const status = await fetchJsonOrThrow(
            `/api/instances/${currentInstanceId}/tabs/${currentTabId}/console/start`, { method: 'POST' });
        consoleGeneration = status.generation;
        setConsoleStatus('live');
        startConsolePoll();
    } catch (error) {
        setConsoleStatus('error');
        consoleEmpty.textContent = `Could not attach to the console: ${error.message}`;
        consoleEmpty.classList.remove('d-none');
    }
}

function startConsolePoll() {
    stopConsolePoll();
    pollConsole();
    consolePollTimer = setInterval(pollConsole, CONSOLE_POLL_MS);
}

function stopConsolePoll() {
    if (consolePollTimer) clearInterval(consolePollTimer);
    consolePollTimer = null;
}

async function pollConsole() {
    if (!consoleOpen || !consoleInstanceId || !consoleTabId) return;
    try {
        const res = await fetchJsonOrThrow(
            `/api/instances/${consoleInstanceId}/tabs/${consoleTabId}/console?since_seq=${consoleCursor}&limit=500`);
        if (!consoleOpen) return;

        if (!res.recording) {
            setConsoleStatus('error');
            consoleEmpty.textContent = 'Recording stopped. Close and reopen the panel to start again.';
            consoleEmpty.classList.remove('d-none');
            stopConsolePoll();
            return;
        }

        // A cleared transcript is a different transcript; keeping the old lines
        // would mean showing a cursor that will never come round again.
        if (consoleGeneration && res.generation !== consoleGeneration) {
            resetConsoleBuffer();
            consoleGeneration = res.generation;
            return;
        }
        consoleGeneration = res.generation;

        if (res.entries.length) consoleEntries = consoleEntries.concat(res.entries);
        consoleCursor = res.next_seq;
        consoleDropped = res.dropped;

        const cap = res.max_entries || 1000;
        if (consoleEntries.length > cap) consoleEntries = consoleEntries.slice(-cap);

        setConsoleStatus(res.connected ? 'live' : 'error');
        renderConsoleLog();
    } catch (error) {
        setConsoleStatus('error');
    }
}

function consoleMatches(entry) {
    const text = consoleFilter.value.trim().toLowerCase();
    if (text && !String(entry.text || '').toLowerCase().includes(text)) return false;
    const level = consoleLevelFilter.value;
    // A level filter is about the page's output; the prompt and its answers are
    // the operator's own and are never filtered away under them.
    if (level && entry.level !== level && entry.kind !== 'input' && entry.kind !== 'result') return false;
    return true;
}

const CONSOLE_ICONS = {
    error: 'bi-x-octagon-fill',
    warn: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
    debug: 'bi-bug',
    input: 'bi-chevron-right',
    result: 'bi-arrow-return-left',
    log: 'bi-circle-fill',
};

function consoleOriginLabel(entry) {
    if (!entry.url) return '';
    let tail = entry.url;
    try {
        const url = new URL(entry.url);
        const parts = url.pathname.split('/').filter(Boolean);
        tail = parts.length ? parts[parts.length - 1] : url.host;
    } catch (error) { /* an eval or an anonymous script has no proper URL */ }
    return entry.line ? `${tail}:${entry.line}` : tail;
}

function consoleStackText(entry) {
    if (!entry.stack || !entry.stack.length) return '';
    return entry.stack
        .map((frame) => `at ${frame.function} (${frame.url || 'unknown'}${frame.line ? `:${frame.line}` : ''})`)
        .join('\n');
}

function consoleRow(entry) {
    const stack = consoleStackText(entry);
    const expanded = consoleExpanded.has(entry.id);
    const icon = CONSOLE_ICONS[entry.level] || CONSOLE_ICONS.log;
    const origin = consoleOriginLabel(entry);

    return `<div class="console-row lvl-${escapeAttr(entry.level)} kind-${escapeAttr(entry.kind)}${stack ? ' has-stack' : ''}"
                 data-console-id="${escapeAttr(entry.id)}">
        <span class="console-gutter"><i class="bi ${icon}" style="font-size:${entry.level === 'log' ? '0.4rem' : '0.7rem'};"></i></span>
        <span class="console-text">${escapeHtml(entry.text)}</span>
        <span class="d-flex align-items-center gap-1">
            <button type="button" class="console-copy" data-console-copy="${escapeAttr(entry.id)}" title="Copy this line"><i class="bi bi-clipboard"></i></button>
            <span class="console-origin" title="${escapeAttr(entry.url || '')}">${escapeHtml(origin)}</span>
        </span>
        ${stack ? `<div class="console-stack${expanded ? '' : ' d-none'}">${escapeHtml(stack)}</div>` : ''}
    </div>`;
}

function renderConsoleLog() {
    const rows = consoleEntries.filter(consoleMatches);
    const signature = `${rows.map((entry) => entry.id).join(',')}|${[...consoleExpanded].join(',')}`;
    if (signature === consoleRenderSignature) return;
    consoleRenderSignature = signature;

    // Follow the tail the way a console does, but only when the reader is
    // already at the bottom: yanking the view while they read an error is worse
    // than missing the newest line.
    const atBottom = (consoleLog.scrollHeight - consoleLog.scrollTop - consoleLog.clientHeight) < 48;

    consoleLog.innerHTML = rows.length
        ? rows.map(consoleRow).join('')
        : '';
    if (!rows.length) {
        consoleLog.appendChild(consoleEmpty);
        consoleEmpty.classList.remove('d-none');
        consoleEmpty.textContent = consoleEntries.length
            ? `${consoleEntries.length} line(s) recorded, none match the filter.`
            : 'Recording. Anything the page logs from now on lands here.';
    }

    const dropped = consoleDropped ? `, ${consoleDropped} dropped` : '';
    const errors = consoleEntries.filter((entry) => entry.level === 'error').length;
    const warnings = consoleEntries.filter((entry) => entry.level === 'warn').length;
    const tally = [errors ? `${errors} error(s)` : '', warnings ? `${warnings} warning(s)` : ''].filter(Boolean).join(', ');
    consoleCount.textContent = rows.length === consoleEntries.length
        ? `${consoleEntries.length} line(s)${tally ? ` — ${tally}` : ''}${dropped}`
        : `${rows.length} of ${consoleEntries.length}${dropped}`;

    if (atBottom) consoleLog.scrollTop = consoleLog.scrollHeight;
}

consoleLog.addEventListener('click', (e) => {
    const copyButton = e.target.closest('[data-console-copy]');
    if (copyButton) {
        const entry = consoleEntries.find((item) => item.id === copyButton.getAttribute('data-console-copy'));
        if (!entry) return;
        const stack = consoleStackText(entry);
        copyConsoleText(stack ? `${entry.text}\n${stack}` : entry.text, 'the line');
        return;
    }
    const row = e.target.closest('[data-console-id]');
    if (!row || !row.classList.contains('has-stack')) return;
    const id = row.getAttribute('data-console-id');
    if (consoleExpanded.has(id)) consoleExpanded.delete(id);
    else consoleExpanded.add(id);
    consoleRenderSignature = '';
    renderConsoleLog();
});

async function copyConsoleText(text, label) {
    const ok = await writeClipboardText(text);
    showControlNotice(ok ? `Copied ${label}` : 'Your browser blocked the clipboard', ok ? 'good' : 'bad');
}

[consoleFilter, consoleLevelFilter].forEach((el) => {
    el.addEventListener('input', () => { consoleRenderSignature = ''; renderConsoleLog(); });
    el.addEventListener('change', () => { consoleRenderSignature = ''; renderConsoleLog(); });
});

// --- The prompt -----------------------------------------------------------

function sizeConsoleInput() {
    const lines = Math.min(6, Math.max(1, consoleInput.value.split('\n').length));
    consoleInput.rows = lines;
}

async function runConsoleInput() {
    const expression = consoleInput.value.trim();
    if (!expression || consoleRunning) return;
    if (!consoleInstanceId || !consoleTabId) {
        showControlNotice('The console is not attached to a tab', 'bad');
        return;
    }

    // History keeps one copy of a repeated line, the way a shell does.
    if (consoleHistory[consoleHistory.length - 1] !== expression) consoleHistory.push(expression);
    if (consoleHistory.length > CONSOLE_HISTORY_MAX) consoleHistory.shift();
    consoleHistoryAt = -1;
    consoleHistoryDraft = '';

    consoleInput.value = '';
    sizeConsoleInput();
    consoleRunning = true;
    btnConsoleRun.disabled = true;

    try {
        await fetchJsonOrThrow(`/api/instances/${consoleInstanceId}/tabs/${consoleTabId}/console/eval`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expression }),
        });
        // The expression and its answer are both appended to the transcript by
        // the server, so one poll right now shows them instead of waiting out
        // the interval.
        await pollConsole();
        consoleLog.scrollTop = consoleLog.scrollHeight;
    } catch (error) {
        showControlNotice(error.message || 'Could not run it', 'bad');
    } finally {
        consoleRunning = false;
        btnConsoleRun.disabled = false;
        consoleInput.focus({ preventScroll: true });
    }
}

function walkConsoleHistory(delta) {
    if (!consoleHistory.length) return;
    if (consoleHistoryAt === -1) {
        if (delta > 0) return;             // already at the live line
        consoleHistoryDraft = consoleInput.value;
        consoleHistoryAt = consoleHistory.length - 1;
    } else {
        const next = consoleHistoryAt + (delta > 0 ? 1 : -1);
        if (next < 0) return;
        if (next >= consoleHistory.length) {
            consoleHistoryAt = -1;
            consoleInput.value = consoleHistoryDraft;
            sizeConsoleInput();
            return;
        }
        consoleHistoryAt = next;
    }
    consoleInput.value = consoleHistory[consoleHistoryAt];
    sizeConsoleInput();
    const end = consoleInput.value.length;
    consoleInput.setSelectionRange(end, end);
}

consoleInput.addEventListener('input', () => sizeConsoleInput());

consoleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        runConsoleInput();
        return;
    }
    if (e.key === 'Escape') {
        // The prompt is inside the control modal, and Bootstrap closes a modal
        // on Escape. Clearing the line is what Escape means at a prompt, and
        // tearing down the whole control view is not.
        e.preventDefault();
        e.stopPropagation();
        consoleInput.value = '';
        consoleHistoryAt = -1;
        sizeConsoleInput();
        return;
    }
    // Only when the caret is on the first (or last) line, so the arrows still
    // move around inside a multi-line expression.
    const before = consoleInput.value.slice(0, consoleInput.selectionStart);
    const after = consoleInput.value.slice(consoleInput.selectionEnd);
    if (e.key === 'ArrowUp' && !before.includes('\n')) {
        e.preventDefault();
        walkConsoleHistory(-1);
    } else if (e.key === 'ArrowDown' && !after.includes('\n')) {
        e.preventDefault();
        walkConsoleHistory(1);
    }
});

btnConsoleToggle.addEventListener('click', () => {
    if (consoleOpen) closeConsolePanel();
    else openConsolePanel();
});
btnConsoleRun.addEventListener('click', () => runConsoleInput());
document.getElementById('btnConsolePanelClose').addEventListener('click', () => closeConsolePanel());

document.getElementById('btnConsoleClear').addEventListener('click', async () => {
    if (!consoleInstanceId || !consoleTabId) return;
    try {
        await fetchJsonOrThrow(`/api/instances/${consoleInstanceId}/tabs/${consoleTabId}/console`, { method: 'DELETE' });
        resetConsoleBuffer();
    } catch (error) {
        showControlNotice(error.message || 'Could not clear the transcript', 'bad');
    }
});

// A console only sees what is logged while it is listening, and most of what a
// page has to say it says while loading. So: a reload, from here.
document.getElementById('btnConsoleReload').addEventListener('click', async () => {
    if (!currentInstanceId || !currentTabId) return;
    try {
        await fetchJsonOrThrow(`/api/instances/${currentInstanceId}/tabs/${currentTabId}/reload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ignore_cache: false }),
        });
        showControlNotice('Reloading — what the page logs on the way up is recorded', 'good');
        nudge(400);
    } catch (error) {
        showControlNotice(error.message || 'Could not reload', 'bad');
    }
});

document.getElementById('btnConsoleCopy').addEventListener('click', () => {
    const rows = consoleEntries.filter(consoleMatches);
    if (!rows.length) { showControlNotice('There is nothing in the transcript yet', 'bad'); return; }
    // Written out the way it reads on screen, with the level in front, so a
    // transcript pasted into a ticket still says which lines were the errors.
    const text = rows.map((entry) => {
        const stack = consoleStackText(entry);
        const head = `[${entry.level}] ${entry.text}`;
        return stack ? `${head}\n${stack.split('\n').map((line) => `    ${line}`).join('\n')}` : head;
    }).join('\n');
    copyConsoleText(text, `the transcript (${rows.length} line(s))`);
});

// --- Storage panel ---------------------------------------------------------
// The browser's Application panel for the tab in front of you: localStorage,
// sessionStorage and cookies for whatever origin it is on, and the means to
// change any of them. Read on demand rather than polled - storage changes
// because something changed it, not on its own, and a table that rewrites
// itself every second is one you cannot click on.

const storagePanel = document.getElementById('storagePanel');
const storageRows = document.getElementById('storageRows');
const storageHead = document.getElementById('storageHead');
const storageEmpty = document.getElementById('storageEmpty');
const storageFilter = document.getElementById('storageFilter');
const storageOriginLabel = document.getElementById('storageOrigin');
const storageStatusDot = document.getElementById('storageStatusDot');
const btnStorageToggle = document.getElementById('btnStorageToggle');

const storageItemModal = document.getElementById('storageItemModal');
const storageItemDialog = storageItemModal.querySelector('.net-modal-dialog');
const storageItemArea = document.getElementById('storageItemArea');
const storageItemTitle = document.getElementById('storageItemTitle');
const storageItemMeta = document.getElementById('storageItemMeta');
const storageItemKey = document.getElementById('storageItemKey');
const storageItemValue = document.getElementById('storageItemValue');
const storageItemHint = document.getElementById('storageItemHint');
const btnStorageItemDelete = document.getElementById('btnStorageItemDelete');

let storageOpen = false;
let storageInstanceId = null;
let storageTabId = null;
let storageArea = 'local';
let storageData = null;
let storageLoadToken = 0;
let storageModalOpen = false;
let storageEditing = null;      // the row being edited, or a blank for a new one
let storageModalOpener = null;  // element to hand focus back to on close

function setStorageStatus(state) {
    const map = { idle: 'status-stopped', loading: 'status-partial', live: 'streaming', error: 'status-stopped' };
    storageStatusDot.className = `status-indicator ${map[state] || map.idle}`;
}

function openStoragePanel() {
    closeOtherDrawers('storage');
    storageOpen = true;
    storagePanel.classList.remove('d-none');
    storagePanel.classList.add('d-flex');
    btnStorageToggle.classList.add('active');
    storageInstanceId = currentInstanceId;
    storageTabId = currentTabId;
    loadStorage();
}

function closeStoragePanel() {
    storageOpen = false;
    closeStorageItemModal();
    storagePanel.classList.add('d-none');
    storagePanel.classList.remove('d-flex');
    btnStorageToggle.classList.remove('active');
    setStorageStatus('idle');
    storageInstanceId = null;
    storageTabId = null;
    storageData = null;
    storageLoadToken += 1;
}

async function loadStorage() {
    if (!storageOpen) return;
    storageInstanceId = currentInstanceId;
    storageTabId = currentTabId;
    if (!storageInstanceId || !storageTabId) return;

    const token = ++storageLoadToken;
    setStorageStatus('loading');
    try {
        const res = await fetchJsonOrThrow(`/api/instances/${storageInstanceId}/tabs/${storageTabId}/storage`);
        // A snapshot that arrives after a newer one was asked for is stale, and
        // showing it would mean the panel disagreeing with the tab it names.
        if (token !== storageLoadToken || !storageOpen) return;
        storageData = res;
        setStorageStatus(res.has_storage ? 'live' : 'error');
        renderStorage();
    } catch (error) {
        if (token !== storageLoadToken || !storageOpen) return;
        storageData = null;
        setStorageStatus('error');
        storageHead.innerHTML = '';
        storageRows.innerHTML = '';
        storageEmpty.classList.remove('d-none');
        storageEmpty.textContent = `Could not read the storage: ${error.message}`;
    }
}

function storageAreaItems(area) {
    if (!storageData) return [];
    if (area === 'cookies') return storageData.cookies?.items || [];
    return storageData[area]?.items || [];
}

function storageRowMatches(row) {
    const text = storageFilter.value.trim().toLowerCase();
    if (!text) return true;
    const name = String(row.key ?? row.name ?? '').toLowerCase();
    return name.includes(text) || String(row.value || '').toLowerCase().includes(text);
}

// One line of it, enough to tell rows apart. The whole value is a click away,
// and a 40 KB token pasted into a table cell only makes the table unusable.
function storageValuePreview(value) {
    const flat = String(value ?? '').replace(/\s+/g, ' ').trim();
    return flat.length > 300 ? `${flat.slice(0, 300)}…` : flat;
}

function cookieFlags(cookie) {
    const flags = [];
    if (cookie.http_only) flags.push('HttpOnly');
    if (cookie.secure) flags.push('Secure');
    if (cookie.same_site) flags.push(cookie.same_site);
    if (cookie.session) flags.push('Session');
    return flags.map((flag) => `<span class="storage-flag">${escapeHtml(flag)}</span>`).join('');
}

function renderStorage() {
    document.querySelectorAll('[data-storage-area]').forEach((button) => {
        button.classList.toggle('active', button.getAttribute('data-storage-area') === storageArea);
    });

    document.getElementById('storageCountLocal').innerText = storageAreaItems('local').length;
    document.getElementById('storageCountSession').innerText = storageAreaItems('session').length;
    document.getElementById('storageCountCookies').innerText = storageAreaItems('cookies').length;

    if (!storageData) return;

    const origin = storageData.origin || 'no origin';
    const area = storageArea === 'cookies' ? null : storageData[storageArea];
    // Where the numbers came from is part of the answer: read through the page
    // rather than from the browser, they could have been doctored by the page.
    const via = area && area.source === 'page' ? ' · read via the page' : '';
    storageOriginLabel.innerText = `${origin}${via}`;
    storageOriginLabel.title = `${storageData.url || ''}${via ? '\nChrome would not name this store, so it was read by running script in the page.' : ''}`;

    const all = storageAreaItems(storageArea);
    const rows = all.filter(storageRowMatches);

    storageHead.innerHTML = storageArea === 'cookies'
        ? `<th style="width: 24%;">Name</th><th>Value</th><th style="width: 150px;">Domain</th>
           <th style="width: 70px;">Path</th><th style="width: 180px;">Flags</th><th style="width: 70px;">Size</th>`
        : `<th style="width: 28%;">Key</th><th>Value</th><th style="width: 80px;">Size</th>`;

    storageRows.innerHTML = rows.map((row, index) => (storageArea === 'cookies'
        ? `<tr data-storage-row="${index}">
               <td class="storage-value" title="${escapeAttr(row.name)}">${escapeHtml(row.name)}</td>
               <td class="storage-value text-theme-muted" title="${escapeAttr(storageValuePreview(row.value))}">${escapeHtml(storageValuePreview(row.value))}</td>
               <td class="text-theme-muted">${escapeHtml(row.domain)}</td>
               <td class="text-theme-muted">${escapeHtml(row.path)}</td>
               <td>${cookieFlags(row)}</td>
               <td class="font-monospace text-theme-muted">${formatBytes(row.size)}</td>
           </tr>`
        : `<tr data-storage-row="${index}">
               <td class="storage-value" title="${escapeAttr(row.key)}">${escapeHtml(row.key)}</td>
               <td class="storage-value text-theme-muted" title="${escapeAttr(storageValuePreview(row.value))}">${escapeHtml(storageValuePreview(row.value))}</td>
               <td class="font-monospace text-theme-muted">${formatBytes(row.bytes)}</td>
           </tr>`)).join('');

    const areaError = storageArea === 'cookies' ? storageData.cookies?.error : (area && area.error);
    storageEmpty.classList.toggle('d-none', rows.length > 0);
    if (!rows.length) {
        if (!storageData.has_storage) {
            storageEmpty.textContent = `This tab is on ${storageData.url || 'about:blank'}, which has no origin of its own and therefore no storage. Navigate it to the site first.`;
        } else if (areaError) {
            storageEmpty.textContent = `Could not read it: ${areaError}`;
        } else if (all.length) {
            storageEmpty.textContent = `${all.length} item(s), none match the filter.`;
        } else {
            storageEmpty.textContent = storageArea === 'cookies'
                ? 'No cookies for this site.'
                : `Nothing in ${storageArea === 'local' ? 'localStorage' : 'sessionStorage'} for ${origin}.`;
        }
    }
}

document.querySelectorAll('[data-storage-area]').forEach((button) => {
    button.addEventListener('click', () => {
        storageArea = button.getAttribute('data-storage-area');
        renderStorage();
    });
});

storageFilter.addEventListener('input', () => renderStorage());

storageRows.addEventListener('click', (e) => {
    const row = e.target.closest('[data-storage-row]');
    if (!row) return;
    const item = storageAreaItems(storageArea).filter(storageRowMatches)[Number(row.getAttribute('data-storage-row'))];
    if (item) openStorageItemModal(item);
});

btnStorageToggle.addEventListener('click', () => {
    if (storageOpen) closeStoragePanel();
    else openStoragePanel();
});
document.getElementById('btnStoragePanelClose').addEventListener('click', () => closeStoragePanel());
document.getElementById('btnStorageRefresh').addEventListener('click', () => loadStorage());
document.getElementById('btnStorageAdd').addEventListener('click', () => openStorageItemModal(null));

document.getElementById('btnStorageClear').addEventListener('click', async () => {
    if (!storageInstanceId || !storageTabId) return;
    const count = storageAreaItems(storageArea).length;
    const label = storageArea === 'cookies' ? 'cookies' : (storageArea === 'local' ? 'localStorage' : 'sessionStorage');
    if (!count) { showControlNotice(`There is nothing in ${label} to empty`, 'bad'); return; }

    const ok = await confirmAction({
        title: `Empty ${label}?`,
        // The area is named in the message as well as in the title: this is the
        // one button here that can sign a session out, and a title is the part
        // of a dialog people skip.
        messageHtml: `This removes <strong>${count}</strong> item(s) from <strong>${escapeHtml(label)}</strong> on `
            + `<strong>${escapeHtml(storageData?.origin || 'this origin')}</strong> in the live browser. `
            + 'Anything signed in through them will be signed out, and there is no undo.',
        confirmLabel: `Empty ${label}`,
    });
    if (!ok) return;

    try {
        const res = await fetchJsonOrThrow(
            `/api/instances/${storageInstanceId}/tabs/${storageTabId}/storage/${storageArea}?clear=1`, { method: 'DELETE' });
        showControlNotice(`Emptied ${label} — ${res.removed ?? count} item(s)`, 'good');
        loadStorage();
    } catch (error) {
        showControlNotice(error.message || 'Could not empty it', 'bad');
    }
});

// --- The item editor ------------------------------------------------------

function openStorageItemModal(item) {
    storageEditing = item
        ? { ...item, key: item.key ?? item.name, isNew: false }
        : { key: '', value: '', isNew: true };

    if (!storageModalOpen) {
        storageModalOpener = document.activeElement;
        storageModalOpen = true;
        storageItemModal.classList.remove('d-none');
    }

    const areaLabel = storageArea === 'cookies' ? 'cookie' : (storageArea === 'local' ? 'local' : 'session');
    storageItemArea.innerText = areaLabel;
    storageItemTitle.innerText = storageEditing.isNew
        ? `New ${storageArea === 'cookies' ? 'cookie' : 'item'}`
        : storageEditing.key;
    storageItemMeta.innerText = storageArea === 'cookies' && !storageEditing.isNew
        ? `${storageEditing.domain}${storageEditing.path} · ${cookieMetaText(storageEditing)}`
        : (storageData?.origin || '');

    storageItemKey.value = storageEditing.key || '';
    storageItemKey.readOnly = !storageEditing.isNew;
    storageItemValue.value = storageEditing.value || '';
    btnStorageItemDelete.classList.toggle('d-none', storageEditing.isNew);

    storageItemHint.innerText = storageArea === 'cookies'
        ? 'The value changes; the flags stay exactly as they are. A new cookie is created for this host at /.'
        : 'Saved straight into the live browser. The page does not reload, so a page that read this value at startup keeps the old one until it does.';

    (storageEditing.isNew ? storageItemKey : storageItemValue).focus({ preventScroll: true });
}

function cookieMetaText(cookie) {
    const parts = [];
    if (cookie.http_only) parts.push('HttpOnly');
    if (cookie.secure) parts.push('Secure');
    if (cookie.same_site) parts.push(`SameSite=${cookie.same_site}`);
    parts.push(cookie.expires ? `expires ${new Date(cookie.expires * 1000).toLocaleString()}` : 'session cookie');
    return parts.join(' · ');
}

function closeStorageItemModal(options = {}) {
    if (!storageModalOpen) {
        storageItemModal.classList.add('d-none');
        return;
    }
    const { warnUnsaved = false } = options;
    const dirty = storageEditing && (storageItemValue.value !== (storageEditing.value || '')
        || storageItemKey.value !== (storageEditing.key || ''));

    storageModalOpen = false;
    storageEditing = null;
    storageItemModal.classList.add('d-none');

    // Said rather than swallowed: closing on an edited value loses the edit,
    // and a dialog that vanishes silently leaves you unsure whether it saved.
    if (warnUnsaved && dirty) showControlNotice('Closed without saving', 'bad');

    const opener = storageModalOpener;
    storageModalOpener = null;
    if (opener && opener.isConnected && typeof opener.focus === 'function') {
        try { opener.focus({ preventScroll: true }); } catch (error) { /* gone */ }
    }
}

async function saveStorageItem() {
    if (!storageEditing || !storageInstanceId || !storageTabId) return;
    const key = storageItemKey.value.trim();
    if (!key) { showControlNotice('Give the item a key', 'bad'); return; }

    const payload = { area: storageArea, key, value: storageItemValue.value };
    if (storageArea === 'cookies' && !storageEditing.isNew) {
        payload.domain = storageEditing.domain;
        payload.path = storageEditing.path;
    }

    try {
        await fetchJsonOrThrow(`/api/instances/${storageInstanceId}/tabs/${storageTabId}/storage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const wasNew = storageEditing.isNew;
        closeStorageItemModal();
        showControlNotice(`${wasNew ? 'Added' : 'Saved'} ${key}`, 'good');
        loadStorage();
    } catch (error) {
        showControlNotice(error.message || 'Could not save it', 'bad');
    }
}

async function deleteStorageItem() {
    if (!storageEditing || storageEditing.isNew || !storageInstanceId || !storageTabId) return;
    const key = storageEditing.key;

    const ok = await confirmAction({
        title: `Delete ${key}?`,
        messageHtml: `This removes it from the live browser${storageArea === 'cookies' ? ` (${escapeHtml(storageEditing.domain || '')}${escapeHtml(storageEditing.path || '')})` : ''}, with no undo.`,
        confirmLabel: 'Delete',
    });
    if (!ok) return;

    const params = new URLSearchParams({ key });
    if (storageArea === 'cookies') {
        if (storageEditing.domain) params.set('domain', storageEditing.domain);
        if (storageEditing.path) params.set('path', storageEditing.path);
    }

    try {
        await fetchJsonOrThrow(
            `/api/instances/${storageInstanceId}/tabs/${storageTabId}/storage/${storageArea}?${params.toString()}`,
            { method: 'DELETE' });
        closeStorageItemModal();
        showControlNotice(`Deleted ${key}`, 'good');
        loadStorage();
    } catch (error) {
        showControlNotice(error.message || 'Could not delete it', 'bad');
    }
}

document.getElementById('btnStorageItemSave').addEventListener('click', () => saveStorageItem());
document.getElementById('btnStorageItemDelete').addEventListener('click', () => deleteStorageItem());
document.getElementById('btnStorageItemCancel').addEventListener('click', () => closeStorageItemModal({ warnUnsaved: true }));
document.getElementById('btnStorageItemClose').addEventListener('click', () => closeStorageItemModal({ warnUnsaved: true }));
document.getElementById('btnStorageItemCopy').addEventListener('click', async () => {
    const ok = await writeClipboardText(storageItemValue.value);
    showControlNotice(ok ? 'Copied the value' : 'Your browser blocked the clipboard', ok ? 'good' : 'bad');
});

// Re-indents the value in the box. It is not saved until Save is pressed, so
// this reformats what the operator is about to write, never what is stored.
document.getElementById('btnStorageItemPretty').addEventListener('click', () => {
    try {
        storageItemValue.value = JSON.stringify(JSON.parse(storageItemValue.value), null, 2);
        storageItemHint.innerText = 'Re-indented. Press Save to write it back as it now reads.';
    } catch (error) {
        showControlNotice('That value is not JSON', 'bad');
    }
});

storageItemModal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-storage-dismiss')) closeStorageItemModal({ warnUnsaved: true });
});

// Capture phase and stopped here, same as the request popup: the sheet lives
// inside #controlModal, and a bubbling Escape would close the control view
// behind it instead of the sheet in front.
document.addEventListener('keydown', (e) => {
    if (!storageModalOpen) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeStorageItemModal({ warnUnsaved: true });
        return;
    }
    // Save from the keyboard, since the value box swallows a plain Enter.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        saveStorageItem();
    }
}, true);

// --- Stats & Server Logs ---
function startStats() { fetchStats(); statsInterval = setInterval(fetchStats, 3000); }
function stopStats() { clearInterval(statsInterval); }
document.getElementById('btnRefreshServerLogs').addEventListener('click', fetchServerLogs);

async function fetchStats() {
    const stats = await fetchAPI('/api/server/stats');
    if (!stats) return;

    // System info bar
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setText('sys-host', stats.hostname || '—');
    setText('sys-platform', `${stats.platform || ''} ${stats.release || ''}${stats.arch ? ' (' + stats.arch + ')' : ''}`.trim());
    setText('sys-cpu', `${stats.cpu_model || 'CPU'} • ${stats.cpus || '?'} cores`);

    // CPU
    const cpuPct = typeof stats.cpu_usage_percent === 'number' ? stats.cpu_usage_percent : 0;
    document.getElementById('stats-cpus').innerText = `${cpuPct.toFixed(1)}%`;
    const cpuBar = document.getElementById('stats-cpu-bar');
    if (cpuBar) cpuBar.style.width = `${Math.min(100, cpuPct)}%`;
    document.getElementById('stats-cpu-model').innerText = `${stats.cpu_model} • ${stats.cpus} cores`;
    
    // Memory
    const usedMem = stats.totalmem - stats.freemem;
    const memPercent = Math.round((usedMem / stats.totalmem) * 100);
    const memBar = document.getElementById('stats-mem-bar');
    memBar.style.width = `${memPercent}%`;
    document.getElementById('stats-mem-percent').innerText = `${memPercent}%`;
    document.getElementById('stats-mem-text').innerText = `${formatBytes(usedMem)} / ${formatBytes(stats.totalmem)}`;
    
    // Disk
    if (stats.disk) {
        const diskBar = document.getElementById('stats-disk-bar');
        diskBar.style.width = stats.disk.percent;
        document.getElementById('stats-disk-percent').innerText = stats.disk.percent;
        document.getElementById('stats-disk-text').innerText = `${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.total)}`;
    }

    document.getElementById('stats-uptime').innerText = formatUptime(stats.uptime);
    document.getElementById('stats-load').innerText = stats.loadavg.map(n => n.toFixed(2)).join(' ');
    
    document.getElementById('stats-interfaces').innerHTML = stats.interfaces.map(iface => `
        <tr><td>${iface.name}</td><td class="font-monospace text-warning">${iface.address}</td></tr>
    `).join('');

    fetchServerLogs();
}
async function fetchServerLogs() { const logs = await fetchAPI('/api/server/logs'); if (logs && Array.isArray(logs)) { serverLogsContainer.innerText = logs.join('\n'); serverLogsContainer.scrollTop = serverLogsContainer.scrollHeight; } }

// --- Config ---
const configList = document.getElementById('config-list');
const configForm = document.getElementById('configForm');
async function loadConfig() { const config = await fetchAPI('/api/config'); configList.innerHTML = Object.entries(config).map(([key, value]) => `<tr><td>${key}</td><td>${value}</td><td><button class="btn btn-sm btn-outline-danger" onclick="deleteConfig('${key}')"><i class="bi bi-trash"></i></button></td></tr>`).join(''); }
configForm.addEventListener('submit', async (e) => { e.preventDefault(); await fetchAPI('/api/config', 'POST', { key: document.getElementById('configKey').value, value: document.getElementById('configValue').value }); bootstrap.Modal.getInstance(document.getElementById('addConfigModal')).hide(); configForm.reset(); loadConfig(); });
async function deleteConfig(key) { if(confirm('Delete?')) { await fetchAPI(`/api/config/${key}`, 'DELETE'); loadConfig(); } }

// --- REST API settings ---------------------------------------------------
// The toggle and key live in the config table server-side, so everything here
// applies at runtime: no .env edit, no restart.
const restEnabledSwitch = document.getElementById('restEnabledSwitch');
const restApiKeyInput = document.getElementById('restApiKey');
const restStatusBadge = document.getElementById('restStatusBadge');
const restAlert = document.getElementById('restAlert');
const restHint = document.getElementById('restHint');
const restExample = document.getElementById('restExample');
const btnRestSave = document.getElementById('btnRestSave');
const btnRestReveal = document.getElementById('btnRestReveal');
const btnRestCopy = document.getElementById('btnRestCopy');
const btnRestGenerate = document.getElementById('btnRestGenerate');

function showRestAlert(kind, message) {
    if (!restAlert) return;
    restAlert.className = `alert alert-${kind}`;
    restAlert.innerText = message;
    restAlert.classList.remove('d-none');
}

function renderRestSettings(settings) {
    if (!settings || !restEnabledSwitch) return;

    restEnabledSwitch.checked = Boolean(settings.requested);
    restApiKeyInput.value = settings.api_key || '';
    restApiKeyInput.placeholder = settings.has_key ? '' : 'No key set';

    const baseUrl = `${window.location.origin}${settings.base_path}`;
    document.getElementById('restBaseUrl').innerText = baseUrl;

    restStatusBadge.className = `badge ${settings.enabled ? 'bg-success' : 'bg-secondary'}`;
    restStatusBadge.innerText = settings.enabled ? 'Enabled' : 'Disabled';

    // The switch can be on while the API is off — that only happens with no key.
    restHint.innerText = settings.requested && !settings.enabled
        ? 'Switched on, but inactive until a key is set.'
        : '';

    // /rest/docs only answers while the API is on; fall back to the dashboard
    // copy at /api/docs so the contract is always one click away.
    const docsLink = document.getElementById('linkRestDocs');
    if (docsLink) {
        docsLink.href = settings.enabled ? `${settings.base_path}/docs` : '/api/docs';
        docsLink.title = settings.enabled
            ? 'Opens the token-protected contract at /rest/docs'
            : 'REST API is off — showing the dashboard copy at /api/docs';
    }

    restExample.classList.toggle('d-none', !settings.enabled);
    if (settings.enabled) {
        restExample.innerText = `curl -H "X-API-Key: ${settings.api_key}" ${baseUrl}/instances`;
    }
}

async function loadRestSettings() {
    if (!restEnabledSwitch) return;
    restAlert.classList.add('d-none');
    try {
        renderRestSettings(await fetchJsonOrThrow('/api/settings/rest'));
    } catch (e) {
        showRestAlert('danger', `Could not load REST settings: ${e.message}`);
    }
}

async function saveRestSettings(payload, successMessage) {
    btnRestSave.disabled = true;
    restAlert.classList.add('d-none');
    try {
        const result = await fetchJsonOrThrow('/api/settings/rest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        renderRestSettings(result);
        showRestAlert('success', successMessage);
    } catch (e) {
        // Re-sync so the switch reflects what the server actually stored rather
        // than the rejected attempt (e.g. enabling without a key).
        await loadRestSettings();
        showRestAlert('danger', e.message);
    } finally {
        btnRestSave.disabled = false;
    }
}

if (btnRestSave) {
    btnRestSave.addEventListener('click', () => saveRestSettings(
        { enabled: restEnabledSwitch.checked, api_key: restApiKeyInput.value.trim() },
        'Saved. The change is live — no restart needed.'
    ));
}

if (btnRestGenerate) {
    btnRestGenerate.addEventListener('click', async () => {
        const rotating = Boolean(restApiKeyInput.value);
        if (rotating && !await confirmAction({
            title: 'Generate a new key?',
            messageHtml: 'The current key stops working immediately. Any script or service using it has to be updated.',
            confirmLabel: 'Generate new key',
        })) return;

        await saveRestSettings(
            { enabled: restEnabledSwitch.checked, generate_key: true },
            rotating ? 'New key generated. Update your clients — the old key no longer works.' : 'Key generated.'
        );
        restApiKeyInput.type = 'text';
        btnRestReveal.innerHTML = '<i class="bi bi-eye-slash"></i>';
    });
}

if (btnRestReveal) {
    btnRestReveal.addEventListener('click', () => {
        const hidden = restApiKeyInput.type === 'password';
        restApiKeyInput.type = hidden ? 'text' : 'password';
        btnRestReveal.innerHTML = `<i class="bi bi-eye${hidden ? '-slash' : ''}"></i>`;
    });
}

if (btnRestCopy) {
    btnRestCopy.addEventListener('click', async () => {
        if (!restApiKeyInput.value) return;
        if (await writeClipboardText(restApiKeyInput.value)) {
            showRestAlert('success', 'API key copied to clipboard.');
        } else {
            // Nothing left to try: show the key and select it so it can be
            // copied by hand.
            restApiKeyInput.type = 'text';
            restApiKeyInput.select();
            showRestAlert('warning', 'Clipboard blocked by the browser — the key is selected, copy it manually.');
        }
    });
}

// --- Utils ---
async function fetchAPI(url, method = 'GET', body = null) { const opts = { method }; if (body) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body); } const res = await fetch(url, opts); if (res.status === 401) { window.location.reload(); return null; } return res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text(); }
async function fetchJsonOrThrow(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        window.location.reload();
        return null;
    }

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await res.json() : { error: await res.text() };
    if (!res.ok) {
        throw new Error(payload.error || `Request failed with status ${res.status}`);
    }
    return payload;
}
function renderImportCookieFiles(files, sniffed = null) {
    if (!files.length) {
        importCookiesSelectedFiles.innerHTML = 'No files selected.';
        return;
    }

    const kindFor = (file) => (sniffed || []).find((item) => item.file === file)?.kind || null;
    const tone = { cookies: 'bg-primary', storage: 'bg-info text-dark', mixed: 'bg-success', unknown: 'bg-danger' };

    importCookiesSelectedFiles.innerHTML = files.map((file) => {
        const kind = kindFor(file);
        const badge = kind
            ? `<span class="badge ${tone[kind.kind] || 'bg-secondary'}">${escapeHtml(kind.label)}</span>`
            : '';
        return `
        <div class="d-flex justify-content-between align-items-center gap-3 py-1">
            <span class="text-break">${escapeHtml(file.name)}</span>
            <span class="d-flex gap-2 flex-shrink-0">
                ${badge}
                <span class="badge bg-secondary">${formatBytes(file.size)}</span>
            </span>
        </div>`;
    }).join('');
}

// A deliberately rough read of the file, only so the dialog can label it before
// anything is uploaded. The server does the real parsing and stays the
// authority on what a file is.
function sniffSessionFile(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return { kind: 'unknown', label: 'empty' };
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        const rows = trimmed.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#')).length;
        return { kind: 'cookies', label: `${rows} cookie(s), Netscape` };
    }

    let json;
    try {
        json = JSON.parse(trimmed);
    } catch (error) {
        return { kind: 'unknown', label: 'not valid JSON' };
    }

    if (Array.isArray(json)) {
        if (json.every((item) => Array.isArray(item) && item.length === 2)) {
            return { kind: 'storage', label: `${json.length} storage key(s)` };
        }
        return { kind: 'cookies', label: `${json.length} cookie(s)` };
    }
    if (!json || typeof json !== 'object') return { kind: 'unknown', label: 'unrecognised' };

    const cookieList = Array.isArray(json.cookies) ? json.cookies : (Array.isArray(json.data?.cookies) ? json.data.cookies : null);
    const storageKeys = (json.localStorage ? Object.keys(json.localStorage).length : 0)
        + (json.sessionStorage ? Object.keys(json.sessionStorage).length : 0);
    if (cookieList && storageKeys) return { kind: 'mixed', label: `${cookieList.length} cookie(s) + ${storageKeys} storage key(s)` };
    if (cookieList) return { kind: 'cookies', label: `${cookieList.length} cookie(s)` };
    if (storageKeys) return { kind: 'storage', label: `${storageKeys} storage key(s)` };

    if (typeof json.name === 'string' && (json.value !== undefined || json.domain !== undefined)) {
        return { kind: 'cookies', label: '1 cookie' };
    }

    const keys = Object.keys(json);
    if (keys.length && Object.values(json).every((v) => v === null || ['string', 'number', 'boolean'].includes(typeof v))) {
        return { kind: 'storage', label: `${keys.length} storage key(s)` };
    }
    return { kind: 'unknown', label: 'unrecognised' };
}

function formatSessionImportSummary(result) {
    const lines = [];
    const files = Array.isArray(result.files) ? result.files : [];

    for (const file of files) {
        const bits = [];
        if (file.cookie_count) bits.push(`${file.cookie_count} cookie(s)`);
        if (file.local_keys) bits.push(`${file.local_keys} localStorage key(s)`);
        if (file.session_keys) bits.push(`${file.session_keys} sessionStorage key(s)`);
        lines.push(`${file.name}: ${bits.length ? bits.join(', ') : 'nothing usable'}`);
    }

    const cookies = result.cookies || {};
    if (cookies.total) {
        lines.push(`Cookies: ${cookies.imported || 0} of ${cookies.total} accepted by the browser.`);
    }

    const storage = result.storage;
    if (storage) {
        lines.push(`Storage: ${storage.wrote_local || 0} localStorage + ${storage.wrote_session || 0} sessionStorage key(s) written into ${storage.origin}.`);
        for (const mirror of storage.mirrored_cookies || []) {
            lines.push(mirror.applied
                ? `Cookie ${mirror.cookie} set from ${mirror.key} (${mirror.length} chars).`
                : `Cookie ${mirror.cookie} not set: ${mirror.reason || 'the page refused it'}.`);
        }
        if (storage.landed_url) lines.push(`Opened ${storage.landed_url}`);
    }

    if (Array.isArray(result.file_errors) && result.file_errors.length) {
        lines.push(`Problems: ${result.file_errors.map((item) => `${item.name}: ${item.error}`).join(' | ')}`);
    }

    const failures = cookies.failures || [];
    if (failures.length) {
        const shown = failures.slice(0, 5)
            .map((item) => `${item.name}${item.domain ? `@${item.domain}` : ''}: ${item.error}`)
            .join(' | ');
        lines.push(`Browser rejected ${failures.length} cookie(s): ${shown}${failures.length > 5 ? ` (+${failures.length - 5} more)` : ''}`);
    }

    return lines.join('\n');
}
function setImportCookiesResult(message, tone = 'secondary', hidden = false) {
    importCookiesResult.className = 'alert mb-0';
    if (hidden || !message) {
        importCookiesResult.classList.add('d-none');
        importCookiesResult.textContent = '';
        return;
    }

    importCookiesResult.classList.add(`alert-${tone}`);
    importCookiesResult.classList.remove('d-none');
    importCookiesResult.textContent = message;
}
function setImportSubmitState(isLoading) {
    importCookiesSubmitBtn.disabled = isLoading;
    importCookiesFilesInput.disabled = isLoading;
    importCookiesSubmitBtn.innerHTML = isLoading
        ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Importing...'
        : 'Import';
}
function formatCookieImportSummary(result) {
    const fileCount = (Array.isArray(result.files) ? result.files.length : 0) + (Array.isArray(result.file_errors) ? result.file_errors.length : 0);
    const parts = [
        `Imported ${result.imported || 0} cookies from ${fileCount} file(s).`
    ];

    if (Array.isArray(result.file_errors) && result.file_errors.length) {
        parts.push(`File parse issues: ${result.file_errors.map((item) => `${item.name}: ${item.error}`).join(' | ')}`);
    }

    if (Array.isArray(result.failures) && result.failures.length) {
        const failedCookies = result.failures
            .slice(0, 5)
            .map((item) => `${item.name}${item.domain ? `@${item.domain}` : ''}: ${item.error}`)
            .join(' | ');
        const extraCount = result.failures.length > 5 ? ` (+${result.failures.length - 5} more)` : '';
        parts.push(`CDP rejected ${result.failures.length} cookie(s): ${failedCookies}${extraCount}`);
    }

    return parts.join('\n');
}
function formatBytes(bytes) { if (!+bytes) return '0 B'; const i = Math.floor(Math.log(bytes) / Math.log(1024)); return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${['B','KB','MB','GB'][i]}`; }
function formatUptime(s) { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return `${h}h ${m}m`; }
function escapeHtml(t) { return t ? String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; }
function escapeAttr(t) { return escapeHtml(t).replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

// Compact elapsed-time formatter for instance uptime ("on for how long").
function formatUptimeFrom(startedAt) {
    if (!startedAt) return '—';
    const start = new Date(startedAt.includes('T') ? startedAt : startedAt.replace(' ', 'T') + 'Z');
    let secs = Math.floor((Date.now() - start.getTime()) / 1000);
    if (!Number.isFinite(secs) || secs < 0) secs = 0;
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// Tick uptime chips every second without re-rendering the whole list.
setInterval(() => {
    document.querySelectorAll('.uptime[data-started-at]').forEach((el) => {
        const startedAt = el.getAttribute('data-started-at');
        if (!startedAt) return;
        el.innerHTML = `<i class="bi bi-clock-history"></i> ${formatUptimeFrom(startedAt)}`;
    });
}, 1000);
