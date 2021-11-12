#!/bin/sh
sudo zmap -p 25565 -B 350K -q | node save-ips.js
