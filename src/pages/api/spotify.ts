import type { APIRoute } from 'astro';

export const prerender = false;

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';

const env = (key: string) =>
	process.env[key] ?? (import.meta.env as Record<string, string | undefined>)[key];

const TIMEOUT_MS = 4000;

const safeFetch = async (url: string, init: RequestInit) => {
	try {
		return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
	} catch (err) {
		console.warn(`[spotify] request to ${new URL(url).host} failed: ${err}`);
		return null;
	}
};

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
		},
	});

const getAccessToken = async () => {
	const id = env('SPOTIFY_CLIENT_ID');
	const secret = env('SPOTIFY_CLIENT_SECRET');
	const refresh = env('SPOTIFY_REFRESH_TOKEN');

	const missing = Object.entries({
		SPOTIFY_CLIENT_ID: id,
		SPOTIFY_CLIENT_SECRET: secret,
		SPOTIFY_REFRESH_TOKEN: refresh,
	})
		.filter(([, v]) => !v)
		.map(([k]) => k);
	if (missing.length) {
		console.warn(`[spotify] widget disabled, missing env: ${missing.join(', ')}`);
		return null;
	}

	const res = await safeFetch(TOKEN_URL, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
	});
	if (!res) return null;
	if (!res.ok) {
		console.warn(`[spotify] token refresh failed (${res.status}): ${await res.text()}`);
		return null;
	}

	const data = (await res.json()) as { access_token?: string };
	return data.access_token ?? null;
};

export const GET: APIRoute = async () => {
	const token = await getAccessToken();
	if (!token) return json({ isPlaying: false }, 200);

	const res = await safeFetch(NOW_PLAYING_URL, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res) return json({ isPlaying: false });

	// spotify sends 204 when nothing is playing, 202 when a device is still waking up
	if (res.status !== 200) {
		if (res.status !== 204 && res.status !== 202) {
			console.warn(`[spotify] now-playing failed (${res.status}): ${await res.text()}`);
		}
		return json({ isPlaying: false });
	}

	const data = await res.json();
	const item = data?.item;
	if (!item) return json({ isPlaying: false });

	// podcasts have `show` instead of `artists`
	const artist = Array.isArray(item.artists)
		? item.artists.map((a: { name: string }) => a.name).join(', ')
		: (item.show?.name ?? '');

	// largest-first, so the last entry is the small thumbnail we want
	const images: { url: string }[] = item.album?.images ?? item.images ?? [];

	return json({
		isPlaying: Boolean(data.is_playing),
		title: item.name,
		artist,
		albumArt: images.at(-1)?.url ?? null,
		url: item.external_urls?.spotify ?? null,
		progressMs: data.progress_ms ?? 0,
		durationMs: item.duration_ms ?? 0,
	});
};
