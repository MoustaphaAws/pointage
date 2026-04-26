import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';

class EmployeePointagesScreen extends ConsumerStatefulWidget {
  const EmployeePointagesScreen({super.key});

  @override
  ConsumerState<EmployeePointagesScreen> createState() => _EmployeePointagesScreenState();
}

class _EmployeePointagesScreenState extends ConsumerState<EmployeePointagesScreen> {
  String _selectedFilter = 'Ce mois'; // 'Cette semaine', 'Ce mois', 'Mois précédent'

  @override
  Widget build(BuildContext context) {
    final pointagesAsync = ref.watch(pointageHistoryProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      body: pointagesAsync.when(
        data: (pointages) {
          // Filtrer selon la période sélectionnée
          final now = DateTime.now();
          final filtered = pointages.where((p) {
            try {
              final parts = p.date.split('-');
              if (parts.length != 3) return true;
              final date = DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
              if (_selectedFilter == 'Cette semaine') {
                final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
                return date.isAfter(startOfWeek.subtract(const Duration(days: 1)));
              } else if (_selectedFilter == 'Ce mois') {
                return date.month == now.month && date.year == now.year;
              } else if (_selectedFilter == 'Mois précédent') {
                final prevMonth = DateTime(now.year, now.month - 1);
                return date.month == prevMonth.month && date.year == prevMonth.year;
              }
              return true;
            } catch (_) {
              return true;
            }
          }).toList();

          return RefreshIndicator(
            color: AppColors.violet600,
            onRefresh: () async => ref.invalidate(pointageHistoryProvider),
            child: ListView(
              padding: const EdgeInsets.only(top: 16, bottom: 90, left: 16, right: 16),
              children: <Widget>[
                const Text('Historique', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppColors.primaryBlack)),
                const SizedBox(height: 4),
                const Text('Consultez vos pointages et votre présence.', style: TextStyle(color: AppColors.slate500)),
                const SizedBox(height: 16),

                // Filters
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['Cette semaine', 'Ce mois', 'Mois précédent']
                        .map((f) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: InkWell(
                                onTap: () => setState(() => _selectedFilter = f),
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: _selectedFilter == f ? AppColors.violet700 : Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: _selectedFilter == f ? AppColors.violet700 : AppColors.slate200,
                                    ),
                                  ),
                                  child: Text(
                                    f,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: _selectedFilter == f ? Colors.white : AppColors.slate500,
                                    ),
                                  ),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
                const SizedBox(height: 24),

                if (filtered.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(40),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: AppColors.slate200.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: const Icon(Icons.access_time_rounded, size: 32, color: AppColors.slate400),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Aucun pointage',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primaryBlack),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Vous n\'avez pas encore pointé sur cette période.',
                            style: TextStyle(fontSize: 13, color: AppColors.slate500),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...filtered.expand((pointage) {
                    return [
                      _HistoryDayHeader(
                        date: _formatHeaderDate(pointage.date),
                        total: pointage.formattedDuration,
                      ),
                      const SizedBox(height: 12),
                      _DayCard(pointage: pointage),
                      const SizedBox(height: 24),
                    ];
                  }),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
        error: (_, __) => const Center(child: Text('Erreur de chargement des pointages')),
      ),
    );
  }

  String _formatHeaderDate(String rawDate) {
    try {
      final parts = rawDate.split('-');
      if (parts.length == 3) {
        final date = DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
        return DateFormat('EEE, d MMM', 'fr_FR').format(date).toUpperCase();
      }
    } catch (_) {}
    return rawDate;
  }
}

class _HistoryDayHeader extends StatelessWidget {
  const _HistoryDayHeader({required this.date, required this.total});
  final String date;
  final String total;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: <Widget>[
        Expanded(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(date, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.slate500, letterSpacing: 1.1)),
          ),
        ),
        const SizedBox(width: 12),
        Text(total.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.violet700, letterSpacing: 1.1)),
      ],
    );
  }
}

class _DayCard extends StatelessWidget {
  final Pointage pointage;
  const _DayCard({required this.pointage});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppColors.slate200, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: <Widget>[
            if (pointage.checkIn != null)
              _TimeEntry(
                icon: Icons.login,
                iconBg: AppColors.violet700.withValues(alpha: 0.1),
                iconColor: AppColors.violet700,
                label: 'POINTAGE ENTRÉE',
                time: pointage.checkIn!,
                location: 'Vérifié par Token/NFC',
                verified: true,
              ),
            if (pointage.checkIn != null && pointage.checkOut != null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 14),
                child: Divider(color: AppColors.slate200, thickness: 0.5),
              ),
            if (pointage.checkOut != null)
              _TimeEntry(
                icon: Icons.logout,
                iconBg: AppColors.rose500.withValues(alpha: 0.1),
                iconColor: AppColors.rose500,
                label: 'POINTAGE SORTIE',
                time: pointage.checkOut!,
                location: 'Vérifié par Token/NFC',
              ),
            if (pointage.checkIn == null && pointage.checkOut == null)
              const Center(
                child: Text('Aucune entrée', style: TextStyle(color: AppColors.slate500)),
              )
          ],
        ),
      ),
    );
  }
}

class _TimeEntry extends StatelessWidget {
  const _TimeEntry({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.label,
    required this.time,
    required this.location,
    this.verified = false,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String label;
  final String time;
  final String location;
  final bool verified;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(label, style: const TextStyle(fontSize: 10, letterSpacing: 1.0, color: AppColors.slate500, fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(time, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.primaryBlack)),
              const SizedBox(height: 4),
              Row(
                children: <Widget>[
                  const Icon(Icons.location_on, size: 13, color: AppColors.slate500),
                  const SizedBox(width: 3),
                  Expanded(
                    child: Text(
                      location,
                      style: const TextStyle(fontSize: 13, color: AppColors.slate500),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (verified)
          Container(
            margin: const EdgeInsets.only(top: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.emerald100,
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'VÉRIFIÉ',
              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: AppColors.emerald700, letterSpacing: 0.5),
            ),
          ),
      ],
    );
  }
}
