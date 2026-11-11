// Yammbo TV: sección "TV en vivo" (#/tv), en lugar del calendario.
//
// Lee el Worker de canales (/iptv/*) directamente, sin pasar por el core: el
// core solo tiene un modelo de catálogos para el inicio y otro para la
// búsqueda, y los dos ya están ocupados. Filas por categoría, una cuadrícula
// por categoría con carga al hacer scroll, búsqueda y filtro por país.
// Tocar un canal abre el reproductor directamente (sin pasar por la ficha), así
// que atrás desde el reproductor vuelve aquí.

const React = require('react');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { MainNavBars, MetaItem } = require('stremio/components');
const { buildLiveChannelPlayerHash } = require('stremio/routes/Player/SideDrawer/liveChannelLink');
const styles = require('./styles');

const PAGE_SIZE = 100;
const ROW_SIZE = 20;
const ALL_CATALOG_ID = 'iptv-all';
const HOME = 'home';
const STORAGE_KEY = 'yamboLiveTv';
const TOP_COUNTRIES = ['Colombia', 'México', 'España', 'Estados Unidos', 'Argentina', 'Venezuela', 'Perú', 'Chile', 'Ecuador'];

const T = {
    es: { title: 'TV en vivo', search: 'Buscar canal', allCountries: 'Todos los países', home: 'Inicio', seeAll: 'Ver todo', empty: 'No hay canales que coincidan.', error: 'No se pudieron cargar los canales.', retry: 'Reintentar', loading: 'Cargando…' },
    en: { title: 'Live TV', search: 'Search channel', allCountries: 'All countries', home: 'Home', seeAll: 'See all', empty: 'No matching channels.', error: 'Channels could not be loaded.', retry: 'Retry', loading: 'Loading…' },
    pt: { title: 'TV ao vivo', search: 'Buscar canal', allCountries: 'Todos os países', home: 'Início', seeAll: 'Ver tudo', empty: 'Nenhum canal encontrado.', error: 'Não foi possível carregar os canais.', retry: 'Tentar de novo', loading: 'Carregando…' },
    fr: { title: 'TV en direct', search: 'Rechercher une chaîne', allCountries: 'Tous les pays', home: 'Accueil', seeAll: 'Tout voir', empty: 'Aucune chaîne trouvée.', error: 'Impossible de charger les chaînes.', retry: 'Réessayer', loading: 'Chargement…' },
};

const iptvBase = () => `${window.location.origin}/iptv`;

const catalogUrl = (catalogId, { genre, search, skip }) => {
    const extra = [];
    if (genre) extra.push(`genre=${encodeURIComponent(genre)}`);
    if (search) extra.push(`search=${encodeURIComponent(search)}`);
    if (skip) extra.push(`skip=${skip}`);
    return `${iptvBase()}/catalog/tv/${encodeURIComponent(catalogId)}${extra.length > 0 ? '/' + extra.join('&') : ''}.json`;
};

// Caché de la sesión: volver del reproductor o cambiar de pestaña no repite
// peticiones. Los fallos se olvidan para poder reintentar.
const cache = new Map();
const fetchJson = (url) => {
    if (!cache.has(url)) {
        const promise = fetch(url)
            .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
            .catch((error) => {
                cache.delete(url);
                throw error;
            });
        cache.set(url, promise);
    }
    return cache.get(url);
};
const fetchMetas = (url) => fetchJson(url).then((data) => Array.isArray(data && data.metas) ? data.metas : []);

const readStored = () => {
    try {
        const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY));
        return stored && typeof stored === 'object' ? stored : {};
    } catch (e) {
        return {};
    }
};

const detailHref = (id) => `#/detail/tv/${encodeURIComponent(id)}`;

// Abre el canal en el reproductor. Si algo falla (sin CompressionStream, sin
// stream), cae a la ficha del canal, que es lo que hacía el inicio.
// Solo navega la última apertura y solo si el usuario sigue en #/tv: dos toques
// seguidos no apilan dos reproductores, y cambiar de pestaña mientras carga no
// le lleva al reproductor desde otra sección.
let openSeq = 0;
const openChannel = (meta) => {
    const seq = ++openSeq;
    const startHash = window.location.hash;
    const stillHere = () => seq === openSeq && window.location.hash === startHash;
    const fallback = () => {
        if (stillHere()) {
            window.location.href = detailHref(meta.id);
        }
    };
    if (typeof window.CompressionStream !== 'function') {
        fallback();
        return;
    }
    fetchJson(`${iptvBase()}/stream/tv/${encodeURIComponent(meta.id)}.json`)
        .then((data) => {
            const stream = data && Array.isArray(data.streams) ? data.streams[0] : null;
            if (!stream || typeof stream.url !== 'string') {
                throw new Error('no stream');
            }
            return buildLiveChannelPlayerHash({
                id: meta.id,
                name: meta.name,
                stream: {
                    url: stream.url,
                    name: stream.name,
                    description: stream.description || stream.title,
                },
            });
        })
        .then((hash) => {
            if (stillHere()) {
                window.location.href = hash;
            }
        })
        .catch(fallback);
};

const Channel = React.memo(({ meta, className }) => {
    const deepLinks = React.useMemo(() => ({ metaDetailsStreams: detailHref(meta.id) }), [meta.id]);
    const onClick = React.useCallback((event) => {
        event.preventDefault();
        openChannel(meta);
    }, [meta]);
    return (
        <MetaItem
            className={className}
            type={'tv'}
            name={meta.name}
            poster={meta.poster || meta.logo}
            posterShape={'square'}
            deepLinks={deepLinks}
            onClick={onClick}
        />
    );
});
Channel.displayName = 'Channel';

const useMetas = (url) => {
    const [state, setState] = React.useState({ url: null, metas: null, error: false });
    const [attempt, setAttempt] = React.useState(0);
    React.useEffect(() => {
        let active = true;
        setState((prev) => prev.url === url ? prev : { url, metas: null, error: false });
        fetchMetas(url)
            .then((metas) => active && setState({ url, metas, error: false }))
            .catch(() => active && setState({ url, metas: null, error: true }));
        return () => {
            active = false;
        };
    }, [url, attempt]);
    const retry = React.useCallback(() => setAttempt((n) => n + 1), []);
    return [state.url === url ? state : { url, metas: null, error: false }, retry];
};

const Row = ({ catalog, country, text, onSeeAll }) => {
    const [{ metas, error }] = useMetas(catalogUrl(catalog.id, { genre: country }));
    if (error || (Array.isArray(metas) && metas.length === 0)) {
        return null;
    }
    return (
        <div className={styles['row']}>
            <div className={styles['row-header']}>
                <div className={styles['row-title']}>{catalog.name}</div>
                <button className={styles['see-all']} onClick={() => onSeeAll(catalog.id)}>
                    {text.seeAll}
                    <Icon className={styles['see-all-icon']} name={'chevron-forward'} />
                </button>
            </div>
            <div className={styles['row-items']}>
                {
                    Array.isArray(metas) ?
                        metas.slice(0, ROW_SIZE).map((meta) => (
                            <Channel key={meta.id} className={styles['item']} meta={meta} />
                        ))
                        :
                        Array.from({ length: 6 }, (_, index) => (
                            <div key={index} className={classnames(styles['item'], styles['placeholder'])} />
                        ))
                }
            </div>
        </div>
    );
};

const Grid = ({ catalogId, country, search, text, scrollContainerRef }) => {
    const firstUrl = catalogUrl(catalogId, { genre: country, search });
    const [{ metas: firstPage, error }, retry] = useMetas(firstUrl);
    const [extraPages, setExtraPages] = React.useState({ key: firstUrl, metas: [], done: false, loading: false, failed: false });
    const pages = extraPages.key === firstUrl ? extraPages : { key: firstUrl, metas: [], done: false, loading: false, failed: false };
    const sentinelRef = React.useRef(null);
    const metas = React.useMemo(() => Array.isArray(firstPage) ? firstPage.concat(pages.metas) : null, [firstPage, pages.metas]);
    const hasMore = Array.isArray(firstPage) && firstPage.length >= PAGE_SIZE && !pages.done;
    const loadMore = React.useCallback(() => {
        if (!hasMore || pages.loading || metas === null) {
            return;
        }
        const key = firstUrl;
        setExtraPages({ ...pages, loading: true, failed: false });
        fetchMetas(catalogUrl(catalogId, { genre: country, search, skip: metas.length }))
            .then((page) => setExtraPages((prev) => prev.key !== key ? prev : {
                key,
                metas: prev.metas.concat(page),
                done: page.length < PAGE_SIZE,
                loading: false,
                failed: false,
            }))
            // Un fallo puntual no corta la lista: se ofrece reintentar.
            .catch(() => setExtraPages((prev) => prev.key !== key ? prev : { ...prev, loading: false, failed: true }));
    }, [hasMore, pages, metas, firstUrl, catalogId, country, search]);
    React.useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasMore || pages.failed || typeof IntersectionObserver !== 'function') {
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                loadMore();
            }
        }, { root: scrollContainerRef.current, rootMargin: '600px 0px' });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, loadMore, pages.failed]);
    if (error) {
        return (
            <div className={styles['message']}>
                {text.error}
                <button className={styles['retry']} onClick={retry}>{text.retry}</button>
            </div>
        );
    }
    if (metas === null) {
        return <div className={styles['message']}>{text.loading}</div>;
    }
    if (metas.length === 0) {
        return <div className={styles['message']}>{text.empty}</div>;
    }
    return (
        <React.Fragment>
            <div className={styles['grid']}>
                {metas.map((meta, index) => (
                    <Channel key={`${meta.id}-${index}`} className={styles['item']} meta={meta} />
                ))}
            </div>
            {
                hasMore && pages.failed ?
                    <div className={styles['message']}>
                        {text.error}
                        <button className={styles['retry']} onClick={loadMore}>{text.retry}</button>
                    </div>
                    :
                    hasMore ?
                        <div ref={sentinelRef} className={styles['message']}>{text.loading}</div>
                        :
                        null
            }
        </React.Fragment>
    );
};

const LiveTv = () => {
    const { i18n } = useTranslation();
    const text = T[String(i18n.language || 'es').split('-')[0].toLowerCase()] || T.es;
    const stored = React.useMemo(readStored, []);
    const [category, setCategory] = React.useState(typeof stored.category === 'string' ? stored.category : HOME);
    const [country, setCountry] = React.useState(typeof stored.country === 'string' ? stored.country : '');
    const [query, setQuery] = React.useState(typeof stored.query === 'string' ? stored.query : '');
    const [search, setSearch] = React.useState(query.trim());
    const [manifest, setManifest] = React.useState(null);
    const [manifestError, setManifestError] = React.useState(false);
    const scrollContainerRef = React.useRef(null);
    const chipsRef = React.useRef(null);

    const loadManifest = React.useCallback(() => {
        setManifestError(false);
        fetchJson(`${iptvBase()}/manifest.json`)
            .then(setManifest)
            .catch(() => setManifestError(true));
    }, []);
    React.useEffect(loadManifest, []);

    React.useEffect(() => {
        const timer = setTimeout(() => setSearch(query.trim()), 350);
        return () => clearTimeout(timer);
    }, [query]);

    React.useEffect(() => {
        try {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ category, country, query }));
        } catch (e) { /* modo privado: no se recuerda, sin más */ }
    }, [category, country, query]);

    const catalogs = React.useMemo(() => {
        return manifest && Array.isArray(manifest.catalogs) ?
            manifest.catalogs.filter((catalog) => catalog && catalog.type === 'tv')
            :
            [];
    }, [manifest]);
    const countries = React.useMemo(() => {
        const all = catalogs.find((catalog) => catalog.id === ALL_CATALOG_ID) || catalogs[0];
        const genre = all && Array.isArray(all.extra) ? all.extra.find((extra) => extra && extra.name === 'genre') : null;
        const options = genre && Array.isArray(genre.options) ? genre.options : [];
        const top = TOP_COUNTRIES.filter((name) => options.includes(name));
        return { top, rest: options.filter((name) => !top.includes(name)) };
    }, [catalogs]);
    // Una categoría guardada que ya no existe vuelve al inicio.
    const activeCategory = category === HOME || catalogs.length === 0 || catalogs.some((catalog) => catalog.id === category) ? category : HOME;

    // La categoría elegida (o la recordada) se deja a la vista en el carrusel.
    React.useEffect(() => {
        const selected = chipsRef.current ? chipsRef.current.querySelector(`.${styles['selected']}`) : null;
        if (selected && typeof selected.scrollIntoView === 'function') {
            selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [activeCategory, catalogs]);

    const selectCategory = React.useCallback((id) => {
        setCategory(id);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, []);
    const onCountryChange = React.useCallback((event) => setCountry(event.target.value), []);
    const onQueryChange = React.useCallback((event) => setQuery(event.target.value), []);
    const onQuerySubmit = React.useCallback((event) => {
        event.preventDefault();
        setSearch(query.trim());
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, [query]);
    const clearQuery = React.useCallback(() => {
        setQuery('');
        setSearch('');
    }, []);

    let content;
    if (manifestError) {
        content = (
            <div className={styles['message']}>
                {text.error}
                <button className={styles['retry']} onClick={loadManifest}>{text.retry}</button>
            </div>
        );
    } else if (manifest === null) {
        content = <div className={styles['message']}>{text.loading}</div>;
    } else if (search.length > 0 || activeCategory !== HOME) {
        content = (
            <Grid
                catalogId={activeCategory === HOME ? ALL_CATALOG_ID : activeCategory}
                country={country}
                search={search}
                text={text}
                scrollContainerRef={scrollContainerRef}
            />
        );
    } else {
        content = catalogs
            .filter((catalog) => catalog.id !== ALL_CATALOG_ID)
            .map((catalog) => (
                <Row key={catalog.id} catalog={catalog} country={country} text={text} onSeeAll={selectCategory} />
            ));
    }

    return (
        <MainNavBars className={styles['live-tv-container']} route={'livetv'}>
            <div ref={scrollContainerRef} className={styles['live-tv-content']}>
                <div className={styles['header']}>
                    <h1 className={styles['title']}>{text.title}</h1>
                    <div className={styles['controls']}>
                        <form className={styles['search']} role={'search'} onSubmit={onQuerySubmit}>
                            <Icon className={styles['search-icon']} name={'search'} />
                            <input
                                className={styles['search-input']}
                                type={'search'}
                                enterKeyHint={'search'}
                                placeholder={text.search}
                                value={query}
                                onChange={onQueryChange}
                            />
                            {
                                query.length > 0 ?
                                    <button type={'button'} className={styles['search-clear']} onClick={clearQuery} aria-label={'×'}>
                                        <Icon className={styles['search-clear-icon']} name={'close'} />
                                    </button>
                                    :
                                    null
                            }
                        </form>
                        <select className={styles['country']} value={country} onChange={onCountryChange} aria-label={text.allCountries}>
                            <option value={''}>{text.allCountries}</option>
                            {countries.top.map((name) => <option key={`top-${name}`} value={name}>{name}</option>)}
                            {countries.top.length > 0 ? <option disabled>──────────</option> : null}
                            {countries.rest.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div ref={chipsRef} className={styles['chips']}>
                        <button className={classnames(styles['chip'], { [styles['selected']]: activeCategory === HOME })} onClick={() => selectCategory(HOME)}>
                            {text.home}
                        </button>
                        {catalogs.map((catalog) => (
                            <button key={catalog.id} className={classnames(styles['chip'], { [styles['selected']]: activeCategory === catalog.id })} onClick={() => selectCategory(catalog.id)}>
                                {catalog.name}
                            </button>
                        ))}
                    </div>
                </div>
                {content}
            </div>
        </MainNavBars>
    );
};

module.exports = LiveTv;
