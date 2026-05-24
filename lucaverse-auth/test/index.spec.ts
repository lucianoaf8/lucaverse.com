import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// Helper: invoke worker.fetch with isolated execution context
async function call(url: string, init?: RequestInit) {
	const request = new IncomingRequest(url, init);
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

// Helper: clear KV between tests so state does not leak
async function clearKV() {
	const oauth = await env.OAUTH_SESSIONS.list();
	await Promise.all(oauth.keys.map((k: { name: string }) => env.OAUTH_SESSIONS.delete(k.name)));
	const wl = await env.USER_WHITELIST.list();
	await Promise.all(wl.keys.map((k: { name: string }) => env.USER_WHITELIST.delete(k.name)));
}

beforeEach(async () => {
	(env as any).GOOGLE_CLIENT_ID = 'test-client-id';
	(env as any).GOOGLE_CLIENT_SECRET = 'test-client-secret';
	(env as any).WORKER_URL = 'https://lucaverse-auth.lucianoaf8.workers.dev';
	(env as any).FRONTEND_URL = 'https://lucaverse.com';
	await clearKV();
});

describe('routing', () => {
	it('unknown route returns 404', async () => {
		const res = await call('https://example.com/nope');
		expect(res.status).toBe(404);
		expect(await res.text()).toBe('Not Found');
	});

	it('OPTIONS preflight returns 200 with CORS headers', async () => {
		const res = await call('https://example.com/auth/verify', {
			method: 'OPTIONS',
			headers: { Origin: 'https://lucaverse.com' },
		});
		expect(res.status).toBe(200);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://lucaverse.com');
		expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
	});

	it('/auth/test returns OK payload', async () => {
		const res = await call('https://example.com/auth/test');
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		expect(body.status).toBe('OK');
		expect(body.kvTest).toBe('KV access working');
		expect(typeof body.timestamp).toBe('number');
	});
});

describe('/auth/google — origin allowlist', () => {
	it('redirects to Google with state, stores allowed origin', async () => {
		const res = await call('https://example.com/auth/google?origin=https://lucaverse.com');
		expect(res.status).toBe(302);
		const loc = res.headers.get('Location')!;
		expect(loc).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
		const stateMatch = loc.match(/state=([^&]+)/);
		expect(stateMatch).toBeTruthy();

		const stored = await env.OAUTH_SESSIONS.get(`state_${stateMatch![1]}`);
		expect(stored).toBeTruthy();
		const parsed = JSON.parse(stored!);
		expect(parsed.frontendOrigin).toBe('https://lucaverse.com');
		expect(typeof parsed.createdAt).toBe('number');
	});

	it('falls back to FRONTEND_URL when origin not in allowlist', async () => {
		const res = await call('https://example.com/auth/google?origin=https://evil.com');
		expect(res.status).toBe(302);
		const loc = res.headers.get('Location')!;
		const state = loc.match(/state=([^&]+)/)![1];
		const parsed = JSON.parse((await env.OAUTH_SESSIONS.get(`state_${state}`))!);
		expect(parsed.frontendOrigin).toBe('https://lucaverse.com');
	});

	it('uses FRONTEND_URL when origin param missing', async () => {
		const res = await call('https://example.com/auth/google');
		expect(res.status).toBe(302);
		const state = res.headers.get('Location')!.match(/state=([^&]+)/)![1];
		const parsed = JSON.parse((await env.OAUTH_SESSIONS.get(`state_${state}`))!);
		expect(parsed.frontendOrigin).toBe('https://lucaverse.com');
	});

	it('returns 500 when GOOGLE_CLIENT_ID missing', async () => {
		(env as any).GOOGLE_CLIENT_ID = '';
		const res = await call('https://example.com/auth/google');
		expect(res.status).toBe(500);
		// SECURITY: error.message must not leak to client
		const body = await res.text();
		expect(body).not.toMatch(/GOOGLE_CLIENT_ID/);
	});
});

describe('/auth/google/callback — state validation', () => {
	it('redirects with invalid_state when state missing', async () => {
		const res = await call('https://example.com/auth/google/callback?code=abc');
		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toContain('error=invalid_state');
	});

	it('redirects with invalid_state when state not in KV', async () => {
		const res = await call('https://example.com/auth/google/callback?code=abc&state=unknown');
		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toContain('error=invalid_state');
	});

	it('redirects with auth_failed when error param present', async () => {
		const state = 'test-state-1';
		await env.OAUTH_SESSIONS.put(`state_${state}`, JSON.stringify({
			createdAt: Date.now(),
			frontendOrigin: 'https://lucaverse.com',
		}));
		const res = await call(`https://example.com/auth/google/callback?error=access_denied&state=${state}`);
		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toContain('error=auth_failed');
		// State must be consumed
		expect(await env.OAUTH_SESSIONS.get(`state_${state}`)).toBeNull();
	});
});

describe('/auth/exchange — single-use code exchange', () => {
	it('returns 400 when code missing', async () => {
		const res = await call('https://example.com/auth/exchange');
		expect(res.status).toBe(400);
		const body = await res.json() as any;
		expect(body.error).toBe('Missing exchange code');
	});

	it('returns 401 for invalid code', async () => {
		const res = await call('https://example.com/auth/exchange?code=nonexistent');
		expect(res.status).toBe(401);
		const body = await res.json() as any;
		expect(body.error).toBe('Invalid or expired code');
	});

	it('returns sessionId+token for valid code, then deletes it', async () => {
		const code = 'valid-code-1';
		await env.OAUTH_SESSIONS.put(`exchange_${code}`, JSON.stringify({
			sessionId: 'session-abc',
			sessionToken: 'token-xyz',
		}));

		const res = await call(`https://example.com/auth/exchange?code=${code}`);
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		expect(body.sessionId).toBe('session-abc');
		expect(body.token).toBe('token-xyz');
		expect(res.headers.get('Cache-Control')).toBe('no-store');
		expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');

		// Single-use: code must be deleted after first exchange
		expect(await env.OAUTH_SESSIONS.get(`exchange_${code}`)).toBeNull();
	});

	it('rejects replay of already-used code', async () => {
		const code = 'replay-code';
		await env.OAUTH_SESSIONS.put(`exchange_${code}`, JSON.stringify({
			sessionId: 'session-1',
			sessionToken: 'token-1',
		}));

		const first = await call(`https://example.com/auth/exchange?code=${code}`);
		expect(first.status).toBe(200);

		const second = await call(`https://example.com/auth/exchange?code=${code}`);
		expect(second.status).toBe(401);
	});
});

describe('/auth/verify — session validation', () => {
	it('returns 400 when params missing', async () => {
		const res = await call('https://example.com/auth/verify');
		expect(res.status).toBe(400);
		const body = await res.json() as any;
		expect(body.valid).toBe(false);
	});

	it('returns 404 when session not in KV', async () => {
		const res = await call('https://example.com/auth/verify?session=missing&token=x');
		expect(res.status).toBe(404);
		const body = await res.json() as any;
		expect(body.valid).toBe(false);
	});

	it('returns 401 + deletes session when expired', async () => {
		const sessionId = 'expired-session';
		await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify({
			token: 'tok',
			user: { email: 'a@b.c' },
			expiresAt: Date.now() - 1000,
		}));

		const res = await call(`https://example.com/auth/verify?session=${sessionId}&token=tok`);
		expect(res.status).toBe(401);
		expect(await env.OAUTH_SESSIONS.get(sessionId)).toBeNull();
	});

	it('returns 401 when token mismatches', async () => {
		const sessionId = 'mismatch-session';
		await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify({
			token: 'correct-token',
			user: { email: 'a@b.c' },
			expiresAt: Date.now() + 60_000,
		}));

		const res = await call(`https://example.com/auth/verify?session=${sessionId}&token=wrong-token`);
		expect(res.status).toBe(401);
	});

	it('returns 200 + user payload for valid session', async () => {
		const sessionId = 'valid-session';
		const user = { email: 'user@example.com', name: 'User' };
		await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify({
			token: 'good-token',
			user,
			expiresAt: Date.now() + 60_000,
		}));

		const res = await call(`https://example.com/auth/verify?session=${sessionId}&token=good-token`);
		expect(res.status).toBe(200);
		const body = await res.json() as any;
		expect(body.valid).toBe(true);
		expect(body.user).toEqual(user);
	});
});

describe('/auth/logout', () => {
	it('deletes session and returns success', async () => {
		const sessionId = 'logout-session';
		await env.OAUTH_SESSIONS.put(sessionId, JSON.stringify({ token: 't', user: {}, expiresAt: Date.now() + 60_000 }));

		const res = await call(`https://example.com/auth/logout?session=${sessionId}`, { method: 'POST' });
		expect(res.status).toBe(200);
		expect(await env.OAUTH_SESSIONS.get(sessionId)).toBeNull();
	});
});

describe('error responses — information disclosure prevention', () => {
	it('500 responses do not contain error.message', async () => {
		(env as any).GOOGLE_CLIENT_ID = '';
		const res = await call('https://example.com/auth/google');
		const body = await res.text();
		expect(body).toBe('Internal Server Error');
	});
});

describe('integration via SELF', () => {
	it('unknown route returns 404', async () => {
		const res = await SELF.fetch('https://example.com/nope');
		expect(res.status).toBe(404);
	});
});
