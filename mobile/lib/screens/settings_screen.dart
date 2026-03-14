import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../utils/app_colors.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final ApiService api = ApiService();
  bool isLoading = true;
  bool isSaving = false;

  final TextEditingController nameController = TextEditingController();
  final TextEditingController addressController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController currencyController = TextEditingController();
  final TextEditingController taxController = TextEditingController();
  final TextEditingController tableCountController = TextEditingController();
  final TextEditingController serverIpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    loadSettings();
  }

  @override
  void dispose() {
    nameController.dispose();
    addressController.dispose();
    phoneController.dispose();
    currencyController.dispose();
    taxController.dispose();
    tableCountController.dispose();
    serverIpController.dispose();
    super.dispose();
  }

  Future<void> loadSettings() async {
    setState(() => isLoading = true);
    try {
      final s = await api.fetchSettings();
      if (!mounted) return;
      nameController.text = s['restaurantName'] ?? '';
      addressController.text = s['restaurantAddress'] ?? '';
      phoneController.text = s['restaurantPhone'] ?? '';
      currencyController.text = s['currencySymbol'] ?? '₹';
      taxController.text = (s['taxRate'] ?? 0).toString();
      tableCountController.text = (s['tableCount'] ?? 10).toString();
      
      final prefs = await SharedPreferences.getInstance();
      serverIpController.text = prefs.getString('server_ip') ?? '10.0.2.2';
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Load failed: $e')));
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> saveSettings() async {
    setState(() => isSaving = true);
    HapticFeedback.mediumImpact();
    final messenger = ScaffoldMessenger.of(context);
    try {
      await api.updateSettings({
        'restaurantName': nameController.text.trim(),
        'restaurantAddress': addressController.text.trim(),
        'restaurantPhone': phoneController.text.trim(),
        'currencySymbol': currencyController.text.trim(),
        'taxRate': double.tryParse(taxController.text) ?? 0.0,
        'tableCount': int.tryParse(tableCountController.text) ?? 10,
      });

      if (serverIpController.text.trim().isNotEmpty) {
        await api.setServerIp(serverIpController.text.trim());
      }
      HapticFeedback.lightImpact();
      messenger.showSnackBar(
        SnackBar(
          content: const Text('Settings saved ✓'),
          backgroundColor: AppColors.green,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Save failed: $e')));
    } finally {
      if (mounted) setState(() => isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // ── Glass large-title app bar ────────────────────────────────
          SliverAppBar(
            expandedHeight: 120,
            pinned: true,
            backgroundColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              centerTitle: false,
              titlePadding: const EdgeInsets.only(left: 20, bottom: 14),
              title: const Text(
                'Settings',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
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
          ),

          if (isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // ── Restaurant Profile ────────────────────────────────
                  _SectionHeader(
                    icon: Icons.store_rounded,
                    color: AppColors.blue,
                    label: 'Restaurant Profile',
                  ),
                  _GlassSection(
                    children: [
                      _SettingsField(
                        controller: nameController,
                        label: 'Restaurant Name',
                        icon: Icons.storefront_outlined,
                        hint: 'My Restaurant',
                      ),
                      const _SectionDivider(),
                      _SettingsField(
                        controller: addressController,
                        label: 'Address',
                        icon: Icons.location_on_outlined,
                        hint: '123 Main Street, City',
                      ),
                      const _SectionDivider(),
                      _SettingsField(
                        controller: phoneController,
                        label: 'Phone',
                        icon: Icons.phone_outlined,
                        hint: '+91 9876543210',
                        keyboard: TextInputType.phone,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ── Billing Configuration ─────────────────────────────
                  _SectionHeader(
                    icon: Icons.receipt_long_outlined,
                    color: AppColors.amber,
                    label: 'Billing',
                  ),
                  _GlassSection(
                    children: [
                      _SettingsField(
                        controller: currencyController,
                        label: 'Currency Symbol',
                        icon: Icons.attach_money_rounded,
                        hint: '₹',
                      ),
                      const _SectionDivider(),
                      _SettingsField(
                        controller: taxController,
                        label: 'Tax Rate (%)',
                        icon: Icons.percent_rounded,
                        hint: '18',
                        keyboard: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ── Operations ────────────────────────────────────────
                  _SectionHeader(
                    icon: Icons.table_restaurant_outlined,
                    color: AppColors.green,
                    label: 'Operations',
                  ),
                  _GlassSection(
                    children: [
                      _SettingsField(
                        controller: tableCountController,
                        label: 'Number of Tables',
                        icon: Icons.table_bar_outlined,
                        hint: '10',
                        keyboard: TextInputType.number,
                      ),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // ── Save Button ───────────────────────────────────────
                  SizedBox(
                    height: 56,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: isSaving
                            ? null
                            : const LinearGradient(
                                colors: [AppColors.orange, AppColors.red],
                              ),
                        color: isSaving ? const Color(0x20FFFFFF) : null,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: isSaving
                            ? null
                            : const [
                                BoxShadow(
                                  color: Color(0x55FF6A00),
                                  blurRadius: 16,
                                  offset: Offset(0, 6),
                                ),
                              ],
                      ),
                      child: ElevatedButton(
                        onPressed: isSaving ? null : saveSettings,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.check_rounded,
                                    color: Colors.white,
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'Save Settings',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // ── App Info ──────────────────────────────────────────
                  _GlassSection(
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(7),
                              decoration: BoxDecoration(
                                color: const Color(0x15FFFFFF),
                                borderRadius: BorderRadius.circular(9),
                              ),
                              child: const Icon(
                                Icons.info_outline_rounded,
                                size: 16,
                                color: Colors.white54,
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Expanded(
                              child: Text(
                                'NEXUS POS',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            Text(
                              'v1.0.0',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.4),
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;

  const _SectionHeader({
    required this.icon,
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 4),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 14, color: color),
          ),
          const SizedBox(width: 8),
          Text(
            label.toUpperCase(),
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.5),
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Glass grouped section card ────────────────────────────────────────────────

class _GlassSection extends StatelessWidget {
  final List<Widget> children;
  const _GlassSection({required this.children});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0x10FFFFFF),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: children),
        ),
      ),
    );
  }
}

// ─── Thin divider inside sections ─────────────────────────────────────────────

class _SectionDivider extends StatelessWidget {
  const _SectionDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 0.5,
      margin: const EdgeInsets.only(left: 52),
      color: const Color(0x16FFFFFF),
    );
  }
}

// ──  Settings text field row ───────────────────────────────────────────────────

class _SettingsField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final String hint;
  final TextInputType? keyboard;

  const _SettingsField({
    required this.controller,
    required this.label,
    required this.icon,
    required this.hint,
    this.keyboard,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: const Color(0x12FFFFFF),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(
              icon,
              size: 16,
              color: Colors.white.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: keyboard,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
              decoration: InputDecoration(
                labelText: label,
                hintText: hint,
                labelStyle: TextStyle(
                  color: Colors.white.withValues(alpha: 0.4),
                  fontSize: 12,
                ),
                hintStyle: TextStyle(
                  color: Colors.white.withValues(alpha: 0.2),
                  fontSize: 14,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
