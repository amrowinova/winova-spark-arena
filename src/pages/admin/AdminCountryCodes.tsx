/**
 * AdminCountryCodes — Manage country dial codes displayed in the agent application form.
 * Shows the locationData countries with their dial codes, flags, and names.
 * Admin can view all codes; editing updates the local static data display.
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, Phone, MapPin } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { locationData } from '@/lib/locationData';

export default function AdminCountryCodes() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return locationData;
    const q = search.toLowerCase();
    return locationData.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'مقدمات الدول' : 'Country Codes'} />
      <main className="flex-1 px-4 py-4 pb-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{locationData.length}</p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'دول مدعومة' : 'Supported Countries'}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {locationData.reduce((sum, c) => sum + c.cities.length, 0)}
            </p>
            <p className="text-xs text-muted-foreground">{isRTL ? 'مدن' : 'Cities'}</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isRTL ? 'ابحث عن دولة...' : 'Search country...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 ps-9"
          />
        </div>

        {/* Country list */}
        <div className="space-y-2">
          {filtered.map((country, i) => (
            <motion.div
              key={country.code}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-2xl shrink-0">{country.flag}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {isRTL ? country.nameAr : country.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? country.name : country.nameAr}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {country.code}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs gap-1">
                        <Phone className="h-3 w-3" />
                        {country.dial}
                      </Badge>
                    </div>
                  </div>

                  {/* Cities */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {country.cities.map(city => (
                      <span
                        key={city.code}
                        className="inline-flex items-center gap-0.5 text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        {isRTL ? city.nameAr : city.name}
                        <span className="text-muted-foreground/50">
                          ({city.districts.length})
                        </span>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <Globe className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'لا توجد نتائج' : 'No results found'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
