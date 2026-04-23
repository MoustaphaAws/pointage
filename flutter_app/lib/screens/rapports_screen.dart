import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';

class RapportsScreen extends ConsumerStatefulWidget {
  const RapportsScreen({super.key});

  @override
  ConsumerState<RapportsScreen> createState() => _RapportsScreenState();
}

class _RapportsScreenState extends ConsumerState<RapportsScreen> {
  String _selectedPeriod = 'Ce mois';
  String? _selectedService;
  bool _isExporting = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Rapports',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: AppColors.slate900,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Filtres ───
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.slate200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.filter_list_rounded, size: 18, color: AppColors.violet600),
                      SizedBox(width: 8),
                      Text('FILTRES', style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                        color: AppColors.slate900,
                      )),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Période
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['Ce mois', 'Mois dernier', 'Ce trimestre', 'Cette année']
                          .map((p) => Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: _filterChip(
                                  p,
                                  isSelected: _selectedPeriod == p,
                                  onTap: () => setState(() => _selectedPeriod = p),
                                ),
                              ))
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Service filter
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _filterChip(
                          'Tous les services',
                          isSelected: _selectedService == null,
                          onTap: () => setState(() => _selectedService = null),
                        ),
                        const SizedBox(width: 8),
                        ...['Développement', 'Ressources Humaines', 'Marketing', 'Commercial'].map(
                          (s) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: _filterChip(
                              s,
                              isSelected: _selectedService == s,
                              onTap: () => setState(() => _selectedService = _selectedService == s ? null : s),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ─── Rapports disponibles ───
            const Row(
              children: [
                Icon(Icons.description_rounded, size: 18, color: AppColors.violet600),
                SizedBox(width: 8),
                Text('RAPPORTS DISPONIBLES', style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                  color: AppColors.slate900,
                )),
              ],
            ),
            const SizedBox(height: 14),

            _ReportCard(
              title: 'Rapport de pointage',
              description: 'Détail des arrivées, départs, retards et heures supplémentaires de chaque employé.',
              icon: Icons.access_time_rounded,
              color: AppColors.violet600,
              formats: const ['Excel', 'PDF'],
              isExporting: _isExporting,
              onExport: (format) => _export('Pointage', format),
            ),
            const SizedBox(height: 12),

            _ReportCard(
              title: 'Rapport d\'absences',
              description: 'Synthèse des absences par type, statut de validation et justificatifs.',
              icon: Icons.event_busy_rounded,
              color: AppColors.amber500,
              formats: const ['Excel', 'PDF'],
              isExporting: _isExporting,
              onExport: (format) => _export('Absences', format),
            ),
            const SizedBox(height: 12),

            _ReportCard(
              title: 'Rapport de paie mensuel',
              description: 'Récapitulatif mensuel prêt pour la comptabilité : heures, retards, jours travaillés.',
              icon: Icons.payment_rounded,
              color: AppColors.emerald500,
              formats: const ['Excel'],
              isExporting: _isExporting,
              onExport: (format) => _export('Paie', format),
            ),
            const SizedBox(height: 12),

            _ReportCard(
              title: 'Rapport disciplinaire',
              description: 'Historique des alertes, sanctions et avertissements par employé.',
              icon: Icons.gavel_rounded,
              color: AppColors.rose500,
              formats: const ['PDF'],
              isExporting: _isExporting,
              onExport: (format) => _export('Disciplinaire', format),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, {required bool isSelected, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryBlack : AppColors.slate50,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primaryBlack : AppColors.slate200,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : AppColors.slate500,
          ),
        ),
      ),
    );
  }

  Future<void> _export(String type, String format) async {
    setState(() => _isExporting = true);

    // Simulate export delay
    await Future.delayed(const Duration(seconds: 2));

    setState(() => _isExporting = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(
                'Rapport $type ($format) exporté ✓',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          backgroundColor: AppColors.emerald500,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }
}

// ════════════════════════════════════════════════════════════
// Report Card
// ════════════════════════════════════════════════════════════
class _ReportCard extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final List<String> formats;
  final bool isExporting;
  final ValueChanged<String> onExport;

  const _ReportCard({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.formats,
    required this.isExporting,
    required this.onExport,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(
            color: AppColors.slate200.withValues(alpha: 0.2),
            blurRadius: 10,
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
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.slate900,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            description,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.slate400,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),

          // Export buttons
          Row(
            children: formats
                .map((f) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: InkWell(
                        onTap: isExporting ? null : () => onExport(f),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: isExporting ? AppColors.slate100 : color,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                f == 'Excel'
                                    ? Icons.table_chart_rounded
                                    : Icons.picture_as_pdf_rounded,
                                size: 16,
                                color: isExporting ? AppColors.slate400 : Colors.white,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                f.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                  color: isExporting ? AppColors.slate400 : Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}
