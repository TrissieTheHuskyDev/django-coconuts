'use strict';

describe('Controllers', function() {
    var $httpBackend;

    beforeEach(module('coconuts'));
    beforeEach(module(function($provide) {
        var FakeData = function() {
        };
        FakeData.prototype.append = function(k, v) {
            this[k] = v;
        };

        $provide.value('FormData', FakeData);
    }));
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

    describe('FolderCtrl', function() {
        var scope, ctrl, $rootScope, $timeout;

        beforeEach(inject(function($controller, $injector, _$rootScope_) {
            $rootScope = _$rootScope_;
            $timeout = $injector.get('$timeout');
            scope = $rootScope.$new();
            ctrl = $controller('FolderCtrl', {
                $routeParams: {path: '/'},
                $scope: scope
            });

            $httpBackend.expect('GET', 'images/contents/').respond({
                can_manage: true,
                can_write: true,
                files: [],
                name: '',
                folders: [],
                path: '/'
            });
            $httpBackend.flush();
        }));

        it('should get contents', function() {
            expect(scope.currentFolder).toEqual({
                can_manage: true,
                can_write: true,
                files: [],
                folders: [],
                name: '',
                path: '/'
            });

            // transition should get cleared
            $rootScope.transitionClass = 'slide-forward';
            $timeout.flush();
            expect($rootScope.transitionClass).toBe(undefined);
        });

        it('should add file', function() {
            $httpBackend.expect('POST', 'images/add_file/', function(data) {
                return angular.equals(data, {
                    upload: {name: 'folder.png'}
                }, true);
            }).respond({
                can_manage: true,
                can_write: true,
                files: [
                    {
                        name: 'folder.png',
                        path: 'folder.png',
                        size: 548,
                    }
                ],
                folders: [],
                name: '',
                path: '/'
            });
 
            scope.addPrompt = true;
            scope.addFile = {name: "folder.png"};
            scope.doAdd();
            $httpBackend.flush();
            expect(scope.addPrompt).toBe(false);
        });

        it('should create folder', function() {
            $httpBackend.expect('POST', 'images/add_folder/', function(data) {
                return angular.equals(data, {
                    name: 'New folder'
                }, true);
            }).respond({
                can_manage: true,
                can_write: true,
                files: [],
                folders: [
                    {
                        name: 'New folder',
                        path: 'New folder',
                        size: 4096,
                    }
                ],
                name: '',
                path: '/'
            });
 
            scope.createPrompt = true;
            scope.createName = "New folder";
            scope.doCreate();
            $httpBackend.flush();
            expect(scope.createPrompt).toBe(false);
        });

        it('should delete file', function() {
            $httpBackend.expect('POST', 'images/delete/Foo/').respond({
                can_manage: true,
                can_write: true,
                files: [],
                folders: [],
                name: '',
                path: '/'
            });

            scope.promptDelete({path: '/Foo/'});
            scope.doDelete();
            $httpBackend.flush();
            expect(scope.deleteTarget).toBe(undefined);
        });

        it('should manage permissions', function() {
            // get permissions
            $httpBackend.expect('GET', 'images/permissions/').respond({
                description: 'some description',
                owners: [
                    {
                        group: 'User',
                        name: 'test_user_1',
                        value: 'user:test_user_1'
                    }, {
                        group: 'User',
                        name: 'test_user_2',
                        value: 'user:test_user_2'
                    }, {
                        group: 'Group',
                        name: 'Test group 1',
                        value: 'group:Test group 1'
                    }, {
                        group: 'Other',
                        name: 'all',
                        value: 'other:all'
                    }
                ],
                permissions: []
            });
            scope.promptManage();
            $httpBackend.flush();
            expect(scope.description).toBe('some description');
            expect(scope.owners).toEqual([
                {
                    group: 'User',
                    name: 'test_user_1',
                    value: 'user:test_user_1'
                }, {
                    group: 'User',
                    name: 'test_user_2',
                    value: 'user:test_user_2'
                }, {
                    group: 'Group',
                    name: 'Test group 1',
                    value: 'group:Test group 1'
                }, {
                    group: 'Other',
                    name: 'all',
                    value: 'other:all'
                }
            ]);
            expect(scope.permissions).toEqual([]);
            expect(scope.managePrompt).toBe(true);

            // update permissions
            scope.description = 'new description';
            $httpBackend.expect('POST', 'images/permissions/', {
                description: 'new description',
                permissions: []
            }).respond({
                description: 'new description',
                owners: [
                    {
                        group: 'User',
                        name: 'test_user_1',
                        value: 'user:test_user_1'
                    }, {
                        group: 'User',
                        name: 'test_user_2',
                        value: 'user:test_user_2'
                    }, {
                        group: 'Group',
                        name: 'Test group 1',
                        value: 'group:Test group 1'
                    }, {
                        group: 'Other',
                        name: 'all',
                        value: 'other:all'
                    }
                ],
                permissions: []
            });
            scope.doManage();
            $httpBackend.flush();
        });
    });
});
