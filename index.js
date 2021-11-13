// Web server for accessing the database in a user friendly way
// and auto-refreshing the servers

const { toHTML: motdToHTML, parse: parseMotd } = require("minecraft-motd-util")
const pinger = require("minecraft-ping-js")
const { formatPingResult, isValidUsername } = require("./utils")
const Keyv = require("keyv")
const servers = new Keyv("sqlite://db.sqlite", { namespace: "servers" })
const players = new Keyv("sqlite://db.sqlite", { namespace: "players" })
const express = require("express")
const app = express()

const config = require("./config.json")

/**
 * Format data from the DB in a nicer way
 * @param {Array.<Object>} rawData The raw DB data
 * @param {boolean} deleteNamespace Whether to remove the namespace from keys
 * @returns {Object}
 */
const formatRawData = (rawData, deleteNamespace) => {
    var output = {}
    if (deleteNamespace) {
        rawData.forEach((object) => {
            output[object.key.split(":").slice(1).join(":")] = JSON.parse(object.value).value
        })
    } else {
        rawData.forEach((object) => {
            output[object.key] = JSON.parse(object.value).value
        })
    }
    return output
}

const listServers = async (limit, offset, filter) => {
    limit = limit || -1
    offset = offset || 0
    filter = filter || ""
    return formatRawData(
        await servers.opts.store.query(
            `SELECT * FROM keyv WHERE "key" LIKE 'servers:%' AND ("key" LIKE '%${filter}%' OR "value" LIKE '%${filter}%') LIMIT ${limit} OFFSET ${offset};`
        ),
        true
    )
}

const countServers = async (filter) => {
    filter = filter || ""
    const rawData = await servers.opts.store.query(
        `SELECT count(*) FROM keyv WHERE "key" LIKE 'servers:%' AND ("key" LIKE '%${filter}%' OR "value" LIKE '%${filter}%');`
    )
    return rawData[0]["count(*)"].toString()
}


const listPlayers = async (limit, offset, filter) => {
    limit = limit || -1
    offset = offset || 0
    filter = filter || ""
    return formatRawData(
        await players.opts.store.query(
            `SELECT * FROM keyv WHERE "key" LIKE 'players:%' AND ("key" LIKE '%${filter}%' OR "value" LIKE '%${filter}%') LIMIT ${limit} OFFSET ${offset};`
        ),
        true
    )
}
    
const countPlayers = async (filter) => {
    filter = filter || ""
    const rawData = await players.opts.store.query(
        `SELECT count(*) FROM keyv WHERE \"key\" LIKE 'players:%' AND ("key" LIKE '%${filter}%' OR "value" LIKE '%${filter}%');`
    )
    return rawData[0]["count(*)"].toString()
}

const updateServer = async (address) => {
    const serverDbInfo = await servers.get(address)
    try {
        const result = await pinger.pingWithPromise(address, 25565)
        const formattedResult = formatPingResult(result)
        serverDbInfo.lastUpdated = Date.now()
        serverDbInfo.description = formattedResult.description
        serverDbInfo.players.max = formattedResult.players.max
        Object.assign(serverDbInfo.players.users, formattedResult.players.users)  // merge users
        serverDbInfo.version = formattedResult.version
        serverDbInfo.modloader = formattedResult.modloader
        serverDbInfo.mods = formattedResult.mods
        serverDbInfo.icon = formattedResult.icon
        await servers.set(address, serverDbInfo)
        try {
            serverDbInfo.descriptionHtml = motdToHTML(parseMotd(serverDbInfo.description))
        } catch {
            serverDbInfo.descriptionHtml = serverDbInfo.description
        }
        if (result.players.sample) {  // add this server to any players who are on it
            result.players.sample.forEach(async (playerInfo) => {
                if (isValidUsername(playerInfo.name)) {
                    try {
                        const playerDbInfo = await players.get(playerInfo.id)
                        if (!playerDbInfo.servers.includes(address)) {playerDbInfo.servers.push(address)}
                        playerDbInfo.lastSeen = Date.now()
                        playerDbInfo.username = playerInfo.name
                        players.set(playerInfo.id, playerDbInfo)
                    } catch (e) {  // if the player wasn't found or has no .servers
                        players.set(playerInfo.id, {
                            username: playerInfo.name,
                            servers: [address],
                            lastSeen: Date.now()
                        })
                    }
                }
            })
        }
    } catch (e) {  // usually when the server is a bad or doesn't exist anymore
        if (e.code === "EHOSTUNREACH" || e.code === "ECONNREFUSED") {  // server is gone
            await servers.delete(address)
        }
        // not doing anything with timed out errors as it could be due to high LAN usage
    }
    return serverDbInfo
}

app.use(express.static("public"))
app.use(express.json())

app.get("/api/v1/servers", async (req, res) => {  // send a limited set of data to reduce traffic
    const limit = req.query.limit || -1
    const offset = req.query.offset || 0
    const filter = req.query.filter || ""
    const allServers = await listServers(limit, offset, filter)
    const responseData = {}
    Object.entries(allServers).forEach((server) => {
        responseData[server[0]] = {
            description: server[1].description,
            version: server[1].version,
            modCount: server[1].mods.length,
            playerCount: Object.entries(server[1].players.users).length,
            icon: server[1].icon
        }
        try {
            responseData[server[0]].descriptionHtml = motdToHTML(parseMotd(server[1].description))
        } catch (e) {
            responseData[server[0]].descriptionHtml = server[1].description
        }
    })
    res.send(responseData)
})

app.get("/api/v1/servers/:ip", async (req, res) => {
    const data = await servers.get(req.params.ip)
    try {
        data.descriptionHtml = motdToHTML(parseMotd(data.description))  // so the page can render it good
    } catch (e) {
        data.descriptionHtml = data.description
    }
    res.send(data)
})

app.delete("/api/v1/servers/:ip", async (req, res) => {
    await servers.delete(req.params.ip)
    res.send(true)
})

app.get("/api/v1/count/servers", async (req, res) => {
    const filter = req.query.filter || ""
    res.send(await countServers(filter))
})

app.get("/api/v1/players", async (req, res) => {
    const limit = req.query.limit || -1
    const offset = req.query.offset || 0
    const filter = req.query.filter || ""
    res.send(await listPlayers(limit, offset, filter))
})

app.get("/api/v1/players/:uuid", async (req, res) => {
    res.send(await players.get(req.params.uuid))
})

app.delete("/api/v1/players/:uuid", async (req, res) => {
    await players.delete(req.params.uuid)
    res.send(true)
})

app.get("/api/v1/count/players", async (req, res) => {
    const filter = req.query.filter || ""
    res.send(await countPlayers(filter))
})

app.post("/api/v1/formatDescription", (req, res) => {  // in case of third party clients who want this standalone
    res.send({formatted: motdToHTML(parseMotd(req.body.text))})
})

app.post("/api/v1/updateServer", async (req, res) => {
    res.send(await updateServer(req.body.address))
})

app.listen(config.port, () => {
    console.log("Listening at " + config.port)
})


// update servers when their last update was too long ago
setInterval(async () => {
    console.log("Updating servers...")
    const servers = await listServers()
    const currentTimestamp = Date.now()
    Object.entries(servers).forEach((entry) => {
        const address = entry[0]
        const data = entry[1]
        if (currentTimestamp - data.lastUpdated >= 1000 * 60 * 60) {  // if it is at least one hour old
            updateServer(address)
            console.log(`Updated ${address}`)
        }
    })
    console.log("Done.")
}, 1000 * 60 * 5)  // every 5 minutes
