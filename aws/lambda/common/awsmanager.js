const AWS = require('aws-sdk');
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