import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/models.dart';
import '../providers/data_providers.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'absence_form_screen.dart';

class EmployeeAbsencesScreen extends ConsumerStatefulWidget {
  const EmployeeAbsencesScreen({super.key});

  @override
  ConsumerState<EmployeeAbsencesScreen> createState() => _EmployeeAbsencesScreenState();
}

class _EmployeeAbsencesScreenState extends ConsumerState<EmployeeAbsencesScreen> {
  String _selectedFilter = 'Toutes les demandes'; // 'Toutes les demandes', 'Approuvées', 'En attente'

  @override
  Widget build(BuildContext context) {
    final myAbsencesAsync = ref.watch(myAbsencesProvider);
    final statsAsync = ref.watch(monthStatsProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      body: myAbsencesAsync.when(
        data: (absences) {
          final pendingCount = absences.where((a) => a.isPending).length;

          final filteredAbsences = absences.where((a) {
            if (_selectedFilter == 'Approuvées') return a.status == 'approuvee';
            if (_selectedFilter == 'En attente') return a.isPending;
            return true;
          }).toList();

          return RefreshIndicator(
            color: AppColors.violet600,
            onRefresh: () async {
              ref.invalidate(myAbsencesProvider);
              ref.invalidate(monthStatsProvider);
            },
            child: ListView(
              padding: const EdgeInsets.only(top: 16, bottom: 90, left: 16, right: 16),
              children: <Widget>[
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 2),
                  child: Text('APERÇU', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.slate500, letterSpacing: 1.2)),
                ),
                const SizedBox(height: 4),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 2),
                  child: Text('Absences', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.primaryBlack)),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 140,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      Expanded(
                        flex: 2,
                        child: _BigCounterCard(
                          solde: statsAsync.value?.soldeConges ?? 0,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _SmallCounterCard(count: pendingCount),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['Toutes les demandes', 'Approuvées', 'En attente'].map((f) {
                      return _FilterChip(
                        label: f,
                        isActive: _selectedFilter == f,
                        onTap: () => setState(() => _selectedFilter = f),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    Expanded(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text('Demandes Récentes', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primaryBlack)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                
                if (filteredAbsences.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(40),
                    alignment: Alignment.center,
                    child: const Text(
                      'Aucune demande trouvée.',
                      style: TextStyle(color: AppColors.slate500, fontStyle: FontStyle.italic),
                    ),
                  )
                else
                  ...filteredAbsences.map((req) => _AbsenceTile(request: req)),
                  
                const SizedBox(height: 6),
                const _PolicyCard(),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet500)),
        error: (_, __) => const Center(child: Text('Erreur lors du chargement des absences')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const AbsenceFormScreen(),
            ),
          );
        },
        backgroundColor: AppColors.violet700,
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, this.isActive = false, required this.onTap});
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? AppColors.violet700 : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: isActive ? Colors.transparent : AppColors.slate200),
        ),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            color: isActive ? Colors.white : AppColors.slate500,
            fontWeight: FontWeight.w800,
            fontSize: 11,
            letterSpacing: 0.8,
          ),
        ),
      ),
    );
  }
}

class _BigCounterCard extends StatelessWidget {
  final int solde;
  const _BigCounterCard({required this.solde});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.violet700,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.violet700.withValues(alpha: 0.2),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text('SOLDE RESTANT', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
          const Spacer(),
          Text('$solde', style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w800, height: 0.95)),
          const SizedBox(height: 6),
          Text('Jours disponibles en ${DateTime.now().year}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
        ],
      ),
    );
  }
}

class _SmallCounterCard extends StatelessWidget {
  final int count;
  const _SmallCounterCard({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          const Icon(Icons.calendar_month, size: 24, color: AppColors.violet600),
          const SizedBox(height: 12),
          Text('$count', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.primaryBlack)),
          const Text('EN ATTENTE', style: TextStyle(fontSize: 10, color: AppColors.slate500, letterSpacing: 1.0, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _AbsenceTile extends StatelessWidget {
  const _AbsenceTile({required this.request});
  final Absence request;

  @override
  Widget build(BuildContext context) {
    final statusData = _getStatusData(request.status);
    final bg = statusData.bg;
    final fg = statusData.fg;
    final icon = statusData.icon;
    final statusText = statusData.label;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.slate200, width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: <Widget>[
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: fg, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(request.typeAbsenceLabel, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primaryBlack, fontSize: 16)),
                  const SizedBox(height: 3),
                  Text('${request.dateDebut} → ${request.dateFin}${request.demiJournee ? ' (Demi-journée)' : ''}', style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: fg.withValues(alpha: 0.25)),
              ),
              child: Text(
                statusText,
                style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: fg, letterSpacing: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }

  _StatusData _getStatusData(String status) {
    switch (status) {
      case 'approuvee':
        return _StatusData(const Color(0xFFDCFCE7), const Color(0xFF15803D), Icons.check_circle, 'APPROUVÉE');
      case 'rejetee':
        return _StatusData(const Color(0xFFFFDAD6), const Color(0xFFBA1A1A), Icons.cancel, 'REJETÉE');
      case 'annulee':
        return _StatusData(AppColors.slate200, AppColors.slate600, Icons.do_not_disturb_alt, 'ANNULÉE');
      default:
        return _StatusData(const Color(0xFFFFF3D1), const Color(0xFFB7791F), Icons.hourglass_top, 'EN ATTENTE');
    }
  }
}

class _StatusData {
  final Color bg;
  final Color fg;
  final IconData icon;
  final String label;
  _StatusData(this.bg, this.fg, this.icon, this.label);
}

class _PolicyCard extends StatelessWidget {
  const _PolicyCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[AppColors.violet700.withValues(alpha: 0.1), AppColors.violet500.withValues(alpha: 0.05)],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.violet700.withValues(alpha: 0.15)),
      ),
      child: const Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text('Mise à jour RH', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.violet700)),
                SizedBox(height: 4),
                Text(
                  'Le solde de congés non utilisés peut être reporté jusqu\'à 5 jours sur l\'année prochaine.',
                  style: TextStyle(color: AppColors.primaryBlack, height: 1.35),
                ),
              ],
            ),
          ),
          SizedBox(width: 8),
          Icon(Icons.add_circle_outline, size: 34, color: AppColors.slate300),
        ],
      ),
    );
  }
}
