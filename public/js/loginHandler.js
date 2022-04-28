const socket = io();
function setModal (name) {
    let modal = document.querySelector("#exampleModal")
    let title = document.getElementById("modal-title")
    let body = document.getElementById("modal-body")
    let footer = document.getElementById("modal-footer")
    title.innerHTML = ""
    body.innerHTML = ""
    footer.innerHTML = ""
    if (name == "add") {
        title.textContent = "Add anime"
        let iframe = document.createElement("iframe")
        iframe.src = "/list/add"
        iframe.style.width = "100%"
        iframe.style.height = "100%"
        body.appendChild(iframe)
    } else if (name == "edit") {
        title.textContent = "Edit anime"
        body.innerHTML = `
        <select id="selectAnimeEdit" class="text-black">
        </select><br>
        <button onclick="selectOption()">Select</button>
        `
        socket.emit("getList", { mail: localStorage.getItem("nkmail"), token: localStorage.getItem("nktoken") })
        let select = document.getElementById("selectAnimeEdit")
        socket.on("getListResponse", (list) => {
            if (list.length == 0) return body.innerHTML = `<p>You don't have any anime in your list.</p>`
            list.list.forEach(element => {
                let option = document.createElement("option")
                option.textContent = element.name
                option.value = element.id
                option.className = "text-black"
                select.appendChild(option)
            });
        })
    } else if (name == "profile") {
        title.textContent = "Profile"
        socket.emit("getUserInfo", { mail: localStorage.getItem("nkmail"), token: localStorage.getItem("nktoken") })
        socket.on("getUserInfoResponse", (object) => {
            if (object.error != null) return alert(object.error)
            console.log(object.info)
            let user = object.info
            body.style.color = "black"
            body.style.textAlign = "center"
            body.innerHTML = `
            <h1 class="badge-lg"> ${user.displayName}</h1>
            <h4 class="badge-lg">${user.mail}</h4><br>
            <input class="badge-lg" placeholder="JSON data..." id="import-data">
            <button class="btn btn-outline-info" onclick="importData()">Import</button><br><br>
            <button class="btn btn-outline-danger">Delete</button>
            `
        })
    }
}

function selectOption () {
    let select = document.getElementById("selectAnimeEdit")
    let id = select.value
    let body = document.getElementById("modal-body")
    let iframe = document.createElement("iframe")
    iframe.src = "/list/edit/" + id
    iframe.style.width = "100%"
    iframe.style.height = "100%"
    body.innerHTML = ""
    body.appendChild(iframe)
}

function openAndSelect (id) {
    setModal("edit")
    let body = document.getElementById("modal-body")
    let iframe = document.createElement("iframe")
    iframe.src = "/list/edit/" + id
    iframe.style.width = "100%"
    iframe.style.height = "100%"
    body.innerHTML = ""
    body.appendChild(iframe)
}


function importData () {
    let data = document.getElementById("import-data").value
    socket.emit("importData", { mail: localStorage.getItem("nkmail"), token: localStorage.getItem("nktoken"), list: data })
    socket.on("importDataResponse", (object) => {
        if (object.error != null) return alert(object.error)
        alert("Data imported.")
    })
}

function searchAnime () {
    var value = document.getElementById("search-query").value
    socket.emit("searchList", { mail: localStorage.getItem("nkmail"), token: localStorage.getItem("nktoken"), query: value })
    socket.on("searchListResponse", data => {
        if (data.error != null) return alert(data.error)
        let body = document.querySelector(".list-content")
        body.innerHTML = ""
        data.list.forEach(element => {
            let div = document.createElement("div")
            div.classList.add("anime-container")
            div.innerHTML = `
            <div class="anime-image-container" id="${element.name}-image">
                <img src="${element.src}" alt="${element.name} image" referrerpolicy="no-referrer" style="width:131px;height:176px;">
            </div>
            <div class="anime-info-container">
                <div class="anime-info-name">${element.name}</div>
                <br>
                <div class="anime-info-state">Anime state: <div class="badge">${element.state}</div></div><br>
                <div class="anime-info-episode">Current episode: <div class="badge">${element.currentEpisode}</div></div><br>
                <div class="anime-edit"><i class="fa-solid fa-pen-to-square" style="color:var(--contrast);cursor:pointer;" data-bs-toggle="modal" data-bs-target="#exampleModal" onclick="openAndSelect('${element.id}')"></i></div>
            </div>
            `
            body.appendChild(div)
        })
    })
}

if (localStorage.getItem("nktoken")) {
    document.getElementById("header-top-right").innerHTML = `
    <a href="#" onclick="setModal('profile')" data-bs-toggle="modal" data-bs-target="#exampleModal" >Profile</a>
    <a href="logout">Logout</a>
    `
    let modal = document.createElement("div")
    modal.innerHTML = `
    <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content" style="color:black !important;">
        <div class="modal-header">
          <h5 class="modal-title" id="modal-title" style="color:black !important;"></h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="modal-close-btn"></button>
        </div>
        <div class="modal-body" style="color:black !important;" id="modal-body">
          
        </div>
        <div class="modal-footer" id="modal-footer">
        </div>
      </div>
    </div>
  </div>
    `
    document.body.appendChild(modal)
    let container = document.querySelector(".container")
    container.innerHTML = `
        <div class="list-container">
        <input style="margin-left:20px;font-size:25px" id="search-query" placeholder="Anime name..." class="text-black">
        <i class="fa-solid fa-magnifying-glass" style="color:var(--contrast);font-size:40px;cursor:pointer;margin-left:5px;" onclick="searchAnime()"></i>
        <i class="fa-solid fa-circle-plus" style="color:var(--contrast);font-size: 40px;cursor:pointer;margin-left:20px;" data-bs-toggle="modal" data-bs-target="#exampleModal" onclick="setModal('add')"></i>
        <i class="fa-solid fa-pen-to-square" style="color:var(--contrast);font-size: 40px;cursor:pointer;margin-left:20px;" data-bs-toggle="modal" data-bs-target="#exampleModal" onclick="setModal('edit')"></i>
        <hr style="background-color:white">
        <div class="list-content">
        </div>
        </div>
        `
    socket.emit("getList", { mail: localStorage.getItem("nkmail"), token: localStorage.getItem("nktoken") })
    socket.on("getListResponse", async (object) => {
        if (object.error) return alert(object.error)
        let container = document.querySelector(".list-content")
        container.innerHTML = ""
        object.list.forEach(element => {
            let div = document.createElement("div")
            div.classList.add("anime-container")
            div.innerHTML = `
            <div class="anime-image-container" id="${element.name}-image">
                <img src="${element.src}" alt="${element.name} image" referrerpolicy="no-referrer" style="width:131px;height:176px;">
            </div>
            <div class="anime-info-container">
                <div class="anime-info-name"><a href="http://watch.koneko.link/?q=${element.name}">${element.name}</a></div>
                <br>
                <div class="anime-info-state">Anime state: <div class="badge">${element.state}</div></div><br>
                <div class="anime-info-episode">Current episode: <div class="badge">${element.currentEpisode}</div></div><br>
                <div class="anime-edit"><i class="fa-solid fa-pen-to-square" style="color:var(--contrast);cursor:pointer;" data-bs-toggle="modal" data-bs-target="#exampleModal" onclick="openAndSelect('${element.id}')"></i></div>
            </div>
            `
            container.appendChild(div)
        });
    })
}