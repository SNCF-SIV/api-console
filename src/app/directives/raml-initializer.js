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
    .controller('RamlInitializerController', ['$scope', '$window', 'ramlParser','$http', '$q', function RamlInitializerController(
      $scope, $window, ramlParser, $http, $q
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
                          ($scope.vm.git.branch || 'master')               + '/' +
                          ($scope.vm.git.path || 'path/to/file.raml');
                return url;
              }

      function getGitAccessToken() {
        return '/*PLACE YOUR TOKEN HERE*/';
      }

      function getGitLocalPath() {
        return 'git/';
      }

      function checkGroupAvailability(providedGroupName) {
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
      }

      function checkRepositoryAvailability(groupId, providedRepositoryName) {
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
          checkGroupAvailability($scope.vm.git.group).then(
                      function(foundGroup){
                        return checkRepositoryAvailability(foundGroup.id, $scope.vm.git.repository);
                      }).then(
                        function() {
                          loadFromPromise(ramlParser.loadPath($scope.vm.ramlGitUrl), {isLoadingFromGitUrl: true});
                        }
                      ).catch(
                        function(reason) {
                          $scope.vm.error = {'message':reason};
                          $scope.vm.isLoading = false;
                          $scope.vm.isLoadedFromGitUrl = true;
                        }
                      );
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
            setTimeout(function () {
                 showEndpointDoc();
            },200);

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

      function showEndpointDoc() {
        var hash = window.location.hash, endpointName, endpointButton, endpointElemParent, qLocation, verb;
        if (!hash) {
          return;
        }
        qLocation = hash.indexOf('?');
        endpointName = qLocation > 0 ? hash.substring(0, qLocation) : hash;

        //If verb is including to hash
        var posVerb = endpointName.indexOf('@');
        if(posVerb > 0){
          verb = endpointName.substring(posVerb+1);
          endpointName =  endpointName.substring(0,posVerb);
          endpointButton = getEndpointFromHashAndVerb(endpointName,verb);
        }else{
          endpointButton = jQuery(endpointName + ' .raml-console-resource-list-item').first();
        }

        endpointElemParent = jQuery(endpointName).parent();
        if (endpointButton.length < 1) {
          return;
        }
        //Case endpoints container, toggle it before click on endpoint
        if(endpointElemParent.attr('id')!=='raml-console-resources-container'){
          endpointElemParent.parent().children().first().children().first().children().first().triggerHandler('click');
        }
        //Click on tab according to hash specification '@VERB'. Example #example@POST ou #example@GET
        endpointButton.triggerHandler('click');
      }

      function getEndpointFromHashAndVerb(endpointName, verb){
        var endpointTabs = jQuery(endpointName + ' .raml-console-tab-list .raml-console-tab'), elem, result;
        result = jQuery(endpointName + ' .raml-console-tab-list .raml-console-tab').first();
        endpointTabs.each(function() {
          elem = jQuery(this);
          if(jQuery(':first-child', elem).text()===verb){
            result = elem;
            return false;
          }
        });
        return result;
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
