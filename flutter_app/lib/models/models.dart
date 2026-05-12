// ============================================================
// DIGITALAFRIKA — Modèles Dart
// Alignés sur le schéma BDD PostgreSQL v2.1
// ============================================================

// ─── Employee ───
class AdminPermissions {
  final bool canPoint;
  final bool canApplySanctions;
  final bool canValidateAbsences;
  final bool canManageEmployees;

  const AdminPermissions({
    this.canPoint = true,
    this.canApplySanctions = true,
    this.canValidateAbsences = true,
    this.canManageEmployees = true,
  });

  factory AdminPermissions.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) return const AdminPermissions();
    return AdminPermissions(
      canPoint: json['canPoint'] ?? true,
      canApplySanctions: json['canApplySanctions'] ?? true,
      canValidateAbsences: json['canValidateAbsences'] ?? true,
      canManageEmployees: json['canManageEmployees'] ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'canPoint': canPoint,
        'canApplySanctions': canApplySanctions,
        'canValidateAbsences': canValidateAbsences,
        'canManageEmployees': canManageEmployees,
      };
}

class Employee {
  final String id;
  final String matricule;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String? address;
  final String? photoUrl;
  final String role; // 'employee', 'admin', 'superadmin'
  final String serviceId;
  final String? serviceName;
  final String poste;
  final String typeContrat; // 'CDI', 'CDD', 'Stage', 'Prestataire'
  final bool actif;
  final bool firstLogin;
  final String? uidBadge;
  final bool badgeActif;
  final String heureDebut;
  final String heureFin;
  final String dateEmbauche;
  final String? dateFinContrat;
  final String? createdAt;
  final AdminPermissions adminPermissions;

  Employee({
    required this.id,
    required this.matricule,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.phone,
    this.address,
    this.photoUrl,
    required this.role,
    required this.serviceId,
    this.serviceName,
    required this.poste,
    this.typeContrat = 'CDI',
    this.actif = true,
    this.firstLogin = false,
    this.uidBadge,
    this.badgeActif = true,
    this.heureDebut = '08:00',
    this.heureFin = '17:00',
    required this.dateEmbauche,
    this.dateFinContrat,
    this.createdAt,
    this.adminPermissions = const AdminPermissions(),
  });

  factory Employee.fromJson(Map<String, dynamic> json) => Employee(
        id: json['id'] ?? '',
        matricule: json['matricule'] ?? '',
        firstName: json['firstName'] ?? '',
        lastName: json['lastName'] ?? '',
        email: json['email'] ?? '',
        phone: json['phone'],
        address: json['address'],
        photoUrl: json['photoUrl'],
        role: json['role'] ?? 'employee',
        serviceId: json['serviceId'] ?? '',
        serviceName: json['serviceName'],
        poste: json['poste'] ?? '',
        typeContrat: json['typeContrat'] ?? 'CDI',
        actif: json['actif'] ?? true,
        firstLogin: json['firstLogin'] ?? false,
        uidBadge: json['uidBadge'],
        badgeActif: json['badgeActif'] ?? true,
        heureDebut: json['heureDebut'] ?? '08:00',
        heureFin: json['heureFin'] ?? '17:00',
        dateEmbauche: json['dateEmbauche'] ?? '',
        dateFinContrat: json['dateFinContrat'],
        createdAt: json['createdAt'],
        adminPermissions: AdminPermissions.fromJson(
          json['adminPermissions'] ?? json['permissions'] ?? json['adminRights'],
        ),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'matricule': matricule,
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'phone': phone,
        'address': address,
        'photoUrl': photoUrl,
        'role': role,
        'serviceId': serviceId,
        'serviceName': serviceName,
        'poste': poste,
        'typeContrat': typeContrat,
        'actif': actif,
        'firstLogin': firstLogin,
        'uidBadge': uidBadge,
        'badgeActif': badgeActif,
        'heureDebut': heureDebut,
        'heureFin': heureFin,
        'dateEmbauche': dateEmbauche,
        'dateFinContrat': dateFinContrat,
        'adminPermissions': adminPermissions.toJson(),
      };

  bool get isAdmin => role == 'admin' || role == 'superadmin';
  String get fullName => '$firstName $lastName';
  String get initials =>
      '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}'
          .toUpperCase();
}

// ─── Service ───
class Service {
  final String id;
  final String nom;
  final String? description;
  final int nombreEmployes;
  final bool actif;

  Service({
    required this.id,
    required this.nom,
    this.description,
    this.nombreEmployes = 0,
    this.actif = true,
  });

  factory Service.fromJson(Map<String, dynamic> json) => Service(
        id: json['id'] ?? '',
        nom: json['nom'] ?? '',
        description: json['description'],
        nombreEmployes: json['nombreEmployes'] ?? 0,
        actif: json['actif'] ?? true,
      );
}

// ─── Pointage ───
class Pointage {
  final String? id;
  final String date;
  final String? employeeId;
  final String? employeeName;
  final String? checkIn;
  final String? checkOut;
  final String status; // 'present', 'retard', 'absent', 'jour_ferie', 'weekend', 'non_pointe'
  final int delayMinutes;
  final int heuresSupMinutes;
  final int dureeTravailMinutes;

  Pointage({
    this.id,
    required this.date,
    this.employeeId,
    this.employeeName,
    this.checkIn,
    this.checkOut,
    this.status = 'non_pointe',
    this.delayMinutes = 0,
    this.heuresSupMinutes = 0,
    this.dureeTravailMinutes = 0,
  });

  factory Pointage.fromJson(Map<String, dynamic> json) => Pointage(
        id: json['id'],
        date: json['date'] ?? '',
        employeeId: json['employeeId'],
        employeeName: json['employeeName'],
        checkIn: json['checkIn'],
        checkOut: json['checkOut'],
        status: json['status'] ?? 'non_pointe',
        delayMinutes: json['delayMinutes'] ?? 0,
        heuresSupMinutes: json['heuresSupMinutes'] ?? 0,
        dureeTravailMinutes: json['dureeTravailMinutes'] ?? 0,
      );

  bool get isCheckedIn => checkIn != null;
  bool get isCheckedOut => checkOut != null;
  bool get hasOvertime => heuresSupMinutes > 0;
  bool get isLate => delayMinutes > 0;

  String get formattedDuration {
    final h = dureeTravailMinutes ~/ 60;
    final m = dureeTravailMinutes % 60;
    return '${h}h${m.toString().padLeft(2, '0')}';
  }
}

// ─── TypeAbsence ───
class TypeAbsence {
  final String id;
  final String code;
  final String libelle;
  final bool justificatifRequis;

  TypeAbsence({
    required this.id,
    required this.code,
    required this.libelle,
    this.justificatifRequis = false,
  });

  factory TypeAbsence.fromJson(Map<String, dynamic> json) => TypeAbsence(
        id: json['id'] ?? '',
        code: json['code'] ?? '',
        libelle: json['libelle'] ?? '',
        justificatifRequis: json['justificatifRequis'] ?? false,
      );
}

// ─── Absence ───
class Absence {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String? employeeEmail;
  final String typeAbsenceId;
  final String typeAbsenceLabel;
  final String dateDebut;
  final String dateFin;
  final bool demiJournee;
  final String? periodeDemiJournee; // 'matin', 'apres_midi'
  final String? motif;
  final String status; // 'en_attente', 'approuvee', 'rejetee', 'annulee'
  final String? motifRejet;
  final String? justificatifUrl;
  final String? justificatifStatus; // 'en_attente', 'valide', 'rejete'
  final String? validePar;
  final String? dateValidation;
  final String createdAt;

  Absence({
    required this.id,
    this.employeeId,
    this.employeeName,
    this.employeeEmail,
    required this.typeAbsenceId,
    required this.typeAbsenceLabel,
    required this.dateDebut,
    required this.dateFin,
    this.demiJournee = false,
    this.periodeDemiJournee,
    this.motif,
    required this.status,
    this.motifRejet,
    this.justificatifUrl,
    this.justificatifStatus,
    this.validePar,
    this.dateValidation,
    this.createdAt = '',
  });

  factory Absence.fromJson(Map<String, dynamic> json) => Absence(
        id: json['id'] ?? '',
        employeeId: json['employeeId'] ?? json['userId'],
        employeeName: json['employeeName'] ?? json['userName'],
        employeeEmail: json['employeeEmail'] ?? json['userEmail'],
        typeAbsenceId: json['typeAbsenceId'] ?? '',
        typeAbsenceLabel: json['typeAbsenceLabel'] ?? json['type'] ?? '',
        dateDebut: json['dateDebut'] ?? json['startDate'] ?? '',
        dateFin: json['dateFin'] ?? json['endDate'] ?? '',
        demiJournee: json['demiJournee'] ?? false,
        periodeDemiJournee: json['periodeDemiJournee'],
        motif: json['motif'] ?? json['reason'],
        status: json['statut'] ?? json['status'] ?? 'en_attente',
        motifRejet: json['motifRejet'] ?? json['motive'],
        justificatifUrl: json['justificatifUrl'],
        justificatifStatus: json['justificatifStatus'],
        validePar: json['validePar'],
        dateValidation: json['dateValidation'],
        createdAt: json['createdAt'] ?? '',
      );

  bool get isPending => status == 'en_attente';
  bool get isApproved => status == 'approuvee';
  bool get isRejected => status == 'rejetee';
  bool get isCancelled => status == 'annulee';
  bool get canCancel => isPending;
  bool get hasJustificatif => justificatifUrl != null;
}

// ─── JourFerie ───
class JourFerie {
  final String id;
  final String date;
  final String libelle;
  final bool recurrent;

  JourFerie({
    required this.id,
    required this.date,
    required this.libelle,
    this.recurrent = false,
  });

  factory JourFerie.fromJson(Map<String, dynamic> json) => JourFerie(
        id: json['id'] ?? '',
        date: json['date'] ?? '',
        libelle: json['libelle'] ?? '',
        recurrent: json['recurrent'] ?? false,
      );

  Map<String, dynamic> toJson() => {
        'date': date,
        'libelle': libelle,
        'recurrent': recurrent,
      };
}

// ─── AppNotification ───
class AppNotification {
  final String id;
  final String type; // 'retard', 'absence_validee', 'absence_rejetee', 'sanction', 'rappel', 'system', 'bienvenue'
  final String titre;
  final String message;
  final bool lue;
  final String createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.titre,
    required this.message,
    this.lue = false,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'] ?? '',
        type: json['type'] ?? 'system',
        titre: json['titre'] ?? '',
        message: json['message'] ?? '',
        lue: json['lue'] ?? false,
        createdAt: json['createdAt'] ?? '',
      );
}

// ─── Sanction ───
class Sanction {
  final String id;
  final String? employeeId;
  final String? employeeName;
  final String typeSanction; // 'rappel_verbal', 'avertissement', 'sanction_disciplinaire'
  final String motif;
  final int nbRetards;
  final int nbAbsencesInjust;
  final String statut; // 'alerte', 'traite'
  final String? traitePar;
  final String? dateTraitement;
  final String? commentaireAdmin;
  final String moisReference;
  final String createdAt;

  Sanction({
    required this.id,
    this.employeeId,
    this.employeeName,
    required this.typeSanction,
    required this.motif,
    this.nbRetards = 0,
    this.nbAbsencesInjust = 0,
    this.statut = 'alerte',
    this.traitePar,
    this.dateTraitement,
    this.commentaireAdmin,
    required this.moisReference,
    required this.createdAt,
  });

  factory Sanction.fromJson(Map<String, dynamic> json) => Sanction(
        id: json['id'] ?? '',
        employeeId: json['employeeId'],
        employeeName: json['employeeName'],
        typeSanction: json['typeSanction'] ?? 'rappel_verbal',
        motif: json['motif'] ?? '',
        nbRetards: json['nbRetards'] ?? 0,
        nbAbsencesInjust: json['nbAbsencesInjust'] ?? 0,
        statut: json['statut'] ?? 'alerte',
        traitePar: json['traitePar'],
        dateTraitement: json['dateTraitement'],
        commentaireAdmin: json['commentaireAdmin'],
        moisReference: json['moisReference'] ?? '',
        createdAt: json['createdAt'] ?? '',
      );

  bool get isAlerte => statut == 'alerte';
  bool get isTraite => statut == 'traite';
}

// ─── MonthStats ───
class MonthStats {
  final int joursTravailles;
  final int heuresTotales;
  final int retards;
  final int soldeConges;
  final int heuresSupTotales;
  final int absencesJustifiees;
  final int absencesInjustifiees;

  MonthStats({
    required this.joursTravailles,
    required this.heuresTotales,
    required this.retards,
    required this.soldeConges,
    this.heuresSupTotales = 0,
    this.absencesJustifiees = 0,
    this.absencesInjustifiees = 0,
  });

  factory MonthStats.fromJson(Map<String, dynamic> json) => MonthStats(
        joursTravailles: json['joursTravailles'] ?? 0,
        heuresTotales: json['heuresTotales'] ?? 0,
        retards: json['retards'] ?? 0,
        soldeConges: json['soldeConges'] ?? 0,
        heuresSupTotales: json['heuresSupTotales'] ?? 0,
        absencesJustifiees: json['absencesJustifiees'] ?? 0,
        absencesInjustifiees: json['absencesInjustifiees'] ?? 0,
      );
}

// ─── GlobalStats ───
class GlobalStats {
  final double tauxAbsenteisme;
  final int retardsAujourdhui;
  final int presenceTempsReel;
  final int notificationsPending;
  final int totalEmployes;
  final int employesActifs;

  GlobalStats({
    required this.tauxAbsenteisme,
    required this.retardsAujourdhui,
    required this.presenceTempsReel,
    required this.notificationsPending,
    this.totalEmployes = 0,
    this.employesActifs = 0,
  });

  factory GlobalStats.fromJson(Map<String, dynamic> json) => GlobalStats(
        tauxAbsenteisme: (json['tauxAbsenteisme'] ?? 0).toDouble(),
        retardsAujourdhui: json['retardsAujourdhui'] ?? 0,
        presenceTempsReel: json['presenceTempsReel'] ?? 0,
        notificationsPending: json['notificationsPending'] ?? 0,
        totalEmployes: json['totalEmployes'] ?? 0,
        employesActifs: json['employesActifs'] ?? 0,
      );
}

// ─── Badge ───
class Badge {
  final String uid;
  final String? employeeId;
  final String? employeeName;
  final bool actif;

  Badge({
    required this.uid,
    this.employeeId,
    this.employeeName,
    this.actif = true,
  });

  factory Badge.fromJson(Map<String, dynamic> json) => Badge(
        uid: json['uid'] ?? '',
        employeeId: json['employeeId'],
        employeeName: json['employeeName'],
        actif: json['actif'] ?? true,
      );

  bool get isAssigned => employeeId != null;
}

// ─── QrPointage (Token QR quotidien) ───
class QrPointage {
  final String id;
  final String date;
  final String token;
  final String expiresAt;
  final String? generePar;
  final String createdAt;

  QrPointage({
    required this.id,
    required this.date,
    required this.token,
    required this.expiresAt,
    this.generePar,
    required this.createdAt,
  });

  factory QrPointage.fromJson(Map<String, dynamic> json) => QrPointage(
        id: json['id'] ?? '',
        date: json['date'] ?? '',
        token: json['token'] ?? '',
        expiresAt: json['expiresAt'] ?? '',
        generePar: json['generePar'],
        createdAt: json['createdAt'] ?? '',
      );

  /// Le payload JSON encodé dans le QR code
  String get qrPayload =>
      '{"type":"pointage","date":"$date","token":"$token"}';

  bool get isExpired {
    try {
      final exp = DateTime.parse(expiresAt);
      return DateTime.now().isAfter(exp);
    } catch (_) {
      return false;
    }
  }
}
