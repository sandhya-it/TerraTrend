import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GIBS_LAYERS, REGION_PRESETS } from '../lib/nasaCatalog';
import { TrendAnalysisResult } from '../types/terratrend';

interface EarthGeospatialMapProps {
  analyses: TrendAnalysisResult[];
  activeAnalysisId?: string;
  selectedGibsLayerId?: string | null;
  gibsDate?: string;
  gibsOpacity?: number;
  heightClass?: string;
  onSelectRegionPoint?: (lat: number, lon: number, regionId?: string) => void;
}

function getMarkerAppearance(result?: TrendAnalysisResult): {
  color: string;
  symbol: string;
  label: string;
} {
  if (!result) {
    return { color: '#8FA8C8', symbol: '○', label: 'Unanalyzed Preset' };
  }
  if (result.statusLabel === 'Insufficient data') {
    return { color: '#8FA8C8', symbol: '◌', label: 'Insufficient data' };
  }
  if (result.statusLabel === 'Statistically significant increasing trend') {
    return { color: '#39D6A0', symbol: '▲', label: 'Significant Increasing' };
  }
  if (result.statusLabel === 'Statistically significant decreasing trend') {
    return { color: '#F45B69', symbol: '▼', label: 'Significant Decreasing' };
  }
  if (result.direction === 'increasing') {
    return { color: '#FFB547', symbol: '△', label: 'Non-Sig. Increasing' };
  }
  if (result.direction === 'decreasing') {
    return { color: '#FFB547', symbol: '▽', label: 'Non-Sig. Decreasing' };
  }
  return { color: '#36D9E6', symbol: '●', label: 'No Detected Trend' };
}

export function EarthGeospatialMap({
  analyses,
  activeAnalysisId,
  selectedGibsLayerId = null,
  gibsDate = '2024-08-15',
  gibsOpacity = 0.65,
  heightClass = 'h-[420px]',
  onSelectRegionPoint,
}: EarthGeospatialMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gibsLayerRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const [gibsWarning, setGibsWarning] = useState<string | null>(null);
  const callbackRef = useRef(onSelectRegionPoint);
  callbackRef.current = onSelectRegionPoint;

  // Initialize Leaflet map once
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [24, -15],
      zoom: 2,
      minZoom: 2,
      maxZoom: 10,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO | NASA GIBS / POWER',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    overlayGroupRef.current = group;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (callbackRef.current) {
        callbackRef.current(Number(e.latlng.lat.toFixed(3)), Number(e.latlng.lng.toFixed(3)));
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      gibsLayerRef.current = null;
      overlayGroupRef.current = null;
    };
  }, []);

  // Update NASA GIBS imagery overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (gibsLayerRef.current) {
      map.removeLayer(gibsLayerRef.current);
      gibsLayerRef.current = null;
    }
    setGibsWarning(null);

    if (!selectedGibsLayerId) return;
    const layerConfig = GIBS_LAYERS.find((g) => g.id === selectedGibsLayerId || g.layerId === selectedGibsLayerId);
    if (!layerConfig) return;

    const tileUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerConfig.layerId}/default/${gibsDate}/${layerConfig.tileMatrixSet}/{z}/{y}/{x}.${layerConfig.format}`;
    let errorCount = 0;
    const gibsLayer = L.tileLayer(tileUrl, {
      opacity: gibsOpacity,
      maxNativeZoom: layerConfig.tileMatrixSet.includes('Level6') ? 6 : layerConfig.tileMatrixSet.includes('Level7') ? 7 : 9,
      attribution: `NASA EOSDIS GIBS (${layerConfig.mission})`,
    });

    gibsLayer.on('tileerror', () => {
      errorCount++;
      if (errorCount === 3) {
        setGibsWarning(
          `NASA GIBS tiles for ${layerConfig.title} on ${gibsDate} returned partial/unavailable coverage (common near orbital swaths or offline sandboxes).`
        );
      }
    });

    gibsLayer.addTo(map);
    gibsLayerRef.current = gibsLayer;
  }, [selectedGibsLayerId, gibsDate, gibsOpacity]);

  // Render region polygons and analyzed markers
  useEffect(() => {
    const group = overlayGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const analysisByRegion = new Map<string, TrendAnalysisResult>();
    analyses.forEach((a) => {
      if (!analysisByRegion.has(a.regionId)) {
        analysisByRegion.set(a.regionId, a);
      }
    });

    // Draw bounding boxes for preset regions
    REGION_PRESETS.forEach((region) => {
      const matched = analysisByRegion.get(region.id);
      const appearance = getMarkerAppearance(matched);
      const isFocused = matched && matched.id === activeAnalysisId;

      const rect = L.rectangle(
        [
          [region.bounds[0], region.bounds[1]],
          [region.bounds[2], region.bounds[3]],
        ],
        {
          color: appearance.color,
          weight: isFocused ? 2.4 : 1.1,
          fillColor: appearance.color,
          fillOpacity: matched ? 0.16 : 0.04,
          dashArray: matched ? undefined : '4 4',
        }
      );

      rect.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        callbackRef.current?.(region.lat, region.lon, region.id);
      });

      const icon = L.divIcon({
        className: 'terratrend-map-pin',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#071426;border:2px solid ${appearance.color};color:${appearance.color};font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.6);">${appearance.symbol}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([region.lat, region.lon], { icon });
      const popupHtml = matched
        ? `<div style="min-width:210px;font-size:12px;line-height:1.45;">
            <div style="font-weight:600;color:#F4F8FF;margin-bottom:2px;">${matched.regionName}</div>
            <div style="color:#8FA8C8;font-size:11px;margin-bottom:6px;">${matched.variableName} · ${matched.isDemo ? 'Demo Benchmark' : matched.datasetNature}</div>
            <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;">
              <div>Status: <strong style="color:${appearance.color};">${appearance.label}</strong></div>
              <div>Sen Slope: <strong>${matched.sensSlope ? `${matched.sensSlope.slopePerYear >= 0 ? '+' : ''}${matched.sensSlope.slopePerYear.toFixed(4)} ${matched.unit}/yr` : 'N/A'}</strong></div>
              <div>MK p-value: <strong>${matched.mannKendall ? matched.mannKendall.pValue.toFixed(4) : 'N/A'}</strong></div>
              <div>Samples: <strong>${matched.validObservations}/${matched.totalObservations}</strong></div>
            </div>
          </div>`
        : `<div style="min-width:180px;font-size:12px;">
            <div style="font-weight:600;color:#F4F8FF;">${region.name}</div>
            <div style="color:#8FA8C8;font-size:11px;">${region.biome} · ${region.countryOrZone}</div>
            <div style="color:#36D9E6;font-size:11px;margin-top:4px;">Click region to select coordinates</div>
          </div>`;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        callbackRef.current?.(region.lat, region.lon, region.id);
      });

      rect.addTo(group);
      marker.addTo(group);
    });

    // Also render any custom-coordinate analyses not matching a preset
    analyses
      .filter((a) => !REGION_PRESETS.some((p) => p.id === a.regionId))
      .forEach((a) => {
        const appearance = getMarkerAppearance(a);
        const icon = L.divIcon({
          className: 'terratrend-map-pin',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#071426;border:2px solid ${appearance.color};color:${appearance.color};font-size:12px;font-weight:700;">${appearance.symbol}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
        L.marker([a.lat, a.lon], { icon })
          .bindPopup(
            `<div style="font-size:12px;"><strong>${a.regionName}</strong><br/>${a.variableName}: ${
              a.sensSlope ? `${a.sensSlope.slopePerYear.toFixed(4)} ${a.unit}/yr` : 'Insufficient data'
            }</div>`
          )
          .addTo(group);
      });
  }, [analyses, activeAnalysisId]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-[#193556]">
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} />
      {gibsWarning && (
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-[#071426]/95 border border-[#FFB547]/40 rounded-md px-3 py-2 text-xs text-[#FFB547]">
          {gibsWarning}
        </div>
      )}
    </div>
  );
}
