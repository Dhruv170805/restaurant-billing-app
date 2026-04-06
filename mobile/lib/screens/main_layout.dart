import 'dart:ui';

import 'package:flutter/material.dart';
import 'sales_dashboard_screen.dart';
import 'dashboard.dart';
import 'orders_screen.dart';
import 'kds_screen.dart';
import 'menu_screen.dart';
import 'settings_screen.dart';
import '../utils/app_colors.dart';

/// Wraps a screen so PageView keeps it alive in memory after first visit.
/// This prevents dispose+recreate (and re-fetching data) when switching tabs.
class _KeepAlivePage extends StatefulWidget {
  final Widget child;
  const _KeepAlivePage({required this.child});

  @override
  State<_KeepAlivePage> createState() => _KeepAlivePageState();
}

class _KeepAlivePageState extends State<_KeepAlivePage>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}

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
    _NavItem(Icons.soup_kitchen_outlined, Icons.soup_kitchen, 'Kitchen'),
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
      // PageView enables App Store–style horizontal swipe between tabs.
      // keepPage: true + _KeepAlivePage ensures screens stay alive once visited,
      // preventing unnecessary dispose/recreate and redundant network fetches.
      body: PageView.builder(
        controller: _pageController,
        onPageChanged: _onPageChanged,
        physics: const BouncingScrollPhysics(),
        itemCount: 6,
        itemBuilder: (context, index) {
          return _KeepAlivePage(child: _buildPage(index));
        },
      ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          bottom: bottomPadding + 12,
        ),
        child: RepaintBoundary(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(36),
            child: BackdropFilter(
              // Reduced from 30 → 16: halves GPU work on every frame (iOS)
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                height: 68,
                decoration: BoxDecoration(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? const Color(0xCC000000)
                      : Colors.white.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(36),
                  border: Border.all(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? const Color(0x33444444)
                        : Theme.of(context).dividerColor,
                    width: 0.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.black.withValues(alpha: 0.5)
                          : Theme.of(
                              context,
                            ).shadowColor.withValues(alpha: 0.15),
                      blurRadius: 30,
                      offset: const Offset(0, 8),
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
              ? AppColors.orangeAlt.withValues(alpha: 0.18)
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
                  ? AppColors.orangeAlt
                  : Theme.of(context).textTheme.bodyMedium?.color?.withValues(
                          alpha: 0.45,
                        ) ??
                        Colors.grey,
              size: 22,
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeOutCubic,
              child: isSelected
                  ? Row(
                      children: [
                        SizedBox(width: 6),
                        Text(
                          item.label,
                          style: TextStyle(
                            color: AppColors.orangeAlt,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    )
                  : SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }

  /// Maps a tab index to its screen widget.
  /// Called lazily by PageView.builder — only executed when the user first visits a tab.
  Widget _buildPage(int index) {
    switch (index) {
      case 0:
        return const SalesDashboardScreen();
      case 1:
        return const DashboardScreen();
      case 2:
        return const OrdersScreen();
      case 3:
        return const KDSScreen();
      case 4:
        return const MenuScreen();
      case 5:
        return const SettingsScreen();
      default:
        return const SalesDashboardScreen();
    }
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem(this.icon, this.activeIcon, this.label);
}
