import 'package:flutter/material.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(top: 16, bottom: 90),
      children: const <Widget>[
        _ProfileHeaderCard(),
        SizedBox(height: 18),
        _MetricRow(),
        SizedBox(height: 20),
        Text('PERSONAL INFO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF737685), letterSpacing: 1.1)),
        SizedBox(height: 8),
        _InfoSection(),
        SizedBox(height: 18),
        Text('APP SETTINGS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF737685), letterSpacing: 1.1)),
        SizedBox(height: 8),
        _SettingsSection(),
        SizedBox(height: 16),
        _LogoutButton(),
        SizedBox(height: 14),
        Center(
          child: Text(
            'VERSION 4.12.0 (BUILD 2024.08)',
            style: TextStyle(fontSize: 10, color: Color(0xFF737685), letterSpacing: 0.8, fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
  }
}

class _ProfileHeaderCard extends StatelessWidget {
  const _ProfileHeaderCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: const BorderSide(color: Color(0x4DC3C6D6)),
      ),
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
                    color: const Color(0xFF003D9B),
                    border: Border.all(color: const Color(0x4D003D9B), width: 4),
                    image: const DecorationImage(
                      image: NetworkImage('https://i.pravatar.cc/150?u=david'),
                      fit: BoxFit.cover,
                    ),
                  ),
                  child: const Center(
                    child: Text(
                      'MC',
                      style: TextStyle(
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
                  decoration: const BoxDecoration(color: Color(0xFF003D9B), shape: BoxShape.circle),
                  child: const Icon(Icons.add, size: 17, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Text('Marcus Chen', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Color(0xFF191B23))),
            const SizedBox(height: 2),
            const Text('Senior Field Supervisor - Logistics Operations', style: TextStyle(fontSize: 12, color: Color(0xFF737685), fontWeight: FontWeight.w500)),
            const SizedBox(height: 12),
            const Wrap(
              spacing: 8,
              children: <Widget>[
                _Badge(label: 'PRO MEMBER', bg: Color(0x14003D9B), fg: Color(0xFF003D9B)),
                _Badge(label: '98% COMPLIANCE', bg: Color(0x4DE8F5E9), fg: Color(0xFF2E7D32)),
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

class _MetricRow extends StatelessWidget {
  const _MetricRow();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: <Widget>[
        Expanded(child: _AttendanceCard()),
        SizedBox(width: 12),
        Expanded(child: _EfficiencyCard()),
      ],
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  const _AttendanceCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF003D9B),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const <BoxShadow>[BoxShadow(color: Color(0x33003D9B), blurRadius: 18, offset: Offset(0, 8))],
      ),
      child: const Stack(
        children: <Widget>[
          Positioned(
            right: -6,
            bottom: -6,
            child: Icon(Icons.trending_up, size: 80, color: Color(0x26FFFFFF)),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Attendance', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
              Text('This Month', style: TextStyle(color: Color(0xB3FFFFFF), fontSize: 11)),
              Spacer(),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: <Widget>[
                  Text('22', style: TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w800, height: 0.9)),
                  SizedBox(width: 4),
                  Padding(
                    padding: EdgeInsets.only(bottom: 6),
                    child: Text('/ 24 days', style: TextStyle(color: Color(0xB3FFFFFF), fontSize: 13, fontWeight: FontWeight.w700)),
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
  const _EfficiencyCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F3FD),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x4DC3C6D6)),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          DecoratedBox(
            decoration: BoxDecoration(color: Color(0x1AF2A600), borderRadius: BorderRadius.all(Radius.circular(10))),
            child: Padding(
              padding: EdgeInsets.all(8),
              child: Icon(Icons.bar_chart, size: 20, color: Color(0xFFF2A600)),
            ),
          ),
          SizedBox(height: 10),
          Text('Efficiency', style: TextStyle(color: Color(0xFF191B23), fontSize: 24, fontWeight: FontWeight.w700)),
          Spacer(),
          ClipRRect(
            borderRadius: BorderRadius.all(Radius.circular(999)),
            child: LinearProgressIndicator(
              value: 0.85,
              minHeight: 8,
              backgroundColor: Color(0x80C3C6D6),
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF003D9B)),
            ),
          ),
          SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text('85%', style: TextStyle(fontSize: 12, color: Color(0xFF003D9B), fontWeight: FontWeight.w800)),
              Text('+12.5%', style: TextStyle(fontSize: 12, color: Color(0xFFF2A600), fontWeight: FontWeight.w800)),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection();

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: Color(0x4DC3C6D6)),
      ),
      child: const Column(
        children: <Widget>[
          _InfoRow(icon: Icons.email_outlined, label: 'Email Address', value: 'marcus.chen@workforce.corp'),
          Divider(height: 1, color: Color(0x33C3C6D6)),
          _InfoRow(icon: Icons.phone_outlined, label: 'Phone Number', value: '+1 (555) 012-3456'),
          Divider(height: 1, color: Color(0x33C3C6D6)),
          _InfoRow(icon: Icons.location_on_outlined, label: 'Work Location', value: 'Central Hub - Sector 7'),
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
      leading: Icon(icon, color: const Color(0xFF737685)),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF191B23))),
      subtitle: Text(value, style: const TextStyle(fontSize: 12, color: Color(0xFF737685))),
      trailing: const Icon(Icons.chevron_right, color: Color(0xFF737685)),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection();

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: Color(0x4DC3C6D6)),
      ),
      child: Column(
        children: const <Widget>[
          _SettingToggle(icon: Icons.notifications_outlined, label: 'Push Notifications', enabled: true),
          Divider(height: 1, color: Color(0x33C3C6D6)),
          _SettingToggle(icon: Icons.dark_mode_outlined, label: 'Dark Mode', enabled: false),
          Divider(height: 1, color: Color(0x33C3C6D6)),
          _SettingLanguage(),
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
      leading: Icon(icon, color: const Color(0xFF737685)),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF191B23))),
      trailing: Switch(
        value: enabled,
        onChanged: (_) {},
        activeThumbColor: Colors.white,
        activeTrackColor: const Color(0xFF003D9B),
      ),
    );
  }
}

class _SettingLanguage extends StatelessWidget {
  const _SettingLanguage();

  @override
  Widget build(BuildContext context) {
    return const ListTile(
      leading: Icon(Icons.language, color: Color(0xFF737685)),
      title: Text('Language', style: TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF191B23))),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text('ENGLISH', style: TextStyle(fontSize: 11, color: Color(0xFF737685), fontWeight: FontWeight.w700, letterSpacing: 0.8)),
          SizedBox(width: 4),
          Icon(Icons.chevron_right, color: Color(0xFF737685)),
        ],
      ),
    );
  }
}

class _LogoutButton extends StatelessWidget {
  const _LogoutButton();

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: () {},
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFFFFDAD6),
        foregroundColor: const Color(0xFFBA1A1A),
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 0,
      ),
      icon: const Icon(Icons.logout, size: 20),
      label: const Text('Logout from Device', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
    );
  }
}
