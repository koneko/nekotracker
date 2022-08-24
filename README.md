# nekotracker

AKA NekoList is an app that lets you track what anime you're watching, what episode you are on, and what you've seen.  
You don't have to use it for anime, but thats the main purpose (seen as how anime is its main purpose).  
You may freely use this and you may modify this freely.  

## setup

1. download the repo
2. `npm i` for the dependencies
3. make a .env file, and put in the following:
```
DBURL=<mongodb url (use atlas if you want)>
owner=<your email>
username=<email bot username>
password=<email bot password (make a gmail, setup 2fa and make an app password and put that here)>
PORT=<port to run on, 80 is what you want>
```
4. fill in the stuff in .env file
5. `npm start` or `node .` to run the app
6. if you are using a vps, you gotta run it in the background and then you can run `NekoWatch` and replace the links with the ones you want
7. Profit