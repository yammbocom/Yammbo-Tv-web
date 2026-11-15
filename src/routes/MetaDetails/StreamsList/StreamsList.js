// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { useServices } = require('stremio/services');
const { Button, MultiselectMenu } = require('stremio/components');
const Stream = require('./Stream');
const styles = require('./styles');
const { usePlatform, useProfile, useYamboUser } = require('stremio/common');
const { default: SeasonEpisodePicker } = require('../EpisodePicker');

const ALL_ADDONS_KEY = 'ALL';

// Yammbo TV: textos del bloque "Míralo en la app" y del stream vacío
const YAMBO_STREAM_CTA = {
    en: { not_found: 'No streams found yet — try again in a moment.', app_title: 'Watch it in the Yammbo Tv app', app_sub: 'Same account and progress on Android and TV.', app_mobile: 'Get it for Android', app_tv: 'Get it for TV' },
    es: { not_found: 'Aún no encontramos streams — inténtalo en un momento.', app_title: 'Míralo en la app de Yammbo Tv', app_sub: 'Con tu misma cuenta y tu progreso, en Android y en la TV.', app_mobile: 'Descargar para Android', app_tv: 'Descargar para TV' },
    pt: { not_found: 'Ainda não encontramos streams — tente novamente em instantes.', app_title: 'Assista no app Yammbo Tv', app_sub: 'Com a mesma conta e o seu progresso, no Android e na TV.', app_mobile: 'Baixar para Android', app_tv: 'Baixar para TV' },
    fr: { not_found: 'Aucun stream pour le moment — réessayez dans un instant.', app_title: 'Regardez-le dans l\'application Yammbo Tv', app_sub: 'Même compte et même progression, sur Android et sur la TV.', app_mobile: 'Télécharger pour Android', app_tv: 'Télécharger pour TV' },
};

// Yammbo TV: aviso que sustituye a "Ver ahora" cuando la cuenta no es Premium
const YAMBO_PAYWALL = {
    en: { title: 'Go Premium to watch', sub: 'Activate your subscription and watch the whole catalog on the web, mobile and TV.', button: 'Activate subscription' },
    es: { title: 'Hazte Premium para verlo', sub: 'Activa tu suscripción y mira todo el catálogo en la web, el móvil y la TV.', button: 'Activar suscripción' },
    pt: { title: 'Seja Premium para assistir', sub: 'Ative sua assinatura e assista a todo o catálogo na web, no celular e na TV.', button: 'Ativar assinatura' },
    fr: { title: 'Passez Premium pour regarder', sub: 'Activez votre abonnement et regardez tout le catalogue sur le web, le mobile et la TV.', button: 'Activer l\'abonnement' },
};

// Yammbo TV: estilos del bloque "Miralo en la app"
// Yammbo TV: un solo boton hacia /install, que ya elige la version por dispositivo
const YAMBO_APP_CTA = {
    en: { cta: 'Download the app', devices: 'Android · TV · Windows', watch: 'Watch now', watch_here: 'Plays right here', season: 'Season', episode: 'Episode' },
    es: { cta: 'Descargar la app', devices: 'Android · TV · Windows', watch: 'Ver ahora', watch_here: 'Se reproduce aquí mismo', season: 'Temporada', episode: 'Episodio' },
    pt: { cta: 'Baixar o app', devices: 'Android · TV · Windows', watch: 'Assistir agora', watch_here: 'Reproduz aqui mesmo', season: 'Temporada', episode: 'Episódio' },
    fr: { cta: 'Télécharger l\'app', devices: 'Android · TV · Windows', watch: 'Regarder', watch_here: 'Lecture ici même', season: 'Saison', episode: 'Épisode' },
};

const yamboAppStyles = {
    wrap: { margin: '1.5rem auto 1rem', padding: '1.2rem 1rem', borderRadius: '0.8rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', maxWidth: '32rem' },
    title: { fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '0.35rem' },
    subtitle: { fontSize: '0.95rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.45, marginBottom: '1rem' },
    row: { display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '3rem', padding: '0.75rem 1.6rem', borderRadius: '0.6rem', background: '#E50914', color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', width: '100%', maxWidth: '20rem' },
    icon: { width: '1.15rem', height: '1.15rem', flex: '0 0 auto' },
    devices: { marginTop: '0.6rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em' },
};

const StreamsList = ({ className, video, type, onEpisodeSearch, ...props }) => {
    const { t, i18n } = useTranslation();
    const { core } = useServices();
    const platform = usePlatform();
    const profile = useProfile();
    const yamboUser = useYamboUser();
    const streamsContainerRef = React.useRef(null);
    const [selectedAddon, setSelectedAddon] = React.useState(ALL_ADDONS_KEY);
    const onAddonSelected = React.useCallback((value) => {
        streamsContainerRef.current.scrollTo({ top: 0, left: 0, behavior: platform.name === 'ios' ? 'smooth' : 'instant' });
        setSelectedAddon(value);
    }, [platform]);
    const yamboLocaleShort = (() => {
        const raw = (i18n && i18n.language) ? i18n.language : 'en';
        return String(raw).split('-')[0].toLowerCase();
    })();
    const yamboL = YAMBO_STREAM_CTA[yamboLocaleShort] || YAMBO_STREAM_CTA.en;
    const yamboCta = YAMBO_APP_CTA[yamboLocaleShort] || YAMBO_APP_CTA.en;
    const yamboPaywall = YAMBO_PAYWALL[yamboLocaleShort] || YAMBO_PAYWALL.en;
    const showInstallAddonsButton = React.useMemo(() => {
        // Yammbo TV: en TV en vivo no se ofrece instalar addons
        if (type === 'tv') return false;
        return !profile || profile.auth === null || profile.auth?.user?.isNewUser === true && !video?.upcoming;
    }, [profile, video, type]);
    const backButtonOnClick = React.useCallback(() => {
        if (video.deepLinks && typeof video.deepLinks.metaDetailsVideos === 'string') {
            window.location.replace(video.deepLinks.metaDetailsVideos + (
                typeof video.season === 'number' ?
                    `?${new URLSearchParams({ 'season': video.season })}`
                    :
                    null
            ));
        } else {
            window.history.back();
        }
    }, [video]);
    const countLoadingAddons = React.useMemo(() => {
        return props.streams.filter((stream) => stream.content.type === 'Loading').length;
    }, [props.streams]);
    const streamsByAddon = React.useMemo(() => {
        return props.streams
            .filter((streams) => streams.content.type === 'Ready')
            .reduce((streamsByAddon, streams) => {
                streamsByAddon[streams.addon.transportUrl] = {
                    addon: streams.addon,
                    streams: streams.content.content.map((stream) => ({
                        ...stream,
                        onClick: () => {
                            core.transport.analytics({
                                event: 'StreamClicked',
                                args: {
                                    stream
                                }
                            });
                        },
                        addonName: streams.addon.manifest.name
                    }))
                };

                return streamsByAddon;
            }, {});
    }, [props.streams]);
    const filteredStreams = React.useMemo(() => {
        return selectedAddon === ALL_ADDONS_KEY ?
            Object.values(streamsByAddon).map(({ streams }) => streams).flat(1)
            :
            streamsByAddon[selectedAddon] ?
                streamsByAddon[selectedAddon].streams
                :
                [];
    }, [streamsByAddon, selectedAddon]);
    const selectableOptions = React.useMemo(() => {
        return {
            options: [
                {
                    value: ALL_ADDONS_KEY,
                    label: t('ALL_ADDONS'),
                    title: t('ALL_ADDONS')
                },
                ...Object.keys(streamsByAddon).map((transportUrl) => ({
                    value: transportUrl,
                    label: streamsByAddon[transportUrl].addon.manifest.name,
                    title: streamsByAddon[transportUrl].addon.manifest.name,
                }))
            ],
            value: selectedAddon,
            onSelect: onAddonSelected
        };
    }, [streamsByAddon, selectedAddon]);

    const handleEpisodePicker = React.useCallback((season, episode) => {
        onEpisodeSearch(season, episode);
    }, [onEpisodeSearch]);

    /*
     * Yammbo TV: "Míralo en la app" va debajo de "Ver ahora" (antes estaba
     * arriba del todo y tapaba el botón de reproducir). En TV en vivo no sale.
     */
    const yamboAppCta = type !== 'tv' ?
        <div style={yamboAppStyles.wrap}>
            <div style={yamboAppStyles.title}>{yamboL.app_title}</div>
            <div style={yamboAppStyles.subtitle}>
                {yamboL.app_sub}
            </div>
            <div style={yamboAppStyles.row}>
                <a href={'https://tv.yammbo.com/install'} target={'_blank'} rel={'noopener noreferrer'} style={yamboAppStyles.btnPrimary}>
                    <svg viewBox={'0 0 24 24'} style={yamboAppStyles.icon} fill={'none'} stroke={'currentColor'} strokeWidth={2} strokeLinecap={'round'} strokeLinejoin={'round'} aria-hidden={'true'}><path d={'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2'} /></svg>
                    {yamboCta.cta}
                </a>
            </div>
            <div style={yamboAppStyles.devices}>{yamboCta.devices}</div>
        </div>
        :
        null;
    const yamboShowingStreams = props.streams.length > 0 &&
        !props.streams.every((streams) => streams.content.type === 'Err') &&
        filteredStreams.length > 0;

    // Yammbo TV: solo Premium reproduce. Los demas ven un aviso en lugar de la
    // lista de streams / "Ver ahora"; "Miralo en la app" sigue debajo.
    // Live TV (type 'tv') stays open to everyone, as LiveTv.js plays it directly.
    if (type !== 'tv' && !(yamboUser && yamboUser.subscription_active)) {
        return (
            <div className={classnames(className, styles['streams-list-container'])}>
                <div className={styles['select-choices-wrapper']}>
                    {
                        video ?
                            <React.Fragment>
                                <Button className={classnames(styles['button-container'], styles['back-button-container'])} tabIndex={-1} onClick={backButtonOnClick}>
                                    <Icon className={styles['icon']} name={'chevron-back'} />
                                </Button>
                                <div className={styles['episode-title']}>
                                    {`S${video?.season}E${video?.episode} ${(video?.title)}`}
                                </div>
                            </React.Fragment>
                            :
                            null
                    }
                </div>
                <div className={styles['streams-container']}>
                    <div style={yamboAppStyles.wrap}>
                        <div style={yamboAppStyles.title}>{yamboPaywall.title}</div>
                        <div style={yamboAppStyles.subtitle}>{yamboPaywall.sub}</div>
                        <div style={yamboAppStyles.row}>
                            <a href={'/pricing'} style={{ ...yamboAppStyles.btnPrimary, background: '#1160d8' }}>
                                {yamboPaywall.button}
                            </a>
                        </div>
                    </div>
                    {yamboAppCta}
                </div>
            </div>
        );
    }

    return (
        <div className={classnames(className, styles['streams-list-container'])}>
            <div className={styles['select-choices-wrapper']}>
                {
                    video ?
                        <React.Fragment>
                            <Button className={classnames(styles['button-container'], styles['back-button-container'])} tabIndex={-1} onClick={backButtonOnClick}>
                                <Icon className={styles['icon']} name={'chevron-back'} />
                            </Button>
                            <div className={styles['episode-title']}>
                                {`S${video?.season}E${video?.episode} ${(video?.title)}`}
                            </div>
                        </React.Fragment>
                        :
                        null
                }
                {
                    Object.keys(streamsByAddon).length > 1 ?
                        <MultiselectMenu
                            {...selectableOptions}
                            className={styles['select-input-container']}
                        />
                        :
                        null
                }
            </div>
            {
                props.streams.length === 0 ?
                    <div className={styles['message-container']}>
                        {
                            type === 'series' ?
                                <SeasonEpisodePicker className={styles['search']} onSubmit={handleEpisodePicker} />
                                : null
                        }
                    </div>
                    :
                    props.streams.every((streams) => streams.content.type === 'Err') ?
                        <div className={styles['message-container']}>
                            {
                                type === 'series' ?
                                    <SeasonEpisodePicker className={styles['search']} onSubmit={handleEpisodePicker} />
                                    : null
                            }
                            {
                                video?.upcoming ?
                                    <div className={styles['label']}>{t('UPCOMING')}...</div>
                                    : null
                            }
                        </div>
                        :
                        filteredStreams.length === 0 ?
                            <div className={styles['streams-container']}>
                                <Stream.Placeholder />
                                <Stream.Placeholder />
                            </div>
                            :
                            <React.Fragment>
                                {
                                    countLoadingAddons > 0 ?
                                        <div className={styles['addons-loading-container']}>
                                            <div className={styles['addons-loading']}>
                                                {countLoadingAddons} {t('MOBILE_ADDONS_LOADING')}
                                            </div>
                                            <span className={styles['addons-loading-bar']}></span>
                                        </div>
                                        :
                                        null
                                }
                                <div className={styles['streams-container']} ref={streamsContainerRef}>
                                    {filteredStreams.map((stream, index) => (
                                        stream.behaviorHints && stream.behaviorHints.yammboEmbed && stream.deepLinks && typeof stream.deepLinks.player === 'string' ?
                                            <Button key={index} className={styles['watch-now']} title={yamboCta.watch} href={stream.deepLinks.player} onClick={stream.onClick}>
                                                <div className={styles['watch-now-icon']}>
                                                    <Icon className={styles['watch-now-play']} name={'play'} />
                                                </div>
                                                <div className={styles['watch-now-text']}>
                                                    <div className={styles['watch-now-label']}>{yamboCta.watch}</div>
                                                    <div className={styles['watch-now-sub']}>
                                                        {
                                                            video && typeof video.season === 'number' && typeof video.episode === 'number' ?
                                                                `${yamboCta.season} ${video.season} · ${yamboCta.episode} ${video.episode}`
                                                                :
                                                                yamboCta.watch_here
                                                        }
                                                    </div>
                                                </div>
                                            </Button>
                                            :
                                            <Stream
                                            key={index}
                                            videoId={video?.id}
                                            videoReleased={video?.released}
                                            addonName={stream.addonName}
                                            name={stream.name}
                                            description={stream.description}
                                            thumbnail={stream.thumbnail}
                                            progress={stream.progress}
                                            deepLinks={stream.deepLinks}
                                            onClick={stream.onClick}
                                        />
                                    ))}
                                    {yamboAppCta}
                                    {
                                        showInstallAddonsButton ?
                                            <Button className={styles['install-button-container']} title={t('ADDON_CATALOGUE_MORE')} href={'#/addons'}>
                                                <Icon className={styles['icon']} name={'addons'} />
                                                <div className={styles['label']}>{t('ADDON_CATALOGUE_MORE')}</div>
                                            </Button>
                                            :
                                            null
                                    }
                                </div>
                            </React.Fragment>
            }
            {!yamboShowingStreams ? yamboAppCta : null}
        </div>
    );
};

StreamsList.propTypes = {
    className: PropTypes.string,
    streams: PropTypes.arrayOf(PropTypes.object).isRequired,
    video: PropTypes.object,
    type: PropTypes.string,
    onEpisodeSearch: PropTypes.func
};

module.exports = StreamsList;
