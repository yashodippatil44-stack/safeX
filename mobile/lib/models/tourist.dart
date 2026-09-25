class TouristProfile {
  final String id;
  final String touristId;
  final String name;
  final String email;
  final String phone;
  final String country;
  final String emergencyContactName;
  final String emergencyContactPhone;
  final String digitalIdHash;
  final String blockchainTxId;
  final String verificationStatus;
  final String safetyStatus;
  final String riskLevel;
  final double currentLatitude;
  final double currentLongitude;

  TouristProfile({
    required this.id,
    required this.touristId,
    required this.name,
    required this.email,
    required this.phone,
    required this.country,
    required this.emergencyContactName,
    required this.emergencyContactPhone,
    required this.digitalIdHash,
    required this.blockchainTxId,
    required this.verificationStatus,
    required this.safetyStatus,
    required this.riskLevel,
    required this.currentLatitude,
    required this.currentLongitude,
  });

  factory TouristProfile.fromJson(Map<String, dynamic> json) {
    return TouristProfile(
      id: json['id'] ?? '',
      touristId: json['touristId'] ?? 'VX-TRV-0000',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      country: json['country'] ?? 'India',
      emergencyContactName: json['emergencyContactName'] ?? '',
      emergencyContactPhone: json['emergencyContactPhone'] ?? '',
      digitalIdHash: json['digitalIdHash'] ?? '',
      blockchainTxId: json['blockchainTxId'] ?? '',
      verificationStatus: json['verificationStatus'] ?? 'AUTHENTIC',
      safetyStatus: json['safetyStatus'] ?? 'SAFE',
      riskLevel: json['currentRiskLevel'] ?? 'LOW',
      currentLatitude: (json['currentLatitude'] as num?)?.toDouble() ?? 25.5788,
      currentLongitude: (json['currentLongitude'] as num?)?.toDouble() ?? 91.8833,
    );
  }
}
