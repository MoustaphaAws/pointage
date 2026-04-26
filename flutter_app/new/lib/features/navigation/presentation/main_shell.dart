import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../screens/absences_screen.dart';
import '../../../screens/alerts_screen.dart';
import '../../../screens/history_screen.dart';
import '../../../screens/home_screen.dart';
import '../../../screens/profile_screen.dart';
import 'providers/navigation_provider.dart';

class MainShell extends ConsumerWidget {
  const MainShell({super.key});

  static const List<(IconData, String)> _destinations = <(IconData, String)>[
    (Icons.home_outlined, 'Home'),
    (Icons.access_time, 'History'),
    (Icons.event_note, 'Absences'),
    (Icons.notifications_outlined, 'Alerts'),
    (Icons.person_outline, 'Profile'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppTab activeTab = ref.watch(selectedTabProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8FF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leadingWidth: 160,
        leading: const Row(
          children: <Widget>[
            SizedBox(width: 16),
            Expanded(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  'Workforce',
                  style: TextStyle(
                    color: Color(0xFF003D9B),
                    fontWeight: FontWeight.w800,
                    fontSize: 20,
                  ),
                ),
              ),
            ),
          ],
        ),
        actions: const <Widget>[
          Icon(Icons.search, color: Color(0xFF737685)),
          SizedBox(width: 12),
          CircleAvatar(
            radius: 16,
            backgroundColor: Color(0xFF003D9B),
            backgroundImage: NetworkImage('https://i.pravatar.cc/150?u=david'),
            child: Text('MC', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
          SizedBox(width: 16),
        ],
      ),
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: _screenFor(activeTab),
          ),
        ),
      ),
      floatingActionButton: activeTab == AppTab.absences
          ? FloatingActionButton(
              onPressed: () {},
              backgroundColor: const Color(0xFF003D9B),
              foregroundColor: Colors.white,
              child: const Icon(Icons.add),
            )
          : null,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0x4DC3C6D6))),
        ),
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: List<Widget>.generate(_destinations.length, (int index) {
            final bool selected = index == activeTab.index;
            final (IconData icon, String label) = _destinations[index];
            return Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () {
                  ref.read(selectedTabProvider.notifier).state = AppTab.values[index];
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                  decoration: BoxDecoration(
                    color: selected ? const Color(0x14003D9B) : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Icon(icon, color: selected ? const Color(0xFF003D9B) : const Color(0x99737685)),
                      const SizedBox(height: 2),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: selected ? const Color(0xFF003D9B) : const Color(0x99737685),
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
    );
  }

  Widget _screenFor(AppTab tab) {
    switch (tab) {
      case AppTab.home:
        return const HomeScreen(key: ValueKey<String>('home'));
      case AppTab.history:
        return const HistoryScreen(key: ValueKey<String>('history'));
      case AppTab.absences:
        return const AbsencesScreen(key: ValueKey<String>('absences'));
      case AppTab.alerts:
        return const AlertsScreen(key: ValueKey<String>('alerts'));
      case AppTab.profile:
        return const ProfileScreen(key: ValueKey<String>('profile'));
    }
  }
}
