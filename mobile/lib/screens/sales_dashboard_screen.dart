import 'dart:ui';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:printing/printing.dart';
import '../services/api_service.dart';
import '../providers/pos_provider.dart';
import '../utils/pdf_generator.dart';
import '../models/order.dart';
import '../utils/app_colors.dart';

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

  Future<void> _generateProfitReport() async {
    try {
      final settings = Provider.of<PosProvider>(
        context,
        listen: false,
      ).settings;
      final currency = settings['currencySymbol'] ?? '₹';
      final doc = await PdfGenerator.generateDailyReport(
        stats,
        settings,
        currency,
      );
      await Printing.layoutPdf(onLayout: (format) => doc.save());
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to generate report: $e')));
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
                                    color: AppColors.muted,
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
                                  color: AppColors.dangerAlt,
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
                            colors: [AppColors.orangeAlt, AppColors.redAlt],
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
                                    backgroundColor: AppColors.greenAlt,
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
                icon: const Icon(
                  Icons.picture_as_pdf_rounded,
                  color: AppColors.orange,
                ),
                onPressed: _generateProfitReport,
                tooltip: 'Download Daily Profit Report',
              ),
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
                        AppColors.orangeAlt,
                        AppColors.redAlt,
                      ),
                      _buildStatCard(
                        'Monthly Revenue',
                        '$currency${(stats['monthlyRevenue'] ?? 0).toStringAsFixed(2)}',
                        Icons.calendar_month_rounded,
                        AppColors.blue,
                        const Color(0xFF5E5CE6),
                      ),
                      _buildStatCard(
                        'Pending Orders',
                        '${stats['pendingOrders'] ?? 0}',
                        Icons.hourglass_top_rounded,
                        AppColors.amberAlt,
                        AppColors.amber,
                      ),
                      _buildStatCard(
                        'Unpaid Dues',
                        '$currency${(stats['unpaidRevenue'] ?? 0).toStringAsFixed(2)}',
                        Icons.warning_rounded,
                        AppColors.dangerAlt,
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
                            color: AppColors.borderMid,
                            width: 0.5,
                          ),
                        ),
                        child: Column(
                          children: [
                            // Donut chart
                            _PaymentDonut(
                              cash: (stats['cashRevenue'] ?? 0).toDouble(),
                              online: (stats['onlineRevenue'] ?? 0).toDouble(),
                              currency: currency,
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: _buildPaymentTile(
                                    'Cash',
                                    '$currency${(stats['cashRevenue'] ?? 0).toStringAsFixed(2)}',
                                    Icons.payments_rounded,
                                    AppColors.greenAlt,
                                  ),
                                ),
                                Container(
                                  width: 0.5,
                                  height: 48,
                                  color: AppColors.borderMid,
                                ),
                                Expanded(
                                  child: _buildPaymentTile(
                                    'Online',
                                    '$currency${(stats['onlineRevenue'] ?? 0).toStringAsFixed(2)}',
                                    Icons.smartphone_rounded,
                                    AppColors.blue,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // ─── Hourly Revenue Chart ──────────────────────────
                  const SizedBox(height: 28),
                  const Text(
                    'Today — Peak Hours',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _HourlyRevenueChart(
                    hourlyData:
                        (stats['hourlyRevenue'] as List?)
                            ?.map((e) => (e as num).toDouble())
                            .toList() ??
                        const [],
                    currency: currency,
                  ),

                  // ─── Top Selling Dishes ────────────────────────────
                  const SizedBox(height: 32),
                  const Text(
                    '🏆 Top Selling (7 Days)',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _TopSellingChart(
                    topItems: List<Map<String, dynamic>>.from(
                      stats['topItems'] ?? [],
                    ),
                    currency: currency,
                  ),

                  // ─── AI Revenue Prediction ─────────────────────────
                  const SizedBox(height: 32),
                  const Text(
                    '🤖 AI Revenue Prediction',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _AiPredictionCard(
                    weeklyAvg: List<num>.from(stats['weeklyAvg'] ?? []),
                    todayRevenue: (stats['todayRevenue'] ?? 0.0) as num,
                    yesterdayRevenue: (stats['yesterdayRevenue'] ?? 0.0) as num,
                    currency: currency,
                  ),

                  const SizedBox(height: 28),
                  Row(
                    children: [
                      Container(
                        width: 4,
                        height: 20,
                        decoration: BoxDecoration(
                          color: AppColors.dangerAlt,
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
                              color: AppColors.dangerAlt,
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
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: const Center(
        child: Column(
          children: [
            Text('🎉', style: TextStyle(fontSize: 32)),
            SizedBox(height: 8),
            Text(
              'No unpaid bills!',
              style: TextStyle(color: AppColors.muted, fontSize: 15),
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
                      color: AppColors.dangerAlt,
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
                  color: AppColors.muted,
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
                  color: AppColors.muted,
                ),
                const SizedBox(width: 6),
                Text(
                  order['customerPhone'] ?? 'No phone',
                  style: const TextStyle(color: AppColors.muted, fontSize: 13),
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
                            color: AppColors.greenAlt,
                          ),
                          SizedBox(height: 3),
                          Text(
                            'WhatsApp',
                            style: TextStyle(
                              color: AppColors.greenAlt,
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

// ─── Hourly Revenue Bar Chart ─────────────────────────────────────────────────

class _HourlyRevenueChart extends StatelessWidget {
  final List<double> hourlyData;
  final String currency;

  const _HourlyRevenueChart({required this.hourlyData, required this.currency});

  @override
  Widget build(BuildContext context) {
    // Guard: empty list (no orders yet today)
    if (hourlyData.isEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Container(
          height: 120,
          decoration: BoxDecoration(
            color: const Color(0x10FFFFFF),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: const Center(
            child: Text(
              'No orders recorded yet today',
              style: TextStyle(color: Colors.white38, fontSize: 13),
            ),
          ),
        ),
      );
    }

    final maxVal = hourlyData
        .reduce((a, b) => a > b ? a : b)
        .clamp(1.0, double.infinity);

    final activeBars = <int, double>{};
    for (int i = 0; i < hourlyData.length; i++) {
      if (hourlyData[i] > 0) activeBars[i] = hourlyData[i];
    }

    final barGroups = activeBars.entries
        .map(
          (e) => BarChartGroupData(
            x: e.key,
            barRods: [
              BarChartRodData(
                toY: e.value,
                gradient: LinearGradient(
                  colors: [
                    AppColors.orange.withValues(alpha: 0.9),
                    AppColors.red.withValues(alpha: 0.7),
                  ],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
                width: 12,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(6),
                ),
              ),
            ],
          ),
        )
        .toList();

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          height: 200,
          padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
          decoration: BoxDecoration(
            color: const Color(0x14FFFFFF),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.borderMid, width: 0.5),
          ),
          child: BarChart(
            BarChartData(
              maxY: maxVal * 1.25,
              minY: 0,
              gridData: FlGridData(
                show: true,
                horizontalInterval: maxVal / 4,
                getDrawingHorizontalLine: (v) => FlLine(
                  color: Colors.white.withValues(alpha: 0.06),
                  strokeWidth: 0.8,
                ),
                drawVerticalLine: false,
              ),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 22,
                    getTitlesWidget: (val, meta) {
                      final h = val.toInt();
                      if (!activeBars.containsKey(h)) {
                        return const SizedBox.shrink();
                      }
                      final label = h == 0
                          ? '12a'
                          : h < 12
                          ? '${h}a'
                          : h == 12
                          ? '12p'
                          : '${h - 12}p';
                      return Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          label,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.4),
                            fontSize: 9,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
              barGroups: barGroups,
              barTouchData: BarTouchData(
                touchTooltipData: BarTouchTooltipData(
                  getTooltipColor: (g) => const Color(0xF00A0A0F),
                  getTooltipItem: (group, gi, rod, ri) {
                    final h = group.x.toInt();
                    final label = h < 12 ? '$h AM' : '${h - 12} PM';
                    return BarTooltipItem(
                      '$label\n$currency${rod.toY.toStringAsFixed(0)}',
                      const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Payment Split Donut ──────────────────────────────────────────────────────

class _PaymentDonut extends StatelessWidget {
  final double cash;
  final double online;
  final String currency;

  const _PaymentDonut({
    required this.cash,
    required this.online,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final total = cash + online;
    if (total == 0) return const SizedBox.shrink();

    return SizedBox(
      height: 140,
      child: Stack(
        alignment: Alignment.center,
        children: [
          PieChart(
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 44,
              startDegreeOffset: -90,
              sections: [
                PieChartSectionData(
                  value: cash,
                  color: AppColors.green,
                  radius: 22,
                  showTitle: false,
                ),
                PieChartSectionData(
                  value: online,
                  color: AppColors.blue,
                  radius: 22,
                  showTitle: false,
                ),
              ],
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$currency${total.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                'total',
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.white.withValues(alpha: 0.4),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Top Selling Dishes Chart ─────────────────────────────────────────────────

class _TopSellingChart extends StatelessWidget {
  final List<Map<String, dynamic>> topItems;
  final String currency;

  const _TopSellingChart({required this.topItems, required this.currency});

  @override
  Widget build(BuildContext context) {
    if (topItems.isEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Container(
          height: 100,
          decoration: BoxDecoration(
            color: const Color(0x10FFFFFF),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: const Center(
            child: Text(
              'No sales data yet',
              style: TextStyle(color: Colors.white38, fontSize: 13),
            ),
          ),
        ),
      );
    }

    final maxQty = topItems
        .map((e) => (e['qty'] as num).toDouble())
        .reduce((a, b) => a > b ? a : b)
        .clamp(1.0, double.infinity);

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
          decoration: BoxDecoration(
            color: const Color(0x18FFFFFF),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Column(
            children: topItems.asMap().entries.map((entry) {
              final i = entry.key;
              final item = entry.value;
              final name = item['name'] as String? ?? '—';
              final qty = (item['qty'] as num).toDouble();
              final revenue = (item['revenue'] as num).toDouble();
              final fraction = qty / maxQty;
              final colors = [
                [AppColors.orange, AppColors.red],
                [AppColors.blue, const Color(0xFF6B21A8)],
                [AppColors.green, AppColors.greenDark],
                [AppColors.amber, AppColors.orange],
                [const Color(0xFF8B5CF6), const Color(0xFF6B21A8)],
              ];
              final c = colors[i % colors.length];
              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          '${qty.toInt()} sold · $currency${revenue.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    LayoutBuilder(
                      builder: (_, constraints) => ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Stack(
                          children: [
                            Container(
                              height: 8,
                              width: constraints.maxWidth,
                              color: const Color(0x18FFFFFF),
                            ),
                            AnimatedContainer(
                              duration: Duration(milliseconds: 400 + i * 80),
                              curve: Curves.easeOutCubic,
                              height: 8,
                              width: constraints.maxWidth * fraction,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(colors: c),
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

// ─── AI Revenue Prediction Card ───────────────────────────────────────────────

class _AiPredictionCard extends StatelessWidget {
  final List<num> weeklyAvg;
  final num todayRevenue;
  final num yesterdayRevenue;
  final String currency;

  const _AiPredictionCard({
    required this.weeklyAvg,
    required this.todayRevenue,
    required this.yesterdayRevenue,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    // Predict tomorrow based on day-of-week average
    final tomorrow = (DateTime.now().weekday % 7); // 0=Sun..6=Sat
    final prediction = weeklyAvg.isNotEmpty && weeklyAvg.length > tomorrow
        ? weeklyAvg[tomorrow].toDouble()
        : 0.0;

    // Confidence based on data richness
    final hasData = weeklyAvg.any((v) => v > 0);
    final confidence = hasData ? 76 : 0;

    // Today vs yesterday
    final deltaSign = todayRevenue >= yesterdayRevenue ? '+' : '';
    final delta = todayRevenue - yesterdayRevenue;
    final deltaColor = delta >= 0 ? AppColors.green : AppColors.danger;

    // Peak hour prediction (simple heuristic)
    const peakHours = '7pm – 9pm';

    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.orange.withValues(alpha: 0.12),
                AppColors.red.withValues(alpha: 0.06),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.orange.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.orange.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.orange.withValues(alpha: 0.4),
                      ),
                    ),
                    child: const Text(
                      'AI · 7-day model',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.orange,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (yesterdayRevenue > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: deltaColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$deltaSign$currency${delta.abs().toStringAsFixed(0)} vs yesterday',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: deltaColor,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              if (!hasData)
                Text(
                  'Not enough data yet — predictions improve after 7 days of sales.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.4),
                    fontSize: 13,
                  ),
                )
              else ...[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Est. Tomorrow',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white.withValues(alpha: 0.55),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '$currency${prediction.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                        color: AppColors.orange,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Confidence bar
                Row(
                  children: [
                    Text(
                      'Confidence',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.45),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '$confidence%',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: confidence / 100,
                    backgroundColor: const Color(0x18FFFFFF),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      confidence > 70 ? AppColors.green : AppColors.amber,
                    ),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    const Icon(
                      Icons.local_fire_department,
                      size: 14,
                      color: AppColors.amber,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'Predicted peak: $peakHours',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.55),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
