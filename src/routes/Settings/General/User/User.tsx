import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useServices } from 'stremio/services';
import { Link } from '../../components';
import styles from './User.less';

type Props = {
    profile: Profile,
};

// Yammbo TV: user autenticado en Laravel/Wave inyectado via window.YAMBO_USER.
const getYamboUser = (): { email?: string; name?: string } | null => {
    if (typeof window === 'undefined') return null;
    return (window as any).YAMBO_USER || null;
};

const User = ({ profile }: Props) => {
    const { t } = useTranslation();
    const { core } = useServices();
    const yamboUser = getYamboUser();
    const displayName = yamboUser
        ? (yamboUser.name || yamboUser.email || '')
        : (profile.auth === null ? t('ANONYMOUS_USER') : profile.auth.user.email);

    const avatar = useMemo(() => (
        !profile.auth ?
            `url('${require('/assets/images/anonymous.png')}')`
            :
            profile.auth.user.avatar ?
                `url('${profile.auth.user.avatar}')`
                :
                `url('${require('/assets/images/default_avatar.png')}')`
    ), [profile.auth]);

    const onLogout = useCallback(() => {
        core.transport.dispatch({
            action: 'Ctx',
            args: {
                action: 'Logout'
            }
        });
    }, []);

    return (
        <div className={styles['user']}>
            <div className={styles['user-info-content']}>
                <div
                    className={styles['avatar-container']}
                    style={{ backgroundImage: avatar }}
                />
                <div className={styles['email-logout-container']}>
                    <div className={styles['email-label-container']} title={displayName}>
                        <div className={styles['email-label']}>
                            {displayName}
                        </div>
                    </div>
                    {
                        yamboUser ?
                            <Link
                                label={t('LOG_OUT')}
                                href={'/logout'}
                                target={'_self'}
                            />
                            :
                            profile.auth !== null ?
                                <Link
                                    label={t('LOG_OUT')}
                                    onClick={onLogout}
                                />
                                :
                                <Link
                                    label={`${t('LOG_IN')} / ${t('SIGN_UP')}`}
                                    href={'/login'}
                                    target={'_self'}
                                />
                    }
                </div>
            </div>
        </div>
    );
};

export default User;
