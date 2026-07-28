/**
 * check-in.js — Daily check-in form logic
 *
 * Handles auth gating, date navigation, radio-group rendering,
 * Supabase upsert, read-only summary, and error/warning banners.
 *
 * Why a "row per day" schema now?
 *   The heatmap on the Progress page (Milestone 3) needs exactly
 *   that shape — one row per (user, date). If we stored check-ins
 *   as multiple rows per day (one per index), we'd have to pivot or
 *   aggregate later. Designing the schema to match the heatmap's
 *   query pattern now means zero data migration when the heatmap
 *   gets built. This is a real data-modelling decision, not just
 *   a UI preference.
 */

;(function () {
    'use strict';

    // ---- Constants ----

    var INDEX_LABELS = {
        mood:        ['Terrible', 'Low', 'Meh', 'Good', 'Amazing'],
        sanity:      ['Overwhelmed', 'Scattered', 'Steady', 'Clear', 'Zen'],
        prod_coding:  ['Blocked', 'Sluggish', 'In Flow', 'Productive', 'Unstoppable'],
        prod_drawing: ['Blocked', 'Sluggish', 'In Flow', 'Productive', 'Unstoppable'],
        prod_reading: ['Blocked', 'Sluggish', 'In Flow', 'Productive', 'Unstoppable']
    };

    var INDEX_KEYS = ['mood', 'sanity', 'prod_coding', 'prod_drawing', 'prod_reading'];

    var INDEX_TITLES = {
        mood: 'Mood',
        sanity: 'Sanity',
        prod_coding: 'Coding',
        prod_drawing: 'Drawing',
        prod_reading: 'Reading'
    };

    // ---- DOM refs ----

    var authGate     = document.getElementById('auth-gate');
    var errorBanner  = document.getElementById('error-banner');
    var errorMsg     = document.getElementById('error-msg');
    var errorRetry   = document.getElementById('error-retry');
    var warnBanner   = document.getElementById('warning-banner');
    var dateInput    = document.getElementById('entry-date');
    var summary      = document.getElementById('checkin-summary');
    var summaryBody  = document.getElementById('summary-content');
    var editBtn      = document.getElementById('edit-btn');
    var form         = document.getElementById('checkin-form');
    var cancelBtn    = document.getElementById('cancel-edit-btn');
    var reflectionEl = document.getElementById('reflection');
    var navAuth      = document.getElementById('nav-auth');

    // ---- State ----

    var currentEntry  = null;
    var currentUserId = null;
    var isEditing     = false;

    // ---- Helpers ----

    function getLocalDate() {
        var d = new Date();
        return d.getFullYear() + '-' +
               String(d.getMonth() + 1).padStart(2, '0') +
               String(d.getDate()).padStart(2, '0');
    }

    function todayLocal() { return getLocalDate(); }

    function waitForSupabase(cb) {
        if (window.supabase) return cb();
        setTimeout(function () { waitForSupabase(cb); }, 100);
    }

    function hideAllBanners() {
        errorBanner.hidden = true;
        warnBanner.hidden = true;
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorBanner.hidden = false;
    }

    function showWarning() {
        warnBanner.hidden = false;
    }

    // ---- Radio rendering ----

    function buildRadioGroup(key) {
        var labels = INDEX_LABELS[key];
        var html = '';
        for (var i = 0; i < 5; i++) {
            var val = i + 1;
            html += '<label class="radio-option">' +
                    '<input type="radio" name="' + key + '" value="' + val + '">' +
                    '<span class="radio-num">' + val + '</span>' +
                    '<span class="radio-label-text">' + labels[i] + '</span>' +
                    '</label>';
        }
        return html;
    }

    function renderAllRadios() {
        INDEX_KEYS.forEach(function (key) {
            var container = document.getElementById('radio-' + key);
            if (container) container.innerHTML = buildRadioGroup(key);
        });
    }

    function setRadioValue(key, val) {
        if (val === null || val === undefined) return;
        var radio = document.querySelector('input[name="' + key + '"][value="' + val + '"]');
        if (radio) radio.checked = true;
    }

    function getRadioValue(key) {
        var radio = document.querySelector('input[name="' + key + '"]:checked');
        return radio ? parseInt(radio.value, 10) : null;
    }

    function clearAllRadios() {
        INDEX_KEYS.forEach(function (key) {
            var radios = document.querySelectorAll('input[name="' + key + '"]');
            for (var i = 0; i < radios.length; i++) { radios[i].checked = false; }
        });
    }

    // ---- Summary rendering ----

    function renderSummary(entry) {
        var html = '';
        INDEX_KEYS.forEach(function (key) {
            var val = entry[key];
            var title = INDEX_TITLES[key];
            if (val !== null && val !== undefined) {
                var label = INDEX_LABELS[key][val - 1];
                html += '<div class="index-summary-row">' +
                        '<span class="index-summary-label">' + title + '</span>' +
                        '<span class="index-summary-value">' + val + ' &mdash; ' + label + '</span>' +
                        '</div>';
            } else {
                html += '<div class="index-summary-row index-summary-row--empty">' +
                        '<span class="index-summary-label">' + title + '</span>' +
                        '<span class="index-summary-value">&mdash;</span>' +
                        '</div>';
            }
        });

        if (entry.reflection) {
            html += '<div class="index-summary-row index-summary-row--reflection">' +
                    '<span class="index-summary-label">Reflection</span>' +
                    '<span class="index-summary-value">' + escapeHtml(entry.reflection) + '</span>' +
                    '</div>';
        }

        summaryBody.innerHTML = html;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---- View switching ----

    function showFormMode() {
        isEditing = true;
        summary.hidden = true;
        form.hidden = false;
        cancelBtn.hidden = false;
        hideAllBanners();
    }

    function showSummaryMode(entry) {
        isEditing = false;
        currentEntry = entry;
        renderSummary(entry);
        summary.hidden = false;
        form.hidden = true;
        cancelBtn.hidden = true;
        hideAllBanners();
    }

    function showNewEntryMode() {
        isEditing = false;
        currentEntry = null;
        clearAllRadios();
        reflectionEl.value = '';
        summary.hidden = true;
        form.hidden = false;
        cancelBtn.hidden = true;
        hideAllBanners();
    }

    // ---- Data loading ----

    function loadEntry(dateStr) {
        if (!currentUserId) {
            showNewEntryMode();
            return;
        }

        waitForSupabase(function () {
            window.supabase
                .from('journal_entries')
                .select('*')
                .eq('user_id', currentUserId)
                .eq('entry_date', dateStr)
                .maybeSingle()
                .then(function (result) {
                    if (result.error) {
                        showError('Failed to load entry: ' + result.error.message);
                        showNewEntryMode();
                        return;
                    }

                    if (result.data) {
                        currentEntry = result.data;
                        INDEX_KEYS.forEach(function (key) { setRadioValue(key, result.data[key]); });
                        reflectionEl.value = result.data.reflection || '';
                        showSummaryMode(result.data);
                    } else {
                        showNewEntryMode();
                    }
                });
        });
    }

    // ---- Data saving ----

    function isPartial(entry) {
        return INDEX_KEYS.some(function (key) {
            return entry[key] === null || entry[key] === undefined;
        });
    }

    function saveEntry(dateStr) {
        var entry = {
            user_id: currentUserId,
            entry_date: dateStr,
            mood: getRadioValue('mood'),
            sanity: getRadioValue('sanity'),
            prod_coding: getRadioValue('prod_coding'),
            prod_drawing: getRadioValue('prod_drawing'),
            prod_reading: getRadioValue('prod_reading'),
            reflection: reflectionEl.value.trim() || null
        };

        waitForSupabase(function () {
            window.supabase
                .from('journal_entries')
                .upsert(entry, { onConflict: 'user_id, entry_date' })
                .select()
                .single()
                .then(function (result) {
                    if (result.error) {
                        showError('Failed to save: ' + result.error.message);
                        return;
                    }

                    hideAllBanners();
                    currentEntry = result.data;

                    if (isPartial(result.data)) {
                        showWarning();
                    }

                    // Pre-fill radios with saved values
                    INDEX_KEYS.forEach(function (key) { setRadioValue(key, result.data[key]); });
                    reflectionEl.value = result.data.reflection || '';

                    showSummaryMode(result.data);
                });
        });
    }

    // ---- Auth ----

    function disableForm() {
        var els = form.querySelectorAll('input, textarea, button, select');
        for (var i = 0; i < els.length; i++) { els[i].disabled = true; }
        form.style.opacity = '0.5';
        form.style.pointerEvents = 'none';
    }

    function enableForm() {
        var els = form.querySelectorAll('input, textarea, button, select');
        for (var i = 0; i < els.length; i++) { els[i].disabled = false; }
        form.style.opacity = '1';
        form.style.pointerEvents = 'auto';
    }

    function updateNavForAuth(session) {
        if (!navAuth) return;
        if (session) {
            navAuth.textContent = 'Logout';
            navAuth.href = '#';
            navAuth.onclick = function (e) {
                e.preventDefault();
                waitForSupabase(function () {
                    window.supabase.auth.signOut();
                });
            };
        } else {
            navAuth.textContent = 'Login';
            navAuth.href = 'auth.html';
            navAuth.onclick = null;
        }
    }

    function onSignedIn(session) {
        currentUserId = session.user.id;
        authGate.hidden = true;
        enableForm();
        updateNavForAuth(session);
        loadEntry(dateInput.value);
    }

    function onSignedOut() {
        currentUserId = null;
        authGate.hidden = false;
        disableForm();
        summary.hidden = true;
        updateNavForAuth(null);
    }

    function checkAuth() {
        waitForSupabase(function () {
            window.supabase.auth.getSession().then(function (result) {
                if (result.data && result.data.session) {
                    onSignedIn(result.data.session);
                } else {
                    onSignedOut();
                }
            });
        });
    }

    // Listen for auth state changes (covers magic-link redirect)
    waitForSupabase(function () {
        window.supabase.auth.onAuthStateChange(function (event, session) {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                onSignedIn(session);
            } else if (event === 'SIGNED_OUT') {
                onSignedOut();
            }
        });
    });

    // ---- Event handlers ----

    dateInput.addEventListener('change', function () {
        hideAllBanners();
        loadEntry(dateInput.value);
    });

    editBtn.addEventListener('click', function () {
        showFormMode();
    });

    cancelBtn.addEventListener('click', function () {
        if (currentEntry) {
            // Restore form to match current saved entry
            INDEX_KEYS.forEach(function (key) { setRadioValue(key, currentEntry[key]); });
            reflectionEl.value = currentEntry.reflection || '';
            showSummaryMode(currentEntry);
        } else {
            showNewEntryMode();
        }
    });

    errorRetry.addEventListener('click', function () {
        hideAllBanners();
        saveEntry(dateInput.value);
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveEntry(dateInput.value);
    });

    // ---- Init ----

    dateInput.value = todayLocal();
    dateInput.max = todayLocal();
    renderAllRadios();
    checkAuth();
})();
