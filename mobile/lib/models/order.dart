class OrderItem {
  final int menuItemId;
  final String name;
  final int quantity;
  final double price;

  OrderItem({
    required this.menuItemId,
    required this.name,
    required this.quantity,
    required this.price,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      menuItemId: json['id'] ?? json['menuItemId'],
      name: json['name'] ?? json['menuItem']?['name'] ?? 'Unknown',
      quantity: json['quantity'],
      price: (json['price'] ?? json['priceAtOrder'] as num).toDouble(),
    );
  }
}

class Order {
  final int id;
  final int? tableNumber;
  final String status;
  final String? customerName;
  final String? customerPhone;
  final double subtotal;
  final double tax;
  final double total;
  final List<OrderItem> items;
  final String createdAt;

  Order({
    required this.id,
    this.tableNumber,
    required this.status,
    this.customerName,
    this.customerPhone,
    required this.subtotal,
    required this.tax,
    required this.total,
    required this.items,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    var itemsList = json['items'] as List;
    List<OrderItem> parsedItems = itemsList
        .map((i) => OrderItem.fromJson(i))
        .toList();

    return Order(
      id: json['id'],
      tableNumber: json['tableNumber'],
      status: json['status'],
      customerName: json['customerName'],
      customerPhone: json['customerPhone'],
      subtotal: (json['subtotal'] as num).toDouble(),
      tax: (json['tax'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      items: parsedItems,
      createdAt: json['createdAt'],
    );
  }
}
