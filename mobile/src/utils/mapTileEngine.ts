export type MapMode = 'street' | 'satellite';

export interface TileProvider {
  name: string;
  url: string;
  subdomains: string[];
  attribution: string;
  maxNativeZoom: number;
  maxZoom: number;
}

export const STREET_PROVIDERS: TileProvider[] = [
  {
    name: 'CartoVoyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: 'Map data © OpenStreetMap contributors, © CARTO',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
  {
    name: 'EsriWorldStreet',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    attribution: 'Map data © Esri, DeLorme, NAVTEQ',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
];

export const SATELLITE_PROVIDERS: TileProvider[] = [
  {
    name: 'EsriWorldImagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
];

export function createResilientTileLayer(
  mode: MapMode,
  options?: any
): any {
  return null;
}

export function createOptimizedMap(
  element: any,
  options?: any
): any {
  return null;
}
