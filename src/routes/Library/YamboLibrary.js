// Yammbo TV — Library component independiente de Stremio Cloud.
// Consume /api/app-tv/library (Laravel backend). Usa window.YAMBO_USER.id.

const React = require('react');
const { useTranslation } = require('react-i18next');
const { MainNavBars, Image } = require('stremio/components');

const T = {
    en: {
        title: 'Your Library',
        empty_title: 'Your library is empty',
        empty_body: 'Browse the catalog and add titles to see them here.',
        remove: 'Remove',
        loading: 'Loading…',
        movies: 'Movies',
        series: 'Series',
        all: 'All',
    },
    es: {
        title: 'Mi Biblioteca',
        empty_title: 'Tu biblioteca está vacía',
        empty_body: 'Explora el catálogo y añade títulos para verlos aquí.',
        remove: 'Quitar',
        loading: 'Cargando…',
        movies: 'Películas',
        series: 'Series',
        all: 'Todo',
    },
    pt: {
        title: 'Sua Biblioteca',
        empty_title: 'Sua biblioteca está vazia',
        empty_body: 'Explore o catálogo e adicione títulos para vê-los aqui.',
        remove: 'Remover',
        loading: 'Carregando…',
        movies: 'Filmes',
        series: 'Séries',
        all: 'Tudo',
    },
    fr: {
        title: 'Votre bibliothèque',
        empty_title: 'Votre bibliothèque est vide',
        empty_body: 'Parcourez le catalogue et ajoutez des titres pour les voir ici.',
        remove: 'Supprimer',
        loading: 'Chargement…',
        movies: 'Films',
        series: 'Séries',
        all: 'Tout',
    },
};

const useYamboLocale = () => {
    const { i18n } = useTranslation();
    const raw = (i18n && i18n.language) ? i18n.language
        : ((typeof window !== 'undefined' && window.YAMBO_USER && window.YAMBO_USER.locale) || 'en');
    const short = String(raw).split('-')[0].toLowerCase();
    return T[short] ? short : 'en';
};

const useIsMobile = () => {
    const [mobile, setMobile] = React.useState(
        typeof window !== 'undefined' ? window.innerWidth <= 640 : false
    );
    React.useEffect(() => {
        const onResize = () => setMobile(window.innerWidth <= 640);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return mobile;
};

const YamboLibrary = () => {
    const locale = useYamboLocale();
    const tr = T[locale];
    const mobile = useIsMobile();

    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState('all');
    const [userId, setUserId] = React.useState(
        (typeof window !== 'undefined' && window.YAMBO_USER && window.YAMBO_USER.id) || 0
    );

    // Fallback: if window.YAMBO_USER wasn't injected (stale SW), fetch from backend
    React.useEffect(function () {
        if (userId) return;
        fetch('/api/app-tv/whoami', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d && d.user && d.user.id) {
                    window.YAMBO_USER = d.user;
                    setUserId(d.user.id);
                } else {
                    setLoading(false);
                }
            }).catch(function () { setLoading(false); });
    }, [userId]);

    const fetchLibrary = React.useCallback(() => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        fetch('/api/app-tv/library?user_id=' + userId + (filter !== 'all' ? '&type=' + filter : ''), {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        }).then(function (r) { return r.json(); })
          .then(function (data) { setItems(data.items || []); setLoading(false); })
          .catch(function () { setLoading(false); });
    }, [userId, filter]);

    React.useEffect(fetchLibrary, [fetchLibrary]);

    const remove = React.useCallback(function (item) {
        fetch('/api/app-tv/library/toggle', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                meta_id: item.meta_id,
                meta_type: item.meta_type,
                meta_name: item.name
            })
        }).then(fetchLibrary);
    }, [userId, fetchLibrary]);

    const s = mobile ? stylesMobile : stylesDesktop;

    return (
        <MainNavBars route={'library'}>
            <div style={s.scroll}>
                <div style={s.container}>
                    <div style={s.header}>
                        <h1 style={s.title}>{tr.title}</h1>
                        <div style={s.filters}>
                            {['all', 'movie', 'series'].map(function (f) {
                                const label = f === 'all' ? tr.all : (f === 'movie' ? tr.movies : tr.series);
                                return (
                                    <button
                                        key={f}
                                        onClick={function () { setFilter(f); }}
                                        style={Object.assign({}, s.filterBtn, filter === f ? s.filterBtnActive : {})}>
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {loading ? (
                        <div style={s.empty}>{tr.loading}</div>
                    ) : items.length === 0 ? (
                        <div style={s.empty}>
                            <h2 style={s.emptyTitle}>{tr.empty_title}</h2>
                            <p style={s.emptyBody}>{tr.empty_body}</p>
                        </div>
                    ) : (
                        <div style={s.grid}>
                            {items.map(function (item) {
                                return (
                                    <div key={item.id} style={s.card}>
                                        <a
                                            href={'#/metadetails/' + item.meta_type + '/' + encodeURIComponent(item.meta_id)}
                                            style={s.poster}
                                            title={item.name}>
                                            {item.poster ? (
                                                <img src={item.poster} alt={item.name} style={s.posterImg} />
                                            ) : (
                                                <div style={s.posterPlaceholder}>{item.name.slice(0, 2).toUpperCase()}</div>
                                            )}
                                            {item.rating != null && (
                                                <div style={s.rating}>★ {Number(item.rating).toFixed(1)}</div>
                                            )}
                                        </a>
                                        <div style={s.info}>
                                            <div style={s.name}>{item.name}</div>
                                            {item.year && <div style={s.year}>{item.year}</div>}
                                        </div>
                                        <button
                                            onClick={function () { remove(item); }}
                                            title={tr.remove}
                                            style={s.removeBtn}>✕</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </MainNavBars>
    );
};

const baseStyles = {
    scroll: { width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' },
    filterBtnActive: { background: '#E50914', color: '#fff', borderColor: '#E50914' },
    card: { position: 'relative', background: '#0a0a0a', borderRadius: 8, overflow: 'hidden' },
    poster: { display: 'block', aspectRatio: '2/3', background: '#1a1a1a', textDecoration: 'none', position: 'relative' },
    posterImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    posterPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#444' },
    rating: { position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.75)', color: '#FFD700', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 },
    info: { padding: 10 },
    name: { fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    year: { fontSize: 12, color: '#888', marginTop: 2 },
    removeBtn: { position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', fontSize: 12, fontWeight: 700 },
    emptyTitle: { color: '#fff', fontSize: 22, margin: '0 0 8px 0' },
    emptyBody: { fontSize: 14, margin: 0 },
};

const stylesDesktop = Object.assign({}, baseStyles, {
    container: { padding: '20px 32px', color: '#fff' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' },
    title: { margin: 0, fontSize: 28, fontWeight: 700 },
    filters: { display: 'flex', gap: 8 },
    filterBtn: { background: '#111', color: '#bdbdbd', border: '1px solid #2A2A2A', padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 },
    empty: { textAlign: 'center', padding: '80px 20px', color: '#888' },
});

const stylesMobile = Object.assign({}, baseStyles, {
    container: { padding: '14px 12px 32px', color: '#fff' },
    header: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', marginBottom: 16, gap: 10 },
    title: { margin: 0, fontSize: 22, fontWeight: 700 },
    filters: { display: 'flex', gap: 6, width: '100%' },
    filterBtn: { flex: 1, background: '#111', color: '#bdbdbd', border: '1px solid #2A2A2A', padding: '8px 6px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 },
    empty: { textAlign: 'center', padding: '50px 16px', color: '#888' },
});

module.exports = YamboLibrary;
