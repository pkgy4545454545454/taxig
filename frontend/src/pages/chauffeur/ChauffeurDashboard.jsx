import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Menu, Power, MapPin, Clock, DollarSign, Calendar, 
  CheckCircle, XCircle, Navigation, LogOut,
  AlertCircle, Timer, Route, Download, FileText
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { chauffeurApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import 'leaflet/dist/leaflet.css';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

// Chauffeur location icon (yellow car)
const chauffeurIcon = new L.DivIcon({
  className: 'chauffeur-marker',
  html: `<div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
    <svg viewBox="0 0 24 24" width="45" height="45" fill="#FFD700" stroke="#000" stroke-width="0.5">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  </div>`,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

// Client pickup icon (blue pulsing)
const clientPickupIcon = new L.DivIcon({
  className: 'client-pickup-marker',
  html: `<div style="position: relative; width: 30px; height: 30px;">
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Destination icon (green)
const destinationIcon = new L.DivIcon({
  className: 'destination-marker',
  html: `<div style="position: relative; width: 30px; height: 30px;">
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; background: #22C55E; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Map component - SMOOTH REAL-TIME TRACKING like Google Maps
const MapController = ({ chauffeurPos, clientPos, destinationPos, courseStatus, isFollowing }) => {
  const map = useMap();
  const lastCenterRef = useRef(null);
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    if (!map || !chauffeurPos) return;
    
    // If we have a course, fit bounds initially then follow chauffeur smoothly
    if (courseStatus === 'assigned' && clientPos) {
      // Initial fit to show both points
      if (!isInitializedRef.current) {
        const bounds = L.latLngBounds([
          L.latLng(chauffeurPos[0], chauffeurPos[1]),
          L.latLng(clientPos[0], clientPos[1])
        ]);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
        isInitializedRef.current = true;
      } else if (isFollowing) {
        // Smooth follow chauffeur - pan smoothly like Google Maps navigation
        map.panTo(L.latLng(chauffeurPos[0], chauffeurPos[1]), { animate: true, duration: 0.5 });
      }
    } else if (courseStatus === 'in_progress' && destinationPos) {
      // In progress - follow chauffeur towards destination
      if (isFollowing) {
        map.panTo(L.latLng(chauffeurPos[0], chauffeurPos[1]), { animate: true, duration: 0.5 });
      }
    } else if (!courseStatus) {
      // No course - center on chauffeur
      if (!isInitializedRef.current || isFollowing) {
        map.setView(L.latLng(chauffeurPos[0], chauffeurPos[1]), 16, { animate: true });
        isInitializedRef.current = true;
      }
    }
    
    lastCenterRef.current = chauffeurPos;
  }, [map, chauffeurPos, clientPos, destinationPos, courseStatus, isFollowing]);
  
  // Reset initialization when course changes
  useEffect(() => {
    if (!courseStatus) {
      isInitializedRef.current = false;
    }
  }, [courseStatus]);
  
  return null;
};

// Decode Google polyline
const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    
    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
};

const ChauffeurDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState('map');
  const [loading, setLoading] = useState(false);
  
  // Profile & status
  const [profile, setProfile] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [position, setPosition] = useState(null);
  const [dailyRevenue, setDailyRevenue] = useState(null);
  
  // Course request
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [showIncomingDialog, setShowIncomingDialog] = useState(false);
  
  // Route data
  const [routePolyline, setRoutePolyline] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  
  // Commandes
  const [commandes, setCommandes] = useState([]);
  const [commandeFilter, setCommandeFilter] = useState('all');
  
  // Revenus
  const [revenus, setRevenus] = useState(null);
  
  // Calendar
  const [indisponibilites, setIndisponibilites] = useState([]);
  
  // Audio ref
  const audioRef = useRef(null);

  // Load Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps) return;
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    try {
      const response = await chauffeurApi.getProfile();
      setProfile(response.data);
      setIsOnline(response.data.is_online);
      setIndisponibilites(response.data.indisponibilites || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Calculate route with Google Directions
  const calculateRoute = useCallback(async (origin, destination) => {
    console.log('=== CALCUL ROUTE ===');
    console.log('Origin:', origin);
    console.log('Destination:', destination);
    
    if (!window.google || !window.google.maps) {
      console.warn('Google Maps API not available, using straight line');
      // Fallback: create simple straight line
      setRoutePolyline([[origin.lat, origin.lng], [destination.lat, destination.lng]]);
      return;
    }
    
    const directionsService = new window.google.maps.DirectionsService();
    
    try {
      const result = await new Promise((resolve, reject) => {
        directionsService.route({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode: window.google.maps.TravelMode.DRIVING
        }, (res, status) => {
          console.log('Directions API status:', status);
          if (status === 'OK') resolve(res);
          else reject(status);
        });
      });
      
      if (result.routes[0]) {
        const route = result.routes[0];
        const leg = route.legs[0];
        
        // Decode the polyline - overview_polyline is an object with 'points' property
        const encodedPolyline = route.overview_polyline.points || route.overview_polyline;
        console.log('Encoded polyline type:', typeof encodedPolyline);
        
        const polyline = decodePolyline(encodedPolyline);
        console.log('Decoded polyline points:', polyline.length);
        setRoutePolyline(polyline);
        
        // Calculate ETA
        const now = new Date();
        const eta = new Date(now.getTime() + leg.duration.value * 1000);
        
        setRouteInfo({
          distance: leg.distance.text,
          distanceValue: leg.distance.value / 1000, // km
          duration: leg.duration.text,
          durationValue: leg.duration.value / 60, // minutes
          eta: eta.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        });
        
        console.log('Route calculated successfully:', leg.distance.text, leg.duration.text);
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      // Fallback to straight line
      setRoutePolyline([[origin.lat, origin.lng], [destination.lat, destination.lng]]);
      setRouteInfo({
        distance: 'Calcul en cours...',
        distanceValue: 0,
        duration: '-',
        durationValue: 0,
        eta: '-'
      });
    }
  }, []);

  // Geolocation tracking
  useEffect(() => {
    if (!isOnline) {
      setPosition(null);
      return;
    }

    // Set default position for testing (Paris center)
    const defaultPos = [48.8566, 2.3522];
    
    const updatePosition = async (pos) => {
      const newPos = [pos.coords.latitude, pos.coords.longitude];
      setPosition(newPos);
      
      try {
        await chauffeurApi.updatePosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        
        // Recalculate route if we have a current course
        if (currentCourse) {
          const targetLat = currentCourse.status === 'in_progress' 
            ? currentCourse.destination_lat 
            : currentCourse.pickup_lat;
          const targetLng = currentCourse.status === 'in_progress'
            ? currentCourse.destination_lng
            : currentCourse.pickup_lng;
          
          calculateRoute(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            { lat: targetLat, lng: targetLng }
          );
        }
      } catch (error) {
        console.error('Position update error:', error);
      }
    };

    // Try to get real position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        updatePosition, 
        () => {
          // Fallback to default position
          setPosition(defaultPos);
          chauffeurApi.updatePosition({ latitude: defaultPos[0], longitude: defaultPos[1] }).catch(() => {});
        },
        { timeout: 5000 }
      );
      
      const watchId = navigator.geolocation.watchPosition(
        updatePosition,
        () => {},
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setPosition(defaultPos);
    }
  }, [isOnline, currentCourse, calculateRoute]);

  // Poll for incoming course requests
  useEffect(() => {
    if (!isOnline) return;

    const checkForCourses = async () => {
      try {
        const response = await chauffeurApi.getPendingCourse();
        
        if (response.data.course) {
          if (response.data.type === 'request' && (!incomingRequest || incomingRequest.id !== response.data.course.id)) {
            setIncomingRequest(response.data.course);
            setShowIncomingDialog(true);
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
          } else if (response.data.type === 'assigned') {
            const course = response.data.course;
            setCurrentCourse(course);
            setIncomingRequest(null);
            setShowIncomingDialog(false);
            
            // Calculate initial route - use default position if not available
            const currentPos = position || [48.8566, 2.3522]; // Default to Paris
            const targetLat = course.status === 'in_progress' ? course.destination_lat : course.pickup_lat;
            const targetLng = course.status === 'in_progress' ? course.destination_lng : course.pickup_lng;
            
            console.log('Course assigned, calculating route...');
            calculateRoute(
              { lat: currentPos[0], lng: currentPos[1] },
              { lat: targetLat, lng: targetLng }
            );
          }
        } else {
          if (currentCourse?.status === 'completed') {
            setCurrentCourse(null);
            setRoutePolyline([]);
            setRouteInfo(null);
          }
        }
      } catch (error) {
        console.error('Error checking courses:', error);
      }
    };

    checkForCourses();
    const interval = setInterval(checkForCourses, 3000);
    return () => clearInterval(interval);
  }, [isOnline, incomingRequest?.id, currentCourse?.status, position, calculateRoute]);

  // Toggle online status
  const handlePointer = async () => {
    setLoading(true);
    try {
      const response = await chauffeurApi.pointer();
      setIsOnline(response.data.status === 'online');
      
      if (response.data.action === 'end') {
        setDailyRevenue(response.data.daily_revenue);
        setRoutePolyline([]);
        setRouteInfo(null);
        setCurrentCourse(null);
        toast.success(`Service terminé. Revenu du jour: ${response.data.daily_revenue?.toFixed(2) || 0}€`);
      } else {
        toast.success('Service démarré. Vous êtes maintenant en ligne.');
      }
    } catch (error) {
      toast.error('Erreur lors du pointage');
    } finally {
      setLoading(false);
    }
  };

  // Respond to course request
  const handleRespondToCourse = async (accept) => {
    if (!incomingRequest) return;
    
    setLoading(true);
    try {
      await chauffeurApi.respondToCourse(incomingRequest.id, accept);
      
      if (accept) {
        toast.success('Course acceptée !');
        
        // Calculate route immediately to pickup
        const currentPos = position || [48.8566, 2.3522]; // Default Paris if no position
        console.log('Calculating route after accepting course...');
        calculateRoute(
          { lat: currentPos[0], lng: currentPos[1] },
          { lat: incomingRequest.pickup_lat, lng: incomingRequest.pickup_lng }
        );
      } else {
        toast.info('Course refusée');
      }
      
      setIncomingRequest(null);
      setShowIncomingDialog(false);
    } catch (error) {
      toast.error('Erreur lors de la réponse');
    } finally {
      setLoading(false);
    }
  };

  // Start course
  const handleStartCourse = async () => {
    if (!currentCourse) return;
    
    try {
      await chauffeurApi.startCourse(currentCourse.id);
      const updatedCourse = { ...currentCourse, status: 'in_progress' };
      setCurrentCourse(updatedCourse);
      toast.success('Course démarrée - En route vers la destination');
      
      // Recalculate route to destination
      if (position) {
        calculateRoute(
          { lat: position[0], lng: position[1] },
          { lat: currentCourse.destination_lat, lng: currentCourse.destination_lng }
        );
      }
    } catch (error) {
      toast.error('Erreur lors du démarrage');
    }
  };

  // Complete course
  const handleCompleteCourse = async (waitMinutes = 0) => {
    if (!currentCourse) return;
    
    try {
      const response = await chauffeurApi.completeCourse(currentCourse.id, waitMinutes);
      toast.success(`Course terminée ! Prix final: ${response.data.prix_final?.toFixed(2)}€`);
      setCurrentCourse(null);
      setRoutePolyline([]);
      setRouteInfo(null);
      fetchProfile();
    } catch (error) {
      toast.error('Erreur lors de la finalisation');
    }
  };

  // Fetch commandes
  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const status = commandeFilter === 'all' ? null : commandeFilter;
      const response = await chauffeurApi.getCommandes(status);
      setCommandes(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Fetch revenus
  const fetchRevenus = async () => {
    setLoading(true);
    try {
      const response = await chauffeurApi.getRevenus();
      setRevenus(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Handle indisponibilite
  const handleDateSelect = async (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const isSelected = indisponibilites.includes(dateStr);
    
    try {
      if (isSelected) {
        await chauffeurApi.removeIndisponibilite(dateStr);
        setIndisponibilites(indisponibilites.filter(d => d !== dateStr));
        toast.success('Disponibilité ajoutée');
      } else {
        await chauffeurApi.addIndisponibilite(dateStr);
        setIndisponibilites([...indisponibilites, dateStr]);
        toast.success('Indisponibilité ajoutée');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setMenuOpen(false);
    if (newView === 'commandes') fetchCommandes();
    if (newView === 'revenus') fetchRevenus();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Get positions for map controller
  const getClientPos = () => {
    if (!currentCourse) return null;
    return [currentCourse.pickup_lat, currentCourse.pickup_lng];
  };

  const getDestPos = () => {
    if (!currentCourse || currentCourse.status !== 'in_progress') return null;
    return [currentCourse.destination_lat, currentCourse.destination_lng];
  };

  return (
    <div className="h-screen flex flex-col bg-[#09090B]">
      {/* Notification audio */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI+Kd2VfYHOCkJaUiXppaGx8jJiZk4Z2amxwhJKamJKEd29yd4WRmJePgXVxdX+LlZeTi4B2c3h/ipOWk42DenV3fYaPlZKMg3t3eH2EjJGPi4N8eHl9goqOjYmDfXp5fIGHi4qHgn16eXx/hIiIhYF9e3p8f4OGhoOAfXt6fH+ChYWCf317e3x+gYODgX9+fHx8foCCgoB/fnx8fH5/gYGAfn59fX1+f4CAgH9+fX19fn9/f39+fn19fX5+fn5+fn5+fn5+fn5+fn5+fn5+" />

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
                  <p className="text-zinc-400 text-sm">Code: {profile.code_chauffeur}</p>
                  <p className="text-zinc-400 text-sm">{profile.nombre_courses} courses effectuées</p>
                </div>
              )}
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'map' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('map')}
              >
                <MapPin className="w-5 h-5 mr-3" />
                Tableau de bord
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'commandes' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('commandes')}
              >
                <Clock className="w-5 h-5 mr-3" />
                Mes commandes
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'revenus' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('revenus')}
              >
                <DollarSign className="w-5 h-5 mr-3" />
                Mes revenus
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'calendar' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('calendar')}
              >
                <Calendar className="w-5 h-5 mr-3" />
                Calendrier
              </Button>
              <div className="pt-4 border-t border-zinc-700 mt-4">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <img src={LOGO_URL} alt="TaxiG" className="h-10" />
        
        <Button
          variant="ghost"
          size="icon"
          className={`${isOnline ? 'text-green-400' : 'text-zinc-500'}`}
          onClick={handlePointer}
          disabled={loading}
          data-testid="pointer-btn"
        >
          <Power className="w-6 h-6" />
        </Button>
      </header>

      {/* Status bar */}
      <div className={`px-4 py-2 flex items-center justify-center gap-2 ${isOnline ? 'bg-green-500/20' : 'bg-zinc-800'}`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-500'}`} />
        <span className={`text-sm font-medium ${isOnline ? 'text-green-400' : 'text-zinc-400'}`}>
          {isOnline ? 'En service' : 'Hors service'}
        </span>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {/* Map View */}
        {view === 'map' && (
          <>
            <MapContainer 
              center={position || [48.8566, 2.3522]}
              zoom={14}
              className="w-full h-full z-0"
              zoomControl={false}
              scrollWheelZoom={true}
              doubleClickZoom={true}
              dragging={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              
              {/* Smart map controller - centers between chauffeur and client like Uber */}
              <MapController 
                chauffeurPos={position}
                clientPos={getClientPos()}
                destinationPos={getDestPos()}
                courseStatus={currentCourse?.status}
              />
              
              {/* Chauffeur position (yellow car) */}
              {position && (
                <Marker position={position} icon={chauffeurIcon}>
                  <Popup>
                    <div className="text-center font-bold">🚕 Votre position</div>
                  </Popup>
                </Marker>
              )}
              
              {/* Client pickup position (blue) */}
              {currentCourse && (
                <Marker 
                  position={[currentCourse.pickup_lat, currentCourse.pickup_lng]} 
                  icon={clientPickupIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold text-blue-600">📍 {currentCourse.client_nom}</p>
                      <p className="text-xs">{currentCourse.pickup_address}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Destination position (green) */}
              {currentCourse && currentCourse.status === 'in_progress' && (
                <Marker 
                  position={[currentCourse.destination_lat, currentCourse.destination_lng]} 
                  icon={destinationIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold text-green-600">🏁 Destination</p>
                      <p className="text-xs">{currentCourse.destination_address}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* Route polyline (blue like Google Maps) */}
              {routePolyline.length > 0 && (
                <>
                  <Polyline 
                    positions={routePolyline}
                    color="#1a73e8"
                    weight={7}
                    opacity={0.5}
                  />
                  <Polyline 
                    positions={routePolyline}
                    color="#4285f4"
                    weight={4}
                    opacity={1}
                  />
                </>
              )}
            </MapContainer>

            {/* Route Info Bar */}
            {currentCourse && routeInfo && (
              <div className="absolute top-2 left-2 right-2 bg-white rounded-xl shadow-lg p-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <Route className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-black font-bold text-xl">{routeInfo.duration}</p>
                      <p className="text-gray-500 text-sm">{routeInfo.distance}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs uppercase">Arrivée</p>
                    <p className="text-black font-bold text-2xl">{routeInfo.eta}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Course Panel */}
            {currentCourse && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] rounded-t-3xl p-6 z-10 shadow-2xl border-t border-zinc-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-zinc-400 text-sm">
                      {currentCourse.status === 'assigned' ? '🚗 En route vers le client' : '🏁 En course'}
                    </p>
                    <p className="text-white font-bold">{currentCourse.commande_no}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    currentCourse.status === 'in_progress' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {currentCourse.status === 'in_progress' ? 'En course' : 'Client en attente'}
                  </span>
                </div>
                
                {/* Route visualization */}
                <div className="bg-[#09090B] rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <div className="w-0.5 h-8 bg-zinc-600" />
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-zinc-500 text-xs">PRISE EN CHARGE</p>
                        <p className="text-white text-sm">{currentCourse.pickup_address}</p>
                        <p className="text-blue-400 text-xs font-bold">👤 {currentCourse.client_nom}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">DESTINATION</p>
                        <p className="text-white text-sm">{currentCourse.destination_address}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Route info */}
                {routeInfo && (
                  <div className="flex justify-between items-center mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-blue-400 font-bold">{routeInfo.duration}</p>
                        <p className="text-zinc-400 text-xs">{routeInfo.distance}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-400 text-xs">ETA</p>
                      <p className="text-white font-bold text-lg">{routeInfo.eta}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-zinc-400">{currentCourse.distance_km?.toFixed(1)} km</span>
                  <span className="text-[#FFD700] font-bold text-xl">{currentCourse.prix_estime?.toFixed(2)}€</span>
                </div>
                
                {currentCourse.status === 'assigned' ? (
                  <Button 
                    className="btn-taxi w-full h-14 text-lg"
                    onClick={handleStartCourse}
                    data-testid="start-course-btn"
                  >
                    <Navigation className="w-6 h-6 mr-2" />
                    Client récupéré - Démarrer
                  </Button>
                ) : (
                  <Button 
                    className="bg-green-500 hover:bg-green-600 text-white w-full h-14 font-bold text-lg"
                    onClick={() => handleCompleteCourse(0)}
                    data-testid="complete-course-btn"
                  >
                    <CheckCircle className="w-6 h-6 mr-2" />
                    Terminer la course
                  </Button>
                )}
              </div>
            )}

            {/* Waiting message */}
            {!currentCourse && isOnline && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] rounded-t-3xl p-6 z-10">
                <div className="text-center py-4">
                  <MapPin className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">En attente d'une course...</p>
                </div>
              </div>
            )}

            {/* Offline message */}
            {!isOnline && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] rounded-t-3xl p-6 z-10">
                <div className="text-center py-4">
                  <Power className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">Vous êtes hors service</p>
                  <Button 
                    className="btn-taxi mt-4"
                    onClick={handlePointer}
                    disabled={loading}
                    data-testid="go-online-btn"
                  >
                    Commencer le service
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Commandes View */}
        {view === 'commandes' && (
          <div className="p-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-white mb-6">Mes commandes</h2>
            
            <div className="flex gap-2 mb-6 flex-wrap">
              {['all', 'completed', 'assigned'].map((filter) => (
                <Button
                  key={filter}
                  variant={commandeFilter === filter ? 'default' : 'outline'}
                  className={commandeFilter === filter ? 'btn-taxi' : 'border-zinc-700 text-white'}
                  onClick={() => { setCommandeFilter(filter); fetchCommandes(); }}
                >
                  {filter === 'all' ? 'Toutes' : filter === 'completed' ? 'Terminées' : 'Assignées'}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-zinc-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : commandes.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Aucune commande</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commandes.map((commande) => (
                  <div key={commande.id} className="card-taxi p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-bold">{commande.commande_no}</p>
                        <p className="text-zinc-400 text-sm">{commande.client_nom}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        commande.status === 'completed' ? 'badge-success' : 'badge-info'
                      }`}>
                        {commande.status === 'completed' ? 'Terminée' : 'Assignée'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-700">
                      <span className="text-zinc-400 text-sm">
                        {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-[#FFD700] font-bold">{commande.prix?.toFixed(2)}€</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Revenus View */}
        {view === 'revenus' && (
          <div className="p-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-white mb-6">Mes revenus</h2>
            
            {!revenus ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <Button className="btn-taxi" onClick={fetchRevenus}>Charger les revenus</Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="card-taxi p-6 border-[#FFD700]/30">
                  <p className="text-zinc-400 text-sm">Revenus brut (30 jours)</p>
                  <p className="text-[#FFD700] text-4xl font-black">{revenus.revenus_brut_30j?.toFixed(2)}€</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="card-taxi p-4">
                    <p className="text-zinc-400 text-sm">Net</p>
                    <p className="text-white text-2xl font-bold">{revenus.revenus_net_30j?.toFixed(2)}€</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-zinc-400 text-sm">Commission</p>
                    <p className="text-red-400 text-2xl font-bold">{revenus.commission_due?.toFixed(2)}€</p>
                  </div>
                </div>
                
                <div className="card-taxi p-4">
                  <p className="text-zinc-400 text-sm">Courses</p>
                  <p className="text-white text-2xl font-bold">{revenus.nombre_courses_30j}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="p-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-white mb-2">Calendrier</h2>
            <p className="text-zinc-400 mb-6">Indiquez vos indisponibilités</p>
            
            <div className="card-taxi p-4 flex justify-center">
              <CalendarComponent
                mode="multiple"
                selected={indisponibilites.map(d => new Date(d))}
                onSelect={(dates) => {
                  if (dates?.length > 0) {
                    handleDateSelect(dates[dates.length - 1]);
                  }
                }}
                className="bg-transparent"
              />
            </div>
          </div>
        )}
      </main>

      {/* Incoming Course Dialog */}
      <Dialog open={showIncomingDialog} onOpenChange={setShowIncomingDialog}>
        <DialogContent className="bg-[#18181B] border-zinc-700 max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-2xl">🚕 Nouvelle course !</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              Un client vous demande
            </DialogDescription>
          </DialogHeader>
          
          {incomingRequest && (
            <div className="py-6">
              <div className="text-center mb-6">
                <p className="text-[#FFD700] text-4xl font-black">{incomingRequest.prix_estime?.toFixed(2)}€</p>
                <p className="text-zinc-400 text-sm">{incomingRequest.commande_no}</p>
              </div>
              
              <div className="space-y-3 mb-6 bg-[#09090B] p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-white text-sm">{incomingRequest.pickup_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-white text-sm">{incomingRequest.destination_address}</span>
                </div>
              </div>
              
              <p className="text-zinc-400 text-center text-sm mb-6">
                👤 <span className="text-white font-bold">{incomingRequest.client_nom}</span>
              </p>
              
              <div className="flex gap-4">
                <Button
                  className="flex-1 h-14 bg-red-500 hover:bg-red-600 text-white font-bold"
                  onClick={() => handleRespondToCourse(false)}
                  disabled={loading}
                  data-testid="reject-course-btn"
                >
                  <XCircle className="w-6 h-6 mr-2" />
                  Refuser
                </Button>
                <Button
                  className="flex-1 h-14 bg-green-500 hover:bg-green-600 text-white font-bold"
                  onClick={() => handleRespondToCourse(true)}
                  disabled={loading}
                  data-testid="accept-course-btn"
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Accepter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChauffeurDashboard;
