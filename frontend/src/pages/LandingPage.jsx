import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, User, Shield, MapPin, CreditCard, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MapPin,
      title: "Géolocalisation temps réel",
      description: "Suivez votre chauffeur en direct sur la carte"
    },
    {
      icon: CreditCard,
      title: "Paiement flexible",
      description: "Payez par carte ou en espèces"
    },
    {
      icon: Clock,
      title: "Tarifs transparents",
      description: "Prix calculé au kilomètre, sans surprise"
    }
  ];

  return (
    <div className="min-h-screen bg-navy-gradient text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-navy-600/30 rounded-full blur-[80px]" />
      </div>

      {/* Hero Section */}
      <header className="relative">
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto animate-slideDown">
          <img 
            src={LOGO_URL} 
            alt="TaxiG" 
            className="h-14 object-contain drop-shadow-lg"
          />
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              className="text-slate-300 hover:text-orange-400 hover:bg-white/5 transition-all duration-300 rounded-xl"
              onClick={() => navigate('/admin/login')}
              data-testid="admin-link"
            >
              Admin
            </Button>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-28">
          <div className="max-w-2xl animate-fadeIn">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full mb-8 animate-scaleIn">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 text-sm font-medium">Service disponible 24h/24</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
              Votre taxi en
              <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent"> un clic</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-xl">
              Service de taxi professionnel avec géolocalisation en temps réel. 
              Tarifs transparents, chauffeurs qualifiés.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="btn-taxi h-14 px-8 text-lg group"
                onClick={() => navigate('/client/login')}
                data-testid="client-login-btn"
              >
                <User className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                Je suis client
                <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                className="btn-secondary h-14 px-8 text-lg group"
                onClick={() => navigate('/chauffeur/login')}
                data-testid="chauffeur-login-btn"
              >
                <Car className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                Je suis chauffeur
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative car glow */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-96 hidden lg:block">
          <div className="absolute right-20 top-1/2 -translate-y-1/2 w-80 h-80 bg-orange-500/20 rounded-full blur-[100px] animate-glow" />
        </div>
      </header>

      {/* Features */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-slideDown">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Pourquoi choisir <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">TaxiG</span> ?
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Une expérience de transport moderne et fiable
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`card-taxi p-8 group cursor-pointer animate-slideUp stagger-${index + 1}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange-500/20">
                  <feature.icon className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white group-hover:text-orange-300 transition-colors">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 bg-navy-800/50" />
        <div className="relative max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Tarification <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">simple</span>
          </h2>
          <p className="text-slate-400 mb-12 max-w-2xl mx-auto text-lg">
            Pas de frais cachés. Prix calculé selon la distance et le temps.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card-taxi p-8 border-orange-500/30 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-3 font-medium">Prise en charge</p>
              <p className="text-5xl font-black bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">6.30€</p>
            </div>
            <div className="card-taxi p-8 group">
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-3 font-medium">Par kilomètre</p>
              <p className="text-5xl font-black text-white group-hover:text-orange-300 transition-colors">3.20€</p>
            </div>
            <div className="card-taxi p-8 group">
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-3 font-medium">Attente / min</p>
              <p className="text-5xl font-black text-white group-hover:text-orange-300 transition-colors">0.70€</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card-taxi p-12 border-orange-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-400" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/10 rounded-full blur-[60px]" />
            
            <Shield className="w-20 h-20 text-orange-400 mx-auto mb-8 animate-float" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Devenez chauffeur TaxiG
            </h2>
            <p className="text-slate-400 mb-10 max-w-xl mx-auto text-lg">
              Rejoignez notre équipe de chauffeurs professionnels. 
              Commission réduite, paiements rapides, support 24/7.
            </p>
            <Button 
              className="btn-taxi h-14 px-10 text-lg group"
              onClick={() => navigate('/chauffeur/login')}
              data-testid="become-chauffeur-btn"
            >
              Devenir chauffeur
              <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-navy-700/50 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={LOGO_URL} alt="TaxiG" className="h-12 opacity-80 hover:opacity-100 transition-opacity" />
          <p className="text-slate-500 text-sm">
            © 2024 TaxiG. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
