(function () {
  'use strict';

  RAML.Directives.ramlInitializer = function(ramlParserWrapper) {
    return {
      restrict: 'E',
      templateUrl: 'directives/raml-initializer.tpl.html',
      replace: true,
      controller: ['$scope', '$window', function($scope, $window) {
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
                    ($scope.git.tag || 'tag')               + '/' +
                    ($scope.git.path || 'path/to/file.raml');
          return url;
        };

        $scope.onGitUrlChange = function () {
          $scope.errorMessage = null;
          $scope.isLoadedFromUrl = $scope.isLoadedFromGitUrl = false;

          $scope.ramlGitUrl = getGitProxyfiedUrl();
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

        $scope.loadFromGitUrl = function () {
          if ($scope.git.group || $scope.git.repository || $scope.git.tag || $scope.git.path) {
            $scope.ramlGitUrl      = getGitProxyfiedUrl();
            $scope.isLoadedFromUrl = $scope.isLoadedFromGitUrl = true;
            $scope.ramlStatus      = 'loading';
            ramlParserWrapper.load($scope.ramlGitUrl);
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

        var queryParamTest = /(?=.*group=)(?=.*repository=)(?=.*tag=)(?=.*path=).*/i;
        if (queryParamTest.test(document.location.search)) {

          var queryParamsExtract = /(group)=([^&]*)|(repository)=([^&]*)|(tag)=([^&]*)|(path)=([^&]*)/gi;
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
      }]
    };
  };

  angular.module('RAML.Directives')
    .directive('ramlInitializer', ['ramlParserWrapper', RAML.Directives.ramlInitializer]);
})();
