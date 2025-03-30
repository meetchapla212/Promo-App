const AWS = require('aws-sdk');
var apn = require('apn');
var path = require("path");
const ses = new AWS.SES({ region: 'eu-west-1' });

exports.MAIL_PARAMS = {
    FB_LINK: "http://www.facebook.com/promoappevents",
    ANDROID_LINK: "https://play.google.com/store/apps/details?id=com.thepromoapp.promo",
    APPLE_LINK: "https://apps.apple.com/us/app/promo-see-whats-going-on-around/id1075964954",
    base_url: process.env.UI_BASE_URL
};

exports.sendEmail = async function (to, body, subject, from) {
    let eParams = {
        Destination: { /* required */
            ToAddresses: to
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: body
                },

            },
            Subject: {
                Data: subject
            }
        },
        Source: (from || 'Donotreply@thepromoapp.com')
    };

    console.log('===SENDING EMAIL===', eParams);
    await ses.sendEmail(eParams).promise();
}

exports.sendPushNotification = async function (noteMessage, deviceToken) {
    return new Promise((resolve, reject) => {
        var options = {
            token: {
                key: path.join(__dirname, "AuthKey_HW88JF5482.p8"),
                keyId: "HW88JF5482",
                teamId: "MZ33X6DJZ2"
            },
            production: false
        };

        var apnProvider = new apn.Provider(options);

        var note = new apn.Notification();
        note.expiry = Math.floor(Date.now() / 1000) + 3600;
        note.badge = 1;
        note.sound = "ping.aiff";
        note.title = noteMessage.title;
        note.body = noteMessage.body;
        note.topic = "com.thepromoapp.promo";
        note.payload = noteMessage.payload;

        //test device token ('5905fa6b9c0794ddc4061ff60f0f4ddc4757be1142ff36256335eefa63754989')
        console.log('===SENDING PUSH NOTIFICATION===', note);
        apnProvider.send(note, deviceToken).then((result) => {
            console.log("PUSH NOTIFICATION RESPOSE ====>", result)
            resolve(result)
        }).catch(error => {
            reject(error)
        });
    })

}