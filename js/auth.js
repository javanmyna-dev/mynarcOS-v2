/**
 * auth.js — Magic-link login page logic
 *
 * Flow:
 *   1. User enters email → click "Send Magic Link"
 *   2. Supabase sends a one-time link to that email
 *   3. User clicks the link → Supabase exchanges the token for a session
 *   4. Supabase redirects to /check-in.html
 */

;(function () {
    'use strict';

    var form = document.getElementById('auth-form');
    var sentState = document.getElementById('auth-sent');
    var errorState = document.getElementById('auth-error');
    var alreadyState = document.getElementById('auth-already');
    var sentEmail = document.getElementById('sent-email');
    var errorMsg = document.getElementById('auth-error-msg');
    var retryBtn = document.getElementById('auth-retry');
    var resendLink = document.getElementById('resend-link');
    var emailInput = document.getElementById('email');
    var submitBtn;

    function waitForSupabase(cb) {
        if (window.supabase) return cb();
        setTimeout(function () { waitForSupabase(cb); }, 100);
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorState.hidden = false;
        form.hidden = false;
        sentState.hidden = true;
        alreadyState.hidden = true;
        if (submitBtn) {
            submitBtn.textContent = 'Send Magic Link';
            submitBtn.disabled = false;
        }
    }

    function sendMagicLink(email) {
        submitBtn = form.querySelector('button');
        submitBtn.textContent = 'Sending\u2026';
        submitBtn.disabled = true;

        waitForSupabase(function () {
            window.supabase.auth.signInWithOtp({
                email: email,
                options: {
                    // GitHub Pages serves from a subdirectory (e.g. /mynarcOS-v2/),
                    // so window.location.origin + '/check-in.html' would point to the
                    // wrong path. Compute the base path from the current page's URL.
                    emailRedirectTo: (function () {
                        var path = window.location.pathname;
                        var base = path.substring(0, path.lastIndexOf('/') + 1);
                        return window.location.origin + base + 'check-in.html';
                    })()
                }
            }).then(function (result) {
                if (result.error) {
                    showError(result.error.message);
                    return;
                }
                // Success — show "check your email"
                sentEmail.textContent = email;
                form.hidden = true;
                sentState.hidden = false;
                errorState.hidden = true;
                alreadyState.hidden = true;
            });
        });
    }

    // ---- Check if already logged in ----

    waitForSupabase(function () {
        window.supabase.auth.getSession().then(function (result) {
            if (result.data && result.data.session) {
                // Already logged in — show redirect
                form.hidden = true;
                alreadyState.hidden = false;
            } else {
                form.hidden = false;
                alreadyState.hidden = true;
            }
        });
    });

    // ---- Event handlers ----

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = emailInput.value.trim();
        if (!email) return;
        sendMagicLink(email);
    });

    retryBtn.addEventListener('click', function () {
        errorState.hidden = true;
    });

    resendLink.addEventListener('click', function (e) {
        e.preventDefault();
        var email = emailInput.value.trim();
        if (email) sendMagicLink(email);
    });
})();
