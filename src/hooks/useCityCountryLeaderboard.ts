import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CityEntry {
  city: string;
  country: string;
  total_nova: number;
  winner_count: number;
}

export interface CountryEntry {
  country: string;
  total_nova: number;
  winner_count: number;
}

export function useCityCountryLeaderboard() {
  const [cities, setCities] = useState<CityEntry[]>([]);
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboards() {
      setIsLoading(true);
      try {
        const [cityRes, countryRes] = await Promise.all([
          supabase.rpc('get_city_leaderboard'),
          supabase.rpc('get_country_leaderboard'),
        ]);

        if (cityRes.data) {
          setCities(
            (cityRes.data as CityEntry[]).map((r) => ({
              ...r,
              total_nova: Number(r.total_nova),
              winner_count: Number(r.winner_count),
            }))
          );
        }
        if (countryRes.data) {
          setCountries(
            (countryRes.data as CountryEntry[]).map((r) => ({
              ...r,
              total_nova: Number(r.total_nova),
              winner_count: Number(r.winner_count),
            }))
          );
        }
      } catch (err) {
        console.error('useCityCountryLeaderboard error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboards();
  }, []);

  return { cities, countries, isLoading };
}
