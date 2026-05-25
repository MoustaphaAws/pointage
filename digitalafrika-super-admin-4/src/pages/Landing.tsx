import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart3, Check, Clock, FileSpreadsheet, QrCode, Shield,
  Users, Zap, Bell, Calendar, TrendingUp,
  Building2, Briefcase, Globe, Eye, EyeOff,
  Sparkles, Target, Timer,
  UserPlus, ArrowRight,
  ThumbsUp, BadgeCheck,
  ChevronRight, LogIn, ArrowLeft,
  ChevronLeft, Pause, Play,
  Search, Share2, Monitor,
  Edit3, Send, MapPin, Key, Rocket,
  AlertCircle, Clock3, X, PlayCircle,
  Mail, Lock, VolumeX, Volume2, HelpCircle, MessageCircle, UserCheck, MapPinIcon,
} from 'lucide-react';
import { useAuthStore, hasValidStoredToken } from '../store/useAuthStore';  // ← AJOUTE hasValidStoredToken ici
import { User } from '../types';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : 'https://pointage-ufj2.onrender.com/api';


type Plan = {
  id: number;
  nom: string;
  slug: string;
  prix: number;
  prixAnnuel: number;
  maxEmployes: number;
  features: string[];
  popular?: boolean;
  bestValue?: boolean;
};

// FIX: moved outside component to avoid re-creation on every render
const PLANS_DATA: Plan[] = [
  {
    id: 1, nom: 'Essentiel', slug: 'essentiel', prix: 7900, prixAnnuel: 7110, maxEmployes: 10,
    features: ["Jusqu'à 10 employés", 'Pointage QR code', 'Dashboard simple', 'Support email', 'Export basique'],
  },
  {
    id: 2, nom: 'Standard', slug: 'standard', prix: 12900, prixAnnuel: 11610, maxEmployes: 25,
    features: ["Jusqu'à 25 employés", 'Pointage QR code', 'Gestion des absences', 'Rapports détaillés', 'Support prioritaire', 'Planning simple'],
  },
  {
    id: 3, nom: 'Premium', slug: 'premium', prix: 19900, prixAnnuel: 17910, maxEmployes: 50,
    popular: true,
    features: ["Jusqu'à 50 employés", 'Pointage multi-méthodes', 'Planning & horaires avancés', "Workflow d'approbation", 'Rapports personnalisés', 'Support 7j/7', 'API accessible'],
  },
  {
    id: 4, nom: 'Business', slug: 'business', prix: 29900, prixAnnuel: 26910, maxEmployes: 150,
    features: ["Jusqu'à 150 employés", 'Tout Premium inclus', 'Multi-sites', 'SSO & SAML', 'Audit logs', 'SLA garanti', 'Account manager dédié'],
  },
  {
    id: 5, nom: 'Enterprise', slug: 'enterprise', prix: 39900, prixAnnuel: 35910, maxEmployes: 500,
    bestValue: true,
    features: ["Jusqu'à 500 employés", 'Tout Business inclus', 'Solution sur mesure', 'Formation dédiée', 'Développements spécifiques', 'Support 24/7', 'Intégration paie'],
  },
];

// FIX: moved outside component
const FEATURES = [
  { icon: QrCode, title: 'Pointage QR code', desc: 'Générez des QR codes uniques pour chaque employé ou site. Le pointage se fait en un scan, sans contact et sans matériel coûteux.', details: ['QR code dynamique', 'Scan illimité', 'Multi-sites', 'Sécurisé'] },
  { icon: Clock, title: 'Pointage en temps réel', desc: 'Suivez les entrées, sorties et pauses en direct. Les données sont synchronisées instantanément sur tous les appareils.', details: ['Temps réel', 'Hors-ligne', 'Synchronisation auto', 'Multi-appareils'] },
  { icon: BarChart3, title: 'Rapports détaillés', desc: 'Des tableaux de bord personnalisables avec plus de 50 indicateurs pour piloter votre masse salariale et votre productivité.', details: ['KPIs en direct', 'Exports paie', 'Historique illimité', 'Personnalisable'] },
  { icon: Bell, title: 'Alertes intelligentes', desc: "Soyez notifié instantanément des retards, absences et anomalies. Configurez vos propres règles d'alerte.", details: ['Push & Email', 'Seuils réglables', 'Escalade auto', 'Multi-canal'] },
  { icon: FileSpreadsheet, title: 'Export paie automatisé', desc: 'Connectez One Time à votre logiciel de paie. Les données sont formatées automatiquement, sans saisie manuelle.', details: ['Formats multiples', 'API ouverte', 'Horodatage', 'Conformité'] },
  { icon: Shield, title: 'Sécurité maximale', desc: 'Données chiffrées de bout en bout. One Time est conforme aux normes les plus strictes pour protéger vos informations.', details: ['Chiffrement AES', 'Sauvegarde auto', 'Audit trail', 'Certifié'] },
];

const SECTORS = ['BTP & Chantier', 'Industrie & Usine', 'Santé & Médical', 'Logistique', 'Commerce & Retail', 'Services', 'Éducation', 'Informatique'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(prix: number) {
  return `${prix.toLocaleString('fr-FR')} FCFA`;
}

function validatePassword(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

function mapAuthUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id),
    firstName: String(raw.firstName ?? ''),
    lastName: String(raw.lastName ?? ''),
    email: String(raw.email ?? ''),
    // FIX: safer cast with fallback
    role: (raw.role as User['role']) ?? 'employee',
    service: String(raw.service ?? raw.serviceName ?? ''),
    poste: raw.poste ? String(raw.poste) : undefined,
    active: Boolean(raw.active ?? raw.actif ?? true),
    companyName: raw.companyName ? String(raw.companyName) : null,
    entrepriseId: raw.entrepriseId ? String(raw.entrepriseId) : null,
    adminPermissions: raw.adminPermissions as User['adminPermissions'],
  };
}

// FIX: mock token generator extracted and clearly marked as demo-only
function generateMockToken(companyName: string): string {
  const payload = {
    sub: '1',
    role: 'superadmin',
    companyName,
    exp: Math.floor(Date.now() / 1000) + 8 * 3600,
    iat: Math.floor(Date.now() / 1000),
  };
  const base64Payload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.demo-signature-only`;
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ end, duration = 2000, suffix = '', prefix = '' }: {
  end: number; duration?: number; suffix?: string; prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString('fr-FR')}{suffix}</span>;
}

// ── Reveal on scroll ──────────────────────────────────────────────────────────
function Reveal({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setVisible(true), delay);
        observer.unobserve(el);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Scène 1 : Scan QR Code ────────────────────────────────────────────────────
function ScanQRScene() {
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);

  // FIX: stable random positions using useMemo — no more Math.random() in JSX
  const dotPositions = useMemo(
    () => Array.from({ length: 6 }, () => ({
      top: 20 + Math.random() * 60,
      left: 10 + Math.random() * 80,
    })),
    [],
  );

  useEffect(() => {
    if (scanComplete) return;
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) { setScanComplete(true); return 100; }
        return prev + 2;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [scanComplete]);

  useEffect(() => {
    if (!scanComplete) return;
    const timeout = setTimeout(() => {
      setScanComplete(false);
      setScanProgress(0);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [scanComplete]);

  return (
    <div className="h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #f0f6fc 0%, #ffffff 100%)' }}>
      <div className="pt-12 px-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] text-gray-400 font-medium">Pointage</div>
            <div className="text-sm font-black text-gray-900">Scanner QR Code</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
            <QrCode size={14} className="text-sky-600" />
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="relative w-full aspect-square max-w-[220px]">
          <div className="absolute inset-0 border-4 border-sky-500/30 rounded-3xl" />
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-500 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-500 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-500 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-500 rounded-br-2xl" />
          <div className="absolute inset-4 flex items-center justify-center">
            <div className="w-24 h-24 relative">
              <div className="absolute inset-0 grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className={`rounded-sm ${[0, 2, 4, 6, 8].includes(i) ? 'bg-gray-800' : 'bg-transparent'}`} />
                ))}
              </div>
            </div>
          </div>
          <div
            className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent transition-all duration-100"
            style={{ top: `${Math.min(scanProgress, 85)}%`, boxShadow: '0 0 20px rgba(14,165,233,0.8), 0 0 40px rgba(14,165,233,0.4)' }}
          />
          {/* FIX: stable positions from useMemo */}
          {dotPositions.map((pos, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-sky-400 animate-pulse"
              style={{ top: `${pos.top}%`, left: `${pos.left}%`, animationDelay: `${i * 0.3}s`, animationDuration: '1.5s', opacity: 0.6 }}
            />
          ))}
        </div>
      </div>
      <div className="px-5 pb-8 text-center">
        {scanComplete ? (
          <div className="space-y-2" style={{ animation: 'fadeInUp 0.5s ease' }}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
              <Check size={22} className="text-emerald-600" />
            </div>
            <div className="text-sm font-black text-emerald-600">Pointage validé !</div>
            <div className="text-[10px] text-emerald-500">08:00:45 • Présent</div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Placez le QR code dans le cadre</div>
            <div className="flex items-center justify-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Scène 2 : Logo OneTime ────────────────────────────────────────────────────
// FIX: stable random positions for particles
const LOGO_PARTICLES = Array.from({ length: 12 }, () => ({
  top: 10 + Math.random() * 80,
  left: 10 + Math.random() * 80,
  delay: Math.random() * 0.2 * 12,
  duration: 2 + Math.random() * 3,
}));

function LogoScene() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #0b3d7b 30%, #094e8a 60%, #085c96 100%)' }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full border-2 border-white/10 animate-spin" style={{ animationDuration: '20s' }} />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full border-2 border-white/10 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full border border-white/5 animate-pulse" style={{ animationDuration: '3s' }} />
      </div>
      {LOGO_PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/30 animate-pulse"
          style={{ top: `${p.top}%`, left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}
      <div className="relative z-10 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-sky-400/30 blur-2xl animate-pulse" />
          <div
            className="relative w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto border border-white/20"
            style={{ boxShadow: '0 0 40px rgba(56,189,248,0.3)' }}
          >
            <Clock size={32} className="text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-white tracking-tight">One<span className="text-sky-300">Time</span></h2>
          <p className="text-xs text-sky-200/70 font-medium">Pointage intelligent</p>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/80 font-medium">Système actif</span>
        </div>
      </div>
    </div>
  );
}

// ── Scène 3 : Dashboard ───────────────────────────────────────────────────────
function DashboardScene() {
  const [counts, setCounts] = useState({ presents: 0, heures: 0, absences: 0, retards: 0 });

  useEffect(() => {
    const targets = { presents: 142, heures: 2034, absences: 8, retards: 5 };
    const duration = 2000;
    const steps = 50;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setCounts({
        presents: Math.floor(targets.presents * progress),
        heures: Math.floor(targets.heures * progress),
        absences: Math.floor(targets.absences * progress),
        retards: Math.floor(targets.retards * progress),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
    // FIX: no external deps needed — targets are local
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: '#f8fbfe' }}>
      <div className="pt-10 px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[9px] text-gray-400 font-medium">Bonjour 👋</div>
            <div className="text-xs font-black text-gray-900">Dashboard</div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
            <Bell size={12} className="text-sky-600" />
          </div>
        </div>
      </div>
      <div className="px-4 space-y-3 flex-1">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl" style={{ background: '#f0f6fc' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-sky-100 flex items-center justify-center"><Users size={10} className="text-sky-600" /></div>
              <span className="text-[9px] text-gray-500">Présents</span>
            </div>
            <div className="text-lg font-black text-sky-700">{counts.presents}</div>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: '#ecfeff' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-cyan-100 flex items-center justify-center"><Clock size={10} className="text-cyan-600" /></div>
              <span className="text-[9px] text-gray-500">Heures</span>
            </div>
            <div className="text-lg font-black text-cyan-700">{counts.heures}h</div>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: '#fffbeb' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center"><AlertCircle size={10} className="text-amber-600" /></div>
              <span className="text-[9px] text-gray-500">Absences</span>
            </div>
            <div className="text-lg font-black text-amber-600">{counts.absences}</div>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: '#fef2f2' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center"><Clock3 size={10} className="text-red-600" /></div>
              <span className="text-[9px] text-gray-500">Retards</span>
            </div>
            <div className="text-lg font-black text-red-600">{counts.retards}</div>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-white border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-semibold text-gray-600">Activité cette semaine</span>
            <span className="text-[8px] text-emerald-600 font-semibold">↑ 12%</span>
          </div>
          <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#085c96" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#085c96" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 30 L30 25 L60 20 L90 15 L120 18 L150 10 L180 16 L200 8" stroke="#085c96" strokeWidth="2" strokeLinecap="round" fill="none"
              strokeDasharray="300" strokeDashoffset="300" style={{ animation: 'dashDraw 2s ease forwards' }} />
            <path d="M0 30 L30 25 L60 20 L90 15 L120 18 L150 10 L180 16 L200 8 L200 40 L0 40 Z" fill="url(#dashGrad)" opacity="0"
              style={{ animation: 'fadeIn 1s 1.5s ease forwards' }} />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Scène 4 : Pointage GPS ────────────────────────────────────────────────────
function GPSScene() {
  const [isPointing, setIsPointing] = useState(false);
  const [pointed, setPointed] = useState(false);

  useEffect(() => {
    const cycle = setInterval(() => {
      setIsPointing(true);
      const t1 = setTimeout(() => {
        setIsPointing(false);
        setPointed(true);
        const t2 = setTimeout(() => setPointed(false), 2000);
        return () => clearTimeout(t2);
      }, 1500);
      return () => clearTimeout(t1);
    }, 4500);
    return () => clearInterval(cycle);
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: '#f8fbfe' }}>
      <div className="pt-10 px-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[9px] text-gray-400 font-medium">Pointage</div>
            <div className="text-xs font-black text-gray-900">Localisation GPS</div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8px] text-emerald-600 font-medium">Live</span>
          </div>
        </div>
      </div>
      <div className="flex-1 px-4">
        <div className="relative h-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #e8f4f8 0%, #f0f6fc 50%, #e8f4f8 100%)' }}>
            <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gray-300/50" />
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300/50" />
            <div className="absolute top-3/4 left-0 right-0 h-0.5 bg-gray-300/50" />
            <div className="absolute left-1/4 top-0 bottom-0 w-0.5 bg-gray-300/50" />
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300/50" />
            <div className="absolute left-3/4 top-0 bottom-0 w-0.5 bg-gray-300/50" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-0 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            <div
              className="relative w-6 h-6 rounded-full bg-sky-600 border-2 border-white flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 0 20px rgba(8,92,150,0.5)' }}
            >
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[200%] bg-white rounded-lg px-2 py-1 shadow-md border border-gray-100">
            <div className="flex items-center gap-1">
              <MapPin size={10} className="text-sky-600" />
              <span className="text-[9px] font-semibold text-gray-700">Bureau Principal</span>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <button
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-500 ${pointed ? 'bg-emerald-500 text-white' : isPointing ? 'bg-sky-400 text-white animate-pulse' : 'bg-sky-600 text-white'}`}
              style={{ boxShadow: pointed ? '0 0 30px rgba(16,185,129,0.5)' : isPointing ? '0 0 30px rgba(14,165,233,0.5)' : 'none' }}
            >
              {pointed ? '✓ Pointé !' : isPointing ? 'Pointage en cours...' : 'Pointer maintenant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scène 5 : Notifications ────────────────────────────────────────────────────
const NOTIFICATIONS = [
  { icon: Check, title: 'Pointage effectué', subtitle: 'Amina Doumbia • 08:00', color: 'emerald' },
  { icon: AlertCircle, title: 'Retard détecté', subtitle: 'Ibrahim Koné • 08:15', color: 'amber' },
  { icon: FileSpreadsheet, title: 'Rapport généré', subtitle: 'Synthèse mensuelle prête', color: 'sky' },
] as const;

function NotificationsScene() {
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  useEffect(() => {
    const cycle = () => {
      [0, 1, 2].forEach((i) => {
        const t1 = setTimeout(() => {
          setVisibleCards(prev => [...prev, i]);
          const t2 = setTimeout(() => setVisibleCards(prev => prev.filter(c => c !== i)), 3000);
          // store inner timeout — not easily cancellable here, acceptable for UI
          return () => clearTimeout(t2);
        }, i * 1200);
        return () => clearTimeout(t1);
      });
    };
    cycle();
    const interval = setInterval(cycle, 4500);
    return () => clearInterval(interval);
  }, []);

  const colorMap = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', dot: 'bg-amber-500' },
    sky: { bg: 'bg-sky-100', text: 'text-sky-600', dot: 'bg-sky-500' },
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#f8fbfe' }}>
      <div className="pt-10 px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[9px] text-gray-400 font-medium">Centre de notifications</div>
            <div className="text-xs font-black text-gray-900">Activité récente</div>
          </div>
          <div className="relative">
            <Bell size={14} className="text-gray-600" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex-1 px-4 space-y-2.5 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[8px] text-gray-400 font-medium">Aujourd'hui</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        {NOTIFICATIONS.map((notif, index) => {
          const Icon = notif.icon;
          const isVisible = visibleCards.includes(index);
          const colors = colorMap[notif.color];
          return (
            <div
              key={index}
              className={`p-3 rounded-xl border border-gray-100 bg-white transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
              style={{ boxShadow: isVisible ? '0 4px 15px rgba(0,0,0,0.05)' : 'none' }}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
                  <Icon size={14} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    <span className="text-[10px] font-bold text-gray-800">{notif.title}</span>
                  </div>
                  <p className="text-[9px] text-gray-400">{notif.subtitle}</p>
                </div>
                <span className="text-[8px] text-gray-300">À l'instant</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4 pt-2">
        <button className="w-full py-2 rounded-xl text-[10px] font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 transition-all">
          Voir tous les rapports →
        </button>
      </div>
    </div>
  );
}

// ── Phone Mockup avec slideshow animé ─────────────────────────────────────────
// FIX: separated scene components with stable keys, no stray character after closing brace
function PhoneMockup() {
  const [currentScene, setCurrentScene] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const totalScenes = 5;
  const sceneDuration = 5000;

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      const t = setTimeout(() => {
        setCurrentScene(prev => (prev + 1) % totalScenes);
        setIsTransitioning(false);
      }, 600);
      return () => clearTimeout(t);
    }, sceneDuration);
    return () => clearInterval(interval);
  }, []);

  const goToScene = (i: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScene(i);
      setIsTransitioning(false);
    }, 600);
  };

  const scenes = [ScanQRScene, LogoScene, DashboardScene, GPSScene, NotificationsScene];

  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      <div
        className="absolute -inset-6 rounded-[3rem] opacity-40 blur-2xl animate-pulse"
        style={{ background: 'radial-gradient(circle, rgba(8,92,150,0.3) 0%, rgba(14,165,233,0.1) 50%, transparent 70%)', animationDuration: '3s' }}
      />
      <div
        className="relative rounded-[2.5rem] border-[3px] border-gray-800 bg-gray-900 p-2.5 shadow-2xl"
        style={{ boxShadow: '0 30px 60px rgba(8,92,150,0.25), 0 0 0 2px rgba(8,92,150,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)', animation: 'floatSlow 6s ease-in-out 2s infinite' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-2xl z-20">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-gray-800 border-2 border-gray-700">
            <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-pulse" />
          </div>
        </div>
        <div className="relative rounded-[1.8rem] overflow-hidden bg-white" style={{ aspectRatio: '9/19' }}>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
            {[...Array(totalScenes)].map((_, i) => (
              <button
                key={i}
                aria-label={`Aller à la scène ${i + 1}`}
                onClick={() => goToScene(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === currentScene ? 'w-8 bg-sky-500 shadow-lg shadow-sky-500/50' : 'w-1.5 bg-gray-300 hover:bg-gray-400'}`}
              />
            ))}
          </div>
          <div className="relative w-full h-full">
            {scenes.map((SceneComponent, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-700 ease-in-out ${currentScene === i ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'} ${isTransitioning && currentScene === i ? 'opacity-0 scale-105' : ''}`}
              >
                {/* FIX: only render the active scene and its neighbors to save memory */}
                {Math.abs(currentScene - i) <= 1 && <SceneComponent />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-xl opacity-20 animate-pulse"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.6) 0%, transparent 70%)', animationDuration: '2.5s' }}
      />
    </div>
  );
}

// ── App Carousel ──────────────────────────────────────────────────────────────
function AppCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = useMemo(() => [
    {
      title: 'Dashboard principal',
      description: "Vue d'ensemble de l'activité de votre équipe en temps réel",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: '142', label: 'Présents', color: '#085c96', bg: '#f0f6fc' },
              { val: '2 034h', label: 'Heures', color: '#0891b2', bg: '#ecfeff' },
              { val: '8', label: 'Absences', color: '#f59e0b', bg: '#fffbeb' },
              { val: '5', label: 'Retards', color: '#ef4444', bg: '#fef2f2' },
            ].map((stat, i) => (
              <div key={i} className="rounded-lg p-2" style={{ background: stat.bg }}>
                <div className="text-sm font-black" style={{ color: stat.color }}>{stat.val}</div>
                <div className="text-[10px] text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-3" style={{ background: '#f8fbfe', border: '1px solid #e0f0fa' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-700">Heures cette semaine</span>
              <span className="text-xs text-emerald-600 font-semibold">↑ 12%</span>
            </div>
            <svg width="100%" height="40" viewBox="0 0 250 40" fill="none">
              <defs>
                <linearGradient id="carouselGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#085c96" stopOpacity=".2" />
                  <stop offset="100%" stopColor="#085c96" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 30 L35 25 L70 20 L105 15 L140 18 L175 10 L210 16 L250 8" stroke="#085c96" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M0 30 L35 25 L70 20 L105 15 L140 18 L175 10 L210 16 L250 8 L250 40 L0 40 Z" fill="url(#carouselGrad)" />
            </svg>
          </div>
          {[
            { name: 'Amina Doumbia', time: '08:01', status: 'Entrée' },
            { name: 'Ibrahim Koné', time: '08:03', status: 'Entrée' },
            { name: 'Fatou Sow', time: '12:32', status: 'Pause' },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#f8fbfe' }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#085c96' }}>
                  {row.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-xs font-medium text-gray-800">{row.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{row.time}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#dcfce7', color: '#16a34a' }}>{row.status}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Pointage rapide',
      description: 'Interface de pointage simple et intuitive pour vos employés',
      content: (
        <div className="space-y-3">
          <div className="text-center p-4 rounded-xl" style={{ background: '#f8fbfe', border: '2px solid #e0f0fa' }}>
            <div className="text-3xl font-black mb-1" style={{ color: '#085c96' }}>08:00:45</div>
            <div className="text-xs text-gray-400 mb-3">Heure actuelle</div>
            <div className="flex gap-2 justify-center">
              <button className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#16a34a' }}>Pointer l'entrée</button>
              <button className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#f59e0b' }}>Pause</button>
              <button className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#ef4444' }}>Sortie</button>
            </div>
          </div>
          <div className="rounded-lg p-3" style={{ background: '#f8fbfe' }}>
            <div className="text-xs font-semibold text-gray-700 mb-2">Historique du jour</div>
            {[
              { action: 'Entrée', time: '08:00', icon: '→', color: '#16a34a' },
              { action: 'Pause début', time: '12:30', icon: '⏸', color: '#f59e0b' },
              { action: 'Pause fin', time: '13:30', icon: '▶', color: '#0891b2' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-xs text-gray-700">{item.action}</span>
                </div>
                <span className="text-xs font-semibold text-gray-600">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Rapports & Analyses',
      description: 'Des rapports détaillés pour piloter votre masse salariale',
      content: (
        <div className="space-y-3">
          <div className="rounded-lg p-3" style={{ background: '#f8fbfe', border: '1px solid #e0f0fa' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Heures totales - Mars 2026</span>
              <span className="text-xs font-bold" style={{ color: '#085c96' }}>2 034h</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 mb-3">
              <div className="h-full rounded-full" style={{ width: '78%', background: 'linear-gradient(90deg, #085c96, #0ea5e9)' }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Présence', val: '96%', color: '#16a34a' },
                { label: 'Retards', val: '3%', color: '#f59e0b' },
                { label: 'Absences', val: '1%', color: '#ef4444' },
              ].map((item, i) => (
                <div key={i} className="text-center p-2 rounded-lg" style={{ background: '#fff' }}>
                  <div className="text-sm font-black" style={{ color: item.color }}>{item.val}</div>
                  <div className="text-[10px] text-gray-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg p-3" style={{ background: '#f8fbfe' }}>
            <div className="text-xs font-semibold text-gray-700 mb-2">Top employés (heures)</div>
            {[
              { name: 'Amina Doumbia', hours: '176h', rank: 1 },
              { name: 'Ibrahim Koné', hours: '168h', rank: 2 },
              { name: 'Fatou Sow', hours: '160h', rank: 3 },
            ].map((emp, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: i === 0 ? '#085c96' : i === 1 ? '#0891b2' : '#0ea5e9' }}>
                    {emp.rank}
                  </div>
                  <span className="text-xs text-gray-700">{emp.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-600">{emp.hours}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ], []);

  // FIX: single stable interval, properly cleaned up
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    // Reset timer by toggling pause briefly
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 10000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 25px 60px rgba(8,92,150,.12)' }}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-400 ml-2">One Time — {slides[currentSlide].title}</span>
        </div>
        <button
          aria-label={isPaused ? 'Reprendre le défilement' : 'Mettre en pause'}
          onClick={() => setIsPaused(!isPaused)}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-200 transition"
        >
          {isPaused ? <Play size={12} className="text-gray-500" /> : <Pause size={12} className="text-gray-500" />}
        </button>
      </div>
      <div className="p-5 relative" style={{ minHeight: '320px' }}>
        {slides.map((slide, index) => (
          <div
            key={index}
            className="transition-all duration-700 absolute inset-0 p-5"
            style={{
              opacity: currentSlide === index ? 1 : 0,
              transform: `translateX(${currentSlide === index ? 0 : currentSlide > index ? -30 : 30}px)`,
              pointerEvents: currentSlide === index ? 'auto' : 'none',
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-black text-gray-900 mb-1">{slide.title}</h3>
              <p className="text-xs text-gray-500">{slide.description}</p>
            </div>
            {slide.content}
          </div>
        ))}
      </div>
      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              aria-label={`Aller à la diapo ${index + 1}`}
              onClick={() => goToSlide(index)}
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: currentSlide === index ? 24 : 8, background: currentSlide === index ? '#085c96' : '#d1d5db' }}
            />
          ))}
        </div>
        <div className="flex gap-1">
          <button
            aria-label="Diapo précédente"
            onClick={() => goToSlide((currentSlide - 1 + slides.length) % slides.length)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ChevronLeft size={14} className="text-gray-500" />
          </button>
          <button
            aria-label="Diapo suivante"
            onClick={() => goToSlide((currentSlide + 1) % slides.length)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ChevronRight size={14} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Registration Steps Posters ─────────────────────────────────────────────────
const REGISTRATION_STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: 'Créez votre compte',
    description: 'Remplissez le formulaire avec les informations de votre entreprise',
    emoji: '🏢',
    gradient: 'from-sky-500 to-blue-600',
    details: ["Nom de l'entreprise", 'Email professionnel', 'Mot de passe sécurisé'],
  },
  {
    step: 2,
    icon: Key,
    title: 'Vérifiez votre email',
    description: 'Un lien de confirmation vous sera envoyé pour activer votre compte',
    emoji: '📧',
    gradient: 'from-violet-500 to-purple-600',
    details: ['Vérification rapide', 'Lien sécurisé', 'Activation en 1 clic'],
  },
  {
    step: 3,
    icon: Users,
    title: 'Ajoutez vos employés',
    description: 'Importez votre équipe et configurez les horaires de travail',
    emoji: '👥',
    gradient: 'from-emerald-500 to-teal-600',
    details: ['Import en masse', 'Rôles personnalisés', 'Planning flexible'],
  },
  {
    step: 4,
    icon: Rocket,
    title: 'Lancez le pointage',
    description: 'Vos employés peuvent commencer à pointer dès maintenant',
    emoji: '🚀',
    gradient: 'from-orange-500 to-red-500',
    details: ['QR code généré', 'App mobile prête', 'Dashboard actif'],
  },
];

function RegistrationStepsPosters() {
  const [activeStep, setActiveStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      const t = setTimeout(() => {
        setActiveStep(prev => (prev + 1) % REGISTRATION_STEPS.length);
        setIsTransitioning(false);
      }, 500);
      return () => clearTimeout(t);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const step = REGISTRATION_STEPS[activeStep];
  const Icon = step.icon;

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} transition-all duration-1000`} />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/10 animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 animate-ping" style={{ animationDuration: '2s' }} />
      </div>
      <div className={`relative z-10 text-center text-white transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold mb-6">
          Étape {step.step}/4
        </div>
        <div className="text-5xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>{step.emoji}</div>
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
          <Icon size={24} className="text-white" />
        </div>
        <h3 className="text-xl font-black mb-2">{step.title}</h3>
        <p className="text-white/80 text-sm mb-5">{step.description}</p>
        <div className="space-y-2">
          {step.details.map((detail, i) => (
            <div key={i} className="flex items-center gap-2 justify-center">
              <Check size={12} className="text-white/70" />
              <span className="text-xs text-white/80">{detail}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {REGISTRATION_STEPS.map((_, i) => (
          <button
            key={i}
            aria-label={`Étape ${i + 1}`}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => { setActiveStep(i); setIsTransitioning(false); }, 500);
            }}
            className={`h-2 rounded-full transition-all duration-500 ${i === activeStep ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Background Video Section ────────────────────────────────────────────────
// FIX: extracted as a proper React component (was orphan JSX before)
function BackgroundVideoSection() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1920&h=1080&fit=crop"
        >
          <source src="https://cdn.coverr.co/videos/coverr-typing-on-computer-1584/1080p.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/50 via-transparent to-sky-900/50" />
      </div>
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-white/20 bg-white/10 backdrop-blur-sm">
            <PlayCircle size={14} className="text-sky-300 animate-pulse" />
            <span className="text-white">Voir One Time en action</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">
            Découvrez comment ça fonctionne
          </h2>
          <p className="text-lg text-sky-100/80 mb-10 max-w-2xl mx-auto">
            Une démonstration rapide de notre solution de pointage. Simple, intuitive et puissante.
          </p>
          <button className="inline-flex items-center gap-3 px-8 py-4 bg-white rounded-2xl text-gray-900 font-bold text-sm hover:bg-sky-50 transition-all shadow-2xl hover:shadow-sky-500/25 group">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition">
              <PlayCircle size={20} className="text-sky-600 ml-0.5" />
            </div>
            <span>Voir la démo (2:30)</span>
          </button>
        </Reveal>
      </div>
      <div className="absolute top-1/4 left-10 w-2 h-2 rounded-full bg-white/30 animate-pulse z-10" />
      <div className="absolute bottom-1/3 right-20 w-3 h-3 rounded-full bg-sky-400/40 animate-pulse z-10" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse z-10" style={{ animationDelay: '1s' }} />
    </section>
  );
}


// ── Qualification Modal (3 questions avec champ "Autre" et bouton Passer) ─────
function QualificationModal({ onComplete, onClose }: { onComplete: (data: Record<string, string>) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [animateOut, setAnimateOut] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const questions = [
    {
      id: 'source',
      question: "Comment avez-vous connu One Time ?",
      subtitle: "Cela nous aide à mieux comprendre votre parcours",
      icon: Search,
      options: [
        { label: 'Recherche Google', value: 'google', icon: Globe },
        { label: 'Recommandation / Bouche à oreille', value: 'recommandation', icon: Users },
        { label: 'Réseaux sociaux (LinkedIn, Facebook...)', value: 'reseaux-sociaux', icon: Share2 },
        { label: 'Publicité en ligne', value: 'publicite', icon: Monitor },
        { label: 'Autre', value: 'autre', icon: Edit3, isCustom: true },
      ],
    },
    {
      id: 'poste',
      question: "Quel est votre poste ou domaine d'activité ?",
      subtitle: "Pour adapter nos fonctionnalités à votre profil",
      icon: Briefcase,
      options: [
        { label: 'RH / Gestion du personnel', value: 'rh', icon: Users },
        { label: 'Direction / Management', value: 'direction', icon: Target },
        { label: 'Informatique / Tech', value: 'tech', icon: Monitor },
        { label: 'Administration / Gestion', value: 'admin', icon: FileSpreadsheet },
        { label: 'Autre', value: 'autre', icon: Edit3, isCustom: true },
      ],
    },
    {
      id: 'frequence',
      question: "À quelle fréquence pensez-vous utiliser One Time ?",
      subtitle: "Pour vous offrir l'expérience la plus adaptée",
      icon: Clock3,
      options: [
        { label: 'Tous les jours', value: 'quotidien', icon: Calendar },
        { label: 'Quelques fois par semaine', value: 'hebdomadaire', icon: Clock },
        { label: 'Quelques fois par mois', value: 'mensuel', icon: Calendar },
        { label: 'Occasionnellement', value: 'occasionnel', icon: Timer },
        { label: 'Autre', value: 'autre', icon: Edit3, isCustom: true },
      ],
    },
  ];

  const handleOptionSelect = (option: typeof questions[0]['options'][0]) => {
    if (option.isCustom) { setShowCustomInput(true); return; }
    proceedWithAnswer(option.value);
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) { proceedWithAnswer(customInput.trim()); setCustomInput(''); setShowCustomInput(false); }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && customInput.trim()) handleCustomSubmit(); };

  const handleSkip = () => {
    proceedWithAnswer('');
  };

  const proceedWithAnswer = (value: string) => {
    setAnimateOut(true);
    setTimeout(() => {
      setAnswers(prev => ({ ...prev, [questions[step].id]: value }));
      if (step < questions.length - 1) { setStep(prev => prev + 1); } else { onComplete({ ...answers, [questions[step].id]: value }); }
      setAnimateOut(false);
    }, 300);
  };

  const handleBack = () => {
    if (showCustomInput) { setShowCustomInput(false); setCustomInput(''); return; }
    if (step > 0) { setAnimateOut(true); setTimeout(() => { setStep(prev => prev - 1); setAnimateOut(false); }, 300); }
  };

  const CurrentIcon = questions[step].icon;
  const progressPercent = ((step + 1) / questions.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,15,36,0.75)', backdropFilter: 'blur(12px)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden" style={{ animation: 'modalIn .3s ease' }}>
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #0b3d7b 30%, #094e8a 60%, #085c96 100%)' }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full border-4 border-white/20 animate-pulse" style={{ transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full border-4 border-white/20 animate-pulse" style={{ transform: 'translate(-20%, 20%)', animationDelay: '1s' }} />
          </div>
          <div className="relative z-10 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm"><Clock size={20} className="text-white" /></div>
                <span className="font-bold text-xl text-white">One Time</span>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition text-white/80"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm"><CurrentIcon size={22} className="text-sky-300" /></div>
              <div><h3 className="text-xl font-black text-white">{questions[step].question}</h3><p className="text-sky-200/80 text-sm">{questions[step].subtitle}</p></div>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <span className="text-xs text-sky-200/60 font-medium">Question {step + 1}/{questions.length}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' }} /></div>
              <span className="text-xs text-sky-200/60 font-medium">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>
        <div className="p-8">
          {(step > 0 || showCustomInput) && (
            <button onClick={handleBack} className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-sky-600 transition"><ArrowLeft size={14} />Retour</button>
          )}
          <div style={{ opacity: animateOut ? 0 : 1, transform: animateOut ? 'translateX(-20px)' : 'translateX(0)', transition: 'all .3s ease' }}>
            {showCustomInput ? (
              <div className="space-y-4" style={{ animation: 'fadeInUp .3s ease' }}>
                <div className="p-4 rounded-2xl bg-sky-50 border-2 border-sky-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0 mt-0.5"><Edit3 size={18} className="text-sky-600" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-sky-900 mb-1">Votre réponse personnalisée</p>
                      <p className="text-xs text-sky-600 mb-3">Écrivez votre réponse ci-dessous</p>
                      <div className="relative">
                        <input type="text" value={customInput} onChange={(e) => setCustomInput(e.target.value)} onKeyDown={handleCustomKeyDown}
                          placeholder="Votre réponse..." className="w-full px-4 py-3 pr-12 border-2 border-sky-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all bg-white" autoFocus />
                        <button onClick={handleCustomSubmit} disabled={!customInput.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"><Send size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Bouton Passer dans le champ personnalisé */}
                <button onClick={handleSkip} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition py-2">
                  Passer cette question →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions[step].options.map((option, index) => (
                  <button key={option.value} onClick={() => handleOptionSelect(option)}
                    className="w-full text-left px-5 py-4 rounded-2xl border-2 border-gray-100 hover:border-sky-300 hover:bg-sky-50/50 transition-all duration-200 group flex items-center justify-between"
                    style={{ animation: `fadeInUp .4s ease ${index * 0.05}s both` }}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${option.isCustom ? 'bg-orange-50 group-hover:bg-orange-100' : 'bg-gray-50 group-hover:bg-sky-100'}`}>
                        <option.icon size={18} className={`transition ${option.isCustom ? 'text-orange-500 group-hover:text-orange-600' : 'text-gray-400 group-hover:text-sky-600'}`} />
                      </div>
                      <span className={`font-semibold transition ${option.isCustom ? 'text-orange-600 group-hover:text-orange-700' : 'text-gray-700 group-hover:text-sky-700'}`}>{option.label}</span>
                    </div>
                    {option.isCustom ? (
                      <div className="flex items-center gap-2"><span className="text-xs text-orange-500 font-medium">Écrire</span><Edit3 size={16} className="text-orange-400 group-hover:text-orange-500 transition-transform group-hover:scale-110" /></div>
                    ) : (
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-sky-500 transition-transform group-hover:translate-x-1" />
                    )}
                  </button>
                ))}
                
                {/* Bouton Passer */}
                <button onClick={handleSkip} 
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-500 transition py-3 mt-2 hover:bg-gray-50 rounded-xl"
                  style={{ animation: 'fadeInUp .4s ease 0.3s both' }}>
                  Passer cette question →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Login Modal ───────────────────────────────────────────────────────────────
function LoginModal({ onClose, onSwitchToRegister }: {
  onClose: () => void;
  onSwitchToRegister: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await response.json();
      if (response.ok && result.token && result.user) {
        if (result.user.companyName) localStorage.setItem('companyName', result.user.companyName);
        login(mapAuthUser(result.user), result.token);
        toast.success('Connexion réussie !');
        onClose();
        // Force la redirection avec window.location
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 300);
      } else {
        toast.error(result.message || 'Email ou mot de passe incorrect');
      }
    } catch {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.open('https://accounts.google.com/signin', '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,15,36,0.65)', backdropFilter: 'blur(10px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex" style={{ animation: 'modalIn .3s ease' }}>
        <div className="hidden md:flex w-1/2 items-center justify-center p-5 bg-gray-50">
          <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-lg">
            <img
              src="/login-page.jpeg"
              alt="One Time — Pointage intelligent"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sky-900/50 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2">
                <div className="w-7 h-7 rounded-lg dark-gradient flex items-center justify-center">
                  <Clock size={13} className="text-white" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-900">One Time</div>
                  <div className="text-[9px] text-gray-500">Pointage intelligent</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <div className="px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #094e8a 100%)' }}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">Content de vous revoir ! 👋</h3>
                <p className="text-sky-200/80 text-xs">Connectez-vous à One Time</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/20 transition md:hidden"
              >
                <X size={14} className="text-white/80" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:border-sky-300 hover:bg-sky-50 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Se connecter avec Google
            </button>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 transition-all"
                placeholder="Email professionnel"
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-sky-400 transition-all pr-10"
                  placeholder="Mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white rounded-lg font-bold text-sm transition-all hover:shadow-lg disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #094e8a 100%)' }}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
            <p className="text-center text-xs text-gray-500">
              Pas encore de compte ?{' '}
              <button onClick={onSwitchToRegister} className="font-bold text-sky-600 hover:text-sky-700">
                Créer un compte
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Register Modal (design premium avec étapes de guidage) ────────────────────
function RegisterModal({ plan, billingCycle, onClose, onSwitchToLogin }: {
  plan?: Plan;
  billingCycle?: 'monthly' | 'annual';
  onClose: () => void;
  onSwitchToLogin: () => void;
}) {
  const login = useAuthStore(s => s.login);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ companyName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const checks = validatePassword(formData.password);
  const passwordValid = Object.values(checks).every(Boolean);

  const generateMockToken = (companyName: string) => {
    const payload = { sub: '1', role: 'superadmin', companyName, exp: Math.floor(Date.now() / 1000) + (8 * 3600), iat: Math.floor(Date.now() / 1000) };
    const base64Payload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.mock-signature-for-demo`;
  };

  const validateStep = (currentStep: number) => {
    const e: Record<string, string> = {};
    if (currentStep === 1 && !formData.companyName.trim()) e.companyName = "Le nom de l'entreprise est requis";
    if (currentStep === 2 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Email valide requis';
    if (currentStep === 3 && !passwordValid) e.password = 'Mot de passe trop faible';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (validateStep(step)) {
      setStep(prev => prev + 1);
      setErrors({});
    }
  };

  const handleBack = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setStep(prev => prev - 1);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/entreprises/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: formData.companyName,
          email: formData.email,
          password: formData.password,
          plan_id: plan?.id ?? 1,
          billing_cycle: billingCycle ?? 'monthly',
        }),
      });
      const result = await response.json();

      if (response.ok) {
        localStorage.setItem('companyName', formData.companyName);
        const newUser: User = {
          id: result.entreprise?.id ?? 'new-1',
          firstName: 'Admin',
          lastName: formData.companyName,
          email: formData.email,
          role: 'superadmin',
          service: 'Direction',
          active: true,
          companyName: formData.companyName,
          entrepriseId: result.entreprise?.id ?? 'new-1',
          adminPermissions: { canPoint: true, canApplySanctions: true, canValidateAbsences: true, canManageEmployees: true },
        };
        login(newUser, result.token ?? generateMockToken(formData.companyName));
        toast.success(`Bienvenue ${formData.companyName} !`);
        onClose();
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 300);
        return;
      }

      if (response.status === 409) {
        setErrors({ email: 'Cet email est déjà utilisé' });
        setStep(2);
      } else {
        toast.error(result.message || "Erreur lors de l'inscription");
      }
    } catch {
      toast.error('Impossible de joindre le serveur. Vérifiez votre connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = () => { window.open('https://accounts.google.com/signup', '_blank'); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,15,36,0.65)', backdropFilter: 'blur(10px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ animation: 'modalIn .3s ease' }}>
        
        {/* Header */}
        <div className="px-6 py-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #094e8a 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full border-2 border-white/10" style={{ transform: 'translate(30%, -30%)' }} />
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="text-lg font-black">Créer un compte</h3>
              <p className="text-sky-200/80 text-xs">
                {plan ? `Plan ${plan.nom}` : 'Démarrez gratuitement'}
              </p>
            </div>
            <button onClick={onClose} aria-label="Fermer" className="w-7 h-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/20 transition">
              <X size={14} className="text-white/80" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-100 mb-3">
              <Sparkles size={12} className="text-sky-500" />
              <span className="text-[11px] font-semibold text-sky-700">Vous êtes une nouvelle entreprise ?</span>
            </div>
            <p className="text-sm text-gray-500">Laissez-moi vous guider</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  s === step ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/30 scale-110' :
                  s < step ? 'bg-emerald-500 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {s < step ? <Check size={14} /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-8 h-0.5 mx-1 transition-all duration-300 ${s < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mb-6">
            <span className="text-xs font-semibold text-gray-600">
              {step === 1 ? "Nom de l'entreprise" : step === 2 ? 'Email professionnel' : 'Mot de passe'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nom de l'entreprise</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Building2 size={16} /></div>
                  <input type="text" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all ${errors.companyName ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} 
                    placeholder="Ex: Digital Afrika" autoFocus />
                </div>
                {errors.companyName && <p className="text-red-500 text-xs mt-1.5">{errors.companyName}</p>}
              </div>
            )}

            {step === 2 && (
              <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email professionnel</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Mail size={16} /></div>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleNext(); } }}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} 
                    placeholder="contact@entreprise.com" autoFocus />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
              </div>
            )}

            {step === 3 && (
              <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={16} /></div>
                  <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition-all ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} 
                    placeholder="8+ caractères" autoFocus />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password}</p>}
                {formData.password && (
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {[{ key: 'length' as const, label: '8+ caractères' }, { key: 'uppercase' as const, label: '1 majuscule' }, { key: 'number' as const, label: '1 chiffre' }, { key: 'symbol' as const, label: '1 symbole' }].map(({ key, label }) => (
                      <div key={key} className={`flex items-center gap-1.5 text-xs ${checks[key] ? 'text-emerald-600' : 'text-gray-400'}`}><Check size={10} />{label}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button type="button" onClick={handleBack} className="px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">Retour</button>
              )}
              {step < 3 ? (
                <button type="button" onClick={handleNext} className="flex-1 py-3 text-white rounded-xl font-bold text-sm transition-all hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #094e8a 100%)' }}>Continuer</button>
              ) : (
                <button type="submit" disabled={submitting} className="flex-1 py-3 text-white rounded-xl font-bold text-sm transition-all hover:shadow-lg disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #094e8a 100%)' }}>
                  {submitting ? 'Création...' : "S'inscrire"}
                </button>
              )}
            </div>
          </form>

          <div className="flex items-center gap-3 my-5"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">ou</span><div className="flex-1 h-px bg-gray-200" /></div>

          <button type="button" onClick={handleGoogleRegister} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:border-sky-300 hover:bg-sky-50 transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            S'inscrire avec Google
          </button>

          <p className="text-center text-xs text-gray-500 mt-5">
            Déjà un compte ?{' '}
            <button type="button" onClick={onSwitchToLogin} className="font-bold text-sky-600 hover:text-sky-700">Se connecter</button>
          </p>
        </div>
      </div>
    </div>
  );
}


// ── MAIN LANDING ──────────────────────────────────────────────────────────────
export default function Landing() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerPlan, setRegisterPlan] = useState<Plan | null | undefined>(undefined);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [scrolled, setScrolled] = useState(false);
  const [qualificationOpen, setQualificationOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [heroTextIndex, setHeroTextIndex] = useState(0);

  const heroPhrases = useMemo(() => [
    { title: 'Le pointage nouvelle génération pour', highlight: 'votre entreprise', desc: 'One Time révolutionne la gestion du temps de travail. Suivez les heures en temps réel, automatisez vos rapports et réduisez les erreurs de paie.' },
    { title: 'Simplifiez la gestion du temps de', highlight: 'vos équipes', desc: 'Fini les feuilles de présence papier et les calculs complexes. One Time automatise tout pour vous faire gagner des heures chaque semaine.' },
    { title: 'Plus de 500 entreprises font confiance à', highlight: 'One Time', desc: "Rejoignez les leaders qui ont déjà adopté notre solution : 30% de temps gagné, 0 erreur de paie, 100% de conformité." },
  ], []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    const textInterval = setInterval(() => {
      setHeroTextIndex(prev => (prev + 1) % heroPhrases.length);
    }, 5000);
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(textInterval);
    };
  }, [heroPhrases.length]);

  const getPlanPrice = (plan: Plan) => billingCycle === 'monthly' ? plan.prix : plan.prixAnnuel;

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setQualificationOpen(true);
  };

  const handleQualificationComplete = (_answers: Record<string, string>) => {
    setQualificationOpen(false);
    setRegisterPlan(selectedPlan);
  };

  // registerPlan === undefined = modal closed, null = open without plan, Plan = open with plan
  const registerModalOpen = registerPlan !== undefined;

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes floatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes floatX { 0%,100%{transform:translateX(0)} 50%{transform:translateX(10px)} }
        @keyframes modalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes dashDraw { to{stroke-dashoffset:0} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
        @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        html { scroll-behavior: smooth; }
        .float { animation: float 5s ease-in-out infinite; }
        .float2 { animation: float 7s ease-in-out 1s infinite; }
        .float3 { animation: floatSlow 6s ease-in-out 2s infinite; }
        .floatX { animation: floatX 4s ease-in-out infinite; }
        .hero-bg { background: linear-gradient(160deg, #f0f6fc 0%, #f8fbfe 30%, #f3f7fc 60%, #ffffff 100%); }
        .dark-gradient { background: linear-gradient(135deg, #0c2d5e 0%, #0b3d7b 30%, #094e8a 60%, #085c96 100%); }
        .dark-gradient-2 { background: linear-gradient(135deg, #08192e 0%, #0c2d5e 50%, #094e8a 100%); }
        .animated-gradient { background: linear-gradient(270deg, #0c2d5e, #094e8a, #085c96, #0ea5e9); background-size: 300% 300%; animation: gradient-shift 6s ease infinite; }
        .card-hover { transition: all .3s cubic-bezier(0.4,0,0.2,1); }
        .card-hover:hover { transform: translateY(-6px); box-shadow: 0 25px 50px rgba(8,92,150,.15); }
        .feature-card:hover .feature-icon { transform: scale(1.15) rotate(-5deg); }
        .feature-icon { transition: all .3s cubic-bezier(0.4,0,0.2,1); }
        .nav-link { position: relative; }
        .nav-link::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:2px; background:linear-gradient(90deg,#0ea5e9,#085c96); transition:width .3s; }
        .nav-link:hover::after { width:100%; }
        .glow { box-shadow: 0 0 60px rgba(8,92,150,.15); }
        .dot-pulse { animation: pulse-dot 2s ease-in-out infinite; }
        .dot-pulse:nth-child(2) { animation-delay: 0.3s; }
        .dot-pulse:nth-child(3) { animation-delay: 0.6s; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/98 shadow-sm border-b border-gray-100 backdrop-blur-xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center dark-gradient"><Clock size={17} className="text-white" /></div>
            <span className="text-xl font-black tracking-tight text-gray-900">One Time</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {([['Fonctionnalités', '#features'], ['Tarifs', '#plans'], ['Solutions', '#solutions']] as const).map(([label, href]) => (
              <a key={label} href={href} className="nav-link text-gray-600 hover:text-gray-900 transition py-1">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLoginOpen(true)} className="text-sm font-semibold text-gray-700 hover:text-sky-600 transition px-4 py-2 rounded-xl hover:bg-sky-50">
              Se connecter
            </button>
            <button onClick={() => setRegisterPlan(null)} className="text-sm font-bold text-white px-5 py-2.5 rounded-xl animated-gradient hover:shadow-lg hover:shadow-sky-900/25 transition-all">
              S'inscrire
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero-bg pt-28 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 animate-pulse" style={{ background: 'radial-gradient(circle, #085c96 0%, transparent 70%)', animationDuration: '4s' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-3xl opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)', animationDuration: '5s', animationDelay: '2s' }} />
        <div className="absolute top-1/4 left-10 w-3 h-3 rounded-full bg-sky-400/30 dot-pulse" />
        <div className="absolute top-1/3 right-20 w-2 h-2 rounded-full bg-sky-500/40 dot-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-2.5 h-2.5 rounded-full bg-sky-300/30 dot-pulse" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="pt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 border" style={{ background: '#f0f6fc', color: '#085c96', borderColor: '#b8d8f0' }}>
                <Sparkles size={14} className="animate-pulse" />La solution de pointage nouvelle génération
              </div>
              <div className="relative min-h-[200px]">
                {heroPhrases.map((phrase, index) => (
                  <div
                    key={index}
                    className="absolute inset-0 transition-all duration-700"
                    style={{ opacity: heroTextIndex === index ? 1 : 0, transform: `translateY(${heroTextIndex === index ? 0 : 20}px)`, pointerEvents: heroTextIndex === index ? 'auto' : 'none' }}
                  >
                    <h1 className="text-5xl lg:text-6xl font-black leading-[1.08] mb-6 text-gray-900">
                      {phrase.title}{' '}
                      <span className="animated-gradient bg-clip-text" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {phrase.highlight}
                      </span>
                    </h1>
                    <p className="text-gray-500 text-lg mb-3 max-w-lg leading-relaxed">{phrase.desc}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2.5 mb-8 mt-[180px]">
                {[
                  "Pointage en 1 clic depuis n'importe quel appareil",
                  'Données 100% sécurisées et conformes aux normes',
                  'Rapports détaillés pour piloter votre masse salariale',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#e0f0fa' }}>
                      <Check size={12} style={{ color: '#085c96' }} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-7 py-4 text-white font-bold rounded-xl text-sm dark-gradient hover:shadow-lg hover:shadow-sky-900/30 transition-all flex items-center gap-2 group"
                >
                  Commencer maintenant <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="flex gap-2">
                {heroPhrases.map((_, index) => (
                  <button
                    key={index}
                    aria-label={`Phrase héro ${index + 1}`}
                    onClick={() => setHeroTextIndex(index)}
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: heroTextIndex === index ? 32 : 8, background: heroTextIndex === index ? '#085c96' : '#d1d5db' }}
                  />
                ))}
              </div>
            </div>
            <div className="lg:sticky lg:top-28">
              <AppCarousel />
              <div className="absolute -bottom-4 -left-4 z-10 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-3 float" style={{ border: '1px solid #b8d8f0' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0f6fc' }}>
                  <QrCode size={18} style={{ color: '#085c96' }} />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Dernier pointage</div>
                  <div className="text-sm font-bold text-gray-900">Bureau Principal</div>
                  <div className="text-xs font-semibold" style={{ color: '#085c96' }}>08:00:45 ✓</div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 z-10 bg-white rounded-2xl shadow-lg p-3 float2" style={{ border: '1px solid #b8d8f0' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7' }}>
                    <TrendingUp size={14} style={{ color: '#16a34a' }} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Productivité</div>
                    <div className="text-sm font-black" style={{ color: '#16a34a' }}>+23%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIDEO SECTION ── */}
      {/* FIX: using the proper BackgroundVideoSection component */}
      <BackgroundVideoSection />

      {/* ── PLANS ── */}
      <section id="plans" className="py-24 px-6" style={{ background: '#f8fbfe' }}>
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ background: '#f0f6fc', color: '#085c96' }}>
              <Briefcase size={14} />Nos offres
            </div>
            <h2 className="text-4xl font-black mb-3 text-gray-900">5 offres adaptées à votre structure</h2>
            <p className="text-gray-500">Choisissez le plan qui correspond à la taille et aux besoins de votre entreprise. Sans engagement.</p>
          </Reveal>
          <div className="flex justify-center mb-10">
            <div className="flex p-1.5 rounded-xl bg-gray-100 gap-1">
              {(['monthly', 'annual'] as const).map(cycle => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${billingCycle === cycle ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {cycle === 'monthly' ? 'Mensuel' : <span>Annuel <span className="text-emerald-600 text-xs font-bold">-10%</span></span>}
                </button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {PLANS_DATA.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 70}>
                <div className={`relative bg-white rounded-2xl border-2 p-5 card-hover flex flex-col h-full ${plan.popular ? 'border-sky-400 shadow-lg shadow-sky-500/10' : plan.bestValue ? 'border-emerald-400 shadow-lg shadow-emerald-500/10' : 'border-gray-100'}`}>
                  {(plan.popular || plan.bestValue) && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white ${plan.popular ? 'dark-gradient' : 'bg-emerald-500'}`}>
                      {plan.popular ? '⭐ Le plus choisi' : '🏆 Meilleur rapport'}
                    </div>
                  )}
                  <div className="mb-3">
                    <h3 className="font-black text-lg text-gray-900">{plan.nom}</h3>
                    <p className="text-xs text-gray-400">Jusqu'à {plan.maxEmployes} employés</p>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-black text-gray-900">{formatPrice(getPlanPrice(plan))}</span>
                    <span className="text-gray-400 text-xs"> /mois</span>
                  </div>
                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check size={14} style={{ color: '#085c96' }} className="shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePlanSelect(plan)}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${plan.popular ? 'text-white dark-gradient hover:shadow-lg hover:shadow-sky-900/25' : plan.bestValue ? 'text-white bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-100 text-gray-700 hover:bg-sky-50 hover:text-sky-600'}`}
                  >
                    Essayer gratuitement
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={300} className="mt-10">
            <div className="rounded-2xl p-8 text-white dark-gradient-2 text-center">
              <h3 className="text-2xl font-black mb-2">Plus de 500 employés ?</h3>
              <p className="text-sky-200/80 mb-4">Nous créons une offre sur mesure pour les grandes organisations.</p>
              <a href="mailto:contact@onetime.com" className="inline-flex items-center gap-2 px-8 py-3 bg-white rounded-xl text-sm font-bold text-sky-800 hover:bg-sky-50 transition-all">
                Contacter notre équipe <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ background: '#f0f6fc', color: '#085c96' }}>
              <Zap size={14} />Fonctionnalités principales
            </div>
            <h2 className="text-4xl font-black mb-4 text-gray-900">Une plateforme complète pour votre gestion du temps</h2>
            <p className="text-gray-500 text-lg">One Time centralise tous vos besoins de pointage, planification et reporting dans une interface intuitive.</p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="feature-card group p-6 bg-white rounded-2xl border-2 border-gray-100 card-hover cursor-default hover:border-sky-200">
                  <div className="feature-icon w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#f0f6fc' }}>
                    <f.icon size={20} style={{ color: '#085c96' }} />
                  </div>
                  <h3 className="font-black text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{f.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {f.details.map((detail, j) => (
                      <span key={j} className="text-xs font-medium px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">{detail}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHONE MOCKUP SECTION ── */}
      <section className="py-20 px-6" style={{ background: '#f8fbfe' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div>
                <h2 className="text-4xl font-black mb-6 text-gray-900">
                  Le pointage{' '}
                  <span className="animated-gradient bg-clip-text" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>simplifié</span>
                  {' '}pour vos équipes
                </h2>
                <p className="text-gray-500 text-lg mb-6 leading-relaxed">
                  Vos employés pointent en un scan depuis leur téléphone. Simple, rapide et sans erreur. Fini les feuilles de présence et les oublis.
                </p>
                <div className="space-y-3">
                  {['Scan QR code en 1 seconde', 'Fonctionne sur tous les smartphones', 'Mode hors-ligne inclus', 'Notifications de rappel automatiques'].map(item => (
                    <div key={item} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#dcfce7' }}>
                        <Check size={12} style={{ color: '#16a34a' }} />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="relative flex items-center justify-center py-8">
                <PhoneMockup />
                <div className="absolute -bottom-2 -left-2 md:-bottom-6 md:-left-6 bg-white rounded-2xl shadow-xl p-3 md:p-4 border border-gray-100 float z-10">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center dark-gradient">
                      <QrCode size={16} className="text-white" />
                    </div>
                    <div>
                      <div className="text-[10px] md:text-xs text-gray-400">Taux d'adoption</div>
                      <div className="text-base md:text-lg font-black text-gray-900">98%</div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ background: '#f0f6fc', color: '#085c96' }}>
              <Timer size={14} />Démarrage rapide
            </div>
            <h2 className="text-4xl font-black mb-4 text-gray-900">Opérationnel en moins de 10 minutes</h2>
            <p className="text-gray-500 text-lg">Pas de formation nécessaire. One Time est conçu pour être utilisé immédiatement par tous vos collaborateurs.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: UserPlus, title: 'Créez votre compte', desc: "Inscrivez votre entreprise en 2 minutes. Aucune carte bancaire requise pour l'essai de 14 jours." },
              { step: '02', icon: Users, title: 'Ajoutez vos équipes', desc: 'Importez vos employés en masse ou un par un. Définissez leurs horaires, rôles et permissions.' },
              { step: '03', icon: QrCode, title: 'Commencez le pointage', desc: 'Vos équipes pointent en 1 clic. Vous suivez tout en temps réel depuis le dashboard.' },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 card-hover">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl font-black text-white dark-gradient">{item.step}</div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#f0f6fc' }}>
                    <item.icon size={18} style={{ color: '#085c96' }} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION IMAGE DASHBOARD ── */}
<section className="py-20 px-6" style={{ background: '#f8fbfe' }}>
  <div className="max-w-7xl mx-auto">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <Reveal delay={200} className="order-2 md:order-1">
        <div className="relative group">
          {/* Effet glow derrière l'image */}
          <div className="absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"
            style={{ background: 'radial-gradient(circle, rgba(8,92,150,0.3) 0%, transparent 70%)' }} />
          
          {/* Image avec animations */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-sky-500/20"
            style={{ maxHeight: '500px' }}>
            <img 
              src="/Dashboard.jpeg"
              alt="Dashboard One Time" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ maxHeight: '500px' }}
            />
            
            {/* Overlay gradient animé */}
            <div className="absolute inset-0 bg-gradient-to-t from-sky-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Points lumineux animés */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-500">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white font-medium bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">Live</span>
            </div>
          </div>

          {/* Badge flottant animé */}
          <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 float2 z-10 hover:scale-105 transition-transform duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                <TrendingUp size={18} className="animate-pulse" style={{ color: '#16a34a' }} />
              </div>
              <div>
                <div className="text-xs text-gray-400">Temps gagné</div>
                <div className="text-lg font-black" style={{ color: '#16a34a' }}>+30%</div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
      
      <Reveal className="order-1 md:order-2">
        <div>
          <h2 className="text-4xl font-black mb-6 text-gray-900">Un dashboard <span className="animated-gradient bg-clip-text" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>puissant</span> pour piloter votre activité</h2>
          <p className="text-gray-500 text-lg mb-6 leading-relaxed">Visualisez en un coup d'œil les présences, retards et heures travaillées. Exportez vos rapports en un clic pour la paie.</p>
          <div className="space-y-3">
            {['Tableaux de bord personnalisables', 'KPIs en temps réel', 'Exports multi-formats (PDF, Excel, CSV)', 'Historique illimité'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-medium text-gray-700 group cursor-default">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110" style={{ background: '#dcfce7' }}>
                  <Check size={12} style={{ color: '#16a34a' }} />
                </div>
                <span className="group-hover:text-gray-900 transition-colors">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  </div>
</section>

      {/* ── SOLUTIONS ── */}
      <section id="solutions" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ background: '#f0f6fc', color: '#085c96' }}>
              <Building2 size={14} />Tous secteurs d'activité
            </div>
            <h2 className="text-4xl font-black mb-4 text-gray-900">
              Adapté à{' '}
              <span className="animated-gradient bg-clip-text" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>votre secteur</span>
              {' '}d'activité
            </h2>
            <p className="text-gray-500 text-lg">Que vous soyez dans le BTP, la santé, l'industrie ou les services, One Time s'adapte à vos contraintes spécifiques.</p>
          </Reveal>
          <div className="grid grid-cols-4 gap-3 mb-10">
            {SECTORS.map(s => (
              <div key={s} className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-gray-100 text-center card-hover cursor-default hover:border-sky-200">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0f6fc' }}>
                  <Building2 size={16} style={{ color: '#085c96' }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 leading-tight">{s}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-6 max-w-2xl mx-auto" style={{ background: '#f0f6fc', border: '2px solid #b8d8f0' }}>
            <div className="text-4xl font-black mb-3" style={{ color: '#085c96' }}>"</div>
            <p className="text-gray-700 mb-4 leading-relaxed">
              One Time nous a permis de réduire de <strong>30%</strong> le temps consacré à la gestion des temps et d'éliminer les erreurs de paie. Un outil complet, fiable et incroyablement simple à utiliser !
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm dark-gradient">AD</div>
              <div>
                <div className="font-bold text-gray-900">— Aminata Diallo</div>
                <div className="text-sm text-gray-500">DRH — Groupe SOTRACO</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-6 dark-gradient-2">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { prefix: '+', end: 500, suffix: '', label: 'Entreprises' },
            { prefix: '+', end: 50000, suffix: '', label: 'Utilisateurs actifs' },
            { prefix: '+', end: 5, suffix: 'M', label: 'Heures pointées/mois' },
            { prefix: '', end: 99.9, suffix: '%', label: 'Disponibilité' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-4xl font-black mb-1">
                <AnimatedCounter end={s.end} suffix={s.suffix} prefix={s.prefix} />
              </div>
              <div className="text-sky-200/80 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl dark-gradient flex items-center justify-center"><Clock size={17} className="text-white" /></div>
                <span className="text-xl font-black">One Time</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">La solution de pointage intelligente qui simplifie la gestion du temps pour les entreprises de toutes tailles.</p>
            </div>
            {[
              { title: 'Produit', links: ['Fonctionnalités', 'Tarifs', 'Solutions', 'Mises à jour'] },
              { title: 'Ressources', links: ['Blog', 'Guides', "Centre d'aide", 'Webinaires'] },
              { title: 'Entreprise', links: ['À propos', 'Carrières', 'Presse', 'Contact'] },
              { title: 'Légal', links: ['Confidentialité', 'Conditions', 'Mentions légales', 'RGPD'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="font-bold text-sm mb-4 text-white">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="text-sm text-gray-400 hover:text-sky-300 transition">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} One Time. Tous droits réservés.</p>
            <div className="flex gap-3">
              {['f', 'in', 'tw', 'ig'].map(s => (
                <div key={s} className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs text-gray-400 hover:bg-sky-700 hover:text-white cursor-pointer transition-all">
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── MODALS ── */}
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onSwitchToRegister={() => { setLoginOpen(false); setRegisterPlan(null); }}
        />
      )}
      {registerModalOpen && (
        <RegisterModal
          plan={registerPlan ?? undefined}
          billingCycle={billingCycle}
          onClose={() => setRegisterPlan(undefined)}
          onSwitchToLogin={() => { setRegisterPlan(undefined); setLoginOpen(true); }}
        />
      )}
      {qualificationOpen && selectedPlan && (
        <QualificationModal
          onComplete={handleQualificationComplete}
          onClose={() => setQualificationOpen(false)}
        />
      )}
    </div>
  );
}