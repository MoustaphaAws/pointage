import { useEffect, useState } from 'react';
import { Card, Button } from '../components/ui/LayoutComponents';
import { Save, AlertCircle, Clock, Calendar, ShieldCheck, Zap, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';
import { addReferentialValue, AppSettings, defaultSettings, deleteReferentialValue, fetchCurrentSuperAdmin, fetchReferentials, fetchSettings, saveSettings, updateCurrentSuperAdmin } from '../services/superAdminApi';
import { useAuthStore } from '../store/useAuthStore';

export default function SettingsPage() {
  const authUser = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const token = useAuthStore((state) => state.token);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [services, setServices] = useState<string[]>([]);
  const [postes, setPostes] = useState<string[]>([]);
  const [newService, setNewService] = useState('');
  const [newPoste, setNewPoste] = useState('');
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    service: '',
    poste: '',
    password: '',
  });

  useEffect(() => {
    fetchSettings()
      .then((data) => setSettings(data))
      .catch(() => toast.error("Impossible de charger la configuration"));

    fetchReferentials()
      .then((data) => {
        setServices(data.services || []);
        setPostes(data.postes || []);
      })
      .catch(() => toast.error("Impossible de charger les référentiels"));

    fetchCurrentSuperAdmin()
      .then((user) =>
        setProfileForm({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          service: user.service || '',
          poste: user.poste || '',
          password: '',
        })
      )
      .catch(() => toast.error("Impossible de charger le profil SuperAdmin"));
  }, []);

  const addValue = async (kind: 'services' | 'postes') => {
    const value = kind === 'services' ? newService.trim() : newPoste.trim();
    if (!value) return;
    try {
      const items = await addReferentialValue(kind, value);
      if (kind === 'services') {
        setServices(items);
        setNewService('');
      } else {
        setPostes(items);
        setNewPoste('');
      }
      toast.success('Valeur ajoutée');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur d'ajout");
    }
  };

  const removeValue = async (kind: 'services' | 'postes', value: string) => {
    try {
      const items = await deleteReferentialValue(kind, value);
      if (kind === 'services') {
        setServices(items);
      } else {
        setPostes(items);
      }
      toast.success('Valeur supprimée');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erreur de suppression');
    }
  };

  const handleSave = () => {
    toast.promise(
      saveSettings(settings),
      {
        loading: 'Mise à jour des règles métier...',
        success: 'Paramètres globaux mis à jour avec succès',
        error: 'Erreur lors de la sauvegarde',
      }
    );
  };

  const saveProfile = async () => {
    try {
      const updated = await updateCurrentSuperAdmin(profileForm);
      if (token) {
        login(updated, token);
      }
      setProfileForm((prev) => ({ ...prev, password: '' }));
      toast.success('Profil SuperAdmin mis à jour');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erreur de mise à jour du profil');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Paramètres de l'Entreprise</h2>
          <p className="text-xs text-slate-500 font-medium uppercase mt-1">Configuration globale des règles disciplinaires et horaires</p>
        </div>
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save size={16} />
          Enregistrer tout
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Mon Profil SuperAdmin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="px-3 py-2 bg-slate-50 rounded-md text-sm" placeholder="Prénom" value={profileForm.firstName} onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))} />
            <input className="px-3 py-2 bg-slate-50 rounded-md text-sm" placeholder="Nom" value={profileForm.lastName} onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))} />
            <input className="px-3 py-2 bg-slate-50 rounded-md text-sm md:col-span-2" placeholder="Email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} />
            <input className="px-3 py-2 bg-slate-50 rounded-md text-sm" placeholder="Service" value={profileForm.service} onChange={(e) => setProfileForm((prev) => ({ ...prev, service: e.target.value }))} />
            <input className="px-3 py-2 bg-slate-50 rounded-md text-sm" placeholder="Poste" value={profileForm.poste} onChange={(e) => setProfileForm((prev) => ({ ...prev, poste: e.target.value }))} />
            <input className="px-3 py-2 bg-slate-50 rounded-md text-sm" type="password" placeholder="Nouveau mot de passe (optionnel)" value={profileForm.password} onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))} />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={saveProfile} disabled={!profileForm.firstName || !profileForm.lastName || !profileForm.email}>
              Mettre à jour mon profil
            </Button>
          </div>
          {authUser?.email && <p className="text-[11px] text-slate-400 mt-2">Session connectée: {authUser.email}</p>}
        </Card>

        <Card title="Règles Disciplinaires (Seuils)">
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-slate-700">Retards - Seuil Rappel verbal</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">Nombre de retards mensuels à partir duquel un rappel est généré.</p>
              </div>
              <input 
                type="number" 
                value={settings.lateThreshold}
                onChange={e => setSettings({...settings, lateThreshold: Number(e.target.value)})}
                className="w-16 h-10 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors" 
              />
            </div>
            
            <div className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-slate-700">Retards - Seuil Avertissement</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">Nombre de retards mensuels à partir duquel un avertissement est généré.</p>
              </div>
              <input 
                type="number"
                value={settings.lateWarningThreshold}
                onChange={e => setSettings({...settings, lateWarningThreshold: Number(e.target.value)})}
                className="w-16 h-10 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors" 
              />
            </div>

            <div className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-slate-700">Retards - Seuil Sanction</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">Nombre de retards mensuels à partir duquel une sanction disciplinaire est générée.</p>
              </div>
              <input 
                type="number"
                value={settings.lateSanctionThreshold}
                onChange={e => setSettings({...settings, lateSanctionThreshold: Number(e.target.value)})}
                className="w-16 h-10 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors" 
              />
            </div>

            <div className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-slate-700">Absences injustifiées - Seuil Avertissement</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">Nombre d'absences injustifiées mensuelles à partir duquel un avertissement est généré.</p>
              </div>
              <input 
                type="number"
                value={settings.absenceThreshold}
                onChange={e => setSettings({...settings, absenceThreshold: Number(e.target.value)})}
                className="w-16 h-10 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors" 
              />
            </div>

            <div className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-slate-700">Absences injustifiées - Seuil Sanction</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">Nombre d'absences injustifiées mensuelles à partir duquel une sanction disciplinaire est générée.</p>
              </div>
              <input 
                type="number"
                value={settings.absenceSanctionThreshold}
                onChange={e => setSettings({...settings, absenceSanctionThreshold: Number(e.target.value)})}
                className="w-16 h-10 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors" 
              />
            </div>

            <div className="p-4 bg-amber-50 border-l-4 border-amber-400 text-amber-800 rounded-r-lg">
               <div className="flex gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <p className="text-[11px] font-bold uppercase tracking-tight">Avertissement de calcul</p>
               </div>
               <p className="text-[11px] mt-1 italic leading-relaxed opacity-90">La modification impacte rétroactivement les calculs du mois en cours.</p>
            </div>
          </div>
        </Card>

        <Card title="Horaires & Politiques">
           <div className="space-y-6 pt-2">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">Arrivée standard</p>
                </div>
                <input 
                  type="time" 
                  value={settings.defaultEntry}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 h-10 font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors" 
                  onChange={e => setSettings({...settings, defaultEntry: e.target.value})}
                />
             </div>
             
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">Départ standard</p>
                </div>
                <input 
                  type="time" 
                  value={settings.defaultExit}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 h-10 font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors" 
                  onChange={e => setSettings({...settings, defaultExit: e.target.value})}
                />
             </div>

             <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">Justificatif obligatoire</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.requireJustification}
                  onChange={e => setSettings({...settings, requireJustification: e.target.checked})}
                  className="w-5 h-5 accent-blue-600 rounded" 
                />
             </div>
           </div>
        </Card>

        <Card title="Alertes de Supervision">
           <div className="space-y-4 pt-2">
             <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center group hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Absences Prolongées</p>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">Alerte après 3 jours consécutifs sans motif.</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings.notifyOnAbsence3Days}
                  className="w-5 h-5 accent-blue-600 rounded"
                  onChange={e => setSettings({...settings, notifyOnAbsence3Days: e.target.checked})}
                />
             </div>

             <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center group hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Validations Suspectes</p>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">Alerte si validation RH sans pièces jointes.</p>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={settings.notifySuspiciousRhValidation}
                  className="w-5 h-5 accent-blue-600 rounded"
                  onChange={e => setSettings({...settings, notifySuspiciousRhValidation: e.target.checked})}
                />
             </div>
           </div>
        </Card>

        <Card title="Tableau de bord (KPI)">
          <div className="space-y-6 pt-2">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <LayoutDashboard size={16} />
              <p className="text-[11px] font-medium uppercase tracking-wide">Indicateurs globaux</p>
            </div>
            <div className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-slate-700">Retards comptés (minutes minimum)</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Un pointage du jour est compté dans le KPI « Retards » uniquement si le retard atteint au moins ce nombre de minutes (ex. 15).
                </p>
              </div>
              <input
                type="number"
                min={0}
                value={settings.dashboardLateMinutesMin}
                onChange={(e) =>
                  setSettings({ ...settings, dashboardLateMinutesMin: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-20 h-10 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
            <div className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-slate-700">Coût horaire heures sup. (FCFA)</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Taux utilisé pour estimer le coût du mois : somme des minutes d&apos;heures sup. enregistrées sur les pointages × ce taux ÷ 60.
                </p>
              </div>
              <input
                type="number"
                min={0}
                step={100}
                value={settings.overtimeHourlyRateFcfa}
                onChange={(e) =>
                  setSettings({ ...settings, overtimeHourlyRateFcfa: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-28 h-10 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-800 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
              Les <strong>heures sup. (mois)</strong> proviennent de la colonne <code className="text-[10px] bg-white px-1 rounded">heures_sup_minutes</code> des pointages (départ après l&apos;heure de fin prévue). Le coût affiché est une estimation à partir du taux ci-dessus.
            </div>
          </div>
        </Card>

        <Card title="Services (CRUD)">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Nouveau service"
                className="flex-1 px-3 py-2 bg-slate-50 rounded-md text-sm"
              />
              <Button onClick={() => addValue('services')}>Ajouter</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {services.map((value) => (
                <button key={value} onClick={() => removeValue('services', value)} className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-red-100">
                  {value} ×
                </button>
              ))}
            </div>
          </div>
        </Card>
        <Card title="Postes (CRUD)">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={newPoste}
                onChange={(e) => setNewPoste(e.target.value)}
                placeholder="Nouveau poste"
                className="flex-1 px-3 py-2 bg-slate-50 rounded-md text-sm"
              />
              <Button onClick={() => addValue('postes')}>Ajouter</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {postes.map((value) => (
                <button key={value} onClick={() => removeValue('postes', value)} className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-red-100">
                  {value} ×
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Personnalisation">
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Logo de l'entreprise</p>
                  <p className="text-[11px] text-slate-400">Affiché dans les rapports PDF. Format recommandé: PNG ou JPG, max 500KB.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 500 * 1024) {
                          toast.error('Le fichier ne doit pas dépasser 500KB');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setSettings(prev => ({ ...prev, logoBase64: reader.result as string }));
                          toast.success('Logo modifié (n\'oubliez pas de sauvegarder)');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-center hover:bg-slate-50 transition-colors">
                    Choisir un fichier
                  </div>
                </label>
                {settings.logoBase64 && (
                  <Button variant="ghost" onClick={() => {
                    setSettings(prev => ({ ...prev, logoBase64: "" }));
                    toast.success('Logo supprimé');
                  }}>
                    Supprimer
                  </Button>
                )}
              </div>
              {settings.logoBase64 && (
                <div className="mt-3 p-2 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">Aperçu:</p>
                  <img 
                    src={settings.logoBase64} 
                    alt="Logo" 
                    className="h-12 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
