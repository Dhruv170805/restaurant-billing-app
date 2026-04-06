import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_service.dart';

enum SocketEvent { orderUpdated, settingsUpdated }

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  bool _isDisabled = false;
  bool _isConnected = false;
  int _retryCount = 0;
  static const int _maxRetries = 3;

  final _eventController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get eventStream => _eventController.stream;
  bool get isConnected => _isConnected;
  bool get isDisabled => _isDisabled;

  /// Fire and forget initialization to prevent blocking startup.
  void init() {
    if (_socket != null || _isDisabled) return;

    // Phase 17: Delay socket init by 2s to ensure the main UI thread is
    // completely free for initial rendering and user interaction.
    Future.delayed(const Duration(seconds: 2), () {
      _connect();
    });
  }

  void _connect() {
    String baseUrl = ApiService().webUrl;

    // Phase 18: Simplify URL construction.
    // The socket_io_client library handles default ports (80/443) automatically based on scheme.
    // Manual appending can cause the underlying engine to report ':0' on failed connection attempts.
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://$baseUrl';
    }

    debugPrint('🔌 Attempting WebSocket connection to: $baseUrl');

    _socket = io.io(
      baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setPath('/api/socket/io')
          .enableAutoConnect()
          .setReconnectionDelay(5000)
          .setReconnectionAttempts(_maxRetries)
          .build(),
    );

    _socket!.onConnect((_) {
      _isConnected = true;
      _retryCount = 0;
      debugPrint('✅ Connected to WebSocket');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      debugPrint('❌ Disconnected from WebSocket');
    });

    _socket!.onConnectError((err) {
      _retryCount++;
      debugPrint('⚠️ WebSocket Connection Error (Attempt $_retryCount): $err');

      // If we get a 404, the infrastructure (Vercel) likely doesn't support WebSockets.
      if (err.toString().contains('404')) {
        _disableSocket(
          'Serverless Infrastructure Limitation (Vercel detected)',
        );
      } else if (_retryCount >= _maxRetries) {
        _disableSocket('Max connection retries exceeded');
      }
    });

    // Listen for core POS events
    _socket!.on('ORDER_UPDATED', (data) {
      _eventController.add({'event': SocketEvent.orderUpdated, 'data': data});
    });

    _socket!.on('SETTINGS_UPDATED', (data) {
      _eventController.add({
        'event': SocketEvent.settingsUpdated,
        'data': data,
      });
    });
  }

  void _disableSocket(String reason) {
    if (_isDisabled) return;
    _isDisabled = true;
    _isConnected = false;
    debugPrint('🚫 Disabling WebSocket Service: $reason');
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _eventController.close();
  }
}
