// Yammbo TV: textos del aviso "Hazte Premium" que sustituye a la reproduccion
// (ficha, reproductor y TV en vivo) cuando la cuenta no es Premium.
//
// Vive aparte porque lo usan tres pantallas que no se importan entre ellas.

const YAMBO_PAYWALL = {
    en: { title: 'Go Premium to watch', sub: 'Activate your subscription and watch the whole catalog on the web, mobile and TV.', button: 'Activate subscription', back: 'Back', close: 'Close' },
    es: { title: 'Hazte Premium para verlo', sub: 'Activa tu suscripción y mira todo el catálogo en la web, el móvil y la TV.', button: 'Activar suscripción', back: 'Volver', close: 'Cerrar' },
    pt: { title: 'Seja Premium para assistir', sub: 'Ative sua assinatura e assista a todo o catálogo na web, no celular e na TV.', button: 'Ativar assinatura', back: 'Voltar', close: 'Fechar' },
    fr: { title: 'Passez Premium pour regarder', sub: 'Activez votre abonnement et regardez tout le catalogue sur le web, le mobile et la TV.', button: 'Activer l\'abonnement', back: 'Retour', close: 'Fermer' },
};

const yamboPaywallText = (language) => {
    return YAMBO_PAYWALL[String(language || 'en').split('-')[0].toLowerCase()] || YAMBO_PAYWALL.en;
};

module.exports = { YAMBO_PAYWALL, yamboPaywallText };
