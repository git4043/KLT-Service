// ============================================================
// SUPABASE CONFIG & SCHEMA — KLT AMC Service
// ============================================================

const SUPABASE_URL = "https://cylmwwbwyjivgobjtqcb.supabase.co";
const SUPABASE_KEY = "sb_publishable_dDdajzEcIxWLD8si_--jyQ_qzkaBjTc";

// Table schema mapped for the app
const STORES = {
    users: 'users',
    customers: 'customers',
    machines: 'machines',
    amcContracts: 'amcContracts',
    tickets: 'tickets',
    workReports: 'workReports',
    notifications: 'notifications'
};

// Initial Demo Data (Removed per request - the app will only show real data from Supabase)

// ---- Initialize Supabase ----
let _sb = null;
let _sbReady = false;

async function initSupabase() {
    try {
        if (!window.supabase) {
            alert('⚠️ Network Block: The Supabase connection script is being blocked. Trying alternative link...');
            return false;
        }

        _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        _sbReady = true;
        console.log('✅ Supabase connected!');
        return true;
    } catch (err) {
        alert('⚠️ Supabase Connection Error: ' + err.message);
        return false;
    }
}

// ============================================================
// SUPABASE CLOUD CRUD & MAPPING
// ============================================================

// Directly bind global functions so app.js / app2.js always use these
window.dbAdd = sbAdd;
window.dbGetAll = sbGetAll;
window.dbGet = sbGet;
window.dbDelete = sbDelete;
window.dbCount = sbCount;

async function sbAdd(storeName, data) {
    if (!_sbReady) throw new Error('Supabase not connected. Check your settings.');
    const { error } = await _sb.from(storeName).upsert(data);
    if (error) {
        alert(`Database Error (${storeName}): ` + error.message);
        throw error;
    }
    return data;
}

async function sbGetAll(storeName) {
    if (!_sbReady) throw new Error('Supabase not connected. Check your settings.');
    const { data, error } = await _sb.from(storeName).select('*');
    if (error) {
        alert(`Database Error (${storeName}): ` + error.message);
        throw error;
    }
    return data || [];
}

async function sbGet(storeName, id) {
    if (!_sbReady) throw new Error('Supabase not connected. Check your settings.');
    const { data, error } = await _sb.from(storeName).select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // row not found
        alert(`Database Error (${storeName}): ` + error.message);
        throw error;
    }
    return data;
}

async function sbDelete(storeName, id) {
    if (!_sbReady) throw new Error('Supabase not connected. Check your settings.');
    const { error } = await _sb.from(storeName).delete().eq('id', id);
    if (error) {
        alert(`Database Error (${storeName}): ` + error.message);
        throw error;
    }
    return true;
}

async function sbCount(storeName) {
    if (!_sbReady) throw new Error('Supabase not connected. Check your settings.');
    const { count, error } = await _sb.from(storeName).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count;
}

// ---- Supabase Auth ----
async function sbLogin(email, password) {
    if (!_sbReady) return null;
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) return null;
    return data.user;
}

async function sbCreateUser(email, password) {
    if (!_sbReady) return null;
    const { data, error } = await _sb.auth.signUp({ email, password });
    if (error) return null;
    return data;
}

// ---- Auto Refresh / Realtime ----
window.sbEnableRealtime = function(callback) {
    if (!_sbReady) return;
    _sb.channel('public:all-tables')
        .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
            console.log('Realtime DB Change:', payload);
            if (callback) callback();
        })
        .subscribe((status) => {
            console.log('Supabase Realtime Status:', status);
        });
    
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && callback) {
            console.log('App resumed: Refreshing data...');
            callback();
        }
    });
};

// ---- Seed Supabase with demo data (runs only once) ----
async function seedSupabase() {
    // Demo data seeding has been removed per request.
    // The application will now only display real data fetched directly from Supabase.
    return;
}
