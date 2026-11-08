"use client";

import { useEffect } from "react";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { latLngBounds } from "leaflet";

import "leaflet/dist/leaflet.css";

import type { RoutePoint } from "@/lib/garmin/types";

const POSITRON =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

function FitRoute({ positions }: { positions: RoutePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) {
      return;
    }

    const bounds: LatLngBoundsExpression = latLngBounds(
      positions as LatLngExpression[]
    );
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, positions]);

  return null;
}

export function MapRoute({ positions }: { positions: RoutePoint[] }) {
  const center = positions[0] ?? ([48.5, 7.5] as RoutePoint);

  return (
    <div className="mt-8 mb-6 h-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
        attributionControl
      >
        <TileLayer
          url={POSITRON}
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        <Polyline positions={positions} color="#ea580c" weight={4} />
        <FitRoute positions={positions} />
      </MapContainer>
    </div>
  );
}
