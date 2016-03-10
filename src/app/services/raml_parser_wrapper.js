(function () {
  'use strict';

  RAML.Services.RAMLParserWrapper = function($rootScope, ramlParser, $q) {
    var ramlProcessor, errorProcessor, whenParsed, PARSE_SUCCESS = 'event:raml-parsed';

    var load = function(file) {
      setPromise(ramlParser.loadFile(file));
    };

    var parse = function(raml) {
      setPromise(ramlParser.load(raml));
    };

    var showEndpointDoc = function() {
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
        endpointButton = jQuery(endpointName + ' .raml-console-tab-list .raml-console-tab').first();
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
    };

    var getEndpointFromHashAndVerb = function(endpointName, verb){
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
    };

    var onParseSuccess = function(cb) {
      ramlProcessor = function() {
        cb.apply(this, arguments);
        if (!$rootScope.$$phase) {
          // handle aggressive digesters!
          $rootScope.$digest();
        }
        showEndpointDoc();
      };

      if (whenParsed) {
        whenParsed.then(ramlProcessor);
      }
    };

    var onParseError = function(cb) {
      errorProcessor = function() {
        cb.apply(this, arguments);
        if (!$rootScope.$$phase) {
          // handle aggressive digesters!
          $rootScope.$digest();
        }
      };

      if (whenParsed) {
        whenParsed.then(undefined, errorProcessor);
      }

    };

    var setPromise = function(promise) {
      whenParsed = promise;

      if (ramlProcessor || errorProcessor) {
        whenParsed.then(ramlProcessor, errorProcessor);
      }
    };

    $rootScope.$on(PARSE_SUCCESS, function(e, raml) {
      setPromise($q.when(raml));
    });

    return {
      load: load,
      parse: parse,
      onParseSuccess: onParseSuccess,
      onParseError: onParseError
    };
  };

  angular.module('RAML.Services')
    .service('ramlParserWrapper', ['$rootScope', 'ramlParser', '$q', RAML.Services.RAMLParserWrapper]);
})();
