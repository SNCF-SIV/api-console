(function () {
  'use strict';

  angular.module('RAML.Directives')
    .directive('ramlInitializer', function ramlInitializer() {
      return {
        restrict:    'E',
        templateUrl: 'directives/raml-initializer.tpl.html',
        replace:     true,
        controller:  'RamlInitializerController'
      };
    })
    .controller('RamlInitializerController', ['$scope', '$window', 'ramlParser', function RamlInitializerController(
      $scope, $window, ramlParser
    ) {
      $scope.vm = {
        codeMirror: {
          gutters:      ['CodeMirror-lint-markers'],
          lineNumbers:  true,
          lineWrapping: true,
          lint:         null,
          mode:         'yaml',
          tabSize:      2,
          theme:        'raml-console'
        },

        error:           null,
        isLoadedFromUrl: false,
        isLoadedFromGitUrl: false,
        isLoading:       false,
        loadFromString:  loadFromString,
        loadFromUrl:     loadFromUrl,
        loadFromGitUrl:  loadFromGitUrl,
        onGitUrlChange:  onGitUrlChange,
        onKeyPressGitUrl: onKeyPressGitUrl,
        raml:            null
      };

      // ---

      (function activate() {
        if (document.location.search.indexOf('?raml=') !== -1) {
          loadFromUrl(document.location.search.replace('?raml=', ''));
        }

        var queryParamTest = /(?=.*group=)(?=.*repository=)(?=.*branch=)(?=.*path=).*/i;
        if (queryParamTest.test(document.location.search)) {
          var gueryParamsExtract = /(group)=([^&]*)|(repository)=([^&]*)|(branch)=([^&]*)|(path)=([^&]*)/gi;
          var match, index = 1;
          $scope.vm.git = {};
          /*jshint boss: true */
          while (match = gueryParamsExtract.exec(document.location.search)) {
            $scope.vm.git[match[index]] = match[index + 1];
            index += 2;
          }
          /*jshint boss: false */
          loadFromGitUrl();
        }
      })();

      // ---

      function loadFromUrl(url) {
        $scope.vm.ramlUrl = url;
        return loadFromPromise(ramlParser.loadPath($window.resolveUrl(url)), {isLoadingFromUrl: true});
      }

      function loadFromString(string) {
        $scope.vm.ramlString = string;
        return loadFromPromise(ramlParser.load(string));
      }

      function getGitProxyfiedUrl() {
                var origin = window.location.origin;
                var path   = window.location.pathname.split('/').slice(0, -1).join('/');
                var url = origin +
                          path                                    + '/' +
                          'git/' + // TODO: make this proxification configurable
                          ($scope.vm.git.group || 'group')           + '/' +
                          ($scope.vm.git.repository || 'repository') + '/' +
                          'raw/' +
                          ($scope.vm.git.branch || 'branch')               + '/' +
                          ($scope.vm.git.path || 'path/to/file.raml');
                return url;
              }

      function onGitUrlChange() {
        $scope.vm.error = null;
        $scope.vm.isLoadedFromUrl = $scope.vm.isLoadedFromGitUrl = false;
        $scope.vm.ramlGitUrl = getGitProxyfiedUrl();
      }

      function onKeyPressGitUrl($event) {
        if ($event.keyCode === 13) {
          loadFromGitUrl();
        }
      }

      function loadFromGitUrl() {
        if ($scope.vm.git.group || $scope.vm.git.repository || $scope.vm.git.branch || $scope.vm.git.path) {
          $scope.vm.ramlGitUrl      = getGitProxyfiedUrl();
          loadFromPromise(ramlParser.loadPath($scope.vm.ramlGitUrl), {isLoadingFromGitUrl: true});
        }
      }

      // ---

      /**
       * @param {Promise} promise
       * @param {Boolean} options.isLoadingFromUrl
       */
      function loadFromPromise(promise, options) {
        options                   = options || {};
        $scope.vm.error           = null;
        $scope.vm.raml            = null;
        $scope.vm.isLoading       = true;
        $scope.vm.isLoadedFromUrl = false;
        $scope.vm.isLoadedFromGitUrl = false;
        $scope.vm.codeMirror.lint = null;

        return promise
          .then(function (raml) {
            $scope.vm.raml = raml;
          })
          .catch(function (error) {
            $scope.vm.error           = error;
            $scope.vm.codeMirror.lint = lintFromError(error);
          })
          .finally(function () {
            $scope.vm.isLoading       = false;
            $scope.vm.isLoadedFromUrl = options.isLoadingFromUrl;
            $scope.vm.isLoadedFromGitUrl = options.isLoadingFromGitUrl;
          })
        ;
      }

      function lintFromError(error) {
        return function getAnnotations() {
          return (error.parserErrors || []).map(function (error) {
            return {
              message:  error.message,
              severity: error.isWarning ? 'warning' : 'error',
              from:     CodeMirror.Pos(error.line),
              to:       CodeMirror.Pos(error.line)
            };
          });
        };
      }
    }])
  ;
})();
