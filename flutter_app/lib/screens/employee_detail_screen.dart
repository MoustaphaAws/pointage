import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';

import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import 'employee_form_screen.dart';

class EmployeeDetailScreen extends ConsumerWidget {
  final Employee employee;
  const EmployeeDetailScreen({super.key, required this.employee});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);
    final canManageEmployees = currentUser?.adminPermissions.canManageEmployees ?? true;
    return Scaffold(
      backgroundColor: AppColors.slate50,
      body: DefaultTabController(
        length: 3,
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            _buildSliverAppBar(context, ref, canManageEmployees),
          ],
          body: TabBarView(
            children: [
              _PointagesTab(employeeId: employee.id),
              _AbsencesTab(employeeId: employee.id),
              _SanctionsTab(employeeId: employee.id),
            ],
          ),
        ),
      ),
      floatingActionButton: canManageEmployees
          ? FloatingActionButton(
              heroTag: 'edit_employee',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => EmployeeFormScreen(employee: employee),
                  ),
                );
              },
              backgroundColor: AppColors.violet600,
              child: const Icon(Icons.edit_rounded, color: Colors.white),
            )
          : null,
    );
  }

  SliverAppBar _buildSliverAppBar(BuildContext context, WidgetRef ref, bool canManageEmployees) {
    return SliverAppBar(
      expandedHeight: 340,
      pinned: true,
      backgroundColor: AppColors.violet700,
      foregroundColor: Colors.white,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded),
        onPressed: () => Navigator.pop(context),
      ),
      actions: canManageEmployees
          ? [
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: Colors.white),
                color: Colors.white,
                onSelected: (val) => _handleAction(context, ref, val),
                itemBuilder: (_) => [
                  if (employee.actif)
                    const PopupMenuItem(
                      value: 'deactivate',
                      child: Row(
                        children: [
                          Icon(Icons.block_rounded, color: AppColors.rose500, size: 18),
                          SizedBox(width: 8),
                          Text('Désactiver'),
                        ],
                      ),
                    )
                  else
                    const PopupMenuItem(
                      value: 'activate',
                      child: Row(
                        children: [
                          Icon(Icons.check_circle_rounded, color: AppColors.emerald500, size: 18),
                          SizedBox(width: 8),
                          Text('Réactiver'),
                        ],
                      ),
                    ),
                ],
              ),
            ]
          : [],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [AppColors.violet700, Color(0xFF1A1A2E)],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 60, 24, 0),
              child: Column(
                children: [
                  // Avatar
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: AppColors.violet600.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.violet500.withValues(alpha: 0.4),
                        width: 2,
                      ),
                    ),
                    child: employee.photoUrl != null
                        ? ClipOval(
                            child: Image.network(employee.photoUrl!, fit: BoxFit.cover))
                        : Center(
                            child: Text(
                              employee.initials,
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w900,
                                color: AppColors.violet400,
                              ),
                            ),
                          ),
                  ),
                  const SizedBox(height: 12),

                  // Name & role badge
                  Text(
                    employee.fullName,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    employee.poste,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withValues(alpha: 0.6),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Badges row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _infoBadge(employee.matricule, AppColors.slate700, Colors.white70),
                      const SizedBox(width: 8),
                      _infoBadge(
                        employee.serviceName ?? 'N/A',
                        AppColors.violet600.withValues(alpha: 0.3),
                        AppColors.violet400,
                      ),
                      const SizedBox(width: 8),
                      _infoBadge(
                        employee.actif ? 'Actif' : 'Inactif',
                        employee.actif
                            ? AppColors.emerald500.withValues(alpha: 0.2)
                            : AppColors.rose500.withValues(alpha: 0.2),
                        employee.actif ? AppColors.emerald500 : AppColors.rose500,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Contact info
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.email_outlined, size: 14,
                          color: Colors.white.withValues(alpha: 0.4)),
                      const SizedBox(width: 4),
                      Text(
                        employee.email,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.5),
                        ),
                      ),
                      if (employee.phone != null) ...[
                        const SizedBox(width: 12),
                        Icon(Icons.phone_outlined, size: 14,
                            color: Colors.white.withValues(alpha: 0.4)),
                        const SizedBox(width: 4),
                        Text(
                          employee.phone!,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      bottom: const TabBar(
        indicatorColor: AppColors.violet500,
        indicatorWeight: 3,
        labelColor: Colors.white,
        unselectedLabelColor: AppColors.slate500,
        labelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5),
        unselectedLabelStyle: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        tabs: [
          Tab(text: 'POINTAGES'),
          Tab(text: 'ABSENCES'),
          Tab(text: 'SANCTIONS'),
        ],
      ),
    );
  }

  Widget _infoBadge(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }

  Future<void> _handleAction(BuildContext context, WidgetRef ref, String action) async {
    try {
      final api = ref.read(apiClientProvider);
      if (api == null) return;

      if (action == 'deactivate') {
        await api.deactivateEmployee(employee.id);
      } else {
        await api.activateEmployee(employee.id);
      }

      ref.invalidate(allEmployeesProvider);

      final msg = action == 'deactivate'
          ? '${employee.fullName} a été désactivé'
          : '${employee.fullName} a été réactivé';
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg, style: const TextStyle(fontWeight: FontWeight.w700)),
            backgroundColor: action == 'deactivate' ? AppColors.rose500 : AppColors.emerald500,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e', style: const TextStyle(fontWeight: FontWeight.w700)),
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
// TAB 1 : Pointages
// ════════════════════════════════════════════════════════════
class _PointagesTab extends ConsumerWidget {
  final String employeeId;
  const _PointagesTab({required this.employeeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pointagesAsync = ref.watch(employeePointagesProvider(employeeId));

    return pointagesAsync.when(
      data: (pointages) {
        if (pointages.isEmpty) return _emptyState('Aucun pointage enregistré', Icons.access_time_rounded);

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: pointages.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) {
            final p = pointages[i];
            return _PointageTile(pointage: p);
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
      error: (_, __) => _emptyState('Erreur de chargement', Icons.error_outline_rounded),
    );
  }
}

class _PointageTile extends StatelessWidget {
  final Pointage pointage;
  const _PointageTile({required this.pointage});

  @override
  Widget build(BuildContext context) {
    final statusConfig = _statusConfig(pointage.status);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate200, width: 0.5),
      ),
      child: Row(
        children: [
          // Status indicator
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: statusConfig.color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(statusConfig.icon, color: statusConfig.color, size: 20),
          ),
          const SizedBox(width: 12),

          // Date + status label
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  pointage.date,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  statusConfig.label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: statusConfig.color,
                  ),
                ),
              ],
            ),
          ),

          // Times
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.login_rounded, size: 14, color: AppColors.emerald500),
                  const SizedBox(width: 4),
                  Text(
                    pointage.checkIn ?? '--:--',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.slate700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.logout_rounded, size: 14, color: AppColors.rose500),
                  const SizedBox(width: 4),
                  Text(
                    pointage.checkOut ?? '--:--',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.slate700,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Delay badge
          if (pointage.isLate) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.amber100,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '+${_formatDelay(pointage.delayMinutes)}',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: AppColors.amber700,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDelay(int minutes) {
    if (minutes < 60) return '${minutes}min';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (m == 0) return '${h}h';
    return '${h}h${m.toString().padLeft(2, '0')}';
  }

  _StatusConfig _statusConfig(String status) {
    switch (status) {
      case 'present':
        return _StatusConfig('Présent', AppColors.emerald500, Icons.check_circle_rounded);
      case 'retard':
        return _StatusConfig('En retard', AppColors.amber500, Icons.warning_rounded);
      case 'absent':
        return _StatusConfig('Absent', AppColors.rose500, Icons.cancel_rounded);
      case 'jour_ferie':
        return _StatusConfig('Jour férié', AppColors.sky600, Icons.celebration_rounded);
      case 'weekend':
        return _StatusConfig('Weekend', AppColors.slate400, Icons.weekend_rounded);
      default:
        return _StatusConfig('Non pointé', AppColors.slate400, Icons.remove_circle_outline_rounded);
    }
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  final IconData icon;
  _StatusConfig(this.label, this.color, this.icon);
}

// ════════════════════════════════════════════════════════════
// TAB 2 : Absences
// ════════════════════════════════════════════════════════════
class _AbsencesTab extends ConsumerWidget {
  final String employeeId;
  const _AbsencesTab({required this.employeeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final absencesAsync = ref.watch(employeeAbsencesProvider(employeeId));

    return absencesAsync.when(
      data: (absences) {
        if (absences.isEmpty) return _emptyState('Aucune absence', Icons.event_busy_rounded);

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: absences.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) => _AbsenceTile(absence: absences[i]),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
      error: (_, __) => _emptyState('Erreur de chargement', Icons.error_outline_rounded),
    );
  }
}

class _AbsenceTile extends StatelessWidget {
  final Absence absence;
  const _AbsenceTile({required this.absence});

  @override
  Widget build(BuildContext context) {
    final statusColor = _absenceStatusColor(absence.status);
    final statusLabel = _absenceStatusLabel(absence.status);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate200, width: 0.5),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 44,
            decoration: BoxDecoration(
              color: statusColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  absence.typeAbsenceLabel,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${absence.dateDebut} → ${absence.dateFin}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.slate500,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              statusLabel,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: statusColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _absenceStatusColor(String status) {
    switch (status) {
      case 'approuvee': return AppColors.emerald500;
      case 'rejetee': return AppColors.rose500;
      case 'annulee': return AppColors.slate400;
      default: return AppColors.amber500;
    }
  }

  String _absenceStatusLabel(String status) {
    switch (status) {
      case 'en_attente': return 'En attente';
      case 'approuvee': return 'Approuvée';
      case 'rejetee': return 'Rejetée';
      case 'annulee': return 'Annulée';
      default: return status;
    }
  }
}

// ════════════════════════════════════════════════════════════
// TAB 3 : Sanctions
// ════════════════════════════════════════════════════════════
class _SanctionsTab extends ConsumerWidget {
  final String employeeId;
  const _SanctionsTab({required this.employeeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sanctionsAsync = ref.watch(employeeSanctionsProvider(employeeId));

    return sanctionsAsync.when(
      data: (sanctions) {
        if (sanctions.isEmpty) return _emptyState('Aucune sanction', Icons.shield_rounded);

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: sanctions.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (_, i) => _SanctionTile(sanction: sanctions[i]),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
      error: (_, __) => _emptyState('Erreur de chargement', Icons.error_outline_rounded),
    );
  }
}

class _SanctionTile extends StatelessWidget {
  final Sanction sanction;
  const _SanctionTile({required this.sanction});

  @override
  Widget build(BuildContext context) {
    final typeConfig = _sanctionTypeConfig(sanction.typeSanction);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: typeConfig.color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: typeConfig.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(typeConfig.icon, color: typeConfig.color, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      typeConfig.label,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: typeConfig.color,
                      ),
                    ),
                    Text(
                      sanction.moisReference,
                      style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: sanction.isAlerte
                      ? AppColors.amber100
                      : AppColors.emerald100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  sanction.isAlerte ? 'ALERTE' : 'TRAITÉ',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: sanction.isAlerte ? AppColors.amber700 : AppColors.emerald700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            sanction.motif,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.slate500,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              _metricChip('${sanction.nbRetards} retards', AppColors.amber500),
              const SizedBox(width: 6),
              _metricChip('${sanction.nbAbsencesInjust} abs. inj.', AppColors.rose500),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metricChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }

  _StatusConfig _sanctionTypeConfig(String type) {
    switch (type) {
      case 'rappel_verbal':
        return _StatusConfig('Rappel verbal', AppColors.amber500, Icons.record_voice_over_rounded);
      case 'avertissement':
        return _StatusConfig('Avertissement', const Color(0xFFF97316), Icons.warning_amber_rounded);
      default:
        return _StatusConfig('Sanction disciplinaire', AppColors.rose500, Icons.gavel_rounded);
    }
  }
}

// ════════════════════════════════════════════════════════════
// EMPTY STATE helper
// ════════════════════════════════════════════════════════════
Widget _emptyState(String message, IconData icon) {
  return Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 48, color: AppColors.slate300),
        const SizedBox(height: 12),
        Text(
          message,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.slate400,
          ),
        ),
      ],
    ),
  );
}
