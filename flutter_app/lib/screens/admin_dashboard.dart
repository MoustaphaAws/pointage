import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/kpi_card.dart';
import '../widgets/absence_tile.dart';

class AdminDashboard extends ConsumerWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final globalStatsAsync = ref.watch(globalStatsProvider);
    final allAbsencesAsync = ref.watch(allAbsencesProvider);

    return RefreshIndicator(
      color: AppColors.violet600,
      onRefresh: () async {
        ref.invalidate(globalStatsProvider);
        ref.invalidate(allAbsencesProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── KPI Cards ───
            globalStatsAsync.when(
              data: (stats) => GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.4,
                children: [
                  KpiCard(
                    label: 'Présences (Live)',
                    value: '${stats?.presenceTempsReel ?? 0}%',
                    subtitle: '↑ 4.2% vs hier',
                  ),
                  KpiCard(
                    label: 'Retards du jour',
                    value: '${stats?.retardsAujourdhui ?? 0}',
                    borderColor: AppColors.violet500,
                    valueColor: AppColors.violet600,
                    subtitle: 'Moyenne: 14 min',
                  ),
                  KpiCard(
                    label: 'Demandes Pending',
                    value: '${stats?.notificationsPending ?? 0}',
                    borderColor: AppColors.rose500,
                    valueColor: AppColors.rose500,
                    subtitle: 'Action requise',
                  ),
                  KpiCard(
                    label: 'Taux d\'Absentéisme',
                    value: '${stats?.tauxAbsenteisme ?? 0}%',
                    subtitle: 'Seuil limite: 5.0%',
                  ),
                ],
              ),
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: AppColors.primaryBlack),
                ),
              ),
              error: (_, __) => const Center(child: Text('Erreur de chargement')),
            ),
            const SizedBox(height: 28),

            // ─── Chart Section ───
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.slate200),
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'FLUX DE POINTAGE (SEMAINE)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            color: AppColors.slate800,
                          ),
                        ),
                        TextButton(
                          onPressed: () {},
                          child: const Text(
                            'HISTORIQUE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1,
                              color: AppColors.violet600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(),
                  SizedBox(
                    height: 260,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 24, 16),
                      child: BarChart(
                        BarChartData(
                          alignment: BarChartAlignment.spaceAround,
                          barTouchData: BarTouchData(
                            touchTooltipData: BarTouchTooltipData(
                              getTooltipColor: (_) => AppColors.slate900,
                              tooltipRoundedRadius: 8,
                            ),
                          ),
                          titlesData: FlTitlesData(
                            show: true,
                            bottomTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 30,
                                getTitlesWidget: (value, meta) {
                                  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Text(
                                      days[value.toInt()],
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.slate500,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                            leftTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 30,
                                getTitlesWidget: (value, meta) {
                                  return Text(
                                    value.toInt().toString(),
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.slate400,
                                    ),
                                  );
                                },
                              ),
                            ),
                            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          ),
                          gridData: FlGridData(
                            show: true,
                            drawVerticalLine: false,
                            horizontalInterval: 10,
                            getDrawingHorizontalLine: (value) => FlLine(
                              color: AppColors.slate100,
                              strokeWidth: 1,
                            ),
                          ),
                          borderData: FlBorderData(show: false),
                          barGroups: [
                            _makeGroupData(0, 45, 4),
                            _makeGroupData(1, 48, 2),
                            _makeGroupData(2, 42, 8),
                            _makeGroupData(3, 46, 3),
                            _makeGroupData(4, 44, 5),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Legend
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _legendItem(AppColors.primaryBlack, 'Présences'),
                        const SizedBox(width: 24),
                        _legendItem(AppColors.violet500, 'Retards'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ─── Disciplinary Alerts ───
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.slate200),
              ),
              child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.all(18),
                    child: Text(
                      'ALERTES DISCIPLINAIRES',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        color: AppColors.slate800,
                      ),
                    ),
                  ),
                  const Divider(height: 0),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        // Sanction
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.rose100.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(12),
                            border: const Border(
                              left: BorderSide(color: AppColors.rose500, width: 4),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'SANCTION AUTOMATIQUE',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.5,
                                  color: AppColors.rose700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Kevin Durand (>5 retards)',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.rose700,
                                ),
                              ),
                              const SizedBox(height: 10),
                              ElevatedButton(
                                onPressed: () {},
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.rose500,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 8,
                                  ),
                                  textStyle: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1,
                                  ),
                                ),
                                child: const Text('GÉNÉRER COURRIER'),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Warning
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.amber100.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(12),
                            border: const Border(
                              left: BorderSide(color: AppColors.amber500, width: 4),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'AVERTISSEMENT',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.5,
                                  color: AppColors.amber700,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Mélanie Rose (5 retards)',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.amber700,
                                ),
                              ),
                              const SizedBox(height: 10),
                              ElevatedButton(
                                onPressed: () {},
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.amber500,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 8,
                                  ),
                                  textStyle: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1,
                                  ),
                                ),
                                child: const Text('ENVOYER NOTIF'),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Next step
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.slate50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.slate100),
                          ),
                          child: const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PROCHAINE ÉTAPE',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.5,
                                  color: AppColors.slate500,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                '3 employés sous surveillance active',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.slate700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // ─── Absence Validation ───
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'DEMANDES EN ATTENTE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    color: AppColors.slate800,
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.download_rounded, size: 16),
                  label: const Text('PDF'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.slate900,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    textStyle: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            allAbsencesAsync.when(
              data: (absences) => absences.isEmpty
                  ? Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(50),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.slate100),
                      ),
                      child: const Text(
                        'Aucune demande en attente pour le moment',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.slate400,
                          fontWeight: FontWeight.w600,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    )
                  : Column(
                      children: absences.map((a) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: AbsenceTile(
                            absence: a,
                            showEmployee: true,
                            onApprove: a.isPending
                                ? () => _handleValidation(ref, a.id, 'validé')
                                : null,
                            onReject: a.isPending
                                ? () => _handleValidation(ref, a.id, 'rejeté')
                                : null,
                          ),
                        );
                      }).toList(),
                    ),
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(30),
                  child: CircularProgressIndicator(color: AppColors.primaryBlack),
                ),
              ),
              error: (_, __) => const Text('Erreur'),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  BarChartGroupData _makeGroupData(int x, double presences, double retards) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: presences,
          color: AppColors.primaryBlack,
          width: 18,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
        BarChartRodData(
          toY: retards,
          color: AppColors.violet500,
          width: 18,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
      ],
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.slate500,
          ),
        ),
      ],
    );
  }

  Future<void> _handleValidation(WidgetRef ref, String id, String status) async {
    try {
      final api = ref.read(apiClientProvider);
      if (api != null) {
        await api.validateAbsence(id, status);
        ref.invalidate(allAbsencesProvider);
      }
    } catch (e) {
      // Handle error silently
    }
  }
}
