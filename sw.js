/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

let online = false

sw.addEventListener('online', () => online = true)
sw.addEventListener('offline', () => online = false)

sw.addEventListener('fetch', (e) => {
    e.respondWith((async () => {
        const cache = await caches.open('yoko')

        if(online) return await fetch(e.request)
        else {
            let match = await cache.match(e.request)
            return match ?? new Response('Offline')
        }
    })())
})