angular.module('PromoApp')
    .service('subscribeUser', ['qbService', function (qbService) {
        const className = 'subscribedUser';
        let subscribe=this;

        this.getSubscribedUser = (filter) =>{
            return qbService.listTable(className, filter);
        };

        this.addSubscribeUSer = (data) => {
            return qbService.getCurrentSession().then((res) => {
                return qbService.createData(className, data);
            });
        };
    }]);