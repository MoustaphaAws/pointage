import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/stat_card.dart';
import '../widgets/absence_tile.dart';
import 'absence_request_screen.dart';

class EmployeeDashboard extends ConsumerWidget {
  const EmployeeDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(monthStatsProvider);
    final pointageAsync = ref.watch(todayPointageProvider);
    final absencesAsync = ref.watch(myAbsencesProvider);

    return RefreshIndicator(
      color: AppColors.violet600,
      onRefresh: () async {
        ref.invalidate(monthStatsProvider);
        ref.invalidate(todayPointageProvider);
        ref.invalidate(myAbsencesProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Welcome Card ───
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: AppColors.primaryBlack,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: AppColors.violet500.withValues(alpha: 0.15),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.2),
                    blurRadius: 30,
                    offset: const Offset(0, 15),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  // Background icon
                  Positioned(
                    bottom: -30,
                    right: -30,
                    child: Icon(
                      Icons.access_time_rounded,
                      size: 140,
                      color: Colors.white.withValues(alpha: 0.03),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: AppColors.emerald500,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'SYSTÈME LIVE',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 2,
                              color: AppColors.violet400,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Bonjour,',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -1.2,
                          color: Colors.white,
                          height: 1.1,
                        ),
                      ),
                      const Text(
                        'Collaborateur',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -1.2,
                          color: AppColors.violet500,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Console de supervision personnelle • ${DateFormat('EEEE d MMMM', 'fr_FR').format(DateTime.now())}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppColors.slate400,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Metrics
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: AppColors.violet500.withValues(alpha: 0.15),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'ARRIVÉE',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.5,
                                      color: AppColors.slate500,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  pointageAsync.when(
                                    data: (p) => Text(
                                      p?.checkIn ?? '--:--',
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                      ),
                                    ),
                                    loading: () => const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppColors.violet400,
                                      ),
                                    ),
                                    error: (_, __) => const Text(
                                      '--:--',
                                      style: TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: AppColors.violet500.withValues(alpha: 0.15),
                                ),
                              ),
                              child: const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'PERFORMANCE',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.5,
                                      color: AppColors.slate500,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    '98%',
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w900,
                                      color: AppColors.violet400,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ─── Quick Stats Grid ───
            statsAsync.when(
              data: (stats) => GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.7,
                children: [
                  StatCard(
                    label: 'Jours',
                    value: '${stats?.joursTravailles ?? 0}',
                  ),
                  StatCard(
                    label: 'Heures',
                    value: '${stats?.heuresTotales ?? 0}h',
                  ),
                  StatCard(
                    label: 'Retards',
                    value: '${stats?.retards ?? 0}',
                    highlighted: (stats?.retards ?? 0) > 3,
                    accentColor: AppColors.rose500,
                  ),
                  StatCard(
                    label: 'Congés',
                    value: '${stats?.soldeConges ?? 0}j',
                  ),
                ],
              ),
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: AppColors.violet500),
                ),
              ),
              error: (_, __) => const Center(
                child: Text('Erreur de chargement'),
              ),
            ),
            const SizedBox(height: 28),

            // ─── Action Buttons ───
            const Text(
              'ABSENCES',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                color: AppColors.slate900,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Soumettez vos demandes de congés ou signalez un arrêt maladie.',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.slate500,
              ),
            ),
            const SizedBox(height: 16),

            _buildActionButton(
              context,
              icon: Icons.calendar_today_rounded,
              title: 'Congés payés',
              subtitle: 'PLANIFIER',
              hoverColor: AppColors.violet100,
              onTap: () => _showAbsenceSheet(context),
            ),
            const SizedBox(height: 10),
            _buildActionButton(
              context,
              icon: Icons.warning_amber_rounded,
              title: 'Arrêt maladie',
              subtitle: 'URGENCE',
              hoverColor: AppColors.rose100,
              onTap: () => _showAbsenceSheet(context),
            ),
            const SizedBox(height: 28),

            // ─── Absence History ───
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'HISTORIQUE DES DEMANDES',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                    color: AppColors.slate800,
                  ),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text(
                    'ARCHIVES',
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
            const SizedBox(height: 12),
            absencesAsync.when(
              data: (absences) => absences.isEmpty
                  ? Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.slate100),
                      ),
                      child: const Text(
                        'Aucune demande pour le moment',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: AppColors.slate400,
                          fontWeight: FontWeight.w600,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    )
                  : Column(
                      children: absences
                          .map((a) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: AbsenceTile(absence: a),
                              ))
                          .toList(),
                    ),
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(30),
                  child: CircularProgressIndicator(color: AppColors.violet500),
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

  Widget _buildActionButton(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color hoverColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppColors.slate50,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        splashColor: hoverColor.withValues(alpha: 0.3),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.slate100),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.slate200),
                ),
                child: Icon(icon, size: 22, color: AppColors.slate700),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppColors.slate900,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: AppColors.slate400,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: AppColors.slate300,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAbsenceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AbsenceRequestSheet(),
    );
  }
}
