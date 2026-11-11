// Yammbo Tv override of @stremio/stremio-video/src/HTMLVideo/getContentType.js
// (see patches/README.md). HTMLVideo only hands a stream to hls.js when this
// returns exactly 'application/vnd.apple.mpegurl'; anything else goes to
// <video src>. Live TV servers answer the HEAD with many spellings of the HLS
// type ('application/x-mpegURL', '...; charset=utf-8': ~18% of channels), with
// a generic type, or refuse HEAD, and the native HLS of Chrome 150 fails on
// streams hls.js plays ("Video is not supported", e.g. Cartoon Network).
// So HLS types are normalised, and a path ending in .m3u8 is HLS whenever the
// HEAD got an answer (which proves CORS, all hls.js needs). Browsers without
// native HLS skip the HEAD for .m3u8. Only a HEAD that fails outright (no CORS)
// falls back to <video src>, which does not need CORS. Keep isM3u8Path()
// identical to the one in yammbocom/yammbo-iptv scripts/build.mjs.
var HLS = 'application/vnd.apple.mpegurl';
var HLS_TYPES = ['application/vnd.apple.mpegurl', 'application/x-mpegurl', 'audio/mpegurl', 'audio/x-mpegurl'];
var GENERIC_TYPES = ['', 'text/plain', 'application/octet-stream', 'binary/octet-stream'];

function isM3u8Path(url) {
    try {
        return /\.m3u8$/i.test(new URL(url).pathname);
    } catch (e) {
        return false;
    }
}

function hasNativeHls() {
    try {
        return document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
    } catch (e) {
        return false;
    }
}

function baseType(contentType) {
    return typeof contentType === 'string' ? contentType.split(';')[0].trim().toLowerCase() : '';
}

function getContentType(stream) {
    if (!stream || typeof stream.url !== 'string') {
        return Promise.reject(new Error('Invalid stream parameter!'));
    }

    if (stream.behaviorHints && stream.behaviorHints.proxyHeaders && stream.behaviorHints.proxyHeaders.response && typeof stream.behaviorHints.proxyHeaders.response['content-type'] === 'string') {
        return Promise.resolve(stream.behaviorHints.proxyHeaders.response['content-type']);
    }

    var m3u8 = isM3u8Path(stream.url);
    if (m3u8 && !hasNativeHls()) {
        return Promise.resolve(HLS);
    }

    return fetch(stream.url, { method: 'HEAD' })
        .then(function(resp) {
            var type = baseType(resp.headers.get('content-type'));
            if (HLS_TYPES.indexOf(type) !== -1 || (m3u8 && (!resp.ok || GENERIC_TYPES.indexOf(type) !== -1))) {
                return HLS;
            }

            if (resp.ok) {
                return resp.headers.get('content-type');
            }

            throw new Error(resp.status + ' (' + resp.statusText + ')');
        });
}

module.exports = getContentType;
