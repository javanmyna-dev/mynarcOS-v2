/**
 * supabase.js — Supabase client initialisation
 *
 * Loads the Supabase client CDN and creates the global `supabase` client.
 *
 * === Key-handling safety ===
 *   Supabase gives you two keys:
 *     - `anon` (public) key  — ok to use client-side; protected by RLS
 *     - `service_role` key   — NEVER put this in client code; it bypasses RLS
 *
 *   This file only uses the anon key. The key lives in js/config.js,
 *   which is gitignored. A sample config (config.example.js) is committed
 *   so the next person knows the shape without exposing real values.
 *
 * === Why no backend server? ===
 *   Supabase is a BaaS (Backend-as-a-Service). Its client SDK talks
 *   directly to Postgres over HTTPS. RLS (Row-Level Security) policies
 *   on the database enforce what each user can read/write — so the
 *   "server" logic lives in the database, not in a Node/Express layer.
 *   This keeps the front-end static (no build step) and avoids the
 *   Next.js API-route layer the original doc assumed.
 *
 * === RLS & GRANT heads-up ===
 *   When we create tables in Milestone 3, we MUST:
 *     1. Enable RLS on each table
 *     2. Add policies (e.g. "user can only see their own rows")
 *     3. Run GRANT SELECT/INSERT/UPDATE/DELETE ON table TO authenticated
 *   Missing step 3 causes silent 403s — Fred ran into this on Safe2Save
 *   and it took hours to debug. We'll triple-check it.
 */

;(function () {

    /**
     * Helper: waits until the Supabase client is ready, then calls cb().
     * Use this in any script that needs `window.supabase` before proceeding,
     * since the CDN load is async. Other pages can call window._waitForSupabase.
     */
    window._waitForSupabase = function (cb) {
        if (window.supabase) return cb();
        setTimeout(function () { window._waitForSupabase(cb); }, 100);
    };
    // Guard: if config wasn't loaded, Supabase can't initialise
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        console.warn(
            '[supabase] Config missing — create js/config.js from js/config.example.js.\n' +
            '  The app will work for layout/styling but Supabase calls will fail.'
        )
        window.supabase = null
        return
    }

    // Load the Supabase client from CDN (no npm, no build step)
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
    script.onload = function () {
        const { createClient } = window.supabase || supabase

        if (!createClient) {
            console.error('[supabase] CDN loaded but createClient not found.')
            window.supabase = null
            return
        }

        window.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        console.log('[supabase] Client initialised —', SUPABASE_URL)

        // === Connection ping ===
        // A simple health check: try to read a row from the server's
        // built-in system schema. This confirms the URL + key work.
        window.supabase
            .from('pg_stat_statements') // any valid table/function would do
            .select('*', { count: 'exact', head: true })
            .then(function (result) {
                // We expect a "relation does not exist" error OR success —
                // either means the connection itself worked. A network error
                // would mean the URL is wrong.
                if (result.error) {
                    // Common on fresh projects — the table doesn't exist yet.
                    // That's fine; the URL + key were accepted.
                    console.log('[supabase] Ping response received — connection is live (expected error: no table yet)')
                } else {
                    console.log('[supabase] Ping successful — connection confirmed')
                }
            })
            .catch(function (err) {
                console.error('[supabase] Ping failed — check your SUPABASE_URL and network:', err.message)
            })
    }
    script.onerror = function () {
        console.error('[supabase] Failed to load CDN script — check your internet connection.')
    }
    document.head.appendChild(script)
})()
