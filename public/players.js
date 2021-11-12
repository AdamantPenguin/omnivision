// allow searching of players and show extra data

const playerList = document.querySelector("#players")
const selectedUsername = document.querySelector("#player-username")
const selectedUuid = document.querySelector("#player-uuid")
const selectedServerList = document.querySelector("#player-servers")

fetch("/api/v1/players").then((result) => {return result.json()}).then((players) => {
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


document.querySelector("#player-search").onkeyup = (e) => {
    const query = e.target.value.toUpperCase()
    for (var i = 0; i < playerList.childElementCount; i++) {
        var li = playerList.children[i]
        if (li.innerText.toUpperCase().indexOf(query) > -1) {
            li.hidden = false
        } else {
            li.hidden = true
        }
    }
}
