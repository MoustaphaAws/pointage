class Employee {
  final String id;
  final String name;
  final String email;
  final String role;
  final String service;

  Employee({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.service,
  });

  factory Employee.fromJson(Map<String, dynamic> json) => Employee(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        email: json['email'] ?? '',
        role: json['role'] ?? 'employee',
        service: json['service'] ?? '',
      );

  bool get isAdmin => role == 'admin';
}

class Pointage {
  final String? id;
  final String? date;
  final String? checkIn;
  final String? checkOut;
  final String status;
  final int delayMinutes;

  Pointage({
    this.id,
    this.date,
    this.checkIn,
    this.checkOut,
    this.status = 'non-pointé',
    this.delayMinutes = 0,
  });

  factory Pointage.fromJson(Map<String, dynamic> json) => Pointage(
        id: json['id'],
        date: json['date'],
        checkIn: json['checkIn'],
        checkOut: json['checkOut'],
        status: json['status'] ?? 'non-pointé',
        delayMinutes: json['delayMinutes'] ?? 0,
      );

  bool get isCheckedIn => checkIn != null;
}

class Absence {
  final String id;
  final String? userId;
  final String? userName;
  final String? userEmail;
  final String type;
  final String startDate;
  final String endDate;
  final String status;
  final String reason;
  final String? motive;

  Absence({
    required this.id,
    this.userId,
    this.userName,
    this.userEmail,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.status,
    required this.reason,
    this.motive,
  });

  factory Absence.fromJson(Map<String, dynamic> json) => Absence(
        id: json['id'] ?? '',
        userId: json['userId'],
        userName: json['userName'],
        userEmail: json['userEmail'],
        type: json['type'] ?? '',
        startDate: json['startDate'] ?? '',
        endDate: json['endDate'] ?? '',
        status: json['status'] ?? 'en attente',
        reason: json['reason'] ?? '',
        motive: json['motive'],
      );

  bool get isPending => status == 'en attente';
  bool get isApproved => status == 'validé';
  bool get isRejected => status == 'rejeté';
}

class MonthStats {
  final int joursTravailles;
  final int heuresTotales;
  final int retards;
  final int soldeConges;

  MonthStats({
    required this.joursTravailles,
    required this.heuresTotales,
    required this.retards,
    required this.soldeConges,
  });

  factory MonthStats.fromJson(Map<String, dynamic> json) => MonthStats(
        joursTravailles: json['joursTravailles'] ?? 0,
        heuresTotales: json['heuresTotales'] ?? 0,
        retards: json['retards'] ?? 0,
        soldeConges: json['soldeConges'] ?? 0,
      );
}

class GlobalStats {
  final double tauxAbsenteisme;
  final int retardsAujourdhui;
  final int presenceTempsReel;
  final int notificationsPending;

  GlobalStats({
    required this.tauxAbsenteisme,
    required this.retardsAujourdhui,
    required this.presenceTempsReel,
    required this.notificationsPending,
  });

  factory GlobalStats.fromJson(Map<String, dynamic> json) => GlobalStats(
        tauxAbsenteisme: (json['tauxAbsenteisme'] ?? 0).toDouble(),
        retardsAujourdhui: json['retardsAujourdhui'] ?? 0,
        presenceTempsReel: json['presenceTempsReel'] ?? 0,
        notificationsPending: json['notificationsPending'] ?? 0,
      );
}
