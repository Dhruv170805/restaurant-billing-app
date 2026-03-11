import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/menu_item.dart';
import '../providers/pos_provider.dart';
import '../utils/app_colors.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final ApiService api = ApiService();
  bool isLoading = true;
  List<MenuItem> menuItems = [];
  String selectedCategory = 'All';

  @override
  void initState() {
    super.initState();
    loadMenu();
  }

  Future<void> loadMenu() async {
    setState(() => isLoading = true);
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

  /// Toggle an item's availability directly (no dialog needed)
  Future<void> _toggleAvailability(MenuItem item) async {
    HapticFeedback.lightImpact();
    final newVal = !item.isAvailable;
    // Optimistic update
    setState(() {
      final idx = menuItems.indexOf(item);
      if (idx >= 0) {
        menuItems[idx] = MenuItem(
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          isAvailable: newVal,
        );
      }
    });
    try {
      await api.updateMenuItem(item.id, {
        'name': item.name,
        'price': item.price,
        'category': item.category,
        'isAvailable': newVal,
      });
    } catch (e) {
      // Rollback on failure
      setState(() {
        final idx = menuItems.indexWhere((m) => m.id == item.id);
        if (idx >= 0) {
          menuItems[idx] = item;
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    }
  }

  Future<void> _deleteItem(MenuItem item) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Item'),
        content: Text('Delete "${item.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await api.deleteMenuItem(item.id);
      if (!mounted) return;
      setState(() => menuItems.removeWhere((m) => m.id == item.id));
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Item deleted')));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to delete: $e')));
      }
    }
  }

  void _showItemForm([MenuItem? item]) {
    final nameCtrl = TextEditingController(text: item?.name ?? '');
    final priceCtrl = TextEditingController(text: item?.price.toString() ?? '');
    final catCtrl = TextEditingController(text: item?.category ?? '');
    bool isAvailable = item?.isAvailable ?? true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
              child: StatefulBuilder(
                builder: (context, setSheet) => Container(
                  decoration: const BoxDecoration(
                    color: Color(0xEE0A0A0F),
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(28),
                    ),
                    border: Border(
                      top: BorderSide(color: Color(0x22FFFFFF), width: 0.5),
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
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
                      const SizedBox(height: 20),
                      Text(
                        item == null ? 'New Menu Item' : 'Edit Item',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 20),
                      _GlassField(controller: nameCtrl, label: 'Item Name'),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _GlassField(
                              controller: priceCtrl,
                              label: 'Price',
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _GlassField(
                              controller: catCtrl,
                              label: 'Category',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Availability toggle
                      GestureDetector(
                        onTap: () => setSheet(() => isAvailable = !isAvailable),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0x10FFFFFF),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0x20FFFFFF)),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                isAvailable
                                    ? Icons.check_circle_rounded
                                    : Icons.cancel_rounded,
                                color: isAvailable
                                    ? AppColors.green
                                    : AppColors.danger,
                                size: 20,
                              ),
                              const SizedBox(width: 10),
                              Text(
                                isAvailable
                                    ? 'Available to order'
                                    : 'Marked as unavailable',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                              const Spacer(),
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                width: 44,
                                height: 26,
                                decoration: BoxDecoration(
                                  color: isAvailable
                                      ? AppColors.green
                                      : const Color(0x30FFFFFF),
                                  borderRadius: BorderRadius.circular(13),
                                ),
                                child: AnimatedAlign(
                                  duration: const Duration(milliseconds: 200),
                                  alignment: isAvailable
                                      ? Alignment.centerRight
                                      : Alignment.centerLeft,
                                  child: Container(
                                    margin: const EdgeInsets.all(3),
                                    width: 20,
                                    height: 20,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.orange, AppColors.red],
                            ),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            onPressed: () async {
                              final data = {
                                'name': nameCtrl.text.trim(),
                                'price': double.tryParse(priceCtrl.text) ?? 0.0,
                                'category': catCtrl.text.trim(),
                                'isAvailable': isAvailable,
                              };
                              final nav = Navigator.of(context);
                              final messenger = ScaffoldMessenger.of(context);
                              nav.pop();
                              try {
                                if (item == null) {
                                  await api.createMenuItem(data);
                                } else {
                                  await api.updateMenuItem(item.id, data);
                                }
                                if (mounted) loadMenu();
                              } catch (e) {
                                messenger.showSnackBar(
                                  SnackBar(content: Text('Error saving: $e')),
                                );
                              }
                            },
                            child: Text(
                              item == null ? 'Add Item' : 'Save Changes',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final currency =
        Provider.of<PosProvider>(context).settings['currencySymbol'] ?? '₹';

    // Category set
    final categories = <String>{'All', ...menuItems.map((i) => i.category)};

    final filtered = selectedCategory == 'All'
        ? menuItems
        : menuItems.where((i) => i.category == selectedCategory).toList();

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // ── Glass large-title app bar ──────────────────────────────────
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
                    'Menu',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    margin: const EdgeInsets.only(bottom: 3),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0x22FFFFFF),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${menuItems.length} items',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.6),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
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
                onPressed: loadMenu,
              ),
            ],
          ),

          // ── Category filter horizontal scroll ──────────────────────────
          if (!isLoading)
            SliverToBoxAdapter(
              child: SizedBox(
                height: 52,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  itemCount: categories.length,
                  separatorBuilder: (context, i) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final cat = categories.elementAt(i);
                    final isSelected = cat == selectedCategory;
                    final count = cat == 'All'
                        ? menuItems.length
                        : menuItems.where((m) => m.category == cat).length;
                    return GestureDetector(
                      onTap: () => setState(() => selectedCategory = cat),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.orange
                              : const Color(0x14FFFFFF),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected
                                ? AppColors.orange
                                : const Color(0x25FFFFFF),
                          ),
                        ),
                        child: Row(
                          children: [
                            Text(
                              cat,
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.6),
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            if (count > 0) ...[
                              const SizedBox(width: 5),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 5,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? Colors.white.withValues(alpha: 0.25)
                                      : const Color(0x20FFFFFF),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '$count',
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.white
                                        : Colors.white.withValues(alpha: 0.5),
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

          if (isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (filtered.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.restaurant_menu_outlined,
                      size: 60,
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No items in this category',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.35),
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
                  final item = filtered[index];
                  return _MenuItemCard(
                    item: item,
                    currency: currency,
                    onToggle: () => _toggleAvailability(item),
                    onEdit: () => _showItemForm(item),
                    onDelete: () => _deleteItem(item),
                  );
                }, childCount: filtered.length),
              ),
            ),
        ],
      ),
      floatingActionButton: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.orange, AppColors.red],
          ),
          borderRadius: BorderRadius.circular(18),
          boxShadow: const [
            BoxShadow(
              color: Color(0x55FF6A00),
              blurRadius: 16,
              offset: Offset(0, 6),
            ),
          ],
        ),
        child: FloatingActionButton(
          backgroundColor: Colors.transparent,
          elevation: 0,
          onPressed: () => _showItemForm(),
          child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
        ),
      ),
    );
  }
}

// ─── Menu Item Card with swipe-to-toggle availability ────────────────────────

class _MenuItemCard extends StatelessWidget {
  final MenuItem item;
  final String currency;
  final VoidCallback onToggle;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _MenuItemCard({
    required this.item,
    required this.currency,
    required this.onToggle,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey('menu_${item.id}'),
      // Swipe LEFT → toggle availability
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: item.isAvailable
              ? const Color(0x25EF4444)
              : const Color(0x2522C55E),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              item.isAvailable ? Icons.visibility_off : Icons.visibility,
              color: item.isAvailable
                  ? AppColors.danger
                  : AppColors.green,
              size: 22,
            ),
            const SizedBox(height: 4),
            Text(
              item.isAvailable ? 'Disable' : 'Enable',
              style: TextStyle(
                color: item.isAvailable
                    ? AppColors.danger
                    : AppColors.green,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        onToggle();
        return false; // Don't actually dismiss — just toggle
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: const Color(0x10FFFFFF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: item.isAvailable
                ? AppColors.borderSubtle
                : const Color(0x15EF4444),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              // Availability indicator dot
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: item.isAvailable
                      ? AppColors.green
                      : AppColors.danger,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 14),
              // Name + category
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: item.isAvailable
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.45),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 1,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0x15FFFFFF),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item.category,
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 11,
                            ),
                          ),
                        ),
                        if (!item.isAvailable) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 1,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0x15EF4444),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'UNAVAILABLE',
                              style: TextStyle(
                                color: AppColors.danger,
                                fontSize: 9,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              // Price
              Text(
                '$currency${item.price.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(width: 8),
              // Edit
              GestureDetector(
                onTap: onEdit,
                child: Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: const Color(0x12FFFFFF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.edit_outlined,
                    size: 16,
                    color: Colors.white70,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Glass text field helper ──────────────────────────────────────────────────

class _GlassField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;

  const _GlassField({
    required this.controller,
    required this.label,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(
          color: Colors.white.withValues(alpha: 0.5),
          fontSize: 13,
        ),
        filled: true,
        fillColor: const Color(0x10FFFFFF),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0x20FFFFFF)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0x20FFFFFF)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0x80FF6A00), width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 12,
        ),
      ),
    );
  }
}
