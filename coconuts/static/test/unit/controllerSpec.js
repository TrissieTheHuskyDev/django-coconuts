'use strict';

describe('Controllers', function() {
    var $httpBackend;

    beforeEach(module('coconuts'));
    beforeEach(inject(function($injector) {
        $httpBackend = $injector.get('$httpBackend');
    }));

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('CrumbCtrl', function() {
        var scope, ctrl, $location, $rootScope;

        beforeEach(inject(function($controller, $injector, _$rootScope_) {
            $location = $injector.get('$location');
            $rootScope = _$rootScope_;
            scope = $rootScope.$new();
            ctrl = $controller('CrumbCtrl', {
                $scope: scope
            });
        }));

        it('should return crumbs for /', function() {
            scope.$digest();
            expect(scope.crumbs).toEqual([
                { name : 'Home', path : '/' }
            ]);
        });

        it('should return crumbs for /foo.jpg', function() {
            $location.path('/foo.jpg');
            scope.$digest();
            expect(scope.crumbs).toEqual([
                { name : 'Home', path : '/' },
                { name : 'foo.jpg', path : '/foo.jpg' }
            ]);
        });

        it('should return crumbs for /foo/', function() {
            $location.path('/foo/');
            scope.$digest();
            expect(scope.crumbs).toEqual([
                { name : 'Home', path : '/' },
                { name : 'foo', path : '/foo/' }
            ]);
        });

        it('should return crumbs for /foo/bar.jpg', function() {
            $location.path('/foo/bar.jpg');
            scope.$digest();
            expect(scope.crumbs).toEqual([
                { name : 'Home', path : '/' },
                { name : 'foo', path : '/foo/' },
                { name : 'bar.jpg', path : '/foo/bar.jpg' }
            ]);
        });

        it('should return crumbs for /foo/bar/baz.jpg', function() {
            $location.path('/foo/bar/baz.jpg');
            scope.$digest();
            expect(scope.crumbs).toEqual([
                { name : 'Home', path : '/' },
                { name : 'foo', path : '/foo/' },
                { name : 'bar', path : '/foo/bar/' },
                { name : 'baz.jpg', path : '/foo/bar/baz.jpg' }
            ]);
        });

        it('should navigate to home', function() {
            $location.path('/foo/bar/baz.jpg');
            scope.$digest();
            scope.show(scope.crumbs[0]);
            expect($location.path()).toBe('/');
            expect($rootScope.transitionClass).toBe('slide-backward');
        });
    });

    describe('FolderCtrl (folder)', function() {
        var scope, ctrl, $location, $rootScope, $timeout;

        beforeEach(inject(function($controller, $injector, _$rootScope_) {
            $rootScope = _$rootScope_;
            $location = $injector.get('$location');
            $timeout = $injector.get('$timeout');
            scope = $rootScope.$new();
            ctrl = $controller('FolderCtrl', {
                $routeParams: {path: '/'},
                $scope: scope
            });

            $httpBackend.expect('GET', 'images/contents/').respond({
                files: [],
                folders: [],
                name: '',
                path: '/'
            });
            $httpBackend.flush();
        }));

        it('should get contents', function() {
            expect(angular.equals(scope.currentFolder, {
                files: [],
                folders: [],
                name: '',
                path: '/'
            })).toBe(true);
            expect(scope.currentPhoto).toBe(undefined);
            expect(scope.nextPhoto).toBe(undefined);
            expect(scope.previousPhoto).toBe(undefined);

            // transition should get cleared
            $rootScope.transitionClass = 'slide-forward';
            $timeout.flush();
            expect($rootScope.transitionClass).toBe(undefined);
        });

        it('should show folder', function() {
            scope.show({path: '/foo/'});
            expect($location.path()).toBe('/foo/');
            expect($rootScope.transitionClass).toBe('slide-forward');
        });

        it('should not show next photo', function() {
            scope.showNext();
            expect($location.path()).toBe('');
            expect($rootScope.transitionClass).toBe(undefined);
        });

        it('should not show previous photo', function() {
            scope.showPrevious();
            expect($location.path()).toBe('');
            expect($rootScope.transitionClass).toBe(undefined);
        });
    });

    describe('FolderCtrl (image)', function() {
        var scope, ctrl, $location, $rootScope, $timeout;

        beforeEach(inject(function($controller, $injector, _$rootScope_) {
            $rootScope = _$rootScope_;
            $location = $injector.get('$location');
            $timeout = $injector.get('$timeout');
            scope = $rootScope.$new();
            ctrl = $controller('FolderCtrl', {
                $routeParams: {path: '/foo/bar/bar.jpg'},
                $scope: scope
            });

            $httpBackend.expect('GET', 'images/contents/foo/bar/').respond({
                files: [
                    {
                        image: {
                            size: [1024, 683],
                        },
                        mimetype: 'image/jpeg',
                        name: 'foo.jpg',
                        path: '/foo/bar/foo.jpg',
                        size: 186899,
                    },
                    {
                        image: {
                            size: [1024, 683],
                        },
                        mimetype: 'image/jpeg',
                        name: 'bar.jpg',
                        path: '/foo/bar/bar.jpg',
                        size: 178631,
                    },
                    {
                        image: {
                            size: [1024, 683],
                        },
                        mimetype: 'image/jpeg',
                        name: 'baz.jpg',
                        path: '/foo/bar/baz.jpg',
                        size: 193455,
                    }
                ],
                folders: [],
                name: 'bar',
                path: '/foo/bar/'
            });
            $httpBackend.flush();
        }));

        it('should get contents', function() {
            expect(scope.currentPhoto).toEqual({
                image: {
                    size: [1024, 683],
                },
                mimetype: 'image/jpeg',
                name: 'bar.jpg',
                path: '/foo/bar/bar.jpg',
                size: 178631,
            });
            expect(scope.nextPhoto).toEqual({
                image: {
                    size: [1024, 683],
                },
                mimetype: 'image/jpeg',
                name: 'baz.jpg',
                path: '/foo/bar/baz.jpg',
                size: 193455,
            });
            expect(scope.previousPhoto).toEqual({
                image: {
                    size: [1024, 683],
                },
                mimetype: 'image/jpeg',
                name: 'foo.jpg',
                path: '/foo/bar/foo.jpg',
                size: 186899,
            });

            // transition should get cleared
            $rootScope.transitionClass = 'slide-forward';
            $timeout.flush();
            expect($rootScope.transitionClass).toBe(undefined);
        });

        it('should show next photo', function() {
            scope.showNext();
            expect($location.path()).toBe('/foo/bar/baz.jpg');
            expect($rootScope.transitionClass).toBe('slide-forward');
        });

        it('should show previous photo', function() {
            scope.showPrevious();
            expect($location.path()).toBe('/foo/bar/foo.jpg');
            expect($rootScope.transitionClass).toBe('slide-backward');
        });
    });
});
