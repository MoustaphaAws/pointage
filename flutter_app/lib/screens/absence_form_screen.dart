import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';

class AbsenceFormScreen extends ConsumerStatefulWidget {
  const AbsenceFormScreen({super.key});

  @override
  ConsumerState<AbsenceFormScreen> createState() => _AbsenceFormScreenState();
}

class _AbsenceFormScreenState extends ConsumerState<AbsenceFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _motifCtrl = TextEditingController();

  String _selectedTypeId = '';
  DateTime _dateDebut = DateTime.now();
  DateTime _dateFin = DateTime.now().add(const Duration(days: 1));
  bool _demiJournee = false;
  String _periodeDemiJournee = 'matin'; // 'matin' ou 'apres_midi'
  
  PlatformFile? _justificatifFile;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _motifCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
        withData: true,
      );

      if (result != null) {
        setState(() {
          _justificatifFile = result.files.first;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Erreur lors de la sélection du fichier'),
            backgroundColor: AppColors.rose500,
          ),
        );
      }
    }
  }

  void _removeFile() {
    setState(() {
      _justificatifFile = null;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedTypeId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner un type d\'absence'),
          backgroundColor: AppColors.rose500,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_dateDebut.isAfter(_dateFin) && !_demiJournee) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('La date de fin doit être postérieure à la date de début'),
          backgroundColor: AppColors.rose500,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final api = ref.read(apiClientProvider);
    if (api == null) return;

    try {
      final data = {
        'typeAbsenceId': _selectedTypeId,
        'dateDebut': _dateDebut.toIso8601String().split('T')[0],
        'dateFin': _demiJournee 
            ? _dateDebut.toIso8601String().split('T')[0] 
            : _dateFin.toIso8601String().split('T')[0],
        'motif': _motifCtrl.text.trim(),
        'demiJournee': _demiJournee,
        if (_demiJournee) 'periodeDemiJournee': _periodeDemiJournee,
        if (_justificatifFile != null) 'hasJustificatif': true, // Simulated
      };

      await api.requestAbsence(data);

      ref.invalidate(myAbsencesProvider);
      ref.invalidate(allAbsencesProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Absence déclarée avec succès ✓',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            backgroundColor: AppColors.emerald500,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur : $e'),
            backgroundColor: AppColors.rose500,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final typesAsync = ref.watch(typesAbsenceProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        title: const Text(
          'NOUVELLE ABSENCE',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        centerTitle: true,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ─── Type d'absence ───
              _sectionHeader('TYPE', Icons.category_rounded),
              const SizedBox(height: 12),
              typesAsync.when(
                data: (types) {
                  if (_selectedTypeId.isEmpty && types.isNotEmpty) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted) setState(() => _selectedTypeId = types.first.id);
                    });
                  }
                  return _buildDropdown<String>(
                    label: 'Motif d\'absence',
                    value: _selectedTypeId.isEmpty ? null : _selectedTypeId,
                    items: types.map((t) => DropdownMenuItem(value: t.id, child: Text(t.libelle))).toList(),
                    onChanged: (val) => setState(() => _selectedTypeId = val ?? ''),
                  );
                },
                loading: () => const LinearProgressIndicator(color: AppColors.violet500),
                error: (_, __) => const Text('Erreur chargement types'),
              ),
              
              const SizedBox(height: 28),

              // ─── Période ───
              _sectionHeader('PÉRIODE', Icons.calendar_month_rounded),
              const SizedBox(height: 12),
              
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Demi-journée uniquement',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.slate900),
                ),
                activeColor: AppColors.violet600,
                value: _demiJournee,
                onChanged: (val) => setState(() => _demiJournee = val),
              ),

              if (_demiJournee) ...[
                const SizedBox(height: 8),
                _buildDatePicker(
                  label: 'Date',
                  value: _dateDebut,
                  onChanged: (v) => setState(() => _dateDebut = v),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _radioOption(
                        title: 'Matin',
                        value: 'matin',
                        groupValue: _periodeDemiJournee,
                        onChanged: (v) => setState(() => _periodeDemiJournee = v!),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _radioOption(
                        title: 'Après-midi',
                        value: 'apres_midi',
                        groupValue: _periodeDemiJournee,
                        onChanged: (v) => setState(() => _periodeDemiJournee = v!),
                      ),
                    ),
                  ],
                ),
              ] else ...[
                Row(
                  children: [
                    Expanded(
                      child: _buildDatePicker(
                        label: 'Début',
                        value: _dateDebut,
                        onChanged: (v) => setState(() => _dateDebut = v),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDatePicker(
                        label: 'Fin',
                        value: _dateFin,
                        onChanged: (v) => setState(() => _dateFin = v),
                      ),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 28),

              // ─── Détails & Justificatif ───
              _sectionHeader('DÉTAILS', Icons.edit_document),
              const SizedBox(height: 12),
              TextFormField(
                controller: _motifCtrl,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'DESCRIPTION / MOTIF (OPTIONNEL)',
                  hintText: 'Précisez la raison de votre absence...',
                ),
              ),
              const SizedBox(height: 20),

              // File upload zone
              const Text(
                'JUSTIFICATIF',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                  color: AppColors.slate500,
                ),
              ),
              const SizedBox(height: 8),
              
              if (_justificatifFile != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.violet500.withOpacity(0.3), width: 0.5),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.description_rounded, color: AppColors.violet600, size: 28),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _justificatifFile!.name,
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (_justificatifFile!.size > 0)
                              Text(
                                '${(_justificatifFile!.size / 1024).toStringAsFixed(0)} KB',
                                style: const TextStyle(color: AppColors.slate500, fontSize: 11),
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: AppColors.rose500),
                        onPressed: _removeFile,
                      ),
                    ],
                  ),
                )
              else
                InkWell(
                  onTap: _pickFile,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    decoration: BoxDecoration(
                      color: AppColors.violet50,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.violet200, style: BorderStyle.solid),
                    ),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.violet500.withOpacity(0.1),
                                blurRadius: 10,
                              ),
                            ],
                          ),
                          child: const Icon(Icons.upload_file_rounded, color: AppColors.violet600, size: 28),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Ajouter un justificatif',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: AppColors.violet700,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'PDF, JPG, PNG (Max 5MB)',
                          style: TextStyle(
                            color: AppColors.violet400,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              const SizedBox(height: 40),

              // Submit button
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.violet700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22, height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text(
                          'SOUMETTRE LA DEMANDE',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.5,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  // Helpers
  Widget _sectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.violet600),
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
      ],
    );
  }

  Widget _buildDropdown<T>({
    required String label,
    required T? value,
    required List<DropdownMenuItem<T>> items,
    required ValueChanged<T?> onChanged,
  }) {
    return InputDecorator(
      decoration: InputDecoration(
        labelText: label.toUpperCase(),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          isExpanded: true,
          value: value,
          items: items,
          onChanged: onChanged,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.slate900),
        ),
      ),
    );
  }

  Widget _buildDatePicker({
    required String label,
    required DateTime value,
    required ValueChanged<DateTime> onChanged,
  }) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: value,
          firstDate: DateTime.now().subtract(const Duration(days: 30)),
          lastDate: DateTime.now().add(const Duration(days: 365)),
          builder: (context, child) => Theme(
            data: Theme.of(context).copyWith(
              colorScheme: Theme.of(context).colorScheme.copyWith(
                primary: AppColors.violet600,
              ),
            ),
            child: child!,
          ),
        );
        if (picked != null) onChanged(picked);
      },
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label.toUpperCase(),
          suffixIcon: const Icon(Icons.calendar_today_rounded, size: 18),
        ),
        child: Text(
          value.toIso8601String().split('T')[0],
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.slate900,
          ),
        ),
      ),
    );
  }

  Widget _radioOption({
    required String title,
    required String value,
    required String groupValue,
    required ValueChanged<String?> onChanged,
  }) {
    final isSelected = value == groupValue;
    return InkWell(
      onTap: () => onChanged(value),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.violet50 : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? AppColors.violet500 : AppColors.slate200),
        ),
        alignment: Alignment.center,
        child: Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? AppColors.violet700 : AppColors.slate600,
          ),
        ),
      ),
    );
  }
}
