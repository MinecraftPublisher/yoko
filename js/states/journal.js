message('Please wait while we decrypt your data...', false)
if (!tryJSON(value2)) {
    message('Invalid or corrupted passcode or data.', false)
    return
}

// passcode = decrypt(passcode, value2)

const box = document.querySelector('box')

window.onblur = (e) => {
    setTimeout(async () => {
        if (!document.hasFocus()) {
            window.onblur = () => { }
            stuff = []
            passcode = ''
            messages.innerHTML = ''
            box.innerHTML = `
                                <form>
                                    <input
                                        type="password" autocapitalize="false"
                                        autocomplete="false" spellcheck="false"
                                        class="message"
                                        placeholder="Enter your passcode..." />
                                </form>`

            await logo()
            init()
        }
    }, 5000)
}

box.innerHTML = `<textarea value="" rows="2"
                            placeholder="Type a message..." 
                            autocomplete="true" spellcheck="true" 
                            class="message" />`

input = box.querySelector('textarea.message')
input.onkeypress = (e) => {
    // input.value = input.innerText
    keypress.default(e)
}

try {
    stuff = JSON.parse(decrypt((localStorage.getItem('data') ?? encrypt('[]', value2)), value2))
} catch (e) {
    return
}

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
                top: messages.scrollHeight + 10000,
                behavior: 'smooth'
            })
        } else clearInterval(q)
    })

    run()
    q = setInterval(run,
        250 / remaining.length)
}

let lastEnter = false
keypress.default = (j) => {
    if (j.key !== 'Enter') {
        lastEnter = false
        return true
    }

    if (!lastEnter) {
        lastEnter = true
        return true
    }

    lastEnter = false
    input.value = input.value.replace(/\n$/g, '')

    if (input.value === '.clear') {
        localStorage.clear()
        messages.innerHTML = ''
        message('Your data has been completely wiped.')
        input.value = ''
        setTimeout(() => { input.value = '' }, 100)
        input.setAttribute('disabled', '')
        return
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

        input.value = ''
        setTimeout(() => { input.value = '' }, 100)
        return
    }

    if (input.value === '.change') {
        messages.innerHTML = ''
        message('Your messages have been hidden for privacy.', false)

        message('Enter your new password.', false)

        input.value = ''
        setTimeout(() => { input.value = '' }, 100)
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
        setTimeout(() => { input.value = '' }, 100)
        applyTheme()
        return
    }

    if (input.value === '.export') {
        let localData = new Array(localStorage.length).fill().map((e, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i))])
        let encoded = btoa(encodeURI(JSON.stringify(localData)))
        let output = `[yoko:${version}](${encoded})`

        message('Output:\n```' + output + '```', false)

        input.value = ''
        setTimeout(() => { input.value = '' }, 100)
        return
    }

    if (input.value === '.import') {
        input.value = ''
        setTimeout(() => { input.value = '' }, 100)

        let _prompt = prompt('Please paste your import data below:')
        let syntax = _prompt.match(/^\[yoko:[^\]]+\]\(/)
        if (!syntax) message('Invalid syntax.', false)

        let data = _prompt.split('](').slice(1).join('](')
        data = data.substring(0, data.length - 1)

        let decoded = JSON.parse(decodeURI(atob(data)))

        localStorage.clear()
        for (let entry of decoded) {
            let key = entry[0]
            let value = entry[1]

            localStorage.setItem(key, value)
        }

        location.reload()

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
    setTimeout(() => { input.value = '' }, 100)
}