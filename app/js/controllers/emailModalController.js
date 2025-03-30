angular.module('PromoApp')
    .controller('emailModalController', ['$scope', '$uibModal','awsService', function ($scope, $uibModal,awsService) {
        $scope.message ="";
        $scope.emailFrom = [];
       $scope.sendEmailToOrganizer = function(eventDetailsData)
       {
            //alert("kjjk"+JSON.stringify(eventDetailsData, null, 4));
            //console.log($scope.emailFrom);
            let allEmails = eventDetailsData.email.split(",");
            if(eventDetailsData.title)
            {
                eventDetailsData.title =eventDetailsData.title;
            }
            else
            {
                eventDetailsData.title =eventDetailsData.event_name;
            }
            let data = {
                //"name": $scope.name,
                "from": "Donotreply@thepromoapp.com",
                "replyTo": $scope.emailFrom.split(","),
                "to": allEmails,
                "subject": `New Message Regarding ${eventDetailsData.title}`,
                "body": "Thanks, \n "+$scope.name+ "\n \n" +$scope.message+" Sent via the promoapp for the event " + eventDetailsData.title + "  \n \n \n" +  $scope.scopeURL + "\n \n George @ The Promo App"

            };
            awsService.sendEmail(data,'shareEventByEmail')
             .then((response)=> {
                let notify = {
                    type: 'success',
                    title: 'Success',
                    content: 'Email has been sent to your organizer successfully!',
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                //console.log("Event Invite Send Successfully");

            }).catch((err)=>{
              let notify = {
                  type: 'error',
                  title: 'Error',
                  content: 'Unable to send email to organizer',
                  timeout: 5000 //time in ms
              };
              $scope.$emit('notify', notify);
          });
       };
       $scope.disableSave = function(){
           let disableSave = true;
            /* if($scope.emailFrom){
                disableSave = false;
            } */
            return disableSave;
       };
        $scope.cancel = function () {
           this.$dismiss('close');
        };
    }]);