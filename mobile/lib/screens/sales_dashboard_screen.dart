import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:printing/printing.dart';
import '../services/api_service.dart';
import '../providers/pos_provider.dart';
import '../utils/pdf_generator.dart';
import '../models/order.dart';

class SalesDashboardScreen extends StatefulWidget {
  const SalesDashboardScreen({super.key});

  @override
  State<SalesDashboardScreen> createState() => _SalesDashboardScreenState();
}

class _SalesDashboardScreenState extends State<SalesDashboardScreen> {
  final ApiService api = ApiService();
  bool isLoading = true;
  Map<String, dynamic> stats = {};

  @override
  void initState() {
    super.initState();
    loadStats();
  }

  Future<void> loadStats() async {
    setState(() => isLoading = true);
    try {
      final data = await api.fetchDashboardStats();
      if (!mounted) return;
      setState(() {
        stats = data;
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => isLoading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to load sales stats: $e')));
    }
  }

  void _launchWhatsApp(
    String? phone,
    String orderId,
    double total,
    String? customerName,
  ) async {
    if (phone == null || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No phone number for this customer.')),
      );
      return;
    }
    final cleanPhone = phone.replaceAll(RegExp(r'\D'), '');
    final name = customerName?.isNotEmpty == true ? customerName : 'there';
    final currency =
        Provider.of<PosProvider>(
          context,
          listen: false,
        ).settings['currencySymbol'] ??
        '₹';
    final message =
        'Hello $name,\n\nThis is a friendly reminder regarding your unpaid bill of $currency${total.toStringAsFixed(2)} for Order #$orderId.\n\nPlease arrange a settlement at your earliest convenience. Thank you!';
    final url = Uri.parse(
      'https://wa.me/$cleanPhone?text=${Uri.encodeComponent(message)}',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not launch WhatsApp.')),
      );
    }
  }

  Future<void> _printBillForUnpaid(Map<String, dynamic> orderData) async {
    try {
      final settings = Provider.of<PosProvider>(
        context,
        listen: false,
      ).settings;
      // Build an Order object from the raw map
      final order = Order(
        id: orderData['id'] is int
            ? orderData['id']
            : int.tryParse(orderData['id'].toString()) ?? 0,
        tableNumber: orderData['tableNumber'] ?? 0,
        total: (orderData['total'] ?? 0).toDouble(),
        subtotal: (orderData['subtotal'] ?? orderData['total'] ?? 0).toDouble(),
        tax: (orderData['tax'] ?? 0).toDouble(),
        status: orderData['status'] ?? 'UNPAID',
        createdAt: orderData['createdAt'] ?? DateTime.now().toIso8601String(),
        items: ((orderData['items'] ?? []) as List)
            .map(
              (i) => OrderItem(
                menuItemId: i['id'] ?? i['menuItemId'] ?? 0,
                name: i['name'] ?? '',
                price: (i['price'] ?? 0).toDouble(),
                quantity: i['quantity'] ?? 1,
              ),
            )
            .toList(),
        customerName: orderData['customerName'],
        customerPhone: orderData['customerPhone'],
      );
      final doc = await PdfGenerator.generateBill(order, settings);
      await Printing.layoutPdf(onLayout: (format) => doc.save());
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to print bill: $e')));
    }
  }

  /// Shows an in-app bill summary bottom sheet for an unpaid order
  void _showBillModal(Map<String, dynamic> order, String currency) {
    final total = (order['total'] ?? 0).toDouble();
    final items = (order['items'] ?? []) as List;
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
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                        child: Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Bill – Order #${order['id']}',
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  order['customerName'] ?? 'Unknown',
                                  style: const TextStyle(
                                    color: Color(0xFF888888),
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0x33FF3B30),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Text(
                                'UNPAID',
                                style: TextStyle(
                                  color: Color(0xFFFF3B30),
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, color: Color(0x22FFFFFF)),
                      // Items list
                      Expanded(
                        child: ListView.builder(
                          controller: scrollController,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: items.length,
                          itemBuilder: (context, index) {
                            final item = items[index];
                            final qty = item['quantity'] ?? 1;
                            final price = (item['price'] ?? 0).toDouble();
                            return Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 6,
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
                                      '$qty',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      item['name'] ?? '',
                                      style: const TextStyle(fontSize: 14),
                                    ),
                                  ),
                                  Text(
                                    '$currency${(qty * price).toStringAsFixed(2)}',
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
                      // Total
                      Container(
                        margin: const EdgeInsets.all(16),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 16,
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
                              'Total Due',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              '$currency${total.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 20,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SafeArea(
                        top: false,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _printBillForUnpaid(order),
                                  icon: const Icon(
                                    Icons.print_rounded,
                                    size: 16,
                                  ),
                                  label: const Text('Print'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: const BorderSide(
                                      color: Color(0x44FFFFFF),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    Navigator.pop(context);
                                    _launchWhatsApp(
                                      order['customerPhone'],
                                      order['id'].toString(),
                                      total,
                                      order['customerName'],
                                    );
                                  },
                                  icon: const Icon(
                                    Icons.chat_rounded,
                                    size: 16,
                                  ),
                                  label: const Text('WhatsApp'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF30D158),
                                    foregroundColor: Colors.white,
                                  ),
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

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
    Color gradientEnd,
  ) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                color.withValues(alpha: 0.18),
                gradientEnd.withValues(alpha: 0.08),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withValues(alpha: 0.3), width: 0.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 22, color: color),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: 0.6),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 20,
                      color: color,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currency =
        Provider.of<PosProvider>(context).settings['currencySymbol'] ?? '₹';

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Large title app bar
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            stretch: true,
            backgroundColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              centerTitle: false,
              titlePadding: const EdgeInsets.only(left: 20, bottom: 14),
              title: const Text(
                'Sales',
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
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: loadStats,
              ),
            ],
          ),

          if (isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // ─── Revenue Stats Grid ─────────────────────────────
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 1.1,
                    children: [
                      _buildStatCard(
                        "Today's Revenue",
                        '$currency${(stats['todayRevenue'] ?? 0).toStringAsFixed(2)}',
                        Icons.trending_up_rounded,
                        const Color(0xFFFF6B00),
                        const Color(0xFFE61C24),
                      ),
                      _buildStatCard(
                        'Monthly Revenue',
                        '$currency${(stats['monthlyRevenue'] ?? 0).toStringAsFixed(2)}',
                        Icons.calendar_month_rounded,
                        const Color(0xFF0A84FF),
                        const Color(0xFF5E5CE6),
                      ),
                      _buildStatCard(
                        'Pending Orders',
                        '${stats['pendingOrders'] ?? 0}',
                        Icons.hourglass_top_rounded,
                        const Color(0xFFFFCC00),
                        const Color(0xFFFF9500),
                      ),
                      _buildStatCard(
                        'Unpaid Dues',
                        '$currency${(stats['unpaidRevenue'] ?? 0).toStringAsFixed(2)}',
                        Icons.warning_rounded,
                        const Color(0xFFFF3B30),
                        const Color(0xFFFF2D55),
                      ),
                    ],
                  ),

                  // ─── Payment Breakdown ─────────────────────────────
                  const SizedBox(height: 28),
                  const Text(
                    'Payment Breakdown',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0x14FFFFFF),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: const Color(0x28FFFFFF),
                            width: 0.5,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: _buildPaymentTile(
                                'Cash',
                                '$currency${(stats['cashRevenue'] ?? 0).toStringAsFixed(2)}',
                                Icons.payments_rounded,
                                const Color(0xFF30D158),
                              ),
                            ),
                            Container(
                              width: 0.5,
                              height: 48,
                              color: const Color(0x28FFFFFF),
                            ),
                            Expanded(
                              child: _buildPaymentTile(
                                'Online',
                                '$currency${(stats['onlineRevenue'] ?? 0).toStringAsFixed(2)}',
                                Icons.smartphone_rounded,
                                const Color(0xFF0A84FF),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // ─── Unpaid Bills ─────────────────────────────────
                  const SizedBox(height: 28),
                  Row(
                    children: [
                      Container(
                        width: 4,
                        height: 20,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF3B30),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Unpaid Bills',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(width: 8),
                      if ((stats['unpaidOrders'] as List? ?? []).isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0x33FF3B30),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${(stats['unpaidOrders'] as List).length}',
                            style: const TextStyle(
                              color: Color(0xFFFF3B30),
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (stats['unpaidOrders'] == null ||
                      (stats['unpaidOrders'] as List).isEmpty)
                    _buildEmptyUnpaid()
                  else
                    ...((stats['unpaidOrders'] as List).map((order) {
                      final total = (order['total'] ?? 0).toDouble();
                      return _buildUnpaidCard(order, total, currency);
                    }).toList()),
                ]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPaymentTile(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyUnpaid() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 16),
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: const Color(0x0AFFFFFF),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x18FFFFFF)),
      ),
      child: const Center(
        child: Column(
          children: [
            Text('🎉', style: TextStyle(fontSize: 32)),
            SizedBox(height: 8),
            Text(
              'No unpaid bills!',
              style: TextStyle(color: Color(0xFF888888), fontSize: 15),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUnpaidCard(
    Map<String, dynamic> order,
    double total,
    String currency,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0x14FFFFFF),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0x44FF3B30), width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0x22FF3B30),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Order #${order['id']}',
                    style: const TextStyle(
                      color: Color(0xFFFF3B30),
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  '$currency${total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Customer info
            Row(
              children: [
                const Icon(
                  Icons.person_outline,
                  size: 14,
                  color: Color(0xFF888888),
                ),
                const SizedBox(width: 6),
                Text(
                  order['customerName'] ?? 'Unknown Customer',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(
                  Icons.phone_outlined,
                  size: 14,
                  color: Color(0xFF888888),
                ),
                const SizedBox(width: 6),
                Text(
                  order['customerPhone'] ?? 'No phone',
                  style: const TextStyle(
                    color: Color(0xFF888888),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // Action buttons — row of 3
            Row(
              children: [
                // View Bill
                Expanded(
                  child: GestureDetector(
                    onTap: () => _showBillModal(order, currency),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0x22FFFFFF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x44FFFFFF)),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.receipt_long_rounded,
                            size: 16,
                            color: Colors.white,
                          ),
                          SizedBox(height: 3),
                          Text(
                            'View Bill',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Print Bill
                Expanded(
                  child: GestureDetector(
                    onTap: () => _printBillForUnpaid(order),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0x22FFFFFF),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x33FFFFFF)),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.print_rounded,
                            size: 16,
                            color: Colors.white,
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Print',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // WhatsApp
                Expanded(
                  child: GestureDetector(
                    onTap: () => _launchWhatsApp(
                      order['customerPhone'],
                      order['id'].toString(),
                      total,
                      order['customerName'],
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0x2230D158),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x4430D158)),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.chat_rounded,
                            size: 16,
                            color: Color(0xFF30D158),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'WhatsApp',
                            style: TextStyle(
                              color: Color(0xFF30D158),
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
