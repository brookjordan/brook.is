self.importScripts("./pwa/cache-details.js");

const PLACEHOLDER_FILE_MAP = {
  html: "offline.html",
};

async function cacheFetchRequest(request, cache) {
  try {
    let response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    throw "fetch-failed";
  }
}

async function cacheFirst(request) {
  let cache = await caches.open(cacheName);
  let fetchResponse = cacheFetchRequest(request, cache).catch(error => undefined);
  try {
    let response = await cache.match(request);
    //console.log(await cache.keys());
    if (typeof response === "undefined") { response = await fetchResponse; }
    if (typeof response === "undefined") { throw "cache-failed"; }
    return response;
  } catch (error) {
    throw "cache-failed";
  }
};

async function networkFirst(request) {
  let cache = await caches.open(cacheName);
  try {
    let response = await cacheFetchRequest(request, cache).catch(error => undefined);
    if (typeof response === "undefined") { response = await cache.match(request); }
    return response;
  } catch (e) {
    throw "request-failed";
  }
}

async function fetchOfflineFile(event) {
  let cache = await caches.open(cacheName);
  let fileTypeResult = /.(\w+)[?#$]/.exec(event.request.url);
  let fileType = fileTypeResult && fileTypeResult[1] || "html";
  return cache.match(PLACEHOLDER_FILE_MAP[fileType]);
}

async function fetchRequest(event) {
  let response;
  try {
    response = /\.json(\?|$)/.test(event.request.url)
      ? await networkFirst(event.request)
      : await cacheFirst(event.request);
  } catch (error) {
    response = fetchOfflineFile(event);
  }
  return response;
}

self.addEventListener("install", event => {
  let preCache = async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(staticAssets);
  };
  event.waitUntil(preCache());
});

self.addEventListener("fetch", event => {
  if (!/^https?:\/\//.test(event.request.url)) { return };
  event.respondWith(fetchRequest(event));
});
