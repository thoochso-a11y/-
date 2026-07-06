const routes = {
  game: /\/game\/([^\/]+)\/(.*)/,
  bypass: /\/bypass\/(.*)/,
  assets: /\/assets\/(.*)/,
  search: /\/q\/r\/([a-f0-9]+)$/
};

// Blocked domains that redirect traffic or serve ads
const blockedDomains = [
  'overhearappointdare.com',
  'https://overhearappointdare.com/',
  'googletagmanager.com',
  'google-analytics.com',
  'doubleclick.net',
  'adservice.google.com',
  'pagead2.googlesyndication.com',
  'ads.google.com'
];

// Blocked URL patterns for ads and tracking
const blockedPatterns = [
  /\/ads\//i,
  /\/adv\//i,
  /\/advertisement\//i,
  /\/tracking\//i,
  /\/analytics\//i,
  /ga\.js/i,
  /google-analytics/i,
  /gtag\.js/i,
  /googletagmanager/i
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

function isBlockedPattern(url) {
  return blockedPatterns.some(pattern => pattern.test(url));
}

function isAd(url) {
  return isBlockedDomain(url) || isBlockedPattern(url);
}

self.addEventListener('fetch', async (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Block ads and tracking
  if (isAd(request.url)) {
    event.respondWith(
      new Response(JSON.stringify({ 
        error: 'Blocked ad/tracking request', 
        blocked: true,
        url: request.url,
        type: 'ad-blocker'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    return;
  }

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
    // Block if target URL contains blocked domain or pattern
    if (isBlockedDomain(request.url) || isBlockedPattern(request.url)) {
      return new Response(JSON.stringify({ 
        error: 'Blocked domain/ad',
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