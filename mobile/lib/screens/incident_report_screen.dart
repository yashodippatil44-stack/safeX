import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';

class IncidentReportScreen extends StatefulWidget {
  const IncidentReportScreen({Key? key}) : super(key: key);

  @override
  State<IncidentReportScreen> createState() => _IncidentReportScreenState();
}

class _IncidentReportScreenState extends State<IncidentReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descController = TextEditingController();
  final LocationTrackingService _locService = LocationTrackingService();

  String _selectedType = 'THEFT';
  String _selectedSeverity = 'MEDIUM';
  bool _isSubmitting = false;

  final List<Map<String, dynamic>> _incidentTypes = [
    {'type': 'THEFT', 'label': 'Theft / Stolen Item', 'icon': Icons.lock_open},
    {'type': 'HARASSMENT', 'label': 'Harassment / Stalking', 'icon': Icons.record_voice_over},
    {'type': 'ACCIDENT', 'label': 'Road or Trail Accident', 'icon': Icons.car_crash},
    {'type': 'MISSING_PERSON', 'label': 'Missing Person', 'icon': Icons.person_search},
    {'type': 'FRAUD', 'label': 'Tourist Scam / Fraud', 'icon': Icons.monetization_on},
    {'type': 'SAFETY_CONCERN', 'label': 'Safety / Hazard Concern', 'icon': Icons.warning_amber},
    {'type': 'OTHER', 'label': 'Other Incident', 'icon': Icons.more_horiz},
  ];

  final List<String> _severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  Color _getSeverityColor(String sev) {
    switch (sev) {
      case 'CRITICAL':
        return const Color(0xFFEF4444);
      case 'HIGH':
        return const Color(0xFFF97316);
      case 'MEDIUM':
        return const Color(0xFFFBBF24);
      case 'LOW':
      default:
        return const Color(0xFF10B981);
    }
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final res = await ApiService.createIncident(
        type: _selectedType,
        description: _descController.text.trim(),
        latitude: _locService.currentLatitude,
        longitude: _locService.currentLongitude,
        severity: _selectedSeverity,
        photos: [], // Ready for future image upload pipeline
      );

      setState(() => _isSubmitting = false);

      if (res['success'] == true) {
        final incident = res['incident'];
        if (!mounted) return;

        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF0F1E36),
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF10B981), size: 28),
                SizedBox(width: 10),
                Text('Report Filed', style: TextStyle(color: Colors.white, fontSize: 18)),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Your incident has been dispatched to the Tourist Police Command Desk.',
                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 13),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B14),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Incident ID: ${incident['incidentId'] ?? 'VX-INC-NEW'}',
                        style: const TextStyle(
                          color: Color(0xFF38BDF8),
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Status: ${incident['status'] ?? 'REPORTED'}',
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                },
                child: const Text('OK', style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFFDC2626),
            content: Text(res['error'] ?? 'Failed to file incident report'),
          ),
        );
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: const Color(0xFFDC2626), content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E1626),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Report an Incident', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            Text('Non-immediate incident logging for police desk', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Info Banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Color(0xFF38BDF8), size: 22),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'For active life-threatening emergencies, please use the SOS button on Home.',
                        style: TextStyle(color: Color(0xFFE2E8F0), fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Incident Type Selection
              const Text(
                'INCIDENT TYPE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8), letterSpacing: 0.8),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _incidentTypes.map((item) {
                  final isSelected = _selectedType == item['type'];
                  return ChoiceChip(
                    avatar: Icon(item['icon'] as IconData, size: 16, color: isSelected ? Colors.white : const Color(0xFF94A3B8)),
                    label: Text(item['label'] as String),
                    selected: isSelected,
                    selectedColor: const Color(0xFF0284C7),
                    backgroundColor: const Color(0xFF0E1626),
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? Colors.white : const Color(0xFFCBD5E1),
                    ),
                    side: BorderSide(color: isSelected ? const Color(0xFF38BDF8) : const Color(0xFF334155)),
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedType = item['type']);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Severity Selector
              const Text(
                'INCIDENT SEVERITY',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8), letterSpacing: 0.8),
              ),
              const SizedBox(height: 10),
              Row(
                children: _severities.map((sev) {
                  final isSelected = _selectedSeverity == sev;
                  final color = _getSeverityColor(sev);
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: InkWell(
                        onTap: () => setState(() => _selectedSeverity = sev),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected ? color.withValues(alpha: 0.2) : const Color(0xFF0E1626),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: isSelected ? color : const Color(0xFF334155), width: isSelected ? 2 : 1),
                          ),
                          child: Center(
                            child: Text(
                              sev,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? color : const Color(0xFF94A3B8),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Location details (auto-populated)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF0E1626),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.gps_fixed, color: Color(0xFF06B6D4), size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Captured GPS Coordinates', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                          const SizedBox(height: 2),
                          Text(
                            '${_locService.currentLatitude.toStringAsFixed(5)}, ${_locService.currentLongitude.toStringAsFixed(5)} (${_locService.currentZone})',
                            style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Description
              const Text(
                'DESCRIPTION & PARTICULARS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8), letterSpacing: 0.8),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descController,
                maxLines: 4,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Describe what occurred, any witnesses, vehicle numbers, or loss details...',
                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  filled: true,
                  fillColor: const Color(0xFF0E1626),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF0284C7)),
                  ),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Please provide an incident description';
                  }
                  if (val.trim().length < 10) {
                    return 'Description must be at least 10 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Photos / Evidence Placeholder (Structured for future attachments)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0E1626),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155), style: BorderStyle.solid),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.add_photo_alternate_outlined, color: Color(0xFF94A3B8), size: 26),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Evidence Photos (Optional)', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          SizedBox(height: 2),
                          Text('Camera & gallery upload ready for next phase', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Attachment storage enabled for Phase 4 / future update')),
                        );
                      },
                      child: const Text('Add', style: TextStyle(color: Color(0xFF38BDF8))),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Submit Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitReport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'SUBMIT INCIDENT REPORT',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5, color: Colors.white),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
