(function () {
  'use strict';

  RAML.Directives.ramlInitializer = function(ramlParserWrapper) {
    return {
      restrict: 'E',
      templateUrl: 'directives/raml-initializer.tpl.html',
      replace: true,
      controller: function($scope, $window, $http, $q) {
        $scope.ramlUrl = $scope.ramlGitUrl = '';

        ramlParserWrapper.onParseError(function(error) {
          /*jshint camelcase: false */
          var context = error.context_mark || error.problem_mark;
          /*jshint camelcase: true */

          $scope.errorMessage = error.message;

          if (context && !$scope.isLoadedFromUrl) {
            $scope.raml = context.buffer;

            $window.ramlErrors.line    = context.line;
            $window.ramlErrors.message = error.message;

            // Hack to update codemirror
            setTimeout(function () {
              var editor = jQuery('.raml-console-initializer-input-container .CodeMirror')[0].CodeMirror;
              editor.addLineClass(context.line, 'background', 'line-error');
              editor.doc.setCursor(context.line);
            }, 10);
          }

          $scope.ramlStatus = null;

          $scope.$apply.apply($scope, null);
        });

        ramlParserWrapper.onParseSuccess(function() {
          $scope.ramlStatus = 'loaded';
        });

        var getGitProxyfiedUrl = function() {
          var origin = window.location.origin;
          var path   = window.location.pathname.split('/').slice(0, -1).join('/');
          var url = origin +
                    path                                    + '/' +
                    'git/' + // TODO: make this proxification configurable
                    ($scope.git.group || 'group')           + '/' +
                    ($scope.git.repository || 'repository') + '/' +
                    'raw/' +
                    ($scope.git.branch || 'master')               + '/' +
                    ($scope.git.path || 'path/to/file.raml');
          return url;
        };

        $scope.onGitUrlChange = function () {
          $scope.errorMessage = null;
          $scope.isLoadedFromUrl = $scope.isLoadedFromGitUrl = false;

          var proxyfiedUrl = getGitProxyfiedUrl();
          $scope.ramlGitUrl = proxyfiedUrl;
        };

        $scope.onChange = function () {
          $scope.errorMessage = null;
          $scope.isLoadedFromUrl = $scope.isLoadedFromGitUrl = false;
        };

        $scope.onKeyPressGitUrl = function ($event) {
          if ($event.keyCode === 13) {
            $scope.loadFromGitUrl();
          }
        };

        $scope.onKeyPressRamlUrl = function ($event) {
          if ($event.keyCode === 13) {
            $scope.loadFromUrl();
          }
        };

        var getGitAccessToken = function() {
          return 'your Gitlab API token here';
        };

        var getGitLocalPath = function() {
          return 'git/';
        };

        var checkGroupAvailability = function(providedGroupName) {
          var origin = window.location.origin;
          var path   = window.location.pathname.split('/').slice(0, -1).join('/');
          var groupsUrl = origin +
                     path  + '/' +
                     getGitLocalPath() +
                    'api/v3/groups' + '?private_token=' + getGitAccessToken();

          return $http({method: 'GET', url: groupsUrl})
                .then(function(response) {
                  var foundGroup = null;
                  response.data.forEach(function(g) {
                  if(g.path === providedGroupName) {
                      foundGroup = g;
                    }
                  });

                  if(!foundGroup){
                    return $q.reject('The group \'' + providedGroupName + ' \' doesn\'t exist');
                  } else {
                    return foundGroup;
                  }
                });
        };

        var checkRepositoryAvailability = function(groupId, providedRepositoryName) {
          var origin = window.location.origin;
          var path   = window.location.pathname.split('/').slice(0, -1).join('/');
          var projectsUrl = origin +
                     path  + '/' +
                    getGitLocalPath() +
                    'api/v3/groups/' + groupId + '?private_token=' + getGitAccessToken();

          return $http({method: 'GET', url: projectsUrl})
            .then(function(response) {
              var foundProject = null;
              response.data.projects.forEach(function(p) {
                if(p.path === providedRepositoryName) {
                  foundProject = p;
                }
              });
              if(!foundProject) {
                return $q.reject('The repository \'' + providedRepositoryName + ' \' doesn\'t exist');
              } else {
                return foundProject;
              }
           });
        };

        $scope.loadFromGitUrl = function () {
          if ($scope.git.group || $scope.git.repository || $scope.git.branch || $scope.git.path) {
            $scope.ramlGitUrl      = getGitProxyfiedUrl();
            $scope.isLoadedFromUrl = $scope.isLoadedFromGitUrl = true;

           checkGroupAvailability($scope.git.group).then(
             function(foundGroup){
              return checkRepositoryAvailability(foundGroup.id, $scope.git.repository);
            }).then(
              function() {
                $scope.ramlStatus      = 'loading';
                ramlParserWrapper.load($scope.ramlGitUrl);
              }
            ).catch(
              function(reason) {
               $scope.errorMessage = reason;
              }
            );
          }
        };

        $scope.loadFromUrl = function () {
          if ($scope.ramlUrl) {
            $scope.isLoadedFromUrl = true;
            $scope.ramlStatus      = 'loading';
            ramlParserWrapper.load($scope.ramlUrl);
          }
        };

        $scope.loadRaml = function() {
          if ($scope.raml) {
            $scope.ramlStatus      = 'loading';
            $scope.isLoadedFromUrl = false;
            ramlParserWrapper.parse($scope.raml);
          }
        };

        if (document.location.search.indexOf('?raml=') !== -1) {
          $scope.ramlUrl = document.location.search.replace('?raml=', '');
          $scope.loadFromUrl();
        }

        var queryParamTest = /(?=.*group=)(?=.*repository=)(?=.*branch=)(?=.*path=).*/i;
        if (queryParamTest.test(document.location.search)) {

          var queryParamsExtract = /(group)=([^&]*)|(repository)=([^&]*)|(branch)=([^&]*)|(path)=([^&]*)/gi;
          var match, index = 1;
          $scope.git = {};

          /*jshint boss: true */
          while (match = queryParamsExtract.exec(document.location.search)) {
            $scope.git[match[index]] = match[index + 1];
            index += 2;
          }
          /*jshint boss: false */

          $scope.loadFromGitUrl();
        }
      }
    };
  };

  angular.module('RAML.Directives')
    .directive('ramlInitializer', RAML.Directives.ramlInitializer);
})();
