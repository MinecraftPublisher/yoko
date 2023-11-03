/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/** @type {ServiceWorkerGlobalScope} */
const sw = self

let online = false

sw.addEventListener('fetch', (e) => {
    e.respondWith((async () => {
        const cache = await caches.open('yoko')
				let match = await cache.match(e.request)

        return await fetch(e.request).catch(() => match ?? new Response('Offline'))
    })())
})