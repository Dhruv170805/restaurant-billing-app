import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

// ─── Base Shimmer Wrapper ──────────────────────────────────────────────────────
class _Shimmer extends StatelessWidget {
  final Widget child;
  const _Shimmer({required this.child});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF1E1E1E) : const Color(0xFFE8E8E8),
      highlightColor: isDark ? const Color(0xFF2E2E2E) : const Color(0xFFF5F5F5),
      child: child,
    );
  }
}

// ─── Skeleton Box helper ───────────────────────────────────────────────────────
class _SkBox extends StatelessWidget {
  final double? width;
  final double height;
  final double radius;
  const _SkBox({this.width, required this.height, this.radius = 8});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}

// ─── Dashboard Stat Card Skeleton ─────────────────────────────────────────────
class SkeletonStatGrid extends StatelessWidget {
  const SkeletonStatGrid({super.key});

  @override
  Widget build(BuildContext context) {
    return _Shimmer(
      child: GridView.count(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.1,
        children: List.generate(4, (_) => const _SkStatCard()),
      ),
    );
  }
}

class _SkStatCard extends StatelessWidget {
  const _SkStatCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SkBox(width: 70, height: 10),
              const SizedBox(height: 6),
              const _SkBox(width: 110, height: 22, radius: 6),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Table Grid Skeleton ──────────────────────────────────────────────────────
class SkeletonTableGrid extends StatelessWidget {
  final int count;
  const SkeletonTableGrid({super.key, this.count = 8});

  @override
  Widget build(BuildContext context) {
    return _Shimmer(
      child: GridView.builder(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 120),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.0,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: count,
        itemBuilder: (ctx, i) => const _SkTableCard(),
      ),
    );
  }
}

class _SkTableCard extends StatelessWidget {
  const _SkTableCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              const Spacer(),
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
          const Spacer(),
          const _SkBox(width: 80, height: 16),
          const SizedBox(height: 6),
          const _SkBox(width: 60, height: 11),
        ],
      ),
    );
  }
}

// ─── Order List Skeleton ──────────────────────────────────────────────────────
class SkeletonOrderList extends StatelessWidget {
  final int count;
  const SkeletonOrderList({super.key, this.count = 6});

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (ctx, i) => _Shimmer(child: const _SkOrderCard()),
          childCount: count,
        ),
      ),
    );
  }
}

class _SkOrderCard extends StatelessWidget {
  const _SkOrderCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SkBox(width: 90, height: 15),
                const SizedBox(height: 6),
                const _SkBox(width: 60, height: 11),
                const SizedBox(height: 4),
                const _SkBox(width: 100, height: 10),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const _SkBox(width: 70, height: 16),
              const SizedBox(height: 8),
              const _SkBox(width: 55, height: 22, radius: 8),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Menu Item List Skeleton ──────────────────────────────────────────────────
class SkeletonMenuList extends StatelessWidget {
  final int count;
  const SkeletonMenuList({super.key, this.count = 8});

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (ctx, i) => _Shimmer(child: const _SkMenuCard()),
          childCount: count,
        ),
      ),
    );
  }
}

class _SkMenuCard extends StatelessWidget {
  const _SkMenuCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SkBox(width: 120, height: 14),
                const SizedBox(height: 5),
                const _SkBox(width: 60, height: 10, radius: 4),
              ],
            ),
          ),
          const _SkBox(width: 48, height: 18, radius: 4),
        ],
      ),
    );
  }
}

// ─── Sales Dashboard Full Skeleton ─────────────────────────────────────────────
class SkeletonSalesDashboard extends StatelessWidget {
  const SkeletonSalesDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
      sliver: SliverList(
        delegate: SliverChildListDelegate([
          const SkeletonStatGrid(),
          const SizedBox(height: 28),
          _Shimmer(child: const _SkBox(width: 180, height: 22, radius: 6)),
          const SizedBox(height: 12),
          _Shimmer(
            child: Container(
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          const SizedBox(height: 28),
          _Shimmer(child: const _SkBox(width: 200, height: 22, radius: 6)),
          const SizedBox(height: 12),
          _Shimmer(
            child: Container(
              height: 160,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
          const SizedBox(height: 28),
          _Shimmer(child: const _SkBox(width: 170, height: 22, radius: 6)),
          const SizedBox(height: 12),
          ...List.generate(
            3,
            (_) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _Shimmer(
                child: Container(
                  height: 76,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

// ─── KDS Skeleton ──────────────────────────────────────────────────────────────
class SkeletonKDSGrid extends StatelessWidget {
  final int count;
  const SkeletonKDSGrid({super.key, this.count = 4});

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 120),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.75,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        delegate: SliverChildBuilderDelegate(
          (ctx, i) => _Shimmer(child: const _SkKDSCard()),
          childCount: count,
        ),
      ),
    );
  }
}

class _SkKDSCard extends StatelessWidget {
  const _SkKDSCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const _SkBox(width: 70, height: 18),
            const Spacer(),
            const _SkBox(width: 50, height: 22, radius: 10),
          ]),
          const SizedBox(height: 8),
          const _SkBox(width: 80, height: 11),
          const SizedBox(height: 14),
          const Divider(color: Colors.black12),
          const SizedBox(height: 8),
          ...List.generate(3, (_) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(children: [
              const _SkBox(width: 24, height: 24, radius: 6),
              const SizedBox(width: 10),
              const _SkBox(width: 90, height: 13),
            ]),
          )),
        ],
      ),
    );
  }
}
