import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';

class EmployeeFormScreen extends ConsumerStatefulWidget {
  final Employee? employee; // null = création, non-null = édition
  const EmployeeFormScreen({super.key, this.employee});

  @override
  ConsumerState<EmployeeFormScreen> createState() => _EmployeeFormScreenState();
}

class _EmployeeFormScreenState extends ConsumerState<EmployeeFormScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isSaving = false;

  late TextEditingController _firstNameCtrl;
  late TextEditingController _lastNameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _posteCtrl;
  late TextEditingController _matriculeCtrl;
  late TextEditingController _addressCtrl;

  String _selectedServiceId = '';
  String _typeContrat = 'CDI';
  TimeOfDay _heureDebut = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _heureFin = const TimeOfDay(hour: 17, minute: 0);
  DateTime _dateEmbauche = DateTime.now();
  DateTime? _dateFinContrat;

  bool get isEditing => widget.employee != null;

  @override
  void initState() {
    super.initState();
    final emp = widget.employee;
    _firstNameCtrl = TextEditingController(text: emp?.firstName ?? '');
    _lastNameCtrl = TextEditingController(text: emp?.lastName ?? '');
    _emailCtrl = TextEditingController(text: emp?.email ?? '');
    _phoneCtrl = TextEditingController(text: emp?.phone ?? '');
    _posteCtrl = TextEditingController(text: emp?.poste ?? '');
    _matriculeCtrl = TextEditingController(text: emp?.matricule ?? '');
    _addressCtrl = TextEditingController(text: emp?.address ?? '');
    _selectedServiceId = emp?.serviceId ?? '';
    _typeContrat = emp?.typeContrat ?? 'CDI';

    if (emp != null) {
      final dParts = emp.heureDebut.split(':');
      _heureDebut = TimeOfDay(
        hour: int.tryParse(dParts[0]) ?? 8,
        minute: int.tryParse(dParts[1]) ?? 0,
      );
      final fParts = emp.heureFin.split(':');
      _heureFin = TimeOfDay(
        hour: int.tryParse(fParts[0]) ?? 17,
        minute: int.tryParse(fParts[1]) ?? 0,
      );
      _dateEmbauche = DateTime.tryParse(emp.dateEmbauche) ?? DateTime.now();
      _dateFinContrat = emp.dateFinContrat != null ? DateTime.tryParse(emp.dateFinContrat!) : null;
    }
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _posteCtrl.dispose();
    _matriculeCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedServiceId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner un service'),
          backgroundColor: AppColors.rose500,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    final api = ref.read(apiClientProvider);
    if (api == null) return;

    try {
      final data = {
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'poste': _posteCtrl.text.trim(),
        'matricule': _matriculeCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'serviceId': _selectedServiceId,
        'typeContrat': _typeContrat,
        'heureDebut': '${_heureDebut.hour.toString().padLeft(2, '0')}:${_heureDebut.minute.toString().padLeft(2, '0')}',
        'heureFin': '${_heureFin.hour.toString().padLeft(2, '0')}:${_heureFin.minute.toString().padLeft(2, '0')}',
        'dateEmbauche': _dateEmbauche.toIso8601String().split('T')[0],
        'dateFinContrat': _dateFinContrat?.toIso8601String().split('T')[0],
      };

      if (isEditing) {
        await api.updateEmployee(widget.employee!.id, data);
      } else {
        await api.createEmployee(data);
      }

      // Rafraîchir la liste
      ref.invalidate(allEmployeesProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isEditing ? 'Employé modifié avec succès' : 'Employé créé avec succès',
              style: const TextStyle(fontWeight: FontWeight.w700),
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
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final servicesAsync = ref.watch(servicesProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        title: Text(
          isEditing ? 'MODIFIER EMPLOYÉ' : 'NOUVEL EMPLOYÉ',
          style: const TextStyle(
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
              // ─── Section : Identité ───
              _sectionHeader('IDENTITÉ', Icons.person_rounded),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildField(_lastNameCtrl, 'Nom', required: true)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildField(_firstNameCtrl, 'Prénom', required: true)),
                ],
              ),
              const SizedBox(height: 12),
              _buildField(_emailCtrl, 'Email', required: true, keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildField(_phoneCtrl, 'Téléphone', keyboardType: TextInputType.phone)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildField(_matriculeCtrl, 'Matricule',
                      hint: isEditing ? null : 'Auto-généré si vide')),
                ],
              ),
              const SizedBox(height: 12),
              _buildField(_addressCtrl, 'Adresse'),

              const SizedBox(height: 28),

              // ─── Section : Poste ───
              _sectionHeader('POSTE & SERVICE', Icons.business_rounded),
              const SizedBox(height: 12),
              _buildField(_posteCtrl, 'Poste', required: true),
              const SizedBox(height: 12),

              // Service dropdown
              servicesAsync.when(
                data: (services) {
                  // Auto-select first if empty
                  if (_selectedServiceId.isEmpty && services.isNotEmpty) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted) setState(() => _selectedServiceId = services.first.id);
                    });
                  }
                  return _buildDropdown<String>(
                    label: 'Service',
                    value: _selectedServiceId.isEmpty ? null : _selectedServiceId,
                    items: services.map((s) => DropdownMenuItem(value: s.id, child: Text(s.nom))).toList(),
                    onChanged: (val) => setState(() => _selectedServiceId = val ?? ''),
                  );
                },
                loading: () => const LinearProgressIndicator(color: AppColors.violet500),
                error: (_, __) => const Text('Erreur chargement services'),
              ),
              const SizedBox(height: 12),

              // Type contrat
              _buildDropdown<String>(
                label: 'Type de contrat',
                value: _typeContrat,
                items: ['CDI', 'CDD', 'Stage', 'Prestataire']
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (val) => setState(() => _typeContrat = val ?? 'CDI'),
              ),

              const SizedBox(height: 28),

              // ─── Section : Horaires ───
              _sectionHeader('HORAIRES & CONTRAT', Icons.schedule_rounded),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _buildTimePicker(
                      label: 'Arrivée',
                      value: _heureDebut,
                      onChanged: (v) => setState(() => _heureDebut = v),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildTimePicker(
                      label: 'Départ',
                      value: _heureFin,
                      onChanged: (v) => setState(() => _heureFin = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _buildDatePicker(
                      label: 'Date d\'embauche',
                      value: _dateEmbauche,
                      onChanged: (v) => setState(() => _dateEmbauche = v),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildDatePicker(
                      label: 'Fin contrat',
                      value: _dateFinContrat,
                      onChanged: (v) => setState(() => _dateFinContrat = v),
                      optional: true,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 36),

              // ─── Save button ───
              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.violet700,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 22, height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          isEditing ? 'ENREGISTRER LES MODIFICATIONS' : 'CRÉER L\'EMPLOYÉ',
                          style: const TextStyle(
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

  // ── Helpers ──

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

  Widget _buildField(
    TextEditingController controller,
    String label, {
    bool required = false,
    String? hint,
    TextInputType? keyboardType,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label.toUpperCase(),
        hintText: hint,
      ),
      validator: required
          ? (val) => (val == null || val.trim().isEmpty) ? 'Champ requis' : null
          : null,
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

  Widget _buildTimePicker({
    required String label,
    required TimeOfDay value,
    required ValueChanged<TimeOfDay> onChanged,
  }) {
    return InkWell(
      onTap: () async {
        final picked = await showTimePicker(
          context: context,
          initialTime: value,
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
          suffixIcon: const Icon(Icons.schedule_rounded, size: 18),
        ),
        child: Text(
          '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.slate900),
        ),
      ),
    );
  }

  Widget _buildDatePicker({
    required String label,
    required DateTime? value,
    required ValueChanged<DateTime> onChanged,
    bool optional = false,
  }) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: value ?? DateTime.now(),
          firstDate: DateTime(2020),
          lastDate: DateTime(2030),
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
          value != null
              ? value.toIso8601String().split('T')[0]
              : optional ? '—' : 'Sélectionner',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: value != null ? AppColors.slate900 : AppColors.slate400,
          ),
        ),
      ),
    );
  }
}
