import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, User, Shield, MapPin, CreditCard, Clock } from 'lucide-react';
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
    <div className="min-h-screen bg-[#09090B] text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700]/10 to-transparent opacity-50" />
        
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <img 
            src={LOGO_URL} 
            alt="TaxiG" 
            className="h-16 object-contain"
          />
          <div className="flex gap-3">
            <Button 
              variant="ghost" 
              className="text-white hover:text-[#FFD700] hover:bg-white/10"
              onClick={() => navigate('/admin/login')}
              data-testid="admin-link"
            >
              Admin
            </Button>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
              Votre taxi en
              <span className="text-[#FFD700]"> un clic</span>
            </h1>
            <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
              Service de taxi professionnel avec géolocalisation en temps réel. 
              Tarifs transparents, chauffeurs qualifiés.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="btn-taxi h-14 px-8 text-lg"
                onClick={() => navigate('/client/login')}
                data-testid="client-login-btn"
              >
                <User className="w-5 h-5 mr-2" />
                Je suis client
              </Button>
              <Button 
                className="btn-secondary h-14 px-8 text-lg"
                onClick={() => navigate('/chauffeur/login')}
                data-testid="chauffeur-login-btn"
              >
                <Car className="w-5 h-5 mr-2" />
                Je suis chauffeur
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative car */}
        <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20 hidden lg:block">
          <div className="absolute right-10 bottom-10 w-64 h-64 bg-[#FFD700] rounded-full blur-[100px]" />
        </div>
      </header>

      {/* Features */}
      <section className="py-20 px-6 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Pourquoi choisir <span className="text-[#FFD700]">TaxiG</span> ?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="card-taxi p-8 hover:border-[#FFD700]/50 transition-colors"
              >
                <div className="w-14 h-14 bg-[#FFD700]/20 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-[#FFD700]" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-[#18181B]">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Tarification <span className="text-[#FFD700]">simple</span>
          </h2>
          <p className="text-zinc-400 mb-12 max-w-2xl mx-auto">
            Pas de frais cachés. Prix calculé selon la distance et le temps.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card-taxi p-6 border-[#FFD700]">
              <p className="text-sm text-zinc-400 uppercase tracking-wider mb-2">Prise en charge</p>
              <p className="text-4xl font-black text-[#FFD700]">6.30€</p>
            </div>
            <div className="card-taxi p-6">
              <p className="text-sm text-zinc-400 uppercase tracking-wider mb-2">Par kilomètre</p>
              <p className="text-4xl font-black">3.20€</p>
            </div>
            <div className="card-taxi p-6">
              <p className="text-sm text-zinc-400 uppercase tracking-wider mb-2">Attente / min</p>
              <p className="text-4xl font-black">0.70€</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card-taxi p-12 border-[#FFD700]/30">
            <Shield className="w-16 h-16 text-[#FFD700] mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Devenez chauffeur TaxiG
            </h2>
            <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
              Rejoignez notre équipe de chauffeurs professionnels. 
              Commission réduite, paiements rapides, support 24/7.
            </p>
            <Button 
              className="btn-taxi h-12 px-8"
              onClick={() => navigate('/chauffeur/login')}
              data-testid="become-chauffeur-btn"
            >
              Devenir chauffeur
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={LOGO_URL} alt="TaxiG" className="h-10" />
          <p className="text-zinc-500 text-sm">
            © 2024 TaxiG. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
