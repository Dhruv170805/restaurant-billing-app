import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../providers/pos_provider.dart';
import 'pos_screen.dart';

class DashboardScreen extends StatefulWidget {
  final ApiService? api;

  const DashboardScreen({super.key, this.api});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final ApiService api;
  bool isLoading = true;
  List<Order> activeOrders = [];
  Map<String, dynamic> settings = {};

  @override
  void initState() {
    super.initState();
    api = widget.api ?? ApiService();
    loadDashboard();
  }

  Future<void> loadDashboard() async {
    setState(() => isLoading = true);
    try {
      final fetchedSettings = await api.fetchSettings();
      if (!mounted) return;
      Provider.of<PosProvider>(
        context,
        listen: false,
      ).setSettings(fetchedSettings);

      final fetchedOrders = await api.fetchOrders();
      setState(() {
        settings = fetchedSettings;
        activeOrders = fetchedOrders
            .where((o) => o.status == 'PENDING')
            .toList();
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => isLoading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error loading dashboard: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final currency =
        Provider.of<PosProvider>(context).settings['currencySymbol'] ?? '\$';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => isLoading = true);
              loadDashboard();
            },
          ),
        ],
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: settings['tableCount'] ?? 10,
        itemBuilder: (context, index) {
          final tableNumber = index + 1;

          final tableOrdersList = activeOrders
              .where((o) => o.tableNumber == tableNumber)
              .toList();
          final tableOrder = tableOrdersList.isNotEmpty
              ? tableOrdersList.first
              : null;

          final isOccupied = tableOrder != null;

          return Card(
            elevation: isOccupied ? 8 : 0,
            color: isOccupied ? Colors.transparent : const Color(0xFF111111),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: isOccupied
                  ? BorderSide.none
                  : const BorderSide(color: Color(0x12FFFFFF), width: 1),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => POSScreen(
                      tableNumber: tableNumber,
                      orderId: tableOrder?.id,
                    ),
                  ),
                ).then((_) {
                  setState(() => isLoading = true);
                  loadDashboard();
                });
              },
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: isOccupied
                      ? const LinearGradient(
                          colors: [Color(0xFFF37C22), Color(0xFFE61C24)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Table $tableNumber',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isOccupied ? 'Occupied' : 'Available',
                        style: const TextStyle(color: Colors.white70),
                      ),
                      if (isOccupied) ...[
                        const SizedBox(height: 8),
                        Text(
                          '$currency${tableOrder.total.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
