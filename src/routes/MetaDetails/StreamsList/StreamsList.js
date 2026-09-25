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

// Yammbo TV: textos del CTA "Hazte Premium" para stream vacío
const YAMBO_STREAM_CTA = {
    en: { title: 'Unlock streams with Premium', subtitle: 'Your subscription gives you instant access to community addons.', button: 'Go Premium', active: 'Premium active', not_found: 'No streams found yet — try again in a moment.', app_title: 'Watch it in the Yammbo Tv app', app_sub_premium: 'Your subscription works there too — streams play normally in the app.', app_sub_free: 'Install the app and try it free for 7 days.', app_mobile: 'Get it for Android', app_tv: 'Get it for TV' },
    es: { title: 'Desbloquea los streams con Premium', subtitle: 'Con tu suscripción tendrás acceso instantáneo a los addons de la comunidad.', button: 'Hazte Premium', active: 'Premium activo', not_found: 'Aún no encontramos streams — inténtalo en un momento.', app_title: 'Míralo en la app de Yammbo Tv', app_sub_premium: 'Tu suscripción también vale ahí — en la app el contenido sí reproduce.', app_sub_free: 'Instala la app y pruébala gratis 7 días.', app_mobile: 'Descargar para Android', app_tv: 'Descargar para TV' },
    pt: { title: 'Desbloqueie os streams com Premium', subtitle: 'Sua assinatura dá acesso instantâneo aos addons da comunidade.', button: 'Seja Premium', active: 'Premium ativo', not_found: 'Ainda não encontramos streams — tente novamente em instantes.', app_title: 'Assista no app Yammbo Tv', app_sub_premium: 'Sua assinatura vale lá também — no app o conteúdo reproduz normalmente.', app_sub_free: 'Instale o app e experimente 7 dias grátis.', app_mobile: 'Baixar para Android', app_tv: 'Baixar para TV' },
    fr: { title: 'Débloquez les streams avec Premium', subtitle: 'Votre abonnement donne accès aux addons de la communauté.', button: 'Passer Premium', active: 'Premium actif', not_found: 'Aucun stream pour le moment — réessayez dans un instant.', app_title: 'Regardez-le dans l\'application Yammbo Tv', app_sub_premium: 'Votre abonnement fonctionne aussi — la lecture marche dans l\'app.', app_sub_free: 'Installez l\'app et essayez 7 jours gratuits.', app_mobile: 'Télécharger pour Android', app_tv: 'Télécharger pour TV' },
};

// Yammbo TV: estilos del bloque "Miralo en la app"
// Yammbo TV: un solo boton hacia /install, que ya elige la version por dispositivo
const YAMBO_APP_CTA = {
    en: { cta: 'Download the app', devices: 'Android · TV · Windows' },
    es: { cta: 'Descargar la app', devices: 'Android · TV · Windows' },
    pt: { cta: 'Baixar o app', devices: 'Android · TV · Windows' },
    fr: { cta: 'Télécharger l\'app', devices: 'Android · TV · Windows' },
};

const yamboAppStyles = {
    wrap: { margin: '0 auto 1rem', padding: '1.2rem 1rem', borderRadius: '0.8rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', maxWidth: '32rem' },
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
    const yamboCta = YAMBO_APP_CTA[yamboLocaleShort] || YAMBO_APP_CTA.en;
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
            {
                /*
                 * Yammbo TV: arriba del todo y siempre visible. La web no puede
                 * reproducir (sin un servicio debrid no hay enlaces HTTP), asi que
                 * no tiene sentido hacer esperar a que la busqueda acabe en vacio:
                 * se ofrecen las apps desde el primer momento.
                 */
                <div style={yamboAppStyles.wrap}>
                    <div style={yamboAppStyles.title}>{yamboL.app_title}</div>
                    <div style={yamboAppStyles.subtitle}>
                        {yamboPremium ? yamboL.app_sub_premium : yamboL.app_sub_free}
                    </div>
                    <div style={yamboAppStyles.row}>
                        <a href={'https://tv.yammbo.com/install'} target={'_blank'} rel={'noopener noreferrer'} style={yamboAppStyles.btnPrimary}>
                            <svg viewBox={'0 0 24 24'} style={yamboAppStyles.icon} fill={'none'} stroke={'currentColor'} strokeWidth={2} strokeLinecap={'round'} strokeLinejoin={'round'} aria-hidden={'true'}><path d={'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2'} /></svg>
                            {yamboCta.cta}
                        </a>
                    </div>
                    <div style={yamboAppStyles.devices}>{yamboCta.devices}</div>
                </div>
            }
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
