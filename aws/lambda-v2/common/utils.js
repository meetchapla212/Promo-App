const jwt = require("jsonwebtoken");

//Create JWT
const createJWT = (parsedBody) => {
    var dt = new Date();
    dt.setMonth(dt.getMonth() + 1);
    parsedBody.exp = Math.round(dt.getTime() / 1000);
    return jwt.sign(JSON.stringify(parsedBody), process.env.SHARED_SECRET);
};

//Verify TOKEN
const verifyJWT = (token) => {
    return jwt.verify(token, process.env.SHARED_SECRET);
};

const verifyUser = function (JWTtoken, path = "") {
    const token = JWTtoken;
    return new Promise((resolve, reject) => {
        try {
            let decoded = verifyJWT(token);
            let user = decoded;

            // log admin access
            // const { proxy_login, login_type, proxy_user_id } = user;
            // if (proxy_login) {
            //     console.log(proxy_login, login_type, proxy_user_id, path);
            // }

            if (user && user.id) {
                resolve(user);
            }
        } catch (error) {
            reject({ status_code: 400, message: "Unauthorized" });
        }
    });
};

const toTitleCase = (phrase) => {
    if (phrase) {
        return phrase.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    }
    return "";
};

module.exports = {
    verifyUser,
    verifyJWT,
    createJWT,
    toTitleCase,
};