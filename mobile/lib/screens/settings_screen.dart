import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final ApiService api = ApiService();
  bool isLoading = true;

  final TextEditingController nameController = TextEditingController();
  final TextEditingController addressController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController currencyController = TextEditingController();
  final TextEditingController taxController = TextEditingController();
  final TextEditingController serverIpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    loadSettings();
  }

  Future<void> loadSettings() async {
    setState(() => isLoading = true);

    // Always load the Local IP first so the user can see/fix it if the server is down
    try {
      final prefs = await SharedPreferences.getInstance();
      serverIpController.text = prefs.getString('server_ip') ?? '10.0.2.2';
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load local preferences: $e')),
      );
    }

    try {
      final fetchedSettings = await api.fetchSettings();
      if (!mounted) return;

      nameController.text = fetchedSettings['restaurantName'] ?? '';
      addressController.text = fetchedSettings['restaurantAddress'] ?? '';
      phoneController.text = fetchedSettings['restaurantPhone'] ?? '';
      currencyController.text = fetchedSettings['currencySymbol'] ?? '\$';
      taxController.text = (fetchedSettings['taxRate'] ?? 0).toString();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Server connection failed: $e')));
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> saveSettings() async {
    setState(() => isLoading = true);

    try {
      // Save IP locally
      await api.setBaseUrlIP(serverIpController.text);

      // Save business settings remotely
      final updatedSettings = {
        'restaurantName': nameController.text,
        'restaurantAddress': addressController.text,
        'restaurantPhone': phoneController.text,
        'currencySymbol': currencyController.text,
        'taxRate': double.tryParse(taxController.text) ?? 0.0,
      };

      await api.updateSettings(updatedSettings);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings saved successfully!')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to save to Server: $e')));
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: isLoading ? null : saveSettings,
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: loadSettings,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Restaurant Profile',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Restaurant Name',
                      prefixIcon: Icon(Icons.store),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: addressController,
                    decoration: const InputDecoration(
                      labelText: 'Address',
                      prefixIcon: Icon(Icons.location_on),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: phoneController,
                    decoration: const InputDecoration(
                      labelText: 'Phone Number',
                      prefixIcon: Icon(Icons.phone),
                    ),
                  ),
                  const Divider(height: 32),
                  const Text(
                    'Billing Configuration',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: currencyController,
                    decoration: const InputDecoration(
                      labelText: 'Currency Symbol',
                      prefixIcon: Icon(Icons.attach_money),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: taxController,
                    decoration: const InputDecoration(
                      labelText: 'Tax Rate (%)',
                      prefixIcon: Icon(Icons.receipt),
                    ),
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'System Configuration',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: serverIpController,
                    decoration: const InputDecoration(
                      labelText: 'Server IP Address',
                      prefixIcon: Icon(Icons.wifi),
                      helperText: 'E.g. 192.168.1.5',
                    ),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    onPressed: isLoading ? null : saveSettings,
                    icon: const Icon(Icons.save),
                    label: const Text('Save Settings'),
                  ),
                ],
              ),
            ),
    );
  }
}
