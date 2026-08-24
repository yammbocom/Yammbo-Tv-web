// Yammbo TV: identidad de los complementos que gestionamos nosotros.
//
// Vive aparte porque lo necesitan dos sitios que no se importan entre ellos:
// la política de addons (App/App.js) y la pantalla /app/#/addons.

const YAMBO_PREMIUM_ID = 'com.yammbo.premium';
const YAMBO_CATALOG_ID = 'com.yammbo.tv';
const YAMBO_MANAGED_IDS = [YAMBO_PREMIUM_ID, YAMBO_CATALOG_ID];

// Id del catálogo curado propio, tal y como lo declara nuestro manifest en
// `addonCatalogs`. Se usa para quedarnos sólo con él en el selector.
const YAMBO_CATALOG_SELECT_ID = 'yammbo';

/**
 * Complementos que pone y quita el plan, no el usuario.
 *
 * No se comparten: la URL del premium es un token de esta cuenta, y el diálogo
 * de compartir la repartía con un clic. Tampoco se desinstalan a mano: la
 * política los reinstala en el siguiente cambio de estado, así que el botón
 * parecería roto.
 */
function yamboIsManagedAddon(addon) {
    const id = addon && addon.manifest && addon.manifest.id;
    return typeof id === 'string' && YAMBO_MANAGED_IDS.indexOf(id) !== -1;
}

module.exports = {
    YAMBO_PREMIUM_ID,
    YAMBO_CATALOG_ID,
    YAMBO_CATALOG_SELECT_ID,
    YAMBO_MANAGED_IDS,
    yamboIsManagedAddon,
};
