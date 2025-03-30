const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const { errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {
    let resource = event.requestContext.resourcePath;
    switch (resource) {
        case '/owner/zones/list':
            const getOwnerZoneLists = require('./owners/getOwnerZoneLists');
            return await getOwnerZoneLists.handler(event, context, callback);
        case '/member/invitation/{member_id}':
            const setMemberInvitation = require('./owners/setMemberInvitation');
            return await setMemberInvitation.handler(event, context, callback);
        case '/owner/zone/delete':
            const deleteZoneOwner = require('./owners/deleteZoneOwner');
            return await deleteZoneOwner.handler(event, context, callback);
        case '/zone/view/{zone_id}':
            const viewZone = require('./owners/viewZone');
            return await viewZone.handler(event, context, callback);
        case '/zone/events/list/{zone_id}':
            const getZoneEventLists = require('./owners/getZoneEventLists');
            return await getZoneEventLists.handler(event, context, callback);
        case '/zone/event/delete/{event_id}':
            const deleteZoneEvent = require('./owners/deleteZoneEvent');
            return await deleteZoneEvent.handler(event, context, callback);
        case '/zone/owners/list/{zone_id}':
            const getZoneOwnersLists = require('./owners/getZoneOwnersLists');
            return await getZoneOwnersLists.handler(event, context, callback);
        case '/zone/members/list/{zone_id}':
            const getZoneMembersLists = require('./owners/getZoneMembersLists');
            return await getZoneMembersLists.handler(event, context, callback);
        case '/zone/member/view/{member_id}':
            const viewZoneMember = require('./owners/viewZoneMember');
            return await viewZoneMember.handler(event, context, callback);
        case '/zone/member/delete/{member_id}':
            const deleteZoneMember = require('./owners/deleteZoneMember');
            return await deleteZoneMember.handler(event, context, callback);
        case '/zone/member/update/{member_id}':
            const updateZoneMemberProfile = require('./owners/updateZoneMemberProfile');
            return await updateZoneMemberProfile.handler(event, context, callback);
        case '/owner/dashboard':
            const getDashboardDetail = require('./owners/getDashboardDetail');
            return await getDashboardDetail.handler(event, context, callback);
        case '/zone/add-member/{zone_id}':
            const addMemberToZone = require('./attendees/addMemberToZone');
            return await addMemberToZone.handler(event, context, callback);
        case '/member/zoneListing':
            const memberZoneListing = require('./attendees/memberZoneListing');
            return await memberZoneListing.handler(event, context, callback);
        case '/zone/member/block/{member_id}':
            const blockZoneMember = require('./owners/blockZoneMember');
            return await blockZoneMember.handler(event, context, callback);
        case '/zone/owner/invitation':
            const inviteZoneOwners = require('./owners/inviteZoneOwners');
            return await inviteZoneOwners.handler(event, context, callback);
        case '/zone/member/invitation':
            const inviteZoneMember = require('./owners/inviteZoneMember');
            return await inviteZoneMember.handler(event, context, callback);
        case '/zone/member/process-invitation':
            const processZoneMemberInvitation = require('./owners/processZoneMemberInvitation');
            return await processZoneMemberInvitation.handler(event, context, callback);
        case '/zone/owner/process-invitation':
            const processZoneOwnerInvitation = require('./owners/processZoneOwnerInvitation');
            return await processZoneOwnerInvitation.handler(event, context, callback);
        case '/zone/organizers/listing/{zone_id}':
            const getZoneOrganizersLists = require('./owners/getZoneOrganizersLists');
            return await getZoneOrganizersLists.handler(event, context, callback);
        case '/zone/organizer/block/{organizer_id}':
            const blockZoneOrganizer = require('./owners/blockZoneOrganizer');
            return await blockZoneOrganizer.handler(event, context, callback);
        case '/zone/organizer/delete/{organizer_id}':
            const deleteZoneOrganizer = require('./owners/deleteZoneOrganizer');
            return await deleteZoneOrganizer.handler(event, context, callback);
        case '/users/zone/listing':
            const usersZoneListing = require('./common/usersZoneListing');
            return await usersZoneListing.handler(event, context, callback);
        case '/member/leave-zone/{zone_id}':
            const memberLeaveZone = require('./attendees/memberLeaveZone');
            return await memberLeaveZone.handler(event, context, callback);
        case '/zone/organizer/invitation':
            const inviteZoneOrganizers = require('./owners/inviteZoneOrganizers');
            return await inviteZoneOrganizers.handler(event, context, callback);
        case '/zone/organizer/process-invitation':
            const processZoneOrganizerInvitation = require('./owners/processZoneOrganizerInvitation');
            return await processZoneOrganizerInvitation.handler(event, context, callback);
        case '/general/zone/events/listing/{zone_id}':
            const getZoneEventsList = require('./common/getZoneEventsList');
            return await getZoneEventsList.handler(event, context, callback);
        case '/general/zone/owners/list/{zone_id}':
            const getZoneOwnersListing = require('./common/getZoneOwnersListing');
            return await getZoneOwnersListing.handler(event, context, callback);
        case '/general/zone/organizers/listing/{zone_id}':
            const getZoneOrganizersListing = require('./common/getZoneOrganizersListing');
            return await getZoneOrganizersListing.handler(event, context, callback);
        case '/general/zone/members/listing/{zone_id}':
            const getZoneMembersListing = require('./common/getZoneMembersListing');
            return await getZoneMembersListing.handler(event, context, callback);
    }
    return awsRequestHelper.respondWithSimpleMessage(500, errorMessages.UNABLE_TO_SERVE_REQUEST_CONTACT_ADMINISTRATOR);
}