import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
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
  static Future<pw.Document> generateKOT(
    Order order,
    Map<String, dynamic> settings,
  ) async {
    final pdf = pw.Document();
    final regular = await _unicodeFont();
    final bold = await _unicodeFont(bold: true);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                settings['restaurantName'] ?? 'Restaurant',
                style: pw.TextStyle(font: bold, fontSize: 24),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'KITCHEN ORDER TICKET',
                style: pw.TextStyle(font: regular, fontSize: 14),
              ),
              pw.Text(
                'Order #${order.id}',
                style: pw.TextStyle(font: bold, fontSize: 20),
              ),
              pw.Text(
                'Table ${order.tableNumber ?? 'Takeaway'}',
                style: pw.TextStyle(font: regular, fontSize: 16),
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
              ...order.items.map(
                (item) => pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Expanded(
                        child: pw.Text(
                          item.name,
                          style: pw.TextStyle(font: regular),
                        ),
                      ),
                      pw.Text(
                        'x${item.quantity}',
                        style: pw.TextStyle(font: bold),
                      ),
                    ],
                  ),
                ),
              ),
              pw.Divider(),
              pw.Text(
                DateTime.parse(order.createdAt).toString().substring(0, 16),
                style: pw.TextStyle(font: regular),
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
    final currency = settings['currencySymbol'] ?? '\$';
    final regular = await _unicodeFont();
    final bold = await _unicodeFont(bold: true);
    final italic = await _unicodeFontItalic();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                settings['restaurantName'] ?? 'Restaurant',
                style: pw.TextStyle(font: bold, fontSize: 24),
              ),
              if (settings['restaurantAddress'] != null)
                pw.Text(
                  settings['restaurantAddress'],
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(font: regular),
                ),
              if (settings['restaurantPhone'] != null)
                pw.Text(
                  settings['restaurantPhone'],
                  style: pw.TextStyle(font: regular),
                ),
              pw.SizedBox(height: 10),
              pw.Text(
                'TAX INVOICE',
                style: pw.TextStyle(font: bold, fontSize: 14),
              ),
              pw.Text(
                'Order #${order.id}',
                style: pw.TextStyle(font: regular, fontSize: 14),
              ),
              pw.Text(
                'Table ${order.tableNumber ?? 'Takeaway'}',
                style: pw.TextStyle(font: regular, fontSize: 14),
              ),
              pw.SizedBox(height: 10),
              pw.Divider(),
              // Header row
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text('Item', style: pw.TextStyle(font: bold)),
                  ),
                  pw.Expanded(
                    flex: 1,
                    child: pw.Text(
                      'Qty',
                      textAlign: pw.TextAlign.center,
                      style: pw.TextStyle(font: bold),
                    ),
                  ),
                  pw.Expanded(
                    flex: 1,
                    child: pw.Text(
                      'Total',
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(font: bold),
                    ),
                  ),
                ],
              ),
              pw.Divider(),
              ...order.items.map(
                (item) => pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 2),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Expanded(
                        flex: 2,
                        child: pw.Text(
                          item.name,
                          style: pw.TextStyle(font: regular),
                        ),
                      ),
                      pw.Expanded(
                        flex: 1,
                        child: pw.Text(
                          '${item.quantity}',
                          textAlign: pw.TextAlign.center,
                          style: pw.TextStyle(font: regular),
                        ),
                      ),
                      pw.Expanded(
                        flex: 1,
                        child: pw.Text(
                          '$currency${(item.quantity * item.price).toStringAsFixed(2)}',
                          textAlign: pw.TextAlign.right,
                          style: pw.TextStyle(font: regular),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              pw.Divider(),
              // Subtotal
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Subtotal:', style: pw.TextStyle(font: regular)),
                  pw.Text(
                    '$currency${order.subtotal.toStringAsFixed(2)}',
                    style: pw.TextStyle(font: regular),
                  ),
                ],
              ),
              if (order.tax > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      settings['taxLabel'] ?? 'Tax:',
                      style: pw.TextStyle(font: regular),
                    ),
                    pw.Text(
                      '$currency${order.tax.toStringAsFixed(2)}',
                      style: pw.TextStyle(font: regular),
                    ),
                  ],
                ),
              pw.Divider(),
              // Grand total
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'GRAND TOTAL:',
                    style: pw.TextStyle(font: bold, fontSize: 16),
                  ),
                  pw.Text(
                    '$currency${order.total.toStringAsFixed(2)}',
                    style: pw.TextStyle(font: bold, fontSize: 16),
                  ),
                ],
              ),
              pw.Divider(),
              pw.SizedBox(height: 10),
              pw.Text(
                settings['restaurantTagline'] ??
                    'Thank you for dining with us!',
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(font: italic),
              ),
              pw.SizedBox(height: 5),
              pw.Text(
                DateTime.parse(order.createdAt).toString().substring(0, 16),
                style: pw.TextStyle(font: regular),
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
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        settings['restaurantName'] ?? 'Restaurant',
                        style: pw.TextStyle(
                          font: bold,
                          fontSize: 24,
                          color: const PdfColor.fromInt(0xFF0B0B0F),
                        ),
                      ),
                      if (settings['restaurantAddress'] != null)
                        pw.Text(
                          settings['restaurantAddress'],
                          style: pw.TextStyle(
                            font: regular,
                            fontSize: 10,
                            color: const PdfColor.fromInt(0xFF666666),
                          ),
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
                        style: pw.TextStyle(font: regular, fontSize: 12),
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
                  fontSize: 12,
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
                  headerStyle: pw.TextStyle(font: bold, fontSize: 10),
                  cellStyle: pw.TextStyle(font: regular, fontSize: 10),
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
                    fontSize: 9,
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
              fontSize: 8,
              color: const PdfColor.fromInt(0xFF888888),
            ),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            value,
            style: pw.TextStyle(font: bold, fontSize: 16, color: color),
          ),
        ],
      ),
    );
  }
}
