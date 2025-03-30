angular.module('PromoApp')
    .controller('AboutUsController', ['$scope', 'config', 'metaTagsService', function($scope, config, metaTagsService) {
        $scope.forMacOnly = false;
        $scope.styleForMacOnly = () => {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }
            $("body").removeClass("modal-open");
        };
        $scope.styleForMacOnly();

        //Meta tage
        let title = 'The Promo App | About | Social Events Network';
        let description = 'The Promo App is an event-based social network that tracks 30 million events worldwide! Browse a live feed of public events or create and share your own events.';
        let keywords = 'The Promo App, events network';

        metaTagsService.setDefaultTags({
            //simple 
            'title': title,
            'description': description,
            'keywords': keywords,
            // OpenGraph
            'og:title': title,
            'og:description': description,
            // Twitter
            'twitter:title': title,
            'twitter:description': description,
        });

    }]);