// Copyright (C) 2017-2024 Smart code 203358507

import React, { useMemo, useCallback, useState, useEffect, forwardRef, memo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import Icon from '@stremio/stremio-icons/react';
import { useServices } from 'stremio/services';
import { CONSTANTS } from 'stremio/common';
import { MetaPreview, Video } from 'stremio/components';
import SeasonsBar from 'stremio/routes/MetaDetails/VideosList/SeasonsBar';
import { buildLiveChannelPlayerHash, type LiveChannel, type LiveChannelsRelated } from './liveChannelLink';
import styles from './SideDrawer.less';

// Yammbo TV: heading of the live channel zapping list
const YAMBO_MORE_CHANNELS: Record<string, string> = {
    en: 'More channels',
    es: 'Más canales',
};

// Yammbo TV: heading of the "similar" list for movies/series
const YAMBO_SIMILAR: Record<string, string> = {
    en: 'More like this',
    es: 'Parecidas',
};

type SimilarMeta = {
    id: string;
    name: string;
    poster: string | null;
};

type Props = {
    className?: string;
    seriesInfo: SeriesInfo;
    metaItem: MetaItem;
    closeSideDrawer: () => void;
    selected: string;
    transitionEnded: boolean;
};

const SideDrawer = memo(forwardRef<HTMLDivElement, Props>(({ seriesInfo, className, closeSideDrawer, selected, ...props }: Props, ref) => {
    const { core } = useServices();
    const { i18n } = useTranslation();
    const [season, setSeason] = useState<number>(seriesInfo?.season);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

    const metaItem = useMemo(() => {
        return seriesInfo ?
            {
                ...props.metaItem,
                links: props.metaItem.links.filter(({ category }) => category === CONSTANTS.SHARE_LINK_CATEGORY)
            }
            :
            props.metaItem;
    }, [props.metaItem]);
    const videos = useMemo(() => {
        return Array.isArray(metaItem.videos) ?
            metaItem.videos.filter((video) => video.season === season)
            :
            metaItem.videos;
    }, [metaItem, season]);
    const seasons = useMemo(() => {
        return props.metaItem.videos
            .map(({ season }) => season)
            .filter((season, index, seasons) => {
                return seasons.indexOf(season) === index;
            })
            .sort((a, b) => (a || Number.MAX_SAFE_INTEGER) - (b || Number.MAX_SAFE_INTEGER));
    }, [props.metaItem.videos]);

    const seasonOnSelect = useCallback((event: { value: string }) => {
        setSeason(parseInt(event.value));
    }, []);

    const seasonWatched = React.useMemo(() => {
        return videos.every((video) => video.watched);
    }, [videos]);

    const onMarkVideoAsWatched = useCallback((video: Video, watched: boolean) => {
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'MarkVideoAsWatched',
                args: [video, !watched]
            }
        });
    }, []);

    const onMarkSeasonAsWatched = (season: number, watched: boolean) => {
        core.transport.dispatch({
            action: 'Player',
            args: {
                action: 'MarkSeasonAsWatched',
                args: [season, !watched]
            }
        });
    };

    // Yammbo TV: other channels of the same catalog, to zap from the drawer
    const liveChannelId = props.metaItem?.id;
    const [related, setRelated] = useState<LiveChannelsRelated | null>(null);
    useEffect(() => {
        setRelated(null);
        if (typeof liveChannelId !== 'string' || !liveChannelId.startsWith('yiptv:')) {
            return;
        }
        const controller = new AbortController();
        fetch(`${window.location.origin}/iptv/related/tv/${encodeURIComponent(liveChannelId)}.json`, { signal: controller.signal })
            .then((response) => response.ok ? response.json() : null)
            .then((data) => {
                if (data && data.catalog && Array.isArray(data.channels) && data.channels.length > 0) {
                    setRelated({ catalog: data.catalog, channels: data.channels });
                }
            })
            .catch(() => { /* ignore: the list is optional */ });
        return () => controller.abort();
    }, [liveChannelId]);
    const yamboLocaleShort = String(i18n?.language || 'en').split('-')[0].toLowerCase();
    const moreChannelsLabel = YAMBO_MORE_CHANNELS[yamboLocaleShort] || YAMBO_MORE_CHANNELS.en;
    const similarLabel = YAMBO_SIMILAR[yamboLocaleShort] || YAMBO_SIMILAR.en;

    // Yammbo TV: recomendaciones ("parecidas") desde el backend, para películas y series
    const metaId = props.metaItem?.id;
    const metaType = props.metaItem?.type;
    const [similar, setSimilar] = useState<SimilarMeta[] | null>(null);
    useEffect(() => {
        setSimilar(null);
        if (seriesInfo || typeof metaId !== 'string' || !metaId.startsWith('comx:')) {
            return;
        }
        if (metaType !== 'movie' && metaType !== 'series') {
            return;
        }
        const controller = new AbortController();
        fetch(`${window.location.origin}/similar/${metaType}/${encodeURIComponent(metaId)}.json`, { signal: controller.signal })
            .then((response) => response.ok ? response.json() : null)
            .then((data: { metas?: Array<{ id: string; name: string; poster: string | null }> } | null) => {
                if (data && Array.isArray(data.metas) && data.metas.length > 0) {
                    setSimilar(data.metas.map((m) => ({ id: m.id, name: m.name, poster: m.poster ?? null })));
                }
            })
            .catch(() => { /* ignore: the list is optional */ });
        return () => controller.abort();
    }, [metaId, metaType, seriesInfo]);

    const onLiveChannelClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>, channel: LiveChannel) => {
        if (typeof window.CompressionStream !== 'function') {
            return;
        }
        event.preventDefault();
        const fallback = event.currentTarget.href;
        buildLiveChannelPlayerHash(channel)
            .then((hash) => {
                closeSideDrawer();
                window.location.replace(hash);
            })
            .catch(() => {
                window.location.href = fallback;
            });
    }, [closeSideDrawer]);

    const onMouseDown = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    const onTransitionEnd = useCallback(() => {
        setSelectedVideoId(selected);
    }, [selected]);

    return (
        <div ref={ref} className={classNames(styles['side-drawer'], className)} onMouseDown={onMouseDown} onTransitionEnd={onTransitionEnd}>
            <div className={styles['close-button']} onClick={closeSideDrawer}>
                <Icon className={styles['icon']} name={'chevron-forward'} />
            </div>
            <div className={styles['info']}>
                <MetaPreview
                    className={styles['side-drawer-meta-preview']}
                    compact={true}
                    name={metaItem.name}
                    logo={metaItem.logo}
                    runtime={metaItem.runtime}
                    releaseInfo={metaItem.releaseInfo}
                    released={metaItem.released}
                    description={metaItem.description}
                    links={metaItem.links}
                />
            </div>
            {
                seriesInfo ?
                    <div className={styles['series-content']}>
                        <SeasonsBar
                            season={season}
                            seasons={seasons}
                            onSelect={seasonOnSelect}
                        />
                        <div className={styles['videos']}>
                            {videos.map((video, index) => (
                                <Video
                                    key={index}
                                    className={styles['video']}
                                    id={video.id}
                                    title={video.title}
                                    thumbnail={video.thumbnail}
                                    season={video.season}
                                    episode={video.episode}
                                    released={video.released}
                                    upcoming={video.upcoming}
                                    watched={video.watched}
                                    seasonWatched={seasonWatched}
                                    progress={video.progress}
                                    deepLinks={video.deepLinks}
                                    scheduled={video.scheduled}
                                    selected={video.id === selectedVideoId}
                                    onMarkVideoAsWatched={onMarkVideoAsWatched}
                                    onMarkSeasonAsWatched={onMarkSeasonAsWatched}
                                />
                            ))}
                        </div>
                    </div>
                    : null
            }
            {
                !seriesInfo && related ?
                    <div className={styles['live-channels']}>
                        <div className={styles['live-channels-title']}>{moreChannelsLabel} · {related.catalog.name}</div>
                        <div className={styles['live-channels-list']}>
                            {related.channels.map((channel) => (
                                <a
                                    key={channel.id}
                                    className={styles['live-channel']}
                                    href={`#/detail/tv/${encodeURIComponent(channel.id)}`}
                                    onClick={(event) => onLiveChannelClick(event, channel)}
                                >
                                    <div className={styles['live-channel-logo']}>
                                        {
                                            channel.logo ?
                                                <img src={channel.logo} alt={''} loading={'lazy'} />
                                                :
                                                <span>{String(channel.name || '?').charAt(0).toUpperCase()}</span>
                                        }
                                    </div>
                                    <div className={styles['live-channel-info']}>
                                        <div className={styles['live-channel-name']}>{channel.name}</div>
                                        {channel.description ? <div className={styles['live-channel-description']}>{channel.description}</div> : null}
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                    : null
            }
            {
                !seriesInfo && similar ?
                    <div className={styles['similar']}>
                        <div className={styles['similar-title']}>{similarLabel}</div>
                        <div className={styles['similar-list']}>
                            {similar.map((meta) => (
                                <a
                                    key={meta.id}
                                    className={styles['similar-item']}
                                    href={`#/detail/${metaType}/${encodeURIComponent(meta.id)}`}
                                >
                                    <div className={styles['similar-poster']}>
                                        {
                                            meta.poster ?
                                                <img src={meta.poster} alt={''} loading={'lazy'} />
                                                :
                                                <span>{String(meta.name || '?').charAt(0).toUpperCase()}</span>
                                        }
                                    </div>
                                    <div className={styles['similar-name']}>{meta.name}</div>
                                </a>
                            ))}
                        </div>
                    </div>
                    : null
            }
        </div>
    );
}));

export default SideDrawer;
