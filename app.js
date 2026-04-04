// ============================================================
// KLT AMC SERVICE MANAGEMENT - Main Application
// ============================================================

// ---- App State ----
const State = {
    currentUser: null,
    currentView: null,
    currentRole: null, // 'admin' | 'engineer'
    ticketFilter: 'all',
    ticketSearch: '',
};

// ---- Toast ----
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    t.textContent = (icons[type] || '') + ' ' + msg;
    t.className = 'toast show';
    clearTimeout(t._tmr);
    t._tmr = setTimeout(() => t.className = 'toast', 3000);
}

// ---- Avatar initials ----
function avatarInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

// ---- Badge HTML ----
function statusBadge(status) {
    const map = {
        'open': 'badge-open',
        'assigned': 'badge-assigned',
        'in-progress': 'badge-in-progress',
        'completed': 'badge-completed',
        'cancelled': 'badge-cancelled',
    };
    return `<span class="badge ${map[status] || ''}">${status.replace('-', ' ')}</span>`;
}

function priorityBadge(priority) {
    return `<span class="badge badge-${priority}">${priority}</span>`;
}

function amcStatusBadge(status) {
    return `<span class="badge badge-${status}">${status}</span>`;
}

// ---- Render Root ----
function renderRoot(html) {
    document.getElementById('root').innerHTML = html;
}

// ============================================================
// LOGIN SCREEN
// ============================================================
function renderLogin(firebaseMode = false) {
    window._firebaseMode = firebaseMode;
    renderRoot(`
        <div class="login-screen">
            <div class="login-bg-glow glow-1"></div>
            <div class="login-bg-glow glow-2"></div>
            <div class="login-card">
                <div class="login-logo">
                    <h1>KLT Service</h1>
                    <p>Diamond Machinery AMC Management</p>
                </div>
                <div class="role-selector" id="role-selector">
                    <button class="role-btn active" data-role="admin" id="role-admin" onclick="selectRole('admin')">
                        <ion-icon name="shield-checkmark"></ion-icon>
                        Admin
                    </button>
                    <button class="role-btn" data-role="engineer" id="role-engineer" onclick="selectRole('engineer')">
                        <ion-icon name="construct"></ion-icon>
                        Engineer
                    </button>
                </div>
                <div class="form-group">
                    <label>Email / Mobile</label>
                    <input class="form-control" id="login-email" type="text" placeholder="Enter email or mobile" autocomplete="username">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input class="form-control" id="login-password" type="password" placeholder="Enter password" autocomplete="current-password">
                </div>
                <div id="login-hint" style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;padding:10px 14px;background:rgba(108,92,231,0.06);border-radius:var(--radius-md);border:1px solid var(--border-color);">
                    <strong style="color:var(--primary-light);">Admin Demo:</strong> admin@klt.com / admin123
                </div>
                <button class="btn btn-primary btn-block" onclick="doLogin()">
                    <ion-icon name="log-in-outline"></ion-icon> Sign In
                </button>
            </div>
        </div>
    `);
    // Pre-fill
    document.getElementById('login-email').value = 'admin@klt.com';
    document.getElementById('login-password').value = 'admin123';
}

function selectRole(role) {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('role-' + role).classList.add('active');
    const hint = document.getElementById('login-hint');
    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    if (role === 'admin') {
        hint.innerHTML = '<strong style="color:var(--primary-light);">Admin Demo:</strong> admin@klt.com / admin123';
        emailEl.value = 'admin@klt.com'; passEl.value = 'admin123';
    } else {
        hint.innerHTML = '<strong style="color:var(--primary-light);">Engineer Demo:</strong> vipul@klt.com / eng123';
        emailEl.value = 'vipul@klt.com'; passEl.value = 'eng123';
    }
}

async function checkAndCreateAMCTickets() {
    try {
        const [amcs, tickets] = await Promise.all([
            dbGetAll(STORES.amcContracts),
            dbGetAll(STORES.tickets)
        ]);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // ignore time of day for date comparison
        
        for (const amc of amcs) {
            const endDate = new Date(amc.endDate);
            if (endDate < today) {
                if (amc.status !== 'expired') {
                    amc.status = 'expired';
                    await dbAdd(STORES.amcContracts, amc);
                }
                
                const hasTicket = tickets.some(t => 
                    t.machineId === amc.machineId && 
                    t.ticketType === 'amc-renewal' &&
                    (t.status === 'open' || t.status === 'assigned' || t.status === 'in-progress')
                );
                
                if (!hasTicket) {
                    const newTicket = {
                        id: generateId('TKT'),
                        customerId: amc.customerId, 
                        machineId: amc.machineId, 
                        title: 'AMC Contract Expired', 
                        description: `The AMC contract (${amc.id}) for this machine expired on ${formatDate(amc.endDate)}. Please follow up with the customer for renewal.`,
                        priority: 'high', 
                        status: 'open', 
                        assignedTo: null, 
                        notes: [], 
                        photos: [], 
                        rating: null, 
                        feedback: '',
                        ticketType: 'amc-renewal',
                        createdAt: new Date().toISOString(), 
                        updatedAt: new Date().toISOString(),
                    };
                    await dbAdd(STORES.tickets, newTicket);
                    tickets.push(newTicket);
                }
            }
        }
    } catch (e) {
        console.error("AMC Check Error:", e);
    }
}

async function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    if (!email || !pass) return showToast('Please enter credentials', 'warning');

    // Show loading state
    const btn = document.querySelector('.login-card .btn-primary');
    if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }

    let authOk = true;

    // Firebase Auth check (when online)
    if (window._firebaseMode && window.__fbAuthLogin) {
        authOk = await window.__fbAuthLogin(email, pass);
        if (!authOk) {
            if (btn) { btn.innerHTML = '<ion-icon name="log-in-outline"></ion-icon> Sign In'; btn.disabled = false; }
            return showToast('Invalid Firebase credentials', 'error');
        }
    }

    // Always verify from local/Firestore user store
    const users = await dbGetAll(STORES.users);
    const user = users.find(u =>
        (u.email === email || u.mobile === email) && u.password === pass
    );

    if (btn) { btn.innerHTML = '<ion-icon name="log-in-outline"></ion-icon> Sign In'; btn.disabled = false; }

    if (!user) return showToast('Invalid credentials', 'error');
    if (user.status === 'inactive') return showToast('Account is inactive. Contact admin.', 'error');

    State.currentUser = user;
    State.currentRole = user.role;
    showToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
    
    // Auto-create tickets for expired AMCs
    await checkAndCreateAMCTickets();
    
    renderAppShell();
}

// ============================================================
// APP SHELL
// ============================================================
function renderAppShell() {
    const u = State.currentUser;
    const isAdmin = u.role === 'admin';
    const initials = avatarInitials(u.name);

    const adminNavLinks = `
        <div class="nav-section">Main</div>
        <button class="nav-link active" onclick="navTo('dashboard')" id="nav-dashboard">
            <ion-icon name="grid-outline"></ion-icon> Dashboard
        </button>
        <button class="nav-link" onclick="navTo('tickets')" id="nav-tickets">
            <ion-icon name="ticket-outline"></ion-icon> Service Tickets
            <span class="nav-badge" id="badge-open">0</span>
        </button>
        <div class="nav-section">Management</div>
        <button class="nav-link" onclick="navTo('engineers')" id="nav-engineers">
            <ion-icon name="people-outline"></ion-icon> Engineers
        </button>
        <button class="nav-link" onclick="navTo('customers')" id="nav-customers">
            <ion-icon name="business-outline"></ion-icon> Customers
        </button>
        <button class="nav-link" onclick="navTo('machines')" id="nav-machines">
            <ion-icon name="hardware-chip-outline"></ion-icon> Machines
        </button>
        <button class="nav-link" onclick="navTo('amc')" id="nav-amc">
            <ion-icon name="document-text-outline"></ion-icon> AMC Contracts
        </button>
        <div class="nav-section">Insights</div>
        <button class="nav-link" onclick="navTo('reports')" id="nav-reports">
            <ion-icon name="stats-chart-outline"></ion-icon> Reports
        </button>
    `;

    const engNavLinks = `
        <div class="nav-section">My Work</div>
        <button class="nav-link active" onclick="navTo('eng-dashboard')" id="nav-eng-dashboard">
            <ion-icon name="home-outline"></ion-icon> Dashboard
        </button>
        <button class="nav-link" onclick="navTo('eng-tickets')" id="nav-eng-tickets">
            <ion-icon name="list-outline"></ion-icon> My Tickets
        </button>
        <button class="nav-link" onclick="navTo('eng-open')" id="nav-eng-open">
            <ion-icon name="search-outline"></ion-icon> Open Pool
        </button>
        <button class="nav-link" onclick="navTo('eng-reports')" id="nav-eng-reports">
            <ion-icon name="document-outline"></ion-icon> Work Reports
        </button>
    `;

    document.getElementById('root').innerHTML = `
        <div class="app-shell ${isAdmin ? '' : 'engineer-mode'}" id="app-shell">
            <!-- Mobile Sidebar Overlay -->
            <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>

            <!-- Sidebar -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-logo">
                    <h2>KLT Service</h2>
                    <span>AMC Management</span>
                </div>
                <nav class="sidebar-nav">
                    ${isAdmin ? adminNavLinks : engNavLinks}
                </nav>
                <div class="sidebar-user">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-info">
                        <div class="user-name">${u.name}</div>
                        <div class="user-role">${u.role}</div>
                    </div>
                    <button class="logout-btn" onclick="doLogout()" title="Logout">
                        <ion-icon name="log-out-outline"></ion-icon>
                    </button>
                </div>
            </aside>

            <!-- Main Area -->
            <div class="main-area">
                <header class="top-bar">
                    <div class="d-flex align-center gap-12">
                        <button class="hamburger-btn" onclick="toggleSidebar()">
                            <ion-icon name="menu"></ion-icon>
                        </button>
                        <span class="page-title" id="page-title">Dashboard</span>
                    </div>
                    <div class="top-bar-actions">
                        <button class="btn-icon" onclick="navTo('${isAdmin ? 'tickets' : 'eng-tickets'}')" title="New Ticket">
                            <ion-icon name="add-circle-outline" style="font-size:1.4rem"></ion-icon>
                        </button>
                        <div class="avatar" style="cursor:default" title="${u.name}">${initials}</div>
                    </div>
                </header>

                <!-- Page Content -->
                <div class="content-scroll" id="page-content">
                    <div class="loading-screen"><div class="spinner"></div></div>
                </div>

                <!-- Engineer Bottom Nav (mobile) -->
                <div class="bottom-nav-wrapper">
                    <nav class="bottom-nav" id="bottom-nav">
                        <button class="bnav-item active" onclick="navTo('eng-dashboard')" id="bnav-eng-dashboard">
                            <ion-icon name="home"></ion-icon><span>Home</span>
                        </button>
                        <button class="bnav-item" onclick="navTo('eng-tickets')" id="bnav-eng-tickets">
                            <ion-icon name="list"></ion-icon><span>My Tickets</span>
                        </button>
                        <button class="bnav-item" onclick="navTo('eng-open')" id="bnav-eng-open">
                            <ion-icon name="search"></ion-icon><span>Open Pool</span>
                        </button>
                        <button class="bnav-item" onclick="navTo('eng-reports')" id="bnav-eng-reports">
                            <ion-icon name="document-text"></ion-icon><span>Reports</span>
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    `;

    // Navigate to default view
    navTo(isAdmin ? 'dashboard' : 'eng-dashboard');
    updateOpenBadge();
}

function toggleSidebar() {
    const s = document.getElementById('sidebar');
    const o = document.getElementById('sidebar-overlay');
    if (!s) return;
    s.classList.toggle('mobile-open');
    o.classList.toggle('show');
}
function closeSidebar() {
    const s = document.getElementById('sidebar');
    const o = document.getElementById('sidebar-overlay');
    if (s) s.classList.remove('mobile-open');
    if (o) o.classList.remove('show');
}

function navTo(view) {
    State.currentView = view;
    closeSidebar();

    // Update nav active state
    document.querySelectorAll('.nav-link, .bnav-item').forEach(l => l.classList.remove('active'));
    const navEl = document.getElementById('nav-' + view) || document.getElementById('bnav-' + view);
    if (navEl) navEl.classList.add('active');

    // Page titles
    const titles = {
        'dashboard': 'Dashboard', 'tickets': 'Service Tickets', 'engineers': 'Engineers',
        'customers': 'Customers', 'machines': 'Machines', 'amc': 'AMC Contracts',
        'reports': 'Reports & Analytics', 'eng-dashboard': 'My Dashboard',
        'eng-tickets': 'My Tickets', 'eng-open': 'Open Ticket Pool',
        'eng-reports': 'Work Reports',
    };
    const pt = document.getElementById('page-title');
    if (pt) pt.textContent = titles[view] || 'KLT Service';

    // Route
    const routes = {
        'dashboard': renderAdminDashboard, 'tickets': renderTicketsView,
        'engineers': renderEngineers, 'customers': renderCustomers,
        'machines': renderMachines, 'amc': renderAMC, 'reports': renderReports,
        'eng-dashboard': renderEngDashboard, 'eng-tickets': renderEngTickets,
        'eng-open': renderEngOpenPool, 'eng-reports': renderEngReports,
    };

    const fn = routes[view];
    if (fn) fn();
}

function doLogout() {
    State.currentUser = null;
    State.currentRole = null;
    renderLogin();
}

async function updateOpenBadge() {
    const tickets = await dbGetAll(STORES.tickets);
    const open = tickets.filter(t => t.status === 'open').length;
    const badge = document.getElementById('badge-open');
    if (badge) badge.textContent = open > 0 ? open : '';
    if (badge) badge.style.display = open > 0 ? '' : 'none';
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
async function renderAdminDashboard() {
    const page = document.getElementById('page-content');
    page.innerHTML = '<div class="loading-screen"><div class="spinner"></div></div>';

    const [tickets, engineers, customers, amcs] = await Promise.all([
        dbGetAll(STORES.tickets),
        dbGetAll(STORES.users),
        dbGetAll(STORES.customers),
        dbGetAll(STORES.amcContracts),
    ]);

    const engs = engineers.filter(u => u.role === 'engineer');
    const openTkts = tickets.filter(t => t.status === 'open').length;
    const inProg = tickets.filter(t => t.status === 'in-progress').length;
    const done = tickets.filter(t => t.status === 'completed').length;
    const expiringAMC = amcs.filter(a => a.status === 'expiring' || a.status === 'expired').length;
    const recent = [...tickets].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    // Build customer/machine lookup
    const custMap = {};
    customers.forEach(c => custMap[c.id] = c.name);

    page.innerHTML = `
        <div class="fade-in">
            ${expiringAMC > 0 ? `
                <div class="alert-banner warning">
                    <ion-icon name="warning-outline"></ion-icon>
                    <span><strong>${expiringAMC} AMC contract(s)</strong> are expiring or expired. <button class="btn btn-sm btn-secondary" onclick="navTo('amc')" style="margin-left:8px">View AMCs</button></span>
                </div>
            ` : ''}
            <div class="stats-grid stagger-children">
                <div class="stat-card">
                    <div class="stat-icon danger"><ion-icon name="alert-circle"></ion-icon></div>
                    <div><span class="stat-value">${openTkts}</span><span class="stat-label">Open Tickets</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning"><ion-icon name="time-outline"></ion-icon></div>
                    <div><span class="stat-value">${inProg}</span><span class="stat-label">In Progress</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success"><ion-icon name="checkmark-done"></ion-icon></div>
                    <div><span class="stat-value">${done}</span><span class="stat-label">Completed</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon primary"><ion-icon name="people"></ion-icon></div>
                    <div><span class="stat-value">${engs.length}</span><span class="stat-label">Engineers</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info"><ion-icon name="business"></ion-icon></div>
                    <div><span class="stat-value">${customers.length}</span><span class="stat-label">Customers</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon ${expiringAMC > 0 ? 'warning' : 'success'}"><ion-icon name="document-text"></ion-icon></div>
                    <div><span class="stat-value">${amcs.length}</span><span class="stat-label">AMC Contracts</span></div>
                </div>
            </div>

            <div class="section-header">
                <span class="section-title">Recent Service Tickets</span>
                <button class="btn btn-sm btn-secondary" onclick="navTo('tickets')">View All</button>
            </div>

            <div class="ticket-cards stagger-children">
                ${recent.length === 0 ? '<div class="empty-state"><ion-icon name="checkmark-circle-outline"></ion-icon><h3>All clear!</h3><p>No service tickets yet.</p></div>' :
                    recent.map(t => renderTicketCard(t, custMap, engineers)).join('')}
            </div>
        </div>
    `;
}

function renderTicketCard(t, custMap, engList) {
    const custName = custMap[t.customerId] || t.customerId;
    const assignee = t.assignedTo ? (engList.find(e => e.id === t.assignedTo) || {name: t.assignedTo}) : null;
    return `
        <div class="ticket-card priority-${t.priority}" onclick="openTicketDetail('${t.id}')">
            <div class="tc-header">
                <span class="tc-id">${t.id}</span>
                ${statusBadge(t.status)}
            </div>
            <div class="tc-title">${t.title}</div>
            <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:4px">
                <ion-icon name="business-outline" style="vertical-align:middle"></ion-icon>
                ${custName} &bull; ${t.machineId}
            </div>
            ${t.ticketType === 'amc-renewal' ? `
            <div class="alert-banner danger" style="margin:6px 0;padding:6px 10px;font-size:0.75rem;display:flex;align-items:center;gap:6px;">
                <ion-icon name="warning-outline" style="font-size:1rem;flex-shrink:0"></ion-icon>
                <span><strong>AMC Expired Alert</strong> - Requires Renewal</span>
            </div>
            ` : ''}
            <div class="tc-meta">
                <span>${priorityBadge(t.priority)}</span>
                <div class="tc-assignee">
                    ${assignee
                        ? `<div class="avatar sm">${avatarInitials(assignee.name)}</div><span>${assignee.name}</span>`
                        : `<span style="color:var(--text-muted)">Unassigned</span>`}
                </div>
                <span style="font-size:0.72rem;color:var(--text-muted)">${timeAgo(t.createdAt)}</span>
            </div>
        </div>
    `;
}

// ============================================================
// TICKETS VIEW (Admin)
// ============================================================
async function renderTicketsView() {
    const page = document.getElementById('page-content');
    const [tickets, customers, engineers] = await Promise.all([
        dbGetAll(STORES.tickets),
        dbGetAll(STORES.customers),
        dbGetAll(STORES.users),
    ]);
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);

    page.innerHTML = `
        <div class="fade-in">
            <div class="d-flex align-center justify-between mb-16 flex-wrap gap-8">
                <div class="search-bar" style="flex:1;min-width:200px">
                    <ion-icon name="search"></ion-icon>
                    <input id="ticket-search" placeholder="Search tickets..." oninput="filterTickets()" value="${State.ticketSearch}">
                </div>
                <button class="btn btn-primary btn-sm" onclick="openCreateTicketModal()">
                    <ion-icon name="add"></ion-icon> New Ticket
                </button>
            </div>
            <div class="chip-filters mb-16" id="ticket-filters">
                ${['all','open','assigned','in-progress','completed','cancelled'].map(s =>
                    `<div class="chip ${State.ticketFilter === s ? 'active' : ''}" onclick="setTicketFilter('${s}')">${s.replace('-',' ') || 'All'}</div>`
                ).join('')}
            </div>
            <div id="ticket-list-container"></div>
        </div>
    `;

    window._ticketsData = tickets;
    window._engineersData = engineers;
    window._custMap = custMap;

    renderFilteredTickets();
}

function setTicketFilter(f) {
    State.ticketFilter = f;
    document.querySelectorAll('#ticket-filters .chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    renderFilteredTickets();
}

function filterTickets() {
    State.ticketSearch = document.getElementById('ticket-search').value.toLowerCase();
    renderFilteredTickets();
}

function renderFilteredTickets() {
    const container = document.getElementById('ticket-list-container');
    if (!container) return;
    let data = window._ticketsData || [];
    if (State.ticketFilter !== 'all') data = data.filter(t => t.status === State.ticketFilter);
    if (State.ticketSearch) data = data.filter(t =>
        t.id.toLowerCase().includes(State.ticketSearch) ||
        t.title.toLowerCase().includes(State.ticketSearch) ||
        (window._custMap[t.customerId] || '').toLowerCase().includes(State.ticketSearch)
    );
    data = [...data].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (data.length === 0) {
        container.innerHTML = `<div class="empty-state"><ion-icon name="search-outline"></ion-icon><h3>No tickets found</h3><p>Try changing your filter or search.</p></div>`;
        return;
    }
    container.innerHTML = `<div class="ticket-cards stagger-children">${data.map(t => renderTicketCard(t, window._custMap, window._engineersData)).join('')}</div>`;
}

// ============================================================
// TICKET DETAIL MODAL
// ============================================================
async function openTicketDetail(ticketId) {
    const [ticket, customers, machines, engineers] = await Promise.all([
        dbGet(STORES.tickets, ticketId),
        dbGetAll(STORES.customers),
        dbGetAll(STORES.machines),
        dbGetAll(STORES.users),
    ]);
    if (!ticket) return showToast('Ticket not found', 'error');

    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);
    const machMap = {}; machines.forEach(m => machMap[m.id] = m);
    const engMap = {}; engineers.forEach(e => engMap[e.id] = e);

    const cust = custMap[ticket.customerId] || ticket.customerId;
    const mach = machMap[ticket.machineId];
    const assignee = ticket.assignedTo ? engMap[ticket.assignedTo] : null;
    const statusNext = { open: 'assigned', assigned: 'in-progress', 'in-progress': 'completed' };
    const isAdmin = State.currentRole === 'admin';

    const engineerOptions = engineers.filter(e => e.role === 'engineer' && e.status === 'active')
        .map(e => `<option value="${e.id}" ${ticket.assignedTo === e.id ? 'selected' : ''}>${e.name}</option>`)
        .join('');

    const notesHtml = (ticket.notes || []).length === 0
        ? '<p class="text-muted fs-sm">No notes yet.</p>'
        : ticket.notes.map(n => `
            <div class="note-item">
                <div class="note-header">
                    <span class="note-by">${(engMap[n.by] || {name: n.by}).name}</span>
                    <span class="note-time">${timeAgo(n.at)}</span>
                </div>
                <div class="note-text">${n.text}</div>
            </div>`).join('');

    openModal('ticket-modal', `Ticket: ${ticket.id}`, `
        <div class="detail-grid mb-24">
            <div class="detail-section"><div class="detail-label">Customer</div><div class="detail-value fw-600">${cust}</div></div>
            <div class="detail-section"><div class="detail-label">Machine</div><div class="detail-value">${ticket.machineId}${mach ? ' — ' + mach.machineType : ''}</div></div>
            <div class="detail-section"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(ticket.status)}</div></div>
            <div class="detail-section"><div class="detail-label">Priority</div><div class="detail-value">${priorityBadge(ticket.priority)}</div></div>
            <div class="detail-section"><div class="detail-label">Reported</div><div class="detail-value">${formatDate(ticket.createdAt)}</div></div>
            <div class="detail-section"><div class="detail-label">Assigned To</div><div class="detail-value">${assignee ? assignee.name : '<span class="text-muted">Unassigned</span>'}</div></div>
        </div>
        <div class="detail-section mb-24">
            <div class="detail-label">Description</div>
            <div class="detail-value" style="line-height:1.7">${ticket.description}</div>
        </div>

        ${isAdmin ? `
        <div class="detail-section mb-24">
            <div class="detail-label">Assign Engineer</div>
            <div class="d-flex gap-8 align-center mt-8 flex-wrap">
                <select class="form-control" id="assign-eng-select" style="flex:1;min-width:160px">
                    <option value="">— Select Engineer —</option>
                    ${engineerOptions}
                </select>
                <button class="btn btn-primary btn-sm" onclick="assignEngineer('${ticket.id}')">Assign</button>
            </div>
        </div>
        ` : ''}

        ${ticket.status !== 'completed' && ticket.status !== 'cancelled' && statusNext[ticket.status] ? `
        <div class="d-flex gap-8 mb-24 flex-wrap">
            <button class="btn btn-success btn-sm" onclick="advanceTicketStatus('${ticket.id}')">
                <ion-icon name="arrow-forward-circle-outline"></ion-icon>
                Move to: ${statusNext[ticket.status]}
            </button>
            ${ticket.status !== 'cancelled' ? `<button class="btn btn-danger btn-sm" onclick="cancelTicket('${ticket.id}')">Cancel Ticket</button>` : ''}
        </div>
        ` : ''}

        <div class="detail-section mb-16">
            <div class="detail-label">Notes & Updates</div>
            <div class="notes-timeline mt-8">${notesHtml}</div>
        </div>

        <div class="d-flex gap-8 mt-16">
            <input class="form-control" id="new-note-input" placeholder="Add a note or update...">
            <button class="btn btn-secondary btn-sm" onclick="addNote('${ticket.id}')">Add</button>
        </div>

        ${ticket.status === 'completed' && isAdmin ? `
        <div class="detail-section mt-24">
            <div class="detail-label">Customer Feedback</div>
            <div class="star-rating mt-8" id="star-rating-${ticket.id}">
                ${[1,2,3,4,5].map(n => `<span class="star ${(ticket.rating||0) >= n ? 'filled' : ''}" onclick="setRating('${ticket.id}', ${n})">★</span>`).join('')}
            </div>
            <textarea class="form-control mt-8" id="feedback-text" placeholder="Customer comment...">${ticket.feedback || ''}</textarea>
            <button class="btn btn-secondary btn-sm mt-8" onclick="saveFeedback('${ticket.id}')">Save Feedback</button>
        </div>
        ` : ticket.rating ? `<div class="detail-section mt-16"><div class="detail-label">Customer Rating</div><div style="color:var(--warning);font-size:1.2rem">${'★'.repeat(ticket.rating)}${'☆'.repeat(5-ticket.rating)}</div></div>` : ''}
    `);
}

async function assignEngineer(ticketId) {
    const sel = document.getElementById('assign-eng-select');
    if (!sel || !sel.value) return showToast('Select an engineer first', 'warning');
    const ticket = await dbGet(STORES.tickets, ticketId);
    if (!ticket) return;
    ticket.assignedTo = sel.value;
    if (ticket.status === 'open') ticket.status = 'assigned';
    ticket.updatedAt = new Date().toISOString();
    await dbAdd(STORES.tickets, ticket);
    closeModal();
    showToast('Engineer assigned successfully', 'success');
    updateOpenBadge();
    if (State.currentView === 'tickets') renderTicketsView();
    else renderAdminDashboard();
}

async function advanceTicketStatus(ticketId) {
    const ticket = await dbGet(STORES.tickets, ticketId);
    if (!ticket) return;
    const next = { open: 'assigned', assigned: 'in-progress', 'in-progress': 'completed' };
    if (next[ticket.status]) {
        ticket.status = next[ticket.status];
        ticket.updatedAt = new Date().toISOString();
        await dbAdd(STORES.tickets, ticket);
        closeModal();
        showToast(`Ticket status → ${ticket.status}`, 'success');
        updateOpenBadge();
        if (State.currentView === 'tickets') renderTicketsView();
        else renderAdminDashboard();
    }
}

async function cancelTicket(ticketId) {
    const ticket = await dbGet(STORES.tickets, ticketId);
    if (!ticket) return;
    ticket.status = 'cancelled';
    ticket.updatedAt = new Date().toISOString();
    await dbAdd(STORES.tickets, ticket);
    closeModal();
    showToast('Ticket cancelled', 'info');
    updateOpenBadge();
    if (State.currentView === 'tickets') renderTicketsView();
}

async function addNote(ticketId) {
    const input = document.getElementById('new-note-input');
    if (!input || !input.value.trim()) return showToast('Enter a note', 'warning');
    const ticket = await dbGet(STORES.tickets, ticketId);
    if (!ticket) return;
    if (!ticket.notes) ticket.notes = [];
    ticket.notes.push({ by: State.currentUser.id, text: input.value.trim(), at: new Date().toISOString() });
    ticket.updatedAt = new Date().toISOString();
    await dbAdd(STORES.tickets, ticket);
    showToast('Note added', 'success');
    closeModal();
    openTicketDetail(ticketId);
}

function setRating(ticketId, rating) {
    document.querySelectorAll(`#star-rating-${ticketId} .star`).forEach((s, i) => {
        s.classList.toggle('filled', i < rating);
    });
    window._pendingRating = rating;
}

async function saveFeedback(ticketId) {
    const ticket = await dbGet(STORES.tickets, ticketId);
    if (!ticket) return;
    ticket.rating = window._pendingRating || ticket.rating;
    ticket.feedback = document.getElementById('feedback-text')?.value || '';
    await dbAdd(STORES.tickets, ticket);
    showToast('Feedback saved', 'success');
    closeModal();
}

// ============================================================
// CREATE TICKET MODAL
// ============================================================
async function openCreateTicketModal() {
    const [customers, machines, engineers] = await Promise.all([
        dbGetAll(STORES.customers),
        dbGetAll(STORES.machines),
        dbGetAll(STORES.users),
    ]);

    openModal('create-ticket-modal', 'Create Service Ticket', `
        <div class="form-group">
            <label>Customer</label>
            <select class="form-control" id="ct-customer" onchange="loadMachinesForCustomer()">
                <option value="">— Select Customer —</option>
                ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Machine</label>
            <select class="form-control" id="ct-machine">
                <option value="">— Select Machine —</option>
            </select>
        </div>
        <div class="form-group">
            <label>Issue Title</label>
            <input class="form-control" id="ct-title" placeholder="Short description of the problem">
        </div>
        <div class="form-group">
            <label>Detailed Description</label>
            <textarea class="form-control" id="ct-desc" rows="3" placeholder="Describe the issue, error codes, observations..."></textarea>
        </div>
        <div class="form-group">
            <label>Priority</label>
            <select class="form-control" id="ct-priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
            </select>
        </div>
        <div class="form-group">
            <label>Assign Engineer (Optional)</label>
            <select class="form-control" id="ct-engineer">
                <option value="">— Leave Unassigned —</option>
                ${engineers.filter(e => e.role === 'engineer' && e.status === 'active')
                    .map(e => `<option value="${e.id}">${e.name} (${e.area})</option>`).join('')}
            </select>
        </div>
    `, async () => {
        const custId = document.getElementById('ct-customer').value;
        const machId = document.getElementById('ct-machine').value;
        const title = document.getElementById('ct-title').value.trim();
        const desc = document.getElementById('ct-desc').value.trim();
        const priority = document.getElementById('ct-priority').value;
        const engId = document.getElementById('ct-engineer').value;

        if (!custId || !machId || !title) return showToast('Fill all required fields', 'warning');

        const newTicket = {
            id: 'TKT-' + Date.now().toString().slice(-6),
            customerId: custId, machineId: machId, title, description: desc || title,
            priority, status: engId ? 'assigned' : 'open',
            assignedTo: engId || null, notes: [], photos: [], rating: null, feedback: '',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await dbAdd(STORES.tickets, newTicket);
        closeModal();
        showToast('Ticket created: ' + newTicket.id, 'success');
        updateOpenBadge();
        renderTicketsView();
    });

    window._allMachines = machines;
}

async function loadMachinesForCustomer() {
    const custId = document.getElementById('ct-customer').value;
    const machSel = document.getElementById('ct-machine');
    if (!machSel) return;
    const machines = window._allMachines || await dbGetAll(STORES.machines);
    const filtered = machines.filter(m => m.customerId === custId);
    machSel.innerHTML = `<option value="">— Select Machine —</option>` +
        filtered.map(m => `<option value="${m.id}">${m.id} — ${m.machineType}</option>`).join('');
}

// ============================================================
// ENGINEERS
// ============================================================
async function renderEngineers() {
    const page = document.getElementById('page-content');
    const users = await dbGetAll(STORES.users);
    const engineers = users.filter(u => u.role === 'engineer');

    page.innerHTML = `
        <div class="fade-in">
            <div class="section-header mb-16">
                <span class="section-title">Service Engineers</span>
                <button class="btn btn-primary btn-sm" onclick="openEngineerModal()">
                    <ion-icon name="add"></ion-icon> Add Engineer
                </button>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead><tr>
                        <th>Engineer</th><th>Mobile</th><th>Skill</th><th>Area</th><th>Status</th><th>Actions</th>
                    </tr></thead>
                    <tbody>
                        ${engineers.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">No engineers added yet.</td></tr>` :
                            engineers.map(e => `
                            <tr>
                                <td>
                                    <div class="d-flex align-center gap-12">
                                        <div class="avatar">${avatarInitials(e.name)}</div>
                                        <div>
                                            <div class="fw-600">${e.name}</div>
                                            <div class="fs-xs text-muted">${e.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${e.mobile}</td>
                                <td>${e.skill || '—'}</td>
                                <td>${e.area || '—'}</td>
                                <td><span class="badge badge-${e.status}">${e.status}</span></td>
                                <td>
                                    <div class="d-flex gap-8">
                                        <button class="btn btn-sm btn-secondary" onclick="openEngineerModal('${e.id}')">Edit</button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteEngineer('${e.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function openEngineerModal(engId = null) {
    const eng = engId ? await dbGet(STORES.users, engId) : null;
    openModal('eng-modal', eng ? 'Edit Engineer' : 'Add Engineer', `
        <div class="form-group"><label>Full Name</label><input class="form-control" id="eng-name" value="${eng ? eng.name : ''}" placeholder="e.g. Raj Patel"></div>
        <div class="form-group"><label>Mobile</label><input class="form-control" id="eng-mobile" value="${eng ? eng.mobile : ''}" placeholder="10-digit mobile"></div>
        <div class="form-group"><label>Email</label><input class="form-control" id="eng-email" value="${eng ? eng.email : ''}" placeholder="engineer@klt.com"></div>
        <div class="form-group"><label>Password</label><input class="form-control" id="eng-pass" value="${eng ? eng.password : ''}" placeholder="Login password"></div>
        <div class="form-group"><label>Skill / Specialization</label><input class="form-control" id="eng-skill" value="${eng ? eng.skill : ''}" placeholder="e.g. Z-Axis Expert"></div>
        <div class="form-group"><label>Area / City</label><input class="form-control" id="eng-area" value="${eng ? eng.area : ''}" placeholder="e.g. Surat"></div>
        <div class="form-group"><label>Status</label>
            <select class="form-control" id="eng-status">
                <option value="active" ${!eng || eng.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="inactive" ${eng && eng.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
        </div>
    `, async () => {
        const name = document.getElementById('eng-name').value.trim();
        const mobile = document.getElementById('eng-mobile').value.trim();
        const email = document.getElementById('eng-email').value.trim();
        const pass = document.getElementById('eng-pass').value.trim();
        if (!name || !mobile || !email) return showToast('Name, mobile, email are required', 'warning');

        const data = {
            id: eng ? eng.id : generateId('USR'),
            name, mobile, email,
            password: pass || (eng ? eng.password : 'eng123'),
            role: 'engineer',
            skill: document.getElementById('eng-skill').value.trim(),
            area: document.getElementById('eng-area').value.trim(),
            status: document.getElementById('eng-status').value,
            createdAt: eng ? eng.createdAt : new Date().toISOString(),
        };
        await dbAdd(STORES.users, data);
        closeModal();
        showToast(eng ? 'Engineer updated' : 'Engineer added', 'success');
        renderEngineers();
    });
}

async function deleteEngineer(id) {
    if (!confirm('Delete this engineer? This cannot be undone.')) return;
    await dbDelete(STORES.users, id);
    showToast('Engineer deleted', 'info');
    renderEngineers();
}

// ============================================================
// CUSTOMERS
// ============================================================
async function renderCustomers() {
    const page = document.getElementById('page-content');
    const customers = await dbGetAll(STORES.customers);

    page.innerHTML = `
        <div class="fade-in">
            <div class="section-header mb-16">
                <span class="section-title">Customers / Parties</span>
                <button class="btn btn-primary btn-sm" onclick="openCustomerModal()">
                    <ion-icon name="add"></ion-icon> Add Customer
                </button>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>City</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${customers.length === 0 ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">No customers added yet.</td></tr>` :
                            customers.map(c => `<tr>
                                <td><div class="fw-600">${c.name}</div><div class="fs-xs text-muted">${c.id}</div></td>
                                <td>${c.contact}</td>
                                <td>${c.email || '—'}</td>
                                <td>${c.city || '—'}</td>
                                <td><div class="d-flex gap-8">
                                    <button class="btn btn-sm btn-secondary" onclick="openCustomerModal('${c.id}')">Edit</button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c.id}')">Delete</button>
                                </div></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function openCustomerModal(custId = null) {
    const c = custId ? await dbGet(STORES.customers, custId) : null;
    openModal('cust-modal', c ? 'Edit Customer' : 'Add Customer', `
        <div class="form-group"><label>Company / Party Name</label><input class="form-control" id="cust-name" value="${c ? c.name : ''}" placeholder="e.g. Ramesh Masha Enterprises"></div>
        <div class="form-group"><label>Contact Number</label><input class="form-control" id="cust-contact" value="${c ? c.contact : ''}" placeholder="Mobile number"></div>
        <div class="form-group"><label>Email</label><input class="form-control" id="cust-email" value="${c ? c.email : ''}" placeholder="customer@email.com"></div>
        <div class="form-group"><label>Full Address</label><textarea class="form-control" id="cust-address" rows="2">${c ? c.address : ''}</textarea></div>
        <div class="form-group"><label>City</label><input class="form-control" id="cust-city" value="${c ? c.city : ''}" placeholder="e.g. Surat"></div>
    `, async () => {
        const name = document.getElementById('cust-name').value.trim();
        const contact = document.getElementById('cust-contact').value.trim();
        if (!name || !contact) return showToast('Name and contact are required', 'warning');
        const data = {
            id: c ? c.id : generateId('CUS'),
            name, contact,
            email: document.getElementById('cust-email').value.trim(),
            address: document.getElementById('cust-address').value.trim(),
            city: document.getElementById('cust-city').value.trim(),
            createdAt: c ? c.createdAt : new Date().toISOString(),
        };
        await dbAdd(STORES.customers, data);
        closeModal(); showToast(c ? 'Customer updated' : 'Customer added', 'success'); renderCustomers();
    });
}
async function deleteCustomer(id) {
    if (!confirm('Delete this customer?')) return;
    await dbDelete(STORES.customers, id);
    showToast('Customer deleted', 'info'); renderCustomers();
}
