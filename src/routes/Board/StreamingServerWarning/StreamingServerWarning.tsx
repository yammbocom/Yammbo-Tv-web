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

    // Yammbo Tv: localized copy without relying on the i18n bundle.
    const lang = (i18n && i18n.language ? i18n.language : 'en').toLowerCase();
    const isEs = lang.indexOf('es') === 0;
    const statement = isEs
        ? 'Para reproducir películas y series necesitas instalar Yammbo TV Service en tu equipo. Es gratis y rápido.'
        : 'To play movies and series you need to install Yammbo TV Service on your device. It is free and quick.';
    const installLabel = isEs ? 'Cómo instalar' : 'How to install';
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
        <div className={classnames(className, styles['warning-container'])}>
            <div className={styles['warning-statement']}>
                {statement}
            </div>
            <div className={styles['actions']}>
                <a
                    href='https://tv.yammbo.com/install'
                    target='_blank'
                    rel='noreferrer'
                >
                    <Button
                        className={styles['action']}
                        title={installLabel}
                        tabIndex={-1}
                    >
                        <div className={styles['label']}>
                            {installLabel}
                        </div>
                    </Button>
                </a>
                <Button
                    className={styles['action']}
                    title={laterLabel}
                    onClick={onLater}
                    tabIndex={-1}
                >
                    <div className={styles['label']}>
                        {laterLabel}
                    </div>
                </Button>
                <Button
                    className={styles['action']}
                    title={dismissLabel}
                    onClick={onDismiss}
                    tabIndex={-1}
                >
                    <div className={styles['label']}>
                        {dismissLabel}
                    </div>
                </Button>
            </div>
        </div>
    );
};

export default withCoreSuspender(StreamingServerWarning);
