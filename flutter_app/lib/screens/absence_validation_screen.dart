import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';

class AbsenceValidationScreen extends ConsumerStatefulWidget {
  const AbsenceValidationScreen({super.key});

  @override
  ConsumerState<AbsenceValidationScreen> createState() => _AbsenceValidationScreenState();
}

class _AbsenceValidationScreenState extends ConsumerState<AbsenceValidationScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider);
    final canValidateAbsences = currentUser?.adminPermissions.canValidateAbsences ?? true;
    final allAbsencesAsync = ref.watch(allAbsencesProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Validation',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: AppColors.slate900,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(50),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.slate100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: Colors.white,
              unselectedLabelColor: AppColors.slate500,
              labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
              unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              indicator: BoxDecoration(
                color: AppColors.violet700,
                borderRadius: BorderRadius.circular(10),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerHeight: 0,
              padding: const EdgeInsets.all(4),
              tabs: [
                Tab(
                  child: allAbsencesAsync.when(
                    data: (list) {
                      final pending = list.where((a) => a.isPending).length;
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('EN ATTENTE'),
                          if (pending > 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.amber500,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '$pending',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ],
                      );
                    },
                    loading: () => const Text('EN ATTENTE'),
                    error: (_, __) => const Text('EN ATTENTE'),
                  ),
                ),
                const Tab(text: 'TRAITÉES'),
              ],
            ),
          ),
        ),
      ),
      body: allAbsencesAsync.when(
        data: (absences) {
          final pending = absences.where((a) => a.isPending).toList();
          final treated = absences.where((a) => !a.isPending).toList();

          return TabBarView(
            controller: _tabController,
            children: [
              // Tab 1 : En attente
              pending.isEmpty
                  ? _emptyState('Aucune demande en attente', Icons.check_circle_outline_rounded,
                      'Toutes les demandes ont été traitées.')
                  : RefreshIndicator(
                      color: AppColors.violet600,
                      onRefresh: () async => ref.invalidate(allAbsencesProvider),
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: pending.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => _PendingAbsenceCard(
                          absence: pending[i],
                          onApprove: canValidateAbsences ? () => _approveAbsence(pending[i]) : null,
                          onReject: canValidateAbsences ? () => _showRejectDialog(pending[i]) : null,
                        ),
                      ),
                    ),

              // Tab 2 : Traitées
              treated.isEmpty
                  ? _emptyState('Aucun historique', Icons.history_rounded, null)
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: treated.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, i) => _TreatedAbsenceCard(absence: treated[i]),
                    ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
        error: (_, __) => const Center(child: Text('Erreur de chargement')),
      ),
    );
  }

  Future<void> _approveAbsence(Absence absence) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Confirmer l\'approbation',
            style: TextStyle(fontWeight: FontWeight.w800)),
        content: Text(
          "Approuver la demande de ${absence.typeAbsenceLabel} de ${absence.employeeName ?? "l'employé"} ?",
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
    }
  }

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
              '${absence.dateDebut} → ${absence.dateFin}',
              style: const TextStyle(fontSize: 12, color: AppColors.slate400),
            ),
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
    }
    motifCtrl.dispose();
  }

  Widget _emptyState(String title, IconData icon, String? subtitle) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.emerald100,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, size: 32, color: AppColors.emerald500),
          ),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(
              fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate900)),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.slate400)),
          ],
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════
// Pending Absence Card (with approve / reject actions)
// ════════════════════════════════════════════════════════════
class _PendingAbsenceCard extends StatelessWidget {
  final Absence absence;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  const _PendingAbsenceCard({
    required this.absence,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate200, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.slate200.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row : employee name + type badge
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.amber500.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.hourglass_top_rounded, color: AppColors.amber500, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      absence.employeeName ?? 'Employé',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.slate900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      absence.employeeEmail ?? '',
                      style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppColors.violet50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  absence.typeAbsenceLabel,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: AppColors.violet600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Dates
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.date_range_rounded, size: 16, color: AppColors.slate400),
                const SizedBox(width: 8),
                Text(
                  '${absence.dateDebut}  →  ${absence.dateFin}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.slate700,
                  ),
                ),
                if (absence.demiJournee) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.amber100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      absence.periodeDemiJournee == 'matin' ? '½ Matin' : '½ AM',
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
          ),

          // Motif
          if (absence.motif != null && absence.motif!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.notes_rounded, size: 14, color: AppColors.slate400),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    absence.motif!,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppColors.slate500,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ],

          // Justificatif indicator
          if (absence.hasJustificatif) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.sky600.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.attach_file_rounded, size: 14, color: AppColors.sky600),
                  SizedBox(width: 4),
                  Text(
                    'Justificatif joint',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.sky600,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 14),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onReject,
                  icon: const Icon(Icons.close_rounded, size: 18),
                  label: const Text('REJETER', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.rose500,
                    side: const BorderSide(color: AppColors.rose500),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onApprove,
                  icon: const Icon(Icons.check_rounded, size: 18),
                  label: const Text('APPROUVER', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.emerald500,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════
// Treated Absence Card (read-only, with status)
// ════════════════════════════════════════════════════════════
class _TreatedAbsenceCard extends StatelessWidget {
  final Absence absence;
  const _TreatedAbsenceCard({required this.absence});

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(absence.status);
    final statusIcon = _statusIcon(absence.status);
    final statusLabel = _statusLabel(absence.status);

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
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(statusIcon, color: statusColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  absence.employeeName ?? 'Employé',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${absence.typeAbsenceLabel} • ${absence.dateDebut} → ${absence.dateFin}',
                  style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                ),
                if (absence.isRejected && absence.motifRejet != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Motif : ${absence.motifRejet}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.rose500,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              statusLabel,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w900,
                color: statusColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'approuvee': return AppColors.emerald500;
      case 'rejetee': return AppColors.rose500;
      case 'annulee': return AppColors.slate400;
      default: return AppColors.amber500;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'approuvee': return Icons.check_circle_rounded;
      case 'rejetee': return Icons.cancel_rounded;
      case 'annulee': return Icons.do_not_disturb_rounded;
      default: return Icons.hourglass_top_rounded;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'approuvee': return 'APPROUVÉE';
      case 'rejetee': return 'REJETÉE';
      case 'annulee': return 'ANNULÉE';
      default: return 'EN ATTENTE';
    }
  }
}
