import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../providers/pos_provider.dart';
import 'pos_screen.dart';
import '../services/socket_service.dart';
import '../utils/app_colors.dart';

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
  StreamSubscription? _socketSub;
  Timer? _clockTimer;

  @override
  void initState() {
    super.initState();
    api = widget.api ?? ApiService();
    loadDashboard();
    
    // Listen for real-time updates
    _socketSub = SocketService().eventStream.listen((event) {
      if (mounted) loadDashboard(silent: true);
    });

    // Redraw timers every 30s so elapsed time updates
    _clockTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _socketSub?.cancel();
    _clockTimer?.cancel();
    super.dispose();
  }

  Future<void> loadDashboard({bool silent = false}) async {
    if (!silent) setState(() => isLoading = true);
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
      if (!silent) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  // ── Heatmap color based on order age ────────────────────────────────────────
  Color _heatColor(Order? order) {
    if (order == null) return Colors.transparent;
    final mins = DateTime.now()
        .difference(DateTime.parse(order.createdAt))
        .inMinutes;
    if (mins < 15) return AppColors.green; // green: fresh
    if (mins < 30) return AppColors.amber; // orange: aging
    return AppColors.danger; // red: needs attention
  }

  String _elapsed(Order order) {
    final diff = DateTime.now().difference(DateTime.parse(order.createdAt));
    final m = diff.inMinutes;
    if (m < 1) return '< 1 min';
    if (m < 60) return '$m min';
    return '${diff.inHours}h${diff.inMinutes.remainder(60)}m';
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
          // ── iOS 26-style large-title app bar ─────────────────────────
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
              // Occupancy pill
              Container(
                margin: const EdgeInsets.only(right: 8, top: 6, bottom: 6),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: const Color(0x22FFFFFF),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0x33FFFFFF)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.circle,
                      color: AppColors.orangeAlt,
                      size: 7,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      '$occupiedCount/$tableCount seats',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded),
                onPressed: loadDashboard,
              ),
            ],
          ),

          // ── Heatmap legend ─────────────────────────────────────────────
          if (!isLoading)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                child: Row(
                  children: [
                    _legendDot(AppColors.green, '< 15 min'),
                    const SizedBox(width: 14),
                    _legendDot(AppColors.amber, '15–30 min'),
                    const SizedBox(width: 14),
                    _legendDot(AppColors.danger, '30+ min'),
                    const Spacer(),
                    Icon(
                      Icons.circle_outlined,
                      size: 10,
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Available',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          if (isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 120),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 1.0,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                delegate: SliverChildBuilderDelegate((context, index) {
                  final tableNumber = index + 1;
                  final tableOrder = activeOrders
                      .where((o) => o.tableNumber == tableNumber)
                      .firstOrNull;
                  return _TableCard(
                    tableNumber: tableNumber,
                    order: tableOrder,
                    currency: currency,
                    heatColor: _heatColor(tableOrder),
                    elapsed: tableOrder != null ? _elapsed(tableOrder) : null,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => POSScreen(
                          tableNumber: tableNumber,
                          orderId: tableOrder?.id,
                        ),
                      ),
                    ).then((_) => loadDashboard()),
                    onQuickAction: (action) async {
                      if (action == 'pos') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => POSScreen(
                              tableNumber: tableNumber,
                              orderId: tableOrder?.id,
                            ),
                          ),
                        ).then((_) => loadDashboard());
                      } else if (action == 'settle' && tableOrder != null) {
                        await ApiService().updateOrderStatus(
                          tableOrder.id,
                          'PAID',
                        );
                        loadDashboard();
                      } else if (action == 'cancel' && tableOrder != null) {
                        await ApiService().updateOrderStatus(
                          tableOrder.id,
                          'CANCELLED',
                        );
                        loadDashboard();
                      }
                    },
                  );
                }, childCount: tableCount),
              ),
            ),
        ],
      ),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}

// ─── Table Card ───────────────────────────────────────────────────────────────

class _TableCard extends StatefulWidget {
  final int tableNumber;
  final Order? order;
  final String currency;
  final Color heatColor;
  final String? elapsed;
  final VoidCallback onTap;
  final Function(String action) onQuickAction;

  const _TableCard({
    required this.tableNumber,
    required this.order,
    required this.currency,
    required this.heatColor,
    required this.elapsed,
    required this.onTap,
    required this.onQuickAction,
  });

  @override
  State<_TableCard> createState() => _TableCardState();
}

class _TableCardState extends State<_TableCard>
    with SingleTickerProviderStateMixin {
  bool _pressed = false;

  bool get isOccupied => widget.order != null;

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final itemCount = order?.items.fold<int>(0, (s, i) => s + i.quantity) ?? 0;

    // ── heatmap glow color ─────────────────────────────────────────────
    final glowColor = isOccupied ? widget.heatColor : AppColors.green;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        widget.onTap();
      },
      onLongPress: () {
        HapticFeedback.mediumImpact();
        _showQuickActions(context);
      },
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.95 : 1.0,
        duration: const Duration(milliseconds: 80),
        curve: Curves.easeOut,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 400),
              decoration: BoxDecoration(
                // ── HEATMAP gradient based on age ─────────────────────
                gradient: isOccupied
                    ? LinearGradient(
                        colors: [
                          glowColor.withValues(alpha: 0.25),
                          glowColor.withValues(alpha: 0.08),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : const LinearGradient(
                        colors: [AppColors.borderSubtle, Color(0x08FFFFFF)],
                      ),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: isOccupied
                      ? glowColor.withValues(alpha: 0.45)
                      : const Color(0x20FFFFFF),
                  width: 0.8,
                ),
                boxShadow: isOccupied
                    ? [
                        BoxShadow(
                          color: glowColor.withValues(alpha: 0.20),
                          blurRadius: 18,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Icon row ────────────────────────────────────────
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          color: isOccupied
                              ? glowColor.withValues(alpha: 0.2)
                              : const Color(0x16FFFFFF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          isOccupied
                              ? Icons.dining_rounded
                              : Icons.table_restaurant_outlined,
                          size: 18,
                          color: isOccupied ? glowColor : Colors.white54,
                        ),
                      ),
                      const Spacer(),
                      // Status dot (pulsing if occupied)
                      if (isOccupied)
                        _PulsingDot(color: glowColor)
                      else
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),

                  const Spacer(),

                  // ── Table number ─────────────────────────────────────
                  Text(
                    'Table ${widget.tableNumber}',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 17,
                      color: Colors.white.withValues(alpha: 0.95),
                      letterSpacing: -0.3,
                    ),
                  ),

                  const SizedBox(height: 3),

                  // ── Amount / Available ───────────────────────────────
                  if (isOccupied && order != null) ...[
                    Text(
                      '${widget.currency}${order.total.toStringAsFixed(0)}',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 19,
                        color: glowColor,
                      ),
                    ),
                    const SizedBox(height: 2),
                    // Items count + elapsed time
                    Row(
                      children: [
                        Icon(
                          Icons.restaurant_outlined,
                          size: 10,
                          color: Colors.white.withValues(alpha: 0.45),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          '$itemCount item${itemCount == 1 ? '' : 's'}',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5),
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Icon(
                          Icons.timer_outlined,
                          size: 10,
                          color: Colors.white.withValues(alpha: 0.45),
                        ),
                        const SizedBox(width: 3),
                        Text(
                          widget.elapsed ?? '',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ] else
                    Text(
                      'Available',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.3),
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
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

  void _showQuickActions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
          child: Container(
            decoration: const BoxDecoration(
              color: Color(0xEE0A0A0A),
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(
                top: BorderSide(color: Color(0x22FFFFFF), width: 0.5),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Table ${widget.tableNumber}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 16),
                _QuickActionTile(
                  icon: Icons.add_circle_outline_rounded,
                  iconColor: AppColors.blue,
                  label: isOccupied ? 'Add / Edit Order' : 'New Order',
                  onTap: () {
                    Navigator.pop(context);
                    widget.onQuickAction('pos');
                  },
                ),
                if (isOccupied) ...[
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  _QuickActionTile(
                    icon: Icons.payments_rounded,
                    iconColor: AppColors.green,
                    label: 'Mark as Paid',
                    onTap: () {
                      Navigator.pop(context);
                      widget.onQuickAction('settle');
                    },
                  ),
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  _QuickActionTile(
                    icon: Icons.qr_code_rounded,
                    iconColor: AppColors.amber,
                    label: 'Show QR Code (Customer)',
                    onTap: () {
                      Navigator.pop(context);
                      _showQrDialog(context);
                    },
                  ),
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  _QuickActionTile(
                    icon: Icons.cancel_outlined,
                    iconColor: AppColors.danger,
                    label: 'Cancel Order',
                    onTap: () {
                      Navigator.pop(context);
                      widget.onQuickAction('cancel');
                    },
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showQrDialog(BuildContext context) {
    final orderId = widget.order?.id;
    final qrUrl =
        '${ApiService().webUrl}/orders/${orderId ?? widget.tableNumber}';
    showDialog(
      context: context,
      builder: (_) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Dialog(
          backgroundColor: Colors.transparent,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
              child: Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: const Color(0xF0101018),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Table ${widget.tableNumber}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                          color: Colors.white54,
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Let customer scan to view their order',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: QrImageView(
                        data: qrUrl,
                        version: QrVersions.auto,
                        size: 200,
                        eyeStyle: const QrEyeStyle(
                          eyeShape: QrEyeShape.square,
                          color: Color(0xFF0B0B0F),
                        ),
                        dataModuleStyle: const QrDataModuleStyle(
                          dataModuleShape: QrDataModuleShape.square,
                          color: Color(0xFF0B0B0F),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Order #${orderId ?? "–"}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.orange,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      qrUrl,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.3),
                        fontSize: 10,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final VoidCallback onTap;

  const _QuickActionTile({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(vertical: 2),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
      onTap: onTap,
    );
  }
}

// ─── Pulsing status dot ────────────────────────────────────────────────────────

class _PulsingDot extends StatefulWidget {
  final Color color;
  const _PulsingDot({required this.color});

  @override
  State<_PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<_PulsingDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _anim = Tween(
      begin: 0.4,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (context, _) => Container(
        width: 9,
        height: 9,
        decoration: BoxDecoration(
          color: widget.color.withValues(alpha: _anim.value),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: widget.color.withValues(alpha: _anim.value * 0.6),
              blurRadius: 8,
              spreadRadius: 2,
            ),
          ],
        ),
      ),
    );
  }
}
