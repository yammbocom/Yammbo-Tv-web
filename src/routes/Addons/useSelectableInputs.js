// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslate } = require('stremio/common');
const { YAMBO_CATALOG_SELECT_ID } = require('stremio/common/yamboAddons');

const mapSelectableInputs = (installedAddons, remoteAddons, t) => {
    // Yammbo TV: del selector de catálogos sólo sobrevive el nuestro.
    //
    // Cinemeta ofrecía además "Official" y "Community". Community eran 95
    // complementos que no elegimos ni controlamos, servidos desde
    // v3-cinemeta.strem.io, en inglés, casi la mitad exigiendo configurarse en
    // webs de terceros, y con los logos repartidos por 53 hosts distintos que
    // veían la IP de cada usuario de pago. El nuestro sale de
    // /addon_catalog/all/yammbo.json.
    const remoteCatalogs = remoteAddons.selectable.catalogs
        .filter(({ id }) => id === YAMBO_CATALOG_SELECT_ID);

    const selectedCatalog = remoteCatalogs
        .concat(installedAddons.selectable.catalogs)
        .find(({ selected }) => selected);

    const catalogSelect = {
        options: remoteCatalogs
            .concat(installedAddons.selectable.catalogs)
            .map(({ name, deepLinks }) => ({
                value: deepLinks.addons,
                label: t.stringWithPrefix(name.toUpperCase(), 'ADDON_'),
                title: t.stringWithPrefix(name.toUpperCase(), 'ADDON_'),
            })),
        value: selectedCatalog ? selectedCatalog.deepLinks.addons : undefined,
        // El `.toUpperCase()` no es cosmético: la lista de opciones ya lo hacía
        // y el título del selector cerrado no, así que buscaba ADDON_Community
        // en vez de ADDON_COMMUNITY y se quedaba en inglés. De ahí que el
        // desplegable se leyera en español pero el botón dijera "Community".
        title: remoteAddons.selected !== null ?
            () => {
                const selectableCatalog = remoteCatalogs
                    .find(({ id }) => id === remoteAddons.selected.request.path.id);
                return selectableCatalog ?
                    t.stringWithPrefix(selectableCatalog.name.toUpperCase(), 'ADDON_')
                    : remoteAddons.selected.request.path.id;
            }
            : null,
        onSelect: (value) => {
            window.location = value;
        }
    };

    const selectedType = installedAddons.selected !== null
        ? installedAddons.selectable.types.find(({ selected }) => selected)
        : remoteAddons.selectable.types.find(({ selected }) => selected);

    // Las claves de tipo son minúsculas (TYPE_movie, TYPE_series, TYPE_tv...),
    // salvo la de "todo", que es TYPE_ALL. La rama remota pasaba "all" tal cual,
    // así que buscaba TYPE_all, no lo encontraba y caía al inglés capitalizado:
    // al cambiar de catálogo el selector de tipo saltaba de "Todo" a "All".
    const typeLabel = (type) => {
        if (typeof type !== 'string' || type.length === 0 || type.toLowerCase() === 'all') {
            return t.string('TYPE_ALL');
        }
        return t.stringWithPrefix(type, 'TYPE_');
    };

    const typeSelect = {
        options: installedAddons.selected !== null ?
            installedAddons.selectable.types.map(({ type, deepLinks }) => ({
                value: deepLinks.addons,
                label: typeLabel(type)
            }))
            :
            remoteAddons.selectable.types.map(({ type, deepLinks }) => ({
                value: deepLinks.addons,
                label: typeLabel(type)
            })),
        value: selectedType ? selectedType.deepLinks.addons : undefined,
        title: () => {
            return installedAddons.selected !== null ?
                typeLabel(installedAddons.selected.request.type)
                :
                remoteAddons.selected !== null ?
                    typeLabel(remoteAddons.selected.request.path.type)
                    :
                    t.string('SELECT_TYPE');
        },
        onSelect: (value) => {
            window.location = value;
        }
    };

    return [catalogSelect, typeSelect];
};

const useSelectableInputs = (installedAddons, remoteAddons) => {
    const t = useTranslate();
    const selectableInputs = React.useMemo(() => {
        return mapSelectableInputs(installedAddons, remoteAddons, t);
    }, [installedAddons, remoteAddons]);
    return selectableInputs;
};

module.exports = useSelectableInputs;
