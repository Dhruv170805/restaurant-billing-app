import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../providers/pos_provider.dart';

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

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      elevation: 4,
      color: const Color(0xFF111111),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: color.withOpacity(0.5), width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 36, color: color),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.white70,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 22,
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _launchWhatsApp(
    String? phone,
    String orderId,
    double total,
    String? customerName,
  ) async {
    if (phone == null || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No phone number provided for this customer.'),
        ),
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
        '\$';
    final amount = total.toStringAsFixed(2);

    final message =
        'Hello $name,\n\nThis is a friendly reminder regarding your unpaid bill of $currency$amount for Order #$orderId.\n\nPlease arrange a settlement at your earliest convenience. Thank you!';
    final url = Uri.parse(
      'https://wa.me/$cleanPhone?text=${Uri.encodeComponent(message)}',
    );

    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not launch WhatsApp.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final currency =
        Provider.of<PosProvider>(context).settings['currencySymbol'] ?? '\$';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: loadStats),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: loadStats,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Text(
                    'Revenue Overview',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    childAspectRatio: 1.1,
                    children: [
                      _buildStatCard(
                        'Today\'s Revenue',
                        '$currency${(stats['todayRevenue'] ?? 0).toStringAsFixed(2)}',
                        Icons.attach_money,
                        const Color(0xFFF37C22),
                      ),
                      _buildStatCard(
                        'Monthly Revenue',
                        '$currency${(stats['monthlyRevenue'] ?? 0).toStringAsFixed(2)}',
                        Icons.insights,
                        Colors.blue,
                      ),
                      _buildStatCard(
                        'Pending Orders',
                        '${stats['pendingOrders'] ?? 0}',
                        Icons.dining,
                        Colors.orange,
                      ),
                      _buildStatCard(
                        'Unpaid Dues',
                        '$currency${(stats['unpaidRevenue'] ?? 0).toStringAsFixed(2)}',
                        Icons.warning_amber_rounded,
                        Colors.red,
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),
                  Text(
                    'Payment Breakdown',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    color: const Color(0xFF111111),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              const Text(
                                'Cash',
                                style: TextStyle(color: Colors.white54),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$currency${(stats['cashRevenue'] ?? 0).toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            width: 1,
                            height: 40,
                            color: Colors.white24,
                          ),
                          Column(
                            children: [
                              const Text(
                                'Online',
                                style: TextStyle(color: Colors.white54),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$currency${(stats['onlineRevenue'] ?? 0).toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blueAccent,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),
                  Text(
                    '📓 Unpaid Bills',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.redAccent,
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (stats['unpaidOrders'] == null ||
                      (stats['unpaidOrders'] as List).isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32.0),
                        child: Text(
                          'No unpaid bills! 🎉',
                          style: TextStyle(color: Colors.white54),
                        ),
                      ),
                    )
                  else
                    ...((stats['unpaidOrders'] as List).map((order) {
                      final total = (order['total'] ?? 0).toDouble();
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        color: const Color(0xFF1A1A1A),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(
                            color: Colors.redAccent,
                            width: 1,
                          ),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          title: Text(
                            'Order #${order['id']} - ${order['customerName'] ?? 'Unknown'}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            '${order['customerPhone'] ?? 'No Phone'}\n$currency${total.toStringAsFixed(2)}',
                            style: const TextStyle(color: Colors.white70),
                          ),
                          isThreeLine: true,
                          trailing: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                            ),
                            icon: const Icon(Icons.chat),
                            label: const Text('WhatsApp'),
                            onPressed: () => _launchWhatsApp(
                              order['customerPhone'],
                              order['id'].toString(),
                              total,
                              order['customerName'],
                            ),
                          ),
                        ),
                      );
                    }).toList()),
                ],
              ),
            ),
    );
  }
}
