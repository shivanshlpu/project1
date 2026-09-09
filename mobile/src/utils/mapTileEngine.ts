import L from 'leaflet';

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
    name: 'GoogleStreet',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: 'Map data &copy; Google',
    maxNativeZoom: 20,
    maxZoom: 22,
  },
  {
    name: 'EsriWorldStreet',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    attribution: 'Tiles &copy; Esri',
    maxNativeZoom: 19,
    maxZoom: 22,
  },

  {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: 'Map data &copy; OpenStreetMap contributors',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
];

export const SATELLITE_PROVIDERS: TileProvider[] = [
  {
    name: 'GoogleHybridSatellite',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: 'Imagery &copy; Google',
    maxNativeZoom: 20,
    maxZoom: 22,
  },
  {
    name: 'EsriWorldImagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    attribution: 'Imagery &copy; Esri, Maxar',
    maxNativeZoom: 19,
    maxZoom: 22,
  },
];

export class ResilientTileLayer extends L.TileLayer {
  private providers: TileProvider[];
  private activeProviderIndex: number = 0;
  private consecutiveErrors: number = 0;

  constructor(providers: TileProvider[], options?: L.TileLayerOptions) {
    const primary = providers[0];
    super(primary.url, {
      attribution: primary.attribution,
      maxZoom: primary.maxZoom,
      maxNativeZoom: primary.maxNativeZoom,
      subdomains: primary.subdomains,
      keepBuffer: 8,
      updateWhenZooming: false,
      updateWhenIdle: false,
      crossOrigin: true,
      ...options,
    });
    this.providers = providers;
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img');
    tile.alt = '';
    tile.setAttribute('role', 'presentation');

    let attemptIndex = this.activeProviderIndex;
    let attemptsCount = 0;

    const tryLoad = () => {
      if (attemptsCount >= this.providers.length) {
        done(new Error('All resilient tile providers failed to load tile'), tile);
        return;
      }

      const currentProvider = this.providers[attemptIndex % this.providers.length];
      const subdomains = currentProvider.subdomains.length > 0 ? currentProvider.subdomains : [''];
      const sIndex = Math.abs(coords.x + coords.y) % subdomains.length;
      const s = subdomains[sIndex] || '';

      const zoom = (this as any)._getZoomForUrl ? (this as any)._getZoomForUrl() : coords.z;

      const data = {
        r: L.Browser.retina ? '@2x' : '',
        s,
        x: coords.x,
        y: coords.y,
        z: zoom,
      };

      const url = L.Util.template(currentProvider.url, data);

      tile.onload = () => {
        this.consecutiveErrors = 0;
        done(null, tile);
      };

      tile.onerror = () => {
        this.consecutiveErrors++;
        if (this.consecutiveErrors >= 4 && this.activeProviderIndex < this.providers.length - 1) {
          this.activeProviderIndex = (this.activeProviderIndex + 1) % this.providers.length;
          this.consecutiveErrors = 0;
        }
        attemptsCount++;
        attemptIndex++;
        tryLoad();
      };

      tile.src = url;
    };

    tryLoad();
    return tile;
  }
}

export function createResilientTileLayer(
  mode: MapMode,
  options?: L.TileLayerOptions
): ResilientTileLayer {
  const providers = mode === 'satellite' ? SATELLITE_PROVIDERS : STREET_PROVIDERS;
  return new ResilientTileLayer(providers, options);
}

export function createOptimizedMap(
  element: HTMLElement | string,
  options?: L.MapOptions
): L.Map {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return L.map(element, {
    preferCanvas: true,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    wheelPxPerZoomLevel: 120,
    zoomSnap: 0.5,
    maxZoom: 22,
    minZoom: 3,
    scrollWheelZoom: false,
        touchZoom: !isMobile ? true : 'center',
    ...options,
  });
}
