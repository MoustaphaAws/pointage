import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/kpi_card.dart';
import '../widgets/absence_tile.dart';
import 'qr_display_screen.dart';
import 'qr_scanner_screen.dart';

class AdminDashboard extends ConsumerStatefulWidget {
  const AdminDashboard({super.key});

  @override
  ConsumerState<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends ConsumerState<AdminDashboard> {
  @override
  Widget build(BuildContext context) {
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
                            onTap: a.isPending ? () => _showAbsenceDetailSheet(a, canValidateAbsences) : null,
                            onApprove: a.isPending
                                ? (canValidateAbsences ? () => _approveAbsence(a) : null)
                                : null,
                            onReject: a.isPending
                                ? (canValidateAbsences ? () => _showRejectDialog(a) : null)
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

  // ════════════════════════════════════════════════════════════
  // Detail Bottom Sheet — View full absence request before acting
  // ════════════════════════════════════════════════════════════

  void _showAbsenceDetailSheet(Absence absence, bool canValidate) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dateRange = '${_shortDate(absence.dateDebut)} → ${_shortDate(absence.dateFin)}';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(ctx).size.height * 0.75,
        ),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.slate300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.violet50,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.description_rounded, color: AppColors.violet600, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Détails de la demande',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.slate900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          absence.typeAbsenceLabel,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.violet600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(ctx),
                    icon: Icon(
                      Icons.close_rounded,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.slate400,
                    ),
                  ),
                ],
              ),
            ),

            const Divider(height: 24),

            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Employee info
                    _detailRow(
                      icon: Icons.person_rounded,
                      label: 'Employé',
                      value: absence.employeeName ?? 'Inconnu',
                      isDark: isDark,
                    ),
                    if (absence.employeeEmail != null && absence.employeeEmail!.isNotEmpty)
                      _detailRow(
                        icon: Icons.email_rounded,
                        label: 'Email',
                        value: absence.employeeEmail!,
                        isDark: isDark,
                      ),
                    _detailRow(
                      icon: Icons.category_rounded,
                      label: 'Type d\'absence',
                      value: absence.typeAbsenceLabel,
                      isDark: isDark,
                    ),
                    _detailRow(
                      icon: Icons.date_range_rounded,
                      label: 'Période',
                      value: dateRange,
                      isDark: isDark,
                    ),
                    if (absence.demiJournee)
                      _detailRow(
                        icon: Icons.timelapse_rounded,
                        label: 'Demi-journée',
                        value: absence.periodeDemiJournee == 'matin' ? 'Matin' : 'Après-midi',
                        isDark: isDark,
                      ),

                    const SizedBox(height: 16),

                    // Motif / Justification
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppColors.slate800.withValues(alpha: 0.5)
                            : AppColors.slate50,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isDark ? AppColors.darkBorder : AppColors.slate200,
                          width: 0.5,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.notes_rounded, size: 16, color: AppColors.violet600),
                              const SizedBox(width: 8),
                              Text(
                                'JUSTIFICATION / MOTIF',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.slate500,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            (absence.motif != null && absence.motif!.isNotEmpty)
                                ? absence.motif!
                                : 'Aucune justification fournie.',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: (absence.motif != null && absence.motif!.isNotEmpty)
                                  ? (isDark ? AppColors.darkTextPrimary : AppColors.slate800)
                                  : AppColors.slate400,
                              fontStyle: (absence.motif != null && absence.motif!.isNotEmpty)
                                  ? FontStyle.normal
                                  : FontStyle.italic,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Justificatif file
                    if (absence.hasJustificatif) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.sky600.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.sky600.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppColors.sky600.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.attach_file_rounded, size: 18, color: AppColors.sky600),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Justificatif joint',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.sky600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Statut : ${_justificatifStatusLabel(absence.justificatifStatus)}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.sky600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Created at
                    if (absence.createdAt.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _detailRow(
                        icon: Icons.access_time_rounded,
                        label: 'Soumise le',
                        value: _formatCreatedAt(absence.createdAt),
                        isDark: isDark,
                      ),
                    ],

                    // Action buttons
                    if (canValidate && absence.isPending) ...[
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.pop(ctx);
                                _showRejectDialog(absence);
                              },
                              icon: const Icon(Icons.close_rounded, size: 18),
                              label: const Text('REJETER',
                                  style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.rose500,
                                side: const BorderSide(color: AppColors.rose500),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.pop(ctx);
                                _approveAbsence(absence);
                              },
                              icon: const Icon(Icons.check_rounded, size: 18),
                              label: const Text('APPROUVER',
                                  style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.emerald500,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                elevation: 0,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.violet600),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.slate400,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.slate800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _justificatifStatusLabel(String? status) {
    switch (status) {
      case 'valide':
        return 'Validé ✓';
      case 'rejete':
        return 'Rejeté ✗';
      case 'en_attente':
        return 'En attente';
      default:
        return 'Non défini';
    }
  }

  String _formatCreatedAt(String raw) {
    try {
      final dt = DateTime.parse(raw);
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} à ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return raw;
    }
  }

  String _shortDate(String raw) {
    final parts = raw.split('-');
    if (parts.length == 3) {
      return '${parts[2]}/${parts[1]}/${parts[0]}';
    }
    return raw;
  }

  // ════════════════════════════════════════════════════════════
  // Approve with confirmation dialog
  // ════════════════════════════════════════════════════════════

  Future<void> _approveAbsence(Absence absence) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Confirmer l\'approbation',
            style: TextStyle(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Approuver la demande de ${absence.typeAbsenceLabel} de ${absence.employeeName ?? "l'employé"} ?",
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.slate50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${_shortDate(absence.dateDebut)} → ${_shortDate(absence.dateFin)}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.slate700,
                    ),
                  ),
                  if (absence.motif != null && absence.motif!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Motif : ${absence.motif}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.slate500,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.emerald500,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('APPROUVER', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final api = ref.read(apiClientProvider);
        if (api == null) return;
        await api.approveAbsence(absence.id);
        ref.invalidate(allAbsencesProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Demande approuvée ✓', style: TextStyle(fontWeight: FontWeight.w700)),
              backgroundColor: AppColors.emerald500,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Erreur lors de l\'approbation', style: TextStyle(fontWeight: FontWeight.w700)),
              backgroundColor: AppColors.rose500,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // Reject with required motif dialog
  // ════════════════════════════════════════════════════════════

  Future<void> _showRejectDialog(Absence absence) async {
    final motifCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Rejeter la demande',
            style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.rose500)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${absence.typeAbsenceLabel} — ${absence.employeeName ?? ""}',
              style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.slate500),
            ),
            const SizedBox(height: 4),
            Text(
              '${_shortDate(absence.dateDebut)} → ${_shortDate(absence.dateFin)}',
              style: const TextStyle(fontSize: 12, color: AppColors.slate400),
            ),
            if (absence.motif != null && absence.motif!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.slate50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Motif employé : ${absence.motif}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.slate600,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: motifCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'MOTIF DE REJET *',
                hintText: 'Expliquez la raison du refus...',
                filled: true,
                fillColor: AppColors.slate50,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.slate200),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.rose500, width: 2),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              if (motifCtrl.text.trim().isEmpty) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(
                    content: Text('Le motif de rejet est obligatoire'),
                    backgroundColor: AppColors.rose500,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                return;
              }
              Navigator.pop(ctx, true);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.rose500,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('REJETER', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final api = ref.read(apiClientProvider);
        if (api == null) return;
        await api.rejectAbsence(absence.id, motifCtrl.text.trim());
        ref.invalidate(allAbsencesProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Demande rejetée', style: TextStyle(fontWeight: FontWeight.w700)),
              backgroundColor: AppColors.rose500,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Erreur lors du rejet', style: TextStyle(fontWeight: FontWeight.w700)),
              backgroundColor: AppColors.rose500,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      }
    }
    motifCtrl.dispose();
  }

  // ════════════════════════════════════════════════════════════
  // Chart helpers
  // ════════════════════════════════════════════════════════════

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
}
