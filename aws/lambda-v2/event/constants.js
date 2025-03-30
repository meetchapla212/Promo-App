const eventPrivacyTypes = {
    PUBLIC: 1,
    PRIVATE: 2,
};

const eventAccessTypes = {
    LINK_ONLY: 1,
    INVITE_ONLY: 2,
    PASSWORD: 3,
};

const eventsTable = "event_master";
const ticketsTable = "event_tickets";
const guestsTable = "guest_users";
const eventAdminsTable = "event_administrator";
const eventAdminsGuestTable = "event_administrator_guest";
const goingUsersInEventsTable = "going_users_in_event";
const privateEventInvitationsTable = "private_event_invitations";

module.exports = {
    eventAccessTypes,
    eventPrivacyTypes,
    eventsTable,
    ticketsTable,
    guestsTable,
    eventAdminsTable,
    eventAdminsGuestTable,
    goingUsersInEventsTable,
    privateEventInvitationsTable,
};
