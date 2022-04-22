const utils = require("./utils")
const mongoose = require("mongoose")
const path = require("path")
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");

const port = process.env.PORT || 3000
const dbUrl = process.env.DBURL || "mongodb://127.0.0.1/anime-tracker"
const mail = require("./mail.json")
const log = utils.log
app.use(express.static("public"))

const temporaryMail = require("./models/tempMail.js")
const User = require("./models/User.js")


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

app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "./public/profile.html"))
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
                //remake if it does
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
            socket.emit("codeResponse", { token: user.token, error: null })
            log(`User with mail ${data.mail} already exists, returning user's token.`, "info")
            await temporaryMail.deleteOne({ mail: data.mail })
            return
        }
        //generate token
        let token = utils.generateToken()
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
        socket.emit("codeResponse", { mail: data.mail, token: token, error: null })
        log(`User with mail ${data.mail} created.`, "info")
    })
    socket.on("disconnect", () => {
        log("User disconnected.", "info");
    })
})

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => log("Database connected.", "info"))