// ============================================================
// KLT Service - IndexedDB Database Layer
// ============================================================

const DB_NAME = 'KLTServiceDB';
const DB_VERSION = 3;

const STORES = {
    users: 'users',
    customers: 'customers',
    machines: 'machines',
    amcContracts: 'amcContracts',
    tickets: 'tickets',
    workReports: 'workReports',
    notifications: 'notifications',
};

// ---- Open / Upgrade DB ----
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            Object.values(STORES).forEach(name => {
                if (!db.objectStoreNames.contains(name)) {
                    db.createObjectStore(name, { keyPath: 'id' });
                }
            });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ---- Generic CRUD ----
async function dbAdd(storeName, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = () => resolve(data);
        tx.onerror = () => reject(tx.error);
    });
}

async function dbGetAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbGet(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbDelete(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

async function dbCount(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbClear(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

// ---- Seed Data ----
const SEED_USERS = [
    {
        id: 'USR-001', name: 'Admin KLT', email: 'admin@klt.com', mobile: '9876543210',
        password: 'admin123', role: 'admin', skill: '', area: 'Head Office',
        status: 'active', avatar: '', createdAt: new Date().toISOString()
    },
    {
        id: 'USR-002', name: 'Vipul Sharma', email: 'vipul@klt.com', mobile: '9876501001',
        password: 'eng123', role: 'engineer', skill: 'Z-Axis Expert', area: 'Surat',
        status: 'active', avatar: '', createdAt: new Date().toISOString()
    },
    {
        id: 'USR-003', name: 'Atul Patel', email: 'atul@klt.com', mobile: '9876501002',
        password: 'eng123', role: 'engineer', skill: 'Surface Table', area: 'Ahmedabad',
        status: 'active', avatar: '', createdAt: new Date().toISOString()
    },
    {
        id: 'USR-004', name: 'Om Pradhan', email: 'om@klt.com', mobile: '9876501003',
        password: 'eng123', role: 'engineer', skill: 'Laser Assembly', area: 'Rajkot',
        status: 'active', avatar: '', createdAt: new Date().toISOString()
    },
];

const SEED_CUSTOMERS = [
    { id: 'CUS-001', name: 'Ramesh Masha Enterprises', contact: '9988776611', email: 'ramesh@me.com', address: 'Plot 42, GIDC Surat', city: 'Surat', createdAt: new Date().toISOString() },
    { id: 'CUS-002', name: 'Jayeshbhai Diamond Works', contact: '9988776622', email: 'jayesh@dw.com', address: '121 Diamond Nagar', city: 'Ahmedabad', createdAt: new Date().toISOString() },
    { id: 'CUS-003', name: 'Snehmudra Industries', contact: '9988776633', email: 'info@snehmudra.com', address: '88 Industrial Estate', city: 'Rajkot', createdAt: new Date().toISOString() },
    { id: 'CUS-004', name: 'Arjun Khopala Factory', contact: '9988776644', email: 'arjun@khopala.com', address: '55 Market Road', city: 'Navsari', createdAt: new Date().toISOString() },
];

const SEED_MACHINES = [
    { id: 'MAC-Z99', customerId: 'CUS-001', machineType: 'Z-Axis Cutter Pro', serialNumber: 'KLT-Z99-2024-001', installDate: '2024-06-15', status: 'active', createdAt: new Date().toISOString() },
    { id: 'MAC-S12', customerId: 'CUS-002', machineType: 'Surface Table 3000', serialNumber: 'KLT-S12-2024-002', installDate: '2024-03-20', status: 'active', createdAt: new Date().toISOString() },
    { id: 'MAC-L88', customerId: 'CUS-003', machineType: 'Laser Assembly Unit', serialNumber: 'KLT-L88-2023-005', installDate: '2023-11-10', status: 'active', createdAt: new Date().toISOString() },
    { id: 'MAC-D45', customerId: 'CUS-004', machineType: 'Diamond Polisher X', serialNumber: 'KLT-D45-2025-001', installDate: '2025-01-05', status: 'active', createdAt: new Date().toISOString() },
];

const SEED_AMCS = [
    {
        id: 'AMC-001', customerId: 'CUS-001', machineId: 'MAC-Z99',
        startDate: '2025-04-01', endDate: '2026-03-31', totalAmount: 120000,
        paymentTerms: 'emi', status: 'active',
        payments: [
            { date: '2025-04-01', amount: 10000, note: 'EMI 1' },
            { date: '2025-05-01', amount: 10000, note: 'EMI 2' },
            { date: '2025-06-01', amount: 10000, note: 'EMI 3' },
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: 'AMC-002', customerId: 'CUS-002', machineId: 'MAC-S12',
        startDate: '2025-06-01', endDate: '2026-05-31', totalAmount: 96000,
        paymentTerms: 'full', status: 'active',
        payments: [
            { date: '2025-06-01', amount: 96000, note: 'Full Payment' },
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: 'AMC-003', customerId: 'CUS-003', machineId: 'MAC-L88',
        startDate: '2025-01-01', endDate: '2025-12-31', totalAmount: 84000,
        paymentTerms: 'emi', status: 'expiring',
        payments: [
            { date: '2025-01-01', amount: 7000, note: 'EMI 1' },
            { date: '2025-02-01', amount: 7000, note: 'EMI 2' },
        ],
        createdAt: new Date().toISOString()
    },
];

const SEED_TICKETS = [
    {
        id: 'TKT-1042', customerId: 'CUS-001', machineId: 'MAC-Z99',
        title: 'Z-Axis alignment failure in production',
        description: 'Machine stopped perfectly aligning in the Z-axis during the cutting phase. Customer reports drift of 0.5mm after 2 hours of operation.',
        priority: 'high', status: 'open', assignedTo: null,
        notes: [], photos: [], rating: null, feedback: '',
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'TKT-1041', customerId: 'CUS-002', machineId: 'MAC-S12',
        title: 'Surface Table leveling issue',
        description: 'The surface table is off by 2mm on the left corner. Needs urgent calibration.',
        priority: 'medium', status: 'in-progress', assignedTo: 'USR-003',
        notes: [
            { by: 'USR-003', text: 'Reached site, starting diagnostics.', at: new Date(Date.now() - 3600000).toISOString() }
        ],
        photos: [], rating: null, feedback: '',
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'TKT-1040', customerId: 'CUS-003', machineId: 'MAC-L88',
        title: 'Lens Cleaning Required',
        description: 'Routine maintenance and lens cleaning for laser assembly requested.',
        priority: 'low', status: 'completed', assignedTo: 'USR-004',
        notes: [
            { by: 'USR-004', text: 'Lens cleaned and recalibrated.', at: new Date(Date.now() - 86400000).toISOString() },
        ],
        photos: [], rating: 5, feedback: 'Excellent service!',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'TKT-1039', customerId: 'CUS-004', machineId: 'MAC-D45',
        title: 'Polisher motor vibration noise',
        description: 'Unusual vibration noise coming from the polishing motor during high-speed operation.',
        priority: 'high', status: 'assigned', assignedTo: 'USR-002',
        notes: [], photos: [], rating: null, feedback: '',
        createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'TKT-1038', customerId: 'CUS-001', machineId: 'MAC-Z99',
        title: 'Error code E-47 on display panel',
        description: 'Machine displaying error E-47 intermittently. Stops production cycle.',
        priority: 'medium', status: 'open', assignedTo: null,
        notes: [], photos: [], rating: null, feedback: '',
        createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
        updatedAt: new Date().toISOString()
    },
];

async function seedDatabase() {
    const userCount = await dbCount(STORES.users);
    if (userCount > 0) return; // Already seeded

    for (const u of SEED_USERS) await dbAdd(STORES.users, u);
    for (const c of SEED_CUSTOMERS) await dbAdd(STORES.customers, c);
    for (const m of SEED_MACHINES) await dbAdd(STORES.machines, m);
    for (const a of SEED_AMCS) await dbAdd(STORES.amcContracts, a);
    for (const t of SEED_TICKETS) await dbAdd(STORES.tickets, t);

    console.log('✅ Database seeded with demo data.');
}

// ---- Helper: Generate IDs ----
function generateId(prefix) {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function currency(num) {
    return '₹' + Number(num || 0).toLocaleString('en-IN');
}
