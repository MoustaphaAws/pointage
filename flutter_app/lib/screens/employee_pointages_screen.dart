import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Mes Pointages',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: AppColors.slate900,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Container(
            alignment: Alignment.centerLeft,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SingleChildScrollView(
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
                                color: _selectedFilter == f ? AppColors.primaryBlack : AppColors.slate100,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: _selectedFilter == f ? AppColors.primaryBlack : AppColors.slate200,
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
          ),
        ),
      ),
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

          if (filtered.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.slate100,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(Icons.access_time_rounded, size: 32, color: AppColors.slate400),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Aucun pointage',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate900),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Vous n\'avez pas encore pointé sur cette période.',
                    style: TextStyle(fontSize: 13, color: AppColors.slate400),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            color: AppColors.violet600,
            onRefresh: () async => ref.invalidate(pointageHistoryProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: filtered.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final pointage = filtered[index];
                return _PointageTile(pointage: pointage);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
        error: (_, __) => const Center(child: Text('Erreur de chargement des pointages')),
      ),
    );
  }
}

class _PointageTile extends StatelessWidget {
  final Pointage pointage;
  const _PointageTile({required this.pointage});

  @override
  Widget build(BuildContext context) {
    final statusConfig = _statusConfig(pointage.status);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(
            color: AppColors.slate200.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header Date + Statut
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: statusConfig.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(statusConfig.icon, color: statusConfig.color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pointage.date,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.slate900,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      statusConfig.label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: statusConfig.color,
                      ),
                    ),
                  ],
                ),
              ),
              if (pointage.isLate)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.amber100,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '+${pointage.delayMinutes} min',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: AppColors.amber700,
                    ),
                  ),
                ),
            ],
          ),
          
          if (pointage.status == 'present' || pointage.status == 'retard') ...[
            const SizedBox(height: 16),
            const Divider(color: AppColors.slate100, height: 1),
            const SizedBox(height: 12),
            // Heures Check-In et Check-Out
            Row(
              children: [
                Expanded(
                  child: _TimeBlock(
                    direction: 'in',
                    time: pointage.checkIn,
                    color: AppColors.emerald500,
                  ),
                ),
                Container(width: 1, height: 30, color: AppColors.slate200),
                Expanded(
                  child: _TimeBlock(
                    direction: 'out',
                    time: pointage.checkOut,
                    color: AppColors.rose500,
                  ),
                ),
              ],
            ),
          ]
        ],
      ),
    );
  }

  _StatusConfig _statusConfig(String status) {
    switch (status) {
      case 'present':
        return _StatusConfig('Présent', AppColors.emerald500, Icons.check_circle_rounded);
      case 'retard':
        return _StatusConfig('En retard', AppColors.amber500, Icons.warning_rounded);
      case 'absent':
        return _StatusConfig('Absent', AppColors.rose500, Icons.cancel_rounded);
      case 'jour_ferie':
        return _StatusConfig('Jour férié', AppColors.sky600, Icons.celebration_rounded);
      case 'weekend':
        return _StatusConfig('Weekend', AppColors.slate400, Icons.weekend_rounded);
      default:
        return _StatusConfig('Non pointé', AppColors.slate400, Icons.remove_circle_outline_rounded);
    }
  }
}

class _TimeBlock extends StatelessWidget {
  final String direction;
  final String? time;
  final Color color;

  const _TimeBlock({required this.direction, required this.time, required this.color});

  @override
  Widget build(BuildContext context) {
    final bool isIn = direction == 'in';
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(isIn ? Icons.login_rounded : Icons.logout_rounded, size: 16, color: color),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isIn ? 'ARRIVÉE' : 'DÉPART',
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.slate400),
            ),
            Text(
              time ?? '--:--',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.slate900),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  final IconData icon;
  _StatusConfig(this.label, this.color, this.icon);
}
