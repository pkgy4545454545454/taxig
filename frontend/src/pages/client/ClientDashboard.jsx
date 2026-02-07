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

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom taxi icon
const taxiIcon = new L.DivIcon({
  className: 'taxi-marker',
  html: `<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
    <svg viewBox="0 0 24 24" width="36" height="36" fill="#FFD700" stroke="#000" stroke-width="1">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// User location icon
const userIcon = new L.DivIcon({
  className: 'user-marker',
  html: `<div style="width: 20px; height: 20px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Destination icon
const destIcon = new L.DivIcon({
  className: 'dest-marker',
  html: `<div style="width: 20px; height: 20px; background: #22C55E; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Map center updater component
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
};

// Google Places Autocomplete Input Component
const PlacesAutocomplete = ({ value, onChange, onSelect, placeholder }) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load Google Maps script
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: ['fr', 'ch', 'be'] },
        fields: ['formatted_address', 'geometry', 'name']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const address = place.formatted_address || place.name;
          onSelect({
            address: address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error('Google Places error:', error);
    }
  }, [isLoaded, onSelect]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 bg-[#18181B] border-2 border-zinc-700 focus:border-[#FFD700] focus:outline-none rounded-md font-medium placeholder:text-zinc-500 text-white pl-10 pr-4"
        data-testid="destination-input"
      />
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
    // Ne pas utiliser de position par défaut - attendre la vraie géolocalisation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = [position.coords.latitude, position.coords.longitude];
          setUserPosition(pos);
          setMapCenter(pos);
          // Reverse geocode to get address
          if (window.google && window.google.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat: position.coords.latitude, lng: position.coords.longitude } }, (results, status) => {
              if (status === 'OK' && results[0]) {
                setPickup({
                  address: results[0].formatted_address,
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
              } else {
                setPickup({
                  address: 'Ma position actuelle',
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
              }
            });
          } else {
            setPickup({
              address: 'Ma position actuelle',
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Impossible d\'obtenir votre position. Activez la géolocalisation.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      toast.error('Géolocalisation non supportée par votre navigateur');
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
    
    // Log pour debug
    console.log('=== CALCUL DE DISTANCE ===');
    console.log('Pickup:', pickup.lat, pickup.lng, pickup.address);
    console.log('Destination:', destination.lat, destination.lng, destination.address);
    
    // Calculate with Google Directions API if available
    let distance = calculateDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    let duration = distance * 2.5;
    
    console.log('Distance Haversine (fallback):', distance, 'km');
    
    if (window.google && window.google.maps) {
      try {
        const directionsService = new window.google.maps.DirectionsService();
        const result = await new Promise((resolve, reject) => {
          directionsService.route({
            origin: { lat: pickup.lat, lng: pickup.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            travelMode: window.google.maps.TravelMode.DRIVING
          }, (res, status) => {
            console.log('Google Directions status:', status);
            if (status === 'OK') resolve(res);
            else reject(status);
          });
        });
        
        if (result.routes[0]?.legs[0]) {
          distance = result.routes[0].legs[0].distance.value / 1000;
          duration = result.routes[0].legs[0].duration.value / 60;
          console.log('Distance Google Directions:', distance, 'km');
          console.log('Durée Google Directions:', duration, 'min');
        }
      } catch (error) {
        console.warn('Directions API error, using fallback calculation:', error);
      }
    } else {
      console.warn('Google Maps API not loaded, using Haversine calculation');
    }
    
    console.log('Distance finale envoyée au backend:', distance, 'km');
    
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
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI+Kd2VfYHOCkJaUiXppaGx8jJiZk4Z2amxwhJKamJKEd29yd4WRmJePgXVxdX+LlZeTi4B2c3h/ipOWk42DenV3fYaPlZKMg3t3eH2EjJGPi4N8eHl9goqOjYmDfXp5fIGHi4qHgn16eXx/hIiIhYF9e3p8f4OGhoOAfXt6fH+ChYWCf317e3x+gYODgX9+fHx8foCCgoB/fnx8fH5/gYGAfn59fX1+f4CAgH9+fX19fn9/f39+fn19fX5+fn5+fn5+fn5+fn5+fn5+fn5+');
          audio.play().catch(() => {});
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
    <div className="h-screen flex flex-col bg-[#09090B]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-[#09090B] border-b border-zinc-800 z-20">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white" data-testid="menu-btn">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-[#18181B] border-zinc-700 w-80">
            <SheetHeader>
              <SheetTitle className="text-white flex items-center gap-3">
                <img src={LOGO_URL} alt="TaxiG" className="h-10" />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 space-y-2">
              {profile && (
                <div className="p-4 bg-[#09090B] rounded-lg mb-6">
                  <p className="text-white font-bold">{profile.prenom} {profile.nom}</p>
                  <p className="text-zinc-400 text-sm">{profile.email}</p>
                </div>
              )}
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'map' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('map')}
                data-testid="menu-map-btn"
              >
                <MapPin className="w-5 h-5 mr-3" />
                Commander un taxi
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'history' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('history')}
                data-testid="menu-history-btn"
              >
                <History className="w-5 h-5 mr-3" />
                Mes courses
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'stats' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('stats')}
                data-testid="menu-stats-btn"
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Statistiques
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'roulette' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('roulette')}
                data-testid="menu-roulette-btn"
              >
                <Gift className="w-5 h-5 mr-3" />
                Jeu quotidien
              </Button>
              <div className="pt-4 border-t border-zinc-700 mt-4">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
              zoom={16} 
              className="w-full h-full z-0"
              zoomControl={false}
              scrollWheelZoom={false}
              doubleClickZoom={true}
              touchZoom={true}
              dragging={true}
            >
              {/* CARTE EN COULEUR - OpenStreetMap standard */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapUpdater center={mapCenter} />
              
              {/* User position */}
              {userPosition && (
                <Marker position={userPosition} icon={userIcon}>
                  <Popup>Votre position</Popup>
                </Marker>
              )}
              
              {/* Destination */}
              {destination.lat && destination.lng && (
                <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
                  <Popup>{destination.address}</Popup>
                </Marker>
              )}
              
              {/* Active chauffeurs */}
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
            <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] rounded-t-3xl p-6 z-10 shadow-2xl border-t border-zinc-700">
              {bookingStep === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-[#09090B] rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-zinc-400 text-sm">Point de départ</p>
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
                  <p className="text-center text-zinc-500 text-sm">
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
                      className="text-white"
                      data-testid="back-to-start-btn"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    <h3 className="text-white font-bold text-lg">Choisir la destination</h3>
                  </div>
                  
                  {/* Google Places Autocomplete */}
                  <PlacesAutocomplete
                    value={destination.address}
                    onChange={(val) => setDestination({ ...destination, address: val })}
                    onSelect={handleDestinationSelect}
                    placeholder="Tapez une adresse..."
                  />
                  
                  <p className="text-zinc-500 text-xs">
                    Commencez à taper et sélectionnez une adresse dans la liste
                  </p>
                  
                  <Button 
                    className="btn-taxi w-full h-12"
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
                      className="text-white"
                      data-testid="back-to-destination-btn"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    <h3 className="text-white font-bold text-lg">Confirmer la course</h3>
                  </div>
                  
                  <div className="bg-[#09090B] rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <p className="text-white text-sm flex-1">{pickup.address}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <p className="text-white text-sm flex-1">{destination.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      {estimate.distance_km.toFixed(1)} km
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      ~{Math.round(estimate.duration_minutes)} min
                    </span>
                  </div>
                  
                  <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg p-4">
                    <p className="text-zinc-400 text-sm">Prix estimé</p>
                    <p className="text-[#FFD700] text-3xl font-black">{estimate.estimated_total.toFixed(2)}€</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      className={`flex-1 h-12 ${paymentMethod === 'cash' ? 'btn-taxi' : 'btn-secondary'}`}
                      onClick={() => setPaymentMethod('cash')}
                      data-testid="payment-cash-btn"
                    >
                      <Banknote className="w-5 h-5 mr-2" />
                      Espèces
                    </Button>
                    <Button
                      className={`flex-1 h-12 ${paymentMethod === 'card' ? 'btn-taxi' : 'btn-secondary'}`}
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
          <div className="p-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-white mb-6">Mes courses</h2>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-zinc-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Aucune course pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div 
                    key={course.id} 
                    className="card-taxi p-4 cursor-pointer hover:border-[#FFD700]/50"
                    onClick={() => navigate(`/client/course/${course.id}`)}
                    data-testid={`course-item-${course.id}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-bold">{course.commande_no}</p>
                        <p className="text-zinc-400 text-sm">
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
                      <div className="flex items-center gap-2 text-zinc-300">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        {course.pickup_address}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-300">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        {course.destination_address}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-700">
                      <span className="text-zinc-400">{course.distance_km?.toFixed(1)} km</span>
                      <span className="text-[#FFD700] font-bold text-lg">
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
          <div className="p-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-white mb-6">Mes statistiques</h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-zinc-700 rounded w-1/2 mb-2" />
                    <div className="h-8 bg-zinc-700 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="card-taxi p-4">
                    <p className="text-zinc-400 text-sm">Total courses</p>
                    <p className="text-white text-3xl font-black">{stats.total_courses}</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-zinc-400 text-sm">Total dépensé</p>
                    <p className="text-white text-3xl font-black">{stats.total_spent?.toFixed(2)}€</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-zinc-400 text-sm">Distance parcourue</p>
                    <p className="text-white text-3xl font-black">{stats.total_km?.toFixed(0)} km</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-zinc-400 text-sm">Prix moyen/course</p>
                    <p className="text-white text-3xl font-black">{stats.average_per_course?.toFixed(2)}€</p>
                  </div>
                </div>
                
                <div className="card-taxi p-6 border-[#22C55E]/30">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#22C55E]" />
                    Économies réalisées
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">vs Uber</span>
                      <span className="text-[#22C55E] font-bold">+{stats.savings_vs_uber?.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">vs TaxiPhone</span>
                      <span className="text-[#22C55E] font-bold">+{stats.savings_vs_taxiphone?.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Aucune statistique disponible</p>
              </div>
            )}
          </div>
        )}

        {/* Roulette View */}
        {view === 'roulette' && (
          <div className="p-6 overflow-y-auto h-full flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-white mb-2">Jeu quotidien</h2>
            <p className="text-zinc-400 mb-8 text-center">Tentez votre chance une fois par jour !</p>
            
            <div className="relative mb-8">
              <div 
                ref={rouletteRef}
                className="w-64 h-64 rounded-full border-8 border-[#FFD700] relative overflow-hidden"
                style={{ 
                  background: 'conic-gradient(from 0deg, #EF4444 0deg 36deg, #22C55E 36deg 72deg, #EF4444 72deg 108deg, #22C55E 108deg 144deg, #EF4444 144deg 180deg, #22C55E 180deg 216deg, #EF4444 216deg 252deg, #22C55E 252deg 288deg, #EF4444 288deg 324deg, #22C55E 324deg 360deg)'
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-[#FFD700] rounded-full flex items-center justify-center shadow-lg">
                    <Gift className="w-8 h-8 text-black" />
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[24px] border-t-[#FFD700]" />
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
              <div className={`mt-6 p-6 rounded-lg text-center ${rouletteResult.won ? 'bg-[#22C55E]/20 border border-[#22C55E]' : 'bg-zinc-800'}`}>
                {rouletteResult.won ? (
                  <>
                    <p className="text-[#22C55E] font-bold text-xl mb-2">🎉 Félicitations !</p>
                    <p className="text-white">{rouletteResult.prize}</p>
                    <p className="text-[#FFD700] font-mono mt-2">{rouletteResult.code_promo}</p>
                  </>
                ) : (
                  <>
                    <p className="text-zinc-400 text-xl mb-2">😢 Pas de chance</p>
                    <p className="text-zinc-500">Réessayez demain !</p>
                  </>
                )}
              </div>
            )}
            
            <p className="text-zinc-500 text-sm mt-6">1 chance sur 20 de gagner un code promo</p>
          </div>
        )}
      </main>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-[#18181B] border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmer la commande</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Voulez-vous confirmer cette course ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-[#09090B] rounded-lg p-4 space-y-2">
              <p className="text-white"><span className="text-zinc-400">De:</span> {pickup.address}</p>
              <p className="text-white"><span className="text-zinc-400">À:</span> {destination.address}</p>
              <p className="text-white"><span className="text-zinc-400">Prix:</span> <span className="text-[#FFD700] font-bold">{estimate?.estimated_total?.toFixed(2)}€</span></p>
              <p className="text-white"><span className="text-zinc-400">Paiement:</span> {paymentMethod === 'cash' ? 'Espèces' : 'Carte bancaire'}</p>
            </div>
            {paymentMethod === 'card' && (
              <div className="mt-4 flex items-start gap-2 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Vous serez redirigé vers la page de paiement sécurisé Stripe.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} className="text-white" data-testid="cancel-confirm-btn">
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
