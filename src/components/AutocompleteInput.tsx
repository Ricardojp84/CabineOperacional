import React, { useState, useRef, useEffect } from 'react';
import { useCityAutocomplete, CityOption } from '../hooks/useCityAutocomplete';
import { playCockpitClick } from '../utils/audio';
import { MapPin, Navigation, X, Loader2, Globe, Building2, Check } from 'lucide-react';

interface AutocompleteInputProps {
  label?: string;
  value: string;
  onChange: (value: string, city?: CityOption) => void;
  placeholder?: string;
  required?: boolean;
  onUseGpsLocation?: () => void;
  showGpsButton?: boolean;
  className?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Digite a cidade ou estado (ex: Sorriso, MT, Santos, SP)...',
  required = false,
  onUseGpsLocation,
  showGpsButton = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the new hook connecting IBGE Real-Time API and local database
  const { query, setQuery, cities, isLoading } = useCityAutocomplete(value, {
    debounceMs: 180,
    limit: 8,
  });

  useEffect(() => {
    setQuery(value);
  }, [value, setQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: CityOption) => {
    playCockpitClick();
    setQuery(city.fullLabel);
    onChange(city.fullLabel, city);
    setIsOpen(false);
  };

  const handleClear = () => {
    playCockpitClick();
    setQuery('');
    onChange('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-[#94a3b8] uppercase">
            {label}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#38bdf8] font-mono flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#38bdf8]" /> IBGE API
            </span>

            {showGpsButton && onUseGpsLocation && (
              <button
                type="button"
                onClick={onUseGpsLocation}
                className="text-[11px] font-bold text-[#f59e0b] hover:text-[#ffb95f] flex items-center gap-1 cursor-pointer transition-colors"
                title="Obter do GPS do aparelho logado"
              >
                <Navigation className="w-3 h-3 text-[#f59e0b]" />
                Usar GPS
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          required={required}
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl pl-9 pr-14 text-[#d8e3fb] font-semibold text-xs outline-hidden transition-colors"
        />
        <MapPin className="w-4 h-4 text-[#94a3b8] absolute left-3 top-4" />

        <div className="absolute right-2.5 top-3 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-[#f59e0b] animate-spin" />}
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="w-6 h-6 rounded-md hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#d8e3fb] flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && cities.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#152031] border border-[#475569] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#334155] max-h-64 overflow-y-auto animate-in fade-in duration-150">
          <div className="px-3 py-1.5 bg-[#081425] text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-[#38bdf8]" />
              Municípios do Brasil (IBGE em Tempo Real)
            </span>
            <span>Clique para auto-preencher</span>
          </div>

          {cities.map((city) => (
            <div
              key={`${city.fullLabel}-${city.source}`}
              onClick={() => handleSelect(city)}
              className="p-3 hover:bg-[#243248] cursor-pointer flex items-center justify-between gap-2 transition-colors text-xs"
            >
              <div className="min-w-0">
                <div className="font-bold text-[#d8e3fb] flex items-center gap-1.5">
                  <span>{city.city}</span>
                  <span className="font-mono text-[#ffb95f] font-extrabold px-1.5 py-0.2 bg-[#081425] rounded border border-[#334155]">
                    {city.state}
                  </span>
                  {city.stateName && (
                    <span className="text-[11px] text-[#94a3b8] hidden sm:inline">({city.stateName})</span>
                  )}
                </div>

                <div className="text-[11px] text-[#94a3b8] flex items-center gap-2 mt-0.5">
                  {city.highways && city.highways.length > 0 && (
                    <>
                      <span className="font-mono text-[#bec6e0]">{city.highways[0]}</span>
                      <span>•</span>
                    </>
                  )}
                  {city.region && <span className="text-[#4edea3]">{city.region}</span>}
                  {city.avgDieselPrice && (
                    <>
                      <span>•</span>
                      <span>Diesel Ref: R$ {city.avgDieselPrice.toFixed(2)}/L</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {city.role && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      city.role === 'Porto'
                        ? 'bg-blue-500/20 text-[#60a5fa] border-blue-500/40'
                        : city.role === 'Agronegócio'
                        ? 'bg-emerald-500/20 text-[#34d399] border-emerald-500/40'
                        : city.role === 'Capital'
                        ? 'bg-amber-500/20 text-[#ffb95f] border-amber-500/40'
                        : 'bg-[#0f172a] text-[#bec6e0] border-[#334155]'
                    }`}
                  >
                    {city.role}
                  </span>
                )}
                <span className="text-[9px] font-mono font-bold text-[#94a3b8] bg-[#081425] px-1.5 py-0.5 rounded border border-[#334155]">
                  {city.source === 'ibge' ? 'IBGE' : 'ROTAS'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
