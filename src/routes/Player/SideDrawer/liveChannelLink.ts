// Yammbo TV: build a player hash for a live channel without going through the core

type LiveChannelStream = {
    url: string,
    name?: string,
    description?: string,
};

type LiveChannel = {
    id: string,
    name: string,
    logo?: string,
    description?: string,
    stream: LiveChannelStream,
};

type LiveChannelsRelated = {
    catalog: { id: string, name: string },
    channels: LiveChannel[],
};

// The core expects base64(zlib(JSON)) in the stream segment; CompressionStream 'deflate' emits zlib format
const encodeStream = async (stream: LiveChannelStream): Promise<string> => {
    const compressed = new Response(new Blob([JSON.stringify(stream)]).stream().pipeThrough(new CompressionStream('deflate')));
    const bytes = new Uint8Array(await compressed.arrayBuffer());
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
};

const buildLiveChannelPlayerHash = async (channel: LiveChannel): Promise<string> => {
    const transportUrl = encodeURIComponent(`${window.location.origin}/iptv/manifest.json`);
    const id = encodeURIComponent(channel.id);
    const stream = encodeURIComponent(await encodeStream(channel.stream));
    return `#/player/${stream}/${transportUrl}/${transportUrl}/tv/${id}/${id}`;
};

export type { LiveChannel, LiveChannelsRelated };
export { buildLiveChannelPlayerHash };
