# Flutter ProGuard Rules for Restaurant Billing Mobile
# These rules ensure R8 doesn't strip classes needed at runtime.

# ── Flutter core ─────────────────────────────────────────────────────────────
-keep class io.flutter.** { *; }
-dontwarn io.flutter.**

# ── Keep app entry points ─────────────────────────────────────────────────────
-keep class com.restaurantbilling.** { *; }

# ── Kotlin coroutines / serialization ────────────────────────────────────────
-keepattributes *Annotation*
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }

# ── OkHttp / HTTP networking (used by Flutter http package) ──────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ── Socket.IO client ──────────────────────────────────────────────────────────
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# ── JSON serialization ────────────────────────────────────────────────────────
-keepattributes Signature
-keepattributes EnclosingMethod

# ── Printing / PDF ────────────────────────────────────────────────────────────
-keep class com.printing.** { *; }
-dontwarn com.printing.**

# ── General: keep data classes used for JSON parsing ─────────────────────────
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
