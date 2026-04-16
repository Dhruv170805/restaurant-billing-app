import 'package:http/http.dart' as http;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:flutter/foundation.dart';
import '../models/order.dart';

/// Loads a Unicode-capable font (Roboto via google_fonts) for use in PDFs.
/// This ensures characters like ₹ (U+20B9) render correctly.
Future<pw.Font> _unicodeFont({bool bold = false}) async {
  return bold
      ? await PdfGoogleFonts.notoSansBold()
      : await PdfGoogleFonts.notoSansRegular();
}

Future<pw.Font> _unicodeFontItalic() async {
  return await PdfGoogleFonts.notoSansItalic();
}

class PdfGenerator {
  static Future<Uint8List?> _fetchLogoBytes(String? url) async {
    if (url == null || url.isEmpty) return null;
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        return response.bodyBytes;
      }
    } catch (e) {
      debugPrint('Error fetching logo for PDF: $e');
    }
    return null;
  }

  static String _formatTime(String isoString, Map<String, dynamic> settings) {
    try {
      final dt = DateTime.parse(isoString).toUtc();
      if (settings['timezone'] == 'Asia/Kolkata') {
        final kolkataTime = dt.add(const Duration(hours: 5, minutes: 30));
        return "${kolkataTime.year}-${kolkataTime.month.toString().padLeft(2, '0')}-${kolkataTime.day.toString().padLeft(2, '0')} ${kolkataTime.hour.toString().padLeft(2, '0')}:${kolkataTime.minute.toString().padLeft(2, '0')}";
      }
      return dt.toLocal().toString().substring(0, 16);
    } catch (e) {
      return isoString.length > 16 ? isoString.substring(0, 16) : isoString;
    }
  }

  static String _cleanText(String? text) {
    if (text == null) return '';
    return text.replaceAll(
      RegExp(
        r'[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]',
        unicode: true,
      ),
      '',
    );
  }

  static Future<pw.Document> generateKOT(
    Order order,
    Map<String, dynamic> settings, {
    List<OrderItem>? overrideItems,
  }) async {
    final pdf = pw.Document();
    final regular = await _unicodeFont();
    final bold = await _unicodeFont(bold: true);
    final logoBytes = await _fetchLogoBytes(settings['logoUrl']);

    final itemsToPrint =
        overrideItems ??
        order.items.where((i) => i.quantity > i.printedQuantity).toList();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              if (logoBytes != null)
                pw.Container(
                  height: 40,
                  margin: const pw.EdgeInsets.only(bottom: 5),
                  child: pw.Image(pw.MemoryImage(logoBytes)),
                ),
              pw.Text(
                _cleanText(settings['restaurantName'] ?? 'Restaurant'),
                style: pw.TextStyle(font: bold, fontSize: 20),
              ),
              pw.SizedBox(height: 5),
              pw.Text(
                'KITCHEN ORDER TICKET',
                style: pw.TextStyle(font: regular, fontSize: 12),
              ),
              pw.Text(
                'Order #${order.id}',
                style: pw.TextStyle(font: bold, fontSize: 18),
              ),
              pw.Text(
                'Table ${order.tableNumber ?? 'Takeaway'}',
                style: pw.TextStyle(font: regular, fontSize: 14),
              ),
              pw.SizedBox(height: 10),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Item', style: pw.TextStyle(font: bold)),
                  pw.Text('Qty', style: pw.TextStyle(font: bold)),
                ],
              ),
              pw.Divider(),
              ...itemsToPrint.map(
                (item) => pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 1),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Expanded(
                        child: pw.Text(
                          _cleanText(item.name),
                          style: pw.TextStyle(font: regular),
                        ),
                      ),
                      pw.Text(
                        'x${overrideItems != null ? item.quantity : (item.quantity - item.printedQuantity)}',
                        style: pw.TextStyle(font: bold),
                      ),
                    ],
                  ),
                ),
              ),
              pw.Divider(),
              pw.Text(
                _formatTime(order.createdAt, settings),
                style: pw.TextStyle(font: regular, fontSize: 10),
              ),
            ],
          );
        },
      ),
    );

    return pdf;
  }

  static Future<pw.Document> generateBill(
    Order order,
    Map<String, dynamic> settings,
  ) async {
    final pdf = pw.Document();
    final currency = settings['currencySymbol'] ?? '₹';
    final regular = await _unicodeFont();
    final bold = await _unicodeFont(bold: true);
    final italic = await _unicodeFontItalic();
    final logoBytes = await _fetchLogoBytes(settings['logoUrl']);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              if (logoBytes != null)
                pw.Container(
                  height: 50,
                  margin: const pw.EdgeInsets.only(bottom: 8),
                  child: pw.Image(pw.MemoryImage(logoBytes)),
                ),
              pw.Text(
                _cleanText(settings['restaurantName'] ?? 'Restaurant'),
                style: pw.TextStyle(font: bold, fontSize: 22),
              ),
              if (settings['restaurantAddress'] != null &&
                  settings['restaurantAddress'].toString().isNotEmpty)
                pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 10),
                  child: pw.Text(
                    settings['restaurantAddress'],
                    textAlign: pw.TextAlign.center,
                    style: pw.TextStyle(font: regular, fontSize: 10),
                  ),
                ),
              if (settings['restaurantPhone'] != null &&
                  settings['restaurantPhone'].toString().isNotEmpty)
                pw.Text(
                  'Phone: ${settings['restaurantPhone']}',
                  style: pw.TextStyle(font: regular, fontSize: 10),
                ),
              pw.SizedBox(height: 8),
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                child: pw.Text(
                  'TAX INVOICE',
                  style: pw.TextStyle(font: bold, fontSize: 11),
                ),
              ),
              pw.SizedBox(height: 5),
              pw.Text(
                'Order #${order.id}',
                style: pw.TextStyle(font: regular, fontSize: 11),
              ),
              pw.Text(
                'Table ${order.tableNumber ?? 'Takeaway'}',
                style: pw.TextStyle(font: regular, fontSize: 11),
              ),
              pw.SizedBox(height: 10),
              pw.Divider(thickness: 0.5),
              // Header row
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(
                    flex: 3,
                    child: pw.Text('Item', style: pw.TextStyle(font: bold, fontSize: 10)),
                  ),
                  pw.Expanded(
                    flex: 1,
                    child: pw.Text(
                      'Qty',
                      textAlign: pw.TextAlign.center,
                      style: pw.TextStyle(font: bold, fontSize: 10),
                    ),
                  ),
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text(
                      'Total',
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(font: bold, fontSize: 10),
                    ),
                  ),
                ],
              ),
              pw.Divider(thickness: 0.5),
              ...order.items.map(
                (item) => pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 1.5),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Expanded(
                        flex: 3,
                        child: pw.Text(
                          _cleanText(item.name),
                          style: pw.TextStyle(font: regular, fontSize: 10),
                        ),
                      ),
                      pw.Expanded(
                        flex: 1,
                        child: pw.Text(
                          '${item.quantity}',
                          textAlign: pw.TextAlign.center,
                          style: pw.TextStyle(font: regular, fontSize: 10),
                        ),
                      ),
                      pw.Expanded(
                        flex: 2,
                        child: pw.Text(
                          '$currency${(item.quantity * item.price).toStringAsFixed(2)}',
                          textAlign: pw.TextAlign.right,
                          style: pw.TextStyle(font: regular, fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              pw.Divider(thickness: 0.5),
              // Subtotal
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Subtotal:', style: pw.TextStyle(font: regular, fontSize: 10)),
                  pw.Text(
                    '$currency${order.subtotal.toStringAsFixed(2)}',
                    style: pw.TextStyle(font: regular, fontSize: 10),
                  ),
                ],
              ),
              if (order.tax > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      settings['taxLabel'] ?? 'Tax:',
                      style: pw.TextStyle(font: regular, fontSize: 10),
                    ),
                    pw.Text(
                      '$currency${order.tax.toStringAsFixed(2)}',
                      style: pw.TextStyle(font: regular, fontSize: 10),
                    ),
                  ],
                ),
              pw.Divider(thickness: 1),
              // Grand total
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'GRAND TOTAL:',
                    style: pw.TextStyle(font: bold, fontSize: 14),
                  ),
                  pw.Text(
                    '$currency${order.total.toStringAsFixed(2)}',
                    style: pw.TextStyle(font: bold, fontSize: 14),
                  ),
                ],
              ),
              pw.Divider(thickness: 1),
              pw.SizedBox(height: 10),
              pw.Text(
                _cleanText(
                  settings['restaurantTagline'] != null &&
                          settings['restaurantTagline'].toString().isNotEmpty
                      ? settings['restaurantTagline']
                      : 'Thank you for dining with us!',
                ),
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(font: italic, fontSize: 10),
              ),
              pw.SizedBox(height: 5),
              pw.Text(
                _formatTime(order.createdAt, settings),
                style: pw.TextStyle(font: regular, fontSize: 9, color: PdfColors.grey700),
              ),
            ],
          );
        },
      ),
    );

    return pdf;
  }

  static Future<pw.Document> generateDailyReport(
    Map<String, dynamic> stats,
    Map<String, dynamic> settings,
    String currency,
  ) async {
    final pdf = pw.Document();
    final regular = await _unicodeFont();
    final bold = await _unicodeFont(bold: true);
    final italic = await _unicodeFontItalic();
    final logoBytes = await _fetchLogoBytes(settings['logoUrl']);

    final todayRev = (stats['todayRevenue'] ?? 0.0) as num;
    final cashRev = (stats['cashRevenue'] ?? 0.0) as num;
    final onlineRev = (stats['onlineRevenue'] ?? 0.0) as num;
    final unpaidRev = (stats['unpaidRevenue'] ?? 0.0) as num;
    final todayOrd = stats['todayOrders'] ?? 0;
    final topItems = List<Map<String, dynamic>>.from(stats['topItems'] ?? []);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Row(
                    children: [
                      if (logoBytes != null)
                        pw.Container(
                          width: 50,
                          height: 50,
                          margin: const pw.EdgeInsets.only(right: 12),
                          child: pw.Image(pw.MemoryImage(logoBytes)),
                        ),
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            settings['restaurantName'] ?? 'Restaurant',
                            style: pw.TextStyle(
                              font: bold,
                              fontSize: 22,
                              color: const PdfColor.fromInt(0xFF0B0B0F),
                            ),
                          ),
                          if (settings['restaurantAddress'] != null)
                            pw.Text(
                              settings['restaurantAddress'],
                              style: pw.TextStyle(
                                font: regular,
                                fontSize: 9,
                                color: const PdfColor.fromInt(0xFF666666),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        'DAILY SALES REPORT',
                        style: pw.TextStyle(
                          font: bold,
                          fontSize: 14,
                          color: const PdfColor.fromInt(0xFFFF6A00),
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        DateTime.now().toString().substring(0, 10),
                        style: pw.TextStyle(font: regular, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 24),
              pw.Divider(color: const PdfColor.fromInt(0xFFEEEEEE)),
              pw.SizedBox(height: 24),

              // Summary metric boxes
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  _metricBox(
                    'Total Revenue',
                    '$currency${todayRev.toStringAsFixed(2)}',
                    bold,
                    regular,
                    const PdfColor.fromInt(0xFFFF6A00),
                  ),
                  _metricBox(
                    'Cash Payments',
                    '$currency${cashRev.toStringAsFixed(2)}',
                    bold,
                    regular,
                    const PdfColor.fromInt(0xFF22C55E),
                  ),
                  _metricBox(
                    'Online Payments',
                    '$currency${onlineRev.toStringAsFixed(2)}',
                    bold,
                    regular,
                    const PdfColor.fromInt(0xFF0A84FF),
                  ),
                ],
              ),
              pw.SizedBox(height: 16),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.start,
                children: [
                  _metricBox(
                    'Total Orders',
                    '$todayOrd',
                    bold,
                    regular,
                    const PdfColor.fromInt(0xFF0B0B0F),
                  ),
                  pw.SizedBox(width: 16),
                  _metricBox(
                    'Unpaid Dues',
                    '$currency${unpaidRev.toStringAsFixed(2)}',
                    bold,
                    regular,
                    const PdfColor.fromInt(0xFFF87171),
                  ),
                ],
              ),

              pw.SizedBox(height: 32),

              // Top Selling Section
              pw.Text(
                'TOP SELLING ITEMS (LAST 7 DAYS)',
                style: pw.TextStyle(
                  font: bold,
                  fontSize: 11,
                  color: const PdfColor.fromInt(0xFF888888),
                ),
              ),
              pw.SizedBox(height: 8),
              if (topItems.isEmpty)
                pw.Text(
                  'No sales data available yet.',
                  style: pw.TextStyle(font: italic, fontSize: 10),
                )
              else
                pw.TableHelper.fromTextArray(
                  context: context,
                  cellPadding: const pw.EdgeInsets.all(8),
                  headerDecoration: const pw.BoxDecoration(
                    color: PdfColor.fromInt(0xFFF8F8F8),
                  ),
                  headerStyle: pw.TextStyle(font: bold, fontSize: 9),
                  cellStyle: pw.TextStyle(font: regular, fontSize: 9),
                  border: pw.TableBorder.all(
                    color: const PdfColor.fromInt(0xFFE0E0E0),
                    width: 0.5,
                  ),
                  headers: ['Item Name', 'Quantity Sold', 'Revenue Generated'],
                  data: topItems
                      .map(
                        (item) => [
                          item['name'] ?? '—',
                          '${item['qty']}',
                          '$currency${(item['revenue'] as num).toStringAsFixed(2)}',
                        ],
                      )
                      .toList(),
                ),

              pw.Spacer(),
              pw.Divider(color: const PdfColor.fromInt(0xFFEEEEEE)),
              pw.SizedBox(height: 8),
              pw.Center(
                child: pw.Text(
                  'Generated automatically by the POS System',
                  style: pw.TextStyle(
                    font: italic,
                    fontSize: 8,
                    color: const PdfColor.fromInt(0xFFAAAAAA),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf;
  }

  static pw.Widget _metricBox(
    String label,
    String value,
    pw.Font bold,
    pw.Font regular,
    PdfColor color,
  ) {
    return pw.Container(
      width: 140,
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: const PdfColor.fromInt(0xFFEEEEEE)),
        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(8)),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            label.toUpperCase(),
            style: pw.TextStyle(
              font: bold,
              fontSize: 7,
              color: const PdfColor.fromInt(0xFF888888),
            ),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            value,
            style: pw.TextStyle(font: bold, fontSize: 14, color: color),
          ),
        ],
      ),
    );
  }
}
