angular.module('PromoApp')
    .controller('termsPolicyController', ['$scope', '$route', 'metaTagsService', function($scope, $route, metaTagsService) {
        $scope.value = false;

        $scope.scrollToTop = function() {
            // 'html, body' denotes the html element, to go to any other custom element, use '#elementID'
            $('html, body').animate({
                scrollTop: 0
            }, 800); // 'fast' is for fast animation
        };

        $scope.init = () => {
            $("body").removeClass("modal-open");
            let urlValue = $route.current.params.value;
            if (urlValue === 'true') {
                $scope.value = true;
            }

            let loc_array = document.location.href.split('/');
            let currentPage = loc_array[(loc_array.length - 1)];

            let title = '';
            let description = '';
            let keywords = '';
            let mybutton = document.getElementById("tothetop");
            window.onscroll = function() {
                scrollFunction();
            };

            function scrollFunction() {
                if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
                    mybutton.style.display = "inline-flex";
                } else {
                    mybutton.style.display = "none";
                }
            }

            $(window).on("scroll", function() {
                var cur_pos = $(this).scrollTop();
                $('.whitesection-wrap').each(function() {
                    var top = $(this).offset().top - 20,
                        bottom = top + $(this).outerHeight();
                    if (cur_pos >= top && cur_pos <= bottom) {
                        $('.terms_side_menu ul').find('a').removeClass('activetab');
                        $('.whitesection-wrap').removeClass('active');
                        $(this).addClass('active');
                        $('.terms_side_menu ul').find('a[href="/terms_of_use#' + $(this).attr('id') + '"]').addClass('activetab');
                    }
                });

                $('.coockiessection').each(function() {
                    var top = $(this).offset().top - 20,
                        bottom = top + $(this).outerHeight();
                    if (cur_pos >= top && cur_pos <= bottom) {
                        $('.coockies_lst').find('a').removeClass('activetab');
                        $('.coockiessection').removeClass('active');
                        $(this).addClass('active');
                        $('.coockies_lst').find('a[href="/cookies_policy#' + $(this).attr('id') + '"]').addClass('activetab');
                    }
                });
            });

            switch (currentPage) {
                case 'terms_of_use':
                    title = 'The Promo App | Terms of Use | Event Management';
                    description = 'By using the Promo App, you agree to the terms and conditions that govern the use of the Promo App and all its event management features.';
                    keywords = 'The Promo App, event management';
                    break;
                case 'cookies_policy':
                    title = 'The Promo App | Cookie Policy | Manage Events';
                    description = 'By using the Promo App to set up and manage events, you consent to the use of cookies. Read our cookie policy to see what this means.';
                    keywords = 'The Promo App, manage events';
                    break;
            }

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




        };
        $scope.init();
    }]);