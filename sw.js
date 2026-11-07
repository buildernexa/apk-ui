const C="v1";
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html"]))));
self.addEventListener("fetch",e=>{if(e.request.url.includes("api.github.com")||e.request.method!=="GET")return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
