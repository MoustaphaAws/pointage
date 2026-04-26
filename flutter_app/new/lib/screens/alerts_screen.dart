import 'package:flutter/material.dart';
import '../data/mock_data.dart';
import '../models/alert_item.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(top: 16, bottom: 90),
      children: <Widget>[
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            Expanded(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text('Alerts', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
              ),
            ),
            SizedBox(width: 12),
            Text('MARK ALL AS READ', style: TextStyle(color: Color(0xFF003D9B), fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
          ],
        ),
        const SizedBox(height: 12),
        ...mockAlerts.map((AlertItem alert) => _AlertTile(alert: alert)),
      ],
    );
  }
}

class _AlertTile extends StatelessWidget {
  const _AlertTile({required this.alert});
  final AlertItem alert;

  @override
  Widget build(BuildContext context) {
    final (IconData icon, Color iconBg, Color iconFg) = switch (alert.type) {
      'warning' => (Icons.notifications_active, const Color(0x4DFFDAD6), const Color(0xFFBA1A1A)),
      'success' => (Icons.check_circle, const Color(0x330052CC), const Color(0xFF003D9B)),
      _ => (Icons.info_outline, const Color(0x1A0052CC), const Color(0xFF003D9B)),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: alert.isRead ? const Color(0xFFF3F3FD) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: alert.isRead ? const Color(0x4DC3C6D6) : const Color(0xFFBBD1FF)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          if (!alert.isRead)
            Container(
              width: 4,
              height: alert.image == null ? 170 : 250,
              color: alert.type == 'warning' ? const Color(0xFFBA1A1A) : const Color(0xFF003D9B),
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
                                alert.title,
                                style: const TextStyle(fontSize: 20, height: 1.05, color: Color(0xFF191B23), fontWeight: FontWeight.w800),
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (alert.action != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFDAD6),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  alert.action!.toUpperCase(),
                                  style: const TextStyle(fontSize: 8, color: Color(0xFFBA1A1A), fontWeight: FontWeight.w800),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(alert.description, style: const TextStyle(fontSize: 13, color: Color(0xFF737685), height: 1.35)),
                        if (alert.image != null) ...<Widget>[
                          const SizedBox(height: 10),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: SizedBox(
                              height: 140,
                              width: double.infinity,
                              child: Stack(
                                fit: StackFit.expand,
                                children: <Widget>[
                                  Image.network(
                                    alert.image!,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) => Container(
                                      color: const Color(0xFFC3C6D6),
                                      child: const Icon(Icons.broken_image, color: Colors.white, size: 40),
                                    ),
                                  ),
                                  Center(
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.94),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: const Text(
                                        'VIEW AGENDA',
                                        style: TextStyle(fontSize: 10, color: Color(0xFF003D9B), fontWeight: FontWeight.w800, letterSpacing: 0.8),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 8),
                        Text(alert.time.toUpperCase(), style: const TextStyle(fontSize: 10, color: Color(0xFF737685), fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
