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
    // plays everything now, so this is only a suggestion to also install the
    // apps (Android phones, Android TV, Fire TV); the link follows the device.
    const lang = (i18n && i18n.language ? i18n.language : 'en').toLowerCase();
    const isEs = lang.indexOf('es') === 0;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isAndroid = /Android/i.test(ua);
    const title = isEs ? 'Yammbo Tv también en tu móvil y tu TV' : 'Yammbo Tv on your phone and TV too';
    const statement = isAndroid
        ? (isEs ? 'Ya puedes verlo aquí. Con la app para Android lo tienes siempre a mano, con tu misma cuenta y tu progreso.' : 'You can already watch it here. The Android app keeps it at hand, with your same account and progress.')
        : (isEs ? 'Ya puedes verlo aquí. También tienes la app para móviles Android, Android TV y Fire TV, con tu misma cuenta y tu progreso.' : 'You can already watch it here. There is also an app for Android phones, Android TV and Fire TV, with your same account and progress.');
    const installHref = 'https://tv.yammbo.com/install' + (isAndroid ? '#movil' : '');
    const installLabel = isAndroid
        ? (isEs ? 'Descargar la app' : 'Get the app')
        : (isEs ? 'Ver las apps' : 'See the apps');
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
