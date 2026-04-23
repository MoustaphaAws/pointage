import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'employee_dashboard.dart';
import 'admin_dashboard.dart';
import 'employee_list_screen.dart';
import 'absence_validation_screen.dart';
import 'alertes_disciplinaires_screen.dart';
import 'rapports_screen.dart';
import 'employee_pointages_screen.dart';
import 'employee_absences_screen.dart';
import 'employee_notifications_screen.dart';
import 'employee_profile_screen.dart';
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final isAdmin = user?.isAdmin ?? false;

    final tabs = isAdmin ? _adminTabs : _employeeTabs;

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        title: RichText(
          text: const TextSpan(
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            children: [
              TextSpan(
                text: 'Supervision ',
                style: TextStyle(color: AppColors.slate900),
              ),
              TextSpan(
                text: 'RH',
                style: TextStyle(color: AppColors.violet600),
              ),
            ],
          ),
        ),
        actions: [
          // Notification bell
          Stack(
            children: [
              IconButton(
                onPressed: () {},
                icon: const Icon(
                  Icons.notifications_none_rounded,
                  color: AppColors.slate400,
                ),
              ),
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: AppColors.rose500,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 4),
          // User info
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      user?.fullName ?? '',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.slate900,
                      ),
                    ),
                    Text(
                      user?.email ?? '',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: AppColors.slate400,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 10),
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.primaryBlack,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppColors.violet500.withValues(alpha: 0.2),
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    user?.initials ?? '?',
                    style: const TextStyle(
                      color: AppColors.violet400,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                IconButton(
                  onPressed: () => ref.read(authProvider.notifier).logout(),
                  icon: const Icon(
                    Icons.logout_rounded,
                    color: AppColors.slate400,
                    size: 20,
                  ),
                  tooltip: 'Déconnexion',
                ),
              ],
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: tabs.map((t) => t.screen).toList(),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.primaryBlack,
          border: Border(
            top: BorderSide(
              color: Color(0xFF1A1030),
              width: 1,
            ),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(tabs.length, (i) {
                final tab = tabs[i];
                final isActive = _currentIndex == i;
                return _buildNavItem(
                  icon: tab.icon,
                  label: tab.label,
                  isActive: isActive,
                  onTap: () => setState(() => _currentIndex = i),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isActive
              ? AppColors.violet600
              : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: AppColors.violet600.withValues(alpha: 0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isActive ? Colors.white : AppColors.slate500,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
                color: isActive ? Colors.white : AppColors.slate500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Tab Configs ───
  List<_TabConfig> get _employeeTabs => [
        _TabConfig(
          icon: Icons.dashboard_rounded,
          label: 'Dashboard',
          screen: const EmployeeDashboard(),
        ),
        _TabConfig(
          icon: Icons.access_time_rounded,
          label: 'Pointages',
          screen: const EmployeePointagesScreen(),
        ),
        _TabConfig(
          icon: Icons.calendar_month_rounded,
          label: 'Absences',
          screen: const EmployeeAbsencesScreen(),
        ),
        _TabConfig(
          icon: Icons.notifications_none_rounded,
          label: 'Alertes',
          screen: const EmployeeNotificationsScreen(),
        ),
        _TabConfig(
          icon: Icons.person_rounded,
          label: 'Profil',
          screen: const EmployeeProfileScreen(),
        ),
      ];

  List<_TabConfig> get _adminTabs => [
        _TabConfig(
          icon: Icons.dashboard_rounded,
          label: 'Dashboard',
          screen: const AdminDashboard(),
        ),
        _TabConfig(
          icon: Icons.people_rounded,
          label: 'Employés',
          screen: const EmployeeListScreen(),
        ),
        _TabConfig(
          icon: Icons.check_circle_rounded,
          label: 'Validation',
          screen: const AbsenceValidationScreen(),
        ),
        _TabConfig(
          icon: Icons.shield_rounded,
          label: 'Alertes',
          screen: const AlertesDisciplinairesScreen(),
        ),
        _TabConfig(
          icon: Icons.insert_chart_rounded,
          label: 'Rapports',
          screen: const RapportsScreen(),
        ),
      ];
}

class _TabConfig {
  final IconData icon;
  final String label;
  final Widget screen;

  _TabConfig({required this.icon, required this.label, required this.screen});
}
