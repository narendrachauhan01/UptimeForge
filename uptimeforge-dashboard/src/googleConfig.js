import { getPublicConfig } from './api';

let cachedClientId = null;

export async function getGoogleClientId() {
    if (cachedClientId !== null) return cachedClientId;
    try {
        const res = await getPublicConfig();
        cachedClientId = res.data.googleClientId || '';
    } catch (_) {
        cachedClientId = '';
    }
    return cachedClientId;
}
