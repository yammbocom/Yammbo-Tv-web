// Copyright (C) 2017-2023 Smart code 203358507

if (typeof process.env.SENTRY_DSN === 'string') {
    const Sentry = require('@sentry/browser');
    Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const Bowser = require('bowser');
const browser = Bowser.parse(window.navigator?.userAgent || '');
if (browser?.platform?.type === 'desktop') {
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', '');
}

const React = require('react');
const ReactDOM = require('react-dom/client');
const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');
const stremioTranslations = require('stremio-translations');
const App = require('./App');
const { ensureWhoami } = require('stremio/common/useYamboUser');

// Yammbo TV: dispara /api/app-tv/whoami ASAP para que el estado de suscripción
// esté disponible antes del primer render del NavMenu/StreamsList. Si window.YAMBO_USER
// ya tiene subscription_active (ruta /app inyectó el script), ensureWhoami es no-op.
ensureWhoami();

// Yammbo TV: claves propias y parches sobre stremio-translations.
//
// Van aqui y no dentro del paquete para que sobrevivan a un `pnpm install`.
// `ADDON_YAMMBO` es obligatoria: sin ella el selector de catalogos mostraria
// "YAMMBO" en mayusculas, porque el fallback de stringWithPrefix solo capitaliza
// la primera letra de la clave.
const yamboTranslationOverrides = {
    'en-US': {
        ADDON_YAMMBO: 'Yammbo picks',
        YAMBO_AND: 'and',
        YAMBO_ADDON_MANAGED: 'Included in your plan',
        TYPE_anime: 'Anime',
        TYPE_collections: 'Collections',
        TYPE_events: 'Events',
        TYPE_music: 'Music',
    },
    'es-ES': {
        ADDON_YAMMBO: 'Selección Yammbo',
        YAMBO_AND: 'y',
        YAMBO_ADDON_MANAGED: 'Incluido en tu plan',
        TYPE_anime: 'Anime',
        TYPE_collections: 'Colecciones',
        TYPE_events: 'Eventos',
        TYPE_music: 'Música',
    },
    'pt-BR': {
        ADDON_YAMMBO: 'Seleção Yammbo',
        YAMBO_AND: 'e',
        YAMBO_ADDON_MANAGED: 'Incluído no seu plano',
        TYPE_anime: 'Anime',
        TYPE_collections: 'Coleções',
        TYPE_events: 'Eventos',
        TYPE_music: 'Música',
    },
    'fr-FR': {
        ADDON_YAMMBO: 'Sélection Yammbo',
        YAMBO_AND: 'et',
        YAMBO_ADDON_MANAGED: 'Inclus dans votre forfait',
        TYPE_anime: 'Anime',
        TYPE_collections: 'Collections',
        TYPE_events: 'Événements',
        TYPE_music: 'Musique',
    },
};

const translations = Object.fromEntries(Object.entries(stremioTranslations()).map(([key, value]) => {
    const translation = Object.assign({}, value);
    const overrides = yamboTranslationOverrides[key] || yamboTranslationOverrides['en-US'];
    Object.keys(overrides).forEach((k) => {
        // Las nuestras siempre mandan. Las TYPE_ solo rellenan huecos: si el
        // paquete ya trae ese tipo traducido a este idioma, su version es mejor
        // que la nuestra en ingles.
        if (k.indexOf('TYPE_') !== 0 || typeof translation[k] !== 'string') {
            translation[k] = overrides[k];
        }
    });
    return [key, { translation }];
}));

// Yammbo TV: auto-detectar idioma desde (1) window.YAMBO_USER.locale,
// (2) navigator.language, fallback 'en-US'. Código usado aquí = BCP-47
// (stremio-translations: en-US, es-ES, pt-BR, fr-FR, de-DE, it-IT, ...).
const yamboDetectInterfaceLanguage = function () {
    try {
        var available = Object.keys(translations);
        var shortMap = {
            'es': 'es-ES', 'en': 'en-US', 'pt': 'pt-BR', 'fr': 'fr-FR',
            'de': 'de-DE', 'it': 'it-IT', 'nl': 'nl-NL', 'pl': 'pl-PL',
            'ru': 'ru-RU', 'ar': 'ar-AR', 'tr': 'tr-TR', 'ja': 'ja-JP',
            'ko': 'ko-KR', 'zh': 'zh-CN', 'cs': 'cs-CZ', 'el': 'el-GR',
            'he': 'he-IL', 'hi': 'hi-IN', 'hr': 'hr-HR', 'hu': 'hu-HU',
            'id': 'id-ID', 'ro': 'ro-RO', 'sv': 'sv-SE', 'th': 'th-TH',
            'uk': 'uk-UA', 'vi': 'vi-VN', 'bg': 'bg-BG', 'da': 'da-DK',
            'fi': 'fi-FI', 'no': 'no-NO', 'sk': 'sk-SK', 'sl': 'sl-SI'
        };
        var tryCandidate = function (raw) {
            if (!raw) return null;
            raw = String(raw);
            if (available.indexOf(raw) !== -1) return raw;
            var short = raw.split('-')[0].toLowerCase();
            if (shortMap[short] && available.indexOf(shortMap[short]) !== -1) return shortMap[short];
            var pref = available.find(function (c) { return c.toLowerCase().indexOf(short + '-') === 0; });
            return pref || null;
        };
        var yu = (typeof window !== 'undefined') ? window.YAMBO_USER : null;
        var yamboLocale = (yu && yu.locale) ? yu.locale : null;
        var navLang = (typeof navigator !== 'undefined') ? (navigator.language || (navigator.languages && navigator.languages[0])) : null;
        return tryCandidate(yamboLocale) || tryCandidate(navLang) || 'en-US';
    } catch (e) { return 'en-US'; }
};

const yamboInitialLang = yamboDetectInterfaceLanguage();

i18n
    .use(initReactI18next)
    .init({
        resources: translations,
        lng: yamboInitialLang,
        fallbackLng: 'en-US',
        interpolation: {
            escapeValue: false
        }
    });

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<App />);

if (process.env.NODE_ENV === 'production' && process.env.SERVICE_WORKER_DISABLED !== 'true' && process.env.SERVICE_WORKER_DISABLED !== true && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .catch((registrationError) => {
                console.error('SW registration failed: ', registrationError);
            });
    });
}
