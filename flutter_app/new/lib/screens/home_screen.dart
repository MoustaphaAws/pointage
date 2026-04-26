import 'package:flutter/material.dart';
import '../data/mock_data.dart';
import '../models/shift.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(top: 16, bottom: 90),
      children: <Widget>[
        const _HelloCard(),
        const SizedBox(height: 14),
        const _ClockInCard(),
        const SizedBox(height: 14),
        const Row(
          children: <Widget>[
            Expanded(child: _StatCard(title: 'Hours Today', value: '0h 00m', icon: Icons.access_time)),
            SizedBox(width: 10),
            Expanded(
              child: _StatCard(
                title: 'Est. Earnings',
                value: '\$0.00',
                subtitle: 'Base rate: \$24.50/hr',
                icon: Icons.bar_chart,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        const _NextShiftCard(),
        const SizedBox(height: 14),
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            Text('Recent Activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            Icon(Icons.tune, size: 16, color: Color(0xFF737685)),
          ],
        ),
        const SizedBox(height: 8),
        ...mockShifts.take(2).map((Shift shift) => _ActivityTile(shift: shift)),
      ],
    );
  }
}

class _HelloCard extends StatelessWidget {
  const _HelloCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x4DC3C6D6)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text('Hello, David', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
                ),
                SizedBox(height: 4),
                Text('Wednesday, Oct 24', style: TextStyle(color: Color(0xFF737685))),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFFDAD6),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              children: <Widget>[
                Icon(Icons.circle, size: 7, color: Color(0xFFBA1A1A)),
                SizedBox(width: 8),
                Text('Not Clocked In', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFFBA1A1A))),
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
                color: const Color(0x1A003D9B),
                borderRadius: BorderRadius.circular(40),
              ),
              child: const Icon(Icons.qr_code_2, size: 40, color: Color(0xFF003D9B)),
            ),
            const SizedBox(height: 20),
            const Text(
              'Ready to start?',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF191B23)),
            ),
            const SizedBox(height: 10),
            const Text(
              'Scan the QR code or use NFC at your\\nwork station to clock in.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF737685), height: 1.5),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {},
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF003D9B),
                  padding: const EdgeInsets.symmetric(vertical: 18),
                ),
                icon: const Icon(Icons.smartphone, size: 20),
                label: const Text('Scan to Clock In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
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
                Icon(icon, size: 16, color: const Color(0xFF737685)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF737685),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
            if (subtitle != null) ...<Widget>[
              const SizedBox(height: 4),
              Text(subtitle!, style: const TextStyle(fontSize: 11, color: Color(0xFF737685))),
            ],
          ],
        ),
      ),
    );
  }
}

class _NextShiftCard extends StatelessWidget {
  const _NextShiftCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFFF3F3FD),
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: <Widget>[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: <Widget>[
                Text('Next Shift', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                Text('View All', style: TextStyle(fontSize: 12, color: Color(0xFF003D9B), fontWeight: FontWeight.w700)),
              ],
            ),
            SizedBox(height: 12),
            Row(
              children: <Widget>[
                _DateTile(),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Main Warehouse - Floor A',
                        style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF191B23), fontSize: 16),
                      ),
                      SizedBox(height: 4),
                      Text('08:00 AM - 04:30 PM', style: TextStyle(color: Color(0xFF737685))),
                      SizedBox(height: 6),
                      Row(
                        children: <Widget>[
                          Icon(Icons.location_on, size: 14, color: Color(0xFF003D9B)),
                          SizedBox(width: 4),
                          Text(
                            'Building 4, Sector G',
                            style: TextStyle(fontSize: 11, color: Color(0xFF003D9B), fontWeight: FontWeight.w600),
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

class _DateTile extends StatelessWidget {
  const _DateTile();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text('OCT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF737685))),
          Text('25', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
        ],
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.shift});

  final Shift shift;

  @override
  Widget build(BuildContext context) {
    final bool isClockOut = shift.type == 'clock-out';
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: isClockOut ? const Color(0x1A0052CC) : const Color(0x14003D9B),
          child: Icon(isClockOut ? Icons.logout : Icons.login, color: const Color(0xFF003D9B)),
        ),
        title: Text(shift.type.replaceAll('-', ' '), style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('${shift.date}, ${shift.time}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: <Widget>[
            Text(shift.duration ?? '---', style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(shift.status ?? shift.location, style: const TextStyle(fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
