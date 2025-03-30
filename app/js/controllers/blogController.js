angular.module('PromoApp')
    .controller('blogController', ['$scope', 'metaTagsService', 'apiService', '$route', '$window', 'Utils', function($scope, metaTagsService, apiService, $route, $window, Utils) {
        $scope.categoryData = [];
        $scope.postData = [];
        $scope.latestPost = "";
        $scope.postDataAll = [];
        $scope.loading = false;
        $scope.loadingMessage = 'Loading...';
        $scope.loadIndex = 4;
        $scope.loadIndexPost = 3;
        $scope.loadIndexPostSearch = 3;
        $scope.singlePostLoading = false;
        $scope.singleBlogLoading = false;
        $scope.homeSinglePost = "";
        $scope.postId = $route.current.params.bId;
        $scope.tagId = $route.current.params.tagId;
        $scope.tagName = $route.current.params.tagName;
        $scope.singlePostDetail = "";
        $scope.catblogList = [];
        $scope.categoryId = $route.current.params.cat;
        $scope.categoryName = "";
        $scope.sameCatBlogList = [];
        $scope.postTagDataAll = [];
        $scope.sameCatBlogSingle = "";
        $scope.buttonclicked = false;
        $scope.tagInfo = "";
        $scope.blogTagData = [];
        $scope.firstBlogTagData = null;
        $scope.autoFlag = "off";
        $scope.openSearchView = false;
        $scope.searchText = '';
        $scope.blogSerachData = [];
        $scope.blogForm = {
            content: '',
            name: '',
            email: '',
            website: ''
        };

        $scope.getBlogCategory = () => {
            $scope.loading = true;
            apiService.getBlogCategory().then((response) => {
                if (response.status == 200) {
                    if (response.data.length > 0) {
                        let responseData = response.data;
                        responseData.forEach(function(itemInfo) {
                            if (itemInfo.count > 0) {
                                $scope.categoryData.push(itemInfo);
                            }
                        });
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.data.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }
            }).catch(err => {
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.loading = false;
                $scope.$emit('notify', notify);
            }).finally(() => {});
        };

        $scope.getBlogPost = () => {
            apiService.getBlogPost().then((response) => {
                if (response.status == 200) {
                    if (response.data.length > 0) {
                        let responseData = response.data;
                        apiService.getBlogMedia().then((responseMedia) => {
                            if (responseMedia.status == 200) {
                                if (responseMedia.data.length > 0) {
                                    let responseMediaData = responseMedia.data;
                                    let responseCatData = $scope.categoryData;
                                    responseData.forEach(function(item) {
                                        responseMediaData.forEach(function(itemdata) {
                                            if (item.featured_media == itemdata.id) {
                                                item.image = itemdata.source_url;
                                                responseCatData.forEach(function(itemInfo) {
                                                    if (item.categories == itemInfo.id) {
                                                        item.catName = itemInfo.name;
                                                        $scope.postData.push(item);
                                                    }
                                                });
                                            }
                                        });
                                    });
                                    $scope.latestPost = $scope.postData[0];
                                    $scope.postData.splice(0, 1);
                                    $scope.loading = false;
                                    $scope.singlePostLoading = true;
                                } else {
                                    let notify = {
                                        type: 'error',
                                        title: 'OOPS!!',
                                        content: response.data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                }
                            }
                        }).catch(err => {
                            let content = "Sorry something went wrong. Please try later.";
                            if (err.data && 'message' in err.data) {
                                content = err.data.message;
                            }
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: content,
                                timeout: 5000 //time in ms
                            };
                            $scope.loading = false;
                            $scope.$emit('notify', notify);
                        }).finally(() => {});
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.data.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }
            }).catch(err => {
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.loading = false;
                $scope.$emit('notify', notify);
            }).finally(() => {});
        };

        $scope.getBlogPostAll = () => {
            apiService.getBlogPostAll().then((response) => {
                if (response.status == 200) {
                    if (response.data.length > 0) {
                        let responseData = response.data;
                        apiService.getBlogMediaAll().then((responseMedia) => {
                            if (responseMedia.status == 200) {
                                if (responseMedia.data.length > 0) {
                                    let responseMediaData = responseMedia.data;
                                    let responseCatData = $scope.categoryData;
                                    responseData.forEach(function(item) {
                                        responseMediaData.forEach(function(itemdata) {
                                            if (item.featured_media == itemdata.id) {
                                                item.image = itemdata.source_url;
                                                responseCatData.forEach(function(itemInfo) {
                                                    if (item.categories == itemInfo.id) {
                                                        item.catName = itemInfo.name;
                                                        item.userName = "thepromoapp";
                                                        $scope.postDataAll.push(item);

                                                        if (item.id == 848) {
                                                            $scope.homeSinglePost = item;
                                                        }

                                                        if ($scope.singlePostDetail) {
                                                            if ($scope.singlePostDetail.catName[0].name == item.catName && item.id != $scope.postId) {
                                                                $scope.catblogList.push(item);
                                                            }
                                                        }

                                                        if ($scope.categoryName) {
                                                            if ($scope.categoryName == item.catName) {
                                                                $scope.sameCatBlogList.push(item);
                                                            }
                                                        }
                                                    }
                                                });

                                                $scope.sameCatBlogSingle = $scope.sameCatBlogList[5];
                                            }
                                        });
                                    });
                                    $scope.loading = false;
                                    $scope.singlePostLoading = false;
                                } else {
                                    let notify = {
                                        type: 'error',
                                        title: 'OOPS!!',
                                        content: response.data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                    $scope.loading = false;
                                    $scope.singlePostLoading = false;
                                }
                            }
                        }).catch(err => {
                            let content = "Sorry something went wrong. Please try later.";
                            if (err.data && 'message' in err.data) {
                                content = err.data.message;
                            }
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: content,
                                timeout: 5000 //time in ms
                            };
                            $scope.loading = false;
                            $scope.singlePostLoading = false;
                            $scope.$emit('notify', notify);
                        }).finally(() => {});
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.data.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.loading = false;
                        $scope.singlePostLoading = false;
                        $scope.$emit('notify', notify);
                    }
                }
            }).catch(err => {
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.loading = false;
                $scope.singlePostLoading = false;
                $scope.$emit('notify', notify);
            }).finally(() => {});
        };

        $scope.showMoreBlogPost = () => {
            if ($scope.loadIndex < $scope.postDataAll.length) {
                $scope.loadIndex += 6;
            }
        };

        $scope.showAll = () => {
            if ($scope.loadIndexPost < $scope.postDataAll.length) {
                $scope.buttonclicked = true;
                $scope.loadIndexPost += $scope.postDataAll.length;
            } else if ($scope.loadIndexPost > $scope.postDataAll.length) {
                $scope.buttonclicked = false;
                $scope.loadIndexPost = 3;
                $window.scrollTo(0, 0);
            }
        };

        $scope.blogDetail = (id) => {
            $scope.loading = true;
            apiService.getBlogDetail(id).then((response) => {
                if (response.status == 200) {
                    let blogDetail = response.data;
                    apiService.getBlogMediaPost(blogDetail.featured_media).then((responseMedia) => {
                        if (responseMedia.status == 200) {
                            let responseMediaData = responseMedia.data;
                            blogDetail.image = responseMediaData.source_url;
                            apiService.getPostUserInfo(blogDetail.author).then((responseUser) => {
                                if (responseMedia.status == 200) {
                                    let userInfo = responseUser.data;
                                    blogDetail.userName = userInfo.name;
                                    apiService.getPostCategory(id).then((responseCategory) => {
                                        if (responseCategory.status == 200) {
                                            let categoryInfo = responseCategory.data;
                                            blogDetail.catName = categoryInfo;
                                            $scope.singlePostDetail = blogDetail;
                                            $scope.getBlogPostAll();
                                            $scope.loading = false;
                                        }
                                    });
                                }
                            });
                        }
                    }).catch(err => {
                        let content = "Sorry something went wrong. Please try later.";
                        if (err.data && 'message' in err.data) {
                            content = err.data.message;
                        }
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: content,
                            timeout: 5000 //time in ms
                        };
                        $scope.loading = false;
                        $scope.singleBlogLoading = false;
                        $scope.$emit('notify', notify);
                    }).finally(() => {});
                }
            }).catch(err => {
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.loading = false;
                $scope.$emit('notify', notify);
            }).finally(() => {});
        };

        $scope.blogPostTag = (id) => {
            apiService.getPostTag(id).then((response) => {
                if (response.status == 200) {
                    $scope.tagInfo = response.data;
                }
            });
        };

        $scope.catPostList = (id) => {
            $scope.loading = true;
            apiService.getCatPostList(id).then((response) => {
                if (response.status == 200) {
                    $scope.categoryName = response.data.name;

                } else {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: response.data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.loading = false;
                }

                $scope.getBlogPostAll();
            }).catch(err => {
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.loading = false;
                $scope.$emit('notify', notify);
            }).finally(() => {});
        };

        $scope.tagBlogList = (id) => {
            $scope.loading = true;
            apiService.getTagBlogList(id).then((responseTag) => {
                if (responseTag.status == 200) {
                    let responseTagData = responseTag.data;
                    let responseCatData = $scope.categoryData;
                    apiService.getTagBlogMedia(id).then((mediaResponse) => {
                        if (mediaResponse.status == 200) {
                            let responseMediaList = mediaResponse.data;
                            responseTagData.forEach(function(itemTag) {
                                responseCatData.forEach(function(itemInfo) {
                                    responseMediaList.forEach(function(itemMedia) {
                                        if (itemTag.categories == itemInfo.id) {
                                            itemTag.catName = itemInfo.name;
                                            if (itemTag.featured_media == itemMedia.id) {
                                                itemTag.image = itemMedia.source_url;
                                                itemTag.userName = "thepromoapp";
                                                $scope.blogTagData.push(itemTag);
                                            }
                                        }
                                    });
                                });
                            });
                            $scope.firstBlogTagData = $scope.blogTagData[0];
                            $scope.blogTagData.splice(0, 1);
                            $scope.loading = false;
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: mediaResponse.data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            $scope.loading = false;
                        }
                    }).catch(err => {
                        let content = "Sorry something went wrong. Please try later.";
                        if (err.data && 'message' in err.data) {
                            content = err.data.message;
                        }
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: content,
                            timeout: 5000 //time in ms
                        };
                        $scope.loading = false;
                        $scope.$emit('notify', notify);
                    }).finally(() => {});
                } else {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: responseTag.data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.loading = false;
                }

            }).catch(err => {
                console.log(err);
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.loading = false;
                $scope.$emit('notify', notify);
            }).finally(() => {});
        };

        $scope.autoCompleteFlag = (flag) => {
            if (flag) {
                $scope.autoFlag = "on";
            } else {
                $scope.autoFlag = "off";
            }
        };

        $scope.blogCommentSubmit = (form) => {
            $scope.loading = true;
            if ($scope.blogForm.content == '' && $scope.blogForm.name == '' && $scope.blogForm.email == '') {
                form.authContent.$invalid = true;
                form.authName.$invalid = true;
                form.authEmail.$invalid = true;
                $scope.loading = false;
                return false;
            } else if ($scope.blogForm.name == '' && $scope.blogForm.email == '') {
                form.authName.$invalid = true;
                form.authEmail.$invalid = true;
                $scope.loading = false;
                return false;
            } else if ($scope.blogForm.content == '' && $scope.blogForm.name == '') {
                form.authName.$invalid = true;
                form.authContent.$invalid = true;
                $scope.loading = false;
                return false;
            } else if ($scope.blogForm.content == '' && $scope.blogForm.email == '') {
                form.authContent.$invalid = true;
                form.authEmail.$invalid = true;
                $scope.loading = false;
                return false;
            } else if ($scope.blogForm.content == '') {
                form.authContent.$invalid = true;
                $scope.loading = false;
                return false;
            } else if ($scope.blogForm.name == '') {
                form.authName.$invalid = true;
                $scope.loading = false;
                return false;
            } else if ($scope.blogForm.email == '') {
                form.authEmail.$invalid = true;
                $scope.loading = false;
                return false;
            }

            let data = {
                post: $scope.postId,
                content: $scope.blogForm.content,
                author_name: $scope.blogForm.name,
                author_email: $scope.blogForm.email,
                author_url: $scope.blogForm.website
            };

            apiService.getPostComment(data).then((response) => {
                if (response.status == 201) {
                    let content = "Comment posted successfully.";
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.loading = false;
                    $scope.$emit('notify', notify);
                } else {
                    let content = "Sorry something went wrong. Please try later.";
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.loading = false;
                    $scope.$emit('notify', notify);
                }
            }).catch(err => {
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.loading = false;
                $scope.$emit('notify', notify);
            }).finally(() => {});
        };

        $scope.searchPost = (text) => {
            if (text.length > 3) {
                $scope.loading = true;
                apiService.getSearchPost(text).then((response) => {
                    if (response.status == 200) {
                        let itemInfoList = [];
                        let searchData = response;
                        let responseCatData = $scope.categoryData;
                        if (searchData.data.length > 0) {
                            let searchDataList = searchData.data;
                            searchDataList.forEach(function(item) {
                                responseCatData.forEach(function(itemInfo) {
                                    if (item.categories == itemInfo.id) {
                                        item.catName = itemInfo.name;
                                        item.userName = "thepromoapp";
                                        itemInfoList.push(item);
                                    }
                                });
                            });
                            $scope.blogSerachData = itemInfoList;
                            Utils.applyChanges($scope);
                            $scope.loading = false;
                        } else {
                            $scope.loading = false;
                        }
                    }
                }).catch(err => {
                    console.log(err);
                    let content = "Sorry something went wrong. Please try later.";
                    if (err.data && 'message' in err.data) {
                        content = err.data.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.loading = false;
                    $scope.$emit('notify', notify);
                }).finally(() => {});
            }
        };

        $scope.showAllSearchPost = () => {
            if ($scope.loadIndexPostSearch < $scope.blogSerachData.length) {
                $scope.buttonclicked = true;
                $scope.loadIndexPostSearch += $scope.blogSerachData.length;
            } else if ($scope.loadIndexPostSearch > $scope.blogSerachData.length) {
                $scope.buttonclicked = false;
                $scope.loadIndexPostSearch = 3;
                $window.scrollTo(0, 0);
            }
        };

        $scope.init = () => {
            $scope.getBlogCategory();
            if ($route.current.$$route.originalPath == '/blog') {
                $scope.getBlogPost();
                $scope.getBlogPostAll();
            } else if ($route.current.$$route.originalPath == '/blog/:bId/:blogName') {
                $scope.blogDetail($scope.postId);
                $scope.blogPostTag($scope.postId);
            } else if ($route.current.$$route.originalPath == '/blog/tag/:tagName/:tagId') {
                $scope.tagBlogList($scope.tagId);
            } else if ($route.current.$$route.originalPath == '/blog/:categoryName') {
                $scope.catPostList($scope.categoryId);
            }
            metaTagsService.setDefaultTags({
                'title': 'The Promo App | Event Organizers',
                'description': 'The Promo App makes event promotion affordable for everyone. With no ticket processing costs and low sponsorship fees, you can get more attendees easily.',
                'keywords': 'The Promo App, event promotion',
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