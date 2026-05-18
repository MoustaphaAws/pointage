import { useEffect, useState } from 'react';
import { Card, Button, Badge } from '../components/ui/LayoutComponents';
import { AdminPermissions, User } from '../types';
import { Plus, Search, Filter, Edit2, ShieldCheck, ShieldOff, Trash2, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { createUser, defaultAdminPermissions, fetchReferentials, fetchUsers, suspendUser, updateUser, updateUserRole } from '../services/superAdminApi';
import { useNavigate } from 'react-router-dom';

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'employee';
  service: string;
  poste: string;
  id: string;
  password: string;
  adminPermissions: AdminPermissions;
};

const clonePermissions = (permissions?: Partial<AdminPermissions>): AdminPermissions => ({
  ...defaultAdminPermissions,
  ...(permissions || {}),
});

const emptyForm: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'employee',
  service: '',
  poste: '',
  id: '',
  password: '',
  adminPermissions: clonePermissions(),
};

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [roleForm, setRoleForm] = useState<{ role: 'admin' | 'employee'; adminPermissions: AdminPermissions }>({
    role: 'employee',
    adminPermissions: clonePermissions(),
  });
  const [services, setServices] = useState<string[]>([]);
  const [postes, setPostes] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchReferentials()])
      .then(([usersData, referentials]) => {
        setUsers(usersData);
        setServices(referentials.services || []);
        setPostes(referentials.postes || []);
      })
      .catch(() => toast.error("Impossible de charger les utilisateurs"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir désactiver ce compte ?')) {
      try {
        await suspendUser(id);
        setUsers(prev => prev.map(u => u.id === id ? { ...u, active: false } : u));
        toast.success('Utilisateur désactivé avec succès');
      } catch {
        toast.error("Erreur lors de la désactivation");
      }
    }
  };

  const toggleRole = async (id: string) => {
    const current = users.find((u) => u.id === id);
    if (!current) return;
    const newRole = current.role === 'admin' ? 'employee' : 'admin';
    const nextPermissions = newRole === 'admin' ? clonePermissions(current.adminPermissions) : undefined;

    try {
      await updateUserRole(id, newRole, nextPermissions);
      setUsers(prev =>
        prev.map(u => (u.id === id ? { ...u, role: newRole, adminPermissions: nextPermissions } : u))
      );
      const refreshedUsers = await fetchUsers();
      setUsers(refreshedUsers);
      toast.success(`${current.firstName} est maintenant ${newRole === 'admin' ? 'un Administrateur RH' : 'un Employé'}`);
    } catch {
      toast.error("Erreur lors du changement de rôle");
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setForm({ ...emptyForm, adminPermissions: clonePermissions() });
    setShowCreateForm(false);
    setEditingUserId(null);
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setShowCreateForm(false);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'employee',
      service: user.service,
      poste: user.poste || '',
      id: user.id || '',
      password: '',
      adminPermissions: clonePermissions(user.adminPermissions),
    });
  };

  const saveCreate = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.service || !form.poste || !form.password) {
      toast.error('Veuillez compléter tous les champs obligatoires');
      return;
    }
    try {
      const created = await createUser({
        ...form,
        adminPermissions: form.role === 'admin' ? form.adminPermissions : undefined,
      });
      setUsers((prev) => [created, ...prev]);
      toast.success('Compte créé avec succès');
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const saveEdit = async () => {
    if (!editingUserId) return;
    try {
      await updateUser(editingUserId, {
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        service: form.service,
        poste: form.poste,
        adminPermissions: form.role === 'admin' ? form.adminPermissions : undefined,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUserId
            ? {
                ...u,
                firstName: form.firstName,
                lastName: form.lastName,
                role: form.role,
                service: form.service,
                poste: form.poste,
                adminPermissions: form.role === 'admin' ? form.adminPermissions : undefined,
              }
            : u
        )
      );
      toast.success('Profil mis à jour');
      resetForm();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const openRoleModal = (user: User) => {
    setRoleModalUser(user);
    setRoleForm({
      role: user.role === 'admin' ? 'admin' : 'employee',
      adminPermissions: clonePermissions(user.adminPermissions),
    });
  };

  const saveRoleAssignment = async () => {
    if (!roleModalUser) return;
    try {
      await updateUser(roleModalUser.id, {
        role: roleForm.role,
        adminPermissions: roleForm.role === 'admin' ? roleForm.adminPermissions : undefined,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === roleModalUser.id
            ? {
                ...u,
                role: roleForm.role,
                adminPermissions: roleForm.role === 'admin' ? roleForm.adminPermissions : undefined,
              }
            : u
        )
      );
      toast.success('Rôle et permissions mis à jour');
      setRoleModalUser(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour des rôles');
    }
  };

  const getPermissionStatus = (permissions?: AdminPermissions) => {
    const p = permissions || defaultAdminPermissions;
    const count = [p.canPoint, p.canApplySanctions, p.canValidateAbsences, p.canManageEmployees].filter(Boolean).length;
    if (count === 4) return { label: 'Complet', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (count === 0) return { label: 'Restreint', className: 'bg-rose-50 text-rose-700 border-rose-200' };
    return { label: 'Partiel', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestion Absolue</h2>
          <p className="text-xs text-slate-500 font-medium uppercase mt-1">Contrôle total des comptes (Employés & Admins RH)</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => { setShowCreateForm(true); setEditingUserId(null); setForm({ ...emptyForm, adminPermissions: clonePermissions() }); }}>
          <Plus size={16} />
          Créer un profil
        </Button>
      </div>

      {(showCreateForm || editingUserId) && (
        <Card className="border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="px-3 py-2 bg-slate-50 rounded-md text-sm" />
            <input placeholder="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="px-3 py-2 bg-slate-50 rounded-md text-sm" />
            <input placeholder="Email" value={form.email} disabled={Boolean(editingUserId)} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 bg-slate-50 rounded-md text-sm disabled:opacity-60" />
            <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="px-3 py-2 bg-slate-50 rounded-md text-sm">
              <option value="">Sélectionner service</option>
              {services.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
            <select value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} className="px-3 py-2 bg-slate-50 rounded-md text-sm">
              <option value="">Sélectionner poste</option>
              {postes.map((poste) => (
                <option key={poste} value={poste}>{poste}</option>
              ))}
            </select>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'employee' })} className="px-3 py-2 bg-slate-50 rounded-md text-sm">
              <option value="employee">Employé</option>
              <option value="admin">Admin RH</option>
            </select>
            {form.role === 'admin' && (
              <div className="md:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase">Permissions admin</p>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.adminPermissions.canPoint}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        adminPermissions: { ...prev.adminPermissions, canPoint: e.target.checked },
                      }))
                    }
                  />
                  Autoriser le pointage
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.adminPermissions.canApplySanctions}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        adminPermissions: { ...prev.adminPermissions, canApplySanctions: e.target.checked },
                      }))
                    }
                  />
                  Autoriser l'application de sanctions
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.adminPermissions.canValidateAbsences}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        adminPermissions: { ...prev.adminPermissions, canValidateAbsences: e.target.checked },
                      }))
                    }
                  />
                  Autoriser l'approbation/rejet des absences
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.adminPermissions.canManageEmployees}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        adminPermissions: { ...prev.adminPermissions, canManageEmployees: e.target.checked },
                      }))
                    }
                  />
                  Autoriser la creation/suppression d'employes
                </label>
              </div>
            )}
            {!editingUserId && (
              <input placeholder="Mot de passe initial" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 bg-slate-50 rounded-md text-sm md:col-span-2" />
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={resetForm}>Annuler</Button>
            <Button onClick={editingUserId ? saveEdit : saveCreate}>
              {editingUserId ? 'Enregistrer modifications' : 'Créer le compte'}
            </Button>
          </div>
        </Card>
      )}

      {roleModalUser && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-slate-200">
            <h3 className="text-sm font-bold text-slate-800">Assigner rôle & permissions</h3>
            <p className="text-xs text-slate-500 mt-1">
              Utilisateur: {roleModalUser.firstName} {roleModalUser.lastName}
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={roleForm.role}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, role: e.target.value as 'admin' | 'employee' }))}
                className="w-full px-3 py-2 bg-slate-50 rounded-md text-sm"
              >
                <option value="employee">Employé</option>
                <option value="admin">Admin RH</option>
              </select>

              {roleForm.role === 'admin' && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 uppercase">Permissions admin</p>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleForm.adminPermissions.canPoint}
                      onChange={(e) =>
                        setRoleForm((prev) => ({
                          ...prev,
                          adminPermissions: { ...prev.adminPermissions, canPoint: e.target.checked },
                        }))
                      }
                    />
                    Autoriser le pointage
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleForm.adminPermissions.canApplySanctions}
                      onChange={(e) =>
                        setRoleForm((prev) => ({
                          ...prev,
                          adminPermissions: { ...prev.adminPermissions, canApplySanctions: e.target.checked },
                        }))
                      }
                    />
                    Autoriser l'application de sanctions
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleForm.adminPermissions.canValidateAbsences}
                      onChange={(e) =>
                        setRoleForm((prev) => ({
                          ...prev,
                          adminPermissions: { ...prev.adminPermissions, canValidateAbsences: e.target.checked },
                        }))
                      }
                    />
                    Autoriser l'approbation/rejet des absences
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={roleForm.adminPermissions.canManageEmployees}
                      onChange={(e) =>
                        setRoleForm((prev) => ({
                          ...prev,
                          adminPermissions: { ...prev.adminPermissions, canManageEmployees: e.target.checked },
                        }))
                      }
                    />
                    Autoriser la creation/suppression d'employes
                  </label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setRoleModalUser(null)}>
                Annuler
              </Button>
              <Button onClick={saveRoleAssignment}>
                Enregistrer
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex gap-4 items-center bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            placeholder="Rechercher par nom, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-md outline-none text-sm"
          />
        </div>
        <Button variant="secondary" className="flex items-center gap-2">
          <Filter size={16} />
          Filtres
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Chargement des comptes...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">#</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Utilisateur</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Rôle</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Service</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Poste</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Statut</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user, index) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/users/${encodeURIComponent(String(user.id))}`, { state: { user } })}
                >
                  <td className="px-6 py-4 text-xs font-medium text-slate-500 text-center">
                    {index + 1}
                   </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs italic">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{user.firstName} {user.lastName}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                   </td>
                  <td className="px-6 py-4 text-xs font-semibold">
                    {user.role === 'admin' ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600">Admin RH</span>
                          {(() => {
                            const status = getPermissionStatus(user.adminPermissions);
                            return (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold ${status.className}`}>
                                {status.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(() => {
                            const perms = user.adminPermissions || {} as AdminPermissions;
                            const items = [
                              { key: 'canPoint', label: 'Pointage', active: perms.canPoint },
                              { key: 'canApplySanctions', label: 'Sanctions', active: perms.canApplySanctions },
                              { key: 'canValidateAbsences', label: 'Absences', active: perms.canValidateAbsences },
                              { key: 'canManageEmployees', label: 'Employés', active: perms.canManageEmployees },
                            ];
                            return items.map((item) => (
                              <span
                                key={item.key}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight ${
                                  item.active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border border-slate-200 line-through'
                                }`}
                              >
                                {item.active ? '✓' : '✗'} {item.label}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-600">Employé</span>
                    )}
                   </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">{user.service}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">{user.poste || '-'}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400 group-hover:text-slate-900 transition-colors tracking-widest">
                    {user.id}
                   </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.active ? 'success' : 'error'}>
                      {user.active ? 'Actif' : 'Désactivé'}
                    </Badge>
                   </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        className="p-2 h-9 w-9 flex items-center justify-center rounded-lg"
                        onClick={(e) => { e.stopPropagation(); toggleRole(user.id); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title={user.role === 'admin' ? "Rétrograder en Employé (permissions retirées)" : "Promouvoir en Admin RH (permissions à définir)"}
                      >
                        {user.role === 'admin' ? (
                          <ShieldOff size={16} className="text-rose-500" />
                        ) : (
                          <ShieldCheck size={16} className="text-emerald-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        className="p-2 h-9 w-9 flex items-center justify-center rounded-lg"
                        onClick={(e) => { e.stopPropagation(); startEdit(user); }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        className="p-2 h-9 w-9 flex items-center justify-center rounded-lg"
                        onClick={(e) => { e.stopPropagation(); openRoleModal(user); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Assigner rôle et permissions"
                      >
                        <UserCog size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="p-2 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Trash2 size={16} className="text-red-500" />
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
  );
}