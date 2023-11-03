const version = '1.1 - Build 3'

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
}

const theme = {
    background: localStorage.getItem('theme--background') ?? '161616',
    color: localStorage.getItem('theme--color') ?? '9fffdfe6'
}

const status = (async () => {
    const html = await fetch('https://github.com/MinecraftPublisher/yoko').then(e => e.text())
    let select = (html.match(/<summary class="color-[^"]+">/g) ?? ['<summary class="color-fg-success">'])[0]
    select = select.substring(16, select.length - 2)

    return select
})

const helpers = {
    hex_to_rgb: (hex) => {
        let result = /^#?([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})?$/i.exec(hex)
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        }: null
    },
    hex_inverse_bw: (hex) => {
        let rgb = helpers.hex_to_rgb(hex)
        let luminance = (0.2126 * rgb['r'] + 0.7152 * rgb['g'] + 0.0722 * rgb['b'])
        return (luminance < 140) ? '#ffffff': '#000000'
    }
}

const applyTheme = (() => {
    document.querySelector('.theme').innerHTML = `msg {
    border: 2px solid #${theme.color} !important;
    background-color: #${theme.color} !important;

    color: ${helpers.hex_inverse_bw('#' + theme.color)} !important;
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

const input = document.querySelector('input.message')
const messages = document.querySelector('messages')

const isPWA = (navigator.standalone ?? false) || window.matchMedia('(display-mode: standalone)').matches

let stuff = []
let passcode = ''

const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
})

const message = ((text, deletable = true) => {
    const msg = document.createElement('msg')
    msg.innerHTML = text

    let clicked = false

    if (deletable) {
        msg.onclick = (e) => {
            if (clicked === true) {
                clicked = false
                messages.removeChild(msg)
                let index = stuff.findIndex(e => (e === msg.innerHTML))
                stuff = stuff.filter((e, i) => i !== index)
                localStorage.setItem('data', encrypt(JSON.stringify(stuff), passcode))
            } else {
                clicked = true
                msg.style.setProperty('backgroundColor', 'rgb(255, 142, 142)', 'important')
                msg.style.setProperty('borderColor', 'rgb(255, 142, 142)', 'important')

                setTimeout(() => {
                    clicked = false
                    msg.style.backgroundColor = ''
                    msg.style.borderColor = ''
                }, 1000)
            }
        }
    }

    messages.scrollTop = messages.scrollHeight
    messages.appendChild(msg)
})

const clear = ((text) => {
    messages.innerHTML = ``
})

if (!isPWA) {
    input.style.display = 'none'
    document.querySelector('hr').style.display = 'none'
    message('<div style="text-align: center;"><img src="webicon.png" width=150 height=150><br>Yoko v' + version + '</div>', false)
    message('Please add this website to your home screen to use it.', false)
    message('This pwa is not supported on desktop devices.', false)
    throw 'ERR_NOT_SUPPORTED'
}

const encrypt = ((text, code) => CryptoJS.AES.encrypt(text, code))
const decrypt = ((text, code) => CryptoJS.AES.decrypt(text, code).toString(CryptoJS.enc.Utf8))

window.onerror = (e) => {}

let keypress = {
    default: () => {}
    }
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

            keypress.default = (e) => {
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

            keypress.default = (e) => {
                if (e.key === 'Enter') {
                    if (input.value === '.clear') {
                        input.value = ''
                        input.setAttribute('disabled', '')
                        message('Your data has been completely wiped.')
                        localStorage.clear()
                        location.reload()
                        // message('Cannot wipe data while locked. Unlock your data to continue.', false)
                        // return
                    }

                    if (input.value === '.refresh') {
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

                    if (input.value !== '' && decrypt(passcode, input.value) === input.value) {
                        message('Please wait while we decrypt your data...', false)
                        passcode = decrypt(passcode, input.value)
                        input.value = ''

                        input.setAttribute('type', '')

                        stuff = JSON.parse(decrypt((localStorage.getItem('data') ?? encrypt('[]', passcode)), passcode))

                        input.setAttribute('placeholder', 'Type a message...')

                        clear()
                        if (stuff.length === 0) {
                            message('There are no messages here, Send one to get started. Double click a message, and it will be deleted.')
                            message('Use ".clear" as your input anywhere in the app to wipe your data.')
                            message('If you want to move your data to another device, Use ".share" as your input while unlocked to display a QR code that can be scanned to move your data.')
                            message('Remember, The relocated data will still be encrypted with the passcode used on the previous device.')
                        } else {
                            let remaining = stuff
                            let q = -1

                            const run = (() => {
                                if (remaining[0]) {
                                    message(remaining[0])
                                    remaining = remaining.slice(1)

                                    messages.scrollTo({
                                        top: messages.scrollHeight,
                                        behavior: 'smooth'
                                    })
                                } else clearInterval(q)
                            })

                            run()
                            q = setInterval(run,
                                250 / remaining.length)
                        }

                        keypress.default = (j) => {
                            if (j.key === 'Enter') {
                                if (input.value === '.clear') {
                                    localStorage.clear()
                                    messages.innerHTML = ''
                                    message('Your data has been completely wiped.')
                                    input.value = ''
                                    input.setAttribute('disabled', '')
                                    return
                                }

                                if (input.value === '.refresh') {
                                    location.reload()
                                    return
                                }

                                if (input.value === '.share') {
                                    messages.innerHTML = ''
                                    message('Your messages have been hidden for privacy.', false)
                                    message('Click anywhere to reload.', false)

                                    let qr = new QRious({
                                        element: document.querySelector('canvas'),
                                        value: 'https://minecraftpublisher.github.io/yoko/?data=' + btoa(localStorage.getItem('data')) + '&passcode=' + btoa(localStorage.getItem('passcode')),
                                        level: 'L',
                                        size: 500
                                    })
                                    document.querySelector('qr').style.display = 'block'

                                    document.onclick = (e) => location.reload()

                                    return
                                }

                                if (input.value === '.change') {
                                    messages.innerHTML = ''
                                    message('Your messages have been hidden for privacy.', false)

                                    message('Enter your new password.', false)

                                    input.value = ''
                                    input.setAttribute('type', 'password')
                                    input.placeholder = 'Enter new password...'

                                    keypress.default = (k) => {
                                        if (k.key === 'Enter') {
                                            let newpassword = input.value
                                            input.value = ''
                                            let encrypted = encrypt(newpassword, newpassword)
                                            let recrypted_data = encrypt(JSON.stringify(stuff), newpassword)

                                            localStorage.setItem('passcode', encrypted)
                                            localStorage.setItem('data', recrypted_data)
                                            location.reload()
                                        }
                                    }

                                    return
                                }

                                if (input.value.startsWith('.theme')) {
                                    let _color = input.value.substring('.theme '.length)
                                    if (_color === '') {
                                        message('`.theme [background color] [foreground/message color]`<br>Current theme:<br>Background color: #' + theme.background + '<br>Message color: #' + theme.color + '<br><br>This message is not saved to your database.')
                                        return
                                    }

                                    let colors = _color.split(' ')
                                    if (colors.length !== 2) {
                                        message('Invalid syntax.<br>`.theme [background color] [foreground/message color]`')
                                    }

                                    let background = colors[0]
                                    if (background.startsWith('#')) background = background.substring(1)

                                    let color = colors[1]
                                    if (color.startsWith('#')) color = color.substring(1)

                                    if (background.length > 8 || background.length < 2) {
                                        message('Invalid hex background color. Should optionally start with a # and be withing range of [2, 8] encoded in hex format.')
                                    }

                                    if (color.length > 8 || color.length < 2) {
                                        message('Invalid hex foreground/message color. Should optionally start with a # and be withing range of [2, 8] encoded in hex format.')
                                    }

                                    theme.background = background
                                    theme.color = color

                                    input.value = ''
                                    applyTheme()
                                    return
                                }

                                if (input.value === '') return

                                let current = new Date()
                                let text = input.value + '\n<date>' + current.toLocaleString('en-us', {
                                    month: 'short', year: 'numeric', day: 'numeric'
                                }) + ' at ' + current.toLocaleTimeString('en-gb', {
                                    hour: '2-digit', minute: '2-digit'
                                }) + '</date>'
                                input.value = ''

                                message(text)
                                stuff.push(text)
                                localStorage.setItem('data', encrypt(JSON.stringify(stuff), passcode))
                            }
                        }
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

    message('<div style="text-align: center;"><img src="webicon.png" width=150 height=150><br>Yoko v' + version + '</div>', false)
    g()