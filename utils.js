// some common functions used by the project

// format the minecraft-ping-js result in a nicer and more useful way
exports.formatPingResult = (result) => {
    const output = {
        description: result.description.text,
        players: {
            max: result.players.max,  // not saving online player count since this will change faster than is practical to keep updated
            users: {}  // rename to "users" since this wont just be a sample eventually
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

    try {  // add the players to the list
        for (var i = 0; i < result.players.sample.length; i++) {
            if (this.isValidUsername(result.players.sample[i].name)) {
                output.players.users[result.players.sample[i].id] = result.players.sample[i].name
            }
        }
    } catch {}

    return output
}


exports.isValidUsername = (username) => {  // not really a proper check. just using to bin server info in player samples
    return !(username.indexOf('§') > -1 || username === "" || username === " ")
}
