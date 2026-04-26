class Shift {
  const Shift({
    required this.id,
    required this.type,
    required this.time,
    required this.date,
    required this.location,
    this.duration,
    this.status,
    this.image,
  });

  final String id;
  final String type;
  final String time;
  final String date;
  final String location;
  final String? duration;
  final String? status;
  final String? image;
}
