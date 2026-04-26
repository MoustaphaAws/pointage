import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class EmployeeNotificationsScreen extends ConsumerWidget {
  const EmployeeNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifs = ref.watch(myNotificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.slate50,
      body: notifs.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet700)),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.slate300),
              const SizedBox(height: 12),
              const Text('Impossible de charger les alertes', style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => ref.invalidate(myNotificationsProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (list) {
          final unreadCount = ref.watch(unreadNotifCountProvider);
          return RefreshIndicator(
            color: AppColors.violet700,
            onRefresh: () async => ref.invalidate(myNotificationsProvider),
            child: ListView(
              padding: const EdgeInsets.only(top: 16, bottom: 90, left: 16, right: 16),
              children: <Widget>[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    const Expanded(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Alertes',
                          style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.primaryBlack),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (unreadCount > 0)
                      InkWell(
                        onTap: () async {
                          final api = ref.read(apiClientProvider);
                          if (api == null) return;
                          try {
                            await api.markAllNotificationsRead();
                            ref.invalidate(myNotificationsProvider);
                          } catch (_) {}
                        },
                        child: const Text('TOUT LIRE', style: TextStyle(color: AppColors.violet700, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (list.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(40),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              color: AppColors.slate200.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Icon(Icons.notifications_off_rounded, size: 36, color: AppColors.slate400),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Aucune alerte',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.primaryBlack),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Vous recevrez ici les alertes de retard,\nvalidations d\'absence et sanctions.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: AppColors.slate500, height: 1.5),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ...list.map((notif) => _AlertTile(
                    notification: notif,
                    onTap: () async {
                      if (!notif.lue) {
                        final api = ref.read(apiClientProvider);
                        if (api != null) {
                          try {
                            await api.markNotificationRead(notif.id);
                            ref.invalidate(myNotificationsProvider);
                          } catch (_) {}
                        }
                      }
                    },
                  )),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;

  const _AlertTile({required this.notification, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isWarning = notification.type == 'retard' || notification.type == 'sanction' || notification.type == 'absence_rejetee';
    final (IconData icon, Color iconBg, Color iconFg) = switch (notification.type) {
      'retard' || 'sanction' || 'absence_rejetee' => (Icons.notifications_active, AppColors.rose500.withValues(alpha: 0.1), AppColors.rose500),
      'absence_validee' || 'bienvenue' => (Icons.check_circle, AppColors.violet700.withValues(alpha: 0.1), AppColors.violet700),
      _ => (Icons.info_outline, AppColors.violet700.withValues(alpha: 0.1), AppColors.violet700),
    };

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: notification.lue ? AppColors.slate50 : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: notification.lue ? AppColors.slate200.withValues(alpha: 0.5) : AppColors.violet200),
          boxShadow: notification.lue ? null : [
            BoxShadow(
              color: AppColors.slate200.withValues(alpha: 0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              if (!notification.lue)
                Container(
                  width: 4,
                  color: isWarning ? AppColors.rose500 : AppColors.violet700,
                ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
                        child: Icon(icon, color: iconFg, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Expanded(
                                  child: Text(
                                    notification.titre,
                                    style: const TextStyle(fontSize: 16, height: 1.05, color: AppColors.primaryBlack, fontWeight: FontWeight.w800),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                if (isWarning)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.rose500.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: const Text(
                                      'ATTENTION',
                                      style: TextStyle(fontSize: 8, color: AppColors.rose700, fontWeight: FontWeight.w800),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(notification.message, style: const TextStyle(fontSize: 13, color: AppColors.slate500, height: 1.35)),
                            const SizedBox(height: 8),
                            Text(_formatTimeAgo(notification.createdAt).toUpperCase(), style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTimeAgo(String isoDate) {
    if (isoDate.isEmpty) return '';
    try {
      final date = DateTime.parse(isoDate);
      final diff = DateTime.now().difference(date);
      if (diff.inMinutes < 1) return 'À l\'instant';
      if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
      if (diff.inHours < 24) return 'Il y a ${diff.inHours}h';
      if (diff.inDays < 7) return 'Il y a ${diff.inDays}j';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return '';
    }
  }
}
