$(function () {
	"use strict";
	var proofreadNamespaces = {
		index: 106,
		page: 104
	};
	var fetchedPages = {};
	var foundSections = {};

	var UI = {
		$body: $('#mw-content-text'),
		$input: $('<input type="text">'),
		$button: $('<button disabled="disabled">'),
		$status: $('<div style="background:#EEE;padding:5px 10px;text-align: center">'),
		init: function () {
			// TODO: i18n
			$('#firstHeading span').text('SectionHarvester');
			UI.$body.text('');
			UI.$status.appendTo(UI.$body);

			UI.$input.appendTo(UI.$body);
			UI.$input.attr('placeholder', 'URL of the index page');
			UI.$input.on('change', UI.validateInput);
			UI.$input.on('keyup', UI.validateInput);

			UI.$button.appendTo(UI.$body);
			UI.$button.text('Harvest!');

			UI.$button.click(harvestSections);
		},
		validateInput: function () {
			var url = UI.$input.val();
			// TODO: some error message?
			if (validateURL(url)) {
				UI.$button.removeAttr('disabled');
			} else {
				UI.$button.attr('disabled', 'disabled');
			}
		},
		getInputValue: function () {
			return UI.$input.val();
		},
		setStatus: function (message) {
			UI.$status.text(message);
		}
	};
	var validateURL = function (url) {
		// TODO: validate! - only current wikisource!
		return url.match(/^https?:\/\/[a-z-]+.wikisource.org\/wiki\/.+/) !== null;
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
	var harvestSections = function () {
		var urlArray = UI.getInputValue().substr(6).split(':'); // find namespace colon
		var url = decodeURIComponent(urlArray[1]);
		UI.setStatus('Fetching list of pages...'); //TODO: i18n
		getPagesRecursive(url).then(function (pages) {
			pages.map(function (page) {
				// TODO: temporarily print the page titles
				//	UI.$body.append('<p>#' + page.pageid + ' - ' + page.title + '</p>');
			});
			UI.setStatus('Fetching page contents...');
			var pageids = pages.map(function (p) {
				return p.pageid;
			}).join('|');
			return getPageContentsRecursive(pageids);
		}).then(function (pages) {
			fetchedPages = pages;
			Object.keys(fetchedPages).map(scanPage);
			return true;
		}).then(function () {
			console.log(foundSections);
		});
	};
	var scanPage = function (id) {
		UI.setStatus('Scanning page:' + fetchedPages[id].title);
		var content = fetchedPages[id].revisions[0]['*'];
		var offset = 0;
		fetchedPages[id].foundSections = -1;
		do {
			fetchedPages[id].foundSections++;
			offset = findNextSection(id, content, offset);
		} while (offset !== false);
	};
	var findNextSection = function (pageid, content, offset) {
		var sectionBeginString = '<section begin="'; // TODO: i18n ? https://www.mediawiki.org/wiki/Extension:Labeled_Section_Transclusion#Localisation
		var sectionEndString = '<section end="';

		var beginTagStart = content.indexOf(sectionBeginString, offset);
		if (beginTagStart === -1) {
			return false;
		}
		var beginNameStart = beginTagStart + sectionBeginString.length;
		var beginNameEnd = content.indexOf('"', beginNameStart); // TODO: quotes in the title?
		var beginTagEnd = content.indexOf('>', beginNameEnd);
		var sectionName = content.substring(beginNameStart, beginNameEnd);
		if (!foundSections[sectionName]) {
			foundSections[sectionName] = [];
		}
		foundSections[sectionName].push(pageid);
		var endTagStart = content.indexOf(sectionEndString, beginTagEnd);
		// TODO: ...
		return offset;
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

	var getPageContentsRecursive = function (pageids, queryContinue) {
		var deferred = $.Deferred();
		var getObject = {
			"action": "query",
			"prop": "revisions",
			"rvprop": "content",
			"format": "json",
			"pageids": pageids
		};
		getObject = $.extend(getObject, queryContinue || {});
		$.get('/w/api.php', getObject).success(function (d) {
			if (d["query-continue"]) {
				// not all results have been received
				// add the value of .query-continue.allpages to the query next time
				getPageContentsRecursive(pageids, d["query-continue"].revisions).then(function (pages) {
					deferred.resolve(d.query.pages.concat(pages));
				});
			} else {
				deferred.resolve(d.query.pages);
			}
		});
		return deferred;

	};

	// get information about namespaces that Proofread extension uses
	updateProofreadNamespaces().then(UI.init).fail(function () {
		// TODO:
		alert('Cannot use Wikisource API');
	});
});
