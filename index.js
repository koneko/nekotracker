const utils = require("./utils")
const mongoose = require("mongoose")
const path = require("path")
const express = require("express");
const app = express();
const http = require("http");
const fs = require("fs")
const { Server } = require("socket.io");
const port = process.env.PORT || 3000
const dbUrl = process.env.DBURL || "mongodb://127.0.0.1/anime-tracker"
// const mail = require("./mail.json")
const log = utils.log
let mail = { fake: "fake" }
mail.username = "no.reply.koneko"
mail.password = process.env.password
mail.owner = process.env.owner
app.use(express.static("public"))

const temporaryMail = require("./models/tempMail.js")
const User = require("./models/User.js");

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "./public/login.html"))
})

app.get("/logout", (req, res) => {
    res.send(`<script>
    localStorage.removeItem('nktoken')
    localStorage.removeItem('nkmail')
    location.href = ".."
    </script>
    `
    )
})

app.get("/list/add", (req, res) => {
    res.sendFile(path.join(__dirname, "./public/list/add.html"))
})

app.get("/list/edit/:id", (req, res) => {
    let file = path.join(__dirname, "./public/list/edit.html")
    res.send(`<script>let id = "${req.params.id}"</script>` + fs.readFileSync(file).toString())
    // res.sendFile(path.join(__dirname, "./public/list/edit.html"))
})

app.get("/list/remove/:id", (req, res) => {
    let id = req.params.id
    res.send(`
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.4.1/socket.io.js" integrity="sha512-MgkNs0gNdrnOM7k+0L+wgiRc5aLgl74sJQKbIWegVIMvVGPc1+gc1L2oK9Wf/D9pq58eqIJAxOonYPVE5UwUFA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script>
    const socket = io.connect("http://localhost:3000")
    let token = localStorage.getItem("nktoken")
    let mail = localStorage.getItem("nkmail")
    socket.emit("removeFromList", { mail: mail, token: token, id: "${id}" })
    socket.on("removeFromListResponse", (object) => {
        if(object.error) alert(object.error)
        location.href = "../../"
    })
    </script>
    `)
})

var server = app.listen(port, () => log("Web running on " + port + ".", "info"))
const io = new Server(server);

io.on("connection", socket => {
    log("User connected.", "info");

    socket.on("loginRequest", async (email) => {
        log(`User with mail ${email} sent login request.`, "info")
        if (!utils.validate(email)) {
            socket.emit("loginResponse", { mail: "", error: "Invalid mail." })
            log(`User with mail ${email} sent invalid mail.`, "warn")
            return
        }
        const send = require("gmail-send")({
            user: mail.username,
            pass: mail.password,
            to: email,
            subject: "NekoList Login Code"
        })
        const code = Math.floor(Math.random() * 10000000)
        send({
            html: `
            <h1>NekoList Login Code</h1>
            <p>Hello ${email}, your login code is located below, please enter it in the login page. (expires after 5 minutes)</p>
            <p>Your login code is <b>${code}</b>.</p>
            `
        }, async (error, res, fullRes) => {
            if (error) {
                log("Error occured: " + error, "error");
                socket.emit("loginResponse", { mail: "", error: "Internal error occured." })
                return
            }
            log("Mail sent. Result: " + res, "info")
            //check if code exists already
            const tempMail = await temporaryMail.findOne({ mail: email })
            if (tempMail) {
                log("Code already exists. User: " + email, "info")
                tempMail.code = code
                tempMail.save()
                log("Code updated. User: " + email, "info")
            } else {
                const tempMaill = new temporaryMail({
                    mail: email,
                    code: code
                })
                await tempMaill.save()
                log("Code created for user " + email, "info")
            }
        })
        socket.emit("loginResponse", { mail: email, error: null })
    })
    socket.on("loginCode", async (data) => {
        //find mail and code
        log(`User with mail ${data.mail} sent login code.`, "info")
        if (!utils.validate(data.mail)) {
            socket.emit("codeResponse", { mail: "", error: "Invalid mail." })
            log(`User with mail ${data.mail} sent invalid mail.`, "warn")
            return
        }
        let temp = await temporaryMail.findOne({ mail: data.mail })
        if (!temp) {
            socket.emit("codeResponse", { token: null, error: "Invalid mail." })
            log(`User with mail ${data.mail} sent invalid mail.`, "warn")
            return
        }
        if (temp.code != data.code) {
            socket.emit("codeResponse", { token: null, error: "Invalid code." })
            log(`User with mail ${data.mail} sent invalid code.`, "warn")
            return
        }
        //check if user exists already
        let user = await User.findOne({ mail: data.mail })
        if (user) {
            socket.emit("codeResponse", { mail: data.mail, token: user.token, error: null })
            log(`User with mail ${data.mail} already exists, returning user's token.`, "info")
            await temporaryMail.deleteOne({ mail: data.mail })
            return
        }
        //generate token
        let token = utils.generateToken()
        //check if user with token already exists
        user = await User.findOne({ token: token })
        //if user exists, generate new token
        while (user) {
            token = utils.generateToken()
            user = await User.findOne({ token: token })
        }
        //create user
        let newUser = new User({
            mail: data.mail,
            token: token,
            displayName: data.mail.split("@")[0],
            list: []
        })
        await newUser.save()
        //delete temp mail
        await temporaryMail.deleteOne({ mail: data.mail })
        log(data.mail)
        socket.emit("codeResponse", { mail: data.mail, token: token, error: null })
        log(`User with mail ${data.mail} created.`, "info")
    })
    socket.on("checkIsLoggedIn", (data) => {
        // mail, token are being passed
        log(`User with mail ${data.mail} is checking login status.`, "info")
        let user = User.findOne({ mail: data.mail, token: data.token })
        if (!user) return socket.emit("checkIsLoggedInResponse", false)
        //respond with true or false
        socket.emit("checkIsLoggedInResponse", true)
    })
    socket.on("removeFromList", async (object) => {
        // mail, token, id are being passed
        log(`User with mail ${object.mail} is attempting to remove item from their list.`, "info")
        let user = await User.findOne({ mail: object.mail, token: object.token })
        if (!user) return socket.emit("removeFromListResponse", { error: "Invalid token." })
        //check if item exists
        let item = user.list.find(item => item.id == object.id)
        if (!item) return socket.emit("removeFromListResponse", { error: "Item not found." })
        //remove item
        user.list = user.list.filter(item => item.id != object.id)
        await user.save()
        socket.emit("removeFromListResponse", { error: null })
        log(`User with mail ${object.mail} removed item with id ${object.id} from their list.`, "info")
    })
    socket.on("addToList", async (object) => {
        //mail, token, name, state, src are being passed
        log(`User with mail ${object.mail} is attempting to add item to their list.`, "info")
        //generate id
        let id = utils.generateId()
        object.id = id
        let user = await User.findOne({ mail: object.mail, token: object.token })
        if (!user) return socket.emit("addToListResponse", { error: "Invalid token." })
        //check if item exists
        let item = user.list.find(item => item.id == object.id)
        if (item) return socket.emit("addToListResponse", { error: "Item already exists." })
        //add item
        let pushObject = {
            id: id,
            name: object.name,
            state: object.state,
            src: object.src,
            currentEpisode: 0
        }
        user.list.push(pushObject)
        //sort the list from A-Z
        user.list.sort((a, b) => {
            if (a.name < b.name) return -1
            if (a.name > b.name) return 1
            return 0
        })
        await user.save()
        socket.emit("addToListResponse", { error: null })
        log(`User with mail ${object.mail} added item with id ${id} to their list.`, "info")
    })
    socket.on("getList", async (object) => {
        // mail, token are being passed
        log(`User with mail ${object.mail} is requesting their list.`, "info")
        let user = await User.findOne({ mail: object.mail, token: object.token })
        if (!user) return socket.emit("getListResponse", { error: "Invalid token." })
        //respond with list
        socket.emit("getListResponse", { list: user.list, error: null })
        log(`User with mail ${object.mail} requested their list.`, "info")
    })
    socket.on("editRequest", async (data) => {
        // mail, token, id are being passed
        log(`User with mail ${data.mail} is requesting to edit item with id ${data.id}.`, "info")
        let user = await User.findOne({ mail: data.mail, token: data.token })
        if (!user) return socket.emit("editResponse", { error: "Invalid token." })
        //check if item exists
        let item = user.list.find(item => item.id == data.id)
        if (!item) return socket.emit("editResponse", { error: "Item not found." })
        //respond with item
        socket.emit("editResponse", { item: item, error: null })
        log(`User with mail ${data.mail} requested to edit item with id ${data.id}.`, "info")
    })
    socket.on("submitEdit", async (data) => {
        // mail, token, id, name, state, src, currentEpisode are being passed
        log(`User with mail ${data.mail} is submitting edit to item with id ${data.id}.`, "info")
        let user = await User.findOne({ mail: data.mail, token: data.token })
        if (!user) return socket.emit("submitEditResponse", { error: "Invalid token." })
        //check if item exists
        let item = user.list.find(item => item.id == data.id)
        if (!item) return socket.emit("submitEditResponse", { error: "Item not found." })
        //edit item
        var newItem = { ...item, name: data.name, state: data.state, src: data.src, currentEpisode: data.currentEpisode };
        user.list.splice(user.list.indexOf(item), 1, newItem);
        // item.name = data.name
        // item.state = data.state
        // item.src = data.src
        // item.currentEpisode = data.currentEpisode
        //user.list.push(newItem);
        await user.save()
        socket.emit("submitEditResponse", { error: null })
        log(`User with mail ${data.mail} submitted edit to item with id ${data.id}.`, "info")
    })
    socket.on("getUserInfo", async (data) => {
        //mail and token
        log(`User with mail ${data.mail} is requesting their info.`, "info")
        let user = await User.findOne({ mail: data.mail, token: data.token })
        if (!user) return socket.emit("getUserInfoResponse", { error: "Invalid token." })
        //respond with info
        let info = {
            mail: user.mail,
            displayName: user.displayName,
            list: user.list
        }
        socket.emit("getUserInfoResponse", { info: info, error: null })
        log(`User with mail ${data.mail} requested their info.`, "info")
    })
    socket.on("searchList", async (data) => {
        // mail, token, query are being passed
        // find the anime in the list without case sensitivity
        log(`User with mail ${data.mail} is searching for ${data.query}.`, "info")
        let user = await User.findOne({ mail: data.mail, token: data.token })
        if (!user) return socket.emit("searchListResponse", { error: "Invalid token." })
        //respond with list
        let list = user.list.filter(item => item.name.toLowerCase().includes(data.query.toLowerCase()))
        socket.emit("searchListResponse", { list: list, error: null })
        log(`User with mail ${data.mail} searched for ${data.query}.`, "info")
    })
    socket.on("importData", async (data) => {
        //mail, token, list
        log(`User with mail ${data.mail} is attempting to import data.`, "info")
        let user = await User.findOne({ mail: data.mail, token: data.token })
        if (!user) return socket.emit("importDataResponse", { error: "Invalid token." })
        if (user.mail != mail.owner) return socket.emit("importDataResponse", { error: "You are not koneko. This feature may potentially crash the server if used by anyone other than koneko." })
        //check if list is valid
        if (!data.list) return socket.emit("importDataResponse", { error: "Invalid list." })
        //check if list is valid
        let parsedList = JSON.parse(data.list)
        if (!parsedList) return socket.emit("importDataResponse", { error: "Invalid list." })
        //create and overwrite old list
        let list = []
        parsedList.forEach(element => {
            console.log(element)
            let id = utils.generateId()
            if (element.currentEpisodeNumber == null) element.currentEpisodeNumber = 0
            let pushObject = {
                id: id,
                name: element.title,
                src: element.imgUrl,
                currentEpisode: element.currentEpisodeNumber.toString(),
                state: "watching"
            }
            list.push(pushObject)
        });
        user.list = list
        await user.save()
        socket.emit("importDataResponse", { error: null })
        log(`User with mail ${data.mail} imported data.`, "info")
    })
    socket.on("apiAdd", async (data) => {
        //token, name, src, currentEpisode
        log(`User with mail ${data.mail} is attempting to add an anime via api.`, "info")
        let user = await User.findOne({ token: data.token })
        if (!user) return socket.emit("apiAddResponse", { error: "Invalid token." })
        //check if item exists
        let item = user.list.find(item => item.id == data.id)
        if (item) return socket.emit("apiAddResponse", { error: "Item already exists." })
        //add item
        let id = utils.generateId()
        let pushObject = {
            id: id,
            name: data.name,
            src: data.src,
            currentEpisode: data.currentEpisode,
            state: "watching"
        }
        user.list.push(pushObject)
        user.list.sort((a, b) => {
            if (a.name < b.name) return -1
            if (a.name > b.name) return 1
            return 0
        })
        await user.save()
        socket.emit("apiAddResponse", { error: null })
        log(`User with mail ${data.mail} added an anime via api.`, "info")
    })
    socket.on("apiEdit", async data => {
        //token,  name, src, currentEpisode
        log(`User with mail ${data.mail} is attempting to edit an anime via api.`, "info")
        let user = await User.findOne({ token: data.token })
        if (!user) return socket.emit("apiEditResponse", { error: "Invalid token." })
        //check if item exists via name
        let item = user.list.find(item => item.name == data.name)
        if (!item) return socket.emit("apiEditResponse", { error: "Item not found." })
        var newItem = { ...item, name: data.name, state: data.state, src: data.src, currentEpisode: data.currentEpisode };
        user.list.splice(user.list.indexOf(item), 1, newItem);
        await user.save()
        socket.emit("apiEditResponse", { error: null })
        log(`User with mail ${data.mail} edited an anime via api.`, "info")
    })
    socket.on("apiDelete", async data => {
        //token, name
        log(`User with mail ${data.mail} is attempting to delete an anime via api.`, "info")
        let user = await User.findOne({ token: data.token })
        if (!user) return socket.emit("apiDeleteResponse", { error: "Invalid token." })
        //check if item exists via name
        let item = user.list.find(item => item.name == data.name)
        if (!item) return socket.emit("apiDeleteResponse", { error: "Item not found." })
        user.list.splice(user.list.indexOf(item), 1);
        await user.save()
        socket.emit("apiDeleteResponse", { error: null })
        log(`User with mail ${data.mail} deleted an anime via api.`, "info")
    })
    socket.on("apiGet", async data => {
        // token
        log(`User with mail ${data.mail} is requesting their list via api.`, "info")
        let user = await User.findOne({ token: data.token })
        if (!user) return socket.emit("apiGetResponse", { error: "Invalid token." })
        //respond with info
        let info = {
            mail: user.mail,
            displayName: user.displayName,
            list: user.list
        }
        socket.emit("apiGetResponse", { info: info, error: null })
        log(`User with mail ${data.mail} requested their list via api.`, "info")
    })
    socket.on("disconnect", () => {
        log("User disconnected.", "info");
    })
})

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => log("Database connected.", "info"))