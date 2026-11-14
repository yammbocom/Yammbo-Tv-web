// Yammbo TV: iPhone, iPod o iPad. Platform/device.ts clasifica el iPad como
// 'visionos' (Safari en iPadOS manda un UA de "Macintosh" con 5 puntos táctiles,
// igual que Vision Pro), así que no sirve para elegir la guía de instalación iOS.
const yamboIsIOS = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
};

module.exports = yamboIsIOS;
