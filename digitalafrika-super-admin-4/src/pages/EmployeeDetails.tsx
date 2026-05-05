import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card } from '../components/ui/LayoutComponents';
import { fetchEmployeeDetails, EmployeeDetailsResponse, AbsenceItem, PointageItem, SanctionItem } from '../services/superAdminApi';
import { User } from '../types';
import { formatDateTime, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, UserCircle, Mail, Briefcase, Building2, Calendar, Shield, 
  Clock, AlertTriangle, FileText, CheckCircle, XCircle, Clock4, 
  BriefcaseIcon, Ban, AlertCircle
} from 'lucide-react';

type TabType = 'overview' | 'absences' | 'pointages' | 'sanctions' | 'activity';

export default function EmployeeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { user?: User } };
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<EmployeeDetailsResponse['stats'] | null>(null);
  const [activity, setActivity] = useState<EmployeeDetailsResponse['activity']>([]);
  const [absences, setAbsences] = useState<AbsenceItem[]>([]);
  const [pointages, setPointages] = useState<PointageItem[]>([]);
  const [sanctions, setSanctions] = useState<SanctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (!id) return;
    if (location.state?.user) {
      setProfile(location.state.user);
    }

    const decodedId = decodeURIComponent(id);
    setLoading(true);
    fetchEmployeeDetails(decodedId)
      .then((data) => {
        setProfile(data.profile);
        setStats(data.stats);
        setActivity(data.activity);
        setAbsences(data.absences);
        setPointages(data.pointages);
        setSanctions(data.sanctions);
      })
      .catch(() => toast.error("Impossible de charger la fiche employé"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-slate-500">Chargement de la fiche employé...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-2 text-sm text-red-500">Employé introuvable.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/users')}>
            Retour aux utilisateurs
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Vue d\'ensemble', icon: UserCircle, count: null },
    { id: 'absences' as TabType, label: 'Absences', icon: Calendar, count: stats?.totalAbsences },
    { id: 'pointages' as TabType, label: 'Pointages', icon: Clock, count: stats?.totalPointages },
    { id: 'sanctions' as TabType, label: 'Sanctions', icon: AlertTriangle, count: stats?.totalSanctions },
    { id: 'activity' as TabType, label: 'Activité', icon: FileText, count: activity.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/users')} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-xs text-slate-500 font-medium uppercase mt-1">
              {profile.role === 'admin' ? 'Administrateur RH' : 'Employé'} • {profile.service}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={profile.active ? 'success' : 'error'}>
            {profile.active ? 'Actif' : 'Désactivé'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Calendar} 
          label="Absences" 
          value={stats?.totalAbsences || 0} 
          subValue={`${stats?.joursAbsence || 0} jours`}
          color="amber"
        />
        <StatCard 
          icon={Clock} 
          label="Pointages" 
          value={stats?.totalPointages || 0} 
          subValue={`${stats?.heuresTravaillees || '0'} h travaillées`}
          color="blue"
        />
        <StatCard 
          icon={Clock4} 
          label="Heures Sup." 
          value={stats?.heuresSup || '0'} 
          subValue="heures"
          color="purple"
        />
        <StatCard 
          icon={AlertTriangle} 
          label="Sanctions" 
          value={stats?.totalSanctions || 0} 
          subValue="enregistrement(s)"
          color="red"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 py-4 px-1 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab profile={profile} stats={stats} />}
        {activeTab === 'absences' && <AbsencesTab absences={absences} />}
        {activeTab === 'pointages' && <PointagesTab pointages={pointages} />}
        {activeTab === 'sanctions' && <SanctionsTab sanctions={sanctions} />}
        {activeTab === 'activity' && <ActivityTab activity={activity} />}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }: { 
  icon: typeof Clock; 
  label: string; 
  value: string | number; 
  subValue: string;
  color: 'blue' | 'amber' | 'purple' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <Icon size={24} className="opacity-70" />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs opacity-80">{label}</p>
        </div>
      </div>
      <p className="mt-2 text-xs opacity-70">{subValue}</p>
    </div>
  );
}

function OverviewTab({ profile, stats }: { profile: User; stats: EmployeeDetailsResponse['stats'] | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Informations personnelles" className="shadow-sm">
        <div className="space-y-4">
          <InfoRow icon={UserCircle} label="Nom complet" value={`${profile.firstName} ${profile.lastName}`} />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          <InfoRow icon={Briefcase} label="Poste" value={profile.poste || 'Non spécifié'} />
          <InfoRow icon={Building2} label="Service" value={profile.service} />
          <InfoRow icon={Shield} label="Rôle" value={profile.role === 'admin' ? 'Administrateur RH' : 'Employé'} />
          <InfoRow icon={Calendar} label="ID Employé" value={profile.id} />
          <InfoRow icon={Calendar} label="Date de création" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('fr-FR') : '-'} />
        </div>
      </Card>

      <Card title="Résumé de l'activité" className="shadow-sm">
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Total jours d'absence</span>
            <span className="text-lg font-bold text-slate-800">{stats?.joursAbsence || 0} jours</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Heures travaillées</span>
            <span className="text-lg font-bold text-slate-800">{stats?.heuresTravaillees || '0'} h</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Heures supplémentaires</span>
            <span className="text-lg font-bold text-purple-600">{stats?.heuresSup || '0'} h</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Sanctions actives</span>
            <span className="text-lg font-bold text-red-600">{stats?.totalSanctions || 0}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AbsencesTab({ absences }: { absences: AbsenceItem[] }) {
  if (absences.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl">
        <Calendar className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">Aucune absence enregistrée.</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Type</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Période</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Durée</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Statut</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Validé par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {absences.map((absence) => (
              <tr key={absence.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-slate-700 capitalize">
                    {absence.type.replace(/_/g, ' ')}
                  </span>
                  {absence.motif && (
                    <p className="text-xs text-slate-400 mt-0.5">{absence.motif}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {new Date(absence.dateDebut).toLocaleDateString('fr-FR')} → {new Date(absence.dateFin).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {Math.ceil((new Date(absence.dateFin).getTime() - new Date(absence.dateDebut).getTime()) / (1000 * 60 * 60 * 24))} jours
                </td>
                <td className="px-4 py-3">
                  <AbsenceStatusBadge statut={absence.statut} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {absence.validePar || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PointagesTab({ pointages }: { pointages: PointageItem[] }) {
  if (pointages.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl">
        <Clock className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">Aucun pointage enregistré.</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Date</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Entrée</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Sortie</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Type</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Heures</th>
              <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Sup.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pointages.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-700">
                  {new Date(p.date).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{p.entree || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{p.sortie || '-'}</td>
                <td className="px-4 py-3">
                  <PointageTypeBadge type={p.type} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{p.heuresTravaillees}h</td>
                <td className="px-4 py-3 text-sm font-medium text-purple-600">
                  {p.heuresSup > 0 ? `+${p.heuresSup}h` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SanctionsTab({ sanctions }: { sanctions: SanctionItem[] }) {
  if (sanctions.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl">
        <CheckCircle className="mx-auto h-12 w-12 text-emerald-300" />
        <p className="mt-2 text-sm text-slate-500">Aucune sanction enregistrée.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sanctions.map((sanction) => (
        <div 
          key={sanction.id} 
          className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                sanction.type === 'avertissement' ? 'bg-amber-100 text-amber-600' :
                sanction.type === 'blame' ? 'bg-orange-100 text-orange-600' :
                sanction.type === 'mise_a_pied' ? 'bg-red-100 text-red-600' :
                'bg-red-200 text-red-700'
              }`}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-800 capitalize">{sanction.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-500 mt-0.5">{sanction.motif}</p>
              </div>
            </div>
            <SanctionStatusBadge statut={sanction.statut} />
          </div>
          <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
            <span>Incident: {new Date(sanction.dateIncident).toLocaleDateString('fr-FR')}</span>
            <span>Décision: {new Date(sanction.dateDecision).toLocaleDateString('fr-FR')}</span>
            <span>Par: {sanction.decisionneePar || '-'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ activity }: { activity: EmployeeDetailsResponse['activity'] }) {
  if (activity.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl">
        <FileText className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">Aucune activité enregistrée.</p>
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
        {activity.map((item) => (
          <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">{item.action}</span>
                  <span className="text-slate-500"> — {item.details}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDateTime(item.timestamp)} • {item.actor}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-slate-400" />
      <div className="flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function AbsenceStatusBadge({ statut }: { statut: string }) {
  const variants: Record<string, { variant: 'success' | 'warning' | 'error'; label: string }> = {
    approuvee: { variant: 'success', label: 'Approuvée' },
    en_attente: { variant: 'warning', label: 'En attente' },
    rejetee: { variant: 'error', label: 'Rejetée' },
  };
  
  const { variant, label } = variants[statut] || { variant: 'warning', label: statut };
  return <Badge variant={variant}>{label}</Badge>;
}

function PointageTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    present: 'bg-emerald-100 text-emerald-700',
    absent: 'bg-red-100 text-red-700',
    retard: 'bg-amber-100 text-amber-700',
    demi_journee: 'bg-blue-100 text-blue-700',
  };
  
  const labels: Record<string, string> = {
    present: 'Présent',
    absent: 'Absent',
    retard: 'Retard',
    demi_journee: 'Mi-temps',
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-slate-100 text-slate-700'}`}>
      {labels[type] || type}
    </span>
  );
}

function SanctionStatusBadge({ statut }: { statut: string }) {
  const styles: Record<string, string> = {
    actif: 'bg-red-100 text-red-700 border-red-200',
    annule: 'bg-slate-100 text-slate-600 border-slate-200',
    archive: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  
  const labels: Record<string, string> = {
    actif: 'Active',
    annule: 'Annulée',
    archive: 'Archivée',
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[statut] || 'bg-slate-100 text-slate-600'}`}>
      {labels[statut] || statut}
    </span>
  );
}
