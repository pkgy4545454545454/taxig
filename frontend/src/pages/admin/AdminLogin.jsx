import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { adminApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = isRegister 
        ? await adminApi.register(formData)
        : await adminApi.login(formData);
      
      login(response.data.access_token, { 
        ...response.data.user, 
        type: 'admin' 
      });
      toast.success(isRegister ? 'Compte admin créé !' : 'Connexion réussie !');
      navigate('/admin');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-gradient flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-20 right-10 w-80 h-80 bg-orange-500/10 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-10 left-10 w-64 h-64 bg-navy-600/30 rounded-full blur-[80px]" />
      
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

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md animate-scaleIn">
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="TaxiG" className="h-20 mx-auto mb-6 drop-shadow-lg" />
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl mb-4 animate-glow">
              <Shield className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Administration</h1>
            <p className="text-slate-400">Accès réservé aux administrateurs</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">Nom d'utilisateur</Label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  className="h-14 bg-navy-800/60 backdrop-blur-sm border-2 border-navy-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl font-medium placeholder:text-slate-500 text-white pl-12 transition-all duration-300"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  data-testid="username-input"
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
                  className="h-14 bg-navy-800/60 backdrop-blur-sm border-2 border-navy-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl font-medium placeholder:text-slate-500 text-white pl-12 transition-all duration-300"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="btn-taxi w-full h-14 text-lg"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Connexion...' : isRegister ? 'Créer le compte' : 'Se connecter'}
            </Button>
          </form>

          <p className="text-center mt-6 text-slate-400">
            {isRegister ? 'Déjà un compte ?' : 'Premier admin ?'}{' '}
            <button 
              onClick={() => setIsRegister(!isRegister)} 
              className="text-orange-400 hover:text-orange-300 hover:underline transition-colors"
              data-testid="toggle-register"
            >
              {isRegister ? 'Se connecter' : 'Créer un compte'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
