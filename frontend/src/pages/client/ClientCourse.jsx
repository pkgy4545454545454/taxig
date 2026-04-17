import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Phone, MessageSquare, X, Clock, Car, MapPin, CheckCircle2, XCircle, Star } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { courseApi, paymentApi } from '../../lib/api';
import 'leaflet/dist/leaflet.css';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

// Custom icons
const taxiIcon = new L.DivIcon({
  className: 'taxi-marker',
  html: `<div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
    <svg viewBox="0 0 24 24" width="36" height="36" fill="#FF6B00" stroke="#000" stroke-width="1">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const pickupIcon = new L.DivIcon({
  className: 'pickup-marker',
  html: `<div style="width: 24px; height: 24px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const destIcon = new L.DivIcon({
  className: 'dest-marker',
  html: `<div style="width: 24px; height: 24px; background: #22C55E; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map bounds fitter
const FitBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

const ClientCourse = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  
  // Rating state
  const [showRating, setShowRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [hasRated, setHasRated] = useState(false);

  // Check payment status on mount
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paymentStatus = searchParams.get('payment');
    
    if (sessionId && paymentStatus === 'success') {
      pollPaymentStatus(sessionId);
    }
  }, [searchParams]);

  // Poll payment status
  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    if (attempts >= 5) {
      toast.error('Vérification du paiement expirée. Veuillez vérifier votre email.');
      return;
    }

    try {
      const response = await paymentApi.getStatus(sessionId);
      if (response.data.payment_status === 'paid') {
        toast.success('Paiement confirmé ! Votre chauffeur arrive.');
        fetchCourse();
      } else {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
      }
    } catch (error) {
      console.error('Payment status error:', error);
    }
  };

  // Fetch course details
  const fetchCourse = async () => {
    try {
      const response = await courseApi.get(courseId);
      setCourse(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement de la course');
      navigate('/client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    const interval = setInterval(fetchCourse, 5000);
    return () => clearInterval(interval);
  }, [courseId]);

  // Check if already rated and show dialog if completed
  useEffect(() => {
    if (course?.status === 'completed' && !hasRated) {
      courseApi.getRating(courseId).then(res => {
        if (res.data.rating) {
          setHasRated(true);
        } else {
          setShowRating(true);
        }
      }).catch(() => {});
    }
  }, [course?.status, courseId, hasRated]);

  const handleSubmitRating = async () => {
    if (ratingStars === 0) {
      toast.error('Sélectionnez une note');
      return;
    }
    try {
      await courseApi.rate(courseId, { stars: ratingStars, comment: ratingComment || null });
      toast.success('Merci pour votre note !');
      setHasRated(true);
      setShowRating(false);
    } catch (error) {
      if (error.response?.data?.detail === 'Vous avez déjà noté cette course') {
        setHasRated(true);
      } else {
        toast.error('Erreur');
      }
      setShowRating(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette course ?')) return;
    
    setCancelling(true);
    try {
      await courseApi.cancel(courseId);
      toast.success('Course annulée');
      navigate('/client');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Impossible d\'annuler la course');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusInfo = () => {
    switch (course?.status) {
      case 'pending':
        return { text: 'Recherche d\'un chauffeur...', color: 'text-[#FF6B00]', icon: Clock };
      case 'assigned':
        return { text: 'Chauffeur en route', color: 'text-blue-400', icon: Car };
      case 'in_progress':
        return { text: 'Course en cours', color: 'text-green-400', icon: MapPin };
      case 'completed':
        return { text: 'Vous êtes arrivé !', color: 'text-green-400', icon: CheckCircle2 };
      case 'cancelled':
        return { text: 'Course annulée', color: 'text-red-400', icon: XCircle };
      default:
        return { text: 'Statut inconnu', color: 'text-slate-400', icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="animate-pulse">
          <img src={LOGO_URL} alt="TaxiG" className="h-20 opacity-50" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen bg-[#0A1628] flex flex-col items-center justify-center p-6">
        <p className="text-slate-400 mb-4">Course non trouvée</p>
        <Button className="btn-taxi" onClick={() => navigate('/client')}>
          Retour
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  
  const bounds = [
    [course.pickup_lat, course.pickup_lng],
    [course.destination_lat, course.destination_lng]
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0A1628]">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-[#0A1628] border-b border-[#1A3358] z-20">
        <Button 
          variant="ghost" 
          size="icon"
          className="text-white"
          onClick={() => navigate('/client')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <p className="text-white font-bold">{course.commande_no}</p>
          <p className={`text-sm flex items-center gap-1 justify-center ${statusInfo.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusInfo.text}
          </p>
        </div>
        <div className="w-10" />
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer 
          center={[course.pickup_lat, course.pickup_lng]}
          zoom={14}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <FitBounds bounds={bounds} />
          
          {/* Pickup marker */}
          <Marker position={[course.pickup_lat, course.pickup_lng]} icon={pickupIcon} />
          
          {/* Destination marker */}
          <Marker position={[course.destination_lat, course.destination_lng]} icon={destIcon} />
          
          {/* Route line */}
          <Polyline 
            positions={bounds}
            color="#FF6B00"
            weight={4}
            dashArray="10, 10"
          />
          
          {/* Chauffeur position */}
          {course.chauffeur_position && (
            <Marker 
              position={[course.chauffeur_position.lat, course.chauffeur_position.lng]}
              icon={taxiIcon}
            />
          )}
        </MapContainer>
      </div>

      {/* Course Details Panel */}
      <div className="bg-[#0F2240] rounded-t-3xl p-6 shadow-2xl border-t border-[#1A3358]">
        {/* Chauffeur info */}
        {course.chauffeur_nom && (
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1A3358]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FF6B00] rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-bold">{course.chauffeur_nom}</p>
                <p className="text-slate-400 text-sm">Votre chauffeur</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-white hover:text-[#FF6B00]">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:text-[#FF6B00]">
                <MessageSquare className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Route info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 mt-1.5 bg-blue-500 rounded-full flex-shrink-0" />
            <div>
              <p className="text-slate-400 text-xs">DÉPART</p>
              <p className="text-white">{course.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 mt-1.5 bg-green-500 rounded-full flex-shrink-0" />
            <div>
              <p className="text-slate-400 text-xs">ARRIVÉE</p>
              <p className="text-white">{course.destination_address}</p>
            </div>
          </div>
        </div>

        {/* Price & details */}
        <div className="flex justify-between items-center mb-6 p-4 bg-[#0A1628] rounded-lg">
          <div>
            <p className="text-slate-400 text-sm">{course.distance_km?.toFixed(1)} km • ~{Math.round(course.duration_minutes)} min</p>
            <p className="text-slate-400 text-sm">
              Paiement: {course.payment_method === 'cash' ? 'Espèces' : 'Carte'} 
              {course.payment_status === 'paid' && <span className="text-green-400 ml-2">✓ Payé</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">PRIX</p>
            <p className="text-[#FF6B00] text-2xl font-black">
              {(course.prix_final || course.prix_estime)?.toFixed(2)}€
            </p>
          </div>
        </div>

        {/* Actions */}
        {['pending', 'assigned'].includes(course.status) && (
          <Button 
            variant="ghost"
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={handleCancel}
            disabled={cancelling}
            data-testid="cancel-course-btn"
          >
            <X className="w-5 h-5 mr-2" />
            {cancelling ? 'Annulation...' : 'Annuler la course'}
          </Button>
        )}

        {course.status === 'completed' && (
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Vous êtes arrivé !</h2>
            <p className="text-slate-400">Merci d'avoir voyagé avec TaxiG</p>
            <div className="mt-4 p-4 bg-[#0A1628] rounded-lg">
              <p className="text-slate-400 text-sm">Prix final</p>
              <p className="text-[#FF6B00] text-3xl font-black">{course.prix_final?.toFixed(2)}€</p>
            </div>
          </div>
        )}

        {course.status === 'completed' && (
          <Button 
            className="btn-taxi w-full"
            onClick={() => navigate('/client')}
            data-testid="new-course-btn"
          >
            Commander une nouvelle course
          </Button>
        )}
      </div>

      {/* Rating Dialog */}
      <Dialog open={showRating} onOpenChange={setShowRating}>
        <DialogContent className="bg-[#0F2240] border-[#1A3358] max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-xl">Noter votre chauffeur</DialogTitle>
            <DialogDescription className="text-slate-400 text-center">
              {course?.chauffeur_nom}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-center gap-2 mb-6" data-testid="client-rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  className="transition-transform hover:scale-125"
                  data-testid={`client-rate-star-${star}`}
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
              data-testid="client-rating-comment"
            />
            <div className="flex gap-3 mt-4">
              <Button variant="ghost" className="flex-1 text-slate-400" onClick={() => setShowRating(false)}>
                Passer
              </Button>
              <Button
                className="flex-1 btn-taxi"
                onClick={handleSubmitRating}
                disabled={ratingStars === 0}
                data-testid="client-submit-rating-btn"
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

export default ClientCourse;
