class AlertItem {
  const AlertItem({
    required this.id,
    required this.title,
    required this.description,
    required this.time,
    required this.type,
    required this.isRead,
    this.action,
    this.image,
  });

  final String id;
  final String title;
  final String description;
  final String time;
  final String type;
  final bool isRead;
  final String? action;
  final String? image;
}
