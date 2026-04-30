import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../providers/theme_provider.dart';
import 'login_screen.dart';
import '../theme/app_theme.dart';

class EmployeeProfileScreen extends ConsumerWidget {
  const EmployeeProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final isAdmin = user?.isAdmin ?? false;

    return ListView(
      padding: const EdgeInsets.only(top: 16, bottom: 90, left: 16, right: 16),
      children: <Widget>[
        const _ProfileHeaderCard(),
        if (!isAdmin) ...[
          const SizedBox(height: 18),
          const _MetricRow(),
        ],
        const SizedBox(height: 20),
        Text('INFORMATIONS PERSONNELLES', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.slate500, letterSpacing: 1.1)),
        SizedBox(height: 8),
        _InfoSection(),
        SizedBox(height: 18),
        Text('PARAMÈTRES DE L\'APPLICATION', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.slate500, letterSpacing: 1.1)),
        SizedBox(height: 8),
        _SettingsSection(),
        SizedBox(height: 16),
        _LogoutButton(),
        SizedBox(height: 14),
        Center(
          child: Text(
            'VERSION 4.12.0 (BUILD 2024.08)',
            style: TextStyle(fontSize: 10, color: AppColors.slate500, letterSpacing: 0.8, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}

class _ProfileHeaderCard extends ConsumerWidget {
  const _ProfileHeaderCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    if (user == null) return const SizedBox.shrink();

    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: const BorderSide(color: AppColors.slate200, width: 0.5),
      ),
      elevation: 0,
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 22),
        child: Column(
          children: <Widget>[
            Stack(
              alignment: Alignment.bottomRight,
              children: <Widget>[
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.violet700,
                    border: Border.all(color: AppColors.violet200, width: 4),
                  ),
                  child: Center(
                    child: Text(
                      user.initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                Container(
                  width: 28,
                  height: 28,
                  decoration: const BoxDecoration(color: AppColors.violet700, shape: BoxShape.circle),
                  child: const Icon(Icons.add, size: 17, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(user.fullName, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: AppColors.primaryBlack)),
            const SizedBox(height: 2),
            Text(user.poste, style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontWeight: FontWeight.w500)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: <Widget>[
                const _Badge(label: 'MEMBRE PRO', bg: AppColors.violet100, fg: AppColors.violet700),
                _Badge(label: 'MATRICULE ${user.matricule}', bg: AppColors.emerald100, fg: AppColors.emerald700),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.bg, required this.fg});
  final String label;
  final Color bg;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Text(label, style: TextStyle(fontSize: 9, color: fg, letterSpacing: 0.6, fontWeight: FontWeight.w800)),
      ),
    );
  }
}

class _MetricRow extends ConsumerWidget {
  const _MetricRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(monthStatsProvider);

    return Row(
      children: <Widget>[
        Expanded(child: _AttendanceCard(
          days: statsAsync.value?.joursTravailles ?? 0,
        )),
        const SizedBox(width: 12),
        Expanded(child: _EfficiencyCard(
          retards: statsAsync.value?.retards ?? 0,
          absences: statsAsync.value?.absencesInjustifiees ?? 0,
        )),
      ],
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  final int days;
  const _AttendanceCard({required this.days});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.violet700,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppColors.violet700.withValues(alpha: 0.2), blurRadius: 18, offset: const Offset(0, 8))],
      ),
      child: Stack(
        children: <Widget>[
          const Positioned(
            right: -6,
            bottom: -6,
            child: Icon(Icons.trending_up, size: 80, color: Colors.white24),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Text('Présence', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
              const Text('Ce mois-ci', style: TextStyle(color: Colors.white70, fontSize: 11)),
              const Spacer(),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  Text('$days', style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w800, height: 0.9)),
                  const SizedBox(width: 4),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 6),
                    child: Text(' jours', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EfficiencyCard extends StatelessWidget {
  final int retards;
  final int absences;
  const _EfficiencyCard({required this.retards, required this.absences});

  @override
  Widget build(BuildContext context) {
    int perf = 100 - (retards * 2) - (absences * 5);
    if (perf < 0) perf = 0;

    return Container(
      height: 160,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.violet50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.slate200, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const DecoratedBox(
            decoration: BoxDecoration(color: Color(0x1AF2A600), borderRadius: BorderRadius.all(Radius.circular(10))),
            child: Padding(
              padding: EdgeInsets.all(8),
              child: Icon(Icons.bar_chart, size: 20, color: Color(0xFFF2A600)),
            ),
          ),
          const SizedBox(height: 10),
          const Text('Performance', style: TextStyle(color: AppColors.primaryBlack, fontSize: 21, fontWeight: FontWeight.w700)),
          const Spacer(),
          ClipRRect(
            borderRadius: const BorderRadius.all(Radius.circular(999)),
            child: LinearProgressIndicator(
              value: perf / 100,
              minHeight: 8,
              backgroundColor: AppColors.slate200,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.violet700),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text('$perf%', style: const TextStyle(fontSize: 12, color: AppColors.violet700, fontWeight: FontWeight.w800)),
              if (perf == 100)
                const Text('Parfait', style: TextStyle(fontSize: 12, color: Color(0xFFF2A600), fontWeight: FontWeight.w800)),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoSection extends ConsumerWidget {
  const _InfoSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.slate200, width: 0.5),
      ),
      child: Column(
        children: <Widget>[
          _InfoRow(icon: Icons.email_outlined, label: 'Email', value: user?.email ?? 'Non défini'),
          const Divider(height: 1, color: AppColors.slate200),
          _InfoRow(icon: Icons.badge_outlined, label: 'Matricule', value: user?.matricule ?? 'Non défini'),
          const Divider(height: 1, color: AppColors.slate200),
          const _InfoRow(icon: Icons.location_on_outlined, label: 'Site Affectation', value: 'Bureau Principal'),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      leading: Icon(icon, color: AppColors.slate500),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primaryBlack)),
      subtitle: Text(value, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
      trailing: const Icon(Icons.chevron_right, color: AppColors.slate500),
    );
  }
}

class _SettingsSection extends ConsumerWidget {
  const _SettingsSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark;

    return Card(
      elevation: 0,
      color: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: Theme.of(context).dividerColor, width: 0.5),
      ),
      child: Column(
        children: <Widget>[
          const _SettingToggle(icon: Icons.notifications_outlined, label: 'Notifications Push', enabled: true),
          const Divider(height: 1),
          ListTile(
            leading: Icon(Icons.dark_mode_outlined, color: Theme.of(context).iconTheme.color),
            title: const Text('Mode Sombre', style: TextStyle(fontWeight: FontWeight.w700)),
            trailing: Switch(
              value: isDark,
              onChanged: (val) {
                ref.read(themeModeProvider.notifier).toggleTheme(val);
              },
              activeThumbColor: Colors.white,
              activeTrackColor: AppColors.violet700,
            ),
          ),
          const Divider(height: 1),
          const _SettingLanguage(),
        ],
      ),
    );
  }
}

class _SettingLanguage extends StatelessWidget {
  const _SettingLanguage();

  @override
  Widget build(BuildContext context) {
    return const ListTile(
      leading: Icon(Icons.language, color: AppColors.slate500),
      title: Text('Langue', style: TextStyle(fontWeight: FontWeight.w700)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text('FRANÇAIS', style: TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
          SizedBox(width: 4),
          Icon(Icons.chevron_right, color: AppColors.slate500),
        ],
      ),
    );
  }
}

class _SettingToggle extends StatelessWidget {
  const _SettingToggle({required this.icon, required this.label, required this.enabled});
  final IconData icon;
  final String label;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppColors.slate500),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      trailing: Switch(
        value: enabled,
        onChanged: (_) {},
        activeThumbColor: Colors.white,
        activeTrackColor: AppColors.violet700,
      ),
    );
  }
}

class _LogoutButton extends ConsumerWidget {
  const _LogoutButton();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FilledButton.icon(
      onPressed: () async {
        await ref.read(authProvider.notifier).logout();
        if (!context.mounted) return;
        Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      },
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.rose100,
        foregroundColor: AppColors.rose700,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
      icon: const Icon(Icons.logout, size: 20),
      label: const Text('Se déconnecter', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
    );
  }
}
