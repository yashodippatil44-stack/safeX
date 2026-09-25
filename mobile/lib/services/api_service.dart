import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/tourist.dart';

class ApiService {
  // Use 10.0.2.2 for Android emulator, localhost for Web/Desktop/iOS
  static String baseUrl = 'http://10.0.2.2:5000/api';
  static String? authToken;

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static Map<String, String> _headers() {
    return {
      'Content-Type': 'application/json',
      if (authToken != null) 'Authorization': 'Bearer $authToken',
    };
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final url = Uri.parse('$baseUrl/auth/login');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        authToken = data['data']['token'];
        return {
          'success': true,
          'user': data['data']['user'],
          'profile': data['data']['touristProfile'] != null
              ? TouristProfile.fromJson(data['data']['touristProfile'])
              : null,
          'token': authToken,
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Login failed',
        };
      }
    } catch (e) {
      return {'success': false, 'error': 'Network connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    required String phone,
    required String emergencyContactName,
    required String emergencyContactPhone,
  }) async {
    final url = Uri.parse('$baseUrl/auth/register');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name,
          'email': email,
          'password': password,
          'phone': phone,
          'role': 'TOURIST',
          'emergencyContactName': emergencyContactName,
          'emergencyContactPhone': emergencyContactPhone,
        }),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 && data['success'] == true) {
        authToken = data['data']['token'];
        return {
          'success': true,
          'profile': TouristProfile.fromJson(data['data']['touristProfile']),
          'token': authToken,
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Registration failed',
        };
      }
    } catch (e) {
      return {'success': false, 'error': 'Network connection error: $e'};
    }
  }

  static Future<Map<String, dynamic>> updateLocation({
    required String touristId,
    required double latitude,
    required double longitude,
    double accuracy = 10.0,
    double speed = 0.0,
  }) async {
    final url = Uri.parse('$baseUrl/location/update');
    try {
      final response = await http.post(
        url,
        headers: _headers(),
        body: jsonEncode({
          'touristId': touristId,
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': accuracy,
          'speed': speed,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'data': data['data'],
        };
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Location update failed',
        };
      }
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getSafetyStatus({String? touristId}) async {
    final uri = Uri.parse('$baseUrl/tourist/safety-status${touristId != null ? '?touristId=$touristId' : ''}');
    try {
      final response = await http.get(uri, headers: _headers());
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Failed to get safety status'};
      }
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<List<dynamic>> getGeoFences() async {
    final url = Uri.parse('$baseUrl/geofences');
    try {
      final response = await http.get(url, headers: _headers());
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return data['data'] as List<dynamic>;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<List<dynamic>> getNotifications() async {
    final url = Uri.parse('$baseUrl/notifications');
    try {
      final response = await http.get(url, headers: _headers());
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return data['data'] as List<dynamic>;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // --- PHASE 3: EMERGENCY & SOS ---
  static Future<Map<String, dynamic>> triggerSOS({
    required String type,
    required double latitude,
    required double longitude,
    double accuracy = 10.0,
    String? message,
    String severity = 'HIGH',
  }) async {
    final url = Uri.parse('$baseUrl/emergency/sos');
    try {
      final response = await http.post(
        url,
        headers: _headers(),
        body: jsonEncode({
          'type': type,
          'latitude': latitude,
          'longitude': longitude,
          'accuracy': accuracy,
          'message': message,
          'severity': severity,
        }),
      );
      final data = jsonDecode(response.body);
      if ((response.statusCode == 200 || response.statusCode == 201) && data['success'] == true) {
        return {'success': true, 'emergency': data['data']?['emergency'] ?? data['data']};
      }
      return {'success': false, 'error': data['error'] ?? 'SOS creation failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> cancelSOS(String emergencyId, {String? reason}) async {
    final url = Uri.parse('$baseUrl/emergency/$emergencyId/cancel');
    try {
      final response = await http.post(
        url,
        headers: _headers(),
        body: jsonEncode({'reason': reason ?? 'Cancelled by tourist'}),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {'success': true, 'data': data['data']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to cancel SOS'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getMyActiveEmergency() async {
    final url = Uri.parse('$baseUrl/emergency/my-active');
    try {
      final response = await http.get(url, headers: _headers());
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {'success': true, 'data': data['data']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to get active emergency'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<Map<String, dynamic>> getEmergencyDetails(String emergencyId) async {
    final url = Uri.parse('$baseUrl/emergency/$emergencyId');
    try {
      final response = await http.get(url, headers: _headers());
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return {'success': true, 'data': data['data']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to get emergency details'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  // --- PHASE 3: INCIDENT REPORTING ---
  static Future<Map<String, dynamic>> createIncident({
    required String type,
    required String description,
    required double latitude,
    required double longitude,
    String severity = 'MEDIUM',
    List<String> photos = const [],
  }) async {
    final url = Uri.parse('$baseUrl/incidents');
    try {
      final response = await http.post(
        url,
        headers: _headers(),
        body: jsonEncode({
          'type': type,
          'description': description,
          'latitude': latitude,
          'longitude': longitude,
          'severity': severity,
          'photos': photos,
        }),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 201 && data['success'] == true) {
        return {'success': true, 'incident': data['data']};
      }
      return {'success': false, 'error': data['error'] ?? 'Incident reporting failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  static Future<List<dynamic>> getIncidents() async {
    final url = Uri.parse('$baseUrl/incidents');
    try {
      final response = await http.get(url, headers: _headers());
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return data['data'] as List<dynamic>;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // --- PHASE 3: NEARBY EMERGENCY SERVICES ---
  static Future<List<dynamic>> getNearbyEmergencyServices({
    required double latitude,
    required double longitude,
    String? type,
  }) async {
    final queryParams = {
      'latitude': latitude.toString(),
      'longitude': longitude.toString(),
      if (type != null) 'type': type,
    };
    final uri = Uri.parse('$baseUrl/emergency-services/nearby').replace(queryParameters: queryParams);
    try {
      final response = await http.get(uri, headers: _headers());
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return data['data'] as List<dynamic>;
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
