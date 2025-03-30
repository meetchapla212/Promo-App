angular.module('PromoApp')
    .controller('promotervideomodalcontroller', ['$scope', '$uibModal', 'VideoURL', '$sce', function ($scope, $uibModal, VideoURL, $sce) {

        $scope.URL = $sce.trustAsResourceUrl(VideoURL);
    }]);