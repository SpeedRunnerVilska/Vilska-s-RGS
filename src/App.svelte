<script lang="ts">
  import { onMount } from 'svelte';

  // Use Vite's injected constant which respects RGS_API_URL env var
  const localApiHost = (globalThis as any).__RGS_API_URL__ || 'http://localhost:5174';
  let balance = 1000;
  let gameUrl = '';
  let iframeVisible = false;
  let customGameUrl = 'https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=vs20olympx&websiteUrl=https%3A%2F%2Fdemogamesfree.pragmaticplay.net&jurisdiction=99&lobby_url=https%3A%2F%2Fwww.pragmaticplay.com%2Fen%2F&lang=en&cur=USD';
  let hacksawParams = `language=en
channel=desktop
gameid=2229
mode=2
token=123131
lobbyurl=https://www.hacksawgaming.com
currency=EUR
partner=vilska`;

  const walletBase = `${localApiHost}/wallet`;

  function parseKeyValueString(input: string) {
    const params = new URLSearchParams();
    input.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      if (!key) return;
      params.set(key.trim(), rest.join('=').trim());
    });
    return params;
  }

  function buildGameUrl() {
    try {
      if (customGameUrl.startsWith('http')) {
        const url = new URL(customGameUrl);
        // Set Pragmatic-specific parameters to use local RGS proxy
        url.searchParams.set('websiteUrl', localApiHost);
        url.searchParams.set('lobby_url', localApiHost);
        url.searchParams.set('wallet_url', walletBase);
        url.searchParams.set('env', walletBase);
        url.searchParams.set('realmoneyenv', walletBase);
        url.searchParams.set('rgsurl', walletBase);
        url.searchParams.set('api_url', walletBase);
        gameUrl = url.toString();
        return;
      }
    } catch (error) {
      console.error('Error building game URL:', error);
    }
    gameUrl = customGameUrl;
  }

  function buildHacksawGameUrl() {
    const params = parseKeyValueString(hacksawParams);
    params.set('env', walletBase);
    params.set('realmoneyenv', walletBase);
    params.set('wallet_url', walletBase);
    params.set('websiteUrl', localApiHost);
    const base = 'https://static-live.hacksawgaming.com/2229/1.30.2/index.html';
    gameUrl = `${base}?${params.toString()}`;
  }

  async function loadBalance() {
    try {
      const response = await fetch(`${walletBase}/balance`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      balance = data.balance ?? balance;
    } catch (error) {
      console.warn('Unable to load local balance:', error);
    }
  }

  function openGame() {
    iframeVisible = true;
  }

  onMount(() => {
    buildHacksawGameUrl();
    loadBalance();
  });
</script>

<main style="font-family: system-ui, sans-serif; padding: 2rem; line-height: 1.5;">
  <h1>Local Game Launcher</h1>
  <p>Uses a local wallet API at <code>{localApiHost}/wallet</code> and a mocked balance of <strong>{balance}</strong>.</p>

  <div style="display: grid; gap: 1rem; max-width: 760px;">
    <div style="padding: 1rem; border: 1px solid #ddd; border-radius: 12px; background: #eef7ff;">
      <h2>Hacksaw game parameters</h2>
      <textarea bind:value={hacksawParams} rows="11" style="width:100%; font-family: monospace; padding:0.75rem; border-radius:8px; border:1px solid #ccc;"></textarea>
      <button on:click={buildHacksawGameUrl} style="margin-top:1rem; padding: 0.75rem 1.25rem; border:none; border-radius:8px; background:#28a745; color:white; cursor:pointer;">Build Hacksaw local game URL</button>
    </div>
    <div style="padding: 1rem; border: 1px solid #ddd; border-radius: 12px; background: #eef7ff;">
      <h2>Pragmatic demo URL</h2>
      <textarea bind:value={customGameUrl} rows="4" style="width:100%; font-family: monospace; padding:0.75rem; border-radius:8px; border:1px solid #ccc;"></textarea>
      <button on:click={buildGameUrl} style="margin-top:1rem; padding: 0.75rem 1.25rem; border:none; border-radius:8px; background:#28a745; color:white; cursor:pointer;">Build local game URL</button>
    </div>
    <div style="padding: 1rem; border: 1px solid #ddd; border-radius: 12px; background: #f8f9fb;">
      <h2>Local API status</h2>
      <p><strong>Balance:</strong> {balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
      <p><strong>Game URL:</strong></p>
      <pre style="white-space: pre-wrap; word-break: break-word; background: #fff; padding: 0.75rem; border-radius: 8px; border: 1px solid #ccc;">{gameUrl}</pre>
      <button on:click={openGame} style="padding: 0.75rem 1.25rem; border:none; border-radius:8px; background:#1e90ff; color:white; cursor:pointer;">Launch game iframe</button>
      <a href={gameUrl} target="_blank" rel="noreferrer" style="margin-left:1rem; color:#1e90ff;">Open in new tab</a>
    </div>

    <div style="padding: 1rem; border: 1px solid #ddd; border-radius: 12px; background: #fff7e6;">
      <h2>Note</h2>
      <p>The remote game uses your local wallet proxy at <code>{localApiHost}/wallet</code> for all wallet calls.</p>
      <p>Requests under <code>/wallet/api</code> are forwarded to Hacksaw's RGS, while <code>/wallet/balance</code> is handled locally with a mocked USD 1000 balance.</p>
    </div>
  </div>

  {#if iframeVisible}
    <section style="margin-top: 2rem;">
      <h2>Embedded game</h2>
      <iframe
        src={gameUrl}
        width="100%"
        height="720"
        style="border: 1px solid #ccc; border-radius: 12px;"
        title="Hacksaw game iframe"
      ></iframe>
    </section>
  {/if}
</main>
