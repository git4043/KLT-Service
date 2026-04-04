// ============================================================
// SUPABASE CONFIG — KLT AMC Service
// ============================================================
// HOW TO GET YOUR SUPABASE CONFIG:
// 1. Go to https://supabase.com/dashboard and create a new project
// 2. Once the project is ready, go to Project Settings (gear icon) -> API
// 3. Copy the "Project URL" and paste it below
// 4. Copy the "anon" public key and paste it below
// ============================================================

const SUPABASE_URL = "https://vmiekebmywnufejmcybe.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qc-6lLaIQSQVCsOxMzH-Og_1hEodj7i";

// ---- Initialize Supabase ----
let _sb = null;
let _sbReady = false;

async function initSupabase() {
    try {
        if (!window.supabase) {
            alert('⚠️ Network Block: The Supabase connection script is being blocked by your internet provider. Trying an alternative link...');
            console.warn('Supabase SDK not loaded. Falling back to IndexedDB.');
            return false;
        }

        _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        _sbReady = true;
        console.log('✅ Supabase connected!');
        return true;
    } catch (err) {
        alert('⚠️ Supabase Initialization Error: ' + err.message + '\n\nPlease ensure your API Key is copied correctly from Supabase!');
        console.error('Supabase init failed:', err);
        return false;
    }
}

// ============================================================
// SUPABASE CRUD — Mirrors the IndexedDB API
// ============================================================

async function sbAdd(storeName, data) {
    if (!_sbReady) return dbAdd(storeName, data); // fallback
    const { error } = await _sb.from(storeName).upsert({ id: data.id, data: data });
    if (error) throw error;
    return data;
}

async function sbGetAll(storeName) {
    if (!_sbReady) return dbGetAll(storeName); // fallback
    const { data, error } = await _sb.from(storeName).select('data');
    if (error) throw error;
    return data.map(row => row.data);
}

async function sbGet(storeName, id) {
    if (!_sbReady) return dbGet(storeName, id); // fallback
    const { data, error } = await _sb.from(storeName).select('data').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // row not found
        throw error;
    }
    return data ? data.data : null;
}

async function sbDelete(storeName, id) {
    if (!_sbReady) return dbDelete(storeName, id); // fallback
    const { error } = await _sb.from(storeName).delete().eq('id', id);
    if (error) throw error;
    return true;
}

async function sbCount(storeName) {
    if (!_sbReady) return dbCount(storeName); // fallback
    const { count, error } = await _sb.from(storeName).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count;
}

// ---- Supabase Auth: Login ----
async function sbLogin(email, password) {
    if (!_sbReady) return null;
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) {
        console.warn('Login error:', error.message);
        return null;
    }
    return data.user;
}

// ---- Supabase Auth: Create User ----
async function sbCreateUser(email, password) {
    if (!_sbReady) return null;
    const { data, error } = await _sb.auth.signUp({ email, password });
    if (error) {
        console.warn('Signup error:', error.message);
        return null;
    }
    return data.user;
}

// ---- Seed Supabase with demo data (runs only once) ----
async function seedSupabase() {
    if (!_sbReady) return;

    try {
        const count = await sbCount(STORES.users);
        if (count > 0) {
            console.log('Supabase already has data. Skipping seed.');
            return;
        }
    } catch (e) {
        console.error('❌ Supabase READ failed:', e.message);
        alert(
            '⚠️ Supabase Tables Error!\n\n' +
            'It looks like you haven\'t created the SQL tables in Supabase yet.\n' +
            'Please go back to the chat and follow the SQL Script instructions.'
        );
        return;
    }

    console.log('🔄 Seeding Supabase with demo data...');
    showToast('Setting up cloud database for first time...', 'info');

    try {
        for (const u of SEED_USERS) {
            await sbCreateUser(u.email, u.password);
            await sbAdd(STORES.users, u);
        }

        for (const c of SEED_CUSTOMERS) await sbAdd(STORES.customers, c);
        for (const m of SEED_MACHINES) await sbAdd(STORES.machines, m);
        for (const a of SEED_AMCS) await sbAdd(STORES.amcContracts, a);
        for (const t of SEED_TICKETS) await sbAdd(STORES.tickets, t);

        console.log('✅ Supabase seeded successfully!');
        showToast('Cloud database ready!', 'success');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        showToast('Seeding failed! Check console (F12).', 'error');
        alert('⚠️ Seeding Error: ' + err.message);
    }
}
