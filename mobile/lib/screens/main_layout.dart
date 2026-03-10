import 'dart:ui';

import 'package:flutter/material.dart';
import 'sales_dashboard_screen.dart';
import 'dashboard.dart';
import 'orders_screen.dart';
import 'menu_screen.dart';
import 'settings_screen.dart';

class MainLayout extends StatefulWidget {
  const MainLayout({super.key});

  @override
  State<MainLayout> createState() => _MainLayoutState();
}

class _MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;
  late final PageController _pageController;

  static const List<_NavItem> _navItems = [
    _NavItem(Icons.bar_chart_rounded, Icons.bar_chart_rounded, 'Sales'),
    _NavItem(Icons.table_restaurant_outlined, Icons.table_restaurant, 'Tables'),
    _NavItem(Icons.receipt_long_outlined, Icons.receipt_long, 'Orders'),
    _NavItem(Icons.restaurant_menu_outlined, Icons.restaurant_menu, 'Menu'),
    _NavItem(Icons.settings_outlined, Icons.settings_rounded, 'Settings'),
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onTabTap(int index) {
    if (_currentIndex == index) return;
    setState(() => _currentIndex = index);
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeInOutCubic,
    );
  }

  void _onPageChanged(int index) {
    if (_currentIndex != index) {
      setState(() => _currentIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    return Scaffold(
      extendBody: true,
      // PageView enables App Store–style horizontal swipe between tabs
      body: PageView(
        controller: _pageController,
        onPageChanged: _onPageChanged,
        // Slight motion feel — not rubber-band, just smooth
        physics: const BouncingScrollPhysics(),
        children: const [
          SalesDashboardScreen(),
          DashboardScreen(),
          OrdersScreen(),
          MenuScreen(),
          SettingsScreen(),
        ],
      ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: bottomPadding + 12,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(36),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
            child: Container(
              height: 68,
              decoration: BoxDecoration(
                color: const Color(0xCC0A0A0A),
                borderRadius: BorderRadius.circular(36),
                border: Border.all(color: const Color(0x44FFFFFF), width: 0.5),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x66000000),
                    blurRadius: 30,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(
                  _navItems.length,
                  (index) => _buildNavItem(_navItems[index], index),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(_NavItem item, int index) {
    final isSelected = index == _currentIndex;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _onTabTap(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(
          horizontal: isSelected ? 14 : 8,
          vertical: 8,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFFFF6B00).withValues(alpha: 0.18)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(26),
          border: isSelected
              ? Border.all(color: const Color(0x55FF6B00), width: 0.5)
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? item.activeIcon : item.icon,
              color: isSelected
                  ? const Color(0xFFFF6B00)
                  : Colors.white.withValues(alpha: 0.4),
              size: 22,
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeOutCubic,
              child: isSelected
                  ? Row(
                      children: [
                        const SizedBox(width: 6),
                        Text(
                          item.label,
                          style: const TextStyle(
                            color: Color(0xFFFF6B00),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem(this.icon, this.activeIcon, this.label);
}
