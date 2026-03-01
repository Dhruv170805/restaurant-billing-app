import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/menu_item.dart';
import '../providers/pos_provider.dart';

class MenuScreen extends StatefulWidget {
  const MenuScreen({super.key});

  @override
  State<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends State<MenuScreen> {
  final ApiService api = ApiService();
  bool isLoading = true;
  List<MenuItem> menuItems = [];

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
        // Group by category later in the UI
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

  Future<void> _deleteItem(MenuItem item) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Item'),
        content: Text('Are you sure you want to delete ${item.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await api.deleteMenuItem(item.id);
      loadMenu();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Item deleted successfully')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to delete: $e')));
    }
  }

  void _showItemForm([MenuItem? item]) {
    final nameController = TextEditingController(text: item?.name ?? '');
    final priceController = TextEditingController(
      text: item?.price.toString() ?? '',
    );
    final categoryController = TextEditingController(
      text: item?.category ?? '',
    );
    bool isAvailable = item?.isAvailable ?? true;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(item == null ? 'New Menu Item' : 'Edit Menu Item'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Name'),
                    ),
                    TextField(
                      controller: priceController,
                      decoration: const InputDecoration(labelText: 'Price'),
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                    ),
                    TextField(
                      controller: categoryController,
                      decoration: const InputDecoration(labelText: 'Category'),
                    ),
                    SwitchListTile(
                      title: const Text('Available out of stock?'),
                      value: isAvailable,
                      onChanged: (val) {
                        setDialogState(() => isAvailable = val);
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final data = {
                      'name': nameController.text,
                      'price': double.tryParse(priceController.text) ?? 0.0,
                      'category': categoryController.text,
                      'isAvailable': isAvailable,
                    };

                    Navigator.pop(context); // Close dialog
                    final messenger = ScaffoldMessenger.of(context);

                    try {
                      if (item == null) {
                        await api.createMenuItem(data);
                      } else {
                        await api.updateMenuItem(item.id, data);
                      }
                      loadMenu(); // refresh
                    } catch (e) {
                      if (!mounted) return;
                      messenger.showSnackBar(
                        SnackBar(content: Text('Error saving item: $e')),
                      );
                    }
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  String selectedCategory = 'All';

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
        title: const Text('Menu Management'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: loadMenu),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: loadMenu,
              child: Column(
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
                            label: Text(cat),
                            selected: isSelected,
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
                  const Divider(height: 1),

                  // Menu Items List
                  Expanded(
                    child: ListView.builder(
                      itemCount: filteredItems.length,
                      itemBuilder: (context, index) {
                        final item = filteredItems[index];

                        return Column(
                          children: [
                            ListTile(
                              title: Text(item.name),
                              subtitle: Text(
                                '$currencySymbol${item.price.toStringAsFixed(2)}',
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    item.isAvailable
                                        ? Icons.check_circle
                                        : Icons.cancel,
                                    color: item.isAvailable
                                        ? Colors.green
                                        : Colors.grey,
                                    size: 16,
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.edit, size: 20),
                                    onPressed: () => _showItemForm(item),
                                  ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete,
                                      size: 20,
                                      color: Colors.red,
                                    ),
                                    onPressed: () => _deleteItem(item),
                                  ),
                                ],
                              ),
                            ),
                            const Divider(height: 1),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showItemForm(),
        child: const Icon(Icons.add),
      ),
    );
  }
}
