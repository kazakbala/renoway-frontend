export function useGoogleMapsApi() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || null;
  const error = apiKey ? null : "Google Maps API key not configured";

  return { apiKey, isLoading: false, error };
}
