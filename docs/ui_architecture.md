# Architecture Réseau et Structure UI — DigitalAfrika Flutter

## 1. Navigation Shell (`BottomNavigationBar`)

L'application utilise une Coquille (`MainShell`) qui adapte la `BottomNavigationBar` et les vues selon le rôle de l'utilisateur connecté.

### 1.1 Rôle Employé
5 Onglets :
1. **🏠 Dashboard** (`EmployeeDashboard`) : Résumé de la semaine en cours, KPI de performances, liste des absences récentes limitées. Bouton pour pointer (simulation).
2. **🕒 Pointages** (`PointageHistoryScreen` - *À FAIRE*) : Historique complet avec sélecteur de mois, détail des retards/heures sup jour par jour.
3. **🏖️ Absences** (`AbsenceListScreen` - *À FAIRE*) : Liste complète des demandes avec statut (badge couleur), bouton flottant `+` pour nouvelle demande.
4. **🔔 Notifications** (`NotificationsScreen` - *À FAIRE*) : Liste des alertes et validations, avec pastille de non lu.
5. **👤 Profil** (`ProfileScreen` - *À FAIRE*) : Infos RH personnelles, contrat, et suivi disciplinaire (Sanctions associées) en lecture seule, bouton de déconnexion.

### 1.2 Rôle Admin
5 Onglets :
1. **📊 Dashboard** (`AdminDashboard`) : KPI globaux (taux d'absentéisme, nb employés présents/absents temps réel). Liste raccourcie des absences en attente.
2. **👥 Employés** (`EmployeeListScreen` - *À FAIRE*) : CRUD des employés, vue détaillée (profil, contrat, pointages, absences, sanctions), assignation des badges RFID.
3. **✅ Validation** (`ValidationScreen`) : Traitement des demandes d'absence "en attente" avec rejet(motif) ou approbation. Visualisation du justificatif si présent.
4. **⚠️ Alertes** (`AlertsScreen` - *À FAIRE*) : Traitement des sanctions disciplinaires générées (avertissements pour retards/absences injustifiées fixes). Entretien et ajout de commentaires.
5. **📥 Rapports** (`ReportsScreen` - *À FAIRE*) : Génération et téléchargements (Excel/PDF) des pointages, de la paie, ou des sanctions.

---

## 2. Design System (`AppTheme`, `AppColors`)

Le design se veut "Premium" et lisible (selon contraintes du cahier) :
* **Couleurs** : La palette `AppColors` utilise un blanc cassé pour le fond (`background`), une nuance `primaryBlack` (#1A1A1A) pour les éléments forts, et des couleurs de statut franches (Emerald pour `validé`, Amber pour `attente`, Rose pour `rejet`).
* **Micro-interactions** : Tous les éléments tapables (cartes, boutons) doivent avoir un feedback visuel léger. Le scan de badge (simulation) aura une animation Lottie.
* **Typographie** : Polices Google (ex: Inter / Roboto) avec des graisses variables (`w800` pour les titres, `w500` pour le corps) pour hiérarchiser l'information métrique (les heures, les retards).

---

## 3. Modèles de Données et État (Riverpod)

L'architecture locale suit le principe de flux unidirectionnel depuis l'`api_client.dart` :
* `StateNotifierProvider` pour l'Authentification (`AuthNotifier`).
* `FutureProvider` pour tous les appels REST de l'API (ex: `myAbsencesProvider`, `allEmployeesProvider`).
* **Cache et Rafraîchissement** : L'utilisation de Riverpod permet de mettre en cache les requêtes (ex: liste des types d'absences) et d'utiliser `.invalidate(...)` lors d'une action réussie (ex: après ajout d'une absence, invalider `myAbsencesProvider`).

---

## 4. Composants Partagés Actuels (`lib/widgets/`)

* `StatCard` : Carte métrique stylisée avec icône + label + valeur, idéale pour les dashboards.
* `AbsenceTile` : Élément de liste générique affichant une demande d'absence, son badge coloré (dynamique selon `status`), avec fonction `showEmployee` pour afficher l'auteur (côté Admin).
* *Nouveaux composants à créer* : `EmployeeTile` (liste employés), `PointageTile` (historique), `EmptyStateView` (quand une liste est vide).
