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
}
