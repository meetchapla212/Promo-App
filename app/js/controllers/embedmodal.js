angular.module('PromoApp')
    .controller('EmbedModalController', ['$scope','Utils','authService',  function ($scope,Utils,authService) {
        $scope.buttonText = "COPY CODE";
        $scope.embedDetails={
            width: 560,
            height: 315,
            lat:0,
            long:0,
            code: '',
            city: ''
        };
        $scope.cancel = function () {
            this.$close();
        };

        $scope.copy = function(){
            $scope.buttonText = "COPIED";
            setTimeout(function () {
                //console.log('Inside timeout');
                $scope.buttonText = "COPY CODE";
                Utils.applyChanges($scope);
            }, 1000);
        };

        $scope.$watch('loct', function () {
            if ($scope.loct) {
                $scope.embedDetails.lat = $scope.loct.lat;
                $scope.embedDetails.long = $scope.loct.long;
                $scope.setCode(false);
            }
        });

        $scope.setCode = function(useEvent) {
            $scope.buttonText = "COPY CODE";
            if($scope.event && useEvent){
                $scope.embedDetails.lat = $scope.event.latitude;
                $scope.embedDetails.long = $scope.event.longitude;
                $scope.embedDetails.city = $scope.event.address;
            }
            
            $scope.embedDetails.code =`<iframe src="${window.location.origin}/embedevents/${$scope.user_id}?lat=${$scope.embedDetails.lat}&long=${$scope.embedDetails.long}" width="${$scope.embedDetails.width}" height="${$scope.embedDetails.height}" ></iframe>`;
        };

        $scope.setCode(true);

    }]);