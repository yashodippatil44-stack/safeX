// Tracking Intervals in Seconds and Milliseconds
const TRACKING_INTERVALS = {
  NORMAL: {
    seconds: 300, // 5 minutes
    milliseconds: 300 * 1000,
    label: 'Normal (Battery Saving)'
  },
  MEDIUM: {
    seconds: 120, // 2 minutes
    milliseconds: 120 * 1000,
    label: 'Medium Caution'
  },
  HIGH: {
    seconds: 30, // 30 seconds
    milliseconds: 30 * 1000,
    label: 'High Risk'
  },
  EMERGENCY: {
    seconds: 30, // 30 seconds
    milliseconds: 30 * 1000,
    label: 'Emergency / SOS Active'
  }
};

/**
 * Returns recommended tracking interval based on tourist safety status and risk level
 * @param {string} safetyStatus - 'SAFE' | 'CAUTION' | 'HIGH_RISK' | 'CRITICAL'
 * @param {string} riskLevel - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 * @returns {object} { tier, seconds, milliseconds, label }
 */
function getTrackingInterval(safetyStatus = 'SAFE', riskLevel = 'LOW') {
  if (safetyStatus === 'CRITICAL' || riskLevel === 'CRITICAL') {
    return { tier: 'EMERGENCY', ...TRACKING_INTERVALS.EMERGENCY };
  }
  if (safetyStatus === 'HIGH_RISK' || riskLevel === 'HIGH') {
    return { tier: 'HIGH', ...TRACKING_INTERVALS.HIGH };
  }
  if (safetyStatus === 'CAUTION' || riskLevel === 'MEDIUM') {
    return { tier: 'MEDIUM', ...TRACKING_INTERVALS.MEDIUM };
  }
  return { tier: 'NORMAL', ...TRACKING_INTERVALS.NORMAL };
}

module.exports = {
  TRACKING_INTERVALS,
  getTrackingInterval
};
