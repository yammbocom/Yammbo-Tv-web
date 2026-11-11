// Yammbo TV: navegación por hash sin apilar entradas en el historial.
//
// Cada `window.location = '#/...'` añade una entrada. Cambiar de pestaña o de
// filtro (tipo, catálogo, género) apilaba una por toque, y en el móvil el botón
// atrás tenía que deshacerlas una a una: "hay que darle 2 o 3 veces".

// Rutas raíz: las pestañas de la barra de navegación.
const ROOT_ROUTE = /^#?\/?(?:(?:board|tv|discover|library|addons|settings|search)(?:\/.*)?)?(?:\?.*)?$/;
const HOME_ROUTE = /^#?\/?(?:board)?(?:\?.*)?$/;

const isRootRoute = (hash) => ROOT_ROUTE.test(hash);
const isHomeRoute = (hash) => HOME_ROUTE.test(hash);

// Marca cada entrada nueva del historial con {yamboEntry, yamboFromHome}.
// Una entrada con `state === null` en un `hashchange` es nueva (push); una ya
// marcada es una vuelta atrás/adelante. Así la marca de "vengo del inicio" la
// lleva cualquier camino que salga del inicio (barra de búsqueda, menú,
// atajos de teclado), no solo la barra de pestañas.
let lastHash = typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/';
const markEntry = (fromHome) => {
    window.history.replaceState({ yamboEntry: true, yamboFromHome: fromHome }, '');
};
if (typeof window !== 'undefined') {
    if (window.history.state === null) {
        markEntry(false);
    }
    window.addEventListener('hashchange', () => {
        const current = window.location.hash || '#/';
        if (window.history.state === null) {
            markEntry(isHomeRoute(lastHash) && !isHomeRoute(current) && isRootRoute(current));
        }
        lastHash = current;
    });
}

// Como `location.replace(href)`, pero conservando `history.state` (ahí va la
// marca de "vengo del inicio"). replaceState no dispara `hashchange`, y el
// router vive de ese evento, así que se emite a mano.
const replaceHash = (href) => {
    const url = new URL(href, window.location.href);
    if (url.href === window.location.href) {
        return;
    }
    const oldURL = window.location.href;
    window.history.replaceState(window.history.state, '', url.href);
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: url.href }));
};

// Clic en una pestaña. Deja el historial como en una app: [inicio, pestaña].
// Desde el inicio se apila una entrada; entre pestañas se reemplaza; volver al
// inicio desde una pestaña que salió de él es un `back()`. Devuelve true si se
// encargó de la navegación (el llamador hace preventDefault).
const navigateTab = (href) => {
    if (typeof href !== 'string' || !href.startsWith('#')) {
        return false;
    }
    const current = window.location.hash || '#/';
    if (!isRootRoute(current)) {
        return false;
    }
    if (current === href) {
        return true;
    }
    if (isHomeRoute(current)) {
        // La marca la pone el listener de `hashchange`.
        window.location.href = href;
        return true;
    }
    const fromHome = !!(window.history.state && window.history.state.yamboFromHome);
    if (isHomeRoute(href) && fromHome) {
        window.history.back();
        return true;
    }
    replaceHash(href);
    return true;
};

module.exports = {
    isRootRoute,
    isHomeRoute,
    replaceHash,
    navigateTab
};
