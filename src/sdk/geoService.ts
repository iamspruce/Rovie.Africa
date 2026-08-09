import { request } from './httpClient';
import { config } from './config';

export interface DetectVisitorCountryResponse {
  countryCode: string;
  countryName: string;
}

export async function detectVisitorCountry(): Promise<DetectVisitorCountryResponse> {
  const data: any = await request(config.ipGeolocationUrl);
  return {
    countryCode: (data.country_code || '').toUpperCase(),
    countryName: data.country || '',
  };
}
