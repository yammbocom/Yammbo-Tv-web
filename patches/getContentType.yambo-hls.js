// Yammbo Tv override of @stremio/stremio-video/src/HTMLVideo/getContentType.js
// (see patches/README.md). Live TV streams often answer the HEAD below with a
// generic content-type (or refuse HEAD) although they are HLS, and then the
// player falls back to <video src>, which Chrome can't play. A path ending in
// .m3u8 is HLS: answer without the HEAD. Keep this test identical to
// isM3u8Path() in yammbocom/yammbo-iptv scripts/build.mjs.
function isM3u8Path(url) {
    try {
        return /\.m3u8$/i.test(new URL(url).pathname);
    } catch (e) {
        return false;
    }
}

function getContentType(stream) {
    if (!stream || typeof stream.url !== 'string') {
        return Promise.reject(new Error('Invalid stream parameter!'));
    }

    if (stream.behaviorHints && stream.behaviorHints.proxyHeaders && stream.behaviorHints.proxyHeaders.response && typeof stream.behaviorHints.proxyHeaders.response['content-type'] === 'string') {
        return Promise.resolve(stream.behaviorHints.proxyHeaders.response['content-type']);
    }

    if (isM3u8Path(stream.url)) {
        return Promise.resolve('application/vnd.apple.mpegurl');
    }

    return fetch(stream.url, { method: 'HEAD' })
        .then(function(resp) {
            if (resp.ok) {
                return resp.headers.get('content-type');
            }

            throw new Error(resp.status + ' (' + resp.statusText + ')');
        });
}

module.exports = getContentType;
