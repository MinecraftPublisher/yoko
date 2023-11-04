/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

function fetchWithTimeout(resource, timeout) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  const response = fetch(resource, {
    timeout,
    signal: controller.signal  
  })
  clearTimeout(id)

  return response
}

sw.addEventListener('fetch', (e) => {
    if(e.request.url.includes('clean')) {
        await caches.delete('yoko')
        e.respondWith(new Response('Cleared data'))
        return
    }
    
    const cache = await caches.open('yoko')
    let match = await cache.match(e.request)
    if(!match) {
        match = await fetch(e.request)
        cache.put(e.request, match)
    }
    
    e.respondWith(match ?? new Response('Offline'))
    
    /* e.respondWith((async () => {
        const cache = await caches.open('yoko')
		let match = await cache.match(e.request)
		if(match) return match
        let resp = await fetch(e.request).catch(() => match ?? new Response('Offline'))
        cache.put(e.request, await resp.clone())

        return await resp.clone()
    })()) */
})