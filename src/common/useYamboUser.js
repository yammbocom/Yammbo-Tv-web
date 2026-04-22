// Yammbo TV: hook centralizado para el usuario Laravel/Wave (window.YAMBO_USER).
// - Toma el valor inicial de window.YAMBO_USER (inyectado por /app en server-side).
// - Si no hay (SW cache stale o sesión expirada), intenta /api/app-tv/whoami una vez.
// - Notifica a todos los consumers vía listener set → evita que NavMenu/StreamsList
//   queden desincronizados (el botón Premium mostrándose a veces sí a veces no).
// - Expone setYamboUser para que YamboLibrary/Calendar/otros puedan actualizar el
//   cache global cuando llaman whoami por su cuenta.

const { useState, useEffect } = require('react');

let cached = null;
let fetched = false;
let fetching = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
    cached = window.YAMBO_USER || null;
}

function hasSubscriptionField(u) {
    return !!u && typeof u.subscription_active === 'boolean';
}

function setYamboUser(u) {
    cached = u || null;
    if (typeof window !== 'undefined') {
        window.YAMBO_USER = cached;
    }
    listeners.forEach(function (fn) {
        try { fn(cached); } catch (e) { /* ignore */ }
    });
}

function ensureWhoami() {
    if (fetching) return fetching;
    if (fetched) return Promise.resolve(cached);
    // Si ya tenemos user con subscription field, asume válido y no re-consulta.
    if (cached && cached.id && hasSubscriptionField(cached)) {
        fetched = true;

        return Promise.resolve(cached);
    }
    fetching = fetch('/api/app-tv/whoami', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            fetched = true;
            fetching = null;
            if (d && d.user && d.user.id) {
                setYamboUser(d.user);
            } else {
                // Sin sesión — cache stays as null (a menos que haya algo inyectado)
                if (!cached) setYamboUser(null);
            }

            return cached;
        })
        .catch(function () {
            fetching = null;
            // Error de red — no borrar cache, sólo dejar que siguiente intento reintente
            return cached;
        });

    return fetching;
}

function useYamboUser() {
    const [user, setUser] = useState(cached);
    useEffect(function () {
        listeners.add(setUser);

        return function () { listeners.delete(setUser); };
    }, []);
    useEffect(function () {
        // Trigger whoami fetch si no tenemos user o si falta subscription field
        if (!cached || !hasSubscriptionField(cached)) {
            ensureWhoami();
        }
    }, []);

    return user;
}

function getYamboUserSync() {
    return cached;
}

module.exports = useYamboUser;
module.exports.useYamboUser = useYamboUser;
module.exports.setYamboUser = setYamboUser;
module.exports.getYamboUserSync = getYamboUserSync;
module.exports.ensureWhoami = ensureWhoami;
