const socket = io();
function sendLoginRequest () {
    let value = document.getElementById("loginMail").value
    value = value.replace(/\s/g, "");
    socket.emit("loginRequest", value)
}
function sendCode (mail) {
    let value = document.getElementById("loginCode").value
    value = value.replace(/\s/g, "");
    socket.emit("loginCode", { mail: mail, code: value })
}
socket.on("loginResponse", (object) => {
    console.log("Response recieved.")
    console.log(object)
    let returnmail = object.mail
    if (object.error) return alert(object.error)
    console.log("Awaiting code.")
    document.querySelector(".container").innerHTML = ""
    document.querySelector(".container").innerHTML = `
        <h2>Enter code</h2>
        <br><br>
        <p>Please enter the code you recieved at your mail, <b>${returnmail}</b></p>
        <br><br>
        <input type="text" id="loginCode" placeholder="Code">
        <br><br>
        <button onclick="sendCode('${returnmail}')">Send</button>
        `
})
socket.on("codeResponse", (object) => {
    console.log("Code response recieved.")
    if (object.error) return alert(object.error)
    localStorage.setItem("nktoken", object.token)
    localStorage.setItem("nkmail", object.mail)
    location.href = "/"
})