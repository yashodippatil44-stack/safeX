import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ShieldAlert, Compass, RefreshCw, AlertTriangle, Layers, MapPin } from 'lucide-react';
import api from '../services/api';

// Zone colors
const ZONE_COLORS = {
  SAFE_ZONE: { stroke: '#10B981', fill: '#10B981', label: 'Safe Zone' },
  TOURIST_ZONE: { stroke: '#06B6D4', fill: '#06B6D4', label: 'Tourist Zone' },
  RESTRICTED_ZONE: { stroke: '#F59E0B', fill: '#F59E0B', label: 'Restricted Forest' },
  DANGER_ZONE: { stroke: '#EF4444', fill: '#EF4444', label: 'Hazard Zone' }
};

export default function LiveMap({ setActiveTab }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const fencesLayerRef = useRef(null);
  const emergenciesLayerRef = useRef(null);

  const [tourists, setTourists] = useState([]);
  const [geoFences, setGeoFences] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState('');

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center around Shillong / Meghalaya tourist corridor
    const map = L.map(mapContainerRef.current, {
      center: [25.5788, 91.8833],
      zoom: 12,
      zoomControl: true
    });

    // Dark high-contrast OpenStreetMap tiles for cybersecurity command center look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    fencesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    emergenciesLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Fetch Geo-Fences, Fleet, and Emergencies
  async function loadMapData() {
    try {
      const [fencesRes, fleetRes, emgRes] = await Promise.all([
        api.getGeoFences(),
        api.getFleet(),
        api.getEmergencyQueue()
      ]);

      if (fencesRes.success) setGeoFences(fencesRes.data);
      if (fleetRes.success) setTourists(fleetRes.data);
      if (emgRes.success) {
        // Filter active emergencies
        const active = emgRes.data.filter(e => e.status !== 'RESOLVED' && e.status !== 'CANCELLED');
        setEmergencies(active);
      }
    } catch (err) {
      console.error('Failed to load map data:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMapData();
    // Poll every 6 seconds as per Section 15
    const interval = setInterval(loadMapData, 6000);
    return () => clearInterval(interval);
  }, []);

  // 3. Render Geo-Fence Circles
  useEffect(() => {
    if (!mapInstanceRef.current || !fencesLayerRef.current) return;
    fencesLayerRef.current.clearLayers();

    geoFences.forEach(fence => {
      const style = ZONE_COLORS[fence.type] || ZONE_COLORS.SAFE_ZONE;
      const circle = L.circle([fence.latitude, fence.longitude], {
        radius: fence.radius,
        color: style.stroke,
        fillColor: style.fill,
        fillOpacity: fence.type === 'DANGER_ZONE' ? 0.35 : 0.2,
        weight: fence.type === 'DANGER_ZONE' ? 3 : 2,
        dashArray: fence.type === 'RESTRICTED_ZONE' ? '6, 6' : undefined
      });

      circle.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; color: #0F172A; min-width: 200px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: ${style.stroke};">
            ${fence.name}
          </div>
          <div style="font-size: 11px; margin-bottom: 6px;">
            <strong>Type:</strong> ${fence.type.replace('_', ' ')} • <strong>Risk:</strong> ${fence.riskLevel}
          </div>
          <div style="font-size: 11px; color: #475569;">
            Radius: ${fence.radius}m • Coordinates: ${fence.latitude.toFixed(4)}, ${fence.longitude.toFixed(4)}
          </div>
          <div style="font-size: 11px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            ${fence.description || 'Monitored area'}
          </div>
        </div>
      `);

      fencesLayerRef.current.addLayer(circle);
    });
  }, [geoFences]);

  // 4. Render Tourist Fleet Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    tourists.forEach(tourist => {
      const isCritical = tourist.safetyStatus === 'CRITICAL' || tourist.riskLevel === 'CRITICAL';
      const isHigh = tourist.safetyStatus === 'HIGH_RISK' || tourist.riskLevel === 'HIGH';
      const isCaution = tourist.safetyStatus === 'CAUTION' || tourist.riskLevel === 'MEDIUM';

      const color = isCritical || isHigh ? '#EF4444' : isCaution ? '#F59E0B' : '#10B981';
      const pulseClass = isCritical || isHigh ? 'pulse-danger' : 'pulse-safe';

      // Custom HTML Marker with radar pulse
      const icon = L.divIcon({
        className: 'custom-tourist-marker',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: ${color};
              opacity: 0.3;
              animation: ${pulseClass} 1.8s infinite;
            "></div>
            <div style="
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #090D16;
              border: 3px solid ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 10px ${color};
              z-index: 2;
            ">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
            </div>
            <div style="
              position: absolute;
              top: -18px;
              white-space: nowrap;
              background: rgba(14, 22, 38, 0.9);
              border: 1px solid ${color};
              color: #F8FAFC;
              font-size: 10px;
              font-weight: 700;
              padding: 1px 6px;
              border-radius: 4px;
            ">
              ${tourist.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([tourist.latitude, tourist.longitude], { icon });

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; color: #0F172A; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-family: monospace; font-size: 11px; background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
              ${tourist.touristId}
            </span>
            <span style="font-size: 10px; font-weight: 700; color: ${color}; padding: 2px 6px; background: ${color}20; border-radius: 4px;">
              ${tourist.safetyStatus}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">
            ${tourist.name}
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 8px;">
            Current Sector: <strong>${tourist.currentZoneName || 'General Route'}</strong>
          </div>
          <div style="font-size: 11px; background: #F1F5F9; padding: 6px; border-radius: 6px;">
            <div>GPS: ${tourist.latitude.toFixed(4)}° N, ${tourist.longitude.toFixed(4)}° E</div>
            <div>Risk Tier: <strong>${tourist.riskLevel}</strong></div>
          </div>
        </div>
      `);

      marker.on('click', () => setSelectedTourist(tourist));
      markersLayerRef.current.addLayer(marker);
    });
  }, [tourists]);

  // 5. Render Active Emergency SOS Markers (Phase 3 Requirement)
  useEffect(() => {
    if (!mapInstanceRef.current || !emergenciesLayerRef.current) return;
    emergenciesLayerRef.current.clearLayers();

    emergencies.forEach(emg => {
      const emgIcon = L.divIcon({
        className: 'custom-emergency-marker',
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="
              position: absolute;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background: rgba(239, 68, 68, 0.45);
              animation: pulse-danger 1.1s infinite;
            "></div>
            <div style="
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: #EF4444;
              border: 2px solid #FFFFFF;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 15px;
              box-shadow: 0 0 16px rgba(239, 68, 68, 0.9);
              z-index: 4;
            ">
              🚨
            </div>
            <div style="
              position: absolute;
              bottom: -16px;
              white-space: nowrap;
              background: #DC2626;
              color: #FFFFFF;
              font-size: 9px;
              font-weight: 800;
              padding: 1px 6px;
              border-radius: 3px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            ">
              SOS: ${emg.type}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([emg.latitude, emg.longitude], { icon: emgIcon });

      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; color: #0F172A; min-width: 230px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-family: monospace; font-size: 11px; background: #FEE2E2; color: #DC2626; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
              ${emg.emergencyId}
            </span>
            <span style="font-size: 10px; font-weight: 700; color: #DC2626; background: rgba(239, 68, 68, 0.15); padding: 2px 6px; border-radius: 4px;">
              ${emg.status}
            </span>
          </div>
          <div style="font-weight: 800; font-size: 15px; color: #B91C1C; margin-bottom: 2px;">
            🚨 ${emg.type} EMERGENCY
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #1E293B;">
            Tourist: ${emg.touristName} (${emg.touristId})
          </div>
          ${emg.touristMessage ? `<div style="font-size: 11px; color: #475569; margin: 6px 0; font-style: italic; background: #F1F5F9; padding: 6px; border-radius: 4px;">"${emg.touristMessage}"</div>` : ''}
          <div style="font-size: 11px; color: #64748B; margin-top: 6px;">
            GPS: ${emg.latitude.toFixed(4)}° N, ${emg.longitude.toFixed(4)}° E
          </div>
          <div style="margin-top: 8px; font-size: 11px; color: #0284C7; font-weight: 600;">
            Assigned: ${emg.assignedOfficerName || 'Pending Dispatch'}
          </div>
        </div>
      `);

      emergenciesLayerRef.current.addLayer(marker);
    });
  }, [emergencies]);

  // Demo Breach Simulation Trigger
  async function simulateDangerBreach() {
    setSimulationStatus('Simulating Yashodip entering High Risk Trail...');
    try {
      // Coordinates of High Risk Trail (Sohra Deep Gorge): 25.2750, 91.7180
      await api.updateLocation({
        touristId: 'VX-TRV-0001',
        latitude: 25.2750,
        longitude: 91.7180,
        accuracy: 10,
        speed: 3.2
      });
      setSimulationStatus('⚠️ Yashodip entered High Risk Trail! Status changed to HIGH_RISK.');
      await loadMapData();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([25.2750, 91.7180], 14, { duration: 1.5 });
      }
      setTimeout(() => setSimulationStatus(''), 6000);
    } catch (err) {
      setSimulationStatus('Simulation error: ' + err.message);
    }
  }

  async function simulateSafeReturn() {
    setSimulationStatus('Returning Yashodip to Safe Tourist Area...');
    try {
      // Coordinates of Safe Tourist Area (Police Bazar Hub): 25.5788, 91.8833
      await api.updateLocation({
        touristId: 'VX-TRV-0001',
        latitude: 25.5788,
        longitude: 91.8833,
        accuracy: 8,
        speed: 1.0
      });
      setSimulationStatus('✅ Yashodip returned to Safe Tourist Area! Status returned to SAFE.');
      await loadMapData();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([25.5788, 91.8833], 14, { duration: 1.5 });
      }
      setTimeout(() => setSimulationStatus(''), 6000);
    } catch (err) {
      setSimulationStatus('Simulation error: ' + err.message);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)', gap: '16px' }}>
      {/* Top Controls & Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Tactical Geo-Fence & Fleet Live Map</span>
            <span className="beacon-dot safe"></span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            OpenStreetMap live radar showing {tourists.length} active tourists and {geoFences.length} monitored geo-fences.
          </p>
        </div>

        {/* Quick Demo Simulator Buttons for Hackathon Presentation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btn-simulate-danger"
            onClick={simulateDangerBreach}
            className="btn btn-danger"
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            <AlertTriangle size={15} />
            <span>Simulate Danger Breach</span>
          </button>

          <button
            id="btn-simulate-safe"
            onClick={simulateSafeReturn}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            <Compass size={15} color="var(--color-safe)" />
            <span>Return to Safe Zone</span>
          </button>

          <button
            id="btn-refresh-map"
            onClick={loadMapData}
            className="btn btn-outline"
            style={{ padding: '8px 12px' }}
            title="Refresh map telemetry"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {simulationStatus && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          color: '#38BDF8',
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span className="beacon-dot safe"></span>
          <span>{simulationStatus}</span>
        </div>
      )}

      {/* Map + Legend Layout */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0 }}>
        {/* Leaflet Map Canvas */}
        <div
          ref={mapContainerRef}
          style={{
            flex: 1,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1
          }}
        />

        {/* Sidebar Legend & Live Fleet Strip */}
        <div className="glass-panel" style={{ width: '320px', display: 'flex', flexDirection: 'column', padding: '20px', gap: '18px', overflowY: 'auto' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Geo-Fence Zone Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#10B981', border: '2px solid #10B981' }} />
                <span><strong>SAFE ZONE:</strong> Dedicated Police & Medical Hub</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#06B6D4', border: '2px solid #06B6D4' }} />
                <span><strong>TOURIST ZONE:</strong> Scenic & Curated Corridor</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#F59E0B', border: '2px dashed #F59E0B' }} />
                <span><strong>RESTRICTED:</strong> Sacred Ecological Reserve</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#EF4444', border: '2px solid #EF4444' }} />
                <span><strong>DANGER ZONE:</strong> Steep Cliffs / Flash Slippage</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', flex: 1 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Active Tourists On Radar ({tourists.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tourists.map(t => {
                const isDanger = t.safetyStatus === 'HIGH_RISK' || t.safetyStatus === 'CRITICAL';
                return (
                  <div
                    key={t.touristId}
                    onClick={() => {
                      setSelectedTourist(t);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([t.latitude, t.longitude], 15, { duration: 1.2 });
                      }
                    }}
                    style={{
                      background: isDanger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: isDanger ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{t.name}</span>
                      <span className={`badge ${isDanger ? 'badge-danger' : 'badge-safe'}`} style={{ fontSize: '0.65rem' }}>
                        {t.safetyStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.currentZoneName || 'General Route'}
                    </div>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', marginTop: '4px' }}>
                      {t.latitude.toFixed(4)}°N, {t.longitude.toFixed(4)}°E
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
