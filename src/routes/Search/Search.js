// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const useTranslate = require('stremio/common/useTranslate');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { withCoreSuspender, getVisibleChildrenRange } = require('stremio/common');
const { Image, MainNavBars, MetaItem, MetaRow } = require('stremio/components');
const useSearch = require('./useSearch');
const { YAMBO_IPTV_ID } = require('stremio/common/yamboAddons');
const styles = require('./styles');

const THRESHOLD = 100;

// Yammbo TV: cada categoría de canales responde a la búsqueda y repetía los
// mismos canales en 9 filas. Queda solo "Todos los canales".
const isHiddenCatalog = (catalog) => catalog.addon?.manifest?.id === YAMBO_IPTV_ID && catalog.id !== 'iptv-all';
// Fila que respondió sin resultados: no se pinta.
const isEmptyCatalog = (catalog) => catalog.content?.type === 'Err' && catalog.content.content === 'EmptyContent';

const Search = ({ queryParams }) => {
    const t = useTranslate();
    const [search, loadSearchRows] = useSearch(queryParams);
    const query = React.useMemo(() => {
        return search.selected !== null ?
            search.selected.extra.reduceRight((query, [name, value]) => {
                if (name === 'search') {
                    return value;
                }

                return query;
            }, null)
            :
            null;
    }, [search.selected]);
    const scrollContainerRef = React.useRef();
    // Las filas ocultas y las vacías no están en el DOM: el rango visible se
    // cuenta en filas pintadas y hay que traducirlo a índices de catálogo antes
    // de pedirlo. Contando las vacías, la fila de canales tras dos filas vacías
    // nunca se pedía y se quedaba en esqueleto.
    const shownIndexes = React.useMemo(() => {
        return search.catalogs.reduce((indexes, catalog, index) => {
            if (!isHiddenCatalog(catalog) && !isEmptyCatalog(catalog)) {
                indexes.push(index);
            }
            return indexes;
        }, []);
    }, [search.catalogs]);
    const onVisibleRangeChange = React.useCallback(() => {
        if (search.catalogs.length === 0 || shownIndexes.length === 0) {
            return;
        }

        const range = getVisibleChildrenRange(scrollContainerRef.current, THRESHOLD);
        if (range === null) {
            return;
        }

        loadSearchRows({
            start: shownIndexes[Math.min(range.start, shownIndexes.length - 1)],
            end: shownIndexes[Math.min(range.end, shownIndexes.length - 1)]
        });
    }, [search.catalogs, shownIndexes]);
    // Yammbo TV: las filas vacías no se pintan; si todas vuelven vacías la
    // pantalla quedaba en negro y parecía que la búsqueda no había funcionado.
    const noResults = React.useMemo(() => {
        const shown = search.catalogs.filter((catalog) => !isHiddenCatalog(catalog));
        return shown.length > 0 && shown.every(isEmptyCatalog);
    }, [search.catalogs]);
    const onScroll = React.useCallback(debounce(onVisibleRangeChange, 250), [onVisibleRangeChange]);
    React.useLayoutEffect(() => {
        onVisibleRangeChange();
    }, [search.catalogs, onVisibleRangeChange]);
    return (
        <MainNavBars className={styles['search-container']} route={'search'} query={query}>
            <div ref={scrollContainerRef} className={styles['search-content']} onScroll={onScroll}>
                {
                    query === null ?
                        <div className={classnames(styles['search-hints-wrapper'])}>
                            <div className={classnames(styles['search-hints-title-container'], 'animation-fade-in')}>
                                <div className={styles['search-hints-title']}>{t.string('SEARCH_ANYTHING')}</div>
                            </div>
                            <div className={classnames(styles['search-hints-container'], 'animation-fade-in')}>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'trailer'} />
                                    <div className={styles['label']}>{t.string('SEARCH_CATEGORIES')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'actors'} />
                                    <div className={styles['label']}>{t.string('SEARCH_PERSONS')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'link'} />
                                    <div className={styles['label']}>{t.string('SEARCH_PROTOCOLS')}</div>
                                </div>
                                <div className={styles['search-hint-container']}>
                                    <Icon className={styles['icon']} name={'imdb-outline'} />
                                    <div className={styles['label']}>{t.string('SEARCH_TYPES')}</div>
                                </div>
                            </div>
                        </div>
                        :
                        search.catalogs.length === 0 ?
                            <div className={styles['message-container']}>
                                <Image
                                    className={styles['image']}
                                    src={require('/assets/images/empty.png')}
                                    alt={' '}
                                />
                                <div className={styles['message-label']}>{ t.string('STREMIO_TV_SEARCH_NO_ADDONS') }</div>
                            </div>
                            :
                            noResults ?
                                <div className={classnames(styles['no-results'], 'animation-fade-in')}>{ t.string('SEARCH_NO_RESULTS') }</div>
                                :
                                search.catalogs.map((catalog, index) => {
                                    if (isHiddenCatalog(catalog)) {
                                        return null;
                                    }
                                    switch (catalog.content?.type) {
                                        case 'Ready': {
                                            return (
                                                <MetaRow
                                                    key={index}
                                                    className={classnames(styles['search-row'], styles[`search-row-${catalog.content.content[0].posterShape}`], 'animation-fade-in')}
                                                    catalog={catalog}
                                                    itemComponent={MetaItem}
                                                />
                                            );
                                        }
                                        case 'Err': {
                                            if (catalog.content.content !== 'EmptyContent') {
                                                return (
                                                    <MetaRow
                                                        key={index}
                                                        className={classnames(styles['search-row'], 'animation-fade-in')}
                                                        catalog={catalog}
                                                        message={catalog.content.content}
                                                    />
                                                );
                                            }
                                            return null;
                                        }
                                        default: {
                                            return (
                                                <MetaRow.Placeholder
                                                    key={index}
                                                    className={classnames(styles['search-row'], styles['search-row-poster'], 'animation-fade-in')}
                                                    catalog={catalog}
                                                    title={t.catalogTitle(catalog)}
                                                />
                                            );
                                        }
                                    }
                                })
                }
            </div>
        </MainNavBars>
    );
};

Search.propTypes = {
    queryParams: PropTypes.instanceOf(URLSearchParams)
};

const SearchFallback = ({ queryParams }) => (
    <MainNavBars className={styles['search-container']} route={'search'} query={queryParams.get('search') ?? queryParams.get('query')} />
);

SearchFallback.propTypes = Search.propTypes;

module.exports = withCoreSuspender(Search, SearchFallback);
