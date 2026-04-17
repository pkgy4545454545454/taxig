import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  Menu, Power, MapPin, Clock, DollarSign, Calendar, 
  CheckCircle, XCircle, Navigation, LogOut,
  AlertCircle, Timer, Route, Download, FileText,
  Star, Upload, Bell, Loader2, Eye
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { chauffeurApi, courseApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'leaflet/dist/leaflet.css';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

// Chauffeur location icon (orange car)
const chauffeurIcon = new L.DivIcon({
  className: 'chauffeur-marker',
  html: `<div style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
    <svg viewBox="0 0 24 24" width="45" height="45" fill="#FF6B00" stroke="#0A1628" stroke-width="0.5">
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

// Map component - TOUJOURS CENTRÉ SUR LE CHAUFFEUR comme Google Maps Navigation
const MapController = ({ chauffeurPos }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !chauffeurPos) return;
    
    // TOUJOURS centrer sur le chauffeur - suivi temps réel
    map.setView(L.latLng(chauffeurPos[0], chauffeurPos[1]), 17, { 
      animate: true, 
      duration: 0.5,
      easeLinearity: 0.5
    });
  }, [map, chauffeurPos]);
  
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
  const [revenusDetails, setRevenusDetails] = useState([]);
  
  // Calendar
  const [indisponibilites, setIndisponibilites] = useState([]);
  
  // Timer temps réel pour la course
  const [elapsedTime, setElapsedTime] = useState(0);
  const [courseStartTime, setCourseStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  
  // Audio ref
  const audioRef = useRef(null);
  
  // Refs for stable polling - prevents interval reset on GPS updates
  const positionRef = useRef(null);
  const incomingRequestRef = useRef(null);
  const currentCourseRef = useRef(null);
  const calculateRouteRef = useRef(null);
  
  // Browser notification permission
  const [notifPermission, setNotifPermission] = useState(Notification?.permission || 'default');
  
  // Rating state
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingCourseId, setRatingCourseId] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingHover, setRatingHover] = useState(0);
  
  // Document upload state
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Request browser notification permission when going online
  useEffect(() => {
    if (isOnline && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(perm => {
        setNotifPermission(perm);
        if (perm === 'granted') {
          toast.success('Notifications activées');
        }
      });
    }
  }, [isOnline]);
  
  // Send browser notification for incoming course
  const sendBrowserNotification = useCallback((course) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification('TaxiG - Nouvelle course !', {
        body: `${course.prix_estime?.toFixed(2)}€ - ${course.pickup_address}`,
        icon: LOGO_URL,
        tag: 'taxig-course-' + course.id,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  }, []);
  
  // Keep refs in sync with state
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { incomingRequestRef.current = incomingRequest; }, [incomingRequest]);
  useEffect(() => { currentCourseRef.current = currentCourse; }, [currentCourse]);
  
  // Timer en temps réel - mise à jour chaque seconde
  useEffect(() => {
    if (!currentCourse || !courseStartTime) {
      setElapsedTime(0);
      return;
    }
    
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - courseStartTime) / 1000);
      setElapsedTime(elapsed);
      
      // Calculer temps restant estimé
      if (routeInfo?.durationValue) {
        const remainingSecs = Math.max(0, (routeInfo.durationValue * 60) - elapsed);
        setRemainingTime(remainingSecs);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentCourse, courseStartTime, routeInfo?.durationValue]);
  
  // Formater le temps en HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // PDF Export function for accounting
  const exportRevenusPDF = useCallback(() => {
    if (!revenus || !profile) {
      toast.error('Veuillez charger les revenus d\'abord');
      return;
    }
    
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('fr-FR');
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');
    
    // Header with TaxiG branding
    doc.setFillColor(10, 22, 40); // Navy #0A1628
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 107, 0); // Orange
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('TaxiG', 20, 25);
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('Rapport de Revenus - Comptabilité', 60, 25);
    
    // Driver info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Informations Chauffeur', 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Nom: ${profile.prenom} ${profile.nom}`, 20, 65);
    doc.text(`Code Chauffeur: ${profile.code_chauffeur}`, 20, 72);
    doc.text(`Date du rapport: ${today}`, 20, 79);
    doc.text(`Période: ${periodStart} - ${today}`, 20, 86);
    
    // Financial summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Résumé Financier (30 derniers jours)', 20, 102);
    
    // Summary table
    const summaryData = [
      ['Revenus Brut', `${revenus.revenus_brut_30j?.toFixed(2) || '0.00'} €`],
      ['Commission TaxiG (15%)', `- ${revenus.commission_due?.toFixed(2) || '0.00'} €`],
      ['Revenus Net', `${revenus.revenus_net_30j?.toFixed(2) || '0.00'} €`],
      ['Nombre de courses', `${revenus.nombre_courses_30j || 0}`],
    ];
    
    autoTable(doc, {
      startY: 108,
      head: [['Description', 'Montant']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [255, 107, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 11 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 60, halign: 'right' }
      }
    });
    
    // Courses detail if available
    if (revenusDetails.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const detailY = doc.lastAutoTable.finalY + 15;
      doc.text('Détail des Courses', 20, detailY);
      
      const coursesData = revenusDetails.map(c => [
        c.commande_no || '-',
        new Date(c.created_at).toLocaleDateString('fr-FR'),
        c.client_nom || '-',
        `${c.prix?.toFixed(2) || '0.00'} €`
      ]);
      
      autoTable(doc, {
        startY: detailY + 6,
        head: [['N° Commande', 'Date', 'Client', 'Montant']],
        body: coursesData,
        theme: 'striped',
        headStyles: { fillColor: [255, 107, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 },
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`TaxiG - Document généré automatiquement le ${today}`, 20, 285);
      doc.text(`Page ${i} / ${pageCount}`, 180, 285);
    }
    
    // Download
    const fileName = `TaxiG_Revenus_${profile.code_chauffeur}_${today.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
    toast.success('PDF téléchargé avec succès !');
  }, [revenus, profile, revenusDetails]);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    try {
      const response = await chauffeurApi.getProfile();
      setProfile(response.data);
      setIsOnline(response.data.is_online);
      setIndisponibilites(response.data.indisponibilites || []);
    } catch (error) {
      // Silent error
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Calculate route with OSRM (OpenStreetMap Routing Machine)
  const calculateRoute = useCallback(async (origin, destination) => {
    if (!origin || !destination) return;
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        
        // Extract coordinates from GeoJSON
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoutePolyline(coordinates);
        
        // Calculate ETA
        const now = new Date();
        const eta = new Date(now.getTime() + route.duration * 1000);
        
        setRouteInfo({
          distance: `${(route.distance / 1000).toFixed(1)} km`,
          distanceValue: route.distance / 1000,
          duration: `${Math.round(route.duration / 60)} min`,
          durationValue: route.duration / 60,
          eta: eta.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        // Fallback to straight line
        setRoutePolyline([[origin.lat, origin.lng], [destination.lat, destination.lng]]);
      }
    } catch (error) {
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

  // Keep calculateRoute ref in sync
  useEffect(() => { calculateRouteRef.current = calculateRoute; }, [calculateRoute]);

  // Geolocation tracking
  useEffect(() => {
    if (!isOnline) {
      setPosition(null);
      return;
    }

    // Pas de position par défaut - utiliser uniquement la vraie géolocalisation
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

    // Utiliser uniquement la vraie géolocalisation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        updatePosition, 
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Activez la géolocalisation pour utiliser l\'application');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      
      const watchId = navigator.geolocation.watchPosition(
        updatePosition,
        (error) => {
          console.error('Watch position error:', error);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      toast.error('Géolocalisation non supportée');
    }
  }, [isOnline, currentCourse, calculateRoute]);

  // Poll for incoming course requests - STABLE interval using refs
  useEffect(() => {
    if (!isOnline) return;

    const checkForCourses = async () => {
      try {
        const response = await chauffeurApi.getPendingCourse();
        const curIncoming = incomingRequestRef.current;
        const curCourse = currentCourseRef.current;
        const curPosition = positionRef.current;
        const curCalcRoute = calculateRouteRef.current;
        
        if (response.data.course) {
          if (response.data.type === 'request' && (!curIncoming || curIncoming.id !== response.data.course.id)) {
            setIncomingRequest(response.data.course);
            setShowIncomingDialog(true);
            // Audio notification
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            // Browser push notification
            sendBrowserNotification(response.data.course);
          } else if (response.data.type === 'assigned') {
            const course = response.data.course;
            setCurrentCourse(course);
            setIncomingRequest(null);
            setShowIncomingDialog(false);
            
            // Calculate initial route
            if (curPosition && curCalcRoute) {
              const targetLat = course.status === 'in_progress' ? course.destination_lat : course.pickup_lat;
              const targetLng = course.status === 'in_progress' ? course.destination_lng : course.pickup_lng;
              
              curCalcRoute(
                { lat: curPosition[0], lng: curPosition[1] },
                { lat: targetLat, lng: targetLng }
              );
            }
          }
        } else {
          if (curCourse?.status === 'completed') {
            setCurrentCourse(null);
            setRoutePolyline([]);
            setRouteInfo(null);
          }
        }
      } catch (error) {
        // Silent - retry on next poll
      }
    };

    // Initial check immediately
    checkForCourses();
    // Stable 3-second polling - NOT affected by position changes
    const interval = setInterval(checkForCourses, 3000);
    return () => clearInterval(interval);
  }, [isOnline]); // ONLY depends on isOnline - refs handle the rest

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
        setCourseStartTime(Date.now()); // Démarrer le chrono dès l'acceptation
        
        // Calculate route immediately to pickup - utiliser position réelle uniquement
        if (position) {
          calculateRoute(
            { lat: position[0], lng: position[1] },
            { lat: incomingRequest.pickup_lat, lng: incomingRequest.pickup_lng }
          );
        }
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
      setCourseStartTime(Date.now()); // Démarrer le chrono
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
    
    const courseId = currentCourse.id;
    try {
      const response = await chauffeurApi.completeCourse(courseId, waitMinutes);
      toast.success(`Course terminée ! Prix final: ${response.data.prix_final?.toFixed(2)}€`);
      
      // Show rating dialog
      setRatingCourseId(courseId);
      setRatingStars(0);
      setRatingComment('');
      setShowRatingDialog(true);
      
      setCurrentCourse(null);
      setRoutePolyline([]);
      setRouteInfo(null);
      setCourseStartTime(null);
      setElapsedTime(0);
      setRemainingTime(null);
      fetchProfile();
    } catch (error) {
      toast.error('Erreur lors de la finalisation');
    }
  };

  // Submit rating
  const handleSubmitRating = async () => {
    if (!ratingCourseId || ratingStars === 0) {
      toast.error('Sélectionnez une note');
      return;
    }
    try {
      await courseApi.rate(ratingCourseId, { stars: ratingStars, comment: ratingComment || null });
      toast.success('Merci pour votre note !');
      setShowRatingDialog(false);
      setRatingCourseId(null);
    } catch (error) {
      if (error.response?.data?.detail === 'Vous avez déjà noté cette course') {
        toast.info('Déjà noté');
      } else {
        toast.error('Erreur lors de la notation');
      }
      setShowRatingDialog(false);
    }
  };

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      const response = await chauffeurApi.getDocuments();
      setDocuments(response.data);
    } catch (error) {
      toast.error('Erreur chargement documents');
    }
  };

  // Upload document
  const handleUploadDocument = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      await chauffeurApi.uploadDocument(formData);
      toast.success('Document envoyé !');
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setUploading(false);
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

  // Fetch revenus with course details for PDF
  const fetchRevenus = async () => {
    setLoading(true);
    try {
      const [revenusResponse, commandesResponse] = await Promise.all([
        chauffeurApi.getRevenus(),
        chauffeurApi.getCommandes('completed')
      ]);
      setRevenus(revenusResponse.data);
      setRevenusDetails(commandesResponse.data || []);
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
    if (newView === 'documents') fetchDocuments();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="h-screen flex flex-col bg-[#0A1628]">
      {/* Notification audio */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI+Kd2VfYHOCkJaUiXppaGx8jJiZk4Z2amxwhJKamJKEd29yd4WRmJePgXVxdX+LlZeTi4B2c3h/ipOWk42DenV3fYaPlZKMg3t3eH2EjJGPi4N8eHl9goqOjYmDfXp5fIGHi4qHgn16eXx/hIiIhYF9e3p8f4OGhoOAfXt6fH+ChYWCf317e3x+gYODgX9+fHx8foCCgoB/fnx8fH5/gYGAfn59fX1+f4CAgH9+fX19fn9/f39+fn19fX5+fn5+fn5+fn5+fn5+fn5+fn5+" />

      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-[#0A1628] border-b border-[#1A3358] z-20">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white" data-testid="menu-btn">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-[#0F2240] border-[#1A3358] w-80">
            <SheetHeader>
              <SheetTitle className="text-white flex items-center gap-3">
                <img src={LOGO_URL} alt="TaxiG" className="h-10" />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 space-y-2">
              {profile && (
                <div className="p-4 bg-[#0A1628] rounded-lg mb-6">
                  <p className="text-white font-bold">{profile.prenom} {profile.nom}</p>
                  <p className="text-slate-400 text-sm">Code: {profile.code_chauffeur}</p>
                  <p className="text-slate-400 text-sm">{profile.nombre_courses} courses effectuées</p>
                </div>
              )}
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FF6B00] hover:bg-white/10 ${view === 'map' ? 'text-[#FF6B00]' : ''}`}
                onClick={() => handleViewChange('map')}
              >
                <MapPin className="w-5 h-5 mr-3" />
                Tableau de bord
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FF6B00] hover:bg-white/10 ${view === 'commandes' ? 'text-[#FF6B00]' : ''}`}
                onClick={() => handleViewChange('commandes')}
              >
                <Clock className="w-5 h-5 mr-3" />
                Mes commandes
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FF6B00] hover:bg-white/10 ${view === 'revenus' ? 'text-[#FF6B00]' : ''}`}
                onClick={() => handleViewChange('revenus')}
              >
                <DollarSign className="w-5 h-5 mr-3" />
                Mes revenus
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FF6B00] hover:bg-white/10 ${view === 'calendar' ? 'text-[#FF6B00]' : ''}`}
                onClick={() => handleViewChange('calendar')}
              >
                <Calendar className="w-5 h-5 mr-3" />
                Calendrier
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start text-white hover:text-[#FF6B00] hover:bg-white/10 ${view === 'documents' ? 'text-[#FF6B00]' : ''}`}
                onClick={() => handleViewChange('documents')}
                data-testid="menu-documents-btn"
              >
                <Upload className="w-5 h-5 mr-3" />
                Mes documents
              </Button>
              <div className="pt-4 border-t border-[#1A3358] mt-4">
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
          className={`${isOnline ? 'text-green-400' : 'text-slate-500'}`}
          onClick={handlePointer}
          disabled={loading}
          data-testid="pointer-btn"
        >
          <Power className="w-6 h-6" />
        </Button>
      </header>

      {/* Status bar */}
      <div className={`px-4 py-2 flex items-center justify-center gap-2 ${isOnline ? 'bg-green-500/20' : 'bg-[#0F2240]'}`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
        <span className={`text-sm font-medium ${isOnline ? 'text-green-400' : 'text-slate-400'}`}>
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
              zoom={17}
              className="w-full h-full z-0"
              zoomControl={false}
              scrollWheelZoom={false}
              doubleClickZoom={true}
              dragging={true}
              touchZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              
              {/* TOUJOURS centré sur le chauffeur */}
              <MapController chauffeurPos={position} />
              
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
              {/* Route - afficher SEULEMENT avec une vraie course et vraie position */}
              {currentCourse && position && routePolyline.length > 1 && (
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

            {/* Route Info Bar - TEMPS RÉEL */}
            {currentCourse && routeInfo && (
              <div className="absolute top-2 left-2 right-2 glass-navy rounded-xl shadow-lg p-4 z-10 animate-slideDown">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#FF6B00] rounded-full flex items-center justify-center">
                      <Route className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      {/* Temps restant en temps réel */}
                      <p className="text-white font-bold text-xl">
                        {remainingTime !== null ? formatTime(remainingTime) : routeInfo.duration}
                      </p>
                      <p className="text-slate-400 text-sm">{routeInfo.distance}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs uppercase">Temps écoulé</p>
                    <p className="text-[#FF6B00] font-bold text-2xl font-mono">{formatTime(elapsedTime)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Course Panel */}
            {currentCourse && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#0F2240] rounded-t-3xl p-6 z-10 shadow-2xl border-t border-[#1A3358]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-slate-400 text-sm">
                      {currentCourse.status === 'assigned' ? '🚗 En route vers le client' : '🏁 En course'}
                    </p>
                    <p className="text-white font-bold">{currentCourse.commande_no}</p>
                  </div>
                  {/* Chrono temps réel */}
                  <div className="flex items-center gap-3">
                    <div className="bg-[#FF6B00]/20 px-4 py-2 rounded-lg">
                      <p className="text-[#FF6B00] font-mono font-bold text-lg">{formatTime(elapsedTime)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      currentCourse.status === 'in_progress' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {currentCourse.status === 'in_progress' ? 'En course' : 'Vers client'}
                    </span>
                  </div>
                </div>
                
                {/* Route info compact */}
                {routeInfo && (
                  <div className="flex items-center justify-between mb-4 bg-[#0A1628] rounded-lg p-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-slate-500 text-xs">RESTANT</p>
                        <p className="text-white font-bold">{remainingTime !== null ? formatTime(remainingTime) : routeInfo.duration}</p>
                      </div>
                      <div className="w-px h-8 bg-[#1A3358]" />
                      <div>
                        <p className="text-slate-500 text-xs">DISTANCE</p>
                        <p className="text-white font-bold">{routeInfo.distance}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">ETA</p>
                      <p className="text-[#FF6B00] font-bold text-xl">{routeInfo.eta}</p>
                    </div>
                  </div>
                )}
                
                {/* Route visualization */}
                <div className="bg-[#0A1628] rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <div className="w-0.5 h-8 bg-[#1A3358]/50" />
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-slate-500 text-xs">PRISE EN CHARGE</p>
                        <p className="text-white text-sm">{currentCourse.pickup_address}</p>
                        <p className="text-blue-400 text-xs font-bold">👤 {currentCourse.client_nom}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">DESTINATION</p>
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
                        <p className="text-slate-400 text-xs">{routeInfo.distance}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">ETA</p>
                      <p className="text-white font-bold text-lg">{routeInfo.eta}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400">{currentCourse.distance_km?.toFixed(1)} km</span>
                  <span className="text-[#FF6B00] font-bold text-xl">{currentCourse.prix_estime?.toFixed(2)}€</span>
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
              <div className="absolute bottom-0 left-0 right-0 bg-[#0F2240] rounded-t-3xl p-6 z-10">
                <div className="text-center py-4">
                  <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">En attente d'une course...</p>
                </div>
              </div>
            )}

            {/* Offline message */}
            {!isOnline && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#0F2240] rounded-t-3xl p-6 z-10">
                <div className="text-center py-4">
                  <Power className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Vous êtes hors service</p>
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
                  className={commandeFilter === filter ? 'btn-taxi' : 'border-[#1A3358] text-white'}
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
                    <div className="h-4 bg-[#1A3358] rounded w-3/4 mb-2" />
                    <div className="h-4 bg-[#1A3358] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : commandes.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune commande</p>
              </div>
            ) : (
              <div className="space-y-4">
                {commandes.map((commande) => (
                  <div key={commande.id} className="card-taxi p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-bold">{commande.commande_no}</p>
                        <p className="text-slate-400 text-sm">{commande.client_nom}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        commande.status === 'completed' ? 'badge-success' : 'badge-info'
                      }`}>
                        {commande.status === 'completed' ? 'Terminée' : 'Assignée'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#1A3358]">
                      <span className="text-slate-400 text-sm">
                        {new Date(commande.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-[#FF6B00] font-bold">{commande.prix?.toFixed(2)}€</span>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Mes revenus</h2>
              {revenus && (
                <Button 
                  className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-black font-bold flex items-center gap-2"
                  onClick={exportRevenusPDF}
                  data-testid="export-pdf-btn"
                >
                  <Download className="w-4 h-4" />
                  Télécharger PDF
                </Button>
              )}
            </div>
            
            {!revenus ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <Button className="btn-taxi" onClick={fetchRevenus}>Charger les revenus</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Export Banner */}
                <div className="bg-gradient-to-r from-[#FF6B00]/20 to-transparent border border-[#FF6B00]/30 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-[#FF6B00]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">Export Comptabilité</p>
                    <p className="text-slate-400 text-sm">Téléchargez vos revenus en PDF pour votre comptable</p>
                  </div>
                  <Button 
                    variant="outline"
                    className="border-[#FFD700] text-[#FF6B00] hover:bg-[#FF6B00]/10"
                    onClick={exportRevenusPDF}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
                
                <div className="card-taxi p-6 border-[#FF6B00]/30">
                  <p className="text-slate-400 text-sm">Revenus brut (30 jours)</p>
                  <p className="text-[#FF6B00] text-4xl font-black">{revenus.revenus_brut_30j?.toFixed(2)}€</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="card-taxi p-4">
                    <p className="text-slate-400 text-sm">Net</p>
                    <p className="text-white text-2xl font-bold">{revenus.revenus_net_30j?.toFixed(2)}€</p>
                  </div>
                  <div className="card-taxi p-4">
                    <p className="text-slate-400 text-sm">Commission TaxiG</p>
                    <p className="text-red-400 text-2xl font-bold">-{revenus.commission_due?.toFixed(2)}€</p>
                  </div>
                </div>
                
                <div className="card-taxi p-4">
                  <p className="text-slate-400 text-sm">Nombre de courses</p>
                  <p className="text-white text-2xl font-bold">{revenus.nombre_courses_30j}</p>
                </div>
                
                {/* Courses detail list */}
                {revenusDetails.length > 0 && (
                  <div className="card-taxi p-4">
                    <p className="text-slate-400 text-sm mb-4">Dernières courses complétées</p>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {revenusDetails.slice(0, 10).map((course) => (
                        <div key={course.id} className="flex justify-between items-center py-2 border-b border-[#1A3358]/50 last:border-0">
                          <div>
                            <p className="text-white text-sm font-medium">{course.commande_no}</p>
                            <p className="text-slate-500 text-xs">{new Date(course.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <p className="text-[#FF6B00] font-bold">{course.prix?.toFixed(2)}€</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="p-6 overflow-y-auto h-full">
            <h2 className="text-2xl font-bold text-white mb-2">Calendrier</h2>
            <p className="text-slate-400 mb-6">Indiquez vos indisponibilités</p>
            
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

        {/* Documents View */}
        {view === 'documents' && (
          <div className="p-6 overflow-y-auto h-full" data-testid="documents-view">
            <h2 className="text-2xl font-bold text-white mb-2">Mes documents</h2>
            <p className="text-slate-400 mb-6">Envoyez vos documents pour vérification</p>
            
            <div className="space-y-4">
              {[
                { key: 'permis_conduire', label: 'Permis de conduire' },
                { key: 'permis_sejour', label: 'Permis de séjour' },
                { key: 'piece_identite', label: "Pièce d'identité" }
              ].map(docType => {
                const existing = documents.find(d => d.document_type === docType.key);
                return (
                  <div key={docType.key} className="card-taxi p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-bold">{docType.label}</p>
                        {existing && (
                          <p className="text-slate-400 text-xs mt-1">
                            {existing.original_name} - {(existing.file_size / 1024).toFixed(0)} Ko
                          </p>
                        )}
                      </div>
                      {existing ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          existing.status === 'approved' ? 'badge-success' :
                          existing.status === 'rejected' ? 'badge-error' :
                          'badge-warning'
                        }`} data-testid={`doc-status-${docType.key}`}>
                          {existing.status === 'approved' ? 'Validé' :
                           existing.status === 'rejected' ? 'Refusé' : 'En attente'}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">Non envoyé</span>
                      )}
                    </div>
                    <label className="block">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleUploadDocument(e, docType.key)}
                        className="hidden"
                        data-testid={`upload-${docType.key}`}
                      />
                      <div className="flex items-center gap-2 cursor-pointer btn-taxi px-4 py-3 text-center justify-center text-sm">
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {existing ? 'Remplacer' : 'Envoyer'}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Incoming Course Dialog */}
      <Dialog open={showIncomingDialog} onOpenChange={setShowIncomingDialog}>
        <DialogContent className="bg-[#0F2240] border-[#1A3358] max-w-sm mx-4 incoming-call-animation">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-2xl">Nouvelle course !</DialogTitle>
            <DialogDescription className="text-slate-400 text-center">
              Un client vous demande
            </DialogDescription>
          </DialogHeader>
          
          {incomingRequest && (
            <div className="py-6">
              <div className="text-center mb-6">
                <p className="text-[#FF6B00] text-4xl font-black">{incomingRequest.prix_estime?.toFixed(2)}&euro;</p>
                <p className="text-slate-400 text-sm">{incomingRequest.commande_no}</p>
              </div>
              
              <div className="space-y-3 mb-6 bg-[#0A1628] p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-white text-sm">{incomingRequest.pickup_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-white text-sm">{incomingRequest.destination_address}</span>
                </div>
              </div>
              
              <p className="text-slate-400 text-center text-sm mb-6">
                <span className="text-white font-bold">{incomingRequest.client_nom}</span>
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
                  className="flex-1 h-14 btn-taxi"
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

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent className="bg-[#0F2240] border-[#1A3358] max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-xl">Noter le client</DialogTitle>
            <DialogDescription className="text-slate-400 text-center">
              Comment s'est passée la course ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center gap-2 mb-6" data-testid="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  className="transition-transform hover:scale-125"
                  data-testid={`rate-star-${star}`}
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (ratingHover || ratingStars)
                        ? 'fill-[#FF6B00] text-[#FF6B00]'
                        : 'text-slate-600'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Commentaire (optionnel)"
              className="w-full h-20 bg-[#0A1628] border border-[#1A3358] rounded-lg p-3 text-white placeholder:text-slate-500 text-sm resize-none focus:border-[#FF6B00] focus:outline-none"
              data-testid="rating-comment"
            />
            <div className="flex gap-3 mt-4">
              <Button
                variant="ghost"
                className="flex-1 text-slate-400"
                onClick={() => setShowRatingDialog(false)}
              >
                Passer
              </Button>
              <Button
                className="flex-1 btn-taxi"
                onClick={handleSubmitRating}
                disabled={ratingStars === 0}
                data-testid="submit-rating-btn"
              >
                <Star className="w-4 h-4 mr-2" />
                Noter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChauffeurDashboard;
