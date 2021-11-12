// Take IPs provided by zmap and check if they are a minecraft server or not
// If it responds to ping within a timeout, it will be saved to the DB
// Reads IPs one per line from stdin so could be used with a different scanner

const readline = require("readline")
const pinger = require("minecraft-ping-js")
const Keyv = require("keyv")

const servers = new Keyv("sqlite://db.sqlite", { namespace: "servers" })
const players = new Keyv("sqlite://db.sqlite", { namespace: "players" })

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
})

// format the minecraft-ping-js result in a nicer and more useful way
const formatPingResult = (result) => {
    const output = {
        description: result.description.text,
        players: {
            max: result.players.max,  // not saving online player count since this will change faster than is practical to keep updated
            users: result.players.sample || []  // rename to "users" since this wont just be a sample eventually
        },
        version: result.version,
        mods: result.modinfo ? result.modinfo.modList : [],
        modloader: result.modinfo ? result.modinfo.type : "none",
        icon: result.favicon,
        lastUpdated: Date.now()  // timestamp these so they can be refreshed at appropriate intervals
    }

    if (result.description.extra) {
        result.description.extra.forEach((chatComponent) => {  // append extra motd components
            output.description += chatComponent.text
        })
    }

    if (result.forgeData) {
        output.modloader = "FML"
        result.forgeData.mods.forEach((modInfo) => {
            output.mods.push({
                modid: modInfo.modId,
                version: modInfo.modmarker  // rename modmarker to version since better name
            })
        })
    }

    for (var i = 0; i < output.players.users.length; i++) {
        if (!isValidUsername(output.players.users[i].name)) {
            delete output.players.users[i]
        }
    }

    return output
}

exports.formatPingResult = formatPingResult

const isValidUsername = (username) => {  // not really a proper check. just using to bin server info in player samples
    return !(username.indexOf('§') > -1 || username === "" || username === " ")
}

exports.isValidUsername = isValidUsername

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
                            playerDbInfo.servers.push(line)
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
