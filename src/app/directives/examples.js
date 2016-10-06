(function () {
  'use strict';

  RAML.Directives.examples = function() {
    return {
      restrict: 'E',
      templateUrl: 'directives/examples.tpl.html',
      scope: {
        exampleContainer: '=',
        getBeatifiedExampleRef: '&'
      },
      controller: ['$scope', function($scope) {
        $scope.getBeatifiedExample = $scope.getBeatifiedExampleRef();
        $scope.examples = transformExample($scope.exampleContainer);
        $scope.currentExample = 0;

        $scope.isXML = $scope.exampleContainer.name === 'application/xml';

        $scope.changeExample = function(example) {
          $scope.currentExample = example;
        };

       $scope.showExample = function ($event) {
                      var $this   = jQuery($event.currentTarget);
                      var $panel  = $this.closest('.raml-console-examples-container');
                      var $example = $panel.find('.raml-console-resource-pre-toggle');

                      $this.toggleClass('raml-console-is-active');

                      if (!$example.hasClass('raml-console-is-active')) {
                        $this.text('Hide Example');
                        $example
                          .addClass('raml-console-is-active')
                          .velocity('slideDown');
                      } else {
                        $this.text('Show Example');
                        $example
                          .removeClass('raml-console-is-active')
                          .velocity('slideUp');
                      }
                    };

        $scope.$watch('exampleContainer', function (value) {
          $scope.examples = transformExample(value);
        });
      }]
    };
  };

  function transformExample(exampleContainer) {
    if (exampleContainer.example) {
      return [{
        name: 'Example',
        content: (typeof exampleContainer.example === 'object') ?
            JSON.stringify(exampleContainer.example) : exampleContainer.example
      }];
    } else if (exampleContainer.examples) {
      if (Array.isArray(exampleContainer.examples)) {
        return exampleContainer.examples.map(function (example, index) {
          return {
            name: example.name || 'Example ' + index,
            content: JSON.stringify(example.value, null, 2)
          };
        });
      } else {
        return Object.keys(exampleContainer.examples).sort().map(function (key) {
          return {
            name: key,
            content: exampleContainer.examples[key].value
          };
        });
      }
    }
  }

  angular.module('RAML.Directives')
    .directive('examples', RAML.Directives.examples);
})();
