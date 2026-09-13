import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Fastify from 'fastify';
import { AppDataSource } from '../dist/data-source.js';
import { oauthRoutes } from '../dist/routes/oauth.js';
import { getOAuthProvider } from '../dist/oauth/registry.js';
import { signAccessToken } from '../dist/auth.js';
import { XOAuthProvider } from '../dist/oauth/x.js';

// Isolated repositories and provider responses. No network calls or real account writes.
test('OAuth sessions bind agent/platform, are single-use, and expose no credentials', async () => {
  const originalRepo = AppDataSource.getRepository;
  const provider = getOAuthProvider('facebook');
  const originals = { configured: provider.configured, buildAuthUrl: provider.buildAuthUrl, handleCallback: provider.handleCallback };
  const writes = [];
  AppDataSource.getRepository = () => ({findOne: async () => null, create: x => x, save: async x => { writes.push(x); return x; }});
  provider.configured = () => true;
  provider.buildAuthUrl = state => `https://example.com/?state=${state}`;
  provider.handleCallback = async () => ({ accessToken: 'private-token', externalAccountId: 'page', externalAccountName: 'Test Page' });
  const app = Fastify();
  try {
    await app.register(oauthRoutes);
    const headers = { authorization: `Bearer ${signAccessToken('agent-a')}` };
    const start = await app.inject({url:'/auth/facebook/start?client=web',headers});
    assert.equal(start.statusCode,200);
    const { sessionId } = start.json();
    assert.equal(sessionId.length,43);
    assert.equal((await app.inject({url:`/auth/facebook/status/${sessionId}`,headers:{authorization:`Bearer ${signAccessToken('agent-b')}`}})).statusCode,404);
    assert.equal((await app.inject(`/auth/x/callback?state=${sessionId}&code=test`)).statusCode,400);
    const callback = await app.inject(`/auth/facebook/callback?state=${sessionId}&code=test`);
    assert.equal(callback.statusCode,200);
    assert.ok(!callback.body.includes('private-token'));
    assert.equal(writes.length,1);
    assert.equal(writes[0].agentId,'agent-a');
    assert.equal((await app.inject({url:`/auth/facebook/status/${sessionId}`,headers})).json().status,'success');
    assert.equal((await app.inject(`/auth/facebook/callback?state=${sessionId}&code=test`)).statusCode,400);
    const denied = (await app.inject({url:'/auth/facebook/start?client=web',headers})).json().sessionId;
    await app.inject(`/auth/facebook/callback?state=${denied}&error=access_denied`);
    assert.equal((await app.inject({url:`/auth/facebook/status/${denied}`,headers})).json().status,'error');
    provider.handleCallback = async () => { throw new Error('secret-provider-response'); };
    const failed = (await app.inject({url:'/auth/facebook/start?client=web',headers})).json().sessionId;
    await app.inject(`/auth/facebook/callback?state=${failed}&code=test`);
    const failure = await app.inject({url:`/auth/facebook/status/${failed}`,headers});
    assert.equal(failure.json().status,'error');
    assert.ok(!failure.body.includes('secret-provider-response'));
    assert.equal(writes.length,1);
  } finally { await app.close(); AppDataSource.getRepository = originalRepo; Object.assign(provider, originals); }
});

test('X uses S256, exchanges the private verifier, refreshes tokens and rejects invalid profiles', async () => {
  const provider = new XOAuthProvider();
  const verifier = 'v'.repeat(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const url = new URL(provider.buildAuthUrl('state',challenge));
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.get('code_challenge'),challenge);
  assert.ok(!url.toString().includes(verifier));
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({url,options});
    return new Response(JSON.stringify(String(url).endsWith('/users/me') ? {data:{id:'123',username:'agent'}} : {access_token:'access',refresh_token:'refresh',expires_in:7200}), {status:200});
  };
  try {
    const result = await provider.handleCallback('code',verifier);
    assert.equal(result.externalAccountName,'@agent');
    assert.equal(calls[0].options.body.get('code_verifier'),verifier);
    assert.equal((await provider.refresh('old-refresh')).refreshToken,'refresh');
    await assert.rejects(provider.handleCallback('code'),/PKCE/);
    global.fetch = async () => new Response('{}',{status:200});
    await assert.rejects(provider.handleCallback('code',verifier));
  } finally { global.fetch = originalFetch; }
});
