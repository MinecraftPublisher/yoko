let granted = false

if (Notification.permission === 'granted') {
    granted = true
} else if (Notification.permission !== 'denied') {
    let permission = await Notification.requestPermission()
    granted = permission === 'granted' ? true : false
}

/** @type {ServiceWorkerGlobalScope}  */
let serviceWorker = await navigator.serviceWorker.getRegistration()

try {
    serviceWorker.periodicSync.register()
    alert('Periodic sync registered')
} catch (e) {
    alert('Failed to register periodic sync!')
}