import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';
import '../models/order.dart';
import '../utils/pdf_generator.dart';
import '../services/api_service.dart';
import '../models/menu_item.dart';
import '../providers/pos_provider.dart';
import '../utils/app_colors.dart';

class POSScreen extends StatefulWidget {
  final int tableNumber;
  final int? orderId;

  const POSScreen({super.key, required this.tableNumber, this.orderId});

  @override
  State<POSScreen> createState() => _POSScreenState();
}

class _POSScreenState extends State<POSScreen> {
  final ApiService api = ApiService();
  bool isLoading = true;
  List<MenuItem> menuItems = [];
  bool isCheckingOut = false;
  String selectedCategory = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<PosProvider>(context, listen: false).clearCart();
      loadMenu();
    });
  }

  Future<void> loadMenu() async {
    try {
      final items = await api.fetchMenuItems();
      if (!mounted) return;
      setState(() {
        menuItems = items;
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => isLoading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to load menu: $e')));
    }
  }

  // ─── Native direct print (no in-app preview) ──────────────────────────────
  Future<void> _nativePrintKot(
    Order order,
    Map<String, dynamic> settings,
  ) async {
    try {
      final itemsToPrint = order.items
          .where((i) => i.quantity > i.printedQuantity)
          .toList();

      if (itemsToPrint.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No new items to print')),
          );
        }
        return;
      }

      final doc = await PdfGenerator.generateKOT(order, settings);
      final bool printJobStarted = await Printing.layoutPdf(
        onLayout: (format) => doc.save(),
      );

      if (printJobStarted) {
        // Mark as printed on server
        await api.markKOTPrinted(order.id);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Print KOT failed: $e')));
      }
    }
  }

  Future<void> _nativePrintBill(
    Order order,
    Map<String, dynamic> settings,
  ) async {
    try {
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

  // ─── Checkout ──────────────────────────────────────────────────────────────
  Future<void> checkout(PosProvider pos) async {
    if (pos.cart.isEmpty || isCheckingOut) return;
    final currencySymbol = pos.settings['currencySymbol'] ?? '₹';

    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Confirm Order'),
        content: Text(
          'Place order for $currencySymbol${pos.total.toStringAsFixed(2)}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text('Confirm'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => isCheckingOut = true);

    try {
      final orderData = {
        'tableNumber': widget.tableNumber,
        'orderId': widget.orderId,
        'total': pos.total,
        'items': pos.cart
            .map(
              (c) => {
                'id': c.menuItem.id,
                'name': c.menuItem.name,
                'price': c.menuItem.price,
                'quantity': c.quantity,
              },
            )
            .toList(),
      };

      final newOrder = await api.createOrder(orderData);
      if (!mounted) return;
      pos.clearCart();
      HapticFeedback.mediumImpact();

      if (context.mounted) {
        Navigator.of(context).pop(); // Close cart bottom sheet if open
      }

      _showSuccessOverlay(newOrder, pos);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Checkout Error: $e')));
    } finally {
      if (mounted) setState(() => isCheckingOut = false);
    }
  }

  // ─── Payment Success Overlay ────────────────────────────────────────────────
  void _showSuccessOverlay(Order newOrder, PosProvider pos) {
    if (!mounted) return;
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withValues(alpha: 0.7),
      transitionDuration: const Duration(milliseconds: 400),
      transitionBuilder: (ctx, anim, _, child) {
        return FadeTransition(
          opacity: anim,
          child: ScaleTransition(
            scale: Tween(
              begin: 0.85,
              end: 1.0,
            ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutBack)),
            child: child,
          ),
        );
      },
      pageBuilder: (ctx, anim1, anim2) {
        final currency = pos.settings['currencySymbol'] ?? '₹';
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Material(
            color: Colors.transparent,
            child: Center(
              child: Container(
                margin: EdgeInsets.symmetric(horizontal: 32),
                padding: EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: const Color(0xF00A0A0F),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0x25FFFFFF)),
                  boxShadow: const [
                    BoxShadow(color: Color(0x66000000), blurRadius: 40),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Animated checkmark
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0.0, end: 1.0),
                      duration: const Duration(milliseconds: 600),
                      curve: Curves.elasticOut,
                      builder: (context, val, _) => Transform.scale(
                        scale: val,
                        child: Container(
                          width: 86,
                          height: 86,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [AppColors.green, AppColors.greenDark],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(
                                  0xFF22C55E,
                                ).withValues(alpha: 0.4),
                                blurRadius: 24,
                                spreadRadius: 4,
                              ),
                            ],
                          ),
                          child: Icon(
                            Icons.check_rounded,
                            color:
                                (Theme.of(context).textTheme.bodyLarge?.color ??
                                Colors.grey),
                            size: 46,
                          ),
                        ),
                      ),
                    ),
                    SizedBox(height: 20),
                    Text(
                      widget.orderId != null ? 'Items Added!' : 'Order Placed!',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Order #${newOrder.id} · Table ${widget.tableNumber}',
                      style: TextStyle(
                        color: Theme.of(
                          context,
                        ).textTheme.bodyLarge?.color?.withValues(alpha: 0.5),
                        fontSize: 14,
                      ),
                    ),
                    SizedBox(height: 16),
                    // Total amount pill
                    Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.orange, AppColors.red],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        '$currency${newOrder.total.toStringAsFixed(2)}',
                        style: TextStyle(
                          color:
                              (Theme.of(context).textTheme.bodyLarge?.color ??
                              Colors.grey),
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    SizedBox(height: 24),
                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: _PosActionBtn(
                            label: 'Print KOT',
                            icon: Icons.receipt_outlined,
                            color:
                                (Theme.of(context).textTheme.bodyLarge?.color ??
                                Colors.grey),
                            onTap: () =>
                                _nativePrintKot(newOrder, pos.settings),
                          ),
                        ),
                        SizedBox(width: 10),
                        Expanded(
                          child: _PosActionBtn(
                            label: 'Print Bill',
                            icon: Icons.print_rounded,
                            color: AppColors.green,
                            onTap: () =>
                                _nativePrintBill(newOrder, pos.settings),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: TextButton(
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          if (mounted) Navigator.of(context).pop();
                        },
                        child: Text(
                          'Done',
                          style: TextStyle(
                            color: Theme.of(context).textTheme.bodyLarge?.color
                                ?.withValues(alpha: 0.5),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // ─── Portrait: Cart Bottom Sheet ────────────────────────────────────────────
  void _showCartSheet(PosProvider pos) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CartBottomSheet(
        pos: pos,
        onCheckout: () => checkout(pos),
        isCheckingOut: isCheckingOut,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencySymbol =
        Provider.of<PosProvider>(context).settings['currencySymbol'] ?? '₹';

    final Set<String> categories = {'All'};
    for (var item in menuItems) {
      categories.add(item.category);
    }

    final filteredItems = selectedCategory == 'All'
        ? menuItems
        : menuItems.where((i) => i.category == selectedCategory).toList();

    return Scaffold(
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        title: Text(
          'Table ${widget.tableNumber}${widget.orderId != null ? " (#${widget.orderId})" : ""}',
        ),
        backgroundColor:
            Theme.of(context).cardTheme.color?.withValues(alpha: 0.8) ??
            Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.8),
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(color: Colors.transparent),
          ),
        ),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isPortrait = constraints.maxWidth < 600;

          if (isPortrait) {
            return _buildPortraitLayout(
              currencySymbol,
              categories,
              filteredItems,
            );
          } else {
            return _buildLandscapeLayout(
              currencySymbol,
              categories,
              filteredItems,
            );
          }
        },
      ),
    );
  }

  // ─── PORTRAIT: Full-screen menu + floating cart bar ───────────────────────
  Widget _buildPortraitLayout(
    String currencySymbol,
    Set<String> categories,
    List<MenuItem> filteredItems,
  ) {
    return Stack(
      children: [
        // Menu fills full screen
        Column(
          children: [
            // Category chips
            SizedBox(
              height: 56,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: categories.length,
                itemBuilder: (context, index) {
                  final cat = categories.elementAt(index);
                  final isSelected = cat == selectedCategory;
                  return Padding(
                    padding: EdgeInsets.only(right: 8.0),
                    child: FilterChip(
                      label: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.white60,
                          fontSize: 12,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: AppColors.orangeAlt,
                      backgroundColor: Theme.of(context).dividerColor,
                      checkmarkColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(color: Theme.of(context).dividerColor),
                      ),
                      onSelected: (_) => setState(() => selectedCategory = cat),
                    ),
                  );
                },
              ),
            ),
            // Menu grid
            Expanded(
              child: isLoading
                  ? Center(child: CircularProgressIndicator())
                  : GridView.builder(
                      padding: EdgeInsets.fromLTRB(12, 4, 12, 120),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 0.85,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                      itemCount: filteredItems.length,
                      itemBuilder: (context, index) => RepaintBoundary(
                        child: _menuCard(filteredItems[index], currencySymbol),
                      ),
                    ),
            ),
          ],
        ),

        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Selector<PosProvider, ({int count, double total})>(
            selector: (_, pos) => (
              count: pos.cart.fold<int>(0, (sum, i) => sum + i.quantity),
              total: pos.total,
            ),
            builder: (context, cartSummary, _) {
              if (cartSummary.count == 0) return SizedBox.shrink();
              return RepaintBoundary(
                child: _FloatingCartBar(
                  itemCount: cartSummary.count,
                  total: cartSummary.total,
                  currencySymbol: currencySymbol,
                  onTap: () => _showCartSheet(
                    Provider.of<PosProvider>(context, listen: false),
                  ),
                  isCheckingOut: isCheckingOut,
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ─── LANDSCAPE: Side-by-side menu + cart ─────────────────────────────────
  Widget _buildLandscapeLayout(
    String currencySymbol,
    Set<String> categories,
    List<MenuItem> filteredItems,
  ) {
    return Row(
      children: [
        // Left: Menu
        Expanded(
          flex: 2,
          child: isLoading
              ? Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    SizedBox(
                      height: 56,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        itemCount: categories.length,
                        itemBuilder: (context, index) {
                          final cat = categories.elementAt(index);
                          final isSelected = cat == selectedCategory;
                          return Padding(
                            padding: EdgeInsets.only(right: 8.0),
                            child: FilterChip(
                              label: Text(
                                cat,
                                style: TextStyle(
                                  color: isSelected
                                      ? Colors.white
                                      : Colors.white60,
                                  fontSize: 12,
                                ),
                              ),
                              selected: isSelected,
                              selectedColor: AppColors.orangeAlt,
                              backgroundColor: Theme.of(context).dividerColor,
                              checkmarkColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                                side: BorderSide(
                                  color: Theme.of(context).dividerColor,
                                ),
                              ),
                              onSelected: (_) =>
                                  setState(() => selectedCategory = cat),
                            ),
                          );
                        },
                      ),
                    ),
                    Expanded(
                      child: GridView.builder(
                        padding: EdgeInsets.all(12),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              childAspectRatio: 0.85,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                            ),
                        itemCount: filteredItems.length,
                        itemBuilder: (context, index) => RepaintBoundary(
                          child: _menuCard(
                            filteredItems[index],
                            currencySymbol,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
        ),
        // Right: Cart panel
        _LandscapeCartPanel(
          onCheckout: (pos) => checkout(pos),
          isCheckingOut: isCheckingOut,
        ),
      ],
    );
  }

  Widget _menuCard(MenuItem item, String currencySymbol) {
    return GestureDetector(
      onTap: () {
        Provider.of<PosProvider>(context, listen: false).addToCart(item);
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            padding: EdgeInsets.all(8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Expanded(
                  child: Center(
                    child: Text(
                      item.name,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color:
                            (Theme.of(context).textTheme.bodyLarge?.color ??
                            Colors.grey),
                        letterSpacing: -0.2,
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                SizedBox(height: 4),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.orangeAlt, AppColors.redAlt],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$currencySymbol${item.price.toStringAsFixed(2)}',
                    style: TextStyle(
                      color:
                          (Theme.of(context).textTheme.bodyLarge?.color ??
                          Colors.grey),
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Floating Cart Bar (portrait) ─────────────────────────────────────────────
class _FloatingCartBar extends StatelessWidget {
  final int itemCount;
  final double total;
  final String currencySymbol;
  final VoidCallback onTap;
  final bool isCheckingOut;

  const _FloatingCartBar({
    required this.itemCount,
    required this.total,
    required this.currencySymbol,
    required this.onTap,
    required this.isCheckingOut,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          8,
          16,
          MediaQuery.of(context).padding.bottom + 12,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.orangeAlt, AppColors.redAlt],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x60FF6B00),
                    blurRadius: 20,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).textTheme.bodyLarge?.color?.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$itemCount item${itemCount != 1 ? 's' : ''}',
                      style: TextStyle(
                        color:
                            (Theme.of(context).textTheme.bodyLarge?.color ??
                            Colors.grey),
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  SizedBox(width: 12),
                  Text(
                    'View Cart',
                    style: TextStyle(
                      color:
                          (Theme.of(context).textTheme.bodyLarge?.color ??
                          Colors.grey),
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '$currencySymbol${total.toStringAsFixed(2)}',
                    style: TextStyle(
                      color:
                          (Theme.of(context).textTheme.bodyLarge?.color ??
                          Colors.grey),
                      fontWeight: FontWeight.w800,
                      fontSize: 17,
                    ),
                  ),
                  SizedBox(width: 6),
                  Icon(
                    Icons.expand_less_rounded,
                    color:
                        (Theme.of(context).textTheme.bodyLarge?.color ??
                        Colors.grey),
                    size: 20,
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

// ─── Cart Bottom Sheet (portrait) ─────────────────────────────────────────────
class _CartBottomSheet extends StatelessWidget {
  final PosProvider pos;
  final VoidCallback onCheckout;
  final bool isCheckingOut;

  const _CartBottomSheet({
    required this.pos,
    required this.onCheckout,
    required this.isCheckingOut,
  });

  @override
  Widget build(BuildContext context) {
    final currency = pos.settings['currencySymbol'] ?? '₹';
    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (context, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
            child: Container(
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Theme.of(context).scaffoldBackgroundColor.withAlpha(240)
                    : Colors.white.withValues(alpha: 0.95),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
                border: Border(
                  top: BorderSide(
                    color: Theme.of(context).dividerColor,
                    width: 0.5,
                  ),
                ),
              ),
              child: Column(
                children: [
                  // Handle
                  Container(
                    margin: EdgeInsets.only(top: 12, bottom: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Theme.of(context).dividerColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  // Header
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      children: [
                        Text(
                          'Cart Items',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        SizedBox(width: 8),
                        Selector<PosProvider, int>(
                          selector: (_, p) => p.cart.length,
                          builder: (context, count, _) => Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0x33FF6B00),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$count',
                              style: TextStyle(
                                color: AppColors.orangeAlt,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                        const Spacer(),
                        Selector<PosProvider, bool>(
                          selector: (_, p) => p.cart.isNotEmpty,
                          builder: (context, isNotEmpty, _) => isNotEmpty
                              ? IconButton(
                                  icon: Icon(
                                    Icons.delete_outline,
                                    color: Colors.redAccent,
                                  ),
                                  onPressed: () {
                                    Provider.of<PosProvider>(
                                      context,
                                      listen: false,
                                    ).clearCart();
                                    Navigator.pop(context);
                                  },
                                )
                              : SizedBox.shrink(),
                        ),
                      ],
                    ),
                  ),
                  Divider(height: 1, color: Theme.of(context).dividerColor),
                  // Items
                  Expanded(
                    child: Selector<PosProvider, List<CartItem>>(
                      selector: (_, pos) => pos.cart,
                      shouldRebuild: (prev, next) => prev != next,
                      builder: (context, items, _) => ListView.builder(
                        controller: scrollController,
                        padding: EdgeInsets.symmetric(vertical: 8),
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          return RepaintBoundary(
                            child: _CartItemTile(
                              cartItem: items[index],
                              currency: currency,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  // Totals
                  Selector<
                    PosProvider,
                    ({double total, double tax, String taxLabel})
                  >(
                    selector: (_, pos) => (
                      total: pos.total,
                      tax: pos.taxAmount,
                      taxLabel: pos.settings['taxLabel'] ?? 'Tax',
                    ),
                    builder: (context, summary, _) => RepaintBoundary(
                      child: _CartTotals(
                        total: summary.total,
                        taxAmount: summary.tax,
                        taxLabel: summary.taxLabel,
                        currency: currency,
                        onCheckout: onCheckout,
                        isCheckingOut: isCheckingOut,
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
  }
}

class _CartItemTile extends StatelessWidget {
  final CartItem cartItem;
  final String currency;

  const _CartItemTile({required this.cartItem, required this.currency});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0x16FFFFFF),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    cartItem.menuItem.name,
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  SizedBox(height: 2),
                  Text(
                    '$currency${cartItem.total.toStringAsFixed(2)}',
                    style: TextStyle(
                      color: AppColors.orangeAlt,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            // Quantity stepper
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _stepperBtn(
                  icon: Icons.remove,
                  color: AppColors.dangerAlt,
                  onTap: () => Provider.of<PosProvider>(
                    context,
                    listen: false,
                  ).updateQuantity(cartItem.menuItem, -1),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    '${cartItem.quantity}',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
                _stepperBtn(
                  icon: Icons.add,
                  color: AppColors.greenAlt,
                  onTap: () => Provider.of<PosProvider>(
                    context,
                    listen: false,
                  ).updateQuantity(cartItem.menuItem, 1),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stepperBtn({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Icon(icon, size: 16, color: color),
      ),
    );
  }
}

class _CartTotals extends StatelessWidget {
  final double total;
  final double taxAmount;
  final String taxLabel;
  final String currency;
  final VoidCallback onCheckout;
  final bool isCheckingOut;
  final bool useSafeArea;

  const _CartTotals({
    required this.total,
    required this.taxAmount,
    required this.taxLabel,
    required this.currency,
    required this.onCheckout,
    required this.isCheckingOut,
    this.useSafeArea = true,
  });

  @override
  Widget build(BuildContext context) {
    final totals = _buildInner(context);
    return useSafeArea ? SafeArea(top: false, child: totals) : totals;
  }

  Widget _buildInner(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (taxAmount > 0) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  taxLabel,
                  style: TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                Text(
                  '$currency${taxAmount.toStringAsFixed(2)}',
                  style: TextStyle(fontSize: 13),
                ),
              ],
            ),
            SizedBox(height: 6),
          ],
          // Total bar
          Container(
            padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.orangeAlt, AppColors.redAlt],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x55FF6B00),
                  blurRadius: 16,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: GestureDetector(
              onTap: isCheckingOut ? null : onCheckout,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  isCheckingOut
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color:
                                (Theme.of(context).textTheme.bodyLarge?.color ??
                                Colors.grey),
                          ),
                        )
                      : Text(
                          'Place Order',
                          style: TextStyle(
                            color:
                                (Theme.of(context).textTheme.bodyLarge?.color ??
                                Colors.grey),
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                  Text(
                    '$currency${total.toStringAsFixed(2)}',
                    style: TextStyle(
                      color:
                          (Theme.of(context).textTheme.bodyLarge?.color ??
                          Colors.grey),
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Landscape Cart Panel ─────────────────────────────────────────────────────
class _LandscapeCartPanel extends StatelessWidget {
  final Function(PosProvider) onCheckout;
  final bool isCheckingOut;

  const _LandscapeCartPanel({
    required this.onCheckout,
    required this.isCheckingOut,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 260,
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            decoration: BoxDecoration(
              color: Color(0x55000000),
              border: Border(left: BorderSide(color: AppColors.borderMid)),
            ),
            child:
                Selector<
                  PosProvider,
                  ({
                    List<CartItem> items,
                    String currency,
                    double total,
                    double tax,
                    String taxLabel,
                  })
                >(
                  selector: (_, pos) => (
                    items: pos.cart,
                    currency: pos.settings['currencySymbol'] ?? '₹',
                    total: pos.total,
                    tax: pos.taxAmount,
                    taxLabel: pos.settings['taxLabel'] ?? 'Tax',
                  ),
                  builder: (context, data, _) => Column(
                    children: [
                      // Header
                      AppBar(
                        title: Text(
                          'Cart',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        backgroundColor: Colors.transparent,
                        elevation: 0,
                        automaticallyImplyLeading: false,
                        actions: [
                          if (data.items.isNotEmpty)
                            IconButton(
                              icon: Icon(
                                Icons.delete_outline,
                                color: Colors.redAccent,
                                size: 20,
                              ),
                              onPressed: () => Provider.of<PosProvider>(
                                context,
                                listen: false,
                              ).clearCart(),
                            ),
                        ],
                      ),
                      // Cart items
                      Expanded(
                        child: data.items.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.shopping_cart_outlined,
                                      size: 40,
                                      color: Theme.of(context)
                                          .textTheme
                                          .bodyLarge
                                          ?.color
                                          ?.withValues(alpha: 0.2),
                                    ),
                                    SizedBox(height: 8),
                                    Text(
                                      'Cart is empty',
                                      style: TextStyle(
                                        color: Theme.of(context)
                                            .textTheme
                                            .bodyLarge
                                            ?.color
                                            ?.withValues(alpha: 0.4),
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding: EdgeInsets.symmetric(vertical: 8),
                                itemCount: data.items.length,
                                itemBuilder: (context, index) {
                                  return RepaintBoundary(
                                    child: _CartItemTile(
                                      cartItem: data.items[index],
                                      currency: data.currency,
                                    ),
                                  );
                                },
                              ),
                      ),
                      // Totals
                      RepaintBoundary(
                        child: _CartTotals(
                          total: data.total,
                          taxAmount: data.tax,
                          taxLabel: data.taxLabel,
                          currency: data.currency,
                          onCheckout: () => onCheckout(
                            Provider.of<PosProvider>(context, listen: false),
                          ),
                          isCheckingOut: isCheckingOut,
                          useSafeArea: false,
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

// ─── Action button for success overlay ───────────────────────────────────────

class _PosActionBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _PosActionBtn({
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
        padding: EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: color.withValues(alpha: 0.35)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: color),
            SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
