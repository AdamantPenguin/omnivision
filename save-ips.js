// Take IPs provided by zmap and check if they are a minecraft server or not
// If it responds to ping within a timeout, it will be saved to the DB
// Reads IPs one per line from stdin so could be used with a different scanner

const readline = require("readline")
const pinger = require("minecraft-ping-js")
const { formatPingResult, isValidUsername } = require("./utils")
const Keyv = require("keyv")

const servers = new Keyv("sqlite://db.sqlite", { namespace: "servers" })
const players = new Keyv("sqlite://db.sqlite", { namespace: "players" })

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

var currentlyPinging = 0

rl.on("line", (line) => {
    currentlyPinging ++
    pinger.ping(line, 25565, async (error, result) => {
        currentlyPinging --
        if (!error) {
            const formattedResult = formatPingResult(result)
            try {  // update the existing entry if there is one
                const serverDbInfo = await servers.get(line)
                serverDbInfo.lastUpdated = Date.now()
                serverDbInfo.description = formattedResult.description
                serverDbInfo.players.max = formattedResult.players.max
                Object.assign(serverDbInfo.players.users, formattedResult.players.users)  // merge users
                serverDbInfo.version = formattedResult.version
                serverDbInfo.modloader = formattedResult.modloader
                serverDbInfo.mods = formattedResult.mods
                serverDbInfo.icon = formattedResult.icon
                servers.set(line, serverDbInfo)
            } catch (e) {  // if there isn't one
                servers.set(line, formattedResult)
            }
            if (result.players.sample) {  // add this server to any players who are on it
                result.players.sample.forEach(async (playerInfo) => {
                    if (isValidUsername(playerInfo.name)) {
                        try {
                            const playerDbInfo = await players.get(playerInfo.id)
                            if (!playerDbInfo.servers.includes(line)) {playerDbInfo.servers.push(line)}
                            playerDbInfo.lastSeen = Date.now()
                            playerDbInfo.username = playerInfo.name
                            players.set(playerInfo.id, playerDbInfo)
                        } catch (e) {  // if the player wasn't found or has no .servers
                            players.set(playerInfo.id, {
                                username: playerInfo.name,
                                servers: [line],
                                lastSeen: Date.now()
                            })
                        }
                    }
                })
            }
            console.log(`Success ${line} - ${formattedResult.description}`)
        }
    })
})


const checkExit = () => {
    if (currentlyPinging > 0) {
        setTimeout(checkExit, 200)
    } else {
        process.exit()
    }
}

rl.on("close", () => {
    checkExit()
})
