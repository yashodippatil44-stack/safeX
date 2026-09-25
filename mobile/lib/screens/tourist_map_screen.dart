import 'package:flutter/material.dart';
import '../services/location_service.dart';
import '../services/api_service.dart';

class TouristMapScreen extends StatefulWidget {
  const TouristMapScreen({Key? key}) : super(key: key);

  @override
  State<TouristMapScreen> createState() => _TouristMapScreenState();
}

class _TouristMapScreenState extends State<TouristMapScreen> {
  final LocationTrackingService _locService = LocationTrackingService();
  List<dynamic> _geoFences = [];
  bool _loadingFences = true;

  @override
  void initState() {
    super.initState();
    _fetchFences();
  }

  Future<void> _fetchFences() async {
    final fences = await ApiService.getGeoFences();
    if (mounted) {
      setState(() {
        _geoFences = fences;
        _loadingFences = false;
      });
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'CRITICAL':
      case 'HIGH_RISK':
        return const Color(0xFFEF4444);
      case 'CAUTION':
        return const Color(0xFFF59E0B);
      case 'SAFE':
      default:
        return const Color(0xFF10B981);
    }
  }

  Color _getZoneColor(String type) {
    switch (type) {
      case 'DANGER_ZONE':
        return const Color(0xFFEF4444);
      case 'RESTRICTED_ZONE':
        return const Color(0xFFF59E0B);
      case 'TOURIST_ZONE':
        return const Color(0xFF06B6D4);
      case 'SAFE_ZONE':
      default:
        return const Color(0xFF10B981);
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(_locService.safetyStatus);
    final isDanger = _locService.safetyStatus == 'HIGH_RISK' || _locService.safetyStatus == 'CRITICAL';

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E1626),
        elevation: 0,
        title: const Text('Live Geo-Fence Radar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF06B6D4)),
            onPressed: () {
              setState(() => _loadingFences = true);
              _fetchFences();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // YOU ARE HERE Status Banner
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: statusColor.withOpacity(0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.my_location, color: statusColor, size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'YOU ARE HERE',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.8, color: Colors.white),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _locService.safetyStatus,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _locService.currentZone,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'GPS: ${_locService.currentLatitude.toStringAsFixed(4)}° N, ${_locService.currentLongitude.toStringAsFixed(4)}° E',
                    style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: Color(0xFF94A3B8)),
                  ),
                  if (isDanger) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Color(0xFFFCA5A5), size: 16),
                          SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Warning: You have entered a high-risk zone. Follow marked signs to return to safe haven.',
                              style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Visual Radar Canvas / Representation
            Container(
              height: 220,
              decoration: BoxDecoration(
                color: const Color(0xFF0E1626),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Concentric radar circles
                  for (int r = 1; r <= 3; r++)
                    Container(
                      width: r * 65.0,
                      height: r * 65.0,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF06B6D4).withOpacity(0.15)),
                      ),
                    ),
                  // User Beacon Center
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: statusColor,
                      boxShadow: [
                        BoxShadow(
                          color: statusColor.withOpacity(0.5),
                          blurRadius: 15,
                          spreadRadius: 3,
                        ),
                      ],
                    ),
                    child: const Icon(Icons.person_pin_circle, size: 16, color: Colors.white),
                  ),
                  Positioned(
                    bottom: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Dynamic Battery-Saving Interval: ${_locService.currentIntervalSeconds}s',
                        style: const TextStyle(fontSize: 10, color: Color(0xFF38BDF8), fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Active Monitored Geo-Fences List
            const Text(
              'Active Geo-Fence Zones',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
            ),
            const SizedBox(height: 12),

            if (_loadingFences)
              const Center(child: CircularProgressIndicator())
            else
              Column(
                children: _geoFences.map((fence) {
                  final color = _getZoneColor(fence['type'] ?? '');
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0E1626),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: color.withOpacity(0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          margin: const EdgeInsets.only(top: 4, right: 12),
                          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                fence['name'] ?? 'Zone',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${fence['type']?.replaceAll('_', ' ')} • Radius: ${fence['radius']}m • Risk: ${fence['riskLevel']}',
                                style: TextStyle(fontSize: 11, color: color),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                fence['description'] ?? '',
                                style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }
}
