import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, User, Shield, MapPin, CreditCard, Clock, ChevronRight, Sparkles, Zap, Moon, Star } from 'lucide-react';
import { Button } from '../components/ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_geolocab-platform/artifacts/6p3uaynm_1000103457-removebg-preview.png";

/* ── Typing Hook ── */
const useTyping = (words) => {
  const [display, setDisplay] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIndex];
    const delay = deleting ? 60 : 90;
    const timer = setTimeout(() => {
      if (!deleting) {
        setDisplay(word.slice(0, charIndex + 1));
        if (charIndex + 1 === word.length) {
          setTimeout(() => setDeleting(true), 1600);
        } else {
          setCharIndex(c => c + 1);
        }
      } else {
        setDisplay(word.slice(0, charIndex - 1));
        if (charIndex - 1 === 0) {
          setDeleting(false);
          setWordIndex(i => (i + 1) % words.length);
          setCharIndex(0);
        } else {
          setCharIndex(c => c - 1);
        }
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [charIndex, deleting, wordIndex, words]);

  return display;
};

/* ── Count-up Hook ── */
const useCountUp = (target, duration = 1400, active = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(start);
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
};

/* ── Scroll Reveal Hook ── */
const useScrollReveal = () => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

/* ── Stat Item ── */
const StatItem = ({ target, label, suffix = '' }) => {
  const [ref, visible] = useScrollReveal();
  const count = useCountUp(target, 1400, visible);
  return (
    <div ref={ref} className="stat-item">
      <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: 'var(--tw-color-orange, #f97316)', lineHeight: 1 }}>
        {count.toLocaleString('fr-FR')}{suffix}
      </p>
      <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{label}</p>
    </div>
  );
};

/* ── Live Map Card ── */
const LiveMapCard = () => {
  const [carPos, setCarPos] = useState(20);
  useEffect(() => {
    let dir = 1;
    const t = setInterval(() => {
      setCarPos(p => {
        if (p >= 70) dir = -1;
        if (p <= 20) dir = 1;
        return p + dir * 0.4;
      });
    }, 30);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
      border: '1px solid rgba(249,115,22,0.2)',
      borderRadius: 24, padding: 28,
      backdropFilter: 'blur(16px)',
      boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(249,115,22,0.08)',
      position: 'relative', width: '100%', maxWidth: 360,
    }}>
      {/* top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.6), transparent)', borderRadius: '24px 24px 0 0' }} />

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' }}>En direct</span>
        <span style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', padding: '3px 10px', borderRadius: 20 }}>● Live</span>
      </div>

      {/* map */}
      <div style={{ background: '#1a2540', borderRadius: 14, height: 150, marginBottom: 18, overflow: 'hidden', position: 'relative', border: '1px solid rgba(249,115,22,0.1)' }}>
        {/* grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(249,115,22,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* route */}
        <div style={{ position: 'absolute', top: '50%', left: '10%', width: '80%', height: 2, background: 'linear-gradient(90deg, #f97316, rgba(249,115,22,0.2))', transform: 'translateY(-50%) rotate(-4deg)' }} />
        {/* car dot */}
        <div style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#f97316', top: '50%', left: `${carPos}%`, transform: 'translateY(-50%)', boxShadow: '0 0 0 6px rgba(249,115,22,0.2)', transition: 'left 0.03s linear' }} />
        {/* dest */}
        <div style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: '#4ade80', top: '50%', right: '14%', transform: 'translateY(-50%)', boxShadow: '0 0 0 5px rgba(74,222,128,0.2)' }} />
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, color: '#94a3b8' }}>📍 Genève Centre</div>
        <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: '#4ade80' }}>🏁 Destination</div>
      </div>

      {/* driver info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(249,115,22,0.08))', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧑‍✈️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Mohammed K.</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              <span style={{ color: '#fbbf24' }}>★★★★★</span> 4.95 · Mercedes E200
            </div>
          </div>
        </div>
        <div style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)', padding: '6px 14px', borderRadius: 20, fontSize: 13, color: '#fb923c', fontWeight: 700 }}>3 min</div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const typedText = useTyping(['un clic', '3 minutes', 'Genève', 'confiance']);

  /* scroll reveal refs */
  const [statsRef, statsVisible] = useScrollReveal();
  const [featuresRef, featuresVisible] = useScrollReveal();
  const [howRef, howVisible] = useScrollReveal();
  const [pricingRef, pricingVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();

  const features = [
    { icon: MapPin,    title: "Géolocalisation temps réel",  description: "Suivez votre chauffeur en direct sur la carte. Soyez prévenu à chaque étape de votre trajet." },
    { icon: CreditCard,title: "Paiement flexible",           description: "Payez par carte bancaire ou en espèces selon vos préférences. Simple et sécurisé." },
    { icon: Clock,     title: "Tarifs transparents",         description: "Prix calculé au kilomètre, sans surprise. Estimation affichée avant confirmation." },
    { icon: Shield,    title: "Sécurité garantie",           description: "Tous nos chauffeurs sont vérifiés, assurés et formés. Votre sécurité est notre priorité." },
    { icon: Zap,       title: "Réservation instantanée",     description: "Commandez votre taxi en quelques secondes. Confirmation immédiate par notification." },
    { icon: Moon,      title: "24h/24 & 7j/7",              description: "Disponible jour et nuit, même les jours fériés. Un chauffeur toujours là pour vous." },
  ];

  const steps = [
    { n: '1', title: 'Commandez',         desc: "Entrez votre destination et confirmez votre adresse de prise en charge." },
    { n: '2', title: 'Chauffeur assigné', desc: "Un chauffeur proche est sélectionné automatiquement." },
    { n: '3', title: 'Suivez en direct',  desc: "Regardez votre taxi s'approcher sur la carte en temps réel." },
    { n: '4', title: 'Arrivée & paiement',desc: "Profitez du trajet. Payez à votre convenance à l'arrivée." },
  ];

  /* Bebas Neue font */
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const bebasStyle = { fontFamily: "'Bebas Neue', sans-serif" };
  const revealStyle = (visible, delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(32px)',
    transition: `opacity .7s ${delay}s, transform .7s ${delay}s`,
  });

  return (
    <div className="min-h-screen bg-navy-gradient text-white overflow-hidden">

      {/* ── FONT IMPORT INLINE ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .bebas { font-family: 'Bebas Neue', sans-serif !important; }
        .cursor-blink {
          display: inline-block; width: 3px; height: .82em;
          background: #f97316; margin-left: 4px; vertical-align: middle;
          animation: blink .8s step-end infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .feature-card-enhanced {
          transition: transform .3s, border-color .3s, box-shadow .3s;
        }
        .feature-card-enhanced:hover {
          transform: translateY(-6px);
          border-color: rgba(249,115,22,0.3) !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 30px rgba(249,115,22,0.08);
        }
        .feature-card-enhanced:hover .feat-icon {
          transform: scale(1.12);
          box-shadow: 0 8px 24px rgba(249,115,22,0.25);
        }
        .feature-card-enhanced:hover .feat-title { color: #fb923c; }
        .feat-icon { transition: transform .3s, box-shadow .3s; }
        .feat-title { transition: color .3s; }
        .price-card-hover { transition: transform .3s, border-color .3s, box-shadow .3s; }
        .price-card-hover:hover { transform: translateY(-5px); border-color: rgba(249,115,22,0.35) !important; box-shadow: 0 16px 40px rgba(249,115,22,0.1); }
        .stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; }
        .stat-item { background: rgba(11,17,32,0.9); padding: 28px 32px; text-align: center; }
        .steps-connector { position: absolute; top: 30px; left: 12%; right: 12%; height: 1px; background: linear-gradient(90deg, transparent, #f97316 30%, #f97316 70%, transparent); }
        @media(max-width:768px){ .hero-grid { grid-template-columns: 1fr !important; } .hero-right-col { display:none !important; } .steps-grid { grid-template-columns: 1fr 1fr !important; } .steps-connector { display:none; } .pricing-grid { grid-template-columns: 1fr !important; } .features-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ── ANIMATED BG ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-navy-600/30 rounded-full blur-[80px]" />
        {/* subtle grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── NAV ── */}
      <header className="relative">
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto animate-slideDown">
          <img src={LOGO_URL} alt="TaxiG" className="h-14 object-contain drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.4))' }} />
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

        {/* ── HERO ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }} className2="hero-grid">
          {/* left */}
          <div className="animate-fadeIn">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full mb-8 animate-scaleIn">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite' }} />
              <span className="text-orange-300 text-sm font-medium">Service disponible 24h/24</span>
            </div>

            <h1 className="bebas tracking-tight mb-6" style={{ fontSize: 'clamp(60px,8vw,92px)', lineHeight: .93, ...bebasStyle }}>
              Votre taxi en<br />
              <span style={{ color: '#f97316' }}>{typedText}</span>
              <span className="cursor-blink" />
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

          {/* right — live map card */}
          <div className="hero-right-col" style={{ display: 'flex', justifyContent: 'center', animation: 'fadeIn 1s .4s both' }}>
            <LiveMapCard />
          </div>
        </div>
      </header>

      {/* ── STATS BAR ── */}
      <div ref={statsRef} className="relative z-10 max-w-7xl mx-auto px-6 mb-16" style={revealStyle(statsVisible)}>
        <div className="stat-grid">
          <StatItem target={12400} label="Courses effectuées" />
          <StatItem target={98}    label="% satisfaction clients" suffix="%" />
          <StatItem target={47}    label="Chauffeurs actifs" />
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section ref={featuresRef} className="relative py-16 px-6" style={revealStyle(featuresVisible)}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#f97316', fontWeight: 600, display: 'block', marginBottom: 10 }}>Pourquoi TaxiG</span>
            <h2 className="bebas" style={{ ...bebasStyle, fontSize: 'clamp(38px,5vw,60px)', lineHeight: 1, marginBottom: 12 }}>
              Une expérience <span style={{ color: '#f97316' }}>différente</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Transport moderne, fiable et transparent — conçu pour Genève</p>
          </div>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {features.map((feature, i) => (
              <div
                key={i}
                className="card-taxi feature-card-enhanced p-8"
                style={{ position: 'relative', overflow: 'hidden', animationDelay: `${i * 0.08}s` }}
              >
                {/* accent top line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent)', opacity: 0, transition: 'opacity .3s' }} className="feat-line" />
                <div className="feat-icon w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl flex items-center justify-center mb-6" style={{ border: '1px solid rgba(249,115,22,0.2)' }}>
                  <feature.icon className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="feat-title text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section ref={howRef} className="relative py-20 px-6" style={revealStyle(howVisible)}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#f97316', fontWeight: 600, display: 'block', marginBottom: 10 }}>Processus</span>
            <h2 className="bebas" style={{ ...bebasStyle, fontSize: 'clamp(38px,5vw,60px)', lineHeight: 1 }}>
              Comment ça <span style={{ color: '#f97316' }}>marche</span> ?
            </h2>
          </div>

          <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', position: 'relative' }}>
            <div className="steps-connector" />
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 20px' }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...bebasStyle, fontSize: 26, margin: '0 auto 20px',
                  boxShadow: '0 8px 24px rgba(249,115,22,0.35)',
                  position: 'relative', zIndex: 1,
                }}>
                  {s.n}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section ref={pricingRef} className="relative py-24 px-6" style={revealStyle(pricingVisible)}>
        <div className="absolute inset-0 bg-navy-800/50" />
        <div className="relative max-w-7xl mx-auto text-center">
          <span style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#f97316', fontWeight: 600, display: 'block', marginBottom: 10 }}>Tarification</span>
          <h2 className="bebas" style={{ ...bebasStyle, fontSize: 'clamp(38px,5vw,60px)', lineHeight: 1, marginBottom: 14 }}>
            Simple &amp; <span style={{ color: '#f97316' }}>transparent</span>
          </h2>
          <p className="text-slate-400 mb-14 max-w-2xl mx-auto text-lg">
            Pas de frais cachés. Prix calculé selon la distance et le temps.
          </p>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, maxWidth: 860, margin: '0 auto 32px' }}>
            {/* featured */}
            <div className="price-card-hover" style={{
              background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.35)',
              borderRadius: 20, padding: '36px 28px', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 0 40px rgba(249,115,22,0.1)',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #f97316, #fdba74)' }} />
              <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 16, fontWeight: 600 }}>Prise en charge</p>
              <p className="bebas" style={{ ...bebasStyle, fontSize: 58, lineHeight: 1, color: '#f97316' }}>6.30€</p>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>tarif fixe au départ</p>
            </div>

            <div className="card-taxi price-card-hover p-8" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 16, fontWeight: 600 }}>Par kilomètre</p>
              <p className="bebas" style={{ ...bebasStyle, fontSize: 58, lineHeight: 1 }}>3.20€</p>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>distance parcourue</p>
            </div>

            <div className="card-taxi price-card-hover p-8" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 16, fontWeight: 600 }}>Attente / min</p>
              <p className="bebas" style={{ ...bebasStyle, fontSize: 58, lineHeight: 1 }}>0.70€</p>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>par minute d'attente</p>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#64748b' }}>Estimation affichée avant confirmation · Tarifs conformes à la réglementation genevoise</p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section ref={ctaRef} className="relative py-24 px-6" style={revealStyle(ctaVisible)}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="card-taxi p-12 border-orange-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-400" />
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/10 rounded-full blur-[60px]" />
            <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(249,115,22,0.06)', filter: 'blur(80px)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />

            <Shield className="w-20 h-20 text-orange-400 mx-auto mb-8 animate-float" />
            <h2 className="bebas" style={{ ...bebasStyle, fontSize: 'clamp(32px,4vw,52px)', marginBottom: 14 }}>
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

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-navy-700/50 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={LOGO_URL} alt="TaxiG" className="h-12 opacity-80 hover:opacity-100 transition-opacity" />
          <p className="text-slate-500 text-sm">© 2024 TaxiG. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
