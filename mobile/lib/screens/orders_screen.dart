import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:printing/printing.dart';
import '../utils/pdf_generator.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../providers/pos_provider.dart';
import 'pos_screen.dart';

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
      loadOrders();
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
        ).showSnackBar(SnackBar(content: Text('Print KOT failed: $e')));
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
        ).showSnackBar(SnackBar(content: Text('Print Bill failed: $e')));
      }
    }
  }

  /// Navigate to POS so staff can add more items to an existing PENDING order
  void _addItemsToOrder(Order order) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            POSScreen(tableNumber: order.tableNumber ?? 1, orderId: order.id),
      ),
    ).then((_) => loadOrders());
  }

  void _showOrderDetails(Order order, String currency) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          builder: (context, scrollController) {
            return ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(28),
              ),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
                child: Container(
                  decoration: const BoxDecoration(
                    color: Color(0xDD0A0A0A),
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(28),
                    ),
                    border: Border(
                      top: BorderSide(color: Color(0x33FFFFFF), width: 0.5),
                    ),
                  ),
                  child: Column(
                    children: [
                      // Handle
                      Container(
                        margin: const EdgeInsets.only(top: 12, bottom: 8),
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      // Header
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                        child: Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Order #${order.id}',
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                Text(
                                  'Table ${order.tableNumber}',
                                  style: const TextStyle(
                                    color: Color(0xFF888888),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            _StatusBadge(status: order.status),
                          ],
                        ),
                      ),
                      const Divider(height: 1, color: Color(0x22FFFFFF)),
                      // Items
                      Expanded(
                        child: ListView.builder(
                          controller: scrollController,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: order.items.length,
                          itemBuilder: (context, index) {
                            final item = order.items[index];
                            return Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 5,
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 28,
                                    height: 28,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: const Color(0x22FFFFFF),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '${item.quantity}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      item.name,
                                      style: const TextStyle(fontSize: 14),
                                    ),
                                  ),
                                  Text(
                                    '$currency${(item.quantity * item.price).toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                      // Total bar
                      Container(
                        margin: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFF6B00), Color(0xFFE61C24)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              '$currency${order.total.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 20,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Action buttons
                      SafeArea(
                        top: false,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: Row(
                            children: [
                              if (order.status == 'PENDING')
                                Expanded(
                                  child: _ActionButton(
                                    label: 'Add Items',
                                    icon: Icons.add_circle_outline,
                                    color: const Color(0xFF0A84FF),
                                    onTap: () {
                                      Navigator.pop(context);
                                      _addItemsToOrder(order);
                                    },
                                  ),
                                ),
                              if (order.status == 'PENDING')
                                const SizedBox(width: 8),
                              Expanded(
                                child: _ActionButton(
                                  label: 'KOT',
                                  icon: Icons.receipt_outlined,
                                  color: Colors.white,
                                  onTap: () => _printKot(order),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _ActionButton(
                                  label: 'Bill',
                                  icon: Icons.print_rounded,
                                  color: const Color(0xFF30D158),
                                  onTap: () => _printBill(order),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
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
                      'Total: $currency${order.total.toStringAsFixed(2)}',
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
                      initialValue: paymentMethod,
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
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Order settled successfully!'),
                                ),
                              );
                            }
                            loadOrders();
                          } catch (e) {
                            if (!mounted) return;
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Failed to settle: $e')),
                              );
                            }
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
      body: CustomScrollView(
        slivers: [
          // ── iOS 26-style large title glass app bar ──────────────────
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            stretch: true,
            backgroundColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              centerTitle: false,
              titlePadding: const EdgeInsets.only(left: 20, bottom: 14),
              title: const Text(
                'Orders',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                  color: Colors.white,
                ),
              ),
              background: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0x88000000), Color(0x00000000)],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: loadOrders,
              ),
            ],
          ),

          if (isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (orders.isEmpty)
            const SliverFillRemaining(
              child: Center(child: Text('No orders found')),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  final order = orders[index];
                  final currency =
                      Provider.of<PosProvider>(
                        context,
                        listen: false,
                      ).settings['currencySymbol'] ??
                      '₹';
                  return _buildOrderCard(order, currency);
                }, childCount: orders.length),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(Order order, String currency) {
    final Color statusColor;
    switch (order.status) {
      case 'PENDING':
        statusColor = const Color(0xFFFF9500);
        break;
      case 'PAID':
        statusColor = const Color(0xFF30D158);
        break;
      case 'UNPAID':
        statusColor = const Color(0xFFFFCC00);
        break;
      case 'CANCELLED':
        statusColor = const Color(0xFFFF3B30);
        break;
      default:
        statusColor = Colors.grey;
    }

    final dt = DateTime.parse(order.createdAt);
    final dateStr =
        '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';

    return GestureDetector(
      onTap: () => _showOrderDetails(order, currency),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: const Color(0x12FFFFFF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: statusColor.withValues(alpha: 0.25),
            width: 0.5,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Left: leading indicator
              Container(
                width: 4,
                height: 48,
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 14),
              // Center info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Order #${order.id}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Table ${order.tableNumber}',
                      style: const TextStyle(
                        color: Color(0xFF888888),
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      dateStr,
                      style: const TextStyle(
                        color: Color(0xFF555555),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              // Right: amount + status chip + menu
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '$currency${order.total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _StatusBadge(status: order.status),
                      const SizedBox(width: 4),
                      PopupMenuButton<String>(
                        icon: Icon(
                          Icons.more_vert,
                          size: 18,
                          color: Colors.white.withValues(alpha: 0.5),
                        ),
                        onSelected: (String status) {
                          if (status == 'CHECKOUT') {
                            _showCheckoutDialog(order, currency);
                          } else if (status == 'ADD_ITEMS') {
                            _addItemsToOrder(order);
                          } else if (status != order.status) {
                            updateStatus(order, status);
                          }
                        },
                        itemBuilder: (BuildContext context) =>
                            <PopupMenuEntry<String>>[
                              if (order.status == 'PENDING')
                                const PopupMenuItem<String>(
                                  value: 'ADD_ITEMS',
                                  child: Text('➕  Add Items'),
                                ),
                              const PopupMenuItem<String>(
                                value: 'CHECKOUT',
                                child: Text('💳  Settle Bill'),
                              ),
                              const PopupMenuItem<String>(
                                value: 'PENDING',
                                child: Text('🔄  Mark Pending'),
                              ),
                              const PopupMenuItem<String>(
                                value: 'CANCELLED',
                                child: Text('❌  Cancel'),
                              ),
                            ],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Reusable status badge ────────────────────────────────────────────────────
class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final Color color;
    switch (status) {
      case 'PENDING':
        color = const Color(0xFFFF9500);
        break;
      case 'PAID':
        color = const Color(0xFF30D158);
        break;
      case 'UNPAID':
        color = const Color(0xFFFFCC00);
        break;
      case 'CANCELLED':
        color = const Color(0xFFFF3B30);
        break;
      default:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 10,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

// ─── Reusable action button for order detail sheet ───────────────────────────
class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
