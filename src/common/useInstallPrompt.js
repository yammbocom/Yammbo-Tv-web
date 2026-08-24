// Yammbo TV: instalar la app (PWA) desde el propio menú.
//
// La web YA era instalable (manifest + service worker + HTTPS), pero no había
// forma de enterarse: Chrome solo enseña un icono discreto en la barra de
// direcciones, y en la app instalada no se ve nada. Este hook expone el
// "beforeinstallprompt" para poder ofrecerlo con un botón de verdad.
//
// 🚨 La captura es a nivel de MÓDULO, no dentro del hook: el navegador dispara
// el evento muy pronto, a menudo antes de que monte React. Si se espera al
// primer render, el evento ya pasó y el botón no aparecería nunca.

const React = require('react');

let deferredPrompt = null;
let installed = false;
const listeners = new Set();

const notify = () => {
    listeners.forEach((listener) => {
        try { listener(); } catch (_) { /* un consumidor roto no tumba al resto */ }
    });
};

const isStandalone = () => {
    try {
        return !!(
            window.navigator.standalone ||
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: window-controls-overlay)').matches
        );
    } catch (_) { return false; }
};

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
        // Sin preventDefault, Chrome enseña su propia mini-barra. La queremos
        // nosotros, en el menú, con nuestro texto.
        event.preventDefault();
        deferredPrompt = event;
        notify();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        installed = true;
        notify();
    });
}

const readState = () => ({
    canInstall: deferredPrompt !== null && !installed,
    isInstalled: installed || isStandalone(),
});

const useInstallPrompt = () => {
    const [state, setState] = React.useState(readState);

    React.useEffect(() => {
        const listener = () => setState(readState());
        listeners.add(listener);
        // Relee al montar por si el evento llegó entre el render y el efecto.
        listener();
        return () => { listeners.delete(listener); };
    }, []);

    const promptInstall = React.useCallback(() => {
        const prompt = deferredPrompt;
        if (!prompt) return;
        // El evento es de un solo uso: llamar a prompt() dos veces lanza error.
        // Se suelta pase lo que pase; si el usuario cancela, el navegador
        // vuelve a ofrecerlo en la siguiente carga.
        deferredPrompt = null;
        notify();
        try {
            prompt.prompt();
        } catch (_) { /* ya consumido */ }
    }, []);

    return { canInstall: state.canInstall, isInstalled: state.isInstalled, promptInstall };
};

module.exports = useInstallPrompt;
