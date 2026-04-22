// Yammbo TV — Calendar component independiente de Stremio Cloud.
// Muestra eventos próximos (episodios, air dates) desde /api/app-tv/calendar.

const React = require('react');
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
};

const getLocale = () => {
    try {
        var loc = (window.YAMBO_USER && window.YAMBO_USER.locale) ||
            (navigator.language || 'en').slice(0, 2);
        return T[loc] ? loc : 'en';
    } catch (e) { return 'en'; }
};

const formatDate = (isoDate, locale) => {
    if (!isoDate) return '';
    try {
        return new Date(isoDate + 'T00:00:00').toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
            weekday: 'short', day: '2-digit', month: 'short'
        });
    } catch (e) { return isoDate; }
};

const YamboCalendar = () => {
    const locale = getLocale();
    const tr = T[locale];

    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [userId, setUserId] = React.useState(
        (window.YAMBO_USER && window.YAMBO_USER.id) || 0
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

    const renderEvent = function (ev) {
        return (
            <a key={ev.id}
               href={'#/metadetails/series/' + encodeURIComponent(ev.meta_id)}
               style={styles.eventCard}>
                {ev.series_poster ? (
                    <img src={ev.series_poster} alt="" style={styles.eventPoster} />
                ) : (
                    <div style={styles.eventPosterPlaceholder}>?</div>
                )}
                <div style={styles.eventBody}>
                    <div style={styles.eventSeries}>{ev.series_name || ev.meta_id}</div>
                    <div style={styles.eventEpisode}>
                        <span style={styles.eventSE}>
                            {tr.season_ep.replace('{s}', ev.season).replace('{e}', ev.episode)}
                        </span>
                        {ev.episode_name && <span style={styles.eventName}> — {ev.episode_name}</span>}
                    </div>
                    <div style={styles.eventDate}>{formatDate(ev.air_date, locale)}</div>
                </div>
            </a>
        );
    };

    return (
        <MainNavBars route={'calendar'}>
            <div style={styles.container}>
                <h1 style={styles.title}>{tr.title}</h1>

                {loading ? (
                    <div style={styles.empty}>{tr.loading}</div>
                ) : events.length === 0 ? (
                    <div style={styles.empty}>
                        <h2 style={styles.emptyTitle}>{tr.empty_title}</h2>
                        <p style={styles.emptyBody}>{tr.empty_body}</p>
                    </div>
                ) : (
                    <React.Fragment>
                        {upcoming.length > 0 && (
                            <div>
                                <h2 style={styles.sectionTitle}>{tr.upcoming}</h2>
                                <div style={styles.eventGrid}>{upcoming.map(renderEvent)}</div>
                            </div>
                        )}
                        {recent.length > 0 && (
                            <div style={{ marginTop: 32 }}>
                                <h2 style={styles.sectionTitle}>{tr.recent}</h2>
                                <div style={styles.eventGrid}>{recent.map(renderEvent)}</div>
                            </div>
                        )}
                    </React.Fragment>
                )}
            </div>
        </MainNavBars>
    );
};

const styles = {
    container: { padding: '20px 32px', color: '#fff' },
    title: { margin: '0 0 24px 0', fontSize: 28, fontWeight: 700 },
    sectionTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', color: '#fff' },
    eventGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
    eventCard: { display: 'flex', gap: 12, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: 10, textDecoration: 'none', color: '#fff', transition: 'border-color .15s' },
    eventPoster: { width: 60, height: 90, objectFit: 'cover', borderRadius: 4, flexShrink: 0 },
    eventPosterPlaceholder: { width: 60, height: 90, background: '#1a1a1a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', flexShrink: 0, fontSize: 20, fontWeight: 800 },
    eventBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
    eventSeries: { fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    eventEpisode: { fontSize: 13, color: '#bdbdbd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    eventSE: { color: '#E50914', fontWeight: 700 },
    eventName: { color: '#bdbdbd' },
    eventDate: { fontSize: 12, color: '#888', marginTop: 2 },
    empty: { textAlign: 'center', padding: '80px 20px', color: '#888' },
    emptyTitle: { color: '#fff', fontSize: 22, margin: '0 0 8px 0' },
    emptyBody: { fontSize: 14, margin: 0 },
};

module.exports = YamboCalendar;
