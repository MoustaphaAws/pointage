import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class AbsenceRequestSheet extends ConsumerStatefulWidget {
  const AbsenceRequestSheet({super.key});

  @override
  ConsumerState<AbsenceRequestSheet> createState() => _AbsenceRequestSheetState();
}

class _AbsenceRequestSheetState extends ConsumerState<AbsenceRequestSheet> {
  String? _selectedTypeId;
  final _reasonController = TextEditingController();
  bool _isLoading = false;
  bool _isDemiJournee = false;
  String _periodeDemiJournee = 'matin';
  DateTime _dateDebut = DateTime.now();
  DateTime _dateFin = DateTime.now().add(const Duration(days: 1));

  Future<void> _pickDate(bool isStart) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _dateDebut : _dateFin,
      firstDate: DateTime.now().subtract(const Duration(days: 7)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: Theme.of(context).colorScheme.copyWith(primary: AppColors.violet700),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _dateDebut = picked;
          if (_dateFin.isBefore(_dateDebut)) _dateFin = _dateDebut;
        } else {
          _dateFin = picked;
        }
      });
    }
  }

  String _formatDate(DateTime d) => '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
  String _isoDate(DateTime d) => d.toIso8601String().split('T')[0];

  Future<void> _submitRequest() async {
    if (_selectedTypeId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Veuillez sélectionner un type d\'absence'),
          backgroundColor: AppColors.rose500,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      if (api != null) {
        await api.requestAbsence({
          'typeAbsenceId': _selectedTypeId,
          'dateDebut': _isoDate(_dateDebut),
          'dateFin': _isoDate(_dateFin),
          'demiJournee': _isDemiJournee,
          'periodeDemiJournee': _isDemiJournee ? _periodeDemiJournee : null,
          'motif': _reasonController.text.trim().isNotEmpty ? _reasonController.text.trim() : null,
        });
      }
      if (mounted) {
        Navigator.pop(context);
        ref.invalidate(myAbsencesProvider);
        ref.invalidate(monthStatsProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Demande envoyée avec succès !',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            backgroundColor: AppColors.emerald500,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: ${e.toString().contains('400') ? 'Vérifiez les champs' : 'Erreur serveur'}'),
            backgroundColor: AppColors.rose500,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final typesAsync = ref.watch(typesAbsenceProvider);

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.slate300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 16, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'NOUVELLE DEMANDE D\'ABSENCE',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                      color: AppColors.slate900,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(
                      Icons.cancel_rounded,
                      color: AppColors.slate400,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 24),

            // Form
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type selector (dynamic from API)
                  const Text(
                    'TYPE D\'ABSENCE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                      color: AppColors.slate500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: AppColors.slate50,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.slate200, width: 0.5),
                    ),
                    child: typesAsync.when(
                      data: (types) => DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedTypeId,
                          isExpanded: true,
                          hint: const Text('Sélectionner un type', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.slate400)),
                          items: types.map((t) => DropdownMenuItem(
                            value: t.id,
                            child: Text(t.libelle, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          )).toList(),
                          onChanged: (v) {
                            if (v != null) setState(() => _selectedTypeId = v);
                          },
                        ),
                      ),
                      loading: () => const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                      ),
                      error: (_, __) => const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Text('Erreur de chargement des types', style: TextStyle(color: AppColors.rose500)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Dates
                  const Text(
                    'PÉRIODE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                      color: AppColors.slate500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => _pickDate(true),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
                            decoration: BoxDecoration(
                              color: AppColors.slate50,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.slate200, width: 0.5),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.violet600),
                                const SizedBox(width: 8),
                                Text(_formatDate(_dateDebut), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 8),
                        child: Icon(Icons.arrow_forward_rounded, size: 18, color: AppColors.slate400),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () => _pickDate(false),
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
                            decoration: BoxDecoration(
                              color: AppColors.slate50,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.slate200, width: 0.5),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.violet600),
                                const SizedBox(width: 8),
                                Text(_formatDate(_dateFin), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Demi-journée switch
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.slate50,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.slate200, width: 0.5),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Demi-journée', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                        Switch(
                          value: _isDemiJournee,
                          onChanged: (v) => setState(() => _isDemiJournee = v),
                          activeColor: AppColors.violet700,
                        ),
                      ],
                    ),
                  ),
                  if (_isDemiJournee) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _PeriodChip(
                            label: 'Matin',
                            isActive: _periodeDemiJournee == 'matin',
                            onTap: () => setState(() => _periodeDemiJournee = 'matin'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _PeriodChip(
                            label: 'Après-midi',
                            isActive: _periodeDemiJournee == 'apres_midi',
                            onTap: () => setState(() => _periodeDemiJournee = 'apres_midi'),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 20),

                  // Reason
                  const Text(
                    'MOTIF (OPTIONNEL)',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                      color: AppColors.slate500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _reasonController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Expliquez brièvement le motif...',
                      fillColor: AppColors.slate50,
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: const BorderSide(color: AppColors.slate200, width: 0.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _submitRequest,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        backgroundColor: AppColors.violet700,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'ENVOYER LA DEMANDE',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.5,
                                fontSize: 13,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PeriodChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _PeriodChip({required this.label, required this.isActive, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isActive ? AppColors.violet700 : AppColors.slate50,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isActive ? AppColors.violet700 : AppColors.slate200),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 13,
              color: isActive ? Colors.white : AppColors.slate500,
            ),
          ),
        ),
      ),
    );
  }
}
