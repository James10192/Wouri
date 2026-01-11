import { config } from "../lib/config";

/**
 * OpenWeatherMap API Service
 * FREE: 1,000 appels/jour
 */

export interface WeatherData {
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  wind_speed: number;
  rain_mm?: number;
  region: string;
}

/**
 * Get weather for a specific region in Côte d'Ivoire
 */
export async function getWeatherData(region: string): Promise<WeatherData | null> {
  try {
    if (!config.OPENWEATHER_API_KEY) {
      console.warn("⚠️  OpenWeatherMap API key not configured");
      return null;
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      region
    )},CI&appid=${config.OPENWEATHER_API_KEY}&units=metric&lang=fr`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`❌ Weather API error for ${region}:`, response.statusText);
      return null;
    }

    const data = (await response.json()) as any;

    return {
      temperature: Math.round(data?.main?.temp ?? 0),
      feels_like: Math.round(data?.main?.feels_like ?? 0),
      humidity: data?.main?.humidity ?? 0,
      description: data?.weather?.[0]?.description ?? "inconnu",
      wind_speed: data?.wind?.speed ?? 0,
      rain_mm: data?.rain?.["1h"] || 0,
      region: data?.name ?? region,
    };
  } catch (error) {
    console.error(`❌ Failed to fetch weather for ${region}:`, error);
    return null;
  }
}

/**
 * Get weather context string for RAG prompt
 */
export async function getWeatherContext(region: string): Promise<string> {
  const weather = await getWeatherData(region);

  if (!weather) {
    return "Données météo non disponibles pour le moment.";
  }

  // Format pour le prompt RAG
  return `Météo actuelle à ${weather.region}:
- Température: ${weather.temperature}°C (ressenti ${weather.feels_like}°C)
- Humidité: ${weather.humidity}%
- Conditions: ${weather.description}
- Vent: ${weather.wind_speed} m/s
${weather.rain_mm ? `- Pluie: ${weather.rain_mm}mm` : ""}`;
}

/**
 * Get agricultural advice based on weather
 */
export async function getWeatherAdvice(region: string): Promise<string> {
  const weather = await getWeatherData(region);

  if (!weather) {
    return "";
  }

  const advice: string[] = [];

  // Température
  if (weather.temperature > 35) {
    advice.push("⚠️ Chaleur excessive: Irriguer vos cultures le matin ou le soir.");
  } else if (weather.temperature < 15) {
    advice.push("⚠️ Température basse: Protéger les jeunes plants.");
  }

  // Pluie
  if (weather.rain_mm && weather.rain_mm > 10) {
    advice.push("🌧️ Fortes pluies: Éviter de travailler le sol. Vérifier le drainage.");
  } else if (weather.humidity < 40) {
    advice.push("☀️ Faible humidité: Prévoir l'irrigation.");
  }

  // Vent
  if (weather.wind_speed > 10) {
    advice.push("💨 Vent fort: Éviter les traitements phytosanitaires.");
  }

  return advice.length > 0 ? `\n\nConseils météo:\n${advice.join("\n")}` : "";
}

/**
 * Check if it's a good day for planting
 */
export async function isGoodPlantingDay(region: string): Promise<boolean> {
  const weather = await getWeatherData(region);

  if (!weather) {
    return false;
  }

  // Conditions idéales pour planter:
  // - Température entre 20-30°C
  // - Humidité > 50%
  // - Pas de pluie excessive
  // - Vent faible

  const goodTemp = weather.temperature >= 20 && weather.temperature <= 30;
  const goodHumidity = weather.humidity >= 50;
  const noHeavyRain = !weather.rain_mm || weather.rain_mm < 20;
  const lowWind = weather.wind_speed < 8;

  return goodTemp && goodHumidity && noHeavyRain && lowWind;
}

/**
 * Get 5-day forecast (Premium OpenWeatherMap)
 * Note: Nécessite un compte payant ou One Call API 3.0
 * Pour le moment, on ne l'implémente pas (gratuit = weather actuel seulement)
 */
export async function getWeatherForecast(region: string): Promise<any[]> {
  // TODO: Implémenter avec One Call API 3.0 si besoin
  console.log(`📅 Forecast requested for ${region} (not implemented yet)`);
  return [];
}
