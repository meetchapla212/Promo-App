angular.module('PromoApp')
    .controller('EventOrganiserController', ['$scope', 'config', 'authService', 'metaTagsService', function($scope, config, authService, metaTagsService) {
        $scope.slides = [{
                content: "With the Promo App, setting up and monitoring my events is effortless. I have everything I need in one place - and that place is my back pocket",
                nameslider: 'Susan',
                Cityslider: '- Houston, United States',
            },
            {
                content: "I want my event management to go smoothly. That’s what Promo App does. Every time I launch an event, I know I can sell tickets and connect with the right people easily.",
                nameslider: 'James',
                Cityslider: '- New York, United States',
            },
            {
                content: "I manage dozens of events every year. Some for myself, some for clients. I need a platform that streamlines everything. My time is precious and Promo understands that. That’s why I use it all the time.",
                nameslider: 'Gudrun',
                Cityslider: '- Hamberg, Germany',
            },

        ];
        $scope.slides2 = [{
                content: "With the Promo App, setting up and monitoring my events is effortless. I have everything I need in one place - and that place is my back pocket",
                nameslider: 'Susan',
                Cityslider: '- Houston, United States',
            },
            {
                content: "I want my event management to go smoothly. That’s what Promo App does. Every time I launch an event, I know I can sell tickets and connect with the right people easily.",
                nameslider: 'James',
                Cityslider: '- New York, United States',
            },
            {
                content: "I manage dozens of events every year. Some for myself, some for clients. I need a platform that streamlines everything. My time is precious and Promo understands that. That’s why I use it all the time.",
                nameslider: 'Gudrun',
                Cityslider: '- Hamberg, Germany',
            },

        ];

        $scope.imageUrl = "http:://example.com/images/demo.png";
        $scope.changeUrl = function(url) {
            $scope.imageUrl = url;
        };

        $scope.user = authService.getUser();

        $scope.init = () => {
            let title = '';
            let description = '';
            let keywords = '';
            let loc_array = document.location.href.split('/');
            let currentPage = loc_array[(loc_array.length - 1)];
            switch (currentPage) {
                case 'event_organiser':
                    title = 'The Promo App | Event Organizers';
                    description = 'The Promo App helps event organizers set up and manage their events. This platform makes event management easy, cheap, and completely fuss-free.';
                    keywords = 'The Promo App, event organizers';
                    break;
                case 'pricing':
                    title = 'The Promo App | Pricing | Event Promotion';
                    description = 'The Promo App makes event promotion affordable for everyone. With no ticket processing costs and low sponsorship fees, you can get more attendees easily.';
                    keywords = 'The Promo App, event promotion';
                    break;
            }
            metaTagsService.setDefaultTags({
                'title': title,
                'description': description,
                'keywords': keywords,
                // OpenGraph
                'og:site_name': 'thepromoapp',
                'og:title': 'The Best Events',
                'og:description': 'Bringing you and your friends together in real life at incredible events',
                'og:image': '/img/event-promo-app.jpeg',
                'og:url': 'https://thepromoapp.com',
                // Twitter
                'twitter:title': 'Thousands of Events',
                'twitter:description': "Have a social life again - bring your friends",
                'twitter:image': '/img/event-promo-app.jpeg',
                'twitter:card': '/img/event-promo-app.jpeg',
            });
        };

        $scope.init();
    }]);