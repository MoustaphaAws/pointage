import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/kpi_card.dart';
import '../widgets/absence_tile.dart';
import 'qr_display_screen.dart';
import 'qr_scanner_screen.dart';

class AdminDashboard extends ConsumerWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);
    final canPoint = currentUser?.role == 'admin'
        ? (currentUser?.adminPermissions.canPoint ?? false)
        : true;
    final canValidateAbsences = currentUser?.adminPermissions.canValidateAbsences ?? true;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sectionTitleColor = isDark ? AppColors.darkTextPrimary : AppColors.slate800;
    final sectionTextColor = isDark ? AppColors.darkTextSecondary : AppColors.slate500;
    final globalStatsAsync = ref.watch(globalStatsProvider);
    final allAbsencesAsync = ref.watch(allAbsencesProvider);
    final weeklyPointagesAsync = ref.watch(weeklyPointagesProvider);
    final activeSanctionsAsync = ref.watch(activeSanctionsProvider);

    return RefreshIndicator(
      color: AppColors.violet600,
      onRefresh: () async {
        ref.invalidate(globalStatsProvider);
        ref.invalidate(allAbsencesProvider);
        ref.invalidate(weeklyPointagesProvider);
        ref.invalidate(activeSanctionsProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── QR Code Button ───
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => canPoint ? const QrScannerScreen() : const QrDisplayScreen(),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(14),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                decoration: BoxDecoration(
                  color: AppColors.violet700,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.violet700.withValues(alpha: 0.3),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.qr_code_2_rounded,
                        color: Colors.white,
                        size: 26,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            canPoint ? 'Scanner pour pointer' : 'QR Code du jour',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            canPoint ? 'Scanner • Valider votre pointage' : 'Afficher • Imprimer • Partager',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.slate400,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.arrow_forward_ios_rounded,
                      color: AppColors.violet400,
                      size: 18,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

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
                  ),
                  KpiCard(
                    label: 'Retards du jour',
                    value: '${stats?.retardsAujourdhui ?? 0}',
                    borderColor: AppColors.violet700,
                    valueColor: AppColors.violet700,
                  ),
                  KpiCard(
                    label: 'Demandes Pending',
                    value: '${stats?.notificationsPending ?? 0}',
                    borderColor: AppColors.rose500,
                    valueColor: AppColors.rose500,
                  ),
                  KpiCard(
                    label: 'Taux d\'Absentéisme',
                    value: '${stats?.tauxAbsenteisme ?? 0}%',
                  ),
                ],
              ),
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: AppColors.violet700),
                ),
              ),
              error: (_, __) => const Center(child: Text('Erreur de chargement')),
            ),
            const SizedBox(height: 28),

            // ─── Chart Section ───
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.slate200,
                  width: 0.5,
                ),
              ),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'FLUX DE POINTAGE (SEMAINE)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            color: sectionTitleColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(),
                  weeklyPointagesAsync.when(
                    data: (weeklyData) => SizedBox(
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
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: sectionTextColor,
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
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: sectionTextColor,
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
                            barGroups: [0, 1, 2, 3, 4].map((index) {
                              final dayData = weeklyData.firstWhere(
                                (d) => d['day'] == index + 1,
                                orElse: () => {'presences': 0, 'retards': 0},
                              );
                              return _makeGroupData(
                                index,
                                (dayData['presences'] as num).toDouble(),
                                (dayData['retards'] as num).toDouble(),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ),
                    loading: () => const SizedBox(
                      height: 260,
                      child: Center(
                        child: CircularProgressIndicator(color: AppColors.violet700),
                      ),
                    ),
                    error: (_, __) => const SizedBox(
                      height: 260,
                      child: Center(child: Text('Erreur')),
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
                        _legendItem(AppColors.violet700, 'Retards'),
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
                color: isDark ? AppColors.darkSurface : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.slate200,
                  width: 0.5,
                ),
              ),
              child: Column(
                children: [
                  Padding(
                    padding: EdgeInsets.all(18),
                    child: Text(
                      'ALERTES DISCIPLINAIRES',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        color: sectionTitleColor,
                      ),
                    ),
                  ),
                  const Divider(height: 0),
                  activeSanctionsAsync.when(
                    data: (sanctions) {
                      if (sanctions.isEmpty) {
                        return const Padding(
                          padding: EdgeInsets.all(30),
                          child: Text(
                            'Aucune alerte disciplinaire active.',
                            style: TextStyle(color: AppColors.slate400, fontStyle: FontStyle.italic),
                          ),
                        );
                      }
                      return Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            ...sanctions.take(3).map((s) {
                              final isSanction = s.typeSanction != 'avertissement' && s.typeSanction != 'rappel_verbal';
                              final color = isSanction ? AppColors.rose500 : AppColors.amber500;
                              final bgColor = isSanction ? AppColors.rose100 : AppColors.amber100;
                              final textLight = isSanction ? AppColors.rose700 : AppColors.amber700;
                              
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: bgColor.withValues(alpha: 0.5),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border(left: BorderSide(color: color, width: 4)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isSanction ? 'SANCTION DISCIPLINAIRE' : 'AVERTISSEMENT',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 1.5,
                                        color: textLight,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${s.employeeName ?? "Employé inconnu"} (${s.motif})',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: textLight,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    ElevatedButton(
                                      onPressed: () {},
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: color,
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                        textStyle: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 1,
                                        ),
                                      ),
                                      child: Text(isSanction ? 'DÉTAILS SANCTION' : 'ENVOYER NOTIF'),
                                    ),
                                  ],
                                ),
                              );
                            }),
                            if (sanctions.length > 3)
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.slate50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.slate100),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'AUTRES ALERTES',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 1.5,
                                        color: AppColors.slate500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${sanctions.length - 3} employés sous surveillance.',
                                      style: const TextStyle(
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
                      );
                    },
                    loading: () => const Padding(
                      padding: EdgeInsets.all(30),
                      child: Center(child: CircularProgressIndicator(color: AppColors.violet700)),
                    ),
                    error: (_, __) => const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('Erreur de chargement'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // ─── Absence Validation ───
            Text(
              'DEMANDES EN ATTENTE',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
                color: sectionTitleColor,
              ),
            ),
            const SizedBox(height: 14),
            allAbsencesAsync.when(
              data: (absences) => absences.isEmpty
                  ? Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(50),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? AppColors.darkBorder : AppColors.slate100,
                        ),
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
                                ? (canValidateAbsences ? () => _handleValidation(ref, a.id, 'validé') : null)
                                : null,
                            onReject: a.isPending
                                ? (canValidateAbsences ? () => _handleValidation(ref, a.id, 'rejeté') : null)
                                : null,
                          ),
                        );
                      }).toList(),
                    ),
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(30),
                  child: CircularProgressIndicator(color: AppColors.violet700),
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
          color: AppColors.violet700,
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
