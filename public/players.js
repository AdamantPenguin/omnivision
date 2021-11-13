// allow searching of players and show extra data

const playerList = document.querySelector("#players")
const selectedUsername = document.querySelector("#player-username")
const selectedUuid = document.querySelector("#player-uuid")
const selectedServerList = document.querySelector("#player-servers")

var resultsFilter = ""
var resultsPage = 0
const pageSize = 10

var totalPlayerCount
fetch("/api/v1/count/players").then((result) => {return result.text()}).then((count) => {totalPlayerCount = count})

const fetchPlayers = (limit, offset, filter) => {
    var url
    if (filter && filter !== "") {
        url = `/api/v1/players?limit=${limit}&offset=${offset}&filter=${filter}`
    } else {
        url = `/api/v1/players?limit=${limit}&offset=${offset}`
    }
    fetch(url).then((result) => {return result.json()}).then((players) => {
        playerList.innerHTML = ""  // delete any players that are already here
        Object.entries(players).forEach((entry) => {
            const uuid = entry[0]
            const data = entry[1]
    
            var playerEntry = playerList.appendChild(document.createElement("li"))
            var playerUsername = playerEntry.appendChild(document.createElement("strong"))
            playerUsername.innerText = data.username
            playerEntry.appendChild(document.createElement("br"))
            var playerExtra = playerEntry.appendChild(document.createElement("small"))
            playerExtra.innerText = `${data.servers.length || "no"} servers - ${uuid}`
    
            playerEntry.onclick = async (e) => {
                document.querySelector("#remove-player").disabled = false
                const username = e.target.querySelector("strong").innerText
                selectedUsername.innerText = username
                const uuid = e.target.querySelector("small").innerText.split(" - ")[1]
                selectedUuid.innerText = uuid
                const data = await (await fetch(`/api/v1/players/${uuid}`)).json()
    
                selectedServerList.innerHTML = ""
                const serversSummary = selectedServerList.appendChild(document.createElement("summary"))
                const serversStrong = serversSummary.appendChild(document.createElement("strong"))
                serversStrong.innerText = `Servers (${data.servers.length})`
                const serversUl = selectedServerList.appendChild(document.createElement("ul"))
                data.servers.forEach((server) => {
                    const li = serversUl.appendChild(document.createElement("li"))
                    li.append(server)
                })
            }
        })
    })
}


document.querySelector("#player-search").onkeyup = (e) => {
    if (e.which === 13) {document.querySelector("#search-go").onclick()}
}

document.querySelector("#search-go").onclick = async (e) => {
    resultsFilter = document.querySelector("#player-search").value
    resultsPage = 0
    totalPlayerCount = await (await fetch(`/api/v1/count/players?filter=${resultsFilter}`)).text()
    document.querySelector("#previous-page").disabled = true
    if ((resultsPage + 1) * pageSize > totalPlayerCount) {
        document.querySelector("#next-page").disabled = true
    } else {
        document.querySelector("#next-page").disabled = false
    }
    fetchPlayers(pageSize, resultsPage * pageSize, resultsFilter)
}

document.querySelector("#previous-page").onclick = (e) => {
    resultsPage--
    if (resultsPage <= 0) {
        e.target.disabled = true
        resultsPage = 0
    }
    document.querySelector("#next-page").disabled = false
    fetchPlayers(pageSize, resultsPage * pageSize, resultsFilter)
}

document.querySelector("#next-page").onclick = (e) => {
    resultsPage++
    document.querySelector("#previous-page").disabled = false
    if ((resultsPage + 1) * pageSize > totalPlayerCount) {
        e.target.disabled = true
    }
    fetchPlayers(pageSize, resultsPage * pageSize, resultsFilter)
}

document.querySelector("#remove-player").onclick = async (e) => {
    if (selectedUuid.innerText) {
        if (confirm(`Are you sure you want to remove ${selectedUuid.innerText}? This can't be undone.`)) {
            await fetch(`/api/v1/players/${selectedUuid.innerText}`, {
                method: "DELETE"
            })
            window.location.reload(false)
        }
    }
}

fetchPlayers(pageSize, 0)
document.querySelector("#next-page").disabled = false
