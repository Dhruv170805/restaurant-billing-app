import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

class MarketingGenerator {
  /// Captures a [GlobalKey] that must be attached to a [RepaintBoundary].
  /// Returns the captured image as [Uint8List].
  static Future<void> generateAndShare({
    required GlobalKey boundaryKey,
    required String fileName,
    String? text,
  }) async {
    try {
      final RenderRepaintBoundary? boundary =
          boundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      
      if (boundary == null) throw Exception("Could not find boundary");

      final ui.Image image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      
      if (byteData == null) throw Exception("Could not get byte data");
      
      final bytes = byteData.buffer.asUint8List();

      final tempDir = await getTemporaryDirectory();
      final file = await File('${tempDir.path}/$fileName.png').create();
      await file.writeAsBytes(bytes);

      await SharePlus.instance.share(
        files: [XFile(file.path)],
        text: text ?? "Check out our latest bestsellers!",
        subject: fileName,
      );
    } catch (e) {
      debugPrint('Error generating marketing poster: $e');
      rethrow;
    }
  }
}
