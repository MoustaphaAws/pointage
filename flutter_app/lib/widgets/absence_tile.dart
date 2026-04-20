import 'package:flutter/material.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class AbsenceTile extends StatelessWidget {
  final Absence absence;
  final bool showEmployee;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  const AbsenceTile({
    super.key,
    required this.absence,
    this.showEmployee = false,
    this.onApprove,
    this.onReject,
  });

  Color _statusColor() {
    switch (absence.status) {
      case 'validé':
        return AppColors.emerald500;
      case 'rejeté':
        return AppColors.rose500;
      default:
        return AppColors.amber500;
    }
  }

  Color _statusBg() {
    switch (absence.status) {
      case 'validé':
        return AppColors.emerald100;
      case 'rejeté':
        return AppColors.rose100;
      default:
        return AppColors.amber100;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (showEmployee && absence.userName != null) ...[
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.slate100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    absence.userName!
                        .split(' ')
                        .map((n) => n.isNotEmpty ? n[0] : '')
                        .join(),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.slate500,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        absence.userName!,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: AppColors.slate900,
                        ),
                      ),
                      Text(
                        absence.type,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.slate400,
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                Expanded(
                  child: Text(
                    absence.type,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: AppColors.slate900,
                    ),
                  ),
                ),
              ],
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusBg(),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  absence.status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                    color: _statusColor(),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Du ${absence.startDate} au ${absence.endDate}',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.slate500,
            ),
          ),
          if (onApprove != null || onReject != null) ...[
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (onReject != null)
                  TextButton(
                    onPressed: onReject,
                    style: TextButton.styleFrom(
                      backgroundColor: AppColors.slate100,
                      foregroundColor: AppColors.slate700,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      textStyle: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                      ),
                    ),
                    child: const Text('REJETER'),
                  ),
                const SizedBox(width: 8),
                if (onApprove != null)
                  TextButton(
                    onPressed: onApprove,
                    style: TextButton.styleFrom(
                      backgroundColor: AppColors.emerald500,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      textStyle: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                      ),
                    ),
                    child: const Text('VALIDER'),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
