import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, CreditCard, ArrowLeft } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button 
          variant="ghost" 
          className="text-white hover:text-[#FFD700]"
          onClick={() => navigate('/')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Button>
      </header>

      {/* Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="TaxiG" className="h-20 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-2">Créer un compte</h1>
            <p className="text-zinc-400">Rejoignez TaxiG en quelques secondes</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom" className="text-white">Prénom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    id="prenom"
                    type="text"
                    placeholder="Jean"
                    className="input-taxi pl-10"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    data-testid="prenom-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom" className="text-white">Nom</Label>
                <Input
                  id="nom"
                  type="text"
                  placeholder="Dupont"
                  className="input-taxi"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                  data-testid="nom-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className="input-taxi pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="input-taxi pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  data-testid="password-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="input-taxi pl-10"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  data-testid="confirm-password-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Mode de paiement préféré</Label>
              <Select 
                value={formData.mode_paiement} 
                onValueChange={(value) => setFormData({ ...formData, mode_paiement: value })}
              >
                <SelectTrigger className="input-taxi" data-testid="payment-method-select">
                  <CreditCard className="w-5 h-5 mr-2 text-zinc-500" />
                  <SelectValue placeholder="Choisir un mode de paiement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèces</SelectItem>
                  <SelectItem value="card">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="btn-taxi w-full h-12"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>
          </form>

          <p className="text-center mt-6 text-zinc-400">
            Déjà un compte ?{' '}
            <Link to="/client/login" className="text-[#FFD700] hover:underline" data-testid="login-link">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientRegister;
