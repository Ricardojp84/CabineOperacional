import { useState, useEffect, useRef, useCallback } from 'react';
import { ALL_BRAZILIAN_CITIES, searchBrazilianCities } from '../data/brazilCitiesDatabase';

export interface CityOption {
  city: string;
  state: string; // UF, e.g. "MT"
  stateName?: string;
  fullLabel: string; // "Cidade - UF"
  region?: string;
  highways?: string[];
  role?: string;
  avgDieselPrice?: number;
  source: 'ibge' | 'local';
}

interface IBGEMunicipioRaw {
  id: number;
  nome: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla: string;
        nome: string;
        regiao?: { nome: string };
      };
    };
  };
}

// In-memory cache for loaded IBGE database to make searches instantaneous
let ibgeCache: CityOption[] | null = null;
let isFetchingIbge = false;
const fetchListeners: Array<(cities: CityOption[]) => void> = [];

/**
 * Loads and caches Brazilian municipalities from official IBGE Localidades API
 * (https://servicodados.ibge.gov.br/api/v1/localidades/municipios)
 */
export const loadIbgeCities = async (): Promise<CityOption[]> => {
  if (ibgeCache && ibgeCache.length > 0) {
    return ibgeCache;
  }

  // Check sessionStorage cache first
  try {
    const cached = sessionStorage.getItem('cabine_ibge_cities');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 100) {
        ibgeCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }

  if (isFetchingIbge) {
    return new Promise((resolve) => {
      fetchListeners.push(resolve);
    });
  }

  isFetchingIbge = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout safety

    const response = await fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`IBGE API status ${response.status}`);
    }

    const data: IBGEMunicipioRaw[] = await response.json();

    const formatted: CityOption[] = data.map((item) => {
      const uf = item.microrregiao?.mesorregiao?.UF?.sigla || 'BR';
      const ufName = item.microrregiao?.mesorregiao?.UF?.nome || '';
      const reg = item.microrregiao?.mesorregiao?.UF?.regiao?.nome || '';

      // Check if item exists in our curated freight hubs for extra enriched data (highways, roles)
      const enriched = ALL_BRAZILIAN_CITIES.find(
        (c) => c.city.toLowerCase() === item.nome.toLowerCase() && c.state.toUpperCase() === uf.toUpperCase()
      );

      return {
        city: item.nome,
        state: uf,
        stateName: ufName,
        fullLabel: `${item.nome} - ${uf}`,
        region: reg,
        highways: enriched?.highways || [],
        role: enriched?.role,
        avgDieselPrice: enriched?.avgDieselPrice,
        source: 'ibge',
      };
    });

    ibgeCache = formatted;

    try {
      sessionStorage.setItem('cabine_ibge_cities', JSON.stringify(formatted.slice(0, 3000)));
    } catch {
      // Storage might be exceeded, ignore
    }

    fetchListeners.forEach((fn) => fn(formatted));
    fetchListeners.length = 0;
    return formatted;
  } catch (err) {
    console.warn('IBGE API indisponível ou offline. Usando base local otimizada:', err);
    // Fallback to local curated cities
    const fallback: CityOption[] = ALL_BRAZILIAN_CITIES.map((c) => ({
      city: c.city,
      state: c.state,
      stateName: c.stateName,
      fullLabel: c.fullLabel,
      region: c.region,
      highways: c.highways,
      role: c.role,
      avgDieselPrice: c.avgDieselPrice,
      source: 'local',
    }));
    ibgeCache = fallback;
    fetchListeners.forEach((fn) => fn(fallback));
    fetchListeners.length = 0;
    return fallback;
  } finally {
    isFetchingIbge = false;
  }
};

export interface UseCityAutocompleteOptions {
  debounceMs?: number;
  limit?: number;
  preloadIbge?: boolean;
  onSelect?: (city: CityOption) => void;
}

/**
 * Custom hook to search and autocomplete Brazilian cities and states in real time
 * Integrates directly with the official IBGE API with debounce, instant caching, and offline fallback.
 */
export function useCityAutocomplete(
  initialQuery = '',
  options: UseCityAutocompleteOptions = {}
) {
  const { debounceMs = 180, limit = 8, preloadIbge = true, onSelect } = options;

  const [query, setQuery] = useState(initialQuery);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal query if initialQuery changes from outside
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Preload IBGE cities in background when idle
  useEffect(() => {
    if (preloadIbge && !ibgeCache) {
      loadIbgeCities().catch(() => {});
    }
  }, [preloadIbge]);

  // Asynchronous search effect
  useEffect(() => {
    if (!query || !query.trim()) {
      setCities([]);
      setIsLoading(false);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setCities([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const normQ = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // 1. Get instant matches from local freight hubs
        const localMatches: CityOption[] = searchBrazilianCities(trimmed, limit).map((c) => ({
          city: c.city,
          state: c.state,
          stateName: c.stateName,
          fullLabel: c.fullLabel,
          region: c.region,
          highways: c.highways,
          role: c.role,
          avgDieselPrice: c.avgDieselPrice,
          source: 'local' as const,
        }));

        // 2. Query full IBGE database asynchronously
        const allCities = await loadIbgeCities();

        const ibgeMatches: CityOption[] = allCities
          .filter((item) => {
            const normCity = item.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const normState = item.state.toLowerCase();
            const normFull = item.fullLabel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            return (
              normCity.startsWith(normQ) ||
              normCity.includes(normQ) ||
              normState === normQ ||
              normFull.includes(normQ)
            );
          })
          .slice(0, limit);

        // 3. Deduplicate
        const combinedMap = new Map<string, CityOption>();
        localMatches.forEach((c) => combinedMap.set(c.fullLabel.toLowerCase(), c));
        ibgeMatches.forEach((c) => {
          const key = c.fullLabel.toLowerCase();
          if (!combinedMap.has(key)) {
            combinedMap.set(key, c);
          }
        });

        const sortedResults = Array.from(combinedMap.values()).slice(0, limit);
        setCities(sortedResults);
      } catch (err: any) {
        setError(err?.message || 'Erro ao consultar municípios');
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, limit]);

  const selectCity = useCallback(
    (city: CityOption) => {
      setSelectedCity(city);
      setQuery(city.fullLabel);
      setIsOpen(false);
      if (onSelect) {
        onSelect(city);
      }
    },
    [onSelect]
  );

  const clear = useCallback(() => {
    setQuery('');
    setCities([]);
    setSelectedCity(null);
    setIsOpen(false);
  }, []);

  return {
    query,
    setQuery,
    cities,
    selectedCity,
    isOpen,
    setIsOpen,
    isLoading,
    error,
    selectCity,
    clear,
    hasResults: cities.length > 0,
  };
}
