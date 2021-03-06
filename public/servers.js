// fetch server data on load, and fetch extra on click
// allow searching in server list

const serverList = document.querySelector("#servers")
const selectedAddress = document.querySelector("#server-address")
const selectedVersion = document.querySelector("#server-version")
const selectedMaxPlayers = document.querySelector("#server-max-players")
const selectedPlayerList = document.querySelector("#server-players")
const selectedDescription = document.querySelector("#server-description")
const selectedLoader = document.querySelector("#server-modloader")
const selectedModList = document.querySelector("#server-mods")

const badVersion = "OHNOESπ±π±π±π±π±π±π±π±π±π±π±π±π±π±π±π±π±"

var resultsFilter = ""
var resultsPage = 0
const pageSize = 10

var totalServerCount
fetch("/api/v1/count/servers").then((result) => {return result.text()}).then((count) => {totalServerCount = count})

const updateServerDetails = (address, newData) => {
    document.querySelector("#refresh-server").disabled = false
    document.querySelector("#remove-server").disabled = false
    selectedAddress.innerText = address
    selectedVersion.innerText = `${newData.version.name} (protocol ${newData.version.protocol})`
    selectedDescription.innerHTML = newData.descriptionHtml
    
    selectedMaxPlayers.innerText = newData.players.max
    selectedPlayerList.innerHTML = ""
    const playersSummary = selectedPlayerList.appendChild(document.createElement("summary"))
    const playersStrong = playersSummary.appendChild(document.createElement("strong"))
    playersStrong.innerText = `All players (${Object.entries(newData.players.users).length})`
    const playersUl = selectedPlayerList.appendChild(document.createElement("ul"))
    Object.entries(newData.players.users).forEach((entry) => {
        const uuid = entry[0]
        const name = entry[1]
        const li = playersUl.appendChild(document.createElement("li"))
        li.append(name)
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

const fetchServers = (limit, offset, filter) => {
    var url
    if (filter && filter !== "") {
        url = `/api/v1/servers?limit=${limit}&offset=${offset}&filter=${filter}`
    } else {
        url = `/api/v1/servers?limit=${limit}&offset=${offset}`
    }

    fetch(url).then((result) => {return result.json()}).then((servers) => {
        serverList.innerHTML = ""  // delete any servers that are already here
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
}

document.querySelector("#server-search").onkeyup = (e) => {
    if (e.which === 13) {document.querySelector("#search-go").onclick()}
}

document.querySelector("#search-go").onclick = async (e) => {
    resultsFilter = document.querySelector("#server-search").value
    resultsPage = 0
    totalServerCount = await (await fetch(`/api/v1/count/servers?filter=${resultsFilter}`)).text()
    document.querySelector("#previous-page").disabled = true
    if ((resultsPage + 1) * pageSize > totalServerCount) {
        document.querySelector("#next-page").disabled = true
    } else {
        document.querySelector("#next-page").disabled = false
    }
    fetchServers(pageSize, resultsPage * pageSize, resultsFilter)
}

document.querySelector("#previous-page").onclick = (e) => {
    resultsPage--
    if (resultsPage <= 0) {
        e.target.disabled = true
        resultsPage = 0
    }
    document.querySelector("#next-page").disabled = false
    fetchServers(pageSize, resultsPage * pageSize, resultsFilter)
}

document.querySelector("#next-page").onclick = (e) => {
    resultsPage++
    document.querySelector("#previous-page").disabled = false
    if ((resultsPage + 1) * pageSize > totalServerCount) {
        e.target.disabled = true
    }
    fetchServers(pageSize, resultsPage * pageSize, resultsFilter)
}

document.querySelector("#refresh-server").onclick = async (e) => {
    if (selectedAddress.innerText) {
        const newData = await (await fetch("/api/v1/updateServer", {
            method: "POST",
            body: JSON.stringify({address: selectedAddress.innerText}),
            headers: {"Content-Type": "application/json"}
        })).json()
        updateServerDetails(selectedAddress.innerText, newData)
    }
}

document.querySelector("#remove-server").onclick = async (e) => {
    if (selectedAddress.innerText) {
        if (confirm(`Are you sure you want to remove ${selectedAddress.innerText}? This can't be undone.`)) {
            await fetch(`/api/v1/servers/${selectedAddress.innerText}`, {
                method: "DELETE"
            })
            window.location.reload(false)
        }
    }
}

fetchServers(pageSize, 0)
document.querySelector("#next-page").disabled = false
