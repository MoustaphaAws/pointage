import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

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
                          onViewDetail: () => _showDetailSheet(pending[i], canValidateAbsences),
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

  // ════════════════════════════════════════════════════════════
  // Detail Bottom Sheet — View full absence request before acting
  // ════════════════════════════════════════════════════════════

  void _showDetailSheet(Absence absence, bool canValidate) {
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
                                  if (absence.justificatifUrl != null) ...[
                                    const SizedBox(height: 8),
                                    OutlinedButton.icon(
                                      onPressed: () => _openJustificatif(absence.justificatifUrl!),
                                      icon: const Icon(Icons.download_rounded, size: 14),
                                      label: const Text('Ouvrir', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppColors.sky600,
                                        side: BorderSide(color: AppColors.sky600.withValues(alpha: 0.3)),
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                                        minimumSize: const Size(0, 30),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                    ),
                                  ],
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
      case 'valide': return 'Validé ✓';
      case 'rejete': return 'Rejeté ✗';
      case 'en_attente': return 'En attente';
      default: return 'Non défini';
    }
  }

  Future<void> _openJustificatif(String filename) async {
    final client = ref.read(apiClientProvider);
    final url = client?.getJustificatifFileUrl(filename);
    if (url == null) return;
    try {
      final uri = Uri.parse(url);
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Impossible d\'ouvrir le fichier')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
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
    if (parts.length == 3) return '${parts[2]}/${parts[1]}/${parts[0]}';
    return raw;
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
  final VoidCallback? onViewDetail;

  const _PendingAbsenceCard({
    required this.absence,
    required this.onApprove,
    required this.onReject,
    this.onViewDetail,
  });

  @override
  Widget build(BuildContext context) {
    final dateRange = '${_shortDate(absence.dateDebut)} -> ${_shortDate(absence.dateFin)}';
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

          // Dates (compact + responsive)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Icon(Icons.date_range_rounded, size: 16, color: AppColors.slate400),
                Text(
                  dateRange,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.slate700,
                  ),
                ),
                if (absence.demiJournee) ...[
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

          // View detail button
          if (onViewDetail != null) ...[
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onViewDetail,
                icon: const Icon(Icons.visibility_rounded, size: 16),
                label: const Text('VOIR LA DEMANDE', style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.violet600,
                  side: const BorderSide(color: AppColors.violet200),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],

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

  String _shortDate(String raw) {
    final parts = raw.split('-');
    if (parts.length == 3) {
      return '${parts[2]}/${parts[1]}/${parts[0]}';
    }
    return raw;
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
