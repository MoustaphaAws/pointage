import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../providers/auth_provider.dart';
import '../providers/data_providers.dart';
import '../theme/app_theme.dart';
import 'package:dio/dio.dart';

class QrScannerScreen extends ConsumerStatefulWidget {
  const QrScannerScreen({super.key});

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen>
    with SingleTickerProviderStateMixin {
  MobileScannerController? _scannerController;
  bool _hasScanned = false;
  bool _isValidating = false;
  String? _resultMessage;
  bool _isSuccess = false;
  late AnimationController _animController;
  late Animation<double> _scanLineAnimation;

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
    );
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _scanLineAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    _animController.dispose();
    super.dispose();
  }

  void _onBarcodeDetected(BarcodeCapture capture) {
    if (_hasScanned || _isValidating) return;

    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    setState(() {
      _hasScanned = true;
      _isValidating = true;
    });

    _validateQr(barcode.rawValue!);
  }

  Future<void> _validateQr(String qrData) async {
    final api = ref.read(apiClientProvider);
    if (api == null) return;

    try {
      final response = await api.validateQrPointage(qrData);
      final data = response.data;

      if (response.statusCode == 200) {
        setState(() {
          _isSuccess = true;
          _resultMessage =
              '${data['message']}\n${data['type'] == 'arrivee' ? '🌅 Arrivée' : '🌇 Départ'} à ${data['heure']}';
          _isValidating = false;
        });

        // Rafraîchir le pointage du jour
        ref.invalidate(todayPointageProvider);
        ref.invalidate(monthStatsProvider);

        // Fermer automatiquement après 2.5s
        await Future.delayed(const Duration(milliseconds: 2500));
        if (mounted) Navigator.pop(context, true);
      }
    } on Exception catch (e) {
      String errorMessage = 'Erreur de connexion';
      if (e is DioException && e.response?.data != null) {
        errorMessage = e.response!.data['message'] ?? 'QR Code invalide';
      }

      setState(() {
        _isSuccess = false;
        _resultMessage = errorMessage;
        _isValidating = false;
      });
      // Permettre de re-scanner après 2s
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) {
        setState(() {
          _hasScanned = false;
          _resultMessage = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider);
    final canPoint = currentUser?.role != 'admin' ? true : (currentUser?.adminPermissions.canPoint ?? true);
    if (!canPoint) {
      return Scaffold(
        appBar: AppBar(title: const Text('Scanner QR')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Le super admin a desactive le pointage pour ce compte admin.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera view
          if (!_isSuccess)
            MobileScanner(
              controller: _scannerController!,
              onDetect: _onBarcodeDetected,
            ),

          // Success / Error overlay
          if (_resultMessage != null)
            Container(
              color: _isSuccess
                  ? AppColors.emerald500.withValues(alpha: 0.9)
                  : AppColors.rose500.withValues(alpha: 0.9),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _isSuccess
                          ? Icons.check_circle_rounded
                          : Icons.error_rounded,
                      size: 80,
                      color: Colors.white,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      _resultMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        height: 1.4,
                      ),
                    ),
                    if (_isSuccess) ...[
                      const SizedBox(height: 16),
                      const Text(
                        'Fermeture automatique...',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white70,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),

          // Scan overlay (when scanning)
          if (_resultMessage == null) ...[
            // Dark overlay with hole
            _buildScanOverlay(),

            // Scan line animation
            AnimatedBuilder(
              animation: _scanLineAnimation,
              builder: (context, child) {
                final screenWidth = MediaQuery.of(context).size.width;
                final scanSize = screenWidth * 0.7;
                final top = (MediaQuery.of(context).size.height - scanSize) /
                        2 +
                    _scanLineAnimation.value * scanSize;
                return Positioned(
                  left: (screenWidth - scanSize) / 2,
                  top: top,
                  child: Container(
                    width: scanSize,
                    height: 2,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.violet600.withValues(alpha: 0),
                          AppColors.violet500,
                          AppColors.violet600.withValues(alpha: 0),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],

          // Top bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Close button
                  _buildCircleBtn(
                    icon: Icons.close_rounded,
                    onTap: () => Navigator.pop(context),
                  ),
                  // Title
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'SCANNER QR',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 2,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  // Flash toggle
                  _buildCircleBtn(
                    icon: Icons.flash_on_rounded,
                    onTap: () {
                      try {
                        _scannerController?.toggleTorch();
                      } catch (_) {
                        // Controller might not be ready
                      }
                    },
                  ),
                ],
              ),
            ),
          ),

          // Bottom instruction
          if (_resultMessage == null)
            Positioned(
              bottom: 60,
              left: 40,
              right: 40,
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: AppColors.violet500.withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    if (_isValidating) ...[
                      const CircularProgressIndicator(
                        color: AppColors.violet400,
                        strokeWidth: 3,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Validation en cours...',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ] else ...[
                      const Icon(Icons.qr_code_scanner_rounded,
                          color: AppColors.violet400, size: 28),
                      const SizedBox(height: 8),
                      const Text(
                        'Placez le QR Code dans le cadre',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Approchez votre téléphone du QR affiché à l\'entrée',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.white60,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildScanOverlay() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final scanSize = constraints.maxWidth * 0.7;
        final left = (constraints.maxWidth - scanSize) / 2;
        final top = (constraints.maxHeight - scanSize) / 2;

        return Stack(
          children: [
            // Dark overlay
            ColorFiltered(
              colorFilter: ColorFilter.mode(
                Colors.black.withValues(alpha: 0.6),
                BlendMode.srcOut,
              ),
              child: Stack(
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      color: Colors.black,
                      backgroundBlendMode: BlendMode.dstOut,
                    ),
                  ),
                  Positioned(
                    left: left,
                    top: top,
                    child: Container(
                      width: scanSize,
                      height: scanSize,
                      decoration: BoxDecoration(
                        color: Colors.red, // Any color, it's filtered out
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Corner decorations
            ..._buildCorners(left, top, scanSize),
          ],
        );
      },
    );
  }

  List<Widget> _buildCorners(double left, double top, double size) {
    const cornerLen = 30.0;
    const cornerWidth = 3.0;
    const color = AppColors.violet500;

    return [
      // Top-left
      Positioned(
        left: left - cornerWidth,
        top: top - cornerWidth,
        child: SizedBox(
          width: cornerLen,
          height: cornerLen,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: color, width: cornerWidth),
                left: BorderSide(color: color, width: cornerWidth),
              ),
              borderRadius:
                  const BorderRadius.only(topLeft: Radius.circular(12)),
            ),
          ),
        ),
      ),
      // Top-right
      Positioned(
        right: left - cornerWidth,
        top: top - cornerWidth,
        child: SizedBox(
          width: cornerLen,
          height: cornerLen,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(
                top: BorderSide(color: color, width: cornerWidth),
                right: BorderSide(color: color, width: cornerWidth),
              ),
              borderRadius:
                  const BorderRadius.only(topRight: Radius.circular(12)),
            ),
          ),
        ),
      ),
      // Bottom-left
      Positioned(
        left: left - cornerWidth,
        bottom: MediaQuery.of(context).size.height - top - size - cornerWidth,
        child: SizedBox(
          width: cornerLen,
          height: cornerLen,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: color, width: cornerWidth),
                left: BorderSide(color: color, width: cornerWidth),
              ),
              borderRadius:
                  const BorderRadius.only(bottomLeft: Radius.circular(12)),
            ),
          ),
        ),
      ),
      // Bottom-right
      Positioned(
        right: left - cornerWidth,
        bottom: MediaQuery.of(context).size.height - top - size - cornerWidth,
        child: SizedBox(
          width: cornerLen,
          height: cornerLen,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: color, width: cornerWidth),
                right: BorderSide(color: color, width: cornerWidth),
              ),
              borderRadius:
                  const BorderRadius.only(bottomRight: Radius.circular(12)),
            ),
          ),
        ),
      ),
    ];
  }

  Widget _buildCircleBtn(
      {required IconData icon, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.5),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white24),
        ),
        child: Icon(icon, color: Colors.white, size: 22),
      ),
    );
  }
}
