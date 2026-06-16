import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { chauffeurApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

const ChauffeurLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code_chauffeur: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await chauffeurApi.login(formData);
      login(response.data.access_token, { 
        ...response.data.user, 
        type: 'chauffeur' 
      });
      toast.success('Connexion réussie !');
      navigate('/chauffeur');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion');
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

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="TaxiG" className="h-20 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-2">Espace Chauffeur</h1>
            <p className="text-zinc-400">Connectez-vous avec votre code chauffeur</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-white">Code Chauffeur</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="code"
                  type="text"
                  placeholder="Votre code chauffeur"
                  className="input-taxi pl-10 uppercase"
                  value={formData.code_chauffeur}
                  onChange={(e) => setFormData({ ...formData, code_chauffeur: e.target.value.toUpperCase() })}
                  required
                  data-testid="code-input"
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
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="btn-taxi w-full h-12"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-8 p-4 bg-[#18181B] rounded-lg border border-zinc-700">
            <p className="text-zinc-400 text-sm text-center">
              Vous n'avez pas de code chauffeur ?<br />
              Contactez l'administration TaxiG pour obtenir vos identifiants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChauffeurLogin;
