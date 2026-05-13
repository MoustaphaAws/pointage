import { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '../components/ui/LayoutComponents';
import { 
  Clock, AlertCircle, TrendingUp, DollarSign,
  Activity
} from 'lucide-react';
import { 
  LineChart, Line, ResponsiveContainer
} from 'recharts';
import { ActivityFeedItem } from '../types';
import { formatDateTime, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { fetchActivityFeed, fetchGlobalStats, GlobalStats } from '../services/superAdminApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [stats, setStats] = useState<GlobalStats>({
    employees: 0,
    admins: 0,
    activeUsers: 0,
    absenteeismRate: 0,
    pendingAbsences: 0,
    lateArrivalsCount: 0,
    monthlyOvertimeHours: 0,
    estimatedOvertimeCost: 0,
    lateDashboardMinutesThreshold: 15,
    overtimeHourlyRateFcfa: 4000,
  });

  const loadDashboard = () => {
    return Promise.all([fetchGlobalStats(), fetchActivityFeed()])
      .then(([statsData, feedData]) => {
        setStats(statsData);
        setFeed(feedData.slice(0, 10));
      })
      .catch(() => toast.error("Impossible de charger les statistiques globales"));
  };

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 15000);
    return () => clearInterval(timer);
  }, []);

  const chartData = useMemo(
    () =>
      (stats.serviceActivity || []).map((service) => ({
        name: service.name,
        active: service.current,
      })),
    [stats.serviceActivity]
  );

  const criticalItem = useMemo(
    () => feed.find((item) => item.severity === 'high'),
    [feed]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tableau de Bord</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="info">Direct Access</Badge>
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Système Opérationnel
            </span>
          </div>
        </div>
        <div className="text-right">
          <Button className="py-2" onClick={() => navigate('/reports')}>Export Rapport PDF</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIItem
          title="Taux d'absentéisme"
          value={`${stats.absenteeismRate}%`}
          icon={TrendingUp}
          trend="Global"
          trendColor="text-red-500"
        />
        <KPIItem
          title={`Retards ≥ ${stats.lateDashboardMinutesThreshold ?? 15} min`}
          value={stats.lateArrivalsCount}
          icon={Clock}
          trend="Aujourd'hui"
          trendColor="text-emerald-500"
        />
        <KPIItem
          title="Heures sup. (mois)"
          value={`${Number(stats.monthlyOvertimeHours ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`}
          icon={Activity}
          trend="Pointages"
          trendColor="text-slate-400"
        />
        <KPIItem
          title="Coût heures sup. (mois)"
          value={`${(stats.estimatedOvertimeCost ?? 0).toLocaleString('fr-FR')} FCFA`}
          icon={DollarSign}
          trend={`${stats.overtimeHourlyRateFcfa?.toLocaleString('fr-FR') ?? '—'} F/h`}
          trendColor="text-slate-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts & Service Activity */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Activité par Service (Temps Réel)">
            <div className="space-y-4 pt-2">
              {(stats.serviceActivity || []).slice(0, 4).map((service, idx) => (
                <ServiceProgress
                  key={service.name}
                  name={service.name}
                  current={service.current}
                  total={Math.max(service.total, 1)}
                  color={idx % 2 === 0 ? "bg-blue-500" : "bg-purple-500"}
                />
              ))}
            </div>
            <div className="mt-8 h-[100px] min-h-[100px] w-full min-w-0 opacity-60">
               {chartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={100}>
                    <LineChart data={chartData}>
                      <Line type="monotone" dataKey="active" stroke="#3B82F6" strokeWidth={3} dot={false} />
                    </LineChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-[10px] text-slate-400">
                   Aucune activité service disponible
                 </div>
               )}
               <p className="text-[10px] text-center text-slate-400 mt-2">Flux de pointages cumulés - 24 dernières heures</p>
            </div>
          </Card>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-red-900">Alerte Critique</p>
              <p className="text-xs text-red-700">
                {criticalItem
                  ? `${criticalItem.userName}: ${criticalItem.details}`
                  : `${stats.criticalAlerts || 0} alerte(s) critique(s) sur les dernières 24h.`}
              </p>
            </div>
            <button className="ml-auto bg-white border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium transition-colors">
              Intervenir
            </button>
          </div>
        </div>

        {/* Live Feed */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col p-0 overflow-hidden" title="Flux d'activité Direct">
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
              <AnimatePresence mode="popLayout">
                {feed.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-4 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] font-mono text-slate-400 py-1 shrink-0">
                      {formatDateTime(item.timestamp).split(' ')[1]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed text-slate-700">
                        <span className="font-bold">{item.userName}</span> {item.details.toLowerCase()}
                      </p>
                      <div className="mt-1 text-[9px] font-bold uppercase tracking-tight text-slate-400">
                        {item.type.replace('_', ' ')}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
              <button className="w-full py-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">
                Voir tout l'historique
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ServiceProgress({ name, current, total, color }: any) {
  const percent = (current / total) * 100;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-8 rounded-full", color)}></div>
        <span className="text-sm font-medium text-slate-700">{name}</span>
      </div>
      <div className="flex gap-4">
        <span className="text-xs text-slate-500">{current}/{total} Présents</span>
        <span className={cn("text-xs font-bold", percent < 70 ? "text-red-600" : percent === 100 ? "text-emerald-600" : "text-blue-600")}>
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

function KPIItem({ title, value, icon: Icon, trend, trendColor }: any) {
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-500 font-medium uppercase mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-slate-800 tracking-tight">{value}</span>
        <span className={cn("text-xs font-medium mb-1", trendColor)}>{trend} {trend.includes('+') ? '↑' : trend.includes('-') ? '↓' : ''}</span>
      </div>
    </Card>
  );
}
