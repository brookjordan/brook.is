self.importScripts("./pwa/cache-details.js");

const PLACEHOLDER_FILE_MAP = {
  html: "offline.html",
};

async function getStreamData(stream) {
  let reader;

  try {
    let data = new Uint8Array();
    if (!stream) { return null; }
    reader = stream.getReader();
    if (!reader || !reader.read) { return null; }
    let done;
    let value;
    do {
      ({ done, value } = await reader.read());
      if (value) {
        let newData = new Uint8Array(data.length + value.length);
        newData.set(data);
        newData.set(value, data.length);
        data = newData;
      }
    } while (!done);
    return data;
  } catch (error) {
    console.log(error);
  } finally {
    reader && reader.releaseLock && reader.releaseLock();
  }
}

async function cacheFetchRequest(request, cache, { clientId } = {}) {
  let response;
  try {
    response = await fetch(request);
    if (clientId) {
      Promise.all([
        clients.get(clientId),
        cache.match(request)
          .then(cacheStream => getStreamData(cacheStream.body)),
        getStreamData(response.clone().body),
      ])
        .then(([ client, cacheData, responseData ]) => {
          if (!cacheData || !responseData) { return; }
          if (!cacheData.every((value, i) => value === responseData[i])) {
            client.postMessage({
              type: "cache expiry"
            });
          }
        });
    }
    cache.put(request, response.clone());
  } catch (error) {
    throw `fetch failed: ${error}`;
  }

  return response;
}

async function cacheFirst({ request, clientId }) {
  let cache = await caches.open(cacheName);
  let fetchResponse = cacheFetchRequest(request, cache, { clientId }).catch(error => undefined);
  try {
    let response = await cache.match(request);
    if (typeof response === "undefined") { response = await fetchResponse; }
    if (typeof response === "undefined") { throw "cache-failed"; }
    return response;
  } catch (error) {
    throw `cache-failed: ${error}`;
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
      : await cacheFirst(event);
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
