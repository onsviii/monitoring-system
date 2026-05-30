import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

interface SearchableNicheSelectProps {
  value: string;
  onChange: (value: string) => void;
  niches: string[];
  isLoading: boolean;
}

export default function SearchableNicheSelect({ value, onChange, niches, isLoading }: SearchableNicheSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredNiches = useMemo(() => {
    if (!searchTerm) return niches;
    const lowerSearch = searchTerm.toLowerCase();
    return niches.filter(niche => niche.toLowerCase().includes(lowerSearch));
  }, [searchTerm, niches]);

  // Sync internal search with value if needed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gray-50 border ${isOpen ? 'border-blue-500 bg-white ring-2 ring-blue-50' : 'border-gray-200'} focus:bg-white focus:border-blue-500 rounded-lg h-10 px-3 text-xs text-left font-medium outline-none cursor-pointer transition-all duration-200 flex items-center justify-between`}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {isLoading ? 'Завантаження ніш...' : value || 'Оберіть бізнес-нішу'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              className="w-full text-xs outline-none bg-transparent"
              placeholder="Пошук ніші..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {isLoading ? (
              <div className="p-3 text-xs text-center text-gray-500">Завантаження...</div>
            ) : filteredNiches.length === 0 ? (
              <div className="p-3 text-xs text-center text-gray-500">Нічого не знайдено</div>
            ) : (
              <ul>
                {filteredNiches.map((niche) => (
                  <li key={niche}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(niche);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center justify-between transition-colors ${
                        value === niche
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {niche}
                      {value === niche && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
