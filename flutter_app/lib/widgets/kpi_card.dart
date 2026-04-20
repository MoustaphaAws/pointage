import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String? subtitle;
  final Color? borderColor;
  final Color? valueColor;

  const KpiCard({
    super.key,
    required this.label,
    required this.value,
    this.subtitle,
    this.borderColor,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border(
          left: BorderSide(
            color: borderColor ?? AppColors.slate200,
            width: borderColor != null ? 4 : 1,
          ),
          top: BorderSide(color: AppColors.slate200),
          right: BorderSide(color: AppColors.slate200),
          bottom: BorderSide(color: AppColors.slate200),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.5,
              color: AppColors.slate500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              letterSpacing: -1.5,
              color: valueColor ?? AppColors.slate900,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle!.toUpperCase(),
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: AppColors.slate400,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
