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

sw.addEventListener('activate', async (e) => {
    const cache = await caches.open('yoko')

    console.log('Storing cache...')
    await cache.addAll([
        '/',
        '/index.html',
        '/yoko.js',
        '/styles.css',
        '/journal.png',
        '/webicon.png',
        '/crypto.js'
    ])
})

sw.addEventListener('fetch', async (e) => {
    if(e.request.url.includes('clean')) {
        console.log('Cleaning')
        await caches.delete('yoko')
        
        e.respondWith(new Response('Cleared data'))
        e.waitUntil(new Promise((resolve, reject) => { setTimeout(() => { resolve() }, 5000) }))

        return
    }
    
    const cache = await caches.open('yoko')
    let match = await cache.match(e.request)
    if(!match) {
        match = await fetch(e.request)
        cache.put(e.request, match)
    }
    
    try {
        e.respondWith(match ?? new Response('Offline'))
    } catch (e) {
        console.log('Cache fullfilled response')
    }
    
    /* e.respondWith((async () => {
        const cache = await caches.open('yoko')
		let match = await cache.match(e.request)
		if(match) return match
        let resp = await fetch(e.request).catch(() => match ?? new Response('Offline'))
        cache.put(e.request, await resp.clone())

        return await resp.clone()
    })()) */
})