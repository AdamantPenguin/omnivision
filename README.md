# omnivision
Find and keep track of Minecraft servers and players across the world.
Note: this project is not dead, I am currently testing it long-term to highlight any significant problems.

## Why
Why not?

## How to use
1. Clone the repo
2. Install the `npm` dependencies
3. Optionally configure the `config.json` - port is the web server port, username is used for offline mode connection tests (NYI)
4. Launch `node index.js` in the background (this is the web server)
5. Install `zmap` if you don't have it, then run `./populate-db.sh` to start filling servers and players into the database
6. Visit http://localhost:8080 in your browser
7. You might want to set up a cronjob (e.g. monthly) for step 5, as it will stop running once the entire internet has been scanned
8. You might also want to change the command inside `populate-db.sh` depending on your available bandwidth

## Coming Soon™
* Nicer web interface
* Minecraft Realms API client, so you can access the database from within MC
* Try connecting in offline mode, to gather more info about servers
* Just generally making it better
