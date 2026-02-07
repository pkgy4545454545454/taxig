import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Menu, Power, MapPin, Clock, DollarSign, Calendar, 
  CheckCircle, XCircle, Phone, Navigation, LogOut,
  ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { chauffeurApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import 'leaflet/dist/leaflet.css';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

// User location icon
const userIcon = new L.DivIcon({
  className: 'user-marker',
  html: `<div style="width: 24px; height: 24px; background: #FFD700; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map center updater
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
};

const ChauffeurDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState('map'); // map, commandes, revenus, calendar
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
  
  // Commandes
  const [commandes, setCommandes] = useState([]);
  const [commandeFilter, setCommandeFilter] = useState('all');
  
  // Revenus
  const [revenus, setRevenus] = useState(null);
  
  // Calendar
  const [selectedDates, setSelectedDates] = useState([]);
  const [indisponibilites, setIndisponibilites] = useState([]);
  
  // Audio ref for notifications
  const audioRef = useRef(null);

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

  // Geolocation tracking
  useEffect(() => {
    if (!isOnline) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        
        try {
          await chauffeurApi.updatePosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        } catch (error) {
          console.error('Position update error:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Impossible d\'obtenir votre position');
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline]);

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
            // Play notification sound
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
          } else if (response.data.type === 'assigned') {
            setCurrentCourse(response.data.course);
            setIncomingRequest(null);
            setShowIncomingDialog(false);
          }
        } else {
          if (currentCourse?.status === 'completed') {
            setCurrentCourse(null);
          }
        }
      } catch (error) {
        console.error('Error checking courses:', error);
      }
    };

    checkForCourses();
    const interval = setInterval(checkForCourses, 3000);
    return () => clearInterval(interval);
  }, [isOnline, incomingRequest?.id, currentCourse?.status]);

  // Toggle online status (pointer)
  const handlePointer = async () => {
    setLoading(true);
    try {
      const response = await chauffeurApi.pointer();
      setIsOnline(response.data.status === 'online');
      
      if (response.data.action === 'end') {
        setDailyRevenue(response.data.daily_revenue);
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
      setCurrentCourse({ ...currentCourse, status: 'in_progress' });
      toast.success('Course démarrée');
    } catch (error) {
      toast.error('Erreur lors du démarrage');
    }
  };

  // Complete course
  const handleCompleteCourse = async (waitMinutes = 0) => {
    if (!currentCourse) return;
    
    try {
      const response = await chauffeurApi.completeCourse(currentCourse.id, waitMinutes);
      toast.success(`Course terminée ! Prix: ${response.data.prix_final?.toFixed(2)}€`);
      setCurrentCourse(null);
      fetchProfile(); // Update course count
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
                data-testid="menu-map-btn"
              >
                <MapPin className="w-5 h-5 mr-3" />
                Tableau de bord
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'commandes' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('commandes')}
                data-testid="menu-commandes-btn"
              >
                <Clock className="w-5 h-5 mr-3" />
                Mes commandes
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'revenus' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('revenus')}
                data-testid="menu-revenus-btn"
              >
                <DollarSign className="w-5 h-5 mr-3" />
                Mes revenus
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FFD700] hover:bg-white/10 ${view === 'calendar' ? 'text-[#FFD700]' : ''}`}
                onClick={() => handleViewChange('calendar')}
                data-testid="menu-calendar-btn"
              >
                <Calendar className="w-5 h-5 mr-3" />
                Calendrier
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
        
        {/* Online/Offline toggle */}
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
              zoom={15}
              className="w-full h-full z-0"
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap'
              />
              <MapUpdater center={position} />
              
              {position && (
                <Marker position={position} icon={userIcon} />
              )}
            </MapContainer>

            {/* Current Course Panel */}
            {currentCourse && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] rounded-t-3xl p-6 z-10 shadow-2xl border-t border-zinc-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-zinc-400 text-sm">Course en cours</p>
                    <p className="text-white font-bold">{currentCourse.commande_no}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    currentCourse.status === 'in_progress' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {currentCourse.status === 'in_progress' ? 'En route' : 'Client en attente'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-sm">{currentCourse.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm">{currentCourse.destination_address}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-4 text-sm text-zinc-400">
                  <span>{currentCourse.client_nom}</span>
                  <span className="text-[#FFD700] font-bold">{currentCourse.prix_estime?.toFixed(2)}€</span>
                </div>
                
                {currentCourse.status === 'assigned' ? (
                  <Button 
                    className="btn-taxi w-full h-12"
                    onClick={handleStartCourse}
                    data-testid="start-course-btn"
                  >
                    <Navigation className="w-5 h-5 mr-2" />
                    Démarrer la course
                  </Button>
                ) : (
                  <Button 
                    className="bg-green-500 hover:bg-green-600 text-white w-full h-12 font-bold"
                    onClick={() => handleCompleteCourse(0)}
                    data-testid="complete-course-btn"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Terminer la course
                  </Button>
                )}
              </div>
            )}

            {/* No active course message */}
            {!currentCourse && isOnline && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] rounded-t-3xl p-6 z-10 shadow-2xl border-t border-zinc-700">
                <div className="text-center py-4">
                  <MapPin className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">En attente d'une course...</p>
                  <p className="text-zinc-500 text-sm mt-1">Les demandes apparaîtront ici</p>
                </div>
              </div>
            )}

            {/* Offline message */}
            {!isOnline && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#18181B] rounded-t-3xl p-6 z-10 shadow-2xl border-t border-zinc-700">
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
            
            <Tabs defaultValue="all" onValueChange={setCommandeFilter}>
              <TabsList className="w-full bg-[#18181B] mb-6">
                <TabsTrigger value="all" className="flex-1" onClick={fetchCommandes}>Toutes</TabsTrigger>
                <TabsTrigger value="completed" className="flex-1" onClick={fetchCommandes}>Terminées</TabsTrigger>
                <TabsTrigger value="assigned" className="flex-1" onClick={fetchCommandes}>En cours</TabsTrigger>
              </TabsList>
            </Tabs>

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
                  <div key={commande.id} className="card-taxi p-4" data-testid={`commande-${commande.id}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-bold">{commande.commande_no}</p>
                        <p className="text-zinc-400 text-sm">{commande.client_nom}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        commande.status === 'completed' ? 'badge-success' :
                        commande.status === 'assigned' ? 'badge-info' :
                        'badge-warning'
                      }`}>
                        {commande.status === 'completed' ? 'Terminée' :
                         commande.status === 'assigned' ? 'Assignée' : 'En cours'}
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
            
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-8 bg-zinc-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : revenus ? (
              <div className="space-y-6">
                <div className="card-taxi p-6 border-[#FFD700]/30">
                  <p className="text-zinc-400 text-sm mb-1">Revenus brut (30 jours)</p>
                  <p className="text-[#FFD700] text-4xl font-black">{revenus.revenus_brut_30j?.toFixed(2)}€</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="card-taxi p-4">
                    <p className="text-zinc-400 text-sm">Revenus net</p>
                    <p className="text-white text-2xl font-bold">{revenus.revenus_net_30j?.toFixed(2)}€</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-zinc-400 text-sm">Commission due</p>
                    <p className="text-red-400 text-2xl font-bold">{revenus.commission_due?.toFixed(2)}€</p>
                  </div>
                </div>
                
                <div className="card-taxi p-4">
                  <p className="text-zinc-400 text-sm">Courses effectuées</p>
                  <p className="text-white text-2xl font-bold">{revenus.nombre_courses_30j}</p>
                </div>
                
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-bold">Commission à régler</p>
                      <p className="text-zinc-400 text-sm">
                        Payez avant le 15 du mois pour éviter des frais supplémentaires.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">Données non disponibles</p>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="p-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-white mb-2">Calendrier</h2>
            <p className="text-zinc-400 mb-6">Indiquez vos jours d'indisponibilité</p>
            
            <div className="card-taxi p-4 flex justify-center">
              <CalendarComponent
                mode="multiple"
                selected={indisponibilites.map(d => new Date(d))}
                onSelect={(dates) => {
                  // Handle single date click
                  if (dates && dates.length > 0) {
                    const lastDate = dates[dates.length - 1];
                    handleDateSelect(lastDate);
                  }
                }}
                className="bg-transparent"
                classNames={{
                  day_selected: "bg-red-500 text-white hover:bg-red-600",
                  day_today: "bg-[#FFD700]/20 text-[#FFD700]"
                }}
              />
            </div>
            
            <div className="mt-6 flex items-center gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-zinc-400">Indisponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[#FFD700]/20 rounded border border-[#FFD700]" />
                <span className="text-zinc-400">Aujourd'hui</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Incoming Course Request Dialog */}
      <Dialog open={showIncomingDialog} onOpenChange={setShowIncomingDialog}>
        <DialogContent className="bg-[#18181B] border-zinc-700 max-w-sm mx-4 incoming-call-animation">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-2xl">Nouvelle course !</DialogTitle>
            <DialogDescription className="text-zinc-400 text-center">
              Un client vous demande
            </DialogDescription>
          </DialogHeader>
          
          {incomingRequest && (
            <div className="py-6">
              <div className="text-center mb-6">
                <p className="text-[#FFD700] text-3xl font-black">{incomingRequest.prix_estime?.toFixed(2)}€</p>
                <p className="text-zinc-400 text-sm">{incomingRequest.commande_no}</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-white text-sm">{incomingRequest.pickup_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-white text-sm">{incomingRequest.destination_address}</span>
                </div>
              </div>
              
              <p className="text-zinc-400 text-center text-sm mb-6">
                Client: {incomingRequest.client_nom}
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
