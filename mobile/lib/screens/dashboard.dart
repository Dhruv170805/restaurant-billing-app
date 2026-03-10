import 'dart:ui';

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
      if (!mounted) return;
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
    final currency =
        Provider.of<PosProvider>(context).settings['currencySymbol'] ?? '₹';
    final tableCount = (settings['tableCount'] ?? 10) as int;
    final occupiedCount = activeOrders.map((o) => o.tableNumber).toSet().length;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Large title App Bar (iOS 26-style)
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            stretch: true,
            backgroundColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              centerTitle: false,
              titlePadding: const EdgeInsets.only(left: 20, bottom: 14),
              title: const Text(
                'Tables',
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
              // Stats Pill
              Container(
                margin: const EdgeInsets.only(right: 12, top: 6, bottom: 6),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: const Color(0x22FFFFFF),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0x33FFFFFF)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.circle, color: Color(0xFFFF6B00), size: 8),
                    const SizedBox(width: 6),
                    Text(
                      '$occupiedCount/$tableCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: loadDashboard,
                tooltip: 'Refresh',
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
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 1.1,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                ),
                delegate: SliverChildBuilderDelegate((context, index) {
                  final tableNumber = index + 1;
                  final tableOrder = activeOrders
                      .where((o) => o.tableNumber == tableNumber)
                      .firstOrNull;
                  final isOccupied = tableOrder != null;
                  return _buildTableCard(
                    context,
                    tableNumber,
                    tableOrder,
                    isOccupied,
                    currency,
                  );
                }, childCount: tableCount),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTableCard(
    BuildContext context,
    int tableNumber,
    Order? tableOrder,
    bool isOccupied,
    String currency,
  ) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                POSScreen(tableNumber: tableNumber, orderId: tableOrder?.id),
          ),
        ).then((_) => loadDashboard());
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            decoration: BoxDecoration(
              gradient: isOccupied
                  ? const LinearGradient(
                      colors: [Color(0xFFFF6B00), Color(0xFFE61C24)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              color: isOccupied ? null : const Color(0x16FFFFFF),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isOccupied
                    ? const Color(0x44FFFFFF)
                    : const Color(0x28FFFFFF),
                width: 0.5,
              ),
              boxShadow: isOccupied
                  ? [
                      const BoxShadow(
                        color: Color(0x55FF6B00),
                        blurRadius: 20,
                        offset: Offset(0, 6),
                      ),
                    ]
                  : null,
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isOccupied
                              ? const Color(0x33FFFFFF)
                              : const Color(0x22FFFFFF),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          isOccupied
                              ? Icons.dining_rounded
                              : Icons.table_restaurant_outlined,
                          size: 20,
                          color: Colors.white,
                        ),
                      ),
                      const Spacer(),
                      if (isOccupied)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Color(0xFFFFFF00),
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    'Table $tableNumber',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 18,
                      color: Colors.white,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (isOccupied && tableOrder != null) ...[
                    Text(
                      '$currency${tableOrder.total.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 20,
                        color: Colors.white,
                      ),
                    ),
                  ] else
                    Text(
                      'Available',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.5),
                        fontSize: 13,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
