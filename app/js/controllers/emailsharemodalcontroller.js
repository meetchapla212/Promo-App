angular.module('PromoApp')
    .controller('emailShareModalController', ['$scope', '$http','config','$rootScope','authService',function ($scope,$http,config,$rootScope,authService) {
        $scope.value={};
        $scope.defaultEmail = 'Donotreply@thepromoapp.com';

        $scope.cancel = function (reason) {
            if(reason){
                this.$dismiss(reason);
            }else {
                this.$dismiss('close');
            }
        };

        $scope.sendEmail = function () {
            let emails = $scope.value.to.split(",");
            let description = "";
            if ($scope.selectedEvent.description) {
                description = $scope.selectedEvent.description + "\n \n \n";
            }

            let data = {
                "name": $scope.value.name,
                "from": $scope.defaultEmail,
                "to": emails,
                "subject": "You are invited to " + " "+$scope.selectedEvent.shortTitle,
                "body": $scope.value.name + " has shared " + $scope.emailModalTitle + " with you. \n \n \n" + description + $scope.shareURL + "\n \n George @ The Promo App"
            };

            let url = config.AWS_BASE_URL + "/share/email";
            let token = authService.get('Token');
            $http({
                method: 'POST',
                url: url,
                data: data,
                headers: {
                    'Content-Type': 'application/json',
                    'token': token
                },
                json: true
            }).then(function (response) {
                let notify = {
                    type: 'success',
                    title: 'Success',
                    content: 'Link of this event has been shared to your friend successfully!',
                    timeout: 5000 //time in ms
                };
                $rootScope.$broadcast('notify', notify);
                //console.log("Event Invite Send Successfully");
                $scope.cancel('shared');
            })
                .catch(err=>{
                    console.log(err);
                    let notify = {
                        type: 'error',
                        title: 'Error',
                        content: 'Unable to send email. Please contact administrator',
                        timeout: 5000 //time in ms
                    };
                    $rootScope.$broadcast('notify', notify);
                });

        };
    }]);