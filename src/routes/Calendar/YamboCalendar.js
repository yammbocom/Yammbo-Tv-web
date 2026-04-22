// Yammbo TV — Calendar component independiente de Stremio Cloud.
// Muestra eventos próximos (episodios, air dates) desde /api/app-tv/calendar.

const React = require('react');
const { useTranslation } = require('react-i18next');
const { MainNavBars } = require('stremio/components');

const T = {
    en: {
        title: 'Calendar',
        empty_title: 'No upcoming events',
        empty_body: 'Add series to your library and new episodes will appear here.',
        upcoming: 'Upcoming',
        recent: 'Recent',
        season_ep: 'S{s}E{e}',
        loading: 'Loading…',
    },
    es: {
        title: 'Calendario',
        empty_title: 'Sin próximos eventos',
        empty_body: 'Añade series a tu biblioteca y los nuevos episodios aparecerán aquí.',
        upcoming: 'Próximos',
        recent: 'Recientes',
        season_ep: 'T{s}E{e}',
        loading: 'Cargando…',
    },
    pt: {
        title: 'Calendário',
        empty_title: 'Sem próximos eventos',
        empty_body: 'Adicione séries à sua biblioteca e os novos episódios aparecerão aqui.',
        upcoming: 'Próximos',
        recent: 'Recentes',
        season_ep: 'T{s}E{e}',
        loading: 'Carregando…',
    },
    fr: {
        title: 'Calendrier',
        empty_title: 'Aucun événement à venir',
        empty_body: 'Ajoutez des séries à votre bibliothèque et les nouveaux épisodes apparaîtront ici.',
        upcoming: 'À venir',
        recent: 'Récents',
        season_ep: 'S{s}E{e}',
        loading: 'Chargement…',
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

const LOCALE_MAP = { es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' };

const formatDate = (isoDate, locale) => {
    if (!isoDate) return '';
    try {
        return new Date(isoDate + 'T00:00:00').toLocaleDateString(LOCALE_MAP[locale] || 'en-US', {
            weekday: 'short', day: '2-digit', month: 'short'
        });
    } catch (e) { return isoDate; }
};

const YamboCalendar = () => {
    const locale = useYamboLocale();
    const tr = T[locale];
    const mobile = useIsMobile();

    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
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

    React.useEffect(function () {
        if (!userId) { setLoading(false); return; }
        var today = new Date();
        var from = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
        var to = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);
        fetch('/api/app-tv/calendar?user_id=' + userId + '&from=' + from + '&to=' + to, {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        }).then(function (r) { return r.json(); })
          .then(function (data) { setEvents(data.events || []); setLoading(false); })
          .catch(function () { setLoading(false); });
    }, [userId]);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const upcoming = events.filter(function (e) { return e.air_date >= todayStr; });
    const recent = events.filter(function (e) { return e.air_date < todayStr; }).reverse();

    const s = mobile ? stylesMobile : stylesDesktop;

    const renderEvent = function (ev) {
        return (
            <a key={ev.id}
               href={'#/metadetails/series/' + encodeURIComponent(ev.meta_id)}
               style={s.eventCard}>
                {ev.series_poster ? (
                    <img src={ev.series_poster} alt="" style={s.eventPoster} />
                ) : (
                    <div style={s.eventPosterPlaceholder}>?</div>
                )}
                <div style={s.eventBody}>
                    <div style={s.eventSeries}>{ev.series_name || ev.meta_id}</div>
                    <div style={s.eventEpisode}>
                        <span style={s.eventSE}>
                            {tr.season_ep.replace('{s}', ev.season).replace('{e}', ev.episode)}
                        </span>
                        {ev.episode_name && <span style={s.eventName}> — {ev.episode_name}</span>}
                    </div>
                    <div style={s.eventDate}>{formatDate(ev.air_date, locale)}</div>
                </div>
            </a>
        );
    };

    return (
        <MainNavBars route={'calendar'}>
            <div style={s.scroll}>
                <div style={s.container}>
                    <h1 style={s.title}>{tr.title}</h1>

                    {loading ? (
                        <div style={s.empty}>{tr.loading}</div>
                    ) : events.length === 0 ? (
                        <div style={s.empty}>
                            <h2 style={s.emptyTitle}>{tr.empty_title}</h2>
                            <p style={s.emptyBody}>{tr.empty_body}</p>
                        </div>
                    ) : (
                        <React.Fragment>
                            {upcoming.length > 0 && (
                                <div>
                                    <h2 style={s.sectionTitle}>{tr.upcoming}</h2>
                                    <div style={s.eventGrid}>{upcoming.map(renderEvent)}</div>
                                </div>
                            )}
                            {recent.length > 0 && (
                                <div style={{ marginTop: 32 }}>
                                    <h2 style={s.sectionTitle}>{tr.recent}</h2>
                                    <div style={s.eventGrid}>{recent.map(renderEvent)}</div>
                                </div>
                            )}
                        </React.Fragment>
                    )}
                </div>
            </div>
        </MainNavBars>
    );
};

const baseStyles = {
    scroll: { width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' },
    eventCard: { display: 'flex', gap: 12, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: 10, textDecoration: 'none', color: '#fff', transition: 'border-color .15s' },
    eventPoster: { width: 60, height: 90, objectFit: 'cover', borderRadius: 4, flexShrink: 0 },
    eventPosterPlaceholder: { width: 60, height: 90, background: '#1a1a1a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', flexShrink: 0, fontSize: 20, fontWeight: 800 },
    eventBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
    eventSeries: { fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    eventEpisode: { fontSize: 13, color: '#bdbdbd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    eventSE: { color: '#E50914', fontWeight: 700 },
    eventName: { color: '#bdbdbd' },
    eventDate: { fontSize: 12, color: '#888', marginTop: 2 },
    emptyTitle: { color: '#fff', fontSize: 22, margin: '0 0 8px 0' },
    emptyBody: { fontSize: 14, margin: 0 },
};

const stylesDesktop = Object.assign({}, baseStyles, {
    container: { padding: '20px 32px 48px', color: '#fff' },
    title: { margin: '0 0 24px 0', fontSize: 28, fontWeight: 700 },
    sectionTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', color: '#fff' },
    eventGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
    empty: { textAlign: 'center', padding: '80px 20px', color: '#888' },
});

const stylesMobile = Object.assign({}, baseStyles, {
    container: { padding: '14px 12px 48px', color: '#fff' },
    title: { margin: '0 0 16px 0', fontSize: 22, fontWeight: 700 },
    sectionTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 10px 0', color: '#fff' },
    eventGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 10 },
    empty: { textAlign: 'center', padding: '50px 16px', color: '#888' },
});

module.exports = YamboCalendar;
