import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';
import '../models/order.dart';
import '../utils/pdf_generator.dart';
import '../services/api_service.dart';
import '../models/menu_item.dart';
import '../providers/pos_provider.dart';

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
        title: const Text('Confirm Order'),
        content: Text(
          'Place order for $currencySymbol${pos.total.toStringAsFixed(2)}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Confirm'),
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

      if (context.mounted) {
        Navigator.of(context).pop(); // Close bottom sheet if open
      }

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: Text(
            widget.orderId != null ? 'Items Added' : 'Order Placed! 🎉',
          ),
          content: Text(
            widget.orderId != null
                ? 'Items added to Order #${newOrder.id}.'
                : 'Order #${newOrder.id} for Table ${widget.tableNumber}.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context);
              },
              child: const Text('Done'),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.print, size: 16),
              label: const Text('KOT'),
              onPressed: () => _nativePrintKot(newOrder, pos.settings),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.receipt, size: 16),
              label: const Text('Bill'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF30D158),
              ),
              onPressed: () => _nativePrintBill(newOrder, pos.settings),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Checkout Error: $e')));
    } finally {
      if (mounted) setState(() => isCheckingOut = false);
    }
  }

  // ─── Portrait: Cart Bottom Sheet ──────────────────────────────────────────
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
        backgroundColor: const Color(0xAA050505),
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
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                itemCount: categories.length,
                itemBuilder: (context, index) {
                  final cat = categories.elementAt(index);
                  final isSelected = cat == selectedCategory;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: FilterChip(
                      label: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.white60,
                          fontSize: 12,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: const Color(0xFFFF6B00),
                      backgroundColor: const Color(0x22FFFFFF),
                      checkmarkColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: const BorderSide(color: Color(0x33FFFFFF)),
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
                  ? const Center(child: CircularProgressIndicator())
                  : GridView.builder(
                      padding: const EdgeInsets.fromLTRB(12, 4, 12, 120),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 0.85,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                      itemCount: filteredItems.length,
                      itemBuilder: (context, index) =>
                          _menuCard(filteredItems[index], currencySymbol),
                    ),
            ),
          ],
        ),

        // Floating cart summary bar at bottom
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Consumer<PosProvider>(
            builder: (context, pos, _) {
              if (pos.cart.isEmpty) return const SizedBox.shrink();
              return _FloatingCartBar(
                pos: pos,
                currencySymbol: currencySymbol,
                onTap: () => _showCartSheet(pos),
                isCheckingOut: isCheckingOut,
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
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    SizedBox(
                      height: 56,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        itemCount: categories.length,
                        itemBuilder: (context, index) {
                          final cat = categories.elementAt(index);
                          final isSelected = cat == selectedCategory;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8.0),
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
                              selectedColor: const Color(0xFFFF6B00),
                              backgroundColor: const Color(0x22FFFFFF),
                              checkmarkColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                                side: const BorderSide(
                                  color: Color(0x33FFFFFF),
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
                        padding: const EdgeInsets.all(12),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              childAspectRatio: 0.85,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                            ),
                        itemCount: filteredItems.length,
                        itemBuilder: (context, index) =>
                            _menuCard(filteredItems[index], currencySymbol),
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
              color: const Color(0x18FFFFFF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0x28FFFFFF)),
            ),
            padding: const EdgeInsets.all(8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Expanded(
                  child: Center(
                    child: Text(
                      item.name,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                        color: Colors.white,
                        letterSpacing: -0.2,
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF6B00), Color(0xFFE61C24)],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$currencySymbol${item.price.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.white,
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
  final PosProvider pos;
  final String currencySymbol;
  final VoidCallback onTap;
  final bool isCheckingOut;

  const _FloatingCartBar({
    required this.pos,
    required this.currencySymbol,
    required this.onTap,
    required this.isCheckingOut,
  });

  @override
  Widget build(BuildContext context) {
    final itemCount = pos.cart.fold<int>(0, (sum, i) => sum + i.quantity);
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
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF6B00), Color(0xFFE61C24)],
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
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$itemCount item${itemCount != 1 ? 's' : ''}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'View Cart',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '$currencySymbol${pos.total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 17,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(
                    Icons.expand_less_rounded,
                    color: Colors.white,
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
              decoration: const BoxDecoration(
                color: Color(0xDD0A0A0A),
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
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
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        const Text(
                          'Cart',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0x33FF6B00),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${pos.cart.length}',
                            style: const TextStyle(
                              color: Color(0xFFFF6B00),
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const Spacer(),
                        if (pos.cart.isNotEmpty)
                          IconButton(
                            icon: const Icon(
                              Icons.delete_outline,
                              color: Colors.redAccent,
                            ),
                            onPressed: () {
                              pos.clearCart();
                              Navigator.pop(context);
                            },
                          ),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: Color(0x22FFFFFF)),
                  // Items
                  Expanded(
                    child: ListView.builder(
                      controller: scrollController,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: pos.cart.length,
                      itemBuilder: (context, index) {
                        final cartItem = pos.cart[index];
                        return _CartItemTile(
                          cartItem: cartItem,
                          pos: pos,
                          currency: currency,
                        );
                      },
                    ),
                  ),
                  // Totals
                  _CartTotals(
                    pos: pos,
                    currency: currency,
                    onCheckout: onCheckout,
                    isCheckingOut: isCheckingOut,
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
  final dynamic cartItem;
  final PosProvider pos;
  final String currency;

  const _CartItemTile({
    required this.cartItem,
    required this.pos,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0x16FFFFFF),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0x22FFFFFF)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    cartItem.menuItem.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$currency${cartItem.total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Color(0xFFFF6B00),
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
                  color: const Color(0xFFFF3B30),
                  onTap: () => pos.updateQuantity(cartItem.menuItem, -1),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    '${cartItem.quantity}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _stepperBtn(
                  icon: Icons.add,
                  color: const Color(0xFF30D158),
                  onTap: () => pos.updateQuantity(cartItem.menuItem, 1),
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
  final PosProvider pos;
  final String currency;
  final VoidCallback onCheckout;
  final bool isCheckingOut;
  final bool useSafeArea;

  const _CartTotals({
    required this.pos,
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
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (pos.taxAmount > 0) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  pos.settings['taxLabel'] ?? 'Tax',
                  style: const TextStyle(
                    color: Color(0xFF888888),
                    fontSize: 13,
                  ),
                ),
                Text(
                  '$currency${pos.taxAmount.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 13),
                ),
              ],
            ),
            const SizedBox(height: 6),
          ],
          // Total bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFF6B00), Color(0xFFE61C24)],
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
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Place Order',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                  Text(
                    '$currency${pos.total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.white,
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
            decoration: const BoxDecoration(
              color: Color(0x55000000),
              border: Border(left: BorderSide(color: Color(0x28FFFFFF))),
            ),
            child: Consumer<PosProvider>(
              builder: (context, pos, _) {
                final currency = pos.settings['currencySymbol'] ?? '₹';
                return Column(
                  children: [
                    // Header
                    AppBar(
                      title: const Text(
                        'Cart',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      backgroundColor: Colors.transparent,
                      elevation: 0,
                      automaticallyImplyLeading: false,
                      actions: [
                        if (pos.cart.isNotEmpty)
                          IconButton(
                            icon: const Icon(
                              Icons.delete_outline,
                              color: Colors.redAccent,
                              size: 20,
                            ),
                            onPressed: pos.clearCart,
                          ),
                      ],
                    ),
                    // Cart items
                    Expanded(
                      child: pos.cart.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.shopping_cart_outlined,
                                    size: 40,
                                    color: Colors.white.withValues(alpha: 0.2),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Cart is empty',
                                    style: TextStyle(
                                      color: Colors.white.withValues(
                                        alpha: 0.4,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              itemCount: pos.cart.length,
                              itemBuilder: (context, index) {
                                final cartItem = pos.cart[index];
                                return _CartItemTile(
                                  cartItem: cartItem,
                                  pos: pos,
                                  currency: currency,
                                );
                              },
                            ),
                    ),
                    // Totals
                    _CartTotals(
                      pos: pos,
                      currency: currency,
                      onCheckout: () => onCheckout(pos),
                      isCheckingOut: isCheckingOut,
                      useSafeArea: false,
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
