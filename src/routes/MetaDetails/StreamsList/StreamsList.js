// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, Image, MultiselectMenu } = require('stremio/components');
const { useServices } = require('stremio/services');
const Stream = require('./Stream');
const styles = require('./styles');
const { usePlatform, useProfile, useYamboUser } = require('stremio/common');
const { default: SeasonEpisodePicker } = require('../EpisodePicker');

const ALL_ADDONS_KEY = 'ALL';

// Yammbo TV: textos del CTA "Hazte Premium" para stream vacío
const YAMBO_STREAM_CTA = {
    en: { title: 'Unlock streams with Premium', subtitle: 'Your subscription gives you instant access to community addons.', button: 'Go Premium', active: 'Premium active', not_found: 'No streams found yet — try again in a moment.' },
    es: { title: 'Desbloquea los streams con Premium', subtitle: 'Con tu suscripción tendrás acceso instantáneo a los addons de la comunidad.', button: 'Hazte Premium', active: 'Premium activo', not_found: 'Aún no encontramos streams — inténtalo en un momento.' },
    pt: { title: 'Desbloqueie os streams com Premium', subtitle: 'Sua assinatura dá acesso instantâneo aos addons da comunidade.', button: 'Seja Premium', active: 'Premium ativo', not_found: 'Ainda não encontramos streams — tente novamente em instantes.' },
    fr: { title: 'Débloquez les streams avec Premium', subtitle: 'Votre abonnement donne accès aux addons de la communauté.', button: 'Passer Premium', active: 'Premium actif', not_found: 'Aucun stream pour le moment — réessayez dans un instant.' },
};

const StreamsList = ({ className, video, type, onEpisodeSearch, ...props }) => {
    const { t, i18n } = useTranslation();
    const { core } = useServices();
    const platform = usePlatform();
    const profile = useProfile();
    const streamsContainerRef = React.useRef(null);
    const [selectedAddon, setSelectedAddon] = React.useState(ALL_ADDONS_KEY);
    const onAddonSelected = React.useCallback((value) => {
        streamsContainerRef.current.scrollTo({ top: 0, left: 0, behavior: platform.name === 'ios' ? 'smooth' : 'instant' });
        setSelectedAddon(value);
    }, [platform]);
    // Yammbo TV: reemplazamos el CTA "Install addons" por "Hazte Premium" cuando no
    // hay suscripción. Los usuarios premium tienen el addon AIOStreams auto-instalado.
    const yamboUser = useYamboUser();
    const yamboPremium = !!(yamboUser && yamboUser.subscription_active);
    const yamboLocaleShort = (() => {
        const raw = (i18n && i18n.language) ? i18n.language : 'en';
        return String(raw).split('-')[0].toLowerCase();
    })();
    const yamboL = YAMBO_STREAM_CTA[yamboLocaleShort] || YAMBO_STREAM_CTA.en;
    const showInstallAddonsButton = React.useMemo(() => {
        return !profile || profile.auth === null || profile.auth?.user?.isNewUser === true && !video?.upcoming;
    }, [profile, video]);
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
                        <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                        <div className={styles['label']}>{t('ERR_NO_ADDONS_FOR_STREAMS')}</div>
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
                            <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                            <div className={styles['label']}>{t('NO_STREAM')}</div>
                            {
                                !yamboPremium ?
                                    <div style={yamboCtaStyles.wrap}>
                                        <div style={yamboCtaStyles.title}>{yamboL.title}</div>
                                        <div style={yamboCtaStyles.subtitle}>{yamboL.subtitle}</div>
                                        <a href={'/pricing'} style={yamboCtaStyles.button}>{yamboL.button}</a>
                                    </div>
                                    :
                                    <div style={yamboCtaStyles.wrapQuiet}>
                                        <div style={yamboCtaStyles.activePill}>★ {yamboL.active}</div>
                                        <div style={yamboCtaStyles.quietLine}>{yamboL.not_found}</div>
                                    </div>
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

const yamboCtaStyles = {
    wrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 20px', background: 'linear-gradient(135deg,#1a0808,#0a0a0a)', border: '1px solid rgba(229,9,20,0.35)', borderRadius: 12, margin: '16px 0', textAlign: 'center' },
    wrapQuiet: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px', textAlign: 'center' },
    title: { fontSize: 17, fontWeight: 700, color: '#fff' },
    subtitle: { fontSize: 13, color: '#bdbdbd', maxWidth: 340, lineHeight: 1.45 },
    button: { background: '#E50914', color: '#fff', padding: '10px 22px', borderRadius: 999, fontSize: 14, fontWeight: 700, textDecoration: 'none', marginTop: 4 },
    activePill: { background: 'rgba(229,9,20,0.15)', color: '#E50914', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
    quietLine: { color: '#888', fontSize: 13 },
};

module.exports = StreamsList;
