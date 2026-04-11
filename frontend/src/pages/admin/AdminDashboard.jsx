import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, LogOut, Users, Car, DollarSign, BarChart3, 
  Clock, Plus, Trash2, FileText, Filter, ChevronRight,
  AlertCircle, CheckCircle, XCircle, Search, TrendingUp
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import { adminApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // Chauffeurs
  const [chauffeurs, setChauffeurs] = useState([]);
  const [showAddChauffeur, setShowAddChauffeur] = useState(false);
  const [newChauffeur, setNewChauffeur] = useState({
    nom: '', prenom: '', email: '', code_chauffeur: '', password: ''
  });
  
  // Clients
  const [clients, setClients] = useState([]);
  
  // Courses
  const [courses, setCourses] = useState([]);
  const [courseFilter, setCourseFilter] = useState({ status: '', date_from: '', date_to: '' });
  
  // Revenus
  const [revenus, setRevenus] = useState(null);
  const [revenuPeriod, setRevenuPeriod] = useState('30d');
  
  // Rapport dialog
  const [showRapportDialog, setShowRapportDialog] = useState(false);
  const [selectedChauffeur, setSelectedChauffeur] = useState(null);
  const [rapportText, setRapportText] = useState('');

  // Fetch dashboard data
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Fetch chauffeurs
  const fetchChauffeurs = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getChauffeurs();
      setChauffeurs(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Fetch clients
  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getClients();
      setClients(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  // Fetch courses
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getCourses(courseFilter);
      setCourses(response.data);
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
      const response = await adminApi.getRevenus(revenuPeriod);
      setRevenus(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Add chauffeur
  const handleAddChauffeur = async () => {
    if (!newChauffeur.nom || !newChauffeur.prenom || !newChauffeur.email || !newChauffeur.code_chauffeur || !newChauffeur.password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    setLoading(true);
    try {
      await adminApi.addChauffeur(newChauffeur);
      toast.success('Chauffeur ajouté !');
      setShowAddChauffeur(false);
      setNewChauffeur({ nom: '', prenom: '', email: '', code_chauffeur: '', password: '' });
      fetchChauffeurs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  // Delete chauffeur
  const handleDeleteChauffeur = async (chauffeurId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce chauffeur ?')) return;
    
    try {
      await adminApi.deleteChauffeur(chauffeurId);
      toast.success('Chauffeur supprimé');
      fetchChauffeurs();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Add rapport
  const handleAddRapport = async () => {
    if (!rapportText.trim()) {
      toast.error('Veuillez entrer un rapport');
      return;
    }
    
    try {
      await adminApi.addRapport(selectedChauffeur.id, rapportText);
      toast.success('Rapport ajouté');
      setShowRapportDialog(false);
      setRapportText('');
      setSelectedChauffeur(null);
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setMenuOpen(false);
    if (newView === 'chauffeurs') fetchChauffeurs();
    if (newView === 'clients') fetchClients();
    if (newView === 'courses') fetchCourses();
    if (newView === 'revenus') fetchRevenus();
    if (newView === 'dashboard') fetchDashboard();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const inputClass = "h-12 bg-navy-800/60 backdrop-blur-sm border-2 border-navy-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl font-medium placeholder:text-slate-500 text-white transition-all duration-300";

  return (
    <div className="min-h-screen bg-navy-gradient">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-navy-800/80 backdrop-blur-xl border-b border-navy-700/50 sticky top-0 z-20 animate-slideDown">
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
                <span className="text-orange-400">Admin</span>
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 space-y-2">
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'dashboard' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('dashboard')}
                data-testid="menu-dashboard"
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Tableau de bord
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'chauffeurs' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('chauffeurs')}
                data-testid="menu-chauffeurs"
              >
                <Car className="w-5 h-5 mr-3" />
                Chauffeurs
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'clients' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('clients')}
                data-testid="menu-clients"
              >
                <Users className="w-5 h-5 mr-3" />
                Clients
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'courses' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('courses')}
                data-testid="menu-courses"
              >
                <Clock className="w-5 h-5 mr-3" />
                Courses
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start rounded-xl transition-all duration-300 ${view === 'revenus' ? 'text-orange-400 bg-orange-500/10' : 'text-white hover:text-orange-400 hover:bg-white/5'}`}
                onClick={() => handleViewChange('revenus')}
                data-testid="menu-revenus"
              >
                <DollarSign className="w-5 h-5 mr-3" />
                Revenus
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
      <main className="p-6 animate-fadeIn">
        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Tableau de bord</h1>
            
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-navy-700 rounded w-1/2 mb-2" />
                    <div className="h-8 bg-navy-700 rounded" />
                  </div>
                ))}
              </div>
            ) : dashboardData && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card-taxi p-5 animate-slideUp stagger-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Car className="w-4 h-4" />
                      <span className="text-sm">Chauffeurs</span>
                    </div>
                    <p className="text-white text-3xl font-black">{dashboardData.stats.total_chauffeurs}</p>
                    <p className="text-emerald-400 text-sm flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      {dashboardData.stats.active_chauffeurs} en ligne
                    </p>
                  </div>
                  <div className="card-taxi p-5 animate-slideUp stagger-2">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Clients</span>
                    </div>
                    <p className="text-white text-3xl font-black">{dashboardData.stats.total_clients}</p>
                  </div>
                  <div className="card-taxi p-5 animate-slideUp stagger-3">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Courses</span>
                    </div>
                    <p className="text-white text-3xl font-black">{dashboardData.stats.total_courses}</p>
                    <p className="text-slate-400 text-sm">{dashboardData.stats.completed_courses} terminées</p>
                  </div>
                  <div className="card-taxi p-5 border-orange-500/30 animate-slideUp stagger-4">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Revenus totaux</span>
                    </div>
                    <p className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent text-3xl font-black">{dashboardData.stats.total_revenue?.toFixed(2)}€</p>
                    <p className="text-emerald-400 text-sm flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +{dashboardData.stats.commission_total?.toFixed(2)}€ commission
                    </p>
                  </div>
                </div>

                {/* Recent pointages */}
                <div className="card-taxi p-6 animate-slideUp" style={{ animationDelay: '0.5s' }}>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-400" />
                    Activité récente des chauffeurs
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {dashboardData.recent_pointages?.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">Aucune activité récente</p>
                    ) : (
                      dashboardData.recent_pointages?.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-navy-900/50 rounded-xl border border-navy-700/50 hover:border-orange-500/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${p.action === 'start' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className="text-white font-medium">{p.chauffeur_nom}</span>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm ${p.action === 'start' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {p.action === 'start' ? 'A commencé le service' : 'A terminé le service'}
                            </p>
                            <p className="text-slate-500 text-xs">
                              {new Date(p.timestamp).toLocaleString('fr-FR', { 
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chauffeurs View */}
        {view === 'chauffeurs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-white">Chauffeurs</h1>
              <Button 
                className="btn-taxi"
                onClick={() => setShowAddChauffeur(true)}
                data-testid="add-chauffeur-btn"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter
              </Button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-navy-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : chauffeurs.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-16 h-16 text-navy-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucun chauffeur enregistré</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-navy-700/50">
                      <TableHead className="text-slate-400">Chauffeur</TableHead>
                      <TableHead className="text-slate-400">Code</TableHead>
                      <TableHead className="text-slate-400">Statut</TableHead>
                      <TableHead className="text-slate-400">Courses</TableHead>
                      <TableHead className="text-slate-400">Revenus 30j</TableHead>
                      <TableHead className="text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chauffeurs.map((chauffeur, index) => (
                      <TableRow 
                        key={chauffeur.id} 
                        className="border-navy-700/50 hover:bg-navy-800/50 transition-colors animate-slideUp"
                        style={{ animationDelay: `${index * 0.05}s` }}
                        data-testid={`chauffeur-row-${chauffeur.id}`}
                      >
                        <TableCell className="text-white">
                          <div>
                            <p className="font-medium">{chauffeur.prenom} {chauffeur.nom}</p>
                            <p className="text-slate-400 text-sm">{chauffeur.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-mono">{chauffeur.code_chauffeur}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            chauffeur.is_online ? 'badge-success' : 'badge-error'
                          }`}>
                            {chauffeur.is_online ? 'En ligne' : 'Hors ligne'}
                          </span>
                        </TableCell>
                        <TableCell className="text-white">{chauffeur.nombre_courses}</TableCell>
                        <TableCell className="text-orange-400 font-bold">
                          {chauffeur.revenus?.revenus_brut_30j?.toFixed(2) || '0.00'}€
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl"
                              onClick={() => {
                                setSelectedChauffeur(chauffeur);
                                setShowRapportDialog(true);
                              }}
                              data-testid={`rapport-btn-${chauffeur.id}`}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                              onClick={() => handleDeleteChauffeur(chauffeur.id)}
                              data-testid={`delete-btn-${chauffeur.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Clients View */}
        {view === 'clients' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Clients</h1>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-navy-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-navy-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucun client enregistré</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-navy-700/50">
                      <TableHead className="text-slate-400">Client</TableHead>
                      <TableHead className="text-slate-400">Email</TableHead>
                      <TableHead className="text-slate-400">Mode paiement</TableHead>
                      <TableHead className="text-slate-400">Courses</TableHead>
                      <TableHead className="text-slate-400">Inscrit le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client, index) => (
                      <TableRow 
                        key={client.id} 
                        className="border-navy-700/50 hover:bg-navy-800/50 transition-colors animate-slideUp"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <TableCell className="text-white font-medium">
                          {client.prenom} {client.nom}
                        </TableCell>
                        <TableCell className="text-slate-400">{client.email}</TableCell>
                        <TableCell className="text-white capitalize">{client.mode_paiement}</TableCell>
                        <TableCell className="text-white">{client.nombre_courses || 0}</TableCell>
                        <TableCell className="text-slate-400">
                          {new Date(client.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Courses View */}
        {view === 'courses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-white">Courses</h1>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <Select 
                value={courseFilter.status || "all"} 
                onValueChange={(v) => setCourseFilter({ ...courseFilter, status: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-40 bg-navy-800/60 border-navy-700 text-white rounded-xl">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-navy-800 border-navy-700">
                  <SelectItem value="all" className="text-white">Tous</SelectItem>
                  <SelectItem value="pending" className="text-white">En attente</SelectItem>
                  <SelectItem value="assigned" className="text-white">Assignée</SelectItem>
                  <SelectItem value="in_progress" className="text-white">En cours</SelectItem>
                  <SelectItem value="completed" className="text-white">Terminée</SelectItem>
                  <SelectItem value="cancelled" className="text-white">Annulée</SelectItem>
                </SelectContent>
              </Select>
              <Button className="btn-secondary" onClick={fetchCourses} data-testid="filter-courses-btn">
                <Filter className="w-4 h-4 mr-2" />
                Filtrer
              </Button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-4 bg-navy-700 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-navy-600 mx-auto mb-4" />
                <p className="text-slate-400">Aucune course</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course, index) => (
                  <div 
                    key={course.id} 
                    className="card-taxi p-4 animate-slideUp"
                    style={{ animationDelay: `${index * 0.05}s` }}
                    data-testid={`course-${course.id}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-bold">{course.commande_no}</p>
                        <p className="text-slate-400 text-sm">
                          {new Date(course.created_at).toLocaleString('fr-FR')}
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
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Client</p>
                        <p className="text-white">{course.client_nom}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Chauffeur</p>
                        <p className="text-white">{course.chauffeur_nom || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">De</p>
                        <p className="text-white">{course.pickup_address}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">À</p>
                        <p className="text-white">{course.destination_address}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-navy-700/50">
                      <span className="text-slate-400">{course.distance_km?.toFixed(1)} km • {course.payment_method}</span>
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

        {/* Revenus View */}
        {view === 'revenus' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-white">Revenus</h1>
              <Select value={revenuPeriod} onValueChange={(v) => { setRevenuPeriod(v); }}>
                <SelectTrigger className="w-40 bg-navy-800/60 border-navy-700 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-navy-800 border-navy-700">
                  <SelectItem value="7d" className="text-white">7 jours</SelectItem>
                  <SelectItem value="30d" className="text-white">30 jours</SelectItem>
                  <SelectItem value="365d" className="text-white">1 an</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="btn-taxi" onClick={fetchRevenus} data-testid="load-revenus-btn">
              Charger les données
            </Button>

            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="card-taxi p-4 animate-pulse">
                    <div className="h-8 bg-navy-700 rounded" />
                  </div>
                ))}
              </div>
            ) : revenus && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="card-taxi p-6 border-orange-500/30 animate-slideUp">
                    <p className="text-slate-400 text-sm">Revenus totaux</p>
                    <p className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent text-4xl font-black">{revenus.total_revenue?.toFixed(2)}€</p>
                  </div>
                  <div className="card-taxi p-6 animate-slideUp stagger-1">
                    <p className="text-slate-400 text-sm">Commission TaxiG</p>
                    <p className="text-emerald-400 text-4xl font-black">{revenus.total_commission?.toFixed(2)}€</p>
                  </div>
                  <div className="card-taxi p-6 animate-slideUp stagger-2">
                    <p className="text-slate-400 text-sm">Nombre de courses</p>
                    <p className="text-white text-4xl font-black">{revenus.number_of_courses}</p>
                  </div>
                </div>

                {/* Daily breakdown */}
                {revenus.daily_breakdown && Object.keys(revenus.daily_breakdown).length > 0 && (
                  <div className="card-taxi p-6 animate-slideUp" style={{ animationDelay: '0.3s' }}>
                    <h3 className="text-white font-bold mb-4">Revenus par jour</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {Object.entries(revenus.daily_breakdown)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([date, amount]) => (
                          <div key={date} className="flex justify-between items-center p-3 bg-navy-900/50 rounded-xl border border-navy-700/50 hover:border-orange-500/30 transition-colors">
                            <span className="text-slate-400">
                              {new Date(date).toLocaleDateString('fr-FR', { 
                                weekday: 'short', day: 'numeric', month: 'short' 
                              })}
                            </span>
                            <span className="text-white font-bold">{amount.toFixed(2)}€</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Add Chauffeur Dialog */}
      <Dialog open={showAddChauffeur} onOpenChange={setShowAddChauffeur}>
        <DialogContent className="bg-navy-800/95 backdrop-blur-xl border-navy-700 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Ajouter un chauffeur</DialogTitle>
            <DialogDescription className="text-slate-400">
              Remplissez les informations du nouveau chauffeur
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Prénom</Label>
                <Input
                  className={inputClass}
                  value={newChauffeur.prenom}
                  onChange={(e) => setNewChauffeur({ ...newChauffeur, prenom: e.target.value })}
                  data-testid="new-chauffeur-prenom"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Nom</Label>
                <Input
                  className={inputClass}
                  value={newChauffeur.nom}
                  onChange={(e) => setNewChauffeur({ ...newChauffeur, nom: e.target.value })}
                  data-testid="new-chauffeur-nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                className={inputClass}
                value={newChauffeur.email}
                onChange={(e) => setNewChauffeur({ ...newChauffeur, email: e.target.value })}
                data-testid="new-chauffeur-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Code Chauffeur</Label>
              <Input
                className={`${inputClass} uppercase`}
                value={newChauffeur.code_chauffeur}
                onChange={(e) => setNewChauffeur({ ...newChauffeur, code_chauffeur: e.target.value.toUpperCase() })}
                placeholder="Ex: TAXI001"
                data-testid="new-chauffeur-code"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Mot de passe</Label>
              <Input
                type="password"
                className={inputClass}
                value={newChauffeur.password}
                onChange={(e) => setNewChauffeur({ ...newChauffeur, password: e.target.value })}
                data-testid="new-chauffeur-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddChauffeur(false)} className="text-white hover:text-orange-400 hover:bg-white/5 rounded-xl">
              Annuler
            </Button>
            <Button className="btn-taxi" onClick={handleAddChauffeur} disabled={loading} data-testid="confirm-add-chauffeur">
              {loading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rapport Dialog */}
      <Dialog open={showRapportDialog} onOpenChange={setShowRapportDialog}>
        <DialogContent className="bg-navy-800/95 backdrop-blur-xl border-navy-700 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Ajouter un rapport</DialogTitle>
            <DialogDescription className="text-slate-400">
              Rapport pour {selectedChauffeur?.prenom} {selectedChauffeur?.nom}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              className={`${inputClass} min-h-32`}
              placeholder="Entrez votre rapport..."
              value={rapportText}
              onChange={(e) => setRapportText(e.target.value)}
              data-testid="rapport-textarea"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRapportDialog(false)} className="text-white hover:text-orange-400 hover:bg-white/5 rounded-xl">
              Annuler
            </Button>
            <Button className="btn-taxi" onClick={handleAddRapport} data-testid="confirm-rapport">
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
