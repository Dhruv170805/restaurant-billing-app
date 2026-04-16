import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/tenant_service.dart';
import '../utils/app_colors.dart';

class BrandLogo extends StatelessWidget {
  final double height;
  final bool useDarkVariant;
  
  const BrandLogo({
    super.key, 
    this.height = 32,
    this.useDarkVariant = false,
  });

  @override
  Widget build(BuildContext context) {
    final tenant = context.watch<TenantService>().config;
    final logoUrl = tenant.logoUrl;

    if (logoUrl != null && logoUrl.isNotEmpty) {
      return Image.network(
        logoUrl,
        height: height,
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => _FallbackLogo(height: height, name: tenant.name),
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return SizedBox(
            height: height,
            width: height,
            child: const CircularProgressIndicator(strokeWidth: 2),
          );
        },
      );
    }

    return _FallbackLogo(height: height, name: tenant.name);
  }
}

class _FallbackLogo extends StatelessWidget {
  final double height;
  final String name;

  const _FallbackLogo({required this.height, required this.name});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: height * 0.8,
          height: height * 0.8,
          decoration: BoxDecoration(
            gradient: AppColors.brandGradient,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'N',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: height * 0.45,
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          name.toUpperCase(),
          style: TextStyle(
            fontSize: height * 0.55,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
            color: Theme.of(context).textTheme.titleLarge?.color,
          ),
        ),
      ],
    );
  }
}
