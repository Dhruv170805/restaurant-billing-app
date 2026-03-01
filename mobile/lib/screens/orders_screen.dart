import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:printing/printing.dart';
import '../utils/pdf_generator.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../providers/pos_provider.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final ApiService api = ApiService();
  bool isLoading = true;
  List<Order> orders = [];

  @override
  void initState() {
    super.initState();
    loadOrders();
  }

  Future<void> loadOrders() async {
    setState(() => isLoading = true);
    try {
      final fetchedOrders = await api.fetchOrders();
      if (!mounted) return;
      setState(() {
        // Sort newest first
        fetchedOrders.sort(
          (a, b) => DateTime.parse(
            b.createdAt,
          ).compareTo(DateTime.parse(a.createdAt)),
        );
        orders = fetchedOrders;
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => isLoading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to load orders: $e')));
    }
  }

  Future<void> updateStatus(Order order, String newStatus) async {
    try {
      await api.updateOrderStatus(order.id, newStatus);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Order #${order.id} marked as $newStatus')),
      );
      loadOrders(); // Refresh list
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to update status: $e')));
    }
  }

  Future<void> _printKot(Order order) async {
    try {
      final settings = Provider.of<PosProvider>(
        context,
        listen: false,
      ).settings;
      final doc = await PdfGenerator.generateKOT(order, settings);
      await Printing.layoutPdf(onLayout: (format) => doc.save());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to print KOT: $e')));
      }
    }
  }

  Future<void> _printBill(Order order) async {
    try {
      final settings = Provider.of<PosProvider>(
        context,
        listen: false,
      ).settings;
      final doc = await PdfGenerator.generateBill(order, settings);
      await Printing.layoutPdf(onLayout: (format) => doc.save());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to print Bill: $e')));
      }
    }
  }

  void _showOrderDetails(Order order, String currency) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Order #${order.id} - Table ${order.tableNumber}'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: order.items.length,
              itemBuilder: (context, index) {
                final item = order.items[index];
                return ListTile(
                  title: Text(item.name),
                  subtitle: Text(
                    '${item.quantity} x $currency${item.price.toStringAsFixed(2)}',
                  ),
                  trailing: Text(
                    '$currency${(item.quantity * item.price).toStringAsFixed(2)}',
                  ),
                );
              },
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => _printKot(order),
              child: const Text('Print KOT'),
            ),
            TextButton(
              onPressed: () => _printBill(order),
              child: const Text('Print Bill'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  void _showCheckoutDialog(Order order, String currency) {
    String? paymentMethod;
    String customerName = '';
    String customerPhone = '';

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            final isUnpaid = paymentMethod == 'UNPAID';
            final canSubmit =
                paymentMethod != null &&
                (!isUnpaid ||
                    (customerName.trim().isNotEmpty &&
                        customerPhone.trim().isNotEmpty));

            return AlertDialog(
              title: Text('Settle Order #${order.id}'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Total Amount: $currency${order.total.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        labelText: 'Payment Method',
                        border: OutlineInputBorder(),
                      ),
                      value: paymentMethod,
                      items: const [
                        DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                        DropdownMenuItem(
                          value: 'ONLINE',
                          child: Text('Online'),
                        ),
                        DropdownMenuItem(
                          value: 'UNPAID',
                          child: Text('Unpaid (Dues)'),
                        ),
                      ],
                      onChanged: (val) => setState(() => paymentMethod = val),
                    ),
                    if (paymentMethod != null) ...[
                      const SizedBox(height: 16),
                      TextField(
                        decoration: InputDecoration(
                          labelText:
                              'Customer Name ${isUnpaid ? '*' : '(Optional)'}',
                          border: const OutlineInputBorder(),
                        ),
                        onChanged: (val) => setState(() => customerName = val),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        decoration: InputDecoration(
                          labelText:
                              'Customer Phone ${isUnpaid ? '*' : '(Optional)'}',
                          border: const OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.phone,
                        onChanged: (val) => setState(() => customerPhone = val),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: canSubmit
                      ? () async {
                          Navigator.pop(context);
                          final status = isUnpaid ? 'UNPAID' : 'PAID';
                          try {
                            await api.updateOrderStatus(
                              order.id,
                              status,
                              paymentMethod: paymentMethod,
                              customerName: customerName.trim(),
                              customerPhone: customerPhone.trim(),
                            );
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Order settled successfully!'),
                              ),
                            );
                            loadOrders();
                          } catch (e) {
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Failed to settle order: $e'),
                              ),
                            );
                          }
                        }
                      : null,
                  child: const Text('Confirm'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: loadOrders),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: loadOrders,
              child: ListView.builder(
                itemCount: orders.length,
                itemBuilder: (context, index) {
                  final order = orders[index];
                  Color statusColor;
                  switch (order.status) {
                    case 'PENDING':
                      statusColor = Colors.orangeAccent;
                      break;
                    case 'PAID':
                      statusColor = Colors.greenAccent;
                      break;
                    case 'UNPAID':
                      statusColor = Colors.amber;
                      break;
                    case 'CANCELLED':
                      statusColor = Colors.redAccent;
                      break;
                    default:
                      statusColor = Colors.grey;
                  }

                  final currency =
                      Provider.of<PosProvider>(
                        context,
                      ).settings['currencySymbol'] ??
                      '\$';

                  return Card(
                    margin: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: ListTile(
                      onTap: () => _showOrderDetails(order, currency),
                      title: Text(
                        'Order #${order.id}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Table ${order.tableNumber}'),
                          Text(
                            // Format date roughly (e.g. MM/DD/YYYY Time)
                            '${DateTime.parse(order.createdAt).month}/${DateTime.parse(order.createdAt).day}/${DateTime.parse(order.createdAt).year} ${DateTime.parse(order.createdAt).hour}:${DateTime.parse(order.createdAt).minute.toString().padLeft(2, '0')}',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$currency${order.total.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(width: 8),
                          PopupMenuButton<String>(
                            initialValue: order.status,
                            onSelected: (String status) {
                              if (status == 'CHECKOUT') {
                                _showCheckoutDialog(order, currency);
                              } else if (status != order.status) {
                                updateStatus(order, status);
                              }
                            },
                            itemBuilder: (BuildContext context) =>
                                <PopupMenuEntry<String>>[
                                  const PopupMenuItem<String>(
                                    value: 'PENDING',
                                    child: Text('Mark as Pending'),
                                  ),
                                  const PopupMenuItem<String>(
                                    value: 'CHECKOUT',
                                    child: Text('Settle Bill / Checkout'),
                                  ),
                                  const PopupMenuItem<String>(
                                    value: 'CANCELLED',
                                    child: Text('Mark as Cancelled'),
                                  ),
                                ],
                            child: Chip(
                              label: Text(
                                order.status,
                                style: TextStyle(
                                  color: statusColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 10,
                                ),
                              ),
                              backgroundColor: statusColor.withValues(
                                alpha: 0.15,
                              ),
                              side: BorderSide(
                                color: statusColor.withValues(alpha: 0.5),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
