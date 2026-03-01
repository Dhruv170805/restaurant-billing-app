class MenuItem {
  final int id;
  final String name;
  final double price;
  final String category;
  final bool isAvailable;

  MenuItem({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    this.isAvailable = true,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    return MenuItem(
      id: json['id'],
      name: json['name'],
      price: (json['price'] as num).toDouble(),
      category: json['category']?['name'] ?? 'Uncategorized',
      isAvailable: json['isAvailable'] ?? true,
    );
  }
}
