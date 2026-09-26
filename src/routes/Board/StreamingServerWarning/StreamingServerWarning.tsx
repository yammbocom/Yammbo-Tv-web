// Copyright (C) 2017-2024 Smart code 203358507

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import { useServices } from 'stremio/services';
import { Button } from 'stremio/components';
import useProfile from 'stremio/common/useProfile';
import { withCoreSuspender } from 'stremio/common/CoreSuspender';
import styles from './StreamingServerWarning.less';

type Props = {
    className?: string;
};

const StreamingServerWarning = ({ className }: Props) => {
    const { i18n } = useTranslation();
    const { core } = useServices();
    const profile = useProfile();

    // Yammbo Tv: localized copy without relying on the i18n bundle. The web
    // needs a local streaming server to play; which app fixes that depends on
    // the device, so the message and the link follow the platform.
    const lang = (i18n && i18n.language ? i18n.language : 'en').toLowerCase();
    const isEs = lang.indexOf('es') === 0;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isAndroid = /Android/i.test(ua);
    const isWindows = /Windows/i.test(ua);
    const title = isEs ? 'Para reproducir, instala la app' : 'Install the app to play';
    const statement = isAndroid
        ? (isEs ? 'En el navegador no se pueden reproducir películas ni series. Con la app de Yammbo Tv para Android sí, con tu misma cuenta.' : 'Movies and series can\'t play in the browser. The Yammbo Tv Android app plays them, with your same account.')
        : isWindows
            ? (isEs ? 'Instala Yammbo TV Service en tu PC: es gratis y tarda un minuto. Después podrás reproducir aquí mismo.' : 'Install Yammbo TV Service on your PC: it is free and takes a minute. Then you can play right here.')
            : (isEs ? 'En el navegador no se pueden reproducir películas ni series. Instala la app en tu teléfono Android, tu TV o tu PC con Windows.' : 'Movies and series can\'t play in the browser. Install the app on your Android phone, your TV or your Windows PC.');
    const installHref = 'https://tv.yammbo.com/install' + (isAndroid ? '#movil' : isWindows ? '#windows' : '');
    const installLabel = isAndroid
        ? (isEs ? 'Descargar la app' : 'Get the app')
        : isWindows
            ? (isEs ? 'Descargar para Windows' : 'Download for Windows')
            : (isEs ? 'Ver cómo instalar' : 'See how to install');
    const laterLabel = isEs ? 'Más tarde' : 'Later';
    const dismissLabel = isEs ? 'No mostrar de nuevo' : 'Don\'t show again';

    const createDismissalDate = (months: number, years = 0): Date => {
        const dismissalDate = new Date();

        if (months) {
            dismissalDate.setMonth(dismissalDate.getMonth() + months);
        }
        if (years) {
            dismissalDate.setFullYear(dismissalDate.getFullYear() + years);
        }

        return dismissalDate;
    };

    const updateSettings = useCallback((streamingServerWarningDismissed: Date) => {
        core.transport.dispatch({
            action: 'Ctx',
            args: {
                action: 'UpdateSettings',
                args: {
                    ...profile.settings,
                    streamingServerWarningDismissed
                }
            }
        });
    }, [profile.settings]);

    const onLater = useCallback(() => {
        updateSettings(createDismissalDate(1));
    }, [updateSettings]);

    const onDismiss = useCallback(() => {
        updateSettings(createDismissalDate(0, 50));
    }, [updateSettings]);

    return (
        <div className={classnames(className, styles['warning-container'])} role={'region'} aria-label={title}>
            <div className={styles['warning-text']}>
                <div className={styles['warning-title']}>{title}</div>
                <div className={styles['warning-statement']}>{statement}</div>
            </div>
            <div className={styles['actions']}>
                <a className={styles['primary']} href={installHref} target={'_blank'} rel={'noreferrer'}>
                    <svg viewBox={'0 0 24 24'} className={styles['icon']} aria-hidden={'true'}><path d={'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2'} /></svg>
                    {installLabel}
                </a>
                <Button className={styles['secondary']} title={laterLabel} onClick={onLater}>
                    {laterLabel}
                </Button>
                <Button className={styles['link']} title={dismissLabel} onClick={onDismiss}>
                    {dismissLabel}
                </Button>
            </div>
        </div>
    );
};

export default withCoreSuspender(StreamingServerWarning);
