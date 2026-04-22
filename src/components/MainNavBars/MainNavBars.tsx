// Copyright (C) 2017-2023 Smart code 203358507

import React, { memo, useMemo } from 'react';
import classnames from 'classnames';
import { VerticalNavBar, HorizontalNavBar } from 'stremio/components/NavBar';
import { useProfile } from 'stremio/common';
import styles from './MainNavBars.less';

const TABS = [
    { id: 'board', label: 'Board', icon: 'home', href: '#/' },
    { id: 'discover', label: 'Discover', icon: 'discover', href: '#/discover' },
    { id: 'library', label: 'Library', icon: 'library', href: '#/library', requiresStremioAuth: true },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', href: '#/calendar', requiresStremioAuth: true },
    { id: 'addons', label: 'ADDONS', icon: 'addons', href: '#/addons' },
    { id: 'settings', label: 'SETTINGS', icon: 'settings', href: '#/settings' },
];

// Yammbo TV: cuando el user está autenticado en Laravel/Wave pero NO en Stremio Cloud,
// oculta las tabs que dependen exclusivamente de Stremio Cloud (Library / Calendar).
const filterTabsForYamboUser = (tabs: typeof TABS, stremioAuthed: boolean) => {
    if (typeof window === 'undefined') return tabs;
    const yamboUser = (window as any).YAMBO_USER;
    if (!yamboUser || stremioAuthed) return tabs;
    return tabs.filter((t) => !t.requiresStremioAuth);
};

type Props = {
    className: string,
    route?: string,
    query?: string,
    children?: React.ReactNode,
};

const MainNavBars = memo(({ className, route, query, children }: Props) => {
    const profile = useProfile();
    const visibleTabs = useMemo(
        () => filterTabsForYamboUser(TABS, profile.auth !== null),
        [profile.auth]
    );

    return (
        <div className={classnames(className, styles['main-nav-bars-container'])}>
            <HorizontalNavBar
                className={styles['horizontal-nav-bar']}
                route={route}
                query={query}
                backButton={false}
                searchBar={true}
                fullscreenButton={true}
                navMenu={true}
            />
            <VerticalNavBar
                className={styles['vertical-nav-bar']}
                selected={route}
                tabs={visibleTabs}
            />
            <div className={styles['nav-content-container']}>{children}</div>
        </div>
    );
});

export default MainNavBars;
