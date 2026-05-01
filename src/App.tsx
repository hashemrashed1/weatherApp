import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Wind, 
  Droplets, 
  Sun, 
  Cloud, 
  CloudSun, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudFog, 
  CloudDrizzle,
  ArrowRight,
  Sparkles,
  Loader2,
  Navigation,
  Thermometer,
  Eye,
  Sunrise,
  Sunset,
  Info,
  Calendar,
  History,
  Activity,
  Gauge,
  Waves
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { cn } from './lib/utils';
import { 
  searchCities, 
  getWeatherData, 
  getWeatherDescription, 
  type Location, 
  type WeatherData 
} from './services/weatherService';

const ICON_MAP: Record<string, any> = {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle
};

const BackgroundBlobs = ({ theme }: { theme: string }) => {
  const colors = useMemo(() => {
    if (theme.includes('blue')) return ['bg-blue-400', 'bg-cyan-300', 'bg-indigo-400'];
    if (theme.includes('purple')) return ['bg-purple-500', 'bg-indigo-600', 'bg-slate-700'];
    if (theme.includes('slate') || theme.includes('sky')) return ['bg-sky-200', 'bg-slate-300', 'bg-blue-300'];
    return ['bg-blue-500', 'bg-indigo-400', 'bg-purple-400'];
  }, [theme]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div 
        animate={{ 
          x: [0, 100, -50, 0], 
          y: [0, -50, 100, 0],
          scale: [1, 1.2, 0.9, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className={cn("absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20", colors[0])} 
      />
      <motion.div 
        animate={{ 
          x: [0, -100, 50, 0], 
          y: [0, 100, -50, 0],
          scale: [1, 0.8, 1.1, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className={cn("absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20", colors[1])} 
      />
      <motion.div 
        animate={{ 
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className={cn("absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full blur-[100px]", colors[2])} 
      />
    </div>
  );
};

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Location[]>([]);

  // Initialize AI
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), []);

  useEffect(() => {
    const saved = localStorage.getItem('weather_app_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const addToHistory = (loc: Location) => {
    const updated = [loc, ...history.filter(h => h.name !== loc.name)].slice(0, 5);
    setHistory(updated);
    localStorage.setItem('weather_app_history', JSON.stringify(updated));
  };

  const fetchWeather = async (location: Location) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWeatherData(location.latitude, location.longitude);
      setWeather(data);
      setSelectedLocation(location);
      addToHistory(location);
      generateAiInsight(location, data);
    } catch (err) {
      setError('Failed to fetch weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAiInsight = async (location: Location, data: WeatherData) => {
    setAiLoading(true);
    try {
      const weatherDesc = getWeatherDescription(data.current.weatherCode);
      const prompt = `As a friendly weather expert, provide a concise (max 3 sentences) lifestyle tip for someone in ${location.name}. 
        Current weather: ${weatherDesc.text}, Temperature: ${data.current.temp}°C, Humidity: ${data.current.humidity}%, Wind: ${data.current.windSpeed}km/h. 
        Focus on activities, clothing, or general vibe. Be encouraging and use a slightly sophisticated tone.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiInsight(response.text || '');
    } catch (err) {
      console.error('AI error:', err);
      setAiInsight('Make the most of your day! Catch up on reading or enjoy a warm drink.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSearch = useCallback(async (val: string) => {
    setQuery(val);
    if (val.length > 2) {
      const cities = await searchCities(val);
      setResults(cities);
    } else {
      setResults([]);
    }
  }, []);

  const handleSelectCity = (city: Location) => {
    setQuery(`${city.name}${city.admin1 ? `, ${city.admin1}` : ''}`);
    setResults([]);
    fetchWeather(city);
  };

  const themeClass = useMemo(() => {
    if (!weather) return 'from-slate-950 via-slate-900 to-slate-950';
    const code = weather.current.weatherCode;
    if (code === 0 || code === 1) return 'from-blue-600 via-sky-500 to-blue-700'; // Clear
    if (code <= 3) return 'from-sky-500 via-slate-400 to-sky-700'; // Partly Cloudy
    if (code >= 95) return 'from-purple-950 via-slate-900 to-indigo-950'; // Thunderstorm
    if (code >= 71) return 'from-blue-200 via-slate-300 to-blue-400'; // Snow
    if (code >= 51) return 'from-slate-700 via-blue-600 to-slate-800'; // Rain/Drizzle
    return 'from-slate-900 to-black';
  }, [weather]);

  return (
    <div className={cn(
      "min-h-screen text-white font-sans transition-all duration-1000 ease-in-out relative flex flex-col items-center bg-gradient-to-br",
      themeClass
    )}>
      <div className="noise-overlay" />
      <BackgroundBlobs theme={themeClass} />

      <nav className="w-full max-w-7xl px-6 py-8 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg group hover:scale-110 transition-transform cursor-pointer">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl tracking-tighter font-light">Weather</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Status</p>
            <p className="text-xs font-medium">System Online</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/20 bg-white/5 backdrop-blur-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </nav>

      <main className="w-full max-w-7xl z-10 px-6 pb-20 space-y-12">
        {/* Modern Command-style Search */}
        <section className="max-w-2xl mx-auto space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-white/30 group-focus-within:text-white transition-colors" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search city or region..."
              className="w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] py-6 pl-14 pr-6 text-xl outline-none focus:bg-white/10 focus:ring-1 focus:ring-white/30 transition-all placeholder:text-white/20 shadow-2xl"
            />
            
            <AnimatePresence>
              {(results.length > 0 || (query.length === 0 && history.length > 0)) && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-slate-900/90 backdrop-blur-[40px] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] z-50 p-2"
                >
                  {results.length > 0 ? (
                    results.map((city, i) => (
                      <button
                        key={`${city.latitude}-${city.longitude}-${i}`}
                        onClick={() => handleSelectCity(city)}
                        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 rounded-2xl text-left transition-all border-b border-white/5 last:border-0 group"
                      >
                        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                          <MapPin className="w-4 h-4 text-white/40" />
                        </div>
                        <div>
                          <p className="font-medium text-lg leading-none mb-1">{city.name}</p>
                          <p className="text-sm text-white/30">{city.admin1}{city.admin1 && ', '}{city.country}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-white/40" />
                      </button>
                    ))
                  ) : (
                    <>
                      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                        <History className="w-3 h-3 text-white/30" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Recent Searches</span>
                      </div>
                      {history.map((city, i) => (
                        <button
                          key={`history-${i}`}
                          onClick={() => handleSelectCity(city)}
                          className="w-full px-5 py-3 flex items-center gap-4 hover:bg-white/5 rounded-2xl text-left transition-all group"
                        >
                          <MapPin className="w-4 h-4 text-white/20" />
                          <span className="text-white/60 group-hover:text-white transition-colors">{city.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-white/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-light italic font-serif">Gathering Data</h3>
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/30 mt-2">Atmospheric Analysis Unit</p>
            </div>
          </div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-red-500/10 backdrop-blur-xl border border-red-500/20 p-8 rounded-[2.5rem] text-center space-y-4"
          >
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Info className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-red-200/80 leading-relaxed">{error}</p>
            <button 
              onClick={() => setSelectedLocation(null)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        ) : weather && selectedLocation ? (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Bento Grid: Hero Weather */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
              }}
              className="lg:col-span-8 space-y-8"
            >
              {/* Main Display */}
              <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  {(() => {
                    const desc = getWeatherDescription(weather.current.weatherCode);
                    const Icon = ICON_MAP[desc.icon] || Cloud;
                    return <Icon className="w-64 h-64 rotate-12" />;
                  })()}
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full border border-white/10">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] uppercase font-bold tracking-widest text-white/80">Live Report</span>
                    </div>
                    <div>
                      <h2 className="text-6xl font-light italic font-serif leading-none tracking-tight">
                        {selectedLocation.name}
                      </h2>
                      <p className="text-white/40 mt-3 font-medium uppercase tracking-[0.2em] text-xs">
                        {new Date(weather.current.time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-baseline">
                      <span className="text-[140px] font-thin leading-none tracking-tighter drop-shadow-2xl">
                        {Math.round(weather.current.temp)}
                      </span>
                      <span className="text-4xl font-light text-white/30 ml-2">°C</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const desc = getWeatherDescription(weather.current.weatherCode);
                        return (
                          <>
                            <span className="text-2xl font-light text-white/80">{desc.text}</span>
                            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                              {(() => {
                                const Icon = ICON_MAP[desc.icon] || Cloud;
                                return <Icon className="w-6 h-6 text-white" />;
                              })()}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-10 border-t border-white/10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 mb-1">
                      <Wind className="w-3 h-3" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Wind</span>
                    </div>
                    <p className="text-2xl font-light">{weather.current.windSpeed} <span className="text-xs opacity-40">km/h</span></p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 mb-1">
                      <Droplets className="w-3 h-3" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Humidity</span>
                    </div>
                    <p className="text-2xl font-light">{weather.current.humidity}%</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 mb-1">
                      <Thermometer className="w-3 h-3" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Feels Like</span>
                    </div>
                    <p className="text-2xl font-light">{Math.round(weather.current.apparentTemp)}°</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 mb-1">
                      <Eye className="w-3 h-3" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">UV Index</span>
                    </div>
                    <p className="text-2xl font-light">
                      {weather.daily.uvIndex[0]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Weekly Stats Bento Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] relative group cursor-default">
                  <div className="absolute top-6 right-6 p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
                    <Gauge className="w-5 h-5 text-emerald-400/60" />
                  </div>
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-6">Atmospheric Pressure</h4>
                  <p className="text-3xl font-light tracking-tighter">
                    {weather.current.pressure} <span className="text-sm text-white/30 uppercase tracking-widest font-bold">hPa</span>
                  </p>
                  <p className="text-xs text-white/40 mt-4 leading-relaxed italic">
                    Current barometric readings indicate {weather.current.pressure > 1013 ? 'stable high pressure' : 'low pressure influence'}.
                  </p>
                  <div className="mt-8 flex gap-3">
                    <div className="px-4 py-2 bg-white/5 rounded-xl text-[10px] uppercase font-bold tracking-widest text-white/40 flex items-center gap-2">
                       <Activity className="w-3 h-3" /> Stable
                    </div>
                    <div className="px-4 py-2 bg-white/5 rounded-xl text-[10px] uppercase font-bold tracking-widest text-white/40">Sea Level</div>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] relative group cursor-default overflow-hidden">
                  <div className="absolute bottom-0 right-0 p-8 opacity-5">
                    <Waves className="w-32 h-32" />
                  </div>
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-6">Humidity Status</h4>
                  <div className="space-y-5">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium">Saturation Level</span>
                      <span className="text-2xl font-thin tracking-tighter">{weather.current.humidity}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-400 transition-all duration-1000" 
                        style={{ width: `${weather.current.humidity}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/30 leading-relaxed italic">
                      Air density is {weather.current.humidity > 70 ? 'high' : 'comfortably dry'}.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Panel: Side Bento Cards */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, x: 30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
              }}
              className="lg:col-span-4 space-y-8"
            >
              {/* AI Insight Card - Reimagined */}
              <motion.div 
                className="bg-indigo-600/40 backdrop-blur-3xl border border-white/20 p-8 rounded-[3rem] relative shadow-2xl group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                      <Sparkles className="w-4 h-4 text-indigo-300" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-200">Weather AI</span>
                  </div>
                  <div className="w-3 h-1 bg-white/20 rounded-full" />
                </div>
                {aiLoading ? (
                  <div className="space-y-4 py-4 animate-pulse">
                    <div className="h-4 bg-white/10 rounded-full w-full" />
                    <div className="h-4 bg-white/10 rounded-full w-5/6" />
                    <div className="h-4 bg-white/10 rounded-full w-2/3" />
                  </div>
                ) : (
                  <p className="text-2xl leading-snug font-light italic font-serif text-white/95">
                    "{aiInsight || "Analyzing atmospheric conditions for your perfect day..."}"
                  </p>
                )}
                <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-center opacity-40">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Neural Analysis</span>
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-white rounded-full" />)}
                  </div>
                </div>
              </motion.div>

              {/* Weekly Forecast Bento */}
              <motion.div 
                className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 rounded-[3rem] shadow-xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">7-Day Forecast</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {weather.daily.time.map((time, idx) => {
                    const desc = getWeatherDescription(weather.daily.weatherCode[idx]);
                    const Icon = ICON_MAP[desc.icon] || Cloud;
                    const date = new Date(time);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        key={time} 
                        className="flex items-center justify-between py-4 group border-b border-white/5 last:border-0 hover:bg-white/5 px-4 -mx-4 rounded-2xl transition-colors cursor-default"
                      >
                        <div className="flex items-center gap-5">
                          <span className="text-sm font-medium w-14 text-white/40 group-hover:text-white transition-colors">
                            {idx === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: idx === 1 ? 'long' : 'short' })}
                          </span>
                          <div className="p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform">
                            <Icon className="w-5 h-5 text-white/80" />
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          <span className="text-xl font-light tabular-nums">{Math.round(weather.daily.tempMax[idx])}°</span>
                          <span className="text-sm text-white/20 tabular-nums w-6 text-right">{Math.round(weather.daily.tempMin[idx])}°</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center py-32 px-10 relative overflow-hidden flex flex-col items-center"
          >
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[2px] rounded-[4rem] -z-10 border border-white/5 shadow-inner" />
            <div className="space-y-10">
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_20px_50px_rgba(245,158,11,0.3)] mb-4"
              >
                <Sun className="w-12 h-12 text-white" />
              </motion.div>
              <div className="space-y-4">
                <h2 className="text-6xl font-thin tracking-tighter leading-tight italic font-serif">Atmospheric Journey Begins.</h2>
                <p className="text-white/30 font-light text-xl max-w-xl mx-auto leading-relaxed">Real-time reports from across the globe, powered by advanced data models and AI.</p>
              </div>
              <div className="pt-8 flex flex-wrap justify-center gap-6 text-[10px] uppercase font-bold tracking-[0.3em] text-white/20">
                <span className="flex items-center gap-2 animate-pulse"><div className="w-1 h-1 rounded-full bg-emerald-400" /> Verified Data</span>
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> Global Coverage</span>
                <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-purple-400" /> AI Insights</span>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="fixed bottom-12 left-10 hidden xl:flex flex-col items-center gap-6 opacity-30 group hover:opacity-100 transition-opacity duration-500 cursor-default select-none">
        <div className="flex flex-col gap-1 items-center">
          <span className="text-[10px] uppercase font-black tracking-[0.4em] [writing-mode:vertical-rl] rotate-180">Numerical Reporting Unit</span>
          <div className="h-24 w-[1px] bg-gradient-to-b from-white/0 via-white to-white/0 mt-4 group-hover:h-32 transition-all duration-700" />
        </div>
      </footer>
      
      <div className="fixed bottom-12 right-10 hidden xl:flex gap-8 opacity-20 hover:opacity-60 transition-opacity">
        <div className="flex flex-col items-end gap-1">
          <span className="text-[8px] font-black uppercase tracking-widest">Enhanced Interface</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Version 2.4.0-AT</span>
        </div>
      </div>
    </div>
  );
}
