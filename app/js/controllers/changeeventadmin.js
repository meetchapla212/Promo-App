angular.module('PromoApp')
    .controller('ChangeAdminController', [ '$route', '$scope', 'eventsService', 'authService',  '$window', 'config','$sce','awsService','Utils',
        function ( $route, $scope, eventsService, authService, $window, config,$sce,awsService,Utils) {

            $scope.formDetails = {};

            // This function is called when admin is changed
            $scope.invite = function(){
                awsService.put(`/events/${$scope.formDetails.event_id}`,{admins:[{name: $scope.formDetails.name,email:$scope.formDetails.email}]})
                .then(res=>{
                    Utils.showSuccess($scope,'Admin invitation send successfully');
                    window.location.href="/";
                });
            };

            const init = function(){

                // let oHeader = {
                //     alg: 'HS256',
                //     typ: 'JWT'
                // };
                // let oPayload = {
                //     event_id: '5dd7abf5a28f9a0965cbb176',
                //     event_name:'Lorem ipsum nam dapibus nisl vitae elit fringilla rutrum',
                //     admin: {
                //         name:'Albert Silva',
                //         email: 'albert.silvia023@mailme.com'
                //     }
                // };
                // let sHeader = JSON.stringify(oHeader);
                // let sPayload = JSON.stringify(oPayload);
                // let sJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, config.JWT_SECRET);
                // console.log(sJWT);
                $scope.formDetails = (KJUR.jws.JWS.readSafeJSONString(b64utoutf8(($route.current.params.selection).split(".")[1])));
                //console.log($scope.formDetails);
            };
            init();
        }]);