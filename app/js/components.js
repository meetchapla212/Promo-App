angular.module('PromoApp').component('viewTicket', {
    templateUrl: '../partials/viewticket.html',
    controller: 'ViewTicketController',
    bindings: {
      ticket: '=',
      event: "=",
      size: '='
    }
  });