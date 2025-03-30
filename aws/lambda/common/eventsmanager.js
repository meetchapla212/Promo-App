const QBM = require('./qbmanager');
const QBManager = new QBM();
const moment = require('moment');
// This function is used to claim event
exports.claimEvent = async (event,plan_id,invoice,last4,token) => {
    // Add to claimed event history
    let claimedEventHistoryData = {
        event_id: event.id,
        plan_id: plan_id,
        event_title: event.title
    };
    if(invoice){
        claimedEventHistoryData.invoice = invoice;
    }
    if(last4){
        claimedEventHistoryData.last4 = last4;
    }

    let response = await QBManager.createObject('UserClaimedEventHistory',claimedEventHistoryData,token);
    if(response){
        // Update in localstorage
        let data = {
            _id: event.id,
            claimed_by: response.user_id,
            claimed_on: moment().utc().valueOf(),
            push:{'childReferences':response._id}
        };

        await QBManager.updateById("Events",event.id,data,token);
    }
}