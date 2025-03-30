angular.module('PromoApp')
.service('goingEvent', ['qbService', 'eventsService', function (qbService, eventsService) {
    let className = 'GoingUsersInEvent';
    this.eventOptions = [
        {
            key: '-1',
            value: 'Select'
        },
        {
            key: 'Going',
            value: 'Going'
        },
        {
            key: 'Not Going',
            value: 'Not Going'
        },
        {
            key: 'May be',
            value: 'May Be'
        }
    ];


    this.getGoingEvent = (filter, session) => {
        return qbService.getCurrentSession(session).then((res) => {
            return qbService.listTable(className, filter);
        });
    };

    this.going = (userId, session) => {
        let filter = {
            user_id: userId
        };
        return qbService.getCurrentSession(session).then((res) => {
            return qbService.listTable(className, filter);
        });
    };

    this.upsertGoingType = (user, event, status, session) => {

        return eventsService.getUserEventAttendingStatus({
            _parent_id: event.id,
            user_id: user.id,
        }, session)
            .then(goingchk => {
                if (goingchk.length > 0) {
                    if (goingchk[0].type_going == status) {
                        return Promise(goingchk[0]);
                    }
                    let data = {
                        type_going: status
                    };
                    return eventsService.updateUserEventAttendingStatus(goingchk[0]._id, data, session);
                } else {

                    // Also check if _id is not present then map to id
                    if (event.id && !event._id) {
                        event._id = event.id;
                    }
                    let data = {
                        blobID: user.blob_id,
                        type_going: status,
                        completeUser: JSON.stringify(user),

                        name: user.login,
                        _parent_id: event.id,
                        eventDetails: JSON.stringify(event)
                    };
                    return eventsService.createUserEventAttendingStatus(data, session);
                }
            });


    };

}]);