import { useEffect, useState } from 'react';
import { Card, Button } from '../components/ui/LayoutComponents';
import { Search, Download, Clock, User, HardDrive, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { cn } from '../lib/utils';
import { AuditLog } from '../types';
import { exportAuditLogsCsv, fetchAuditLogsFiltered } from '../services/superAdminApi';
import toast from 'react-hot-toast';

const ACTION_OPTIONS = [
  "CREATE_USER",
  "UPDATE_USER",
  "SUSPEND_USER",
  "DELETE_USER",
  "UPDATE_CONFIG",
  "RESET_PASSWORD",
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<"created_at" | "user_name" | "action" | "target">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadLogs = (
    pageOverride?: number,
    sortByOverride?: "created_at" | "user_name" | "action" | "target",
    sortOrderOverride?: "asc" | "desc"
  ) => {
    const currentPage = pageOverride ?? page;
    const effectiveSortBy = sortByOverride ?? sortBy;
    const effectiveSortOrder = sortOrderOverride ?? sortOrder;
    fetchAuditLogsFiltered({
      q: search,
      action,
      actions: selectedActions.join(","),
      dateFrom,
      dateTo,
      page: currentPage,
      pageSize: 20,
      sortBy: effectiveSortBy,
      sortOrder: effectiveSortOrder,
    })
      .then((data) => {
        setLogs(data.items);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      })
      .catch(() => toast.error("Impossible de charger les logs"));
  };

  useEffect(() => {
    loadLogs();
    const timer = setInterval(() => loadLogs(1), 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleExport = async () => {
    try {
      const blob = await exportAuditLogsCsv({ q: search, action, actions: selectedActions.join(","), dateFrom, dateTo });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export CSV généré");
    } catch {
      toast.error("Échec de l'export CSV");
    }
  };

  const toggleSort = (column: "created_at" | "user_name" | "action" | "target") => {
    let nextSortBy: "created_at" | "user_name" | "action" | "target" = column;
    let nextSortOrder: "asc" | "desc" = "asc";
    if (sortBy === column) {
      nextSortOrder = sortOrder === "asc" ? "desc" : "asc";
    }
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    loadLogs(1, nextSortBy, nextSortOrder);
  };

  const toggleAction = (value: string) => {
    setSelectedActions((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  };

  const sortIcon = (column: "created_at" | "user_name" | "action" | "target") => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? <ArrowUpAZ size={12} className="inline ml-1" /> : <ArrowDownAZ size={12} className="inline ml-1" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Historique des Logs d'Audit</h2>
          <p className="text-xs text-slate-500 font-medium uppercase mt-1">Traçabilité complète des actions du système (immuable)</p>
        </div>
        <Button variant="secondary" className="flex items-center gap-2" onClick={handleExport}>
          <Download size={16} />
          Exporter CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-50/50 flex items-center gap-6 p-4 border-dashed border-slate-300">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
            <HardDrive size={16} />
            <span>Espace Disque : 45.2 GB / 500 GB</span>
          </div>
        </Card>
        <Card className="bg-slate-50/50 flex items-center gap-6 p-4 border-dashed border-slate-300">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
            <Clock size={16} />
            <span>Conservation : 1095 jours (3 ans)</span>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            placeholder="Rechercher par utilisateur, action, cible..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-md outline-none text-sm"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="bg-slate-50 px-3 py-2 text-xs font-bold uppercase rounded-md border border-slate-100"
        >
          <option value="">Toutes actions</option>
          <option value="CREATE_USER">CREATE_USER</option>
          <option value="UPDATE_USER">UPDATE_USER</option>
          <option value="SUSPEND_USER">SUSPEND_USER</option>
          <option value="DELETE_USER">DELETE_USER</option>
          <option value="UPDATE_CONFIG">UPDATE_CONFIG</option>
        </select>
        <div className="flex gap-2">
           <input
             type="date"
             value={dateFrom}
             onChange={(e) => setDateFrom(e.target.value)}
             className="bg-slate-50 px-3 py-2 text-xs font-bold uppercase rounded-md border border-slate-100"
           />
           <input
             type="date"
             value={dateTo}
             onChange={(e) => setDateTo(e.target.value)}
             className="bg-slate-50 px-3 py-2 text-xs font-bold uppercase rounded-md border border-slate-100"
           />
        </div>
        <details className="bg-slate-50 border border-slate-100 rounded-md px-3 py-2 text-xs">
          <summary className="cursor-pointer font-bold uppercase text-slate-500">Actions multiples</summary>
          <div className="grid grid-cols-2 gap-2 mt-2 min-w-[260px]">
            {ACTION_OPTIONS.map((value) => (
              <label key={value} className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={selectedActions.includes(value)}
                  onChange={() => toggleAction(value)}
                  className="accent-blue-600"
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </details>
        <Button variant="secondary" onClick={() => loadLogs(1)}>Appliquer</Button>
      </div>

      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 cursor-pointer" onClick={() => toggleSort("created_at")}>Horodatage {sortIcon("created_at")}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 cursor-pointer" onClick={() => toggleSort("user_name")}>Acteur {sortIcon("user_name")}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 cursor-pointer" onClick={() => toggleSort("action")}>Action {sortIcon("action")}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 cursor-pointer" onClick={() => toggleSort("target")}>Cible {sortIcon("target")}</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-400">{log.timestamp}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{log.userName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full border font-bold text-[9px] uppercase tracking-wider",
                    log.action.includes('CREATE') ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                    log.action.includes('DELETE') ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"
                  )}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">{log.target}</td>
                <td className="px-6 py-4 text-right text-slate-500 italic">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{total} lignes</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => loadLogs(Math.max(1, page - 1))} disabled={page <= 1}>
            Précédent
          </Button>
          <span>Page {page} / {totalPages}</span>
          <Button variant="secondary" onClick={() => loadLogs(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
