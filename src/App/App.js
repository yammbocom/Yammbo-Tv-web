// Copyright (C) 2017-2023 Smart code 203358507

require('spatial-navigation-polyfill');
const React = require('react');
const { useTranslation } = require('react-i18next');
const { Router } = require('stremio-router');
const { Core, Shell, Chromecast, DragAndDrop, KeyboardShortcuts, ServicesProvider } = require('stremio/services');
const { NotFound } = require('stremio/routes');
const { FileDropProvider, PlatformProvider, ToastProvider, TooltipProvider, ShortcutsProvider, CONSTANTS, withCoreSuspender, useShell, useBinaryState, useYamboUser } = require('stremio/common');
const { ensureWhoami } = require('stremio/common/useYamboUser');
const ServicesToaster = require('./ServicesToaster');
const DeepLinkHandler = require('./DeepLinkHandler');
const SearchParamsHandler = require('./SearchParamsHandler');
const { default: UpdaterBanner } = require('./UpdaterBanner');
const { default: ShortcutsModal } = require('./ShortcutsModal');
const ErrorDialog = require('./ErrorDialog');
const withProtectedRoutes = require('./withProtectedRoutes');
const routerViewsConfig = require('./routerViewsConfig');
const styles = require('./styles');

const RouterWithProtectedRoutes = withCoreSuspender(withProtectedRoutes(Router));

// Yammbo TV: política de addons según suscripción.
//
// - Siempre uninstall: YouTube, Public Domain Movies (no pintan nada aquí).
// - Premium: uninstall WatchHub (oculta proveedores de compra/alquiler) e
//   instala el addon de streams premium.
// - Free: mantener WatchHub; nada de streams premium.
// - Siempre install: nuestro addon de catálogo, que es el que declara
//   `addonCatalogs` y por tanto el que hace aparecer la pestaña "Yammbo" en
//   /app/#/addons.
//
// La URL del addon premium ya NO vive aquí. Estaba escrita en este fichero, o
// sea que viajaba en el bundle y acababa en el descriptor instalado: el diálogo
// "Compartir complemento" la enseñaba entera, con botones de Facebook, X y
// Reddit. Ahora el backend devuelve /aio/{token}/manifest.json, distinta para
// cada cuenta y revocable.
const { YAMBO_PREMIUM_ID, YAMBO_CATALOG_ID } = require('stremio/common/yamboAddons');

const YAMBO_CATALOG_URL = (typeof window !== 'undefined' ? window.location.origin : '') + '/manifest.json';
// Instalaciones de antes del proxy: llevaban la URL del proveedor dentro.
const YAMBO_LEGACY_PREMIUM = /aiostreams/i;
const YAMBO_REMOVE_ALWAYS_IDS = ['com.linvo.stremiochannels', 'org.stremio.pubdomainmovies'];
const YAMBO_REMOVE_PREMIUM_IDS = ['org.stremio.watchhub'];

function yamboGetSubscriptionActive() {
    try {
        const yu = (typeof window !== 'undefined') ? window.YAMBO_USER : null;
        return !!(yu && yu.subscription_active);
    } catch (e) { return false; }
}

// Un dispatch por acción y descriptor, y a otra cosa.
//
// La política corre desde dos sitios (el listener de `ctx` y el efecto que
// reacciona al estado de suscripción). Los dos recibían el mismo array de
// addons todavía sin refrescar, así que el segundo UninstallAddon caía sobre un
// addon ya retirado y el core respondía con el toast rojo
// "AddonUninstalled — Addon is not installed" nada más entrar en la app.
const yamboDispatched = new Set();

function yamboDispatchOnce(core, action, descriptor) {
    if (!core || !core.transport || !descriptor) return false;
    const key = action + '|' + (descriptor.transportUrl || '');
    if (yamboDispatched.has(key)) return false;
    yamboDispatched.add(key);
    // Se suelta a los 10 s: para entonces el estado ya se refrescó, y una acción
    // legítima posterior (reinstalar tras renovar el plan) vuelve a pasar.
    setTimeout(() => { yamboDispatched.delete(key); }, 10000);
    core.transport.dispatch({ action: 'Ctx', args: { action, args: descriptor } });
    return true;
}

// La URL tokenizada del addon premium. Se pide una vez y se cachea; el efecto
// de suscripción la invalida cuando el plan cambia, para no quedarse con un
// null de cuando el usuario todavía no era premium.
let yamboPremiumUrlPromise = null;

function yamboPremiumUrl() {
    if (!yamboPremiumUrlPromise) {
        yamboPremiumUrlPromise = fetch('/api/app-tv/addon-url', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => (j && j.active && typeof j.url === 'string' ? j.url : null))
            .catch(() => null);
    }
    return yamboPremiumUrlPromise;
}

function yamboResetPremiumUrl() {
    yamboPremiumUrlPromise = null;
}

function yamboInstallFromUrl(core, url) {
    if (typeof url !== 'string' || url.length === 0) return;
    fetch(url, { credentials: 'omit' })
        .then((r) => (r.ok ? r.json() : null))
        .then((manifest) => {
            if (!manifest) return;
            yamboDispatchOnce(core, 'InstallAddon', {
                manifest: manifest,
                transportUrl: url,
                flags: { official: false, protected: false }
            });
        })
        .catch(() => { /* best-effort: sin streams premium, pero la app sigue */ });
}

function yamboApplyAddonPolicy(core, addons, premiumOverride) {
    if (!core || !core.transport || !Array.isArray(addons)) return;
    const premium = typeof premiumOverride === 'boolean' ? premiumOverride : yamboGetSubscriptionActive();
    const toRemoveIds = premium
        ? YAMBO_REMOVE_ALWAYS_IDS.concat(YAMBO_REMOVE_PREMIUM_IDS)
        : YAMBO_REMOVE_ALWAYS_IDS.slice();

    addons.forEach((addon) => {
        const id = (addon && addon.manifest && addon.manifest.id) || '';
        const url = (addon && addon.transportUrl) || '';
        const legacy = YAMBO_LEGACY_PREMIUM.test(id) || YAMBO_LEGACY_PREMIUM.test(url);
        if (toRemoveIds.indexOf(id) !== -1 || legacy) {
            yamboDispatchOnce(core, 'UninstallAddon', addon);
        }
    });

    if (!addons.some((a) => a && a.manifest && a.manifest.id === YAMBO_CATALOG_ID)) {
        yamboInstallFromUrl(core, YAMBO_CATALOG_URL);
    }

    const premiumAddon = addons.find((a) => a && a.manifest && a.manifest.id === YAMBO_PREMIUM_ID);
    if (premium && !premiumAddon) {
        yamboPremiumUrl().then((url) => { yamboInstallFromUrl(core, url); });
    } else if (!premium && premiumAddon) {
        yamboDispatchOnce(core, 'UninstallAddon', premiumAddon);
    }
}

const App = () => {
    const { i18n } = useTranslation();
    const shell = useShell();
    const onPathNotMatch = React.useCallback(() => {
        return NotFound;
    }, []);
    const services = React.useMemo(() => {
        const core = new Core({
            appVersion: process.env.VERSION,
            shellVersion: null
        });
        return {
            core,
            shell: new Shell(),
            chromecast: new Chromecast(),
            keyboardShortcuts: new KeyboardShortcuts(),
            dragAndDrop: new DragAndDrop({ core })
        };
    }, []);
    const [initialized, setInitialized] = React.useState(false);
    const [shortcutModalOpen,, closeShortcutsModal, toggleShortcutModal] = useBinaryState(false);
    const yamboUser = useYamboUser();

    // Yammbo TV: re-aplica política de addons cuando cambia el estado de suscripción
    // (ej. whoami resuelve DESPUÉS del primer onCtxState y revela premium=true).
    React.useEffect(() => {
        if (!initialized || !services.core.active) return;
        const premium = !!(yamboUser && yamboUser.subscription_active);
        // El plan acaba de cambiar: la URL tokenizada cacheada puede ser de
        // cuando el usuario todavía no era premium (y por tanto null).
        yamboResetPremiumUrl();
        services.core.transport.getState('ctx')
            .then((state) => {
                if (state && state.profile && Array.isArray(state.profile.addons)) {
                    yamboApplyAddonPolicy(services.core, state.profile.addons, premium);
                }
            })
            .catch(() => {});
    }, [initialized, yamboUser && yamboUser.subscription_active]);

    // Yammbo TV: set the streaming server cache to 10 GiB once (server default is 2 GiB).
    // Polls until the local server connects, then respects any later manual change.
    React.useEffect(() => {
        if (!initialized || !services.core.active) return;
        if (typeof localStorage === 'undefined' || localStorage.getItem('yambo_cache_synced_v1') === '1') return;
        var DESIRED_CACHE = 10737418240;
        var done = false;
        var trySet = function () {
            if (done) return;
            services.core.transport.getState('streaming_server').then(function (st) {
                if (done) return;
                if (st && st.settings && st.settings.type === 'Ready' && st.settings.content) {
                    if (st.settings.content.cacheSize !== DESIRED_CACHE) {
                        services.core.transport.dispatch({
                            action: 'StreamingServer',
                            args: { action: 'UpdateSettings', args: Object.assign({}, st.settings.content, { cacheSize: DESIRED_CACHE }) }
                        });
                    }
                    try { localStorage.setItem('yambo_cache_synced_v1', '1'); } catch (e) {}
                    done = true;
                }
            }).catch(function () {});
        };
        var iv = setInterval(trySet, 2000);
        trySet();
        var to = setTimeout(function () { clearInterval(iv); }, 30000);
        return function () { done = true; clearInterval(iv); clearTimeout(to); };
    }, [initialized]);

    const onShortcut = React.useCallback((name) => {
        if (name === 'shortcuts') {
            toggleShortcutModal();
        }
    }, [toggleShortcutModal]);

    React.useEffect(() => {
        let prevPath = window.location.hash.slice(1);
        const onLocationHashChange = () => {
            if (services.core.active) {
                services.core.transport.analytics({
                    event: 'LocationPathChanged',
                    args: { prevPath }
                });
            }
            prevPath = window.location.hash.slice(1);
        };
        window.addEventListener('hashchange', onLocationHashChange);
        return () => {
            window.removeEventListener('hashchange', onLocationHashChange);
        };
    }, []);
    React.useEffect(() => {
        const onCoreStateChanged = () => {
            setInitialized(
                (services.core.active || services.core.error instanceof Error) &&
                (services.shell.active || services.shell.error instanceof Error)
            );
        };
        const onShellStateChanged = () => {
            setInitialized(
                (services.core.active || services.core.error instanceof Error) &&
                (services.shell.active || services.shell.error instanceof Error)
            );
        };
        const onChromecastStateChange = () => {
            if (services.chromecast.active) {
                services.chromecast.transport.setOptions({
                    receiverApplicationId: CONSTANTS.CHROMECAST_RECEIVER_APP_ID,
                    autoJoinPolicy: chrome.cast.AutoJoinPolicy.PAGE_SCOPED,
                    resumeSavedSession: false,
                    language: null,
                    androidReceiverCompatible: true
                });
            }
        };
        services.core.on('stateChanged', onCoreStateChanged);
        services.shell.on('stateChanged', onShellStateChanged);
        services.chromecast.on('stateChanged', onChromecastStateChange);
        services.core.start();
        services.shell.start();
        services.chromecast.start();
        services.keyboardShortcuts.start();
        services.dragAndDrop.start();
        window.services = services;
        return () => {
            services.core.stop();
            services.shell.stop();
            services.chromecast.stop();
            services.keyboardShortcuts.stop();
            services.dragAndDrop.stop();
            services.core.off('stateChanged', onCoreStateChanged);
            services.shell.off('stateChanged', onShellStateChanged);
            services.chromecast.off('stateChanged', onChromecastStateChange);
        };
    }, []);

    // Handle shell events
    React.useEffect(() => {
        const onOpenMedia = (data) => {
            try {
                const { protocol, hostname, pathname, searchParams } = new URL(data);
                if (protocol === CONSTANTS.PROTOCOL) {
                    if (hostname.length) {
                        const transportUrl = `https://${hostname}${pathname}`;
                        window.location.href = `#/addons?addon=${encodeURIComponent(transportUrl)}`;
                    } else {
                        window.location.href = `#${pathname}?${searchParams.toString()}`;
                    }
                }
            } catch (e) {
                console.error('Failed to open media:', e);
            }
        };

        shell.on('open-media', onOpenMedia);

        return () => {
            shell.off('open-media', onOpenMedia);
        };
    }, []);

    React.useEffect(() => {
        const onCoreEvent = ({ event, args }) => {
            switch (event) {
                case 'SettingsUpdated': {
                    if (args && args.settings && typeof args.settings.interfaceLanguage === 'string') {
                        i18n.changeLanguage(args.settings.interfaceLanguage);
                    }

                    if (args?.settings?.quitOnClose && shell.windowClosed) {
                        shell.send('quit');
                    }

                    break;
                }
            }
        };
        const onCtxState = (state) => {
            if (state && state.profile && state.profile.settings && typeof state.profile.settings.interfaceLanguage === 'string') {
                i18n.changeLanguage(state.profile.settings.interfaceLanguage);
            }

            if (state?.profile?.settings?.quitOnClose && shell.windowClosed) {
                shell.send('quit');
            }

            // Yammbo TV: curación de addons según estado de suscripción
            try {
                yamboApplyAddonPolicy(services.core, state && state.profile ? state.profile.addons : null);
            } catch (e) { /* best-effort */ }

            // Yammbo TV: sync one-time de interfaceLanguage + subtitlesLanguage
            // + audioLanguage desde el locale del usuario (window.YAMBO_USER.locale)
            // o navigator.language. Sólo se ejecuta una vez por cliente — si el
            // usuario cambia idioma a mano en Settings, no lo sobreescribimos.
            try {
                var SYNC_KEY = 'yambo_lang_synced_v1';
                if (state && state.profile && state.profile.settings
                    && typeof localStorage !== 'undefined'
                    && localStorage.getItem(SYNC_KEY) !== '1') {

                    var yu = (typeof window !== 'undefined') ? window.YAMBO_USER : null;
                    var navLang = (typeof navigator !== 'undefined')
                        ? (navigator.language || (navigator.languages && navigator.languages[0]))
                        : null;
                    var raw = (yu && yu.locale) ? yu.locale : navLang;
                    var short = (raw ? String(raw).split('-')[0].toLowerCase() : 'en');
                    var toBcp47 = {
                        'es': 'es-ES', 'en': 'en-US', 'pt': 'pt-BR', 'fr': 'fr-FR',
                        'de': 'de-DE', 'it': 'it-IT', 'nl': 'nl-NL', 'pl': 'pl-PL',
                        'ru': 'ru-RU', 'tr': 'tr-TR'
                    };
                    var toIso3 = {
                        'es': 'spa', 'en': 'eng', 'pt': 'por', 'fr': 'fre',
                        'de': 'ger', 'it': 'ita', 'nl': 'nld', 'pl': 'pol',
                        'ru': 'rus', 'tr': 'tur', 'ja': 'jpn', 'ko': 'kor',
                        'zh': 'chi', 'ar': 'ara', 'hi': 'hin'
                    };
                    var desired = {
                        interfaceLanguage: toBcp47[short] || 'en-US',
                        subtitlesLanguage: toIso3[short] || 'eng',
                        audioLanguage: toIso3[short] || 'eng'
                    };
                    var current = state.profile.settings;
                    var diff = (current.interfaceLanguage !== desired.interfaceLanguage)
                        || (current.subtitlesLanguage !== desired.subtitlesLanguage)
                        || (current.audioLanguage !== desired.audioLanguage);
                    if (diff) {
                        services.core.transport.dispatch({
                            action: 'Ctx',
                            args: {
                                action: 'UpdateSettings',
                                args: Object.assign({}, current, desired)
                            }
                        });
                        i18n.changeLanguage(desired.interfaceLanguage);
                    }
                    localStorage.setItem(SYNC_KEY, '1');
                }
            } catch (e) { /* best-effort only */ }
        };
        const onWindowFocus = () => {
            services.core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: 'PullAddonsFromAPI'
                }
            });
            services.core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: 'PullUserFromAPI',
                    args: {}
                }
            });
            services.core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: 'SyncLibraryWithAPI'
                }
            });
            services.core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: 'PullNotifications'
                }
            });
        };
        if (services.core.active) {
            onWindowFocus();
            window.addEventListener('focus', onWindowFocus);
            services.core.transport.on('CoreEvent', onCoreEvent);
            services.core.transport
                .getState('ctx')
                .then(onCtxState)
                .catch(console.error);
        }
        return () => {
            if (services.core.active) {
                window.removeEventListener('focus', onWindowFocus);
                services.core.transport.off('CoreEvent', onCoreEvent);
            }
        };
    }, [initialized, shell.windowClosed]);
    return (
        <React.StrictMode>
            <ServicesProvider services={services}>
                {
                    initialized ?
                        services.core.error instanceof Error ?
                            <ErrorDialog className={styles['error-container']} />
                            :
                            <PlatformProvider>
                                <ToastProvider className={styles['toasts-container']}>
                                    <TooltipProvider className={styles['tooltip-container']}>
                                        <FileDropProvider className={styles['file-drop-container']}>
                                            <ShortcutsProvider onShortcut={onShortcut}>
                                                {
                                                    shortcutModalOpen && <ShortcutsModal onClose={closeShortcutsModal}/>
                                                }
                                                <ServicesToaster />
                                                <DeepLinkHandler />
                                                <SearchParamsHandler />
                                                <UpdaterBanner className={styles['updater-banner-container']} />
                                                <RouterWithProtectedRoutes
                                                    className={styles['router']}
                                                    viewsConfig={routerViewsConfig}
                                                    onPathNotMatch={onPathNotMatch}
                                                />
                                            </ShortcutsProvider>
                                        </FileDropProvider>
                                    </TooltipProvider>
                                </ToastProvider>
                            </PlatformProvider>
                        :
                        <div className={styles['loader-container']} />
                }
            </ServicesProvider>
        </React.StrictMode>
    );
};

module.exports = App;
