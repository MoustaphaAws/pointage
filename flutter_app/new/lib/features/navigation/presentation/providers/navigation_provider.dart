import 'package:flutter_riverpod/flutter_riverpod.dart';

enum AppTab { home, history, absences, alerts, profile }

final selectedTabProvider = StateProvider<AppTab>((Ref ref) => AppTab.home);
