// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, Image } = require('stremio/components');
// Directo, no desde el barrel `stremio/common`: esto es un componente hoja y no
// necesita arrastrar el resto de hooks.
const useTranslate = require('stremio/common/useTranslate');
const styles = require('./styles');

/** Tipos de contenido reales, los únicos que tiene sentido enseñar al usuario. */
const YAMBO_DISPLAY_TYPES = ['movie', 'series', 'anime', 'tv', 'channel', 'collections', 'music', 'events', 'other'];

const Addon = ({ className, id, name, version, logo, description, types, behaviorHints, installed, locked, shareable, onInstall, onUninstall, onConfigure, onOpen, onShare, dataset }) => {
    const { t } = useTranslation();
    const translate = useTranslate();
    const onInstallClick = React.useCallback((event) => {
        event.stopPropagation();
        if (typeof onInstall === 'function') {
            onInstall({
                type: 'install',
                nativeEvent: event.nativeEvent,
                reactEvent: event,
                dataset: dataset
            });
        }
    }, [onInstall, dataset]);
    const onUninstallClick = React.useCallback((event) => {
        event.stopPropagation();
        if (typeof onUninstall === 'function') {
            onUninstall({
                type: 'uninstall',
                nativeEvent: event.nativeEvent,
                reactEvent: event,
                dataset: dataset
            });
        }
    }, [onUninstall, dataset]);
    const onOpenClick = React.useCallback((event) => {
        event.stopPropagation();
        if (typeof onOpen === 'function') {
            onOpen({
                type: 'open',
                nativeEvent: event.nativeEvent,
                reactEvent: event,
                dataset: dataset
            });
        }
    }, [onOpen, dataset]);
    const configureButtonOnClick = React.useCallback((event) => {
        event.stopPropagation();
        if (typeof onConfigure === 'function') {
            onConfigure({
                type: 'configure',
                nativeEvent: event.nativeEvent,
                reactEvent: event,
                dataset: dataset
            });
        }
    }, [onConfigure, dataset]);
    const shareButtonOnClick = React.useCallback((event) => {
        event.stopPropagation();
        if (typeof onShare === 'function') {
            onShare({
                type: 'share',
                nativeEvent: event.nativeEvent,
                reactEvent: event,
                dataset: dataset
            });
        }
    }, [onShare, dataset]);
    const onKeyDown = React.useCallback((event) => {
        if (event.key === 'Enter') {
            onOpenClick(event);
        }
    }, [onOpenClick]);
    const renderLogoFallback = React.useCallback(() => (
        <Icon className={styles['icon']} name={'addons'} />
    ), []);
    // Los tipos venían crudos del manifest y siempre en inglés ("Movie & Series")
    // aunque el resto de la fila estuviese en español. Las claves de traducción
    // son minúsculas: TYPE_movie, TYPE_series, TYPE_tv...
    //
    // Además se filtran los tipos que no son un tipo de contenido sino el
    // nombre interno de una fuente del proveedor ("HdHub"): la fila del
    // complemento premium se leía "Movie, Series, Anime, Tv, Events & HdHub".
    const typesLabel = React.useMemo(() => {
        if (!Array.isArray(types) || types.length === 0) {
            return null;
        }
        const known = types.filter((type) => YAMBO_DISPLAY_TYPES.indexOf(String(type).toLowerCase()) !== -1);
        const shown = known.length > 0 ? known : types;
        const labels = shown.map((type) => translate.stringWithPrefix(String(type).toLowerCase(), 'TYPE_'));
        if (labels.length === 1) {
            return labels[0];
        }
        return labels.slice(0, -1).join(', ') + ' ' + t('YAMBO_AND') + ' ' + labels[labels.length - 1];
    }, [types, translate, t]);
    return (
        <Button className={classnames(className, styles['addon-container'])} onKeyDown={onKeyDown} onClick={onOpenClick}>
            <div className={styles['logo-container']}>
                <Image
                    className={styles['logo']}
                    src={logo}
                    alt={' '}
                    renderFallback={renderLogoFallback}
                />
            </div>
            <div className={styles['info-container']}>
                <div className={styles['name-container']} title={typeof name === 'string' && name.length > 0 ? name : id}>
                    {typeof name === 'string' && name.length > 0 ? name : id}
                </div>
                {
                    typeof version === 'string' && version.length > 0 ?
                        <div className={styles['version-container']} title={t('ADDON_VERSION_SHORT', {version})}>{t('ADDON_VERSION_SHORT', {version})}</div>
                        :
                        null
                }
                {
                    typesLabel !== null ?
                        <div className={styles['types-container']}>{typesLabel}</div>
                        :
                        null
                }
                {
                    typeof description === 'string' && description.length > 0 ?
                        <div className={styles['description-container']} title={description}>{description}</div>
                        :
                        null
                }
            </div>
            <div className={styles['buttons-container']}>
                <div className={styles['action-buttons-container']}>
                    {
                        !locked && !behaviorHints.configurationRequired && behaviorHints.configurable ?
                            <Button className={styles['configure-button-container']} title={t('ADDON_CONFIGURE')} tabIndex={-1} onClick={configureButtonOnClick}>
                                <Icon className={styles['icon']} name={'settings'} />
                            </Button>
                            :
                            null
                    }
                    {
                        /*
                         * Yammbo TV: los complementos que gestiona el plan no se
                         * desinstalan a mano. La política los reinstala en el
                         * siguiente cambio de estado, así que el botón parecía
                         * roto: lo pulsabas, la fila desaparecía y volvía sola.
                         */
                        locked ?
                            <div className={styles['yambo-managed-label']} title={t('YAMBO_ADDON_MANAGED')}>
                                {t('YAMBO_ADDON_MANAGED')}
                            </div>
                            :
                            <Button
                                className={installed ? styles['uninstall-button-container'] : styles['install-button-container']}
                                title={installed ? t('ADDON_UNINSTALL') : behaviorHints.configurationRequired ? t('ADDON_CONFIGURE') : t('ADDON_INSTALL')}
                                tabIndex={-1}
                                onClick={installed ? onUninstallClick : behaviorHints.configurationRequired ? configureButtonOnClick : onInstallClick}
                            >
                                <div className={styles['label']}>{installed ? t('ADDON_UNINSTALL') : behaviorHints.configurationRequired ? t('ADDON_CONFIGURE') : t('ADDON_INSTALL')}</div>
                            </Button>
                    }
                </div>
                {
                    /*
                     * El botón de compartir enseña la transportUrl con botones de
                     * Facebook, X y Reddit. Para el complemento premium eso es
                     * repartir un token de esta cuenta con un clic, así que ahí
                     * no se ofrece.
                     */
                    shareable ?
                        <Button className={styles['share-button-container']} title={t('SHARE_ADDON')} tabIndex={-1} onClick={shareButtonOnClick}>
                            <Icon className={styles['icon']} name={'share'} />
                            <div className={styles['label']}>{ t('SHARE_ADDON') }</div>
                        </Button>
                        :
                        null
                }
            </div>
        </Button>
    );
};

Addon.defaultProps = {
    shareable: true,
    locked: false,
};

Addon.propTypes = {
    className: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
    version: PropTypes.string,
    logo: PropTypes.string,
    description: PropTypes.string,
    types: PropTypes.arrayOf(PropTypes.string),
    behaviorHints: PropTypes.shape({
        adult: PropTypes.bool,
        configurable: PropTypes.bool,
        configurationRequired: PropTypes.bool,
        p2p: PropTypes.bool,
    }),
    installed: PropTypes.bool,
    locked: PropTypes.bool,
    shareable: PropTypes.bool,
    onToggle: PropTypes.func,
    onInstall: PropTypes.func,
    onUninstall: PropTypes.func,
    onConfigure: PropTypes.func,
    onOpen: PropTypes.func,
    onShare: PropTypes.func,
    dataset: PropTypes.object
};

module.exports = Addon;
