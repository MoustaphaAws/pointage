import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'dart:io';
import '../providers/auth_provider.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';

class QrDisplayScreen extends ConsumerStatefulWidget {
  const QrDisplayScreen({super.key});

  @override
  ConsumerState<QrDisplayScreen> createState() => _QrDisplayScreenState();
}

class _QrDisplayScreenState extends ConsumerState<QrDisplayScreen>
    with SingleTickerProviderStateMixin {
  QrPointage? _qrData;
  bool _isLoading = true;
  bool _isRegenerating = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  final GlobalKey _qrKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _loadQr();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadQr() async {
    final api = ref.read(apiClientProvider);
    if (api == null) return;
    try {
      final response = await api.getDailyQr();
      setState(() {
        _qrData = QrPointage.fromJson(response.data);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _regenerateQr() async {
    setState(() => _isRegenerating = true);
    final api = ref.read(apiClientProvider);
    if (api == null) return;
    try {
      final response = await api.regenerateDailyQr();
      setState(() {
        _qrData = QrPointage.fromJson(response.data);
        _isRegenerating = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('QR Code régénéré !',
                style: TextStyle(fontWeight: FontWeight.w700)),
            backgroundColor: AppColors.emerald500,
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } catch (e) {
      setState(() => _isRegenerating = false);
    }
  }

  Future<Uint8List> _captureQrImage() async {
    final boundary =
        _qrKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) throw Exception('Cannot capture QR');
    final image = await boundary.toImage(pixelRatio: 3.0);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }

  Future<void> _shareQr() async {
    try {
      final imageBytes = await _captureQrImage();
      final tempDir = await getTemporaryDirectory();
      final file =
          File('${tempDir.path}/qr_pointage_${_qrData!.date}.png');
      await file.writeAsBytes(imageBytes);

      await Share.shareXFiles(
        [XFile(file.path)],
        text: 'QR Code de pointage OnTime du ${_qrData!.date}. Scannez ce code depuis l\'application pour pointer votre arrivée/départ.',
        subject: 'QR Pointage - ${_qrData!.date}',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur de partage: $e'),
            backgroundColor: AppColors.rose500,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _printQr() async {
    if (_qrData == null) return;
    try {
      final imageBytes = await _captureQrImage();

      final doc = pw.Document();
      final image = pw.MemoryImage(imageBytes);

      doc.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (pw.Context context) {
            return pw.Center(
              child: pw.Column(
                mainAxisAlignment: pw.MainAxisAlignment.center,
                children: [
                  pw.Text(
                    'ONTIME',
                    style: pw.TextStyle(
                      fontSize: 28,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 8),
                  pw.Text(
                    'QR Code de Pointage',
                    style: const pw.TextStyle(fontSize: 18),
                  ),
                  pw.SizedBox(height: 30),
                  pw.Image(image, width: 280, height: 280),
                  pw.SizedBox(height: 30),
                  pw.Text(
                    'Date : ${_qrData!.date}',
                    style: pw.TextStyle(
                      fontSize: 16,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 8),
                  pw.Text(
                    'Scannez ce code depuis l\'application mobile',
                    style: const pw.TextStyle(fontSize: 12),
                  ),
                  pw.Text(
                    'pour enregistrer votre pointage.',
                    style: const pw.TextStyle(fontSize: 12),
                  ),
                  pw.SizedBox(height: 20),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(),
                      borderRadius: pw.BorderRadius.circular(8),
                    ),
                    child: pw.Text(
                      'Valide uniquement le ${_qrData!.date}',
                      style: pw.TextStyle(
                        fontSize: 11,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      );

      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => doc.save(),
        name: 'QR_Pointage_${_qrData!.date}',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur d\'impression: $e'),
            backgroundColor: AppColors.rose500,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.violet700,
      appBar: AppBar(
        backgroundColor: AppColors.violet700,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'QR POINTAGE',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 2,
            color: Colors.white,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: _isRegenerating ? null : _regenerateQr,
            icon: _isRegenerating
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.violet400,
                    ),
                  )
                : const Icon(Icons.refresh_rounded),
            tooltip: 'Régénérer le QR',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.violet500))
          : _qrData == null
              ? const Center(
                  child: Text('Erreur de génération',
                      style: TextStyle(color: Colors.white)))
              : SingleChildScrollView(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 16),
                      child: Column(
                        children: [
                          // Date badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.violet600.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(30),
                              border: Border.all(
                                color:
                                    AppColors.violet500.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.calendar_today_rounded,
                                    size: 16, color: AppColors.violet400),
                                const SizedBox(width: 8),
                                Text(
                                  _qrData!.date,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.violet400,
                                    letterSpacing: 1,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 32),

                          // QR Code with pulse animation
                          ScaleTransition(
                            scale: _pulseAnimation,
                            child: RepaintBoundary(
                              key: _qrKey,
                              child: Container(
                                padding: const EdgeInsets.all(28),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.violet600
                                          .withValues(alpha: 0.3),
                                      blurRadius: 40,
                                      spreadRadius: 5,
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    QrImageView(
                                      data: _qrData!.qrPayload,
                                      version: QrVersions.auto,
                                      size: 240,
                                      eyeStyle: const QrEyeStyle(
                                        eyeShape: QrEyeShape.square,
                                        color: AppColors.violet700,
                                      ),
                                      dataModuleStyle:
                                          const QrDataModuleStyle(
                                        dataModuleShape:
                                            QrDataModuleShape.square,
                                        color: AppColors.violet700,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      'ONTIME',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 3,
                                        color: AppColors.slate900,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Pointage du ${_qrData!.date}',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.slate400,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 32),

                          // Instructions
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.06),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color:
                                    AppColors.violet500.withValues(alpha: 0.15),
                              ),
                            ),
                            child: const Column(
                              children: [
                                Icon(Icons.info_outline_rounded,
                                    color: AppColors.violet400, size: 24),
                                SizedBox(height: 8),
                                Text(
                                  'Affichez ce QR Code sur un écran visible par les collaborateurs.\nChaque employé scanne avec son téléphone pour pointer.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.slate400,
                                    height: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 28),

                          // Action Buttons
                          Row(
                            children: [
                              // Share button
                              Expanded(
                                child: _buildActionBtn(
                                  icon: Icons.share_rounded,
                                  label: 'PARTAGER',
                                  color: AppColors.violet600,
                                  onTap: _shareQr,
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Print button
                              Expanded(
                                child: _buildActionBtn(
                                  icon: Icons.print_rounded,
                                  label: 'IMPRIMER',
                                  color: AppColors.emerald500,
                                  onTap: _printQr,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),
                ),
    );
  }

  Widget _buildActionBtn({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.3),
              blurRadius: 15,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(width: 10),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
