export async function geocodeLocation(locationString: string): Promise<{ latitude: string; longitude: string } | null> {
  try {
    if (!locationString || locationString.trim() === '') {
      return null;
    }

    let searchQuery = locationString.trim();
    
    if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
      try {
        const urlObj = new URL(searchQuery);
        const queryParam = urlObj.searchParams.get('query');
        if (queryParam) {
          searchQuery = queryParam.replace(/\+/g, ' ');
        } else {
          console.log(`No query parameter found in URL: ${searchQuery}`);
          return null;
        }
      } catch (urlError) {
        console.error(`Invalid URL format: ${searchQuery}`);
        return null;
      }
    }

    const encodedLocation = encodeURIComponent(searchQuery);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedLocation}&format=json&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BookPotato/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Geocoding failed for "${locationString}": HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      return {
        latitude: data[0].lat,
        longitude: data[0].lon
      };
    }

    console.log(`No geocoding results found for "${locationString}"`);
    return null;
  } catch (error) {
    console.error(`Error geocoding location "${locationString}":`, error);
    return null;
  }
}

export async function geocodeWithDelay(locationString: string, delayMs: number = 1000): Promise<{ latitude: string; longitude: string } | null> {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  return geocodeLocation(locationString);
}
