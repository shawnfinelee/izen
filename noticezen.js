const emailsender = require('./emailsender')
function noticeMail(myEfforts) {
    if (myEfforts.sumTime < 8) {
        emailsender()
    } 
}
module.exports = {
    noticeMail,
}