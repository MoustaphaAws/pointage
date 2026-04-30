import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';

class RapportsScreen extends ConsumerStatefulWidget {
  const RapportsScreen({super.key});

  @override
  ConsumerState<RapportsScreen> createState() => _RapportsScreenState();
}

class _RapportsScreenState extends ConsumerState<RapportsScreen> {
  String _selectedPeriod = 'Ce mois';
  String? _selectedServiceId;
  String _exportingType = ''; // '' = not exporting, 'Pointage_Excel' etc.

  /// Convertir la période sélectionnée en paramètre "month" format YYYY-MM
  String _getMonthParam() {
    final now = DateTime.now();
    switch (_selectedPeriod) {
      case 'Mois dernier':
        final prev = DateTime(now.year, now.month - 1, 1);
        return '${prev.year}-${prev.month.toString().padLeft(2, '0')}';
      case 'Ce trimestre':
        // Début du trimestre courant
        final qStart = ((now.month - 1) ~/ 3) * 3 + 1;
        return '${now.year}-${qStart.toString().padLeft(2, '0')}';
      case 'Cette année':
        return '${now.year}-01';
      default: // 'Ce mois'
        return '${now.year}-${now.month.toString().padLeft(2, '0')}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final servicesAsync = ref.watch(servicesProvider);

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

                  // Service filter (dynamic from API)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _filterChip(
                          'Tous les services',
                          isSelected: _selectedServiceId == null,
                          onTap: () => setState(() => _selectedServiceId = null),
                        ),
                        const SizedBox(width: 8),
                        ...servicesAsync.when(
                          data: (services) => services.map(
                            (s) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: _filterChip(
                                s.nom,
                                isSelected: _selectedServiceId == s.id,
                                onTap: () => setState(() => _selectedServiceId = _selectedServiceId == s.id ? null : s.id),
                              ),
                            ),
                          ),
                          loading: () => [const SizedBox.shrink()],
                          error: (_, __) => [const SizedBox.shrink()],
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
              formats: const ['Excel', 'CSV'],
              exportingType: _exportingType,
              onExport: (format) => _export('Pointage', format),
            ),
            const SizedBox(height: 12),

            _ReportCard(
              title: 'Rapport d\'absences',
              description: 'Synthèse des absences par type, statut de validation et justificatifs.',
              icon: Icons.event_busy_rounded,
              color: AppColors.amber500,
              formats: const ['CSV'],
              exportingType: _exportingType,
              onExport: (format) => _export('Absences', format),
            ),
            const SizedBox(height: 12),

            _ReportCard(
              title: 'Rapport de paie mensuel',
              description: 'Récapitulatif mensuel prêt pour la comptabilité : heures, retards, jours travaillés.',
              icon: Icons.payment_rounded,
              color: AppColors.emerald500,
              formats: const ['CSV'],
              exportingType: _exportingType,
              onExport: (format) => _export('Paie', format),
            ),
            const SizedBox(height: 12),

            _ReportCard(
              title: 'Rapport disciplinaire',
              description: 'Historique des alertes, sanctions et avertissements par employé.',
              icon: Icons.gavel_rounded,
              color: AppColors.rose500,
              formats: const ['CSV'],
              exportingType: _exportingType,
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
          color: isSelected ? AppColors.violet700 : AppColors.slate50,
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
            color: isSelected ? Colors.white : AppColors.slate500,
          ),
        ),
      ),
    );
  }

  Future<void> _export(String type, String format) async {
    final exportKey = '${type}_$format';
    setState(() => _exportingType = exportKey);

    try {
      final api = ref.read(apiClientProvider);
      if (api == null) {
        _showError('Non connecté');
        return;
      }

      final month = _getMonthParam();
      Response response;

      switch (type) {
        case 'Pointage':
          response = await api.exportPointages(
            month: month,
            format: format.toLowerCase() == 'excel' ? 'excel' : 'csv',
          );
          break;
        case 'Absences':
          response = await api.exportAbsences(month: month);
          break;
        case 'Paie':
          response = await api.exportPaie(month: month);
          break;
        case 'Disciplinaire':
          response = await api.exportDisciplinaire();
          break;
        default:
          _showError('Type de rapport inconnu');
          return;
      }

      if (response.statusCode == 200) {
        if (mounted) {
          _showSuccess(type, format, response);
        }
      } else {
        _showError('Erreur serveur (${response.statusCode})');
      }
    } catch (e) {
      _showError('Erreur: $e');
    } finally {
      if (mounted) {
        setState(() => _exportingType = '');
      }
    }
  }

  void _showSuccess(String type, String format, Response response) {
    // Determine data size for feedback
    final dataLength = response.data is String 
        ? (response.data as String).length 
        : response.data is List<int> 
            ? (response.data as List<int>).length 
            : 0;
    
    final sizeKb = (dataLength / 1024).toStringAsFixed(1);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Rapport $type ($format) généré ✓ — ${sizeKb}KB',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.emerald500,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.rose500,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
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
  final String exportingType;
  final ValueChanged<String> onExport;

  const _ReportCard({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.formats,
    required this.exportingType,
    required this.onExport,
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
                .map((f) {
                  // Match on report type from title
                  final isThisExporting = exportingType.endsWith('_$f') && exportingType.isNotEmpty;
                  
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: InkWell(
                      onTap: exportingType.isNotEmpty ? null : () => onExport(f),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: exportingType.isNotEmpty ? AppColors.slate100 : color,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isThisExporting)
                              const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.slate400,
                                ),
                              )
                            else
                              Icon(
                                f == 'Excel'
                                    ? Icons.table_chart_rounded
                                    : Icons.description_rounded,
                                size: 16,
                                color: exportingType.isNotEmpty ? AppColors.slate400 : Colors.white,
                              ),
                            const SizedBox(width: 6),
                            Text(
                              f.toUpperCase(),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                                color: exportingType.isNotEmpty ? AppColors.slate400 : Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                })
                .toList(),
          ),
        ],
      ),
    );
  }
}
