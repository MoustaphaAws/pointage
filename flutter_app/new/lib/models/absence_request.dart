class AbsenceRequest {
  const AbsenceRequest({
    required this.id,
    required this.type,
    required this.dates,
    required this.duration,
    required this.status,
  });

  final String id;
  final String type;
  final String dates;
  final String duration;
  final String status;
}
