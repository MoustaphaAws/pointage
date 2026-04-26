import 'package:flutter/material.dart';
import '../data/mock_data.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(top: 16, bottom: 90),
      children: const <Widget>[
        Text('History', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
        SizedBox(height: 4),
        Text('Review your recent activity and attendance.', style: TextStyle(color: Color(0xFF737685))),
        SizedBox(height: 24),
        _HistoryDayHeader(date: 'TODAY, OCT 24', total: '8h 15m Total'),
        SizedBox(height: 12),
        _TodayCard(),
        SizedBox(height: 24),
        _HistoryDayHeader(date: 'YESTERDAY, OCT 23', total: '7h 45m Total'),
        SizedBox(height: 12),
        _YesterdayCard(),
      ],
    );
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
            child: Text(date, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF737685), letterSpacing: 1.1)),
          ),
        ),
        const SizedBox(width: 12),
        Text(total.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF003D9B), letterSpacing: 1.1)),
      ],
    );
  }
}

class _TodayCard extends StatelessWidget {
  const _TodayCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0x80C3C6D6)),
      ),
      child: const Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: const <Widget>[
            _TimeEntry(
              icon: Icons.login,
              iconBg: Color(0x1A003D9B),
              iconColor: Color(0xFF003D9B),
              label: 'CLOCK IN',
              time: '08:30 AM',
              location: 'Main Office, HQ',
              verified: true,
            ),
            Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Divider(color: Color(0x4DC3C6D6), thickness: 1),
            ),
            _TimeEntry(
              icon: Icons.logout,
              iconBg: Color(0x4DFFDAD6),
              iconColor: Color(0xFFBA1A1A),
              label: 'CLOCK OUT',
              time: '05:45 PM',
              location: 'Main Office, HQ',
            ),
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
              Text(label, style: const TextStyle(fontSize: 10, letterSpacing: 1.0, color: Color(0xFF737685), fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(time, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
              const SizedBox(height: 4),
              Row(
                children: <Widget>[
                  const Icon(Icons.location_on, size: 13, color: Color(0xFF737685)),
                  const SizedBox(width: 3),
                  Expanded(
                    child: Text(
                      location,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF737685)),
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
              color: const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              'VERIFIED',
              style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF15803D), letterSpacing: 0.5),
            ),
          ),
      ],
    );
  }
}

class _YesterdayCard extends StatelessWidget {
  const _YesterdayCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0x4DC3C6D6)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: <Widget>[
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const <Widget>[
                  Row(
                    children: <Widget>[
                      Icon(Icons.access_time, size: 16, color: Color(0xFF003D9B)),
                      SizedBox(width: 6),
                      Text(
                        'REGULAR SHIFT',
                        style: TextStyle(fontSize: 10, letterSpacing: 1.0, color: Color(0xFF003D9B), fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                  SizedBox(height: 14),
                  Row(
                    children: <Widget>[
                      Expanded(child: _Meta(label: 'Started', value: '09:15 AM')),
                      Expanded(child: _Meta(label: 'Ended', value: '05:00 PM')),
                    ],
                  ),
                  SizedBox(height: 14),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: Color(0xFFF3F3FD),
                      borderRadius: BorderRadius.all(Radius.circular(10)),
                    ),
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      child: Row(
                        children: <Widget>[
                          Icon(Icons.location_on, size: 13, color: Color(0xFF737685)),
                          SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              'INNOVATION HUB, BLOCK C-4',
                              style: TextStyle(fontSize: 10, letterSpacing: 0.7, color: Color(0xFF737685), fontWeight: FontWeight.w700),
                              overflow: TextOverflow.ellipsis,
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
          SizedBox(
            width: 110,
            height: 165,
            child: Image.network(
              mockShifts[2].image ?? '',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Container(
                color: const Color(0xFFC3C6D6),
                child: const Icon(Icons.broken_image, color: Colors.white, size: 30),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(label.toUpperCase(), style: const TextStyle(fontSize: 10, color: Color(0xFF737685), letterSpacing: 0.6, fontWeight: FontWeight.w700)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 15, color: Color(0xFF191B23), fontWeight: FontWeight.w800)),
      ],
    );
  }
}
