import { findNearestLocation, BrazilFreightHub } from '../data/brazilLocations';

export interface GpsLocationState {
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  speedKmh: number | null;
  headingDegrees: number | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';
  errorMessage: string | null;
  nearestHub: { hub: BrazilFreightHub; distanceKm: number } | null;
  lastUpdated: string | null;
}

export const initialGpsState: GpsLocationState = {
  latitude: null,
  longitude: null,
  accuracyMeters: null,
  speedKmh: null,
  headingDegrees: null,
  status: 'idle',
  errorMessage: null,
  nearestHub: null,
  lastUpdated: null,
};

let watchId: number | null = null;

export const requestDeviceGpsPosition = (
  onSuccess: (state: GpsLocationState) => void,
  onError: (errorMsg: string) => void
): void => {
  if (!navigator.geolocation) {
    onError('Geolocalização GPS não é suportada por este dispositivo.');
    return;
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 10000,
  };

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const speed = pos.coords.speed !== null && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 3.6) : null;
      const nearest = findNearestLocation(lat, lng);

      const state: GpsLocationState = {
        latitude: lat,
        longitude: lng,
        accuracyMeters: Math.round(pos.coords.accuracy),
        speedKmh: speed,
        headingDegrees: pos.coords.heading !== null ? Math.round(pos.coords.heading) : null,
        status: 'granted',
        errorMessage: null,
        nearestHub: nearest,
        lastUpdated: new Date().toLocaleTimeString('pt-BR'),
      };

      try {
        localStorage.setItem('cabine_last_gps', JSON.stringify({
          latitude: lat,
          longitude: lng,
          accuracy: pos.coords.accuracy,
          nearestCity: nearest.hub.fullLabel,
          highway: nearest.hub.highways[0],
          timestamp: new Date().toISOString(),
        }));
      } catch {
        // Ignore
      }

      onSuccess(state);
    },
    (err) => {
      let msg = 'Não foi possível obter a localização.';
      if (err.code === err.PERMISSION_DENIED) {
        msg = 'Permissão de localização GPS recusada no navegador ou celular.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = 'Sinal de satélite GPS indisponível no momento.';
      } else if (err.code === err.TIMEOUT) {
        msg = 'Tempo limite de busca do satélite GPS esgotado.';
      }
      onError(msg);
    },
    options
  );
};

export const startGpsWatch = (
  onUpdate: (state: GpsLocationState) => void,
  onError: (errorMsg: string) => void
): void => {
  if (!navigator.geolocation) return;
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const speed = pos.coords.speed !== null && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 3.6) : null;
      const nearest = findNearestLocation(lat, lng);

      const state: GpsLocationState = {
        latitude: lat,
        longitude: lng,
        accuracyMeters: Math.round(pos.coords.accuracy),
        speedKmh: speed,
        headingDegrees: pos.coords.heading !== null ? Math.round(pos.coords.heading) : null,
        status: 'granted',
        errorMessage: null,
        nearestHub: nearest,
        lastUpdated: new Date().toLocaleTimeString('pt-BR'),
      };

      onUpdate(state);
    },
    (err) => {
      onError(err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
    }
  );
};

export const stopGpsWatch = (): void => {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
};
