import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:printing/printing.dart';
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

  Future<void> _printKot(Order order, Map<String, dynamic> settings) async {
    try {
      final doc = await PdfGenerator.generateKOT(order, settings);
      await Printing.layoutPdf(onLayout: (format) => doc.save());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to print: $e')));
      }
    }
  }

  Future<void> _printBill(Order order, Map<String, dynamic> settings) async {
    try {
      final doc = await PdfGenerator.generateBill(order, settings);
      await Printing.layoutPdf(onLayout: (format) => doc.save());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to print: $e')));
      }
    }
  }

  Future<void> checkout(PosProvider pos) async {
    if (pos.cart.isEmpty || isCheckingOut) return;

    final currencySymbol = pos.settings['currencySymbol'] ?? '\$';

    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Confirm Order'),
          content: Text(
            'Place order for $currencySymbol${pos.total.toStringAsFixed(2)}?',
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Confirm'),
            ),
          ],
        );
      },
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

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: Text(
            widget.orderId != null
                ? 'Items Added'
                : 'Order Placed Successfully',
          ),
          content: Text(
            widget.orderId != null
                ? 'Items have been added to Order #${newOrder.id}.'
                : 'Order #${newOrder.id} has been created for Table ${widget.tableNumber}.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context); // close dialog
                Navigator.pop(context); // close POS screen
              },
              child: const Text('Done'),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.print),
              label: const Text('Print KOT'),
              onPressed: () => _printKot(newOrder, pos.settings),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.receipt),
              label: const Text('Print Bill'),
              onPressed: () => _printBill(newOrder, pos.settings),
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

  @override
  Widget build(BuildContext context) {
    final currencySymbol =
        Provider.of<PosProvider>(context).settings['currencySymbol'] ?? '\$';

    // Group categories for the filter list
    final Set<String> categories = {'All'};
    for (var item in menuItems) {
      categories.add(item.category);
    }

    // Filter items based on selection
    final filteredItems = selectedCategory == 'All'
        ? menuItems
        : menuItems.where((i) => i.category == selectedCategory).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Table ${widget.tableNumber} ${widget.orderId != null ? "(#${widget.orderId})" : ""}',
        ),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isPortrait = constraints.maxWidth < 600;
          final layoutChildren = [
            // Left Side: Menu Grid
            Expanded(
              flex: isPortrait ? 3 : 2,
              child: isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : Column(
                      children: [
                        // Category Filter Row
                        SizedBox(
                          height: 60,
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
                                          : Colors.white70,
                                    ),
                                  ),
                                  selected: isSelected,
                                  selectedColor: const Color(0xFFE61C24),
                                  backgroundColor: const Color(0xFF111111),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(20),
                                    side: const BorderSide(
                                      color: Color(0x33FFFFFF),
                                    ),
                                  ),
                                  onSelected: (bool selected) {
                                    setState(() {
                                      selectedCategory = cat;
                                    });
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                        // Menu Grid
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
                            itemBuilder: (context, index) {
                              final item = filteredItems[index];
                              return Card(
                                clipBehavior: Clip.antiAlias,
                                child: InkWell(
                                  onTap: () {
                                    Provider.of<PosProvider>(
                                      context,
                                      listen: false,
                                    ).addToCart(item);
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.all(4.0),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Expanded(
                                          child: Center(
                                            child: Text(
                                              item.name,
                                              textAlign: TextAlign.center,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ),
                                        Text(
                                          '$currencySymbol${item.price.toStringAsFixed(2)}',
                                          style: TextStyle(
                                            color: Theme.of(
                                              context,
                                            ).colorScheme.primary,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
            ),
            // Right Side: Cart
            Expanded(
              flex: isPortrait ? 1 : 1,
              child: Container(
                decoration: const BoxDecoration(
                  color: Color(0xFF000000),
                  border: Border(left: BorderSide(color: Color(0x12FFFFFF))),
                ),
                child: Column(
                  children: [
                    AppBar(
                      title: const Text('Cart'),
                      backgroundColor: Colors.transparent,
                      elevation: 0,
                      automaticallyImplyLeading: false,
                      actions: [
                        Consumer<PosProvider>(
                          builder: (context, pos, child) {
                            if (pos.cart.isEmpty) {
                              return const SizedBox.shrink();
                            }
                            return IconButton(
                              icon: const Icon(Icons.delete_outline),
                              color: Colors.red,
                              onPressed: () async {
                                final bool? confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (BuildContext context) {
                                    return AlertDialog(
                                      title: const Text('Clear Cart'),
                                      content: const Text(
                                        'Are you sure you want to remove all items from the cart?',
                                      ),
                                      actions: <Widget>[
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.of(context).pop(false),
                                          child: const Text('Cancel'),
                                        ),
                                        ElevatedButton(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.red,
                                            foregroundColor: Colors.white,
                                          ),
                                          onPressed: () =>
                                              Navigator.of(context).pop(true),
                                          child: const Text('Clear Cart'),
                                        ),
                                      ],
                                    );
                                  },
                                );
                                if (confirm == true) {
                                  pos.clearCart();
                                }
                              },
                            );
                          },
                        ),
                      ],
                    ),
                    Expanded(
                      child: Consumer<PosProvider>(
                        builder: (context, pos, child) {
                          if (pos.cart.isEmpty) {
                            return const Center(child: Text('Cart is empty'));
                          }
                          return ListView.builder(
                            itemCount: pos.cart.length,
                            itemBuilder: (context, index) {
                              final cartItem = pos.cart[index];
                              return Card(
                                elevation: 2,
                                margin: const EdgeInsets.symmetric(
                                  vertical: 4,
                                  horizontal: 8,
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 4.0,
                                  ),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12.0,
                                    ),
                                    title: Text(
                                      cartItem.menuItem.name,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    subtitle: Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        '${pos.settings['currencySymbol'] ?? '\$'}${cartItem.total.toStringAsFixed(2)}',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Theme.of(
                                            context,
                                          ).colorScheme.primary,
                                        ),
                                      ),
                                    ),
                                    trailing: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(
                                          icon: const Icon(
                                            Icons.remove_circle,
                                            size: 28,
                                            color: Colors.redAccent,
                                          ),
                                          onPressed: () => pos.updateQuantity(
                                            cartItem.menuItem,
                                            -1,
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Theme.of(context)
                                                .colorScheme
                                                .surfaceContainerHighest,
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                          ),
                                          child: Text(
                                            '${cartItem.quantity}',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        IconButton(
                                          icon: Icon(
                                            Icons.add_circle,
                                            size: 28,
                                            color: Theme.of(
                                              context,
                                            ).colorScheme.primary,
                                          ),
                                          onPressed: () => pos.updateQuantity(
                                            cartItem.menuItem,
                                            1,
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
                      ),
                    ),
                    // Totals and Checkout
                    Consumer<PosProvider>(
                      builder: (context, pos, child) {
                        final currency = pos.settings['currencySymbol'] ?? '\$';

                        return Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12.0,
                            vertical: 8.0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Divider(),
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Subtotal'),
                                  Text(
                                    '$currency${pos.subtotal.toStringAsFixed(2)}',
                                  ),
                                ],
                              ),
                              if (pos.taxAmount > 0)
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(pos.settings['taxLabel'] ?? 'Tax'),
                                    Text(
                                      '$currency${pos.taxAmount.toStringAsFixed(2)}',
                                    ),
                                  ],
                                ),
                              const SizedBox(height: 8),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 8,
                                  horizontal: 12,
                                ),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFFF37C22),
                                      Color(0xFFE61C24),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x40E61C24),
                                      blurRadius: 10,
                                      offset: Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'Total',
                                      style: TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    Text(
                                      '$currency${pos.total.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  padding: const EdgeInsets.all(12),
                                  backgroundColor: const Color(0xFF111111),
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                    side: const BorderSide(
                                      color: Color(0x33FFFFFF),
                                    ),
                                  ),
                                ),
                                onPressed: pos.cart.isEmpty || isCheckingOut
                                    ? null
                                    : () => checkout(pos),
                                child: isCheckingOut
                                    ? const CircularProgressIndicator(
                                        color: Colors.white,
                                      )
                                    : Text(
                                        widget.orderId != null
                                            ? 'Add to Order'
                                            : 'Place Order',
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 1.1,
                                        ),
                                      ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ];

          return isPortrait
              ? Column(children: layoutChildren)
              : Row(children: layoutChildren);
        },
      ),
    );
  }
}
