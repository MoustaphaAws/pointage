import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card } from '../components/ui/LayoutComponents';
import { fetchEmployeeDetails, EmployeeDetailsResponse } from '../services/superAdminApi';
import { User } from '../types';
import { formatDateTime } from '../lib/utils';
import toast from 'react-hot-toast';

export default function EmployeeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { user?: User } };
  const [profile, setProfile] = useState<User | null>(null);
  const [activity, setActivity] = useState<EmployeeDetailsResponse['activity']>([]);
  const [loading, setLoading] = useState(true);

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
        setActivity(data.activity);
      })
      .catch(() => toast.error("Impossible de charger la fiche employé"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-sm text-slate-500">Chargement de la fiche employé...</div>;
  }

  if (!profile) {
    return <div className="text-sm text-red-500">Employé introuvable.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{profile.firstName} {profile.lastName}</h2>
          <p className="text-xs text-slate-500 font-medium uppercase mt-1">Détails du profil et activité de pointage</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/users')}>Retour utilisateurs</Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <Info label="Email" value={profile.email} />
          <Info label="Rôle" value={profile.role === 'admin' ? 'Admin RH' : 'Employé'} />
          <Info label="Service" value={profile.service} />
          <Info label="Poste" value={profile.poste || '-'} />
          <Info label="Badge RFID" value={profile.badgeUid || '-'} />
          <Info label="Créé le" value={profile.createdAt ? formatDateTime(profile.createdAt) : '-'} />
          <div>
            <p className="text-xs uppercase text-slate-500 font-bold">Statut</p>
            <div className="mt-1">
              <Badge variant={profile.active ? 'success' : 'error'}>{profile.active ? 'Actif' : 'Désactivé'}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Historique d'activité">
        <div className="divide-y divide-slate-100">
          {activity.length === 0 && <p className="text-sm text-slate-500 py-4">Aucune activité disponible.</p>}
          {activity.map((item) => (
            <div key={item.id} className="py-3 text-xs">
              <p className="text-slate-700">
                <span className="font-bold">{item.action}</span> - {item.details}
              </p>
              <p className="text-slate-400 mt-1">
                {formatDateTime(item.timestamp)} • Acteur: {item.actor} • Cible: {item.target}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500 font-bold">{label}</p>
      <p className="text-sm text-slate-800 mt-1">{value}</p>
    </div>
  );
}
