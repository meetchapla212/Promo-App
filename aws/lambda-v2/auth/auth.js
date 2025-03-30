const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case "/auth/login":
            const loginHandler = require("./login");
            return await loginHandler.handler(event, context, callback);
        case "/auth/register":
            const registerHandler = require("./register");
            return await registerHandler.handler(event, context, callback);
        case "/auth/registerv2":
            const registerHandlerV2 = require("./register/index");
            return await registerHandlerV2.handler(event, context, callback);
        case "/auth/verifyOTPv2":
            const verifyOTPv2Handler = require("./register/verifyOTP");
            return await verifyOTPv2Handler.handler(event, context, callback);
        case "/auth/finishRegistration":
            const finishRegistrationHandler = require("./register/finishRegistration");
            return await finishRegistrationHandler.handler(event, context, callback);
        case "/auth/changepassword":
            const changePasswordHandler = require("./changePassword");
            return await changePasswordHandler.handler(event, context, callback);
        case "/auth/forgotpassword":
            const forgotPasswordHandler = require("./forgotPassword");
            return await forgotPasswordHandler.handler(event, context, callback);
        case "/auth/logout":
            const logoutHandler = require("./logout");
            return await logoutHandler.handler(event, context, callback);
        case "/auth/resetpassword":
            const resetPasswordHandler = require("./resetPassword");
            return await resetPasswordHandler.handler(event, context, callback);
        case "/auth/verifyOTP":
            const verifyOTPHandler = require("./verifyOTP");
            return await verifyOTPHandler.handler(event, context, callback);
        case "/auth/sendOTP":
            const resendOTPHandler = require("./sendOTP");
            return await resendOTPHandler.handler(event, context, callback);
        case "/auth/resetPasswordPhone":
            const resetPasswordPhoneHandler = require("./resetPasswordPhone");
            return await resetPasswordPhoneHandler.handler(event, context, callback);
        case "/auth/resetPasswordPhoneUpdated":
            const resetPasswordPhoneUpdatedHandler = require("./resetPasswordPhoneUpdated");
            return await resetPasswordPhoneUpdatedHandler.handler(event, context, callback);
        case "/auth/sendVerificationEmail":
            const sendVerificationEmailHandler = require("./sendVerificationEmail");
            return await sendVerificationEmailHandler.handler(event, context, callback);
        case "/auth/verify-email":
            const verifyEmailHandler = require("./verifyEmail");
            return await verifyEmailHandler.handler(event, context, callback);
        case "/auth/admin-login":
            return await require("./admin-login").handler(event);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
};