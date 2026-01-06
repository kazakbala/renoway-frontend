import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useGoogleMapsApi() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-google-maps-key");
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        setApiKey(data.apiKey);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load Google Maps";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  return { apiKey, isLoading, error };
}
