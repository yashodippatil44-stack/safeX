import 'dart:async';
import 'package:flutter/material.dart';
import '../models/tourist.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import 'incident_report_screen.dart';
import 'tourist_map_screen.dart';

class TouristHomeScreen extends StatefulWidget {
  final TouristProfile? profile;

  const TouristHomeScreen({Key? key, this.profile}) : super(key: key);

  @override
  State<TouristHomeScreen> createState() => _TouristHomeScreenState();
}

class _TouristHomeScreenState extends State<TouristHomeScreen> {
  final LocationTrackingService _locService = LocationTrackingService();
  StreamSubscription? _sub;
  String _lastUpdatedText = 'Just now';
  Timer? _timer;
  Timer? _statusPollTimer;

  // Phase 3 State
  Map<String, dynamic>? _activeEmergency;
  bool _isLoadingEmergency = false;
  List<dynamic> _nearbyServices = [];
  bool _isLoadingServices = false;

  @override
  void initState() {
    super.initState();
    final touristId = widget.profile?.touristId ?? 'VX-TRV-0001';

    // Start battery-saving tracking engine
    _locService.startTracking(
      touristId,
      initialLat: widget.profile?.currentLatitude ?? 25.5788,
      initialLon: widget.profile?.currentLongitude ?? 91.8833,
    );

    _sub = _locService.statusStream.listen((status) {
      if (mounted) {
        setState(() {});
        if (status['notification'] != null) {
          final notif = status['notification'];
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: notif['severity'] == 'HIGH' ? const Color(0xFFDC2626) : const Color(0xFF0284C7),
              content: Text('${notif['title']}: ${notif['message']}'),
              duration: const Duration(seconds: 4),
            ),
          );
        }
      }
    });

    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted && _locService.lastUpdated != null) {
        final sec = DateTime.now().difference(_locService.lastUpdated!).inSeconds;
        setState(() {
          _lastUpdatedText = sec < 5 ? 'Just now' : '$sec seconds ago';
        });
      }
    });

    // Check for existing active emergency and nearby services
    _fetchActiveEmergency();
    _fetchNearbyServices();

    // Poll active emergency status every 6 seconds to update UI when police acknowledge/assign/resolve
    _statusPollTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      _fetchActiveEmergency();
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    _timer?.cancel();
    _statusPollTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchActiveEmergency() async {
    try {
      final res = await ApiService.getMyActiveEmergency();
      if (mounted && res['success'] == true) {
        final emergency = res['data'];
        setState(() {
          _activeEmergency = emergency;
        });

        if (emergency != null && emergency['status'] != 'RESOLVED' && emergency['status'] != 'CANCELLED') {
          _locService.setEmergencyMode(true);
        } else if (_locService.isEmergencyMode) {
          _locService.setEmergencyMode(false);
        }
      }
    } catch (_) {}
  }

  Future<void> _fetchNearbyServices() async {
    setState(() => _isLoadingServices = true);
    try {
      final list = await ApiService.getNearbyEmergencyServices(
        latitude: _locService.currentLatitude,
        longitude: _locService.currentLongitude,
      );
      if (mounted) {
        setState(() {
          _nearbyServices = list;
          _isLoadingServices = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingServices = false);
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

  // --- SOS DIALOG WORKFLOW ---

  void _onSOSPressed() {
    // Step 1: Confirmation Dialog
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F1E36),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 28),
            SizedBox(width: 10),
            Text('Emergency Assistance', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Are you sure you want to activate SOS?\n\nYour current location will be shared with authorized emergency responders.',
          style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('CANCEL', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _showEmergencyTypeSelectionDialog();
            },
            child: const Text('ACTIVATE SOS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showEmergencyTypeSelectionDialog() {
    String selectedType = 'MEDICAL';
    final messageController = TextEditingController();
    final List<Map<String, dynamic>> emergencyTypes = [
      {'type': 'MEDICAL', 'label': 'Medical', 'icon': Icons.local_hospital},
      {'type': 'POLICE', 'label': 'Police', 'icon': Icons.local_police},
      {'type': 'ACCIDENT', 'label': 'Accident', 'icon': Icons.car_crash},
      {'type': 'LOST', 'label': 'Lost', 'icon': Icons.explore_off},
      {'type': 'HARASSMENT', 'label': 'Harassment', 'icon': Icons.record_voice_over},
      {'type': 'OTHER', 'label': 'Other', 'icon': Icons.help_outline},
    ];

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF0F1E36),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'Select Emergency Type',
            style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: emergencyTypes.map((item) {
                    final isSel = selectedType == item['type'];
                    return ChoiceChip(
                      avatar: Icon(item['icon'] as IconData, size: 16, color: isSel ? Colors.white : const Color(0xFF94A3B8)),
                      label: Text(item['label'] as String),
                      selected: isSel,
                      selectedColor: const Color(0xFFDC2626),
                      backgroundColor: const Color(0xFF070B14),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                        color: isSel ? Colors.white : const Color(0xFFCBD5E1),
                      ),
                      side: BorderSide(color: isSel ? const Color(0xFFEF4444) : const Color(0xFF334155)),
                      onSelected: (selected) {
                        if (selected) setDialogState(() => selectedType = item['type']);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                const Text('Message / Description (Optional)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                const SizedBox(height: 6),
                TextField(
                  controller: messageController,
                  maxLines: 2,
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                  decoration: InputDecoration(
                    hintText: 'e.g., Injured leg, need medical assistance...',
                    hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    filled: true,
                    fillColor: const Color(0xFF070B14),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF334155)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFEF4444)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('CANCEL', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                Navigator.pop(ctx);
                await _submitSOS(selectedType, messageController.text.trim());
              },
              child: const Text('ACTIVATE EMERGENCY', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitSOS(String type, String message) async {
    setState(() => _isLoadingEmergency = true);
    try {
      final res = await ApiService.triggerSOS(
        type: type,
        latitude: _locService.currentLatitude,
        longitude: _locService.currentLongitude,
        accuracy: 10.0,
        message: message.isNotEmpty ? message : 'Immediate assistance requested',
        severity: 'HIGH',
      );

      setState(() => _isLoadingEmergency = false);

      if (res['success'] == true) {
        final emg = res['emergency'];
        setState(() {
          _activeEmergency = emg;
        });
        _locService.setEmergencyMode(true);

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFDC2626),
            content: Text('🚨 SOS Case Created: ${emg['emergencyId'] ?? 'Active'}. Responders notified!'),
            duration: const Duration(seconds: 5),
          ),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: const Color(0xFFDC2626), content: Text(res['error'] ?? 'Failed to trigger SOS')),
        );
      }
    } catch (e) {
      setState(() => _isLoadingEmergency = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: const Color(0xFFDC2626), content: Text('Error: $e')),
      );
    }
  }

  Future<void> _cancelSOS() async {
    if (_activeEmergency == null) return;
    final emgId = _activeEmergency!['id'] ?? _activeEmergency!['emergencyId'];

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F1E36),
        title: const Text('Cancel Emergency SOS?', style: TextStyle(color: Colors.white, fontSize: 16)),
        content: const Text(
          'Are you sure you wish to cancel this active emergency alert? Responders will stand down.',
          style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('NO', style: TextStyle(color: Colors.white70))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('YES, CANCEL', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final res = await ApiService.cancelSOS(emgId, reason: 'Cancelled by tourist');
      if (res['success'] == true) {
        setState(() {
          _activeEmergency = null;
        });
        _locService.setEmergencyMode(false);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(backgroundColor: Color(0xFF10B981), content: Text('Emergency alert cancelled successfully.')),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: const Color(0xFFDC2626), content: Text(res['error'] ?? 'Cancellation failed')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _showCallConfirmation(String name, String phone) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F1E36),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Row(
          children: [
            const Icon(Icons.phone_in_talk, color: Color(0xFF10B981), size: 24),
            const SizedBox(width: 8),
            const Text('Emergency Call', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Contact $name?', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF070B14),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                'Phone: $phone',
                style: const TextStyle(color: Color(0xFF38BDF8), fontFamily: 'monospace', fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 8),
            const Text('Direct telecommunication will launch your phone dialer.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL', style: TextStyle(color: Color(0xFF94A3B8)))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: const Color(0xFF0284C7),
                  content: Text('Connecting to $name ($phone)...'),
                ),
              );
            },
            child: const Text('DIAL NOW', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final touristName = widget.profile?.name ?? 'Yashodip Patil';
    final touristId = widget.profile?.touristId ?? 'VX-TRV-0001';
    final safetyStatus = _locService.safetyStatus;
    final currentZone = _locService.currentZone;
    final statusColor = _getStatusColor(safetyStatus);
    final isDanger = safetyStatus == 'HIGH_RISK' || safetyStatus == 'CRITICAL';
    final hasActiveEmergency = _activeEmergency != null &&
        _activeEmergency!['status'] != 'RESOLVED' &&
        _activeEmergency!['status'] != 'CANCELLED';

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E1626),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Good Day, $touristName',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Row(
              children: [
                const Icon(Icons.verified, size: 12, color: Color(0xFF10B981)),
                const SizedBox(width: 4),
                Text(
                  '$touristId • SafeX Verified',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.map_outlined, color: Color(0xFF06B6D4)),
            tooltip: 'Live Geo-Fence Radar',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const TouristMapScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.edit_note, color: Color(0xFF38BDF8)),
            tooltip: 'Report Incident',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const IncidentReportScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // DANGER ALERT BANNER (Shown when entering a danger zone)
            if (isDanger) ...[
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.18),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.6)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFF87171), size: 30),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            '⚠️ DANGER ZONE DETECTED',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFFCA5A5)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'You entered $currentZone. Steep terrain and hazard risk. Please return to a designated safe trail.',
                            style: const TextStyle(fontSize: 11, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Dynamic Safety Status Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F1E36), Color(0xFF13284A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: statusColor.withOpacity(0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'SAFETY SHIELD STATUS',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF38BDF8), letterSpacing: 0.8),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: statusColor.withOpacity(0.4)),
                        ),
                        child: Text(
                          safetyStatus,
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: 16, color: statusColor),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Zone: $currentZone',
                          style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.gps_fixed, size: 16, color: Color(0xFF06B6D4)),
                      const SizedBox(width: 6),
                      Text(
                        'Location: ${_locService.currentLatitude.toStringAsFixed(4)}, ${_locService.currentLongitude.toStringAsFixed(4)}',
                        style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.access_time, size: 16, color: Color(0xFF64748B)),
                      const SizedBox(width: 6),
                      Text(
                        'Last Updated: $_lastUpdatedText (Tracking: ${_locService.currentIntervalSeconds}s)',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // --- PHASE 3: ACTIVE SOS CARD / PROGRESS STEPPER ---
            if (hasActiveEmergency) ...[
              _buildActiveEmergencyCard(_activeEmergency!),
              const SizedBox(height: 20),
            ] else ...[
              // SOS Button (Prominent Emergency Trigger)
              Center(
                child: GestureDetector(
                  onTap: _onSOSPressed,
                  child: Container(
                    width: 170,
                    height: 170,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const RadialGradient(
                        colors: [Color(0xFFEF4444), Color(0xFFB91C1C)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFEF4444).withOpacity(0.4),
                          blurRadius: 30,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: Center(
                      child: _isLoadingEmergency
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.touch_app, size: 36, color: Colors.white),
                                SizedBox(height: 4),
                                Text(
                                  'SOS',
                                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 2),
                                ),
                                Text(
                                  'PRESS FOR HELP',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Incident Reporting Shortcut Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF0E1626),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0284C7).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.report_problem, color: Color(0xFF38BDF8), size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Witnessed an incident?', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                        SizedBox(height: 2),
                        Text('Log theft, scam, or safety hazard for police desk', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const IncidentReportScreen()),
                      );
                    },
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF38BDF8)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    ),
                    child: const Text('Report', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Demo Position Switcher Chips for Hackathon Testing
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF0E1626),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '⚡ Demo Location Teleporter (Test Geo-Fences)',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF38BDF8)),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            _locService.setCoordinates(25.5788, 91.8833);
                            _fetchNearbyServices();
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF10B981)),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                          child: const Text('📍 Safe Area', style: TextStyle(fontSize: 11, color: Color(0xFF34D399))),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            _locService.setCoordinates(25.2750, 91.7180);
                            _fetchNearbyServices();
                          },
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFFEF4444)),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                          child: const Text('⚠️ Danger Trail', style: TextStyle(fontSize: 11, color: Color(0xFFF87171))),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // --- PHASE 3: NEARBY EMERGENCY SERVICES ---
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Nearby Emergency Services',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, size: 18, color: Color(0xFF38BDF8)),
                  onPressed: _fetchNearbyServices,
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (_isLoadingServices) ...[
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0284C7)),
                ),
              ),
            ] else if (_nearbyServices.isEmpty) ...[
              const Padding(
                padding: EdgeInsets.all(12.0),
                child: Text('No verified services nearby', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              ),
            ] else ...[
              Column(
                children: _nearbyServices.take(4).map((service) => _buildDynamicServiceCard(service)).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // --- Active Emergency Card with Status Progress ---
  Widget _buildActiveEmergencyCard(Map<String, dynamic> emg) {
    final emgId = emg['emergencyId'] ?? emg['id'] ?? 'ACTIVE';
    final type = emg['type'] ?? 'EMERGENCY';
    final status = emg['status'] ?? 'NEW';
    final officer = emg['assignedOfficerName'];

    // Progress determination
    final isCreated = true;
    final isAck = status == 'ACKNOWLEDGED' || status == 'RESPONDER_ASSIGNED' || status == 'IN_PROGRESS' || status == 'RESOLVED';
    final isAssigned = status == 'RESPONDER_ASSIGNED' || status == 'IN_PROGRESS' || status == 'RESOLVED';
    final isStarted = status == 'IN_PROGRESS' || status == 'RESOLVED';
    final isResolved = status == 'RESOLVED';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF1F1115),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEF4444), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFEF4444).withOpacity(0.2),
            blurRadius: 15,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('🚨', style: TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                  Text(
                    'EMERGENCY ACTIVE',
                    style: const TextStyle(
                      color: Color(0xFFF87171),
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  status,
                  style: const TextStyle(color: Color(0xFFFCA5A5), fontWeight: FontWeight.bold, fontSize: 10),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text('Emergency ID: $emgId', style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 4),
          Row(
            children: [
              Text('Type: $type', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
              const SizedBox(width: 12),
              const Text('• Tracking: ACTIVE (30s interval)', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          if (emg['message'] != null && emg['message'].toString().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Message: "${emg['message']}"', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontStyle: FontStyle.italic)),
          ],

          const SizedBox(height: 16),
          const Divider(color: Color(0xFF451A22), height: 1),
          const SizedBox(height: 14),

          // Response Status Stepper
          _buildProgressStep('Emergency Created', isCreated, true),
          _buildProgressStep('Police Acknowledged', isAck, isCreated),
          _buildProgressStep(
            officer != null ? 'Responder: $officer' : 'Responder Assigned',
            isAssigned,
            isAck,
          ),
          _buildProgressStep(
            isStarted ? 'Help is on the way.' : 'Response Started',
            isStarted,
            isAssigned,
          ),
          _buildProgressStep('Emergency Resolved', isResolved, isStarted),

          const SizedBox(height: 16),
          if (!isResolved)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _cancelSOS,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFEF4444)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                child: const Text('CANCEL SOS', style: TextStyle(color: Color(0xFFF87171), fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildProgressStep(String label, bool isDone, bool isParentDone) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            isDone ? Icons.check_circle : (isParentDone ? Icons.radio_button_unchecked : Icons.radio_button_off),
            size: 16,
            color: isDone ? const Color(0xFF10B981) : (isParentDone ? const Color(0xFFFBBF24) : const Color(0xFF64748B)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
                color: isDone ? Colors.white : (isParentDone ? const Color(0xFFCBD5E1) : const Color(0xFF64748B)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- Dynamic Emergency Service Card ---
  Widget _buildDynamicServiceCard(Map<String, dynamic> service) {
    final type = service['type'] ?? 'POLICE';
    final name = service['name'] ?? 'Emergency Service';
    final distanceMeters = service['distanceMeters'] ?? 0;
    final phone = service['phone'] ?? '+91-364-2222222';

    IconData icon;
    Color iconColor;
    String distanceStr = distanceMeters > 1000
        ? '${(distanceMeters / 1000).toStringAsFixed(1)} km'
        : '$distanceMeters m';

    if (type == 'POLICE') {
      icon = Icons.local_police;
      iconColor = const Color(0xFF3B82F6);
    } else if (type == 'HOSPITAL') {
      icon = Icons.local_hospital;
      iconColor = const Color(0xFFEF4444);
    } else {
      icon = Icons.hotel;
      iconColor = const Color(0xFF10B981);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0E1626),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(distanceStr, style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 6),
                    Text('• $phone', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                  ],
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => _showCallConfirmation(name, phone),
            style: ElevatedButton.styleFrom(
              backgroundColor: type == 'HOTEL' ? const Color(0xFF0F766E) : const Color(0xFF1E3A8A),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(
              type == 'HOTEL' ? 'VIEW' : 'CALL',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }
}
