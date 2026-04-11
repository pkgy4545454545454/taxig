import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, CreditCard, ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { clientApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

const ClientRegister = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
    mode_paiement: 'cash'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    setLoading(true);
    
    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await clientApi.register(registerData);
      login(response.data.access_token, { 
        ...response.data.user, 
        type: 'client' 
      });
      toast.success('Compte créé avec succès !');
      navigate('/client');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "h-14 bg-navy-800/60 backdrop-blur-sm border-2 border-navy-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl font-medium placeholder:text-slate-500 text-white pl-12 transition-all duration-300";

  return (
    <div className="min-h-screen bg-navy-gradient flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-navy-600/30 rounded-full blur-[100px]" />
      
      {/* Header */}
      <header className="p-4 relative z-10 animate-slideDown">
        <Button 
          variant="ghost" 
          className="text-slate-300 hover:text-orange-400 hover:bg-white/5 rounded-xl transition-all duration-300"
          onClick={() => navigate('/')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Button>
      </header>

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md animate-scaleIn">
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="TaxiG" className="h-16 mx-auto mb-4 drop-shadow-lg" />
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl mb-4">
              <UserPlus className="w-7 h-7 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Créer un compte</h1>
            <p className="text-slate-400">Rejoignez TaxiG en quelques secondes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom" className="text-slate-300">Prénom</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    id="prenom"
                    type="text"
                    placeholder="Jean"
                    className={inputClass}
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    data-testid="prenom-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom" className="text-slate-300">Nom</Label>
                <Input
                  id="nom"
                  type="text"
                  placeholder="Dupont"
                  className="h-14 bg-navy-800/60 backdrop-blur-sm border-2 border-navy-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl font-medium placeholder:text-slate-500 text-white px-4 transition-all duration-300"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  data-testid="nom-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className={inputClass}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="password-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  data-testid="confirm-password-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Mode de paiement préféré</Label>
              <Select 
                value={formData.mode_paiement} 
                onValueChange={(value) => setFormData({ ...formData, mode_paiement: value })}
              >
                <SelectTrigger className="h-14 bg-navy-800/60 backdrop-blur-sm border-2 border-navy-700 focus:border-orange-500 rounded-xl text-white" data-testid="payment-method-select">
                  <CreditCard className="w-5 h-5 mr-2 text-slate-500" />
                  <SelectValue placeholder="Choisir un mode de paiement" />
                </SelectTrigger>
                <SelectContent className="bg-navy-800 border-navy-700">
                  <SelectItem value="cash" className="text-white hover:bg-navy-700">Espèces</SelectItem>
                  <SelectItem value="card" className="text-white hover:bg-navy-700">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="btn-taxi w-full h-14 text-lg mt-6"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>
          </form>

          <p className="text-center mt-6 text-slate-400">
            Déjà un compte ?{' '}
            <Link to="/client/login" className="text-orange-400 hover:text-orange-300 hover:underline transition-colors" data-testid="login-link">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientRegister;
