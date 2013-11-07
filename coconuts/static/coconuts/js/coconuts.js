var app = angular.module('coconuts', ['ngAnimate', 'ngResource', 'ngRoute', 'ngTouch']).
config(['$httpProvider', '$routeProvider', function($httpProvider, $routeProvider) {
    // handle django's CSRF
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]).
controller('FolderCtrl', ['$http', '$location', '$scope', 'settings', function($http, $location, $scope, settings) {
    $scope.settings = settings;
    $scope.contents = {photos: []};

    function updatePhoto() {
        var path = $location.path();
        var photo, i;
        for (i = 0; i < $scope.contents.photos.length; i++) {
            photo = $scope.contents.photos[i];
            if ('/' + photo.path == path) {
                $scope.previousPhoto = $scope.contents.photos[i-1];
                $scope.currentPhoto = photo;
                $scope.nextPhoto = $scope.contents.photos[i+1];
                return;
            }
            $scope.previousPhoto = undefined;
            $scope.currentPhoto = undefined;
            $scope.nextPhoto = undefined;
        }
    }

    $scope.promptDelete = function(obj) {
        $scope.deleteTarget = obj;
        $scope.deleteFolder = false;
    };
    $scope.doDelete = function() {
        $http.post(settings.coconuts_root + 'delete/' + $scope.deleteTarget.path).success(function() {
            $scope.deleteTarget = undefined;
            $location.path('');
        });
    };

    $http.get(settings.coconuts_root + 'contents' + window.location.pathname).success(function(contents) {
        $scope.contents = contents;
        updatePhoto();
    });

    $scope.location = $location;
    $scope.$watch('location.path()', updatePhoto);
}]).
factory('settings', ['$http', function($http) {
    return {
        coconuts_root: '/images/',
        static_root: '/static/coconuts/'
    };
}]).
filter('fileIcon', ['settings', function(settings) {
    var mime_root = settings.static_root + 'img/mimetypes/';
    return function(name) {
        var idx = name.lastIndexOf('.');
        if (idx !== -1) {
            var extension = name.slice(idx + 1, name.length).toLowerCase();
            if (extension == 'gif' || extension == 'jpg' || extension == 'jpeg' || extension == 'png') {
                return mime_root + 'image-jpeg.png';
            } else if (extension == 'py') {
                return mime_root + 'text-x-python.png';
            }
        }
        return mimeroot + 'unknown.png';
    };
}]).
filter('fileSize', [function() {
    var MB = 1024 * 1024;
    var KB = 1024;
    return function(val) {
        if (val > MB) {
            return (val / MB).toFixed(1) + ' MB';
        } else if (val > KB) {
            return (val / KB).toFixed(1) + ' kB';
        } else {
            return val + ' B';
        }
    };
}]).
filter('urlencode', [function() {
    return function(val) {
        return val;
    };
}]);