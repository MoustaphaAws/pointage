import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';

class AlertesDisciplinairesScreen extends ConsumerWidget {
  const AlertesDisciplinairesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentUser = ref.watch(currentUserProvider);
    final canApplySanctions = currentUser?.adminPermissions.canApplySanctions ?? true;
    final sanctionsAsync = ref.watch(allSanctionsProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Alertes',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: AppColors.slate900,
          ),
        ),
        actions: [
          sanctionsAsync.when(
            data: (list) {
              final activeCount = list.where((s) => s.isAlerte).length;
              return activeCount > 0
                  ? Padding(
                      padding: const EdgeInsets.only(right: 16),
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.rose500,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '$activeCount actives',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    )
                  : const SizedBox.shrink();
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: sanctionsAsync.when(
        data: (sanctions) {
          if (sanctions.isEmpty) {
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
                    child: const Icon(Icons.shield_rounded, size: 32, color: AppColors.emerald500),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Aucune alerte',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate900),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Pas de sanctions signalées ce mois-ci.',
                    style: TextStyle(fontSize: 13, color: AppColors.slate400),
                  ),
                ],
              ),
            );
          }

          // Séparer alertes actives vs traitées
          final actives = sanctions.where((s) => s.isAlerte).toList();
          final traitees = sanctions.where((s) => s.isTraite).toList();

          return RefreshIndicator(
            color: AppColors.violet600,
            onRefresh: () async => ref.invalidate(allSanctionsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ─── Section : Alertes actives ───
                if (actives.isNotEmpty) ...[
                  _SectionHeader(
                    title: 'ALERTES ACTIVES',
                    count: actives.length,
                    color: AppColors.rose500,
                  ),
                  const SizedBox(height: 12),
                  ...actives.map((s) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _AlerteCard(
                          sanction: s,
                          onTraiter: canApplySanctions ? () => _traiterAlerte(context, ref, s) : null,
                        ),
                      )),
                ],

                // ─── Section : Traitées ───
                if (traitees.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _SectionHeader(
                    title: 'TRAITÉES',
                    count: traitees.length,
                    color: AppColors.emerald500,
                  ),
                  const SizedBox(height: 12),
                  ...traitees.map((s) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _TraiteeCard(sanction: s),
                      )),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
        error: (_, __) => const Center(child: Text('Erreur de chargement')),
      ),
    );
  }

  Future<void> _traiterAlerte(BuildContext context, WidgetRef ref, Sanction sanction) async {
    final commentCtrl = TextEditingController();
    String? selectedAction;

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.slate300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title
              const Text(
                'Traiter cette alerte',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.slate900),
              ),
              const SizedBox(height: 4),
              Text(
                '${sanction.employeeName ?? "Employé"} — ${sanction.typeSanction == 'rappel_verbal' ? 'Rappel verbal' : sanction.typeSanction == 'avertissement' ? 'Avertissement' : 'Sanction disciplinaire'}',
                style: const TextStyle(fontSize: 13, color: AppColors.slate500),
              ),
              const SizedBox(height: 20),

              // Action selection
              const Text('ACTION', style: TextStyle(
                fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.5, color: AppColors.slate900,
              )),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  _actionChip('Rappel verbal', selectedAction, (v) => setSheetState(() => selectedAction = v)),
                  _actionChip('Notification envoyée', selectedAction, (v) => setSheetState(() => selectedAction = v)),
                  _actionChip('Convocation', selectedAction, (v) => setSheetState(() => selectedAction = v)),
                ],
              ),
              const SizedBox(height: 16),

              // Comment
              TextField(
                controller: commentCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'COMMENTAIRE',
                  hintText: 'Ajouter un commentaire (optionnel)',
                  filled: true,
                  fillColor: AppColors.slate50,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.slate200),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Confirm button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: selectedAction == null
                      ? null
                      : () => Navigator.pop(ctx, true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.violet700,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.slate200,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text(
                    'MARQUER COMME TRAITÉ',
                    style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (confirmed == true) {
      try {
        final api = ref.read(apiClientProvider);
        if (api != null) {
          await api.traiterSanction(sanction.id, '${selectedAction ?? ''} — ${commentCtrl.text}'.trim());
        }
        ref.invalidate(allSanctionsProvider);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Alerte traitée ✓', style: TextStyle(fontWeight: FontWeight.w700)),
              backgroundColor: AppColors.emerald500,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
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
    commentCtrl.dispose();
  }

  Widget _actionChip(String label, String? selected, ValueChanged<String> onSelect) {
    final isSelected = selected == label;
    return InkWell(
      onTap: () => onSelect(label),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.violet700 : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.violet700 : AppColors.slate200,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : AppColors.slate700,
          ),
        ),
      ),
    );
  }
}

// ════════════════════════════════════════════════════════════
// Section header
// ════════════════════════════════════════════════════════════
class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  final Color color;
  const _SectionHeader({required this.title, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 18,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
            color: AppColors.slate900,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            '$count',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: color),
          ),
        ),
      ],
    );
  }
}

// ════════════════════════════════════════════════════════════
// Active alert card
// ════════════════════════════════════════════════════════════
class _AlerteCard extends StatelessWidget {
  final Sanction sanction;
  final VoidCallback? onTraiter;
  const _AlerteCard({required this.sanction, required this.onTraiter});

  @override
  Widget build(BuildContext context) {
    final severity = _severity(sanction.typeSanction);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate200, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: severity.color.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: severity.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(severity.icon, color: severity.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sanction.employeeName ?? 'Employé',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.slate900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      severity.label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: severity.color,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: severity.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  sanction.moisReference,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: severity.color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Motif
          Text(
            sanction.motif,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.slate500,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 10),

          // Metrics
          Row(
            children: [
              _metricBadge('${sanction.nbRetards} retards', AppColors.amber500),
              const SizedBox(width: 6),
              _metricBadge('${sanction.nbAbsencesInjust} abs. inj.', AppColors.rose500),
              const Spacer(),
              // Traiter button
              InkWell(
                onTap: onTraiter,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.violet700,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'TRAITER',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metricBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }

  _SeverityConfig _severity(String type) {
    switch (type) {
      case 'rappel_verbal':
        return _SeverityConfig('Rappel verbal recommandé', AppColors.amber500, Icons.record_voice_over_rounded);
      case 'avertissement':
        return _SeverityConfig('Avertissement écrit recommandé', const Color(0xFFF97316), Icons.warning_amber_rounded);
      default:
        return _SeverityConfig('Action disciplinaire recommandée', AppColors.rose500, Icons.gavel_rounded);
    }
  }
}

class _SeverityConfig {
  final String label;
  final Color color;
  final IconData icon;
  _SeverityConfig(this.label, this.color, this.icon);
}

// ════════════════════════════════════════════════════════════
// Treated card (compact)
// ════════════════════════════════════════════════════════════
class _TraiteeCard extends StatelessWidget {
  final Sanction sanction;
  const _TraiteeCard({required this.sanction});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.slate200, width: 0.5),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.emerald100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.check_rounded, size: 16, color: AppColors.emerald500),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sanction.employeeName ?? 'Employé',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.slate700,
                  ),
                ),
                Text(
                  '${sanction.moisReference} • ${sanction.commentaireAdmin ?? "Traité"}',
                  style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                ),
              ],
            ),
          ),
          const Text(
            'TRAITÉ',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: AppColors.emerald500,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
