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
      body: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Notifications',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: AppColors.slate900,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Consumer(builder: (context, ref, _) {
                      final count = ref.watch(unreadNotifCountProvider);
                      return Text(
                        count > 0 ? '$count non lue${count > 1 ? 's' : ''}' : 'Tout est lu',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: count > 0 ? AppColors.violet600 : AppColors.slate400,
                        ),
                      );
                    }),
                  ],
                ),
                // Bouton "Tout marquer lu"
                Consumer(builder: (context, ref, _) {
                  final count = ref.watch(unreadNotifCountProvider);
                  if (count == 0) return const SizedBox.shrink();
                  return TextButton.icon(
                    onPressed: () async {
                      final api = ref.read(apiClientProvider);
                      if (api == null) return;
                      try {
                        await api.markAllNotificationsRead();
                        ref.invalidate(myNotificationsProvider);
                      } catch (_) {}
                    },
                    icon: const Icon(Icons.done_all_rounded, size: 18),
                    label: const Text('Tout lire', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.violet600,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: BorderSide(color: AppColors.violet200),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),

          // Liste
          Expanded(
            child: notifs.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppColors.violet600)),
              error: (err, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.slate300),
                    const SizedBox(height: 12),
                    Text('Impossible de charger les notifications', style: TextStyle(color: AppColors.slate500, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => ref.invalidate(myNotificationsProvider),
                      child: const Text('Réessayer'),
                    ),
                  ],
                ),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: AppColors.slate100,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Icon(Icons.notifications_off_rounded, size: 36, color: AppColors.slate300),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Aucune notification',
                          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.slate700),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Vous recevrez ici les alertes de retard,\nvalidations d\'absence et sanctions.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 13, color: AppColors.slate400, height: 1.5),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  color: AppColors.violet600,
                  onRefresh: () async => ref.invalidate(myNotificationsProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final notif = list[index];
                      return _NotificationTile(
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
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback onTap;

  const _NotificationTile({required this.notification, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final iconData = _iconForType(notification.type);
    final iconColor = _colorForType(notification.type);
    final bgColor = _bgColorForType(notification.type);
    final timeAgo = _formatTimeAgo(notification.createdAt);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: notification.lue ? Colors.white : AppColors.violet50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: notification.lue ? AppColors.slate200 : AppColors.violet200,
            width: notification.lue ? 1 : 1.5,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icône
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(iconData, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            // Contenu
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.titre,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: notification.lue ? FontWeight.w600 : FontWeight.w800,
                            color: AppColors.slate900,
                          ),
                        ),
                      ),
                      if (!notification.lue)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: AppColors.violet600,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.slate500,
                      height: 1.4,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    timeAgo,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.slate400,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _iconForType(String type) {
    switch (type) {
      case 'retard': return Icons.schedule_rounded;
      case 'absence_validee': return Icons.check_circle_rounded;
      case 'absence_rejetee': return Icons.cancel_rounded;
      case 'absence_annulee': return Icons.undo_rounded;
      case 'sanction': return Icons.shield_rounded;
      case 'rappel': return Icons.warning_amber_rounded;
      case 'bienvenue': return Icons.celebration_rounded;
      default: return Icons.info_outline_rounded;
    }
  }

  Color _colorForType(String type) {
    switch (type) {
      case 'retard': return AppColors.amber700;
      case 'absence_validee': return AppColors.emerald700;
      case 'absence_rejetee': return AppColors.rose700;
      case 'absence_annulee': return AppColors.slate600;
      case 'sanction': return AppColors.rose700;
      case 'rappel': return AppColors.amber700;
      case 'bienvenue': return AppColors.violet700;
      default: return AppColors.sky600;
    }
  }

  Color _bgColorForType(String type) {
    switch (type) {
      case 'retard': return AppColors.amber100;
      case 'absence_validee': return AppColors.emerald100;
      case 'absence_rejetee': return AppColors.rose100;
      case 'absence_annulee': return AppColors.slate100;
      case 'sanction': return AppColors.rose100;
      case 'rappel': return AppColors.amber100;
      case 'bienvenue': return AppColors.violet100;
      default: return AppColors.slate100;
    }
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
