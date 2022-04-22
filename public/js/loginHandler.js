if (localStorage.getItem("nktoken")) {
    const socket = io.connect("http://localhost:3000")
    document.getElementById("header-top-right").innerHTML = `
    <a href="list">View List</a>
    <a href="profile">Profile</a>
    <a href="logout">Logout</a>
    `
}