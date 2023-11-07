const version = '1.2 - Build 2.1'

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
}

const loadState = (async (state) => {
    let data = await fetch('js/states/' + state + '.js').then(e => e.text())
    const args = [
        'message',
        'decrypt',
        'encrypt',
        'passcode',
        'input',
        'clear',
        'theme',
        'messages',
        'init',
        'logo',
        'version',
        'applyTheme',
        'value2',
        'tryJSON'
    ]
    return new Function(...args, data)
})

// for now until cutomization option is added
const wipeLocked = true

const theme = {
    background: localStorage.getItem('theme--background') ?? '161616',
    color: localStorage.getItem('theme--color') ?? '9fffdfe6'
}

function getRelativeTimeString(date, lang = navigator.language) {
    const timeMs = typeof date === 'number' ? date : date.getTime()
    const deltaSeconds = Math.floor((timeMs - Date.now()) / 1000)

    const cutoffs = [60,
        3600,
        86400,
        86400 * 7,
        86400 * 30,
        86400 * 365,
        Infinity]

    const units = ['second',
        'minute',
        'hour',
        'day',
        'week',
        'month',
        'year']
    const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds))

    const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1
    const rtf = new Intl.RelativeTimeFormat(lang, {
        numeric: 'auto'
    })

    return rtf.format(Math.floor(deltaSeconds / divisor), units[unitIndex])
}

let last_cache

const buildStatus = (async () => {
    if (last_cache) return `Last built ${getRelativeTimeString(last_cache)}`
    let last_build

    try {
        last_build = await fetch('last_build.txt').then(e => e.text()).catch(e => `${(Date.now() / 2) / 1000}`)
        if (isNaN(parseInt(last_build))) last_build = `${(Date.now() / 2) / 1000}`
    } catch (e) {
        last_build = `${(Date.now() / 2) / 1000}`
    }

    if (Date.now() - (parseInt(last_build) * 1000) < 60000) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister()
            }
        })
    }

    last_cache = parseInt(last_build) * 1000
    return `Last built ${getRelativeTimeString(last_cache)}`
})

const helpers = {
    hex_to_rgb: (hex) => {
        let result = /^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})?$/i.exec(hex)
        return result ? {
            r: parseInt(result[1],
                16),
            g: parseInt(result[2],
                16),
            b: parseInt(result[3],
                16)
        } : null
    },
    hex_inverse_bw: (hex) => {
        let rgb = helpers.hex_to_rgb(hex)
        let luminance = (0.2126 * rgb['r'] + 0.7152 * rgb['g'] + 0.0722 * rgb['b'])
        return (luminance < 140) ? '#ffffff' : '#000000'
    }
}

const applyTheme = (() => {
    document.querySelector('.theme').innerHTML = `
    :root {
        --foreground: #${helpers.hex_inverse_bw('#' + theme.color)};
        --background: #${theme.background.substring(6)};
    }

    msg {
        border: 2px solid #${theme.color} !important;
        background-color: #${theme.color} !important;

        color: #${helpers.hex_inverse_bw('#' + theme.color)} !important;
    }

    body {
        background-color: #${theme.background};
    }`

    document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]').setAttribute('content', `#${theme.background}`)
    document.querySelector('meta[name=theme-color]').setAttribute('content', `#${theme.background}`)

    localStorage.setItem('theme--background', theme.background)
    localStorage.setItem('theme--color', theme.color)
})

applyTheme()

setInterval(async () => {
    let yokos = document.querySelectorAll('yoko') ?? []
    let result = await buildStatus()

    for (let yoko of yokos) {
        if (yoko.innerHTML.includes('Yoko v')) {
            yoko.querySelector('div > span').innerHTML = result
            continue
        }

        yoko.innerHTML = `<div style="text-align: center;"><img src="webicon.png" width=150 height=150><br>
            Yoko v${version}<br><br>
            <span class="build-status" onclick="clearData()">${result}</span>
        </div>`
    }
}, 100)

try {
    await import('./notification.js')
} catch (e) { }

let input = document.querySelector('input.message')
const messages = document.querySelector('messages')

const isPWA = (navigator.standalone ?? false) || window.matchMedia('(display-mode: standalone)').matches

let stuff = []
let passcode = ''

const encrypt = ((text, code) => CryptoJS.AES.encrypt(text, code))
const decrypt = ((text, code) => CryptoJS.AES.decrypt(text, code).toString(CryptoJS.enc.Utf8))

const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
})

globalThis.messageCodeClick = (id) => {
    let element = document.getElementById(`doc-${id}`)
    if (element) navigator.clipboard.writeText(element.innerHTML)

    return false
}

let lastMessage
const message = ((text, deletable = true) => {
    if (lastMessage === text) return
    lastMessage = text
    const msg = document.createElement('msg')

    msg.innerHTML = text.replace(/^\n/g, '').replaceAll('\n', '<br>')
        .replace(new RegExp('```[^`]+```', 'g'), (g) => {
            let txt = g.substring(3, g.length - 3)
            let id = (Math.floor(Math.random() * 899999999) + 100000000).toString()
            return `<code><textarea readonly id="doc-${id}" onclick="return globalThis.messageCodeClick('${id}')">${txt}</textarea></code>`
        })

    let clicked = false

    if (deletable) {
        msg.onclick = (e) => {
            if (clicked === true) {
                clicked = false

                stuff = JSON.parse(decrypt(localStorage.getItem('data'), passcode))
                // let index = stuff.findIndex(e => (e === msg.innerHTML || e.includes(msg.innerHTML)))
                stuff = stuff.filter((e) => !(e === msg.innerHTML || e.includes(msg.innerHTML)) &&
                    !(e === msg.innerHTML.replaceAll('<br>', '\n') || e.includes(msg.innerHTML.replaceAll('<br>', '\n'))))

                messages.removeChild(msg)
                if (stuff.length > 0) localStorage.setItem('data', encrypt(JSON.stringify(stuff), passcode))
            } else {
                clicked = true
                msg.setAttribute('style', 'background-color: rgb(255, 142, 142) !important; border: 2px solid rgb(255, 142, 142) !important;')

                setTimeout(() => {
                    clicked = false
                    msg.setAttribute('style', '')
                }, 1000)
            }
        }
    }

    messages.scrollTo({
        top: messages.scrollHeight + 1000,
        behavior: 'smooth'
    })
    messages.appendChild(msg)
    messages.scrollTo({
        top: messages.scrollHeight + 1000,
        behavior: 'smooth'
    })
})

const clear = ((text) => {
    messages.innerHTML = ``
})

globalThis.clearData = () => {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister()
        }
    })

    location.reload()
}

const logo = (async () => {
    message(`<yoko></yoko>`, false)
})

/* if (!isPWA) {
    input.style.display = 'none'
    document.querySelector('hr').style.display = 'none'
    await logo()
    message('Please add this website to your home screen to use it.', false)
    message('This pwa is not supported on desktop devices.', false)
    throw 'ERR_NOT_SUPPORTED'
} */

window.onerror = (e) => { }

let keypress = {
    default: () => { }
}

globalThis.keypress = keypress

input.onkeypress = (e) => {
    keypress.default(e)
}

const init = (() => {
    console.log('CryptoJS was successfully loaded!')

    passcode = (localStorage.getItem('passcode') ?? 'null')

    if (params.data) {
        if (localStorage.getItem('passcode')) {
            let output = prompt('Do you want to import and overwrite your currently existing data? Type in your current passcode to overwrite.')
            if (decrypt(passcode, output) === output) {
                overwrite()
            } else {
                alert('Incorrect passcode.')
            }
        } else overwrite()

        location.replace(location.href.split('?')[0])
    }

    if (passcode === 'null') {
        message('Please choose a passcode to encrypt your data with and type it down below, Then press enter.', false)

        // let interval = setInterval(() => {
        //     let element = document.querySelector('input:is(:-webkit-autofill)')
        //     if (element) {
        //         element.onfocus = (k) => setTimeout(() => keypress.default({ key: 'Enter' }), 300)
        //     }
        // }, 500)

        keypress.default = (e) => {
            // clearInterval(interval)

            if (e.key === 'Enter') {
                passcode = encrypt(input.value, input.value)
                localStorage.setItem('passcode', passcode)
                localStorage.setItem('data', encrypt('[]', input.value))
                input.value = ''
                location.reload()
            }
        }
    } else {
        message('Please enter your passcode below to unlock your data.', false)

        // let interval = setInterval(() => {
        //     let element = document.querySelector('input:is(:-webkit-autofill)')
        //     if (element) {
        //         element.onfocus = (k) => setTimeout(() => keypress.default({ key: 'Enter' }), 300)
        //     }
        // }, 500)

        const tryJSON = (passcode) => {
            try {
                JSON.parse(decrypt((localStorage.getItem('data') ?? encrypt('[]', passcode)), passcode))
                return true
            } catch (e) {
                return false
            }
        }

        input.onblur = (e) => {
            let value2 = input.value
            passcode = (localStorage.getItem('passcode') ?? 'null')
            if (value2 !== '' && decrypt(passcode, value2) === value2 && tryJSON(value2)) {
                passcode = decrypt(localStorage.getItem('passcode') ?? 'null', value2)
                loadState('journal').then(e => {
                    // console.log(e)
                    e(message, decrypt, encrypt, passcode, input, clear, theme, messages, init, logo, version, applyTheme, value2, tryJSON)
                })
            }
        }

        keypress.default = (e) => {
            // clearInterval(interval)

            let value2 = input.value + e.key
            if (value2 !== '' && decrypt(passcode, value2) === value2 && tryJSON(value2)) {
                loadState('journal').then(e => {
                    // console.log(e)
                    e(message, decrypt, encrypt, passcode, input, clear, theme, messages, init, logo, version, applyTheme, value2, tryJSON)
                })
            }

            if (e.key === 'Enter') {
                if (input.value === '.clear') {
                    if (wipeLocked) {
                        input.value = ''
                        input.setAttribute('disabled', '')
                        message('Your data has been completely wiped.')
                        localStorage.clear()
                        location.reload()
                    } else {
                        message('Cannot wipe data while locked. Unlock your data to continue.', false)
                    }

                    return
                }

                if (input.value.startsWith('.reset')) {
                    if (input.value === '.reset') {
                        message('Please supply a password.', false)
                        return
                    }

                    let input__passcode = input.value.substring('.reset '.length)
                    if (input__passcode) {
                        if (decrypt(passcode, input__passcode) === input__passcode) {
                            input.value = ''
                            input.setAttribute('disabled', '')
                            message('Your data has been completely wiped.')
                            localStorage.clear()
                            location.reload()
                            return
                        } else {
                            message('Invalid passcode.', false)
                            return
                        }
                    } else {
                        message('Please supply a password.', false)
                        return
                    }
                }

                if (input.value === '.refresh') {
                    navigator.serviceWorker.getRegistrations().then(function (registrations) {
                        for (let registration of registrations) {
                            registration.unregister()
                        }
                    })
                    location.reload()
                    return
                }

                if (input.value === '.share') {
                    message('Cannot move data while locked. Unlock your data to continue.', false)
                    return
                }

                if (input.value === '.change') {
                    message('Cannot change passcode while locked. Unlock your data to continue.', false)
                }

                if (input.value.startsWith('.theme')) {
                    message('Cannot customize theme while locked. Unlock your data to continue.', false)
                }

                if (input.value !== '' && tryJSON(input.value)) {
                    loadState('journal').then(e => {
                        // console.log(e)
                        e(message, decrypt, encrypt, passcode, input, clear, theme, messages, init, logo, version, applyTheme, value2, tryJSON)
                    })
                } else {
                    input.value = ''
                    message('Incorrect passcode! Please try again.', false)
                }
            }
        }
    }
})

const g = (() => {
    if (globalThis['CryptoJS']) init()
    else setTimeout(g, 100)
})

const overwrite = (() => {
    let data = params.data
    let passcode = params.passcode

    localStorage.setItem('data', atob(data))
    localStorage.setItem('passcode', atob(passcode))
})

await logo()
g()
