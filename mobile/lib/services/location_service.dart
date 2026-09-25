import 'dart:async';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

enum TrackingTier {
  normal,    // 5 minutes (300s)
  medium,    // 2 minutes (120s)
  high,      // 30 seconds
  emergency  // 30 seconds
}

class LocationTrackingService {
  static final LocationTrackingService _instance = LocationTrackingService._internal();
  factory LocationTrackingService() => _instance;
  LocationTrackingService._internal();

  Timer? _trackingTimer;
  bool _isTracking = false;
  String? _touristId;

  // Configurable tracking intervals in seconds
  static const Map<TrackingTier, int> tierIntervalsSeconds = {
    TrackingTier.normal: 300,
    TrackingTier.medium: 120,
    TrackingTier.high: 30,
    TrackingTier.emergency: 30,
  };

  TrackingTier _currentTier = TrackingTier.normal;
  int _currentIntervalSeconds = 300;
  bool _emergencyModeActive = false;

  // Current coordinates (defaults to Shillong Tourist Corridor demo fallback if GPS ungranted)
  double currentLatitude = 25.5788;
  double currentLongitude = 91.8833;
  String currentZone = 'Safe Tourist Area';
  String safetyStatus = 'SAFE';
  String riskLevel = 'LOW';
  DateTime? lastUpdated;

  // Stream controller for UI listeners
  final _statusController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get statusStream => _statusController.stream;

  bool get isTracking => _isTracking;
  int get currentIntervalSeconds => _currentIntervalSeconds;
  bool get isEmergencyMode => _emergencyModeActive;

  void setEmergencyMode(bool active) {
    _emergencyModeActive = active;
    if (active) {
      _currentTier = TrackingTier.emergency;
      _currentIntervalSeconds = 30;
      debugPrint('[LocationService] EMERGENCY MODE ACTIVE: Interval locked to 30 seconds');
      _sendLocationPing();
      _scheduleNextPing();
    } else {
      debugPrint('[LocationService] Emergency mode cleared. Returning to dynamic interval.');
      _adjustInterval(safetyStatus, riskLevel);
      _scheduleNextPing();
    }
  }

  void startTracking(String touristId, {double? initialLat, double? initialLon}) {
    if (_isTracking && _touristId == touristId) return;

    _touristId = touristId;
    if (initialLat != null) currentLatitude = initialLat;
    if (initialLon != null) currentLongitude = initialLon;
    _isTracking = true;

    // Trigger immediate ping
    _sendLocationPing();

    _scheduleNextPing();
    debugPrint('[LocationService] Tracking started for $touristId at ${_currentIntervalSeconds}s interval');
  }

  void _scheduleNextPing() {
    _trackingTimer?.cancel();
    if (!_isTracking) return;

    _trackingTimer = Timer(Duration(seconds: _currentIntervalSeconds), () async {
      await _sendLocationPing();
      _scheduleNextPing();
    });
  }

  Future<void> _sendLocationPing() async {
    if (_touristId == null || !_isTracking) return;

    try {
      final res = await ApiService.updateLocation(
        touristId: _touristId!,
        latitude: currentLatitude,
        longitude: currentLongitude,
      );

      if (res['success'] == true) {
        final data = res['data'];
        safetyStatus = data['safetyStatus'] ?? 'SAFE';
        riskLevel = data['riskLevel'] ?? 'LOW';
        currentZone = data['currentZone']?['name'] ?? 'Open Region';
        lastUpdated = DateTime.now();

        // Adjust tracking interval based on safety tier from backend (if not in emergency mode)
        if (!_emergencyModeActive) {
          _adjustInterval(safetyStatus, riskLevel);
        }

        _statusController.add({
          'safetyStatus': safetyStatus,
          'riskLevel': riskLevel,
          'currentZone': currentZone,
          'latitude': currentLatitude,
          'longitude': currentLongitude,
          'intervalSeconds': _currentIntervalSeconds,
          'emergencyMode': _emergencyModeActive,
          'notification': data['notification'],
          'lastUpdated': lastUpdated,
        });
      }
    } catch (e) {
      debugPrint('[LocationService] Ping failed: $e');
    }
  }

  void _adjustInterval(String status, String risk) {
    if (_emergencyModeActive) {
      _currentTier = TrackingTier.emergency;
      _currentIntervalSeconds = 30;
      return;
    }

    TrackingTier newTier;

    if (status == 'CRITICAL' || risk == 'CRITICAL') {
      newTier = TrackingTier.emergency;
    } else if (status == 'HIGH_RISK' || risk == 'HIGH') {
      newTier = TrackingTier.high;
    } else if (status == 'CAUTION' || risk == 'MEDIUM') {
      newTier = TrackingTier.medium;
    } else {
      newTier = TrackingTier.normal;
    }

    if (newTier != _currentTier) {
      _currentTier = newTier;
      _currentIntervalSeconds = tierIntervalsSeconds[newTier]!;
      debugPrint('[LocationService] Dynamic interval adjusted to $_currentTier (${_currentIntervalSeconds}s)');
    }
  }

  /// Manually update position (e.g. for GPS telemetry or Hackathon Demo teleporter)
  void setCoordinates(double lat, double lon) {
    currentLatitude = lat;
    currentLongitude = lon;
    _sendLocationPing();
  }

  void stopTracking() {
    _trackingTimer?.cancel();
    _isTracking = false;
    _touristId = null;
    debugPrint('[LocationService] Tracking stopped.');
  }

  void dispose() {
    stopTracking();
    _statusController.close();
  }
}
