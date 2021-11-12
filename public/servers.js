// fetch server data on load, and fetch extra on click
// allow searching in server list

const serverList = document.querySelector("#servers")
const refreshSelected = document.querySelector("#refresh-server")
const selectedAddress = document.querySelector("#server-address")
const selectedVersion = document.querySelector("#server-version")
const selectedMaxPlayers = document.querySelector("#server-max-players")
const selectedPlayerList = document.querySelector("#server-players")
const selectedDescription = document.querySelector("#server-description")
const selectedLoader = document.querySelector("#server-modloader")
const selectedModList = document.querySelector("#server-mods")

const badVersion = "OHNOES😱😱😱😱😱😱😱😱😱😱😱😱😱😱😱😱😱"

const updateServerDetails = (address, newData) => {
    refreshSelected.disabled = false
    selectedAddress.innerText = address
    selectedVersion.innerText = `${newData.version.name} (protocol ${newData.version.protocol})`
    selectedDescription.innerHTML = newData.descriptionHtml
    
    selectedMaxPlayers.innerText = newData.players.max
    selectedPlayerList.innerHTML = ""
    const playersSummary = selectedPlayerList.appendChild(document.createElement("summary"))
    const playersStrong = playersSummary.appendChild(document.createElement("strong"))
    playersStrong.innerText = `Players (${newData.players.users.length})`
    const playersUl = selectedPlayerList.appendChild(document.createElement("ul"))
    newData.players.users.forEach((player) => {
        const li = playersUl.appendChild(document.createElement("li"))
        li.append(player.name)
    })

    selectedLoader.innerText = newData.modloader
    selectedModList.innerHTML = ""
    const modsSummary = selectedModList.appendChild(document.createElement("summary"))
    const modsStrong = modsSummary.appendChild(document.createElement("strong"))
    modsStrong.innerText = `Mods (${newData.mods.length})`
    const modsUl = selectedModList.appendChild(document.createElement("ul"))
    newData.mods.forEach((mod) => {
        const li = modsUl.appendChild(document.createElement("li"))
        li.append(mod.modid)
        const version = li.appendChild(document.createElement("small"))
        version.innerText = ` version ${mod.version === badVersion ? "unknown" : mod.version}`
    })
}

fetch("/api/v1/servers").then((result) => {return result.json()}).then((servers) => {
    Object.entries(servers).forEach((entry) => {
        const address = entry[0]
        const data = entry[1]

        var serverEntry = serverList.appendChild(document.createElement("li"))

        var serverIcon = serverEntry.appendChild(document.createElement("img"))
        serverIcon.src = data.icon || "pack.png"
        serverIcon.className = "server-icon"

        var serverAddress = serverEntry.appendChild(document.createElement("strong"))
        serverAddress.innerText = address

        serverEntry.appendChild(document.createElement("br"))
        var serverDescription = serverEntry.appendChild(document.createElement("div"))
        serverDescription.className = "motd"
        serverDescription.innerHTML = data.descriptionHtml

        var serverExtraInfo = serverEntry.appendChild(document.createElement("small"))
        serverExtraInfo.innerText = data.version.name
        serverExtraInfo.innerText += ` - ${data.modCount || "no"} mods`
        serverExtraInfo.innerText += ` - ${data.playerCount || "no"} players`

        serverEntry.onclick = async (e) => {
            const address = e.target.querySelector("strong").innerText
            const data = await (await fetch(`/api/v1/servers/${address}`)).json()
            updateServerDetails(address, data)
        }
    })
})

document.querySelector("#server-search").onkeyup = (e) => {
    const query = e.target.value.toUpperCase()
    for (var i = 0; i < serverList.childElementCount; i++) {
        var li = serverList.children[i]
        if (li.innerText.toUpperCase().indexOf(query) > -1) {
            li.hidden = false
        } else {
            li.hidden = true
        }
    }
}

refreshSelected.onclick = async (e) => {
    if (selectedAddress.innerText) {
        const newData = await (await fetch("/api/v1/updateServer", {
            method: "POST",
            body: JSON.stringify({address: selectedAddress.innerText}),
            headers: {"Content-Type": "application/json"}
        })).json()
        updateServerDetails(selectedAddress.innerText, newData)
    }
}
