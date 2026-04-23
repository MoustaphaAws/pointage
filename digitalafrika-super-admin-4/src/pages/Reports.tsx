import { useState } from 'react';
import { Card, Button, Badge } from '../components/ui/LayoutComponents';
import { FileText, Download, Table, PieChart, Filter, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportGlobalReport, fetchReferentials } from '../services/superAdminApi';
import { useEffect } from 'react';

const reportTypes = [
  { id: 'absences', title: 'Rapport d\'Absences Consolidé', desc: 'Détails des absences, justificatifs et taux par service.', icon: FileText },
  { id: 'pointages', title: 'Registre des Pointages Mensuel', desc: 'Tous les scans RFID, retards et heures supplémentaires.', icon: Table },
  { id: 'disciplinaire', title: 'Audit Disciplinaire & Sanctions', desc: 'Historique des avertissements et seuils franchis.', icon: PieChart },
];

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState('2024-04');
  const [selectedService, setSelectedService] = useState('all');
  const [services, setServices] = useState<string[]>([]);

  useEffect(() => {
    fetchReferentials()
      .then((data) => setServices(data.services || []))
      .catch(() => toast.error("Impossible de charger les services"));
  }, []);

  const handleDownload = async (type: 'absences' | 'pointages' | 'disciplinaire', format: 'pdf' | 'excel') => {
    const serverFormat = format === 'excel' ? 'csv' : 'pdf';
    try {
      const blob = await exportGlobalReport({
        type,
        format: serverFormat,
        month: selectedMonth,
        service: selectedService,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_${selectedMonth || 'all'}.${serverFormat}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Rapport téléchargé avec succès');
    } catch {
      toast.error('Erreur lors de la génération');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Centre de Reporting & Exports</h2>
          <p className="text-xs text-slate-500 font-medium uppercase mt-1">Génération de documents officiels pour la direction et la paie</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <div key={report.id}>
                  <Card className="relative hover:border-blue-200 transition-all group shadow-sm border-slate-200">
                    <div className="flex gap-5">
                      <div className="bg-slate-50 p-4 rounded-xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                        <Icon size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold uppercase text-slate-800 tracking-tight">{report.title}</h3>
                          <Badge variant="info">v2.0</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 italic leading-relaxed">{report.desc}</p>
                        
                        <div className="mt-5 flex gap-3">
                          <Button 
                            variant="secondary" 
                            className="flex items-center gap-2 py-1.5 h-9 text-[11px] font-bold"
                            onClick={() => handleDownload(report.id as 'absences' | 'pointages' | 'disciplinaire', 'excel')}
                          >
                            <Download size={14} /> EXCEL (XLSX)
                          </Button>
                          <Button 
                            variant="secondary"
                            className="flex items-center gap-2 py-1.5 h-9 text-[11px] font-bold"
                            onClick={() => handleDownload(report.id as 'absences' | 'pointages' | 'disciplinaire', 'pdf')}
                          >
                            <Download size={14} /> PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card title="Configuration d'Export" className="shadow-sm border-slate-200">
             <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Période Cible</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="month" 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-bold text-slate-800 border border-slate-100" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">Entité / Service</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 rounded-lg outline-none text-sm font-bold text-slate-800 border border-slate-100 appearance-none"
                  >
                    <option value="all">Tous les Services</option>
                    {services.map((service) => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-lg">
                   <div className="flex gap-3 text-blue-600/60">
                     <Filter size={20} className="shrink-0" />
                     <p className="text-[10px] uppercase font-bold italic leading-tight">Les filtres sélectionnés s'appliquent automatiquement à l'ensemble des exports générés.</p>
                   </div>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
