// Copyright (C) 2017-2023 Smart code 203358507

require('spatial-navigation-polyfill');
const React = require('react');
const { useTranslation } = require('react-i18next');
const { Router } = require('stremio-router');
const { Core, Shell, Chromecast, DragAndDrop, KeyboardShortcuts, ServicesProvider } = require('stremio/services');
const { NotFound } = require('stremio/routes');
const { FileDropProvider, PlatformProvider, ToastProvider, TooltipProvider, ShortcutsProvider, CONSTANTS, withCoreSuspender, useShell, useBinaryState } = require('stremio/common');
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
// - Siempre uninstall: YouTube, Public Domain Movies (no son necesarios en nuestro producto)
// - Premium: uninstall WatchHub (oculta proveedores de compra/alquiler) + install AIOStreams
// - Free: mantener WatchHub; NO install AIOStreams
const YAMBO_AIOSTREAMS_URL = 'https://aiostreams.fortheweak.cloud/stremio/fd8676f2-b99a-40cd-ae92-1c51e754d157/eyJpIjoiT2xoaFdJcUFVYW83YnJZTFkzRzVwdz09IiwiZSI6IlQrZDFhTjM3Q1d1TndWTTZDeXphQTNTNHNiZ2ZnUjJ2U2tVMjlQSlV0ZzA9IiwidCI6ImEifQ/manifest.json';
const YAMBO_AIOSTREAMS_ID = 'aiostreams.viren070.com.fd8676f2-b99';
const YAMBO_REMOVE_ALWAYS_IDS = ['com.linvo.stremiochannels', 'org.stremio.pubdomainmovies'];
const YAMBO_REMOVE_PREMIUM_IDS = ['org.stremio.watchhub'];

let yamboAioInstalling = false;

function yamboGetSubscriptionActive() {
    try {
        const yu = (typeof window !== 'undefined') ? window.YAMBO_USER : null;
        return !!(yu && yu.subscription_active);
    } catch (e) { return false; }
}

function yamboApplyAddonPolicy(core, addons) {
    if (!core || !core.transport || !Array.isArray(addons)) return;
    const premium = yamboGetSubscriptionActive();
    const toRemoveIds = premium
        ? YAMBO_REMOVE_ALWAYS_IDS.concat(YAMBO_REMOVE_PREMIUM_IDS)
        : YAMBO_REMOVE_ALWAYS_IDS.slice();

    addons.forEach((addon) => {
        const id = addon && addon.manifest && addon.manifest.id;
        if (id && toRemoveIds.indexOf(id) !== -1) {
            core.transport.dispatch({ action: 'Ctx', args: { action: 'UninstallAddon', args: addon } });
        }
    });

    const hasAio = addons.some((a) => a && a.manifest && a.manifest.id === YAMBO_AIOSTREAMS_ID);
    if (premium && !hasAio && !yamboAioInstalling) {
        yamboAioInstalling = true;
        fetch(YAMBO_AIOSTREAMS_URL, { credentials: 'omit' })
            .then((r) => r.ok ? r.json() : null)
            .then((manifest) => {
                if (!manifest) { yamboAioInstalling = false; return; }
                const descriptor = {
                    manifest: manifest,
                    transportUrl: YAMBO_AIOSTREAMS_URL,
                    flags: { official: false, protected: false }
                };
                core.transport.dispatch({ action: 'Ctx', args: { action: 'InstallAddon', args: descriptor } });
                setTimeout(() => { yamboAioInstalling = false; }, 5000);
            })
            .catch(() => { yamboAioInstalling = false; });
    } else if (!premium && hasAio) {
        const aio = addons.find((a) => a && a.manifest && a.manifest.id === YAMBO_AIOSTREAMS_ID);
        if (aio) {
            core.transport.dispatch({ action: 'Ctx', args: { action: 'UninstallAddon', args: aio } });
        }
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
