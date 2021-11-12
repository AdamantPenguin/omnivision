// load basic statistics for the overview

fetch("/api/v1/count/servers")
.then(result => result.text())
.then(text => document.querySelector("#server-count").innerHTML = text)

fetch("/api/v1/count/players")
.then(result => result.text())
.then(text => document.querySelector("#player-count").innerHTML = text)
