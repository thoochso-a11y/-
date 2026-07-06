const routes = {
  game: /\/game\/([^\/]+)\/(.*)/,
  bypass: /\/bypass\/(.*)/,
  assets: /\/assets\/(.*)/,
  search: /\/q\/r\/([a-f0-9]+)$/
};

// Blocked domains that redirect traffic
const blockedDomains = [
  'overhearappointdare.com',
  'https://overhearappointdare.com/'
];

// Handle hashed search index requests
const searchIndexes = {
  '0117461c3458437d0207531826534231060e1d5e77505c7d58511d5f775758625e501d': 'ultraviolet-index',
  '0117461c3458437d0e0c5d0b2b074231060e': 'scramjet-index'
};

function matchRoute(path) {
  for (const route in routes) {
    if (routes[route].test(path)) return route;
  }
  return null;
}

function isBlockedDomain(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    return blockedDomains.some(domain => 
      domain.includes(hostname) || hostname.includes(domain.replace(/https?:\/\//, ''))
    );
  } catch {
    return blockedDomains.some(domain => url.includes(domain));
  }
}

self.addEventListener('fetch', async (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Block redirects to overhearappointdare.com
  if (isBlockedDomain(request.url)) {
    event.respondWith(
      new Response(JSON.stringify({ 
        error: 'Blocked domain', 
        blocked: true,
        url: request.url 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    return;
  }

  // Check if this is a hashed search index request
  const hashMatch = pathname.match(/\/q\/r\/([a-f0-9]+)$/);
  if (hashMatch) {
    const hash = hashMatch[1];
    if (searchIndexes[hash]) {
      event.respondWith(
        new Response(JSON.stringify({
          type: searchIndexes[hash],
          indexed: true,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      );
      return;
    }
  }

  // Check if it matches a route
  const route = matchRoute(pathname);
  
  if (route) {
    event.respondWith(handleRoute(request, route));
  } else {
    event.respondWith(fetch(request));
  }
});

async function handleRoute(request, route) {
  try {
    // Block if target URL contains blocked domain
    if (isBlockedDomain(request.url)) {
      return new Response(JSON.stringify({ 
        error: 'Blocked domain',
        blocked: true 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return await fetch(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, route }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));