import { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/ui/LayoutComponents';
import { CheckCircle2, XCircle, RotateCcw, Eye, ShieldAlert, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface RHAbsence {
  id: string;
  employeeName: string;
  typeAbsence: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  validePar: string | null;
  motif: string | null;
}

export default function RHSupervision() {
  const [absences, setAbsences] = useState<RHAbsence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAbsences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/rh-absences');
      setAbsences(response.data);
    } catch {
      // Si la route n'existe pas encore, afficher une liste vide
      setAbsences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsences();
    const timer = setInterval(fetchAbsences, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleOverride = async (id: string, newStatus: string) => {
    try {
      // Appel API réel pour outrepasser la décision
      await api.put(`/admin/rh-absences/${id}/override`, { statut: newStatus });
      toast.success(`Décision RH annulée et modifiée en : ${newStatus.toUpperCase()}`);
      fetchAbsences();
    } catch {
      toast.error('Erreur lors de la modification');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approuvee': return <Badge variant="success">Approuvée</Badge>;
      case 'rejetee': return <Badge variant="error">Rejetée</Badge>;
      case 'annulee': return <Badge variant="default">Annulée</Badge>;
      default: return <Badge variant="warning">En attente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Supervision des Actions RH</h2>
          <p className="text-xs text-slate-500 font-medium uppercase mt-1">Audit et modification des décisions administratives</p>
        </div>
        <Button variant="ghost" onClick={fetchAbsences} className="text-slate-500">
          <RotateCcw size={16} className="mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Historique des Décisions RH" className="p-0 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader className="animate-spin text-slate-400" size={24} />
                <span className="ml-3 text-slate-500 text-sm">Chargement…</span>
              </div>
            ) : absences.length === 0 ? (
              <div className="flex items-center justify-center p-12">
                <p className="text-slate-400 text-sm italic">Aucune absence traitée pour le moment.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Employé</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Type / Dates</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Validé par</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Statut</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Outrepasser</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absences.map((abs) => (
                    <tr key={abs.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800 uppercase">{abs.employeeName}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-700">{abs.typeAbsence}</p>
                        <p className="text-[10px] text-slate-400 font-medium italic mt-0.5">{abs.dateDebut} → {abs.dateFin}</p>
                      </td>
                      <td className="px-6 py-4">
                        {abs.validePar ? (
                          <p className="text-xs text-slate-600 font-medium">{abs.validePar}</p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">En attente</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {statusBadge(abs.statut)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {abs.statut !== 'en_attente' && (
                            <Button 
                              variant="ghost" 
                              className="p-2 h-9 w-9 text-amber-600 hover:bg-amber-50 rounded-lg flex items-center justify-center"
                              onClick={() => handleOverride(abs.id, 'rejetee')}
                              title="Annuler et Rejeter"
                            >
                              <XCircle size={18} />
                            </Button>
                          )}
                          <Button variant="ghost" className="p-2 h-9 w-9 flex items-center justify-center rounded-lg">
                            <Eye size={18} className="text-slate-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="Info Supervision" className="bg-blue-50 border-blue-200">
            <div className="space-y-4">
              <div className="p-4 bg-white border border-blue-100 rounded-lg flex gap-3 shadow-sm">
                <ShieldAlert className="text-blue-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-[11px] font-bold uppercase text-blue-900 tracking-tight">Contrôle SuperAdmin</p>
                  <p className="text-xs text-blue-700 leading-relaxed mt-1 italic">Vous pouvez outrepasser toute décision RH depuis ce panneau. Chaque action est journalisée dans les logs d'audit.</p>
                </div>
              </div>

              <div className="p-4 bg-white/60 border border-slate-100 rounded-lg flex gap-3 opacity-80 shadow-sm">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-[11px] font-bold uppercase text-emerald-900 tracking-tight">Traçabilité complète</p>
                  <p className="text-xs text-emerald-700 leading-relaxed mt-1 italic">Toutes les modifications sont enregistrées avec horodatage et identifiant du SuperAdmin.</p>
                </div>
              </div>

              <div className="p-4 bg-white border border-blue-100 rounded-lg">
                <p className="text-[11px] font-bold uppercase text-slate-700">Avertissements & Sanctions en temps réel</p>
                <p className="text-xs text-slate-500 mt-1">
                  Rafraîchissement automatique actif toutes les 15 secondes.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
