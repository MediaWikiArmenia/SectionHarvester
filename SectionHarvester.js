$(function () {
	"use strict";
	var proofreadNamespaces = {
		index: 106,
		page: 104
	};
	var $body = $('#mw-content-text');
	var $input = $('<input type="text">');
	var $button = $('<button disabled="disabled">');
	var initUI = function () {
		// TODO: i18n
		$('#firstHeading span').text('SectionHarvester');
		$body.text('');

		$input.appendTo($body);
		$input.attr('placeholder', 'URL of the index page');
		$input.on('change', validateInput);
		$input.on('keyup', validateInput);

		$button.appendTo($body);
		$button.text('Harvest!');

		$button.click(getPages);
	};
	var validateURL = function (url) {
		// TODO: validate! - only current wikisource!
		return url.match(/^https?:\/\/[a-z-]+.wikisource.org\/wiki\/.+/) !== null;
	};
	var validateInput = function () {
		var url = $input.val();
		// TODO: some error message?
		if (validateURL(url)) {
			$button.removeAttr('disabled');
		} else {
			$button.attr('disabled', 'disabled');
		}
	};
	var updateProofreadNamespaces = function () {
		// https://www.mediawiki.org/wiki/Extension_talk:Proofread_Page#API_Documentation_.26_Improvement
		var deferred = $.Deferred();
		$.get('/w/api.php', {
			"action": "query",
			"meta": "proofreadinfo",
			"format": "json",
			"piprop": "namespaces"
		}).success(function (d) {
			proofreadNamespaces = d.query.proofreadnamespaces;
			deferred.resolve();
		});
		return deferred;
	};
	var getPages = function () {
		var urlArray = $input.val().substr(6).split(':'); // find namespace colon
		var url = decodeURIComponent(urlArray[1]);
		getPagesRecursive(url).then(function (pages) {
			pages.map(function (page) {
				// TODO: temporaryily print the page titles
				$body.append('<p>#' + page.pageid + ' - ' + page.title + '</p>');
			});
		});
	};
	var getPagesRecursive = function (url, queryContinue) {
		var deferred = $.Deferred();
		var getObject = {
			"action": "query",
			"list": "allpages",
			"aplimit": "500",
			"format": "json",
			"apprefix": url,
			"apnamespace": proofreadNamespaces.page.id
		};
		getObject = $.extend(getObject, queryContinue || {});
		$.get('/w/api.php', getObject).success(function (d) {
			if (d["query-continue"]) {
				// not all results have been received
				// add the value of .query-continue.allpages to the query next time
				getPagesRecursive(url, d["query-continue"].allpages).then(function (allpages) {
					deferred.resolve(d.query.allpages.concat(allpages));
				});
			} else {
				deferred.resolve(d.query.allpages);
			}
		});
		return deferred;
	};

	// get information about namespaces that Proofread extension uses
	updateProofreadNamespaces().then(initUI).fail(function () {
		// TODO:
		alert('Cannot use Wikisource API');
	});
});