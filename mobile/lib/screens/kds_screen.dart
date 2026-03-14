import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/order.dart';
import '../providers/pos_provider.dart';
import '../services/socket_service.dart';
import '../utils/app_colors.dart';

/// Kitchen Display System Screen
/// Shows PENDING orders sorted by age (oldest first).
/// Orders glow red when over 10 minutes old.
/// Swipe right to mark an order as done (PAID/served).
class KDSScreen extends StatefulWidget {
  const KDSScreen({super.key});

  @override
  State<KDSScreen> createState() => _KDSScreenState();
}

class _KDSScreenState extends State<KDSScreen> {
  final ApiService _api = ApiService();
  List<Order> _orders = [];
  bool _isLoading = true;
  StreamSubscription? _socketSub;
  Timer? _clockTimer;

  @override
  void initState() {
    super.initState();
    _loadOrders();
    
    // Listen for real-time order updates
    _socketSub = SocketService().eventStream.listen((event) {
      if (event['event'] == SocketEvent.orderUpdated) {
        if (mounted) _loadOrders(silent: true);
      }
    });

    // Redraw timers every 30 seconds
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

  Future<void> _loadOrders({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    try {
      final all = await _api.fetchOrders();
      if (!mounted) return;
      setState(() {
        // Only PENDING orders on KDS
        _orders = all.where((o) => o.status == 'PENDING').toList()
          ..sort(
            (a, b) => DateTime.parse(
              a.createdAt,
            ).compareTo(DateTime.parse(b.createdAt)),
          );
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _markDone(Order order) async {
    HapticFeedback.mediumImpact();
    try {
      await _api.updateOrderStatus(order.id, 'PAID');
      if (!mounted) return;
      setState(() => _orders.removeWhere((o) => o.id == order.id));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order #${order.id} marked done ✓'),
          backgroundColor: AppColors.green,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
  }

  Color _ageColor(DateTime created) {
    final mins = DateTime.now().difference(created).inMinutes;
    if (mins < 5) return AppColors.green;
    if (mins < 10) return AppColors.amber;
    return AppColors.danger;
  }

  String _elapsed(DateTime created) {
    final diff = DateTime.now().difference(created);
    if (diff.inMinutes < 1) return '< 1 min';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min';
    return '${diff.inHours}h ${diff.inMinutes.remainder(60)}m';
  }

  @override
  Widget build(BuildContext context) {
    final currency =
        Provider.of<PosProvider>(
          context,
          listen: false,
        ).settings['currencySymbol'] ??
        '₹';

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // ── Glass large-title app bar ───────────────────────────────
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            backgroundColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              centerTitle: false,
              titlePadding: const EdgeInsets.only(left: 20, bottom: 14),
              title: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    'Kitchen',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(width: 10),
                  if (_orders.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(bottom: 3),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppColors.danger.withValues(alpha: 0.5),
                        ),
                      ),
                      child: Text(
                        '${_orders.length} active',
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
              background: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xAA000000), Color(0x00000000)],
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
                onPressed: _loadOrders,
              ),
            ],
          ),

          if (_isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_orders.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.check_circle_outline_rounded,
                      size: 72,
                      color: AppColors.green.withValues(alpha: 0.4),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'All caught up!',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'No pending kitchen orders',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.4),
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  final order = _orders[index];
                  final created = DateTime.parse(order.createdAt);
                  final ageColor = _ageColor(created);
                  return _KDSCard(
                    order: order,
                    ageColor: ageColor,
                    elapsed: _elapsed(created),
                    currency: currency,
                    onDone: () => _markDone(order),
                  );
                }, childCount: _orders.length),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── KDS Order Card ───────────────────────────────────────────────────────────

class _KDSCard extends StatefulWidget {
  final Order order;
  final Color ageColor;
  final String elapsed;
  final String currency;
  final VoidCallback onDone;

  const _KDSCard({
    required this.order,
    required this.ageColor,
    required this.elapsed,
    required this.currency,
    required this.onDone,
  });

  @override
  State<_KDSCard> createState() => _KDSCardState();
}

class _KDSCardState extends State<_KDSCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _swipeController;
  double _dragDx = 0;
  bool _isDone = false;

  @override
  void initState() {
    super.initState();
    _swipeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );
  }

  @override
  void dispose() {
    _swipeController.dispose();
    super.dispose();
  }

  void _handleDragEnd(DragEndDetails details) {
    if (_dragDx > 100) {
      setState(() => _isDone = true);
      Future.delayed(const Duration(milliseconds: 350), widget.onDone);
    } else {
      setState(() => _dragDx = 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 300),
      opacity: _isDone ? 0 : 1,
      child: GestureDetector(
        onHorizontalDragUpdate: (d) {
          if (d.delta.dx > 0) {
            setState(() => _dragDx = (_dragDx + d.delta.dx).clamp(0, 140));
          }
        },
        onHorizontalDragEnd: _handleDragEnd,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 80),
          transform: Matrix4.translationValues(_isDone ? 400 : _dragDx, 0, 0),
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: const Color(0x10FFFFFF),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: widget.ageColor.withValues(alpha: 0.4),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.ageColor.withValues(alpha: 0.15),
                blurRadius: 16,
                spreadRadius: 0,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header bar ───────────────────────────────────────
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: widget.ageColor.withValues(alpha: 0.12),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(20),
                  ),
                ),
                child: Row(
                  children: [
                    // Table badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: widget.ageColor.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'TABLE ${widget.order.tableNumber}',
                        style: TextStyle(
                          color: widget.ageColor,
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Order #${widget.order.id}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    const Spacer(),
                    // Timer
                    Row(
                      children: [
                        Icon(
                          Icons.timer_outlined,
                          size: 14,
                          color: widget.ageColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          widget.elapsed,
                          style: TextStyle(
                            color: widget.ageColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // ── Items list ───────────────────────────────────────
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: widget.order.items.map((item) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
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
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              item.name,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),

              // ── Swipe hint / Done button ─────────────────────────
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: const Color(0x08FFFFFF),
                  borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(20),
                  ),
                ),
                child: Row(
                  children: [
                    AnimatedOpacity(
                      opacity: _dragDx > 20 ? (_dragDx / 100).clamp(0, 1) : 0.4,
                      duration: const Duration(milliseconds: 100),
                      child: Row(
                        children: [
                          Icon(
                            Icons.check_circle_rounded,
                            color: AppColors.green,
                            size: _dragDx > 20 ? 22 : 16,
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'Swipe right — Done',
                            style: TextStyle(
                              color: AppColors.green,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: widget.onDone,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(
                            0xFF22C55E,
                          ).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: const Color(
                              0xFF22C55E,
                            ).withValues(alpha: 0.4),
                          ),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.check_rounded,
                              color: AppColors.green,
                              size: 15,
                            ),
                            SizedBox(width: 4),
                            Text(
                              'Done',
                              style: TextStyle(
                                color: AppColors.green,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
