import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import 'absence_form_screen.dart';
import '../widgets/absence_tile.dart'; // Supposing we create this or reuse existing tile

class EmployeeAbsencesScreen extends ConsumerWidget {
  const EmployeeAbsencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final myAbsencesAsync = ref.watch(myAbsencesProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Mes Absences',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: AppColors.slate900,
          ),
        ),
      ),
      body: myAbsencesAsync.when(
        data: (absences) {
          if (absences.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.violet100,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(Icons.event_available_rounded, size: 32, color: AppColors.violet600),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Aucune absence',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate900),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Vous n\'avez déclaré aucune absence récemmment.',
                    style: TextStyle(fontSize: 13, color: AppColors.slate400),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          // Séparer les absences en attente et traitées
          final pending = absences.where((a) => a.isPending).toList();
          final history = absences.where((a) => !a.isPending).toList();

          return RefreshIndicator(
            color: AppColors.violet600,
            onRefresh: () async => ref.invalidate(myAbsencesProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (pending.isNotEmpty) ...[
                  _SectionTitle(title: 'EN ATTENTE (${pending.length})', color: AppColors.amber500),
                  const SizedBox(height: 12),
                  ...pending.map((a) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _MyAbsenceCard(absence: a),
                  )),
                ],

                if (pending.isNotEmpty && history.isNotEmpty)
                  const SizedBox(height: 16),

                if (history.isNotEmpty) ...[
                  _SectionTitle(title: 'HISTORIQUE', color: AppColors.slate500),
                  const SizedBox(height: 12),
                  ...history.map((a) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _MyAbsenceCard(absence: a),
                  )),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
        error: (_, __) => const Center(child: Text('Erreur lors du chargement des absences')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const AbsenceFormScreen(),
            ),
          );
        },
        backgroundColor: AppColors.violet600,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text(
          'DÉCLARER',
          style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5, color: Colors.white),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final Color color;

  const _SectionTitle({required this.title, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          title,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _MyAbsenceCard extends StatelessWidget {
  final Absence absence;

  const _MyAbsenceCard({required this.absence});

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(absence.status);
    final statusIcon = _statusIcon(absence.status);
    final statusLabel = _statusLabel(absence.status);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(
            color: AppColors.slate200.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.slate50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.slate200),
                ),
                child: const Icon(Icons.event_note_rounded, color: AppColors.violet600, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      absence.typeAbsenceLabel,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.slate900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.date_range_rounded, size: 12, color: AppColors.slate400),
                        const SizedBox(width: 4),
                        Text(
                          '${absence.dateDebut} → ${absence.dateFin}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.slate500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          if (absence.demiJournee) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.amber100,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                absence.periodeDemiJournee == 'matin' ? 'Demi-journée (Matin)' : 'Demi-journée (Après-midi)',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppColors.amber700,
                ),
              ),
            ),
          ],
          
          const SizedBox(height: 14),

          // Ligne du bas : statut + justificatif
          Row(
            children: [
              if (absence.hasJustificatif) ...[
                const Icon(Icons.attach_file_rounded, size: 14, color: AppColors.slate400),
                const SizedBox(width: 4),
                const Text(
                  '1 pièce jointe',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.slate500,
                  ),
                ),
                const Spacer(),
              ] else ...[
                const Spacer(),
              ],
              
              // Badge de statut
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 14, color: statusColor),
                    const SizedBox(width: 6),
                    Text(
                      statusLabel,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Affichage du motif de rejet si applicable
          if (absence.isRejected && absence.motifRejet != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.rose500.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.rose500.withOpacity(0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'MOTIF DU REJET',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.rose500),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    absence.motifRejet!,
                    style: const TextStyle(fontSize: 12, color: AppColors.slate700, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),
          ]
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
