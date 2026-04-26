import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import 'employee_detail_screen.dart';
import 'employee_form_screen.dart';

class EmployeeListScreen extends ConsumerStatefulWidget {
  const EmployeeListScreen({super.key});

  @override
  ConsumerState<EmployeeListScreen> createState() => _EmployeeListScreenState();
}

class _EmployeeListScreenState extends ConsumerState<EmployeeListScreen> {
  String _searchQuery = '';
  String _filterStatus = 'Tous'; // 'Tous', 'Actifs', 'Inactifs'
  String? _filterService;

  @override
  Widget build(BuildContext context) {
    final employeesAsync = ref.watch(allEmployeesProvider);
    final servicesAsync = ref.watch(servicesProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Équipe',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: AppColors.slate900,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {
              // TODO: Scanner badge direct (bonus)
            },
            icon: const Icon(Icons.nfc_rounded, color: AppColors.slate400),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(130),
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              children: [
                // Search Bar
                TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Rechercher un employé (nom, mat...)',
                    hintStyle: const TextStyle(
                      color: AppColors.slate400,
                      fontWeight: FontWeight.w500,
                    ),
                    prefixIcon: const Icon(Icons.search_rounded, color: AppColors.slate400),
                    filled: true,
                    fillColor: AppColors.slate100,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0),
                  ),
                ),
                const SizedBox(height: 12),
                // Filters row
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildChip(
                        label: 'Actifs',
                        isSelected: _filterStatus == 'Actifs',
                        onTap: () => setState(() => _filterStatus = _filterStatus == 'Actifs' ? 'Tous' : 'Actifs'),
                      ),
                      const SizedBox(width: 8),
                      _buildChip(
                        label: 'Inactifs',
                        isSelected: _filterStatus == 'Inactifs',
                        onTap: () => setState(() => _filterStatus = _filterStatus == 'Inactifs' ? 'Tous' : 'Inactifs'),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        width: 1,
                        height: 24,
                        color: AppColors.slate200,
                      ),
                      const SizedBox(width: 8),
                      ...servicesAsync.when(
                        data: (services) => services.map((s) => Row(
                              children: [
                                _buildChip(
                                  label: s.nom,
                                  isSelected: _filterService == s.id,
                                  onTap: () => setState(() => _filterService = _filterService == s.id ? null : s.id),
                                ),
                                const SizedBox(width: 8),
                              ],
                            )),
                        loading: () => [const SizedBox.shrink()],
                        error: (_, __) => [const SizedBox.shrink()],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: employeesAsync.when(
        data: (employees) {
          // Filtrage
          var filtered = employees;
          if (_filterStatus == 'Actifs') filtered = filtered.where((e) => e.actif).toList();
          if (_filterStatus == 'Inactifs') filtered = filtered.where((e) => !e.actif).toList();
          if (_filterService != null) filtered = filtered.where((e) => e.serviceId == _filterService).toList();
          if (_searchQuery.isNotEmpty) {
            final q = _searchQuery.toLowerCase();
            filtered = filtered.where((e) =>
                e.fullName.toLowerCase().contains(q) ||
                e.matricule.toLowerCase().contains(q) ||
                e.poste.toLowerCase().contains(q)).toList();
          }

          if (filtered.isEmpty) {
            return const Center(child: Text('Aucun employé trouvé.'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final emp = filtered[index];
              return _buildEmployeeCard(emp);
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Erreur: $err')),
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'add_employee',
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const EmployeeFormScreen(),
            ),
          );
        },
        backgroundColor: AppColors.violet600,
        child: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white),
      ),
    );
  }

  Widget _buildChip({required String label, required bool isSelected, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
            color: isSelected ? Colors.white : AppColors.slate500,
          ),
        ),
      ),
    );
  }

  Widget _buildEmployeeCard(Employee emp) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => EmployeeDetailScreen(employee: emp),
          ),
        );
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
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
        child: Row(
          children: [
            // Avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: emp.isAdmin ? AppColors.violet700 : AppColors.slate100,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: Text(
                emp.initials,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: emp.isAdmin ? AppColors.violet400 : AppColors.slate500,
                ),
              ),
            ),
            const SizedBox(width: 16),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        emp.fullName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.slate900,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Status dot
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: emp.actif ? AppColors.emerald500 : AppColors.slate300,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    emp.poste,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.slate500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _badgeText(emp.matricule, AppColors.slate100, AppColors.slate500),
                      const SizedBox(width: 6),
                      _badgeText(emp.serviceName ?? '', AppColors.violet50, AppColors.violet600),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.slate300,
            ),
          ],
        ),
      ),
    );
  }

  Widget _badgeText(String text, Color bg, Color textCol) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          color: textCol,
        ),
      ),
    );
  }
}
