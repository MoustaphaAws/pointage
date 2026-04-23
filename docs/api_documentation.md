# DIGITALAFRIKA — API REST Documentation

> **Base URL** : `http://localhost:3000/api` | **Auth** : JWT Bearer | **Format** : JSON

---

## 1. Auth

| Méthode | Route | Body | Réponse | Accès |
|---|---|---|---|---|
| POST | `/auth/login` | `{email, password}` | `{token, user}` | Public |
| POST | `/auth/logout` | — | `{message}` | 🔒 Tous |
| POST | `/auth/forgot-password` | `{email}` | `{message}` | Public |
| POST | `/auth/reset-password` | `{token, newPassword}` | `{message}` | Public |
| PUT | `/auth/change-password` | `{oldPassword, newPassword}` | `{message}` | 🔒 Tous |

### Login Response
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "uuid", "matricule": "DA-0001",
    "firstName": "Jean", "lastName": "Diallo",
    "email": "admin@digitalafrika.com",
    "phone": "+221771234567", "photoUrl": null,
    "role": "admin",
    "serviceId": "uuid", "serviceName": "Ressources Humaines",
    "poste": "Responsable RH", "typeContrat": "CDI",
    "heureDebut": "08:00", "heureFin": "17:00",
    "dateEmbauche": "2024-01-15", "dateFinContrat": null,
    "actif": true, "firstLogin": false
  }
}
```

## 2. Profil

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/profile/me` | Mon profil complet | 🔒 Tous |
| PUT | `/profile/me` | Modifier (phone, address) | 🔒 Tous |
| POST | `/profile/me/photo` | Upload photo (multipart) | 🔒 Tous |

## 3. Pointages

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/pointages/today` | Mon pointage du jour | 🔒 Employé |
| GET | `/pointages/history?start=&end=` | Mon historique | 🔒 Employé |
| GET | `/pointages/all?service=&start=&end=` | Pointages du service | 🔒 Admin |
| GET | `/pointages/live` | Présences temps réel | 🔒 Admin |
| GET | `/pointages/employee/:id?start=&end=` | Pointages d'un employé | 🔒 Admin |

### Pointage Object
```json
{
  "id": "uuid", "date": "2026-04-20",
  "checkIn": "08:45", "checkOut": "17:30",
  "status": "retard", "delayMinutes": 45,
  "heuresSupMinutes": 30, "dureeTravailMinutes": 525
}
```

## 4. Absences

| Méthode | Route | Description | Accès |
|---|---|---|---|
| POST | `/absences` | Déclarer absence | 🔒 Employé |
| GET | `/absences/me?status=` | Mes absences | 🔒 Employé |
| PUT | `/absences/:id/cancel` | Annuler (si en_attente) | 🔒 Employé |
| GET | `/absences/all?service=&status=` | Absences du service | 🔒 Admin |
| PUT | `/absences/:id/approve` | Approuver | 🔒 Admin |
| PUT | `/absences/:id/reject` | Rejeter `{motifRejet}` | 🔒 Admin |
| GET | `/absences/employee/:id` | Absences d'un employé | 🔒 Admin |

### Absence Object
```json
{
  "id": "uuid", "employeeId": "uuid", "employeeName": "Aminata Sow",
  "typeAbsenceId": "uuid", "typeAbsenceLabel": "Congé payé",
  "dateDebut": "2026-05-01", "dateFin": "2026-05-05",
  "demiJournee": false, "periodeDemiJournee": null,
  "motif": "Vacances", "statut": "en_attente",
  "motifRejet": null, "justificatifUrl": null,
  "createdAt": "2026-04-20T10:30:00Z"
}
```

### Statuts : `en_attente` → `approuvee` | `rejetee` | `annulee`

## 5. Justificatifs

| Méthode | Route | Description | Accès |
|---|---|---|---|
| POST | `/justificatifs/upload/:absenceId` | Upload fichier (multipart) | 🔒 Employé/Admin |
| GET | `/justificatifs/:id` | Télécharger fichier | 🔒 Admin |
| PUT | `/justificatifs/:id/validate` | Valider | 🔒 Admin |
| PUT | `/justificatifs/:id/reject` | Rejeter `{motifRejet}` | 🔒 Admin |

## 6. Employés

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/employees?service=&status=&search=&contrat=` | Liste filtrée | 🔒 Admin |
| GET | `/employees/:id` | Profil complet | 🔒 Admin |
| POST | `/employees` | Créer employé | 🔒 Admin |
| PUT | `/employees/:id` | Modifier employé | 🔒 Admin |
| PUT | `/employees/:id/deactivate` | Désactiver | 🔒 Admin |
| PUT | `/employees/:id/activate` | Réactiver | 🔒 Admin |

### Create Employee Request
```json
{
  "firstName": "Nouveau", "lastName": "Employé",
  "email": "nouveau@digitalafrika.com", "phone": "+221770000000",
  "serviceId": "uuid", "poste": "Développeur",
  "typeContrat": "CDI", "dateEmbauche": "2026-04-20",
  "heureDebut": "08:00", "heureFin": "17:00",
  "uidBadge": "NEWBADGE1"
}
```

## 7. Badges

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/badges?status=` | Liste badges | 🔒 Admin |
| PUT | `/employees/:id/badge` | Assigner `{uidBadge}` | 🔒 Admin |
| PUT | `/badges/:uid/deactivate` | Désactiver badge | 🔒 Admin |

## 8. Services

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/services` | Liste des services | 🔒 Tous |

```json
[{ "id": "uuid", "nom": "Technique", "nombreEmployes": 3, "actif": true }]
```

## 9. Jours fériés

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/jours-feries` | Liste | 🔒 Tous |
| POST | `/jours-feries` | Créer `{date, libelle, recurrent}` | 🔒 Admin |
| PUT | `/jours-feries/:id` | Modifier | 🔒 Admin |
| DELETE | `/jours-feries/:id` | Supprimer | 🔒 Admin |

## 10. Notifications

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/notifications?read=false` | Mes notifications | 🔒 Tous |
| PUT | `/notifications/:id/read` | Marquer lue | 🔒 Tous |
| PUT | `/notifications/read-all` | Tout marquer lu | 🔒 Tous |

```json
{ "id": "uuid", "type": "retard", "titre": "Retard détecté", "message": "Retard de 45 min", "lue": false, "createdAt": "2026-04-20T09:00:00Z" }
```

Types: `retard`, `absence_validee`, `absence_rejetee`, `absence_annulee`, `sanction`, `rappel`, `system`, `bienvenue`

## 11. Sanctions

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/sanctions/me` | Mes sanctions | 🔒 Employé |
| GET | `/sanctions/all?service=` | Sanctions du service | 🔒 Admin |
| GET | `/sanctions/employee/:id` | Sanctions d'un employé | 🔒 Admin |
| PUT | `/sanctions/:id/traiter` | Marquer traitée `{commentaire}` | 🔒 Admin |

```json
{ "id": "uuid", "employeeId": "uuid", "employeeName": "Aminata Sow", "typeSanction": "avertissement", "motif": "5 retards en avril", "nbRetards": 5, "nbAbsencesInjust": 0, "statut": "alerte", "moisReference": "2026-04-01", "createdAt": "2026-04-18T08:00:00Z" }
```

## 12. Exports

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/exports/pointages?month=2026-04&format=excel` | Export pointages | 🔒 Admin |
| GET | `/exports/absences?month=2026-04&format=pdf` | Export absences | 🔒 Admin |
| GET | `/exports/paie?month=2026-04` | Export paie (Excel) | 🔒 Admin |
| GET | `/exports/disciplinaire?employeeId=uuid` | Export disciplinaire (PDF) | 🔒 Admin |

## 13. Statistiques

| Méthode | Route | Description | Accès |
|---|---|---|---|
| GET | `/stats/month` | Mes stats mensuelles | 🔒 Employé |
| GET | `/stats/global?service=uuid` | Stats globales du service | 🔒 Admin |

### MonthStats
```json
{ "joursTravailles": 14, "heuresTotales": 112, "retards": 4, "soldeConges": 25, "heuresSupTotales": 180, "absencesJustifiees": 1, "absencesInjustifiees": 0 }
```

### GlobalStats
```json
{ "tauxAbsenteisme": 5.2, "retardsAujourdhui": 4, "presenceTempsReel": 85, "notificationsPending": 3, "totalEmployes": 10, "employesActifs": 9 }
```

## Codes d'erreur

| Code | Signification |
|---|---|
| 200 | Succès |
| 201 | Créé |
| 400 | Données invalides |
| 401 | Non authentifié |
| 403 | Accès interdit |
| 404 | Non trouvé |
| 409 | Conflit (doublon) |
| 413 | Fichier trop gros |
| 500 | Erreur serveur |
