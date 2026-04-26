import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import 'absence_request_screen.dart';
import 'qr_scanner_screen.dart';

class EmployeeDashboard extends ConsumerStatefulWidget {
  const EmployeeDashboard({super.key});

  @override
  ConsumerState<EmployeeDashboard> createState() => _EmployeeDashboardState();
}

class _EmployeeDashboardState extends ConsumerState<EmployeeDashboard> {
  @override
  void initState() {
    super.initState();
    initializeDateFormatting('fr_FR', null);
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final statsAsync = ref.watch(monthStatsProvider);
    final pointageAsync = ref.watch(todayPointageProvider);
    final absencesAsync = ref.watch(myAbsencesProvider);

    return RefreshIndicator(
      color: AppColors.violet600,
      onRefresh: () async {
        ref.invalidate(monthStatsProvider);
        ref.invalidate(todayPointageProvider);
        ref.invalidate(myAbsencesProvider);
      },
      child: ListView(
        padding: const EdgeInsets.only(top: 16, bottom: 90, left: 16, right: 16),
        children: <Widget>[
          _HelloCard(
            firstName: user?.firstName ?? 'Collaborateur',
            isClockedIn: pointageAsync.value?.checkIn != null && pointageAsync.value?.checkOut == null,
          ),
          const SizedBox(height: 14),
          const _ClockInCard(),
          const SizedBox(height: 14),
          Row(
            children: <Widget>[
              Expanded(
                child: _StatCard(
                  title: 'Heures ce mois',
                  value: '${statsAsync.value?.heuresTotales ?? 0}h',
                  icon: Icons.access_time,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatCard(
                  title: 'Performance',
                  value: '${_calculatePerformance(statsAsync.value)}%',
                  subtitle: 'Basé sur présence',
                  icon: Icons.bar_chart,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _NextShiftCard(
            soldeConges: statsAsync.value?.soldeConges ?? 0,
            onTapAbsence: () => _showAbsenceSheet(context),
          ),
          const SizedBox(height: 14),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text('Activité Récente', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              Icon(Icons.tune, size: 16, color: Color(0xFF737685)),
            ],
          ),
          const SizedBox(height: 8),
          if (pointageAsync.value != null && pointageAsync.value!.checkIn != null)
            _ActivityTile(
              type: 'Pointage Entrée',
              time: pointageAsync.value!.checkIn!,
              isClockIn: true,
              date: _formatCurrentDate(),
            ),
          if (pointageAsync.value != null && pointageAsync.value!.checkOut != null)
            _ActivityTile(
              type: 'Pointage Sortie',
              time: pointageAsync.value!.checkOut!,
              isClockIn: false,
              date: _formatCurrentDate(),
            ),
          if (pointageAsync.value == null || pointageAsync.value!.checkIn == null)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Center(
                child: Text('Aucun pointage aujourd\'hui', style: TextStyle(color: AppColors.slate500)),
              ),
            ),
        ],
      ),
    );
  }

  int _calculatePerformance(dynamic stats) {
    if (stats == null) return 100;
    final int r = stats.retards is int ? stats.retards : 0;
    final int a = stats.absencesInjustifiees is int ? stats.absencesInjustifiees : 0;
    int perf = 100 - (r * 2) - (a * 5);
    return perf < 0 ? 0 : perf;
  }

  String _formatCurrentDate() {
    return DateFormat('dd MMM', 'fr_FR').format(DateTime.now());
  }

  void _showAbsenceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AbsenceRequestSheet(),
    );
  }
}

class _HelloCard extends StatelessWidget {
  final String firstName;
  final bool isClockedIn;

  const _HelloCard({required this.firstName, required this.isClockedIn});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE, d MMM', 'fr_FR');
    final String dateString = dateFormat.format(DateTime.now());
    final capitalizedDate = dateString[0].toUpperCase() + dateString.substring(1);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Bonjour, $firstName',
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.slate900),
                  ),
                ),
                const SizedBox(height: 4),
                Text(capitalizedDate, style: const TextStyle(color: AppColors.slate500)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isClockedIn ? const Color(0xFFDCFCE7) : const Color(0xFFFFDAD6),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: <Widget>[
                Icon(
                  Icons.circle,
                  size: 7,
                  color: isClockedIn ? const Color(0xFF15803D) : const Color(0xFFBA1A1A),
                ),
                const SizedBox(width: 8),
                Text(
                  isClockedIn ? 'En ligne' : 'Hors ligne',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: isClockedIn ? const Color(0xFF15803D) : const Color(0xFFBA1A1A),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ClockInCard extends StatelessWidget {
  const _ClockInCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.violet700.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(40),
              ),
              child: const Icon(Icons.qr_code_2, size: 40, color: AppColors.violet700),
            ),
            const SizedBox(height: 20),
            const Text(
              'Prêt à démarrer ?',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primaryBlack),
            ),
            const SizedBox(height: 10),
            const Text(
              'Scannez le QR code ou utilisez NFC à votre\nposte de travail pour pointer.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.slate500, height: 1.5),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                  );
                },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.violet700,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.smartphone, size: 20),
                label: const Text('Scanner pour pointer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.title, required this.value, required this.icon, this.subtitle});

  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(icon, size: 16, color: AppColors.slate500),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppColors.slate500,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.primaryBlack)),
            if (subtitle != null) ...<Widget>[
              const SizedBox(height: 4),
              Text(subtitle!, style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
            ],
          ],
        ),
      ),
    );
  }
}

class _NextShiftCard extends StatelessWidget {
  final int soldeConges;
  final VoidCallback onTapAbsence;

  const _NextShiftCard({required this.soldeConges, required this.onTapAbsence});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.violet50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: <Widget>[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: <Widget>[
                const Text('Soldes et Demandes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                InkWell(
                  onTap: onTapAbsence,
                  child: const Text('Nouvelle Demande', style: TextStyle(fontSize: 12, color: AppColors.violet700, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: <Widget>[
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.slate200),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      const Text('JRS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.slate500)),
                      Text('$soldeConges', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primaryBlack)),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Congés Payés',
                        style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.primaryBlack, fontSize: 16),
                      ),
                      SizedBox(height: 4),
                      Text('Jours disponibles', style: TextStyle(color: AppColors.slate500)),
                      SizedBox(height: 6),
                      Row(
                        children: <Widget>[
                          Icon(Icons.event_available, size: 14, color: AppColors.violet700),
                          SizedBox(width: 4),
                          Text(
                            'Cliquez sur Nouvelle Demande pour poser un congé',
                            style: TextStyle(fontSize: 9, color: AppColors.violet700, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final String type;
  final String time;
  final String date;
  final bool isClockIn;

  const _ActivityTile({
    required this.type,
    required this.time,
    required this.date,
    required this.isClockIn,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isClockIn ? AppColors.violet700.withValues(alpha: 0.1) : AppColors.violet500.withValues(alpha: 0.1),
          child: Icon(isClockIn ? Icons.login : Icons.logout, color: AppColors.violet700),
        ),
        title: Text(type, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('$date, $time', style: const TextStyle(color: AppColors.slate500)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: <Widget>[
            const Text('Vérifié', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.emerald500)),
            const Text('NFC/QR', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
          ],
        ),
      ),
    );
  }
}
