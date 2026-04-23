import { useEffect, useState } from 'react';
import { Card, Button } from '../components/ui/LayoutComponents';
import { Save, AlertCircle, Clock, Calendar, ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { addReferentialValue, AppSettings, defaultSettings, deleteReferentialValue, fetchReferentials, fetchSettings, saveSettings } from '../services/superAdminApi';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [services, setServices] = useState<string[]>([]);
  const [postes, setPostes] = useState<string[]>([]);
  const [newService, setNewService] = useState('');
  const [newPoste, setNewPoste] = useState('');

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
        <Card title="Règles Disciplinaires (Seuils)">
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold text-slate-700">Seuil d'Avertissement (Retards)</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">Nombre de retards mensuels autorisés.</p>
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
                <p className="text-sm font-bold text-slate-700">Seuil d'Absence Injustifiée</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-relaxed">Jours cumulés avant déclenchement de sanction.</p>
              </div>
              <input 
                type="number"
                value={settings.absenceThreshold}
                onChange={e => setSettings({...settings, absenceThreshold: Number(e.target.value)})}
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
      </div>

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
    </div>
  );
}
