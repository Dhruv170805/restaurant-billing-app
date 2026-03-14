import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_service.dart';

enum SocketEvent {
  orderUpdated,
  settingsUpdated,
}

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  final _eventController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get eventStream => _eventController.stream;

  Future<void> init() async {
    if (_socket != null) return;

    final baseUrl = await ApiService().webUrl;
    
    _socket = io.io(
      baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket']) // Use WebSocket only for performance
          .setPath('/api/socket/io')    // Match backend path
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('✅ Connected to WebSocket');
    });

    _socket!.onDisconnect((_) {
      debugPrint('❌ Disconnected from WebSocket');
    });

    _socket!.onConnectError((err) {
      debugPrint('⚠️ WebSocket Connection Error: $err');
    });

    // Listen for core POS events
    _socket!.on('ORDER_UPDATED', (data) {
      debugPrint('🔔 Order Update Received: $data');
      _eventController.add({'event': SocketEvent.orderUpdated, 'data': data});
    });

    _socket!.on('SETTINGS_UPDATED', (data) {
      debugPrint('🔔 Settings Update Received: $data');
      _eventController.add({'event': SocketEvent.settingsUpdated, 'data': data});
    });
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _eventController.close();
  }
}
