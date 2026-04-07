// ============================================================
// MACHINES VIEW
// ============================================================
async function renderMachines() {
    const page = document.getElementById('page-content');
    const [machines, customers] = await Promise.all([dbGetAll(STORES.machines), dbGetAll(STORES.customers)]);
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);

    page.innerHTML = `
        <div class="fade-in">
            <div class="section-header mb-16">
                <span class="section-title">Machines</span>
                <button class="btn btn-primary btn-sm" onclick="openMachineModal()">
                    <ion-icon name="add"></ion-icon> Add Machine
                </button>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Machine ID</th><th>Type</th><th>Serial No.</th><th>Customer</th><th>Install Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${machines.length === 0
                            ? `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No machines added yet.</td></tr>`
                            : machines.map(m => `<tr>
                                <td><span class="fw-600 text-primary">${m.id}</span></td>
                                <td>${m.machineType}</td>
                                <td><span class="fs-sm text-muted">${m.serialNumber}</span></td>
                                <td>${custMap[m.customerId] || m.customerId}</td>
                                <td>${formatDate(m.installDate)}</td>
                                <td><span class="badge badge-${m.status}">${m.status}</span></td>
                                <td><div class="d-flex gap-8">
                                    <button class="btn btn-sm btn-secondary" onclick="openMachineModal('${m.id}')">Edit</button>
                                    ${State.currentUser.role === 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteMachine('${m.id}')">Delete</button>` : ''}
                                </div></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function openMachineModal(machId = null) {
    const [m, customers, allMachines] = await Promise.all([
        machId ? dbGet(STORES.machines, machId) : Promise.resolve(null),
        dbGetAll(STORES.customers),
        dbGetAll(STORES.machines)
    ]);
    window._allMachinesForId = allMachines;

    // Compute the next auto ID for current year
    function nextMachineId(year) {
        const prefix = String(year);
        const existing = (window._allMachinesForId || []).map(mx => mx.id)
            .filter(id => id && id.startsWith(prefix))
            .map(id => parseInt(id.slice(4), 10))
            .filter(n => !isNaN(n));
        const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
        return prefix + String(next).padStart(3, '0');
    }

    const installYear = m ? new Date(m.installDate || Date.now()).getFullYear() : new Date().getFullYear();
    const autoId = m ? m.id : nextMachineId(installYear);

    openModal('mach-modal', m ? 'Edit Machine' : 'Add Machine', `
        <div class="form-group"><label>Customer</label>
            <select class="form-control" id="mach-cust">
                <option value="">— Select Customer —</option>
                ${customers.map(c => `<option value="${c.id}" ${m && m.customerId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group"><label>Machine Type</label><input class="form-control" id="mach-type" value="${m ? m.machineType : ''}" placeholder="e.g. Z-Axis Cutter Pro"></div>
        <div class="form-group"><label>Serial Number <span style="color:var(--text-muted);font-weight:400">(Optional)</span></label><input class="form-control" id="mach-serial" value="${m ? m.serialNumber : ''}" placeholder="Leave blank if not available"></div>
        <div class="form-group"><label>Machine ID <span style="color:var(--text-muted);font-weight:400">(auto-generated from year)</span></label><input class="form-control" id="mach-id" value="${autoId}" placeholder="e.g. 2026001" ${m ? 'readonly' : ''} style="font-weight:700;color:var(--primary-light)"></div>
        <div class="form-group"><label>Installation Date</label><input class="form-control" id="mach-date" type="date" value="${m ? m.installDate : ''}" ${m ? '' : 'onchange="updateAutoMachineId()"'}></div>
        <div class="form-group"><label>Status</label>
            <select class="form-control" id="mach-status">
                <option value="active" ${!m || m.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="inactive" ${m && m.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                <option value="under-repair" ${m && m.status === 'under-repair' ? 'selected' : ''}>Under Repair</option>
            </select>
        </div>
    `, async () => {
        const custId = document.getElementById('mach-cust').value;
        const type = document.getElementById('mach-type').value.trim();
        const serial = document.getElementById('mach-serial').value.trim();
        const mid = document.getElementById('mach-id').value.trim() || autoId;
        if (!custId || !type) return showToast('Customer and Machine Type are required', 'warning');
        await dbAdd(STORES.machines, {
            id: mid, customerId: custId, machineType: type, serialNumber: serial || null,
            installDate: document.getElementById('mach-date').value,
            status: document.getElementById('mach-status').value,
            createdAt: m ? m.createdAt : new Date().toISOString(),
        });
        closeModal(); showToast(m ? 'Machine updated' : 'Machine added', 'success'); renderMachines();
    });
}

// Update the Machine ID field when install date changes (new machine only)
function updateAutoMachineId() {
    const dateVal = document.getElementById('mach-date')?.value;
    const year = dateVal ? new Date(dateVal).getFullYear() : new Date().getFullYear();
    const prefix = String(year);
    const existing = (window._allMachinesForId || []).map(mx => mx.id)
        .filter(id => id && id.startsWith(prefix))
        .map(id => parseInt(id.slice(4), 10))
        .filter(n => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    const newId = prefix + String(next).padStart(3, '0');
    const inp = document.getElementById('mach-id');
    if (inp && !inp.readOnly) inp.value = newId;
}

async function deleteMachine(id) {
    if (!confirm('Delete this machine?')) return;
    await dbDelete(STORES.machines, id);
    showToast('Machine deleted', 'info'); renderMachines();
}

// ============================================================
// AMC CONTRACTS
// ============================================================
async function renderAMC() {
    const page = document.getElementById('page-content');
    const [amcs, customers, machines] = await Promise.all([
        dbGetAll(STORES.amcContracts), dbGetAll(STORES.customers), dbGetAll(STORES.machines)
    ]);
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);
    const machMap = {}; machines.forEach(m => machMap[m.id] = m.machineType);

    // Check expiry
    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 86400000);

    page.innerHTML = `
        <div class="fade-in">
            <div class="section-header mb-16">
                <span class="section-title">AMC Contracts</span>
                <button class="btn btn-primary btn-sm" onclick="openAMCModal()">
                    <ion-icon name="add"></ion-icon> New AMC
                </button>
            </div>
            <div class="ticket-cards stagger-children">
                ${amcs.length === 0
                    ? `<div class="empty-state"><ion-icon name="document-text-outline"></ion-icon><h3>No AMC contracts</h3><p>Add your first AMC contract to get started.</p></div>`
                    : amcs.map(amc => {
                        const endDate = new Date(amc.endDate);
                        const isExpired = endDate < today;
                        const isExpiring = !isExpired && endDate < thirtyDays;
                        const daysLeft = Math.ceil((endDate - today) / 86400000);
                        const paidAmt = (amc.payments || []).reduce((s, p) => s + Number(p.amount), 0);
                        const paidPct = Math.min(100, Math.round((paidAmt / amc.totalAmount) * 100));
                        const isManager = State.currentUser.role === 'manager';

                        return `
                        <div class="ticket-card priority-${isExpired ? 'critical' : isExpiring ? 'high' : 'low'}" onclick="openAMCDetail('${amc.id}')">
                            <div class="tc-header">
                                <span class="tc-id">${amc.id}</span>
                                ${amcStatusBadge(isExpired ? 'expired' : isExpiring ? 'expiring' : amc.status)}
                            </div>
                            <div class="tc-title">${custMap[amc.customerId] || amc.customerId}</div>
                            <div class="fs-sm text-muted mb-8">${machMap[amc.machineId] || amc.machineId} &bull; ${formatDate(amc.startDate)} → ${formatDate(amc.endDate)}</div>
                            ${isExpired
                                ? `<div class="alert-banner danger" style="margin:0 0 12px;padding:8px 14px"><ion-icon name="warning"></ion-icon><span>Expired ${Math.abs(daysLeft)} days ago</span></div>`
                                : isExpiring
                                ? `<div class="alert-banner warning" style="margin:0 0 12px;padding:8px 14px"><ion-icon name="time-outline"></ion-icon><span>Expires in ${daysLeft} days</span></div>`
                                : ''
                            }
                            ${!isManager ? `
                            <div class="d-flex justify-between align-center fs-sm mb-8">
                                <span class="text-muted">Payment: ${currency(paidAmt)} / ${currency(amc.totalAmount)}</span>
                                <span class="fw-600 ${paidPct === 100 ? 'text-success' : 'text-warning'}">${paidPct}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill ${paidPct === 100 ? 'success' : 'warning'}" style="width:${paidPct}%"></div>
                            </div>` : ''}
                        </div>`;
                    }).join('')}
            </div>
        </div>
    `;
}

async function openAMCDetail(amcId) {
    const [amc, customers, machines] = await Promise.all([
        dbGet(STORES.amcContracts, amcId),
        dbGetAll(STORES.customers), dbGetAll(STORES.machines)
    ]);
    if (!amc) return;
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);
    const machMap = {}; machines.forEach(m => machMap[m.id] = m.machineType);
    const paidAmt = (amc.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const due = amc.totalAmount - paidAmt;

    const isManager = State.currentUser.role === 'manager';

    openModal('amc-detail', `AMC: ${amc.id}`, `
        <div class="detail-grid mb-24">
            <div class="detail-section"><div class="detail-label">Customer</div><div class="detail-value fw-600">${custMap[amc.customerId]}</div></div>
            <div class="detail-section"><div class="detail-label">Machine</div><div class="detail-value">${machMap[amc.machineId]}</div></div>
            <div class="detail-section"><div class="detail-label">Start Date</div><div class="detail-value">${formatDate(amc.startDate)}</div></div>
            <div class="detail-section"><div class="detail-label">End Date</div><div class="detail-value">${formatDate(amc.endDate)}</div></div>
            ${!isManager ? `
            <div class="detail-section"><div class="detail-label">Total Amount</div><div class="detail-value fw-600 text-primary">${currency(amc.totalAmount)}</div></div>
            <div class="detail-section"><div class="detail-label">Payment Terms</div><div class="detail-value">${amcStatusBadge(amc.paymentTerms)}</div></div>
            <div class="detail-section"><div class="detail-label">Paid</div><div class="detail-value text-success fw-600">${currency(paidAmt)}</div></div>
            <div class="detail-section"><div class="detail-label">Balance Due</div><div class="detail-value ${due > 0 ? 'text-danger' : 'text-success'} fw-600">${currency(due)}</div></div>` : ''}
        </div>

        ${!isManager ? `
        <div class="section-header mb-12"><span class="section-title fs-sm">Payment History</span>
            <button class="btn btn-sm btn-primary" onclick="openAddPaymentModal('${amc.id}')">+ Add Payment</button>
        </div>
        <div class="data-table-wrapper">
            <table class="data-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Note</th></tr></thead>
                <tbody>
                    ${(amc.payments || []).length === 0
                        ? `<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px">No payments recorded</td></tr>`
                        : (amc.payments || []).map(p => `<tr>
                            <td>${formatDate(p.date)}</td>
                            <td class="text-success fw-600">${currency(p.amount)}</td>
                            <td class="text-muted">${p.note || '—'}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>` : ''}

        <div class="d-flex gap-8 mt-16 flex-wrap">
            <button class="btn btn-sm btn-secondary" onclick="openAMCModal('${amc.id}')">Edit AMC</button>
            ${!isManager ? `<button class="btn btn-sm btn-danger" onclick="deleteAMC('${amc.id}')">Delete</button>` : ''}
        </div>
    `);
}

function openAddPaymentModal(amcId) {
    openModal('add-payment', 'Add Payment', `
        <div class="form-group"><label>Payment Date</label><input class="form-control" id="pay-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>Amount (₹)</label><input class="form-control" id="pay-amount" type="number" placeholder="e.g. 10000"></div>
        <div class="form-group"><label>Note / Reference</label><input class="form-control" id="pay-note" placeholder="e.g. EMI 4, Cheque No. 1234"></div>
    `, async () => {
        const amount = Number(document.getElementById('pay-amount').value);
        if (!amount || amount <= 0) return showToast('Enter a valid amount', 'warning');
        const amc = await dbGet(STORES.amcContracts, amcId);
        if (!amc) return;
        if (!amc.payments) amc.payments = [];
        amc.payments.push({
            date: document.getElementById('pay-date').value,
            amount, note: document.getElementById('pay-note').value.trim()
        });
        await dbAdd(STORES.amcContracts, amc);
        closeModal();
        showToast('Payment recorded: ' + currency(amount), 'success');
        openAMCDetail(amcId);
    });
}

async function openAMCModal(amcId = null) {
    const [amc, customers, machines] = await Promise.all([
        amcId ? dbGet(STORES.amcContracts, amcId) : Promise.resolve(null),
        dbGetAll(STORES.customers), dbGetAll(STORES.machines)
    ]);
    openModal('amc-modal', amc ? 'Edit AMC' : 'New AMC Contract', `
        <div class="form-group"><label>Customer</label>
            <select class="form-control" id="amc-cust" onchange="loadAmcMachines()">
                <option value="">— Select Customer —</option>
                ${customers.map(c => `<option value="${c.id}" ${amc && amc.customerId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group"><label>Machine</label>
            <select class="form-control" id="amc-mach">
                <option value="">— Select Machine —</option>
                ${amc ? machines.filter(m => m.customerId === amc.customerId)
                    .map(m => `<option value="${m.id}" ${m.id === amc.machineId ? 'selected' : ''}>${m.id} — ${m.machineType}</option>`).join('') : ''}
            </select>
        </div>
        <div class="form-group"><label>AMC Start Date</label><input class="form-control" id="amc-start" type="date" value="${amc ? amc.startDate : ''}"></div>
        <div class="form-group"><label>AMC End Date</label><input class="form-control" id="amc-end" type="date" value="${amc ? amc.endDate : ''}"></div>
        ${State.currentUser.role !== 'manager' ? `
        <div class="form-group"><label>Total Contract Amount (₹)</label><input class="form-control" id="amc-amount" type="number" value="${amc ? amc.totalAmount : ''}" placeholder="e.g. 120000"></div>
        <div class="form-group"><label>Payment Terms</label>
            <select class="form-control" id="amc-terms">
                <option value="emi" ${!amc || amc.paymentTerms === 'emi' ? 'selected' : ''}>EMI (Monthly)</option>
                <option value="full" ${amc && amc.paymentTerms === 'full' ? 'selected' : ''}>Full Payment</option>
                <option value="quarterly" ${amc && amc.paymentTerms === 'quarterly' ? 'selected' : ''}>Quarterly</option>
            </select>
        </div>` : ''}
    `, async () => {
        const custId = document.getElementById('amc-cust').value;
        const machId = document.getElementById('amc-mach').value;
        const start = document.getElementById('amc-start').value;
        const end = document.getElementById('amc-end').value;
        const isManager = State.currentUser.role === 'manager';
        const amount = isManager ? (amc ? amc.totalAmount : 0) : document.getElementById('amc-amount').value;
        if (!custId || !machId || !start || !end) return showToast('All fields are required', 'warning');
        if (!isManager && !amount) return showToast('Amount is required', 'warning');
        await dbAdd(STORES.amcContracts, {
            id: amc ? amc.id : generateId('AMC'),
            customerId: custId, machineId: machId, startDate: start, endDate: end,
            totalAmount: Number(amount),
            paymentTerms: isManager ? (amc ? amc.paymentTerms : 'emi') : document.getElementById('amc-terms').value,
            status: 'active', payments: amc ? amc.payments : [],
            createdAt: amc ? amc.createdAt : new Date().toISOString(),
        });
        closeModal(); showToast(amc ? 'AMC updated' : 'AMC contract created', 'success'); renderAMC();
    });
    window._allMachinesAmc = machines;
}

async function loadAmcMachines() {
    const custId = document.getElementById('amc-cust').value;
    const sel = document.getElementById('amc-mach');
    const machines = window._allMachinesAmc || await dbGetAll(STORES.machines);
    sel.innerHTML = `<option value="">— Select Machine —</option>` +
        machines.filter(m => m.customerId === custId)
            .map(m => `<option value="${m.id}">${m.id} — ${m.machineType}</option>`).join('');
}

async function deleteAMC(id) {
    if (!confirm('Delete this AMC contract?')) return;
    await dbDelete(STORES.amcContracts, id);
    closeModal(); showToast('AMC deleted', 'info'); renderAMC();
}

// ============================================================
// REPORTS & ANALYTICS
// ============================================================
async function renderReports() {
    const page = document.getElementById('page-content');
    const [tickets, users, customers, amcs] = await Promise.all([
        dbGetAll(STORES.tickets), dbGetAll(STORES.users),
        dbGetAll(STORES.customers), dbGetAll(STORES.amcContracts)
    ]);

    const engineers = users.filter(u => u.role === 'engineer' || u.role === 'manager');
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);
    const engMap = {}; engineers.forEach(e => engMap[e.id] = e.name);
    const isManager = State.currentUser.role === 'manager';

    // Engineer-wise stats
    const engStats = engineers.map(e => {
        const assigned = tickets.filter(t => t.assignedTo === e.id);
        const done = assigned.filter(t => t.status === 'completed').length;
        return { name: e.name, total: assigned.length, done };
    }).sort((a, b) => b.done - a.done);

    // Status breakdown
    const statusCounts = { open: 0, assigned: 0, 'in-progress': 0, completed: 0, cancelled: 0 };
    tickets.forEach(t => { if (statusCounts[t.status] !== undefined) statusCounts[t.status]++; });

    // Priority breakdown
    const prioCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    tickets.forEach(t => { if (prioCounts[t.priority] !== undefined) prioCounts[t.priority]++; });

    // AMC revenue (admin only)
    const totalAMCValue = amcs.reduce((s, a) => s + a.totalAmount, 0);
    const collectedAMC = amcs.reduce((s, a) => s + (a.payments || []).reduce((ps, p) => ps + Number(p.amount), 0), 0);
    const pendingAMC = totalAMCValue - collectedAMC;

    const maxEngDone = Math.max(1, ...engStats.map(e => e.done));
    const maxStatus = Math.max(1, ...Object.values(statusCounts));

    const statusColors = { open: 'danger', assigned: 'primary', 'in-progress': 'warning', completed: 'success', cancelled: '' };

    page.innerHTML = `
        <div class="fade-in">
            <div class="stats-grid stagger-children mb-24">
                <div class="stat-card">
                    <div class="stat-icon primary"><ion-icon name="ticket-outline"></ion-icon></div>
                    <div><span class="stat-value">${tickets.length}</span><span class="stat-label">Total Tickets</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success"><ion-icon name="checkmark-circle"></ion-icon></div>
                    <div><span class="stat-value">${statusCounts.completed}</span><span class="stat-label">Completed</span></div>
                </div>
                ${!isManager ? `
                <div class="stat-card">
                    <div class="stat-icon warning"><ion-icon name="document-text"></ion-icon></div>
                    <div><span class="stat-value">${currency(totalAMCValue)}</span><span class="stat-label">Total AMC Value</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon ${pendingAMC > 0 ? 'danger' : 'success'}"><ion-icon name="cash-outline"></ion-icon></div>
                    <div><span class="stat-value">${currency(pendingAMC)}</span><span class="stat-label">AMC Pending Payment</span></div>
                </div>` : ''}
            </div>

            <div class="report-grid">
                <!-- Ticket Status -->
                <div class="report-card">
                    <h4>Ticket Status Breakdown</h4>
                    <div class="bar-chart">
                        ${Object.entries(statusCounts).map(([status, count]) => `
                            <div class="bar-item">
                                <span class="bar-label">${status.replace('-',' ')}</span>
                                <div class="bar-track">
                                    <div class="bar-fill ${statusColors[status] || 'primary'}" style="width:${Math.round((count/maxStatus)*100)}%;min-width:${count>0?'30px':'0'}">
                                        ${count > 0 ? count : ''}
                                    </div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>

                <!-- Priority Breakdown -->
                <div class="report-card">
                    <h4>Tickets by Priority</h4>
                    <div class="bar-chart">
                        ${Object.entries(prioCounts).map(([prio, count]) => `
                            <div class="bar-item">
                                <span class="bar-label">${prio}</span>
                                <div class="bar-track">
                                    <div class="bar-fill ${prio === 'critical' ? 'danger' : prio === 'high' ? 'warning' : prio === 'medium' ? 'warning' : 'success'}"
                                        style="width:${Math.round((count/Math.max(1,...Object.values(prioCounts)))*100)}%;min-width:${count>0?'30px':'0'}">
                                        ${count > 0 ? count : ''}
                                    </div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>

                <!-- Engineer Performance -->
                <div class="report-card">
                    <h4>Engineer Performance (Tickets Completed)</h4>
                    <div class="bar-chart">
                        ${engStats.length === 0
                            ? `<p class="text-muted fs-sm">No data yet.</p>`
                            : engStats.map(e => `
                            <div class="bar-item">
                                <span class="bar-label">${e.name}</span>
                                <div class="bar-track">
                                    <div class="bar-fill success" style="width:${Math.round((e.done/maxEngDone)*100)}%;min-width:${e.done>0?'30px':'0'}">
                                        ${e.done > 0 ? e.done : ''}
                                    </div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>

                <!-- AMC Payment Status -->
                <div class="report-card">
                    <h4>AMC Payment Collection</h4>
                    <div class="d-flex flex-wrap gap-8 mb-16">
                        <div class="stat-card" style="flex:1;min-width:120px;padding:14px">
                            <div class="stat-icon success" style="width:36px;height:36px"><ion-icon name="checkmark"></ion-icon></div>
                            <div><span class="stat-value" style="font-size:1.1rem">${currency(collectedAMC)}</span><span class="stat-label">Collected</span></div>
                        </div>
                        <div class="stat-card" style="flex:1;min-width:120px;padding:14px">
                            <div class="stat-icon danger" style="width:36px;height:36px"><ion-icon name="time"></ion-icon></div>
                            <div><span class="stat-value" style="font-size:1.1rem">${currency(pendingAMC)}</span><span class="stat-label">Pending</span></div>
                        </div>
                    </div>
                    <div class="progress-bar" style="height:12px">
                        <div class="progress-fill success" style="width:${totalAMCValue > 0 ? Math.round((collectedAMC/totalAMCValue)*100) : 0}%"></div>
                    </div>
                    <div class="fs-xs text-muted mt-8">${totalAMCValue > 0 ? Math.round((collectedAMC/totalAMCValue)*100) : 0}% of total AMC value collected</div>
                </div>
            </div>

            <!-- Expiring AMC Table -->
            <div class="section-header mt-24 mb-16">
                <span class="section-title">AMC Expiry Status</span>
                <button class="btn btn-sm btn-secondary" onclick="navTo('amc')">Manage AMCs</button>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead><tr><th>AMC ID</th><th>Customer</th><th>End Date</th><th>Days Left</th><th>Status</th></tr></thead>
                    <tbody>
                        ${amcs.sort((a,b) => new Date(a.endDate)-new Date(b.endDate)).map(amc => {
                            const daysLeft = Math.ceil((new Date(amc.endDate) - new Date()) / 86400000);
                            const st = daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'expiring' : 'active';
                            return `<tr>
                                <td class="fw-600 text-primary">${amc.id}</td>
                                <td>${custMap[amc.customerId] || amc.customerId}</td>
                                <td>${formatDate(amc.endDate)}</td>
                                <td class="${daysLeft < 0 ? 'text-danger' : daysLeft <= 30 ? 'text-warning' : 'text-success'} fw-600">
                                    ${daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft} days`}
                                </td>
                                <td>${amcStatusBadge(st)}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================================
// ENGINEER DASHBOARD
// ============================================================
async function renderEngDashboard() {
    const page = document.getElementById('page-content');
    const uid = State.currentUser.id;
    const [tickets, customers] = await Promise.all([dbGetAll(STORES.tickets), dbGetAll(STORES.customers)]);
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);

    const myTickets = tickets.filter(t => t.assignedTo === uid);
    const open = tickets.filter(t => t.status === 'open').length;
    const myActive = myTickets.filter(t => ['assigned','in-progress'].includes(t.status));
    const myDone = myTickets.filter(t => t.status === 'completed').length;
    const today = new Date().toDateString();
    const myToday = myTickets.filter(t => new Date(t.updatedAt).toDateString() === today);

    page.innerHTML = `
        <div class="fade-in">
            <div class="stats-grid stagger-children mb-24">
                <div class="stat-card" onclick="navTo('eng-tickets')">
                    <div class="stat-icon warning"><ion-icon name="list"></ion-icon></div>
                    <div><span class="stat-value">${myActive.length}</span><span class="stat-label">Active Tickets</span></div>
                </div>
                <div class="stat-card" onclick="navTo('eng-open')">
                    <div class="stat-icon danger"><ion-icon name="alert-circle"></ion-icon></div>
                    <div><span class="stat-value">${open}</span><span class="stat-label">Open Pool</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success"><ion-icon name="checkmark-done"></ion-icon></div>
                    <div><span class="stat-value">${myDone}</span><span class="stat-label">Completed</span></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info"><ion-icon name="today-outline"></ion-icon></div>
                    <div><span class="stat-value">${myToday.length}</span><span class="stat-label">Activity Today</span></div>
                </div>
            </div>

            ${myActive.length > 0 ? `
            <div class="section-header mb-12">
                <span class="section-title">Active Tickets</span>
                <button class="btn btn-sm btn-secondary" onclick="navTo('eng-tickets')">View All</button>
            </div>
            <div class="ticket-cards stagger-children">
                ${myActive.map(t => renderTicketCard(t, custMap, [])).join('')}
            </div>
            ` : `
            <div class="empty-state" style="padding: 40px">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                <h3>All caught up!</h3>
                <p>You have no active tickets right now.</p>
                <button class="btn btn-primary mt-16" onclick="navTo('eng-open')">Browse Open Pool</button>
            </div>
            `}
        </div>
    `;
}

// ============================================================
// ENGINEER - MY TICKETS
// ============================================================
async function renderEngTickets() {
    const page = document.getElementById('page-content');
    const uid = State.currentUser.id;
    const [tickets, customers] = await Promise.all([dbGetAll(STORES.tickets), dbGetAll(STORES.customers)]);
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);
    const myTickets = tickets.filter(t => t.assignedTo === uid)
        .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    page.innerHTML = `
        <div class="fade-in">
            <div class="chip-filters mb-16" id="eng-ticket-filters">
                ${['all','assigned','in-progress','completed','cancelled'].map(s =>
                    `<div class="chip ${s === 'all' ? 'active' : ''}" onclick="filterEngTickets('${s}', event)">${s.replace('-',' ')}</div>`
                ).join('')}
            </div>
            <div id="eng-ticket-list">
                ${myTickets.length === 0
                    ? `<div class="empty-state"><ion-icon name="list-outline"></ion-icon><h3>No tickets assigned</h3><p>Check the open pool to pick up a ticket.</p></div>`
                    : `<div class="ticket-cards stagger-children" id="eng-ticket-cards">
                        ${myTickets.map(t => renderTicketCard(t, custMap, [])).join('')}
                    </div>`}
            </div>
        </div>
    `;
    window._engTickets = myTickets;
    window._engCustMap = custMap;
}

function filterEngTickets(filter, e) {
    document.querySelectorAll('#eng-ticket-filters .chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    const all = window._engTickets || [];
    const data = filter === 'all' ? all : all.filter(t => t.status === filter);
    const container = document.getElementById('eng-ticket-cards') || document.getElementById('eng-ticket-list');
    if (!container) return;
    container.innerHTML = data.length === 0
        ? `<div class="empty-state"><ion-icon name="search-outline"></ion-icon><h3>No tickets</h3></div>`
        : `<div class="ticket-cards stagger-children">${data.map(t => renderTicketCard(t, window._engCustMap, [])).join('')}</div>`;
}

// ============================================================
// ENGINEER - OPEN POOL
// ============================================================
async function renderEngOpenPool() {
    const page = document.getElementById('page-content');
    const [tickets, customers] = await Promise.all([dbGetAll(STORES.tickets), dbGetAll(STORES.customers)]);
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);
    const open = tickets.filter(t => t.status === 'open')
        .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    page.innerHTML = `
        <div class="fade-in">
            <p class="text-muted fs-sm mb-16">These tickets are unassigned. Click any ticket to accept it.</p>
            ${open.length === 0
                ? `<div class="empty-state"><ion-icon name="checkmark-circle-outline"></ion-icon><h3>No open tickets</h3><p>Great! All tickets have been assigned.</p></div>`
                : `<div class="ticket-cards stagger-children">${open.map(t => `
                    <div class="ticket-card priority-${t.priority}" onclick="engAcceptTicket('${t.id}')">
                        <div class="tc-header"><span class="tc-id">${t.id}</span>${priorityBadge(t.priority)}</div>
                        <div class="tc-title">${t.title}</div>
                        <div class="fs-sm text-muted mb-8">${custMap[t.customerId] || t.customerId} &bull; ${t.machineId}</div>
                        <div class="tc-meta">
                            <span class="fs-xs text-muted">${timeAgo(t.createdAt)}</span>
                            <button class="btn btn-sm btn-primary" onclick="engAcceptTicket('${t.id}');event.stopPropagation()">
                                <ion-icon name="hand-right-outline"></ion-icon> Accept
                            </button>
                        </div>
                    </div>`).join('')}
                </div>`}
        </div>
    `;
}

async function engAcceptTicket(ticketId) {
    const ticket = await dbGet(STORES.tickets, ticketId);
    if (!ticket) return;
    ticket.assignedTo = State.currentUser.id;
    ticket.status = 'assigned';
    ticket.updatedAt = new Date().toISOString();
    await dbAdd(STORES.tickets, ticket);
    showToast('Ticket accepted: ' + ticketId, 'success');
    updateOpenBadge();
    navTo('eng-tickets');
}

// ============================================================
// ENGINEER - WORK REPORTS
// ============================================================
async function renderEngReports() {
    const page = document.getElementById('page-content');
    const uid = State.currentUser.id;
    const [tickets, customers, reports] = await Promise.all([
        dbGetAll(STORES.tickets), dbGetAll(STORES.customers), dbGetAll(STORES.workReports)
    ]);
    const custMap = {}; customers.forEach(c => custMap[c.id] = c.name);
    const myCompleted = tickets.filter(t => t.assignedTo === uid && t.status === 'completed');
    const myReports = reports.filter(r => r.engineerId === uid);
    const reportedIds = new Set(myReports.map(r => r.ticketId));

    page.innerHTML = `
        <div class="fade-in">
            <div class="section-header mb-16">
                <span class="section-title">Work Reports</span>
            </div>
            <p class="text-muted fs-sm mb-16">Submit work reports for your completed tickets.</p>

            ${myCompleted.filter(t => !reportedIds.has(t.id)).length > 0 ? `
            <div class="alert-banner warning mb-16">
                <ion-icon name="document-outline"></ion-icon>
                <span>${myCompleted.filter(t => !reportedIds.has(t.id)).length} completed ticket(s) pending work report submission.</span>
            </div>` : ''}

            <div class="ticket-cards stagger-children">
                ${myCompleted.length === 0
                    ? `<div class="empty-state"><ion-icon name="document-outline"></ion-icon><h3>No completed tickets</h3><p>Complete a ticket to submit a work report.</p></div>`
                    : myCompleted.map(t => {
                        const hasReport = reportedIds.has(t.id);
                        const report = myReports.find(r => r.ticketId === t.id);
                        return `
                        <div class="ticket-card priority-${t.priority}">
                            <div class="tc-header"><span class="tc-id">${t.id}</span>
                                ${hasReport ? `<span class="badge badge-completed">Report Submitted</span>` : `<span class="badge badge-open">Pending Report</span>`}
                            </div>
                            <div class="tc-title">${t.title}</div>
                            <div class="fs-sm text-muted mb-12">${custMap[t.customerId] || t.customerId} &bull; ${t.machineId}</div>
                            ${hasReport ? `
                                <div class="note-item">
                                    <div class="note-header"><span class="note-by">Work Done</span><span class="note-time">${formatDate(report.submittedAt)}</span></div>
                                    <div class="note-text">${report.workDone}</div>
                                    ${report.partsReplaced ? `<div class="note-text mt-8"><strong>Parts:</strong> ${report.partsReplaced}</div>` : ''}
                                    <div class="note-text mt-8"><strong>Time Spent:</strong> ${report.timeSpent} hrs</div>
                                </div>
                            ` : `<button class="btn btn-primary btn-sm" onclick="openWorkReportModal('${t.id}')">
                                <ion-icon name="document-attach-outline"></ion-icon> Submit Report
                            </button>`}
                        </div>`;
                    }).join('')}
            </div>
        </div>
    `;
}

function openWorkReportModal(ticketId) {
    openModal('work-report', 'Submit Work Report', `
        <div class="form-group"><label>Work Done</label><textarea class="form-control" id="wr-work" rows="3" placeholder="Describe work done, repairs made, calibrations performed..."></textarea></div>
        <div class="form-group"><label>Parts Replaced</label><input class="form-control" id="wr-parts" placeholder="e.g. Motor belt, Lens, Bearing (or leave blank)"></div>
        <div class="form-group"><label>Time Spent (Hours)</label><input class="form-control" id="wr-time" type="number" placeholder="e.g. 3.5" min="0" step="0.5"></div>
        <div class="form-group"><label>Additional Comments</label><textarea class="form-control" id="wr-notes" rows="2" placeholder="Any observations or follow-up needed..."></textarea></div>
    `, async () => {
        const workDone = document.getElementById('wr-work').value.trim();
        const timeSpent = document.getElementById('wr-time').value;
        if (!workDone || !timeSpent) return showToast('Work done and time spent are required', 'warning');
        await dbAdd(STORES.workReports, {
            id: generateId('WR'),
            ticketId, engineerId: State.currentUser.id,
            workDone,
            partsReplaced: document.getElementById('wr-parts').value.trim(),
            timeSpent: Number(timeSpent),
            notes: document.getElementById('wr-notes').value.trim(),
            submittedAt: new Date().toISOString(),
        });
        closeModal();
        showToast('Work report submitted', 'success');
        renderEngReports();
    });
}

// ============================================================
// MODAL SYSTEM (Reusable)
// ============================================================
let _modalCallback = null;

function openModal(id, title, bodyHtml, onSave = null) {
    _modalCallback = onSave;
    // Remove old modal
    const old = document.getElementById('global-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'global-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-handle"></div>
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="btn-icon" onclick="closeModal()">
                    <ion-icon name="close" style="font-size:1.3rem"></ion-icon>
                </button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
            ${onSave ? `<div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" id="modal-save-btn" onclick="triggerModalSave()">Save</button>
            </div>` : ''}
        </div>
    `;

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.body.appendChild(modal);
}

function closeModal() {
    const m = document.getElementById('global-modal');
    if (m) m.remove();
    _modalCallback = null;
}

function triggerModalSave() {
    if (_modalCallback) _modalCallback();
}

// ============================================================
// APP INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Seed the database with demo data if fresh
    await seedDatabase();

    // Keyboard shortcut: Escape closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Render login screen
    renderLogin();
});
