import 'package:flutter/material.dart';
import '../data/mock_data.dart';
import '../models/absence_request.dart';

class AbsencesScreen extends StatelessWidget {
  const AbsencesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(top: 16, bottom: 90),
      children: <Widget>[
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 2),
          child: Text('OVERVIEW', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF737685), letterSpacing: 1.2)),
        ),
        const SizedBox(height: 4),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 2),
          child: Text('Time Off', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
        ),
        const SizedBox(height: 20),
        const SizedBox(
          height: 140,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Expanded(flex: 2, child: _BigCounterCard()),
              SizedBox(width: 12),
              Expanded(child: _SmallCounterCard()),
            ],
          ),
        ),
        const SizedBox(height: 20),
        const SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: <Widget>[
              _FilterChip(label: 'All Requests', isActive: true),
              _FilterChip(label: 'Approved'),
              _FilterChip(label: 'Upcoming'),
            ],
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
                child: Text('Recent Requests', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF191B23))),
              ),
            ),
            SizedBox(width: 8),
            Text('VIEW ALL', style: TextStyle(color: Color(0xFF003D9B), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
          ],
        ),
        const SizedBox(height: 10),
        ...mockAbsences.map((AbsenceRequest req) => _AbsenceTile(request: req)),
        const SizedBox(height: 6),
        const _PolicyCard(),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, this.isActive = false});
  final String label;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF003D9B) : Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: isActive ? Colors.transparent : const Color(0x4DC3C6D6)),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: isActive ? Colors.white : const Color(0xFF737685),
          fontWeight: FontWeight.w800,
          fontSize: 11,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _BigCounterCard extends StatelessWidget {
  const _BigCounterCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF003D9B),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x33003D9B),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('TOTAL REMAINING', style: TextStyle(color: Color(0xB3FFFFFF), fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.0)),
          Spacer(),
          Text('18.5', style: TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w800, height: 0.95)),
          SizedBox(height: 6),
          Text('Days available for 2024', style: TextStyle(color: Color(0xCCFFFFFF), fontSize: 12)),
        ],
      ),
    );
  }
}

class _SmallCounterCard extends StatelessWidget {
  const _SmallCounterCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x4DC3C6D6)),
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Icon(Icons.calendar_month, size: 24, color: Color(0xFF0052CC)),
          SizedBox(height: 12),
          Text('4', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
          Text('PENDING', style: TextStyle(fontSize: 10, color: Color(0xFF737685), letterSpacing: 1.0, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _AbsenceTile extends StatelessWidget {
  const _AbsenceTile({required this.request});
  final AbsenceRequest request;

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg, IconData icon) = switch (request.status) {
      'approved' => (const Color(0xFFDCFCE7), const Color(0xFF15803D), Icons.check_circle),
      'rejected' => (const Color(0xFFFFDAD6), const Color(0xFFBA1A1A), Icons.cancel),
      _ => (const Color(0xFFFFF3D1), const Color(0xFFB7791F), Icons.hourglass_top),
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: Color(0x4DC3C6D6)),
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
                  Text(request.type, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF191B23), fontSize: 16)),
                  const SizedBox(height: 3),
                  Text('${request.dates} (${request.duration})', style: const TextStyle(fontSize: 12, color: Color(0xFF737685))),
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
                request.status.toUpperCase(),
                style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: fg, letterSpacing: 0.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PolicyCard extends StatelessWidget {
  const _PolicyCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[Color(0xFFEFF6FF), Color(0xFFECEBFF)],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDBEAFE)),
      ),
      child: const Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text('Policy Update', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF003D9B))),
                SizedBox(height: 4),
                Text(
                  'Unused leave balance can now be rolled over up to 5 days into 2025.',
                  style: TextStyle(color: Color(0xFF434654), height: 1.35),
                ),
              ],
            ),
          ),
          SizedBox(width: 8),
          Icon(Icons.add_circle_outline, size: 34, color: Color(0x33003D9B)),
        ],
      ),
    );
  }
}
