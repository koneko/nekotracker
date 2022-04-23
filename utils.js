const chalk = require("chalk")
const jsSHA = require("jssha")
function output (message, lvl) {
    var returnMessage = "";
    switch (lvl) {
        case "error":
            returnMessage = chalk.red("[ERROR]: " + message);
            break;
        case "warn":
            returnMessage = chalk.yellow("[WARN]: " + message);
            break;
        case "info":
            returnMessage = chalk.cyan("[INFO]: " + message);
            break;
        case "debug":
            returnMessage = chalk.green("[DEBUG]: " + message);
            break;
        default:
            returnMessage = chalk.white(message);
            break;
    }
    console.log(returnMessage);
}

function validateEmail (email) {
    var re = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return re.test(email);
}

function generateToken (mail, code) {
    const shaObj = new jsSHA("SHA-512", "TEXT", { encoding: "UTF8" });
    shaObj.update(mail + code);
    const hash = shaObj.getHash("HEX");
    return hash
}

function generateId () {
    // math.random a number between 333 and 500000, with random letters in between each number
    var id = "";
    var random = Math.floor(Math.random() * (500000 - 333)) + 333;
    for (var i = 0; i < random.toString().length; i++) {
        id += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
    }
    return id + random.toString();
}

module.exports = {
    log: output,
    validate: validateEmail,
    generateToken,
    generateId
}