import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../models/order.dart';

class PdfGenerator {
  static Future<pw.Document> generateKOT(
    Order order,
    Map<String, dynamic> settings,
  ) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                settings['restaurantName'] ?? 'Restaurant',
                style: pw.TextStyle(
                  fontSize: 24,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'KITCHEN ORDER TICKET',
                style: pw.TextStyle(fontSize: 14),
              ),
              pw.Text(
                'Order #${order.id}',
                style: pw.TextStyle(
                  fontSize: 20,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text(
                'Table ${order.tableNumber ?? 'Takeaway'}',
                style: pw.TextStyle(fontSize: 16),
              ),
              pw.SizedBox(height: 10),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'Item',
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                  ),
                  pw.Text(
                    'Qty',
                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
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
                      pw.Expanded(child: pw.Text(item.name)),
                      pw.Text(
                        'x${item.quantity}',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
              pw.Divider(),
              pw.Text(
                DateTime.parse(order.createdAt).toString().substring(0, 16),
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

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                settings['restaurantName'] ?? 'Restaurant',
                style: pw.TextStyle(
                  fontSize: 24,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              if (settings['restaurantAddress'] != null)
                pw.Text(
                  settings['restaurantAddress'],
                  textAlign: pw.TextAlign.center,
                ),
              if (settings['restaurantPhone'] != null)
                pw.Text(settings['restaurantPhone']),
              pw.SizedBox(height: 10),
              pw.Text(
                'TAX INVOICE',
                style: pw.TextStyle(
                  fontSize: 14,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text('Order #${order.id}', style: pw.TextStyle(fontSize: 14)),
              pw.Text(
                'Table ${order.tableNumber ?? 'Takeaway'}',
                style: pw.TextStyle(fontSize: 14),
              ),
              pw.SizedBox(height: 10),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(
                    flex: 2,
                    child: pw.Text(
                      'Item',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                    ),
                  ),
                  pw.Expanded(
                    flex: 1,
                    child: pw.Text(
                      'Qty',
                      textAlign: pw.TextAlign.center,
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                    ),
                  ),
                  pw.Expanded(
                    flex: 1,
                    child: pw.Text(
                      'Total',
                      textAlign: pw.TextAlign.right,
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
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
                      pw.Expanded(flex: 2, child: pw.Text(item.name)),
                      pw.Expanded(
                        flex: 1,
                        child: pw.Text(
                          '${item.quantity}',
                          textAlign: pw.TextAlign.center,
                        ),
                      ),
                      pw.Expanded(
                        flex: 1,
                        child: pw.Text(
                          '$currency${(item.quantity * item.price).toStringAsFixed(2)}',
                          textAlign: pw.TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Subtotal:'),
                  pw.Text('$currency${order.subtotal.toStringAsFixed(2)}'),
                ],
              ),
              if (order.tax > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(settings['taxLabel'] ?? 'Tax:'),
                    pw.Text('$currency${order.tax.toStringAsFixed(2)}'),
                  ],
                ),
              pw.Divider(),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text(
                    'GRAND TOTAL:',
                    style: pw.TextStyle(
                      fontSize: 16,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.Text(
                    '$currency${order.total.toStringAsFixed(2)}',
                    style: pw.TextStyle(
                      fontSize: 16,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                ],
              ),
              pw.Divider(),
              pw.SizedBox(height: 10),
              pw.Text(
                settings['restaurantTagline'] ??
                    'Thank you for dining with us!',
                textAlign: pw.TextAlign.center,
                style: pw.TextStyle(fontStyle: pw.FontStyle.italic),
              ),
              pw.SizedBox(height: 5),
              pw.Text(
                DateTime.parse(order.createdAt).toString().substring(0, 16),
              ),
            ],
          );
        },
      ),
    );

    return pdf;
  }
}
