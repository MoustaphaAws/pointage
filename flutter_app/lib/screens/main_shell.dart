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
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final tabs = isAdmin ? _adminTabs : _employeeTabs;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        leadingWidth: 160,
        leading: Row(
          children: <Widget>[
            const SizedBox(width: 16),
            Expanded(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: RichText(
                  text: TextSpan(
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.8,
                    ),
                    children: [
                      const TextSpan(
                        text: 'Digital',
                        style: TextStyle(color: AppColors.violet700),
                      ),
                      TextSpan(
                        text: 'Afrika',
                        style: TextStyle(color: colorScheme.onSurface),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(
              Icons.search,
              color: isDark ? AppColors.darkTextSecondary : AppColors.slate500,
              size: 22,
            ),
          ),
          InkWell(
            onTap: () {
              if (isAdmin) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => Scaffold(
                      backgroundColor: colorScheme.surface,
                      appBar: AppBar(
                        title: const Text('Mon Profil', style: TextStyle(fontWeight: FontWeight.w800)),
                        backgroundColor: colorScheme.surface,
                        elevation: 0,
                      ),
                      body: const EmployeeProfileScreen(),
                    ),
                  ),
                );
              } else {
                setState(() => _currentIndex = 4);
              }
            },
            borderRadius: BorderRadius.circular(20),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.violet700,
                child: Text(
                  user?.initials ?? '?',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: tabs.map((t) => t.screen).toList(),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          border: Border(
            top: BorderSide(
              color: isDark ? AppColors.darkBorder : AppColors.slate200,
              width: 0.5,
            ),
          ),
        ),
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(tabs.length, (i) {
              final tab = tabs[i];
              final isActive = _currentIndex == i;
              return Expanded(
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => setState(() => _currentIndex = i),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                    decoration: BoxDecoration(
                      color: isActive ? AppColors.violet700.withValues(alpha: 0.08) : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          tab.icon,
                          size: 24,
                          color: isActive ? AppColors.violet700 : AppColors.slate500.withValues(alpha: 0.6),
                        ),
                        const SizedBox(height: 2),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            tab.label,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isActive ? AppColors.violet700 : AppColors.slate500.withValues(alpha: 0.6),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
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
