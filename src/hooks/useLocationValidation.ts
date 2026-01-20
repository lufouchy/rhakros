import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LocationSettings {
  location_mode: 'disabled' | 'log_only' | 'require_exact' | 'require_radius';
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  allowed_radius_meters: number | null;
  company_latitude: number | null;
  company_longitude: number | null;
}

interface LocationValidationResult {
  isValid: boolean;
  message: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters?: number;
}

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Geocode an address to get coordinates using Nominatim (OpenStreetMap)
const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR',
        },
      }
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

export const useLocationValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [settings, setSettings] = useState<LocationSettings | null>(null);

  const fetchLocationSettings = useCallback(async (): Promise<LocationSettings | null> => {
    const { data, error } = await supabase
      .from('location_settings' as any)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error fetching location settings:', error);
      return null;
    }

    const settingsData = data as unknown as LocationSettings;
    setSettings(settingsData);
    return settingsData;
  }, []);

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada pelo navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  const validateLocation = useCallback(async (): Promise<LocationValidationResult> => {
    setIsValidating(true);

    try {
      // Fetch location settings
      const locationSettings = await fetchLocationSettings();

      if (!locationSettings) {
        return {
          isValid: true,
          message: 'Configurações de localização não encontradas. Permitindo registro.',
          latitude: null,
          longitude: null,
        };
      }

      // If location is disabled, allow punch without getting location
      if (locationSettings.location_mode === 'disabled') {
        return {
          isValid: true,
          message: 'Localização desativada. Registro permitido.',
          latitude: null,
          longitude: null,
        };
      }

      // Get user's current position
      let userPosition: GeolocationPosition;
      try {
        userPosition = await getCurrentPosition();
      } catch (geoError: any) {
        if (locationSettings.location_mode === 'log_only') {
          return {
            isValid: true,
            message: 'Não foi possível obter localização, mas registro permitido.',
            latitude: null,
            longitude: null,
          };
        }

        return {
          isValid: false,
          message: geoError.code === 1 
            ? 'Permissão de localização negada. Ative a localização para registrar o ponto.'
            : 'Não foi possível obter sua localização. Verifique as permissões do navegador.',
          latitude: null,
          longitude: null,
        };
      }

      const userLat = userPosition.coords.latitude;
      const userLon = userPosition.coords.longitude;

      // If log_only mode, just return the location without validation
      if (locationSettings.location_mode === 'log_only') {
        return {
          isValid: true,
          message: 'Localização registrada.',
          latitude: userLat,
          longitude: userLon,
        };
      }

      // Get company address coordinates
      let companyCoords: { lat: number; lon: number } | null = null;

      // Check if we have stored coordinates
      if (locationSettings.company_latitude && locationSettings.company_longitude) {
        companyCoords = {
          lat: locationSettings.company_latitude,
          lon: locationSettings.company_longitude,
        };
      } else {
        // Geocode the company address
        const fullAddress = [
          locationSettings.address_street,
          locationSettings.address_number,
          locationSettings.address_neighborhood,
          locationSettings.address_city,
          locationSettings.address_state,
          'Brasil',
        ].filter(Boolean).join(', ');

        if (!fullAddress || fullAddress === 'Brasil') {
          return {
            isValid: false,
            message: 'Endereço da empresa não configurado. Contate o administrador.',
            latitude: userLat,
            longitude: userLon,
          };
        }

        companyCoords = await geocodeAddress(fullAddress);

        if (!companyCoords) {
          return {
            isValid: false,
            message: 'Não foi possível localizar o endereço da empresa. Contate o administrador.',
            latitude: userLat,
            longitude: userLon,
          };
        }
      }

      // Calculate distance
      const distance = calculateDistance(userLat, userLon, companyCoords.lat, companyCoords.lon);

      // Validate based on mode
      if (locationSettings.location_mode === 'require_exact') {
        // For exact address, use a 50m tolerance
        const EXACT_TOLERANCE_METERS = 50;
        if (distance <= EXACT_TOLERANCE_METERS) {
          return {
            isValid: true,
            message: `Localização validada. Você está a ${Math.round(distance)}m do endereço.`,
            latitude: userLat,
            longitude: userLon,
            distanceMeters: distance,
          };
        } else {
          return {
            isValid: false,
            message: `Você está a ${Math.round(distance)}m do endereço da empresa. Distância máxima permitida: ${EXACT_TOLERANCE_METERS}m.`,
            latitude: userLat,
            longitude: userLon,
            distanceMeters: distance,
          };
        }
      }

      if (locationSettings.location_mode === 'require_radius') {
        const allowedRadius = locationSettings.allowed_radius_meters || 100;
        if (distance <= allowedRadius) {
          return {
            isValid: true,
            message: `Localização validada. Você está a ${Math.round(distance)}m do endereço (limite: ${allowedRadius}m).`,
            latitude: userLat,
            longitude: userLon,
            distanceMeters: distance,
          };
        } else {
          return {
            isValid: false,
            message: `Você está a ${Math.round(distance)}m do endereço da empresa. Distância máxima permitida: ${allowedRadius}m.`,
            latitude: userLat,
            longitude: userLon,
            distanceMeters: distance,
          };
        }
      }

      // Fallback
      return {
        isValid: true,
        message: 'Registro permitido.',
        latitude: userLat,
        longitude: userLon,
      };
    } finally {
      setIsValidating(false);
    }
  }, [fetchLocationSettings]);

  return {
    validateLocation,
    isValidating,
    settings,
  };
};
