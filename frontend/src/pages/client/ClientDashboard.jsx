import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Menu, X, MapPin, Navigation, Search, CreditCard, Banknote, 
  History, BarChart3, Gift, LogOut, Car, Clock, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { clientApi, courseApi, publicApi, paymentApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import 'leaflet/dist/leaflet.css';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom taxi icon - Orange theme
const taxiIcon = new L.DivIcon({
  className: 'taxi-marker',
  html: `<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
    <svg viewBox="0 0 24 24" width="36" height="36" fill="#FF6B00" stroke="#0A1628" stroke-width="1">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// User location icon - Blue
const userIcon = new L.DivIcon({
  className: 'user-marker',
  html: `<div style="width: 20px; height: 20px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Destination icon - Green
const destIcon = new L.DivIcon({
  className: 'dest-marker',
  html: `<div style="width: 20px; height: 20px; background: #10B981; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Map center updater component
const MapUpdater = ({ center, zoom = 18 }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
    }
  }, [center, zoom, map]);
  return null;
};

// Places Autocomplete with OpenStreetMap Nominatim (unlimited, free)
const PlacesAutocomplete = ({ onSelect, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  // Search addresses using Nominatim (OpenStreetMap)
  const searchAddress = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1`
      );
      const data = await response.json();
      
      const results = data.map(item => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));
      
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  const handleInputChange = (value) => {
    setInputValue(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      searchAddress(value);
    }, 300);
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      searchAddress(inputValue);
    }
  };

  // Select a suggestion
  const handleSelect = (place) => {
    setInputValue(place.name);
    setShowSuggestions(false);
    onSelect({
      address: place.name,
      lat: place.lat,
      lng: place.lng
    });
  };

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none z-10" />
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 500)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full h-14 bg-navy-800/60 backdrop-blur-sm border-2 border-navy-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 rounded-xl font-medium placeholder:text-slate-500 text-white pl-12 pr-4 transition-all duration-300"
        data-testid="destination-input"
      />
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
        </div>
      )}
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-navy-800/95 backdrop-blur-xl border border-navy-700 rounded-xl shadow-xl z-[100] overflow-hidden">
          <div className="overflow-y-auto max-h-64">
            {suggestions.map((place, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-4 py-3 text-left text-white hover:bg-orange-500/20 transition-colors flex items-start gap-3 border-b border-navy-700/30 last:border-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(place);
                }}
              >
                <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1" />
                <span className="text-sm leading-tight">{place.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-xs text-slate-500 mt-2">
        Tapez n'importe quelle adresse dans le monde (minimum 3 caractères)
      </p>
    </div>
  );
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState('map');
  const [loading, setLoading] = useState(false);
  
  // Map state
  const [userPosition, setUserPosition] = useState(null);
  const [activeChauffeurs, setActiveChauffeurs] = useState([]);
  const [mapCenter, setMapCenter] = useState([48.8566, 2.3522]);
  
  // Booking state
  const [bookingStep, setBookingStep] = useState(0);
  const [pickup, setPickup] = useState({ address: '', lat: null, lng: null });
  const [destination, setDestination] = useState({ address: '', lat: null, lng: null });
  const [estimate, setEstimate] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // History/Stats state
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  
  // Roulette state
  const [spinning, setSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState(null);
  const rouletteRef = useRef(null);

  // Get user geolocation
  useEffect(() => {
    // Default position: Geneva center (where test drivers are located)
    const defaultPosition = { lat: 46.2044, lng: 6.1432 };
    
    const setDefaultPosition = () => {
      const pos = [defaultPosition.lat, defaultPosition.lng];
      setUserPosition(pos);
      setMapCenter(pos);
      setPickup({
        address: 'Gare de Genève-Cornavin, Genève, Suisse',
        lat: defaultPosition.lat,
        lng: defaultPosition.lng
      });
    };
    
    // Reverse geocoding with Nominatim (OpenStreetMap)
    const reverseGeocode = async (lat, lng) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        return data.display_name || 'Ma position actuelle';
      } catch {
        return 'Ma position actuelle';
      }
    };
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const pos = [position.coords.latitude, position.coords.longitude];
          setUserPosition(pos);
          setMapCenter(pos);
          
          const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          setPickup({
            address: address,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          // Fallback to default Geneva position
          setDefaultPosition();
          toast.info('Position par défaut: Genève');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setDefaultPosition();
      toast.info('Position par défaut: Genève');
    }
  }, []);

  // Fetch active chauffeurs
  useEffect(() => {
    const fetchChauffeurs = async () => {
      try {
        const response = await publicApi.getActiveChauffeurs();
        setActiveChauffeurs(response.data);
      } catch (error) {
        console.error('Error fetching chauffeurs:', error);
      }
    };
    
    fetchChauffeurs();
    const interval = setInterval(fetchChauffeurs, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await clientApi.getProfile();
        setProfile(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, []);

  // Fetch history
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await clientApi.getCourses();
      setCourses(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des courses');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await clientApi.getStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Handle destination selection from autocomplete
  const handleDestinationSelect = (place) => {
    setDestination(place);
  };

  const handleSetDestination = () => {
    if (!pickup.lat || !pickup.lng) {
      toast.error('Veuillez d\'abord définir votre position de départ');
      return;
    }
    setBookingStep(2);
  };

  const handleDestinationSet = async () => {
    if (!destination.address || !destination.lat) {
      toast.error('Veuillez sélectionner une destination dans la liste');
      return;
    }
    
    if (!pickup.lat || !pickup.lng) {
      toast.error('Position de départ non disponible. Veuillez patienter.');
      return;
    }
    
    setLoading(true);
    
    // Calculate distance using Haversine formula
    let distance = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    // Estimate duration: ~2.5 min per km in city
    let duration = distance * 2.5;
    
    // Try to get better route estimate using OSRM (OpenStreetMap Routing)
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=false`
      );
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        distance = data.routes[0].distance / 1000; // meters to km
        duration = data.routes[0].duration / 60; // seconds to minutes
      }
    } catch {
      // Use fallback calculation (already set above)
    }
    
    try {
      const response = await courseApi.estimate({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_address: pickup.address,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_address: destination.address,
        distance_km: distance,
        duration_minutes: duration
      });
      
      setEstimate({
        ...response.data,
        distance_km: distance,
        duration_minutes: duration
      });
      setBookingStep(3);
    } catch (error) {
      toast.error('Erreur lors du calcul du tarif');
    } finally {
      setLoading(false);
    }
  };

  const handleBookCourse = async () => {
    setLoading(true);
    try {
      const response = await courseApi.book({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        pickup_address: pickup.address,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_address: destination.address,
        distance_km: estimate.distance_km,
        duration_minutes: estimate.duration_minutes,
        payment_method: paymentMethod
      });
      
      if (paymentMethod === 'card') {
        const paymentResponse = await paymentApi.createSession(response.data.course_id);
        window.location.href = paymentResponse.data.checkout_url;
      } else {
        toast.success('Course commandée ! Un chauffeur va vous contacter.');
        navigate(`/client/course/${response.data.course_id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  // Roulette spin
  const handleSpin = async () => {
    if (spinning) return;
    
    setSpinning(true);
    setRouletteResult(null);
    
    try {
      const response = await clientApi.spinRoulette();
      
      const degrees = 1800 + Math.random() * 360;
      if (rouletteRef.current) {
        rouletteRef.current.style.setProperty('--spin-degrees', `${degrees}deg`);
        rouletteRef.current.classList.add('spin-animation');
      }
      
      setTimeout(() => {
        setRouletteResult(response.data);
        setSpinning(false);
        if (rouletteRef.current) {
          rouletteRef.current.classList.remove('spin-animation');
        }
        
        if (response.data.won) {
          toast.success(`Félicitations ! Vous avez gagné ${response.data.prize} !`);
        } else {
          toast.info('Pas de chance cette fois ! Réessayez demain.');
        }
      }, 4000);
    } catch (error) {
      setSpinning(false);
      toast.error(error.response?.data?.detail || 'Erreur lors du tirage');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setMenuOpen(false);
    if (newView === 'history') fetchHistory();
    if (newView === 'stats') fetchStats();
  };

  return (
    <div className="h-screen flex flex-col bg-navy-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-navy-800/80 backdrop-blur-xl border-b border-navy-700/50 z-20 animate-slideDown">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:text-orange-400 hover:bg-white/5 rounded-xl transition-all duration-300" data-testid="menu-btn">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-navy-800/95 backdrop-blur-xl border-navy-700 w-80">
            <SheetHeader>
              <SheetTitle className="text-white flex items-center gap-3">
                <img src={LOGO_URL} alt="TaxiG" className="h-10" />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 space-y-2">
              {profile && (
                <div className="p-4 bg-navy-900/50 rounded-2xl mb-6 border border-navy-700/50">
                  <p className="text-white font-bold">{profile.prenom} {profile.nom}</p>
                  <p className="text-slate-400 text-sm">{profile.email}</p>
                </div>
              )}
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'map' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('map')}
                data-testid="menu-map-btn"
              >
                <MapPin className="w-5 h-5 mr-3" />
                Commander un taxi
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'history' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('history')}
                data-testid="menu-history-btn"
              >
                <History className="w-5 h-5 mr-3" />
                Mes courses
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'stats' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('stats')}
                data-testid="menu-stats-btn"
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Statistiques
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'roulette' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('roulette')}
                data-testid="menu-roulette-btn"
              >
                <Gift className="w-5 h-5 mr-3" />
                Jeu quotidien
              </Button>
              <div className="pt-4 border-t border-navy-700/50 mt-4">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <img src={LOGO_URL} alt="TaxiG" className="h-10" />
        
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {/* Map View */}
        {view === 'map' && (
          <>
            <MapContainer 
              center={mapCenter} 
              zoom={18} 
              className="w-full h-full z-0"
              zoomControl={false}
              scrollWheelZoom={false}
              doubleClickZoom={true}
              touchZoom={true}
              dragging={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapUpdater center={mapCenter} zoom={18} />
              
              {userPosition && (
                <Marker position={userPosition} icon={userIcon}>
                  <Popup>Votre position</Popup>
                </Marker>
              )}
              
              {destination.lat && destination.lng && (
                <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
                  <Popup>{destination.address}</Popup>
                </Marker>
              )}
              
              {activeChauffeurs.map((chauffeur) => (
                chauffeur.position && (
                  <Marker 
                    key={chauffeur.id}
                    position={[chauffeur.position.lat, chauffeur.position.lng]}
                    icon={taxiIcon}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-bold">{chauffeur.prenom}</p>
                        <p className="text-sm text-gray-600">{chauffeur.nombre_courses} courses</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>

            {/* Booking Panel */}
            <div className="absolute bottom-0 left-0 right-0 bg-navy-800/95 backdrop-blur-xl rounded-t-3xl p-6 z-10 shadow-2xl border-t border-navy-700/50 animate-slideUp">
              {bookingStep === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-navy-900/50 rounded-2xl border border-navy-700/50">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <p className="text-slate-400 text-sm">Point de départ</p>
                      <p className="text-white font-medium">{pickup.address || 'Chargement...'}</p>
                    </div>
                  </div>
                  <Button 
                    className="btn-taxi w-full h-14 text-lg"
                    onClick={handleSetDestination}
                    data-testid="set-destination-btn"
                  >
                    <Navigation className="w-5 h-5 mr-2" />
                    Où allez-vous ?
                  </Button>
                  <p className="text-center text-slate-500 text-sm">
                    {activeChauffeurs.length} chauffeur{activeChauffeurs.length > 1 ? 's' : ''} disponible{activeChauffeurs.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {bookingStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setBookingStep(0);
                        setDestination({ address: '', lat: null, lng: null });
                      }}
                      className="text-white hover:text-orange-400 hover:bg-white/5 rounded-xl"
                      data-testid="back-to-start-btn"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    <h3 className="text-white font-bold text-lg">Choisir la destination</h3>
                  </div>
                  
                  <PlacesAutocomplete
                    onSelect={handleDestinationSelect}
                    placeholder="Tapez une adresse..."
                  />
                  
                  <p className="text-slate-500 text-xs">
                    Commencez à taper et sélectionnez une adresse dans la liste
                  </p>
                  
                  <Button 
                    className="btn-taxi w-full h-14"
                    onClick={handleDestinationSet}
                    disabled={!destination.lat || loading}
                    data-testid="confirm-destination-btn"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Calcul en cours...</>
                    ) : (
                      'Valider la destination'
                    )}
                  </Button>
                </div>
              )}

              {bookingStep === 3 && estimate && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setBookingStep(2)}
                      className="text-white hover:text-orange-400 hover:bg-white/5 rounded-xl"
                      data-testid="back-to-destination-btn"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    <h3 className="text-white font-bold text-lg">Confirmer la course</h3>
                  </div>
                  
                  <div className="bg-navy-900/50 rounded-2xl p-4 space-y-3 border border-navy-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <p className="text-white text-sm flex-1">{pickup.address}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <p className="text-white text-sm flex-1">{destination.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      {estimate.distance_km.toFixed(1)} km
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      ~{Math.round(estimate.duration_minutes)} min
                    </span>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-4">
                    <p className="text-slate-400 text-sm">Prix estimé</p>
                    <p className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent text-3xl font-black">{estimate.estimated_total.toFixed(2)}€</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      className={`flex-1 h-12 rounded-xl font-bold transition-all duration-300 ${paymentMethod === 'cash' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' : 'bg-navy-700/50 text-slate-300 border border-navy-600 hover:border-orange-500/50'}`}
                      onClick={() => setPaymentMethod('cash')}
                      data-testid="payment-cash-btn"
                    >
                      <Banknote className="w-5 h-5 mr-2" />
                      Espèces
                    </Button>
                    <Button
                      className={`flex-1 h-12 rounded-xl font-bold transition-all duration-300 ${paymentMethod === 'card' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30' : 'bg-navy-700/50 text-slate-300 border border-navy-600 hover:border-orange-500/50'}`}
                      onClick={() => setPaymentMethod('card')}
                      data-testid="payment-card-btn"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Carte
                    </Button>
                  </div>
                  
                  <Button 
                    className="btn-taxi w-full h-14 text-lg"
                    onClick={() => setShowConfirmDialog(true)}
                    data-testid="book-course-btn"
                  >
                    Commander maintenant
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="p-6 overflow-y-auto h-full animate-fadeIn">
            <h2 className="text-2xl font-bold text-white mb-6">Mes courses</h2>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-navy-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-navy-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-16 h-16 text-navy-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune course pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course, index) => (
                  <div 
                    key={course.id} 
                    className="card-taxi p-4 cursor-pointer animate-slideUp"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => navigate(`/client/course/${course.id}`)}
                    data-testid={`course-item-${course.id}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-bold">{course.commande_no}</p>
                        <p className="text-slate-400 text-sm">
                          {new Date(course.created_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        course.status === 'completed' ? 'badge-success' :
                        course.status === 'cancelled' ? 'badge-error' :
                        course.status === 'in_progress' ? 'badge-warning' :
                        'badge-info'
                      }`}>
                        {course.status === 'completed' ? 'Terminée' :
                         course.status === 'cancelled' ? 'Annulée' :
                         course.status === 'in_progress' ? 'En cours' :
                         course.status === 'assigned' ? 'Assignée' : 'En attente'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        {course.pickup_address}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        {course.destination_address}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-navy-700/50">
                      <span className="text-slate-400">{course.distance_km?.toFixed(1)} km</span>
                      <span className="text-orange-400 font-bold text-lg">
                        {(course.prix_final || course.prix_estime)?.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats View */}
        {view === 'stats' && (
          <div className="p-6 overflow-y-auto h-full animate-fadeIn">
            <h2 className="text-2xl font-bold text-white mb-6">Mes statistiques</h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-navy-700 rounded w-1/2 mb-2" />
                    <div className="h-8 bg-navy-700 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="card-taxi p-4">
                    <p className="text-slate-400 text-sm">Total courses</p>
                    <p className="text-white text-3xl font-black">{stats.total_courses}</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-slate-400 text-sm">Total dépensé</p>
                    <p className="text-white text-3xl font-black">{stats.total_spent?.toFixed(2)}€</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-slate-400 text-sm">Distance parcourue</p>
                    <p className="text-white text-3xl font-black">{stats.total_km?.toFixed(0)} km</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-slate-400 text-sm">Prix moyen/course</p>
                    <p className="text-white text-3xl font-black">{stats.average_per_course?.toFixed(2)}€</p>
                  </div>
                </div>
                
                <div className="card-taxi p-6 border-emerald-500/30">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-emerald-400" />
                    Économies réalisées
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">vs Uber</span>
                      <span className="text-emerald-400 font-bold">+{stats.savings_vs_uber?.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">vs TaxiPhone</span>
                      <span className="text-emerald-400 font-bold">+{stats.savings_vs_taxiphone?.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-navy-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune statistique disponible</p>
              </div>
            )}
          </div>
        )}

        {/* Roulette View */}
        {view === 'roulette' && (
          <div className="p-6 overflow-y-auto h-full flex flex-col items-center justify-center animate-fadeIn">
            <h2 className="text-2xl font-bold text-white mb-2">Jeu quotidien</h2>
            <p className="text-slate-400 mb-8 text-center">Tentez votre chance une fois par jour !</p>
            
            <div className="relative mb-8">
              <div 
                ref={rouletteRef}
                className="w-64 h-64 rounded-full border-8 border-orange-500 relative overflow-hidden shadow-lg shadow-orange-500/30"
                style={{ 
                  background: 'conic-gradient(from 0deg, #EF4444 0deg 36deg, #10B981 36deg 72deg, #EF4444 72deg 108deg, #10B981 108deg 144deg, #EF4444 144deg 180deg, #10B981 180deg 216deg, #EF4444 216deg 252deg, #10B981 252deg 288deg, #EF4444 288deg 324deg, #10B981 324deg 360deg)'
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <Gift className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[24px] border-t-orange-500" />
              </div>
            </div>
            
            <Button 
              className="btn-taxi h-14 px-12 text-lg"
              onClick={handleSpin}
              disabled={spinning}
              data-testid="spin-btn"
            >
              {spinning ? 'La roue tourne...' : 'Tourner la roue'}
            </Button>
            
            {rouletteResult && (
              <div className={`mt-6 p-6 rounded-2xl text-center ${rouletteResult.won ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-navy-700/50 border border-navy-600'}`}>
                {rouletteResult.won ? (
                  <>
                    <p className="text-emerald-400 font-bold text-xl mb-2">Félicitations !</p>
                    <p className="text-white">{rouletteResult.prize}</p>
                    <p className="text-orange-400 font-mono mt-2">{rouletteResult.code_promo}</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-400 text-xl mb-2">Pas de chance</p>
                    <p className="text-slate-500">Réessayez demain !</p>
                  </>
                )}
              </div>
            )}
            
            <p className="text-slate-500 text-sm mt-6">1 chance sur 20 de gagner un code promo</p>
          </div>
        )}
      </main>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-navy-800/95 backdrop-blur-xl border-navy-700 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmer la commande</DialogTitle>
            <DialogDescription className="text-slate-400">
              Voulez-vous confirmer cette course ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-navy-900/50 rounded-2xl p-4 space-y-2 border border-navy-700/50">
              <p className="text-white"><span className="text-slate-400">De:</span> {pickup.address}</p>
              <p className="text-white"><span className="text-slate-400">À:</span> {destination.address}</p>
              <p className="text-white"><span className="text-slate-400">Prix:</span> <span className="text-orange-400 font-bold">{estimate?.estimated_total?.toFixed(2)}€</span></p>
              <p className="text-white"><span className="text-slate-400">Paiement:</span> {paymentMethod === 'cash' ? 'Espèces' : 'Carte bancaire'}</p>
            </div>
            {paymentMethod === 'card' && (
              <div className="mt-4 flex items-start gap-2 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Vous serez redirigé vers la page de paiement sécurisé Stripe.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} className="text-white hover:text-orange-400 hover:bg-white/5 rounded-xl" data-testid="cancel-confirm-btn">
              Annuler
            </Button>
            <Button className="btn-taxi" onClick={handleBookCourse} disabled={loading} data-testid="confirm-book-btn">
              {loading ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;
