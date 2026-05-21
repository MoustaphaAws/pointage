import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building2,
  Check,
  Clock,
  MapPin,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';

const API_BASE = (import.meta as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || '/api';

type Plan = {
  id: number;
  nom: string;
  slug: string;
  prix: number;
  maxEmployes: number;
  fonctionnalites: Record<string, boolean>;
};

const PLAN_FEATURES: Record<
  string,
  { tagline: string; highlights: { label: string; included: boolean }[]; cta: string; recommended?: boolean }
> = {
  starter: {
    tagline: 'Pour les petites équipes',
    highlights: [
      { label: "Jusqu'à 10 employés", included: true },
      { label: 'Pointage de base', included: true },
      { label: 'Rapports simples', included: true },
      { label: 'Export Excel', included: false },
      { label: 'Géolocalisation', included: false },
    ],
    cta: 'Commencer gratuitement',
  },
  pro: {
    tagline: 'Pour les équipes en croissance',
    recommended: true,
    highlights: [
      { label: "Jusqu'à 50 employés", included: true },
      { label: 'Pointage avancé', included: true },
      { label: 'Rapports avancés', included: true },
      { label: 'Export Excel', included: true },
      { label: 'Géolocalisation', included: true },
    ],
    cta: 'Essai gratuit 14 jours',
  },
  enterprise: {
    tagline: 'Pour les grandes entreprises',
    highlights: [
      { label: 'Employés illimités', included: true },
      { label: 'Toutes les fonctionnalités', included: true },
      { label: 'API personnalisée', included: true },
      { label: 'Support dédié', included: true },
      { label: 'Personnalisation', included: true },
    ],
    cta: "S'inscrire",
  },
};

function formatPrice(prix: number) {
  if (prix === 0) return 'Gratuit';
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

export default function Landing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checks = validatePassword(password);
  const passwordValid = Object.values(checks).every(Boolean);

  useEffect(() => {
    fetch(`${API_BASE}/plans`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  const openRegister = (plan: Plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
    setEmailError('');
  };

  const closeRegister = () => {
    setModalOpen(false);
    setSelectedPlan(null);
    setCompanyName('');
    setEmail('');
    setPassword('');
    setEmailError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (!companyName.trim() || companyName.trim().length < 2) {
      toast.error("Veuillez entrer un nom d'entreprise valide");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Veuillez entrer un email valide');
      return;
    }
    if (!passwordValid) {
      toast.error('Le mot de passe ne respecte pas les critères de sécurité');
      return;
    }

    setSubmitting(true);
    setEmailError('');

    try {
      const response = await fetch(`${API_BASE}/entreprises/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: companyName.trim(),
          email: email.trim(),
          password,
          plan_id: selectedPlan.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || 'Entreprise créée avec succès !');
        closeRegister();
        window.location.href = '/login';
      } else if (response.status === 409 || result.code === 'EMAIL_EXISTS') {
        setEmailError(
          result.message || 'Cet email est déjà utilisé. Veuillez choisir un autre email.'
        );
      } else {
        toast.error(result.message || "Erreur lors de l'inscription");
      }
    } catch {
      toast.error('Erreur de connexion au serveur. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayPlans =
    plans.length > 0
      ? plans
      : [
          { id: 1, nom: 'Starter', slug: 'starter', prix: 0, maxEmployes: 10, fonctionnalites: {} },
          { id: 2, nom: 'Pro', slug: 'pro', prix: 29000, maxEmployes: 50, fonctionnalites: {} },
          {
            id: 3,
            nom: 'Enterprise',
            slug: 'enterprise',
            prix: 99000,
            maxEmployes: -1,
            fonctionnalites: {},
          },
        ];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <nav className="bg-white shadow-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Clock className="text-[#1e3a5f]" size={28} />
            <span className="text-2xl font-bold text-[#1e3a5f]">OnTime</span>
          </div>
          <div className="flex gap-3">
            <Link
              to="/login"
              className="px-4 py-2 border-2 border-[#1e3a5f] text-[#1e3a5f] rounded-lg font-medium hover:bg-[#1e3a5f] hover:text-white transition"
            >
              Se connecter
            </Link>
            <a
              href="#plans"
              className="px-4 py-2 bg-[#f97316] text-white rounded-lg font-medium hover:bg-orange-600 transition"
            >
              Essai gratuit
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-sm font-medium mb-6">
            <Sparkles size={16} />
            Solution de pointage pour entreprises
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-[#1e3a5f] mb-6 leading-tight">
            Le pointage simplifié
            <br />
            pour votre entreprise
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            OnTime centralise les présences, les absences et les rapports RH.
            <br />
            Inscrivez votre entreprise en quelques minutes et démarrez l&apos;essai gratuit.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#plans"
              className="px-8 py-4 bg-[#f97316] text-white text-lg rounded-xl font-semibold hover:bg-orange-600 transition shadow-lg"
            >
              Démarrer maintenant
            </a>
            <a
              href="#plans"
              className="px-8 py-4 border-2 border-[#1e3a5f] text-[#1e3a5f] text-lg rounded-xl font-semibold hover:bg-[#1e3a5f] hover:text-white transition"
            >
              Voir les offres
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <Shield className="mx-auto text-[#1e3a5f] mb-4" size={36} />
            <h3 className="font-bold text-lg mb-2">Sécurisé</h3>
            <p className="text-gray-600 text-sm">
              Authentification JWT, mots de passe hashés et isolation par entreprise.
            </p>
          </div>
          <div className="p-6">
            <Building2 className="mx-auto text-[#1e3a5f] mb-4" size={36} />
            <h3 className="font-bold text-lg mb-2">Multi-entreprises</h3>
            <p className="text-gray-600 text-sm">
              Chaque organisation dispose de son espace et de ses employés dédiés.
            </p>
          </div>
          <div className="p-6">
            <MapPin className="mx-auto text-[#1e3a5f] mb-4" size={36} />
            <h3 className="font-bold text-lg mb-2">Pointage mobile</h3>
            <p className="text-gray-600 text-sm">
              QR code, badges RFID et suivi des retards en temps réel.
            </p>
          </div>
        </div>
      </section>

      <section id="plans" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-[#1e3a5f] mb-4">Nos offres</h2>
          <p className="text-center text-gray-600 mb-12">
            Choisissez la formule qui correspond à votre entreprise
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {displayPlans.map((plan) => {
              const meta = PLAN_FEATURES[plan.slug] || {
                tagline: '',
                highlights: [],
                cta: "S'inscrire",
              };
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl shadow-lg p-8 border-2 transition hover:-translate-y-2 hover:shadow-xl ${
                    meta.recommended
                      ? 'border-[#f97316] scale-105 relative'
                      : 'border-gray-100 hover:border-[#f97316]'
                  }`}
                >
                  {meta.recommended && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#f97316] text-white px-6 py-1 rounded-full text-sm font-bold">
                      Recommandé
                    </span>
                  )}
                  <h3 className="text-2xl font-bold text-[#1e3a5f] mb-2 mt-2">{plan.nom}</h3>
                  <p className="text-gray-500 mb-6">{meta.tagline}</p>
                  <div className="text-4xl font-bold text-[#1e3a5f] mb-6">
                    {formatPrice(plan.prix)}
                    {plan.prix > 0 && (
                      <span className="text-lg text-gray-500 font-normal">/mois</span>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {meta.highlights.map((f) => (
                      <li key={f.label} className="flex items-center gap-2 text-sm">
                        {f.included ? (
                          <Check className="text-green-500 shrink-0" size={18} />
                        ) : (
                          <X className="text-red-400 shrink-0" size={18} />
                        )}
                        {f.label}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => openRegister(plan)}
                    className={`w-full py-3 rounded-lg font-medium transition ${
                      meta.recommended
                        ? 'bg-[#f97316] text-white hover:bg-orange-600'
                        : 'bg-[#1e3a5f] text-white hover:bg-blue-900'
                    }`}
                  >
                    {meta.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {modalOpen && selectedPlan && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeRegister()}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={closeRegister}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>

            <h3 className="text-2xl font-bold text-[#1e3a5f] mb-6">Créez votre compte</h3>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l&apos;entreprise *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] focus:border-[#f97316] outline-none"
                  placeholder="ex: SenPlus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email professionnel *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none ${
                    emailError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ex: contact@senplus.com"
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f97316] outline-none"
                  placeholder="Minimum 8 caractères"
                />
                <div className="mt-2 space-y-1 text-sm">
                  <PasswordCheck ok={checks.length} label="Minimum 8 caractères" />
                  <PasswordCheck ok={checks.uppercase} label="Au moins 1 majuscule" />
                  <PasswordCheck ok={checks.number} label="Au moins 1 chiffre" />
                  <PasswordCheck ok={checks.symbol} label="Au moins 1 symbole (!@#$%^&*)" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  Offre sélectionnée :{' '}
                  <span className="font-bold text-[#1e3a5f]">{selectedPlan.nom}</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !passwordValid}
                className="w-full py-3 bg-[#f97316] text-white rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Création en cours...' : 'Créer mon compte'}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="bg-[#1e3a5f] text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-lg font-bold mb-2 flex items-center justify-center gap-2">
            <Clock size={20} /> OnTime
          </p>
          <p className="text-gray-300">Le pointage simplifié pour votre entreprise</p>
          <p className="text-gray-400 text-sm mt-4">
            © {new Date().getFullYear()} OnTime — DigitalAfrika. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className={ok ? 'text-green-600' : 'text-red-500'}>
      {ok ? <Check className="inline mr-1" size={14} /> : <X className="inline mr-1" size={14} />}
      {label}
    </p>
  );
}
