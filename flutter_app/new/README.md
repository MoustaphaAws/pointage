# Workforce - Migration Flutter

Le projet principal est maintenant en Flutter (Dart) a la racine.

## Lancer l'application

Prerequis:
- Flutter SDK installe
- Emulateur Android/iOS ou appareil physique

Commandes:

```bash
flutter pub get
flutter run
```

## Structure actuelle

- `lib/main.dart` : application mobile Flutter (5 onglets: Home, History, Absences, Alerts, Profile)
- `lib/app.dart` : configuration app globale
- `lib/core/router/app_router.dart` : routing avec `go_router`
- `lib/core/theme/app_theme.dart` : theme centralise
- `lib/features/navigation/presentation/main_shell.dart` : shell de navigation
- `lib/features/navigation/presentation/providers/navigation_provider.dart` : etat navigation via Riverpod
- `lib/screens/` : ecrans UI
- `lib/models/` : modeles de donnees
- `lib/data/mock_data.dart` : source de mock data
- `pubspec.yaml` : configuration Flutter + dependances
- `analysis_options.yaml` : regles lint Dart/Flutter

## Notes

- La migration reproduit la navigation et les ecrans principaux de la version React.
- Les donnees sont mockees pour rester coherentes avec l'ancienne demo.
- L'app suit maintenant une base "pro" avec architecture `features`, `go_router` et `flutter_riverpod`.
