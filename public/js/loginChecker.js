const socket = io();
let state = ""
function checkIsLoggedIn () {
    socket.emit("checkIsLoggedIn", { mail: localStorage.getItem("nkmail"), token: localStorage.getItem("nktoken") })
}
function setPageState (statep) {
    state = statep
}
socket.on("checkIsLoggedInResponse", (error) => {
    if (error == false) {
        window.location = "/"
    }
    let body = document.body
    if (state == "add") {
        body.innerHTML = `
        <input type="text" id="addAnimeName" placeholder="Anime name">
        <br><br>
        <input type="text" id="addAnimeSrc" placeholder="Anime image link">
        <br><br>
        <select name="animeState" id="addAnimeState">
            <option value="watching">Watching</option>
            <option value="planing">Planning to watch</option>
            <option value="finished">Finished</option>
            <option value="dropped">Dropped</option>
            <option value="undecided">Undecided</option>
        </select>
        <button onclick="addAnime()">Add</button>
        `
    } else if (state == "edit") {
        socket.emit("editRequest", { mail: localStorage.getItem("nkmail"), token: localStorage.getItem("nktoken"), id: id })
        socket.on("editResponse", (object) => {
            if (object.error) return alert(object.error)
            console.log(object)
            let item = object.item
            body.innerHTML = `
            <input type="text" id="editAnimeName" placeholder="Anime name" value="${item.name}">
            <br>
            <input type="text" id="editAnimeSrc" placeholder="Anime image link" value="${item.src}">
            <br><br>
            <select name="animeState" id="editAnimeState">
                <option value="watching" ${item.state == "watching" ? "selected" : ""}>Watching</option>
                <option value="planing" ${item.state == "planing" ? "selected" : ""}>Planning to watch</option>
                <option value="finished" ${item.state == "finished" ? "selected" : ""}>Finished</option>
                <option value="dropped" ${item.state == "dropped" ? "selected" : ""}>Dropped</option>
                <option value="undecided" ${item.state == "undecided" ? "selected" : ""}>Undecided</option>
            </select>
            <input id="editAnimeEpisode" placeholder="Current Episode" value="${item.currentEpisode}" style="width:30px;">
            <button onclick="editAnime()">Confirm</button>
            <a href="/list/remove/${item.id}" onclick="closeModal()">delete</a>
            `
        })
    }
})

function closeModal () {
    parent.document.getElementById("modal-close-btn").click()
    parent.location.reload()
}