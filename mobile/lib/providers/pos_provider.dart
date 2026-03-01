import 'package:flutter/foundation.dart';
import '../models/menu_item.dart';

class CartItem {
  final MenuItem menuItem;
  int quantity;

  CartItem({required this.menuItem, this.quantity = 1});

  double get total => menuItem.price * quantity;
}

class PosProvider extends ChangeNotifier {
  final List<CartItem> _cart = [];
  Map<String, dynamic> _settings = {};

  List<CartItem> get cart => _cart;
  Map<String, dynamic> get settings => _settings;

  double get subtotal => _cart.fold(0, (sum, item) => sum + item.total);

  double get taxAmount {
    bool taxEnabled = _settings['taxEnabled'] ?? false;
    double taxRate = (_settings['taxRate'] as num?)?.toDouble() ?? 0.0;
    if (!taxEnabled) return 0.0;
    return subtotal * taxRate;
  }

  double get total => subtotal + taxAmount;

  void setSettings(Map<String, dynamic> newSettings) {
    _settings = newSettings;
    notifyListeners();
  }

  void addToCart(MenuItem item) {
    var existingItem = _cart.indexWhere((c) => c.menuItem.id == item.id);
    if (existingItem >= 0) {
      _cart[existingItem].quantity++;
    } else {
      _cart.add(CartItem(menuItem: item));
    }
    notifyListeners();
  }

  void updateQuantity(MenuItem item, int delta) {
    var existingItem = _cart.indexWhere((c) => c.menuItem.id == item.id);
    if (existingItem >= 0) {
      _cart[existingItem].quantity += delta;
      if (_cart[existingItem].quantity <= 0) {
        _cart.removeAt(existingItem);
      }
      notifyListeners();
    }
  }

  void clearCart() {
    _cart.clear();
    notifyListeners();
  }
}
