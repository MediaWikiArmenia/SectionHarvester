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
		$input: $('<input type="text" style="width:80%">'),
		$button: $('<button disabled="disabled">'),
		$status: $('<div style="background:#EEE;padding:5px 10px;text-align: center">'),
		$warnings: $('<div style="background:#EED;padding:5px 10px; display:none"><h2>Warnings</h2></div>'),
		$sections: $('<div style="background:#DED;padding:5px 10px; display:none"><h2>Sections</h2><table><thead><tr><td>Section name</td><td>Pages</td></tr></thead></table></div>'),
		$sectionsTBody: $('<tbody></tbody>'),
		init: function () {
			// TODO: i18n
			$('#firstHeading span').text('SectionHarvester');
			UI.$body.text('');

			UI.$input.appendTo(UI.$body);
			UI.$input.attr('placeholder', 'URL of the index page');
			UI.$input.on('change', UI.validateInput);
			UI.$input.on('keyup', UI.validateInput);

			UI.$button.appendTo(UI.$body);
			UI.$button.text('Harvest!');

			UI.$button.click(harvestSections);

			UI.$status.appendTo(UI.$body);
			UI.$warnings.appendTo(UI.$body);
			UI.$sections.appendTo(UI.$body);
			UI.$sectionsTBody = UI.$sections.find('table');
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
		},
		addPageWarning: function (pageId, message) {
			UI.$warnings.show();
			// TODO: i18n and links!
			UI.$warnings.append('<div>Page ' + getPageTitleById(pageId) + ' - ' + message + '</div>');
		},
		showSections: function () {
			var sortedKeys = Object.keys(foundSections).sort(function (a, b) {
				a = a.toLowerCase();
				b = b.toLowerCase();
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			});
			sortedKeys.map(function (sectionName) {
				var pageNumbers = foundSections[sectionName].map(getPageTitleById).join(', ');
				UI.$sectionsTBody.append('<tr><td>' + sectionName + '</td><td>' + pageNumbers + '</td></tr>');
			});
			UI.$sections.show();
		}
	};
	var getPageTitleById = function (pageId) {
		var titleArray = fetchedPages[pageId].title.split('/');
		return titleArray.length > 1 ? titleArray[1] : titleArray[0];
	};
	var validateURL = function (url) {
		// TODO: validate! - only current wikisource!
		return url.match(/^https?:\/\/[a-z-]+.wikisource.org\/wiki\/.+/) !== null;
	};
	var PageValidator = {
		beforeFirstSection: function (pageId, content) {
			// TODO: more validation
			if (content.trim() === '') {
				return;
			}
			UI.addPageWarning(pageId, 'Text before first section: <textarea style="display:block" rows="3">' + content + '</textarea>');
		},
		afterEndSection: function (pageId, content) {
			// TODO: more validation
			if (content.trim() === '') {
				return;
			}
			UI.addPageWarning(pageId, 'Text after last section: <textarea style="display:block" rows="3">' + content + '</textarea>');
		},
		noSections: function (pageId, content) {
			// TODO: validate?!
			UI.addPageWarning(pageId, 'No sections found!');
		},
		newSectionName: function (pageId, sectionName) {
			// TODO: validate name?
			if (!foundSections[sectionName]) {
				foundSections[sectionName] = [];
			}
			foundSections[sectionName].push(pageId);
		},
		betweenSections: function (pageId, content) {
			// TODO: more validation
			if (content.trim() === '') {
				return;
			}
			UI.addPageWarning(pageId, 'Text between sections: <textarea style="display:block" rows="3">' + content + '</textarea>');
		},
		sectionNoEnd: function (pageId, sectionName) {
			UI.addPageWarning(pageId, 'Section ' + sectionName + ' didn\'t end!');
		},
		sectionNameConflict: function (pageId, sectionName, sectionNameEnd) {
			if (sectionName !== sectionNameEnd) {
				UI.addPageWarning(pageId, 'Section ' + sectionName + ' ended with name ' + sectionNameEnd);
			}
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
	var harvestSections = function () {
		var urlArray = UI.getInputValue().substr(6).split(':'); // find namespace colon
		var url = decodeURIComponent(urlArray[1]);
		UI.setStatus('Fetching list of pages...'); //TODO: i18n
		getPageContentsRecursive(url).then(function (pages) {
			fetchedPages = pages;
			Object.keys(fetchedPages).map(scanPage);
			return true;
		}).then(function () {
			UI.showSections();
			UI.setStatus('Ready! Harvested sections are below.');
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
	var findNextSection = function (pageId, content, offset) {
		// TODO: invalid XML markup validation
		var sectionBeginString = '<section begin="'; // TODO: i18n ? https://www.mediawiki.org/wiki/Extension:Labeled_Section_Transclusion#Localisation
		var sectionEndString = '<section end="';

		var beginTagStart = content.indexOf(sectionBeginString, offset);
		if (beginTagStart === -1) {
			if (offset === 0) {
				// no sections in the page
				PageValidator.noSections(pageId);
			} else {
				PageValidator.afterEndSection(pageId, content.substr(offset));
			}
			return false;
		}
		if (offset === 0) {
			PageValidator.beforeFirstSection(pageId, content.substring(0, beginTagStart));
		} else {
			PageValidator.betweenSections(pageId, content.substring(offset, beginTagStart));
		}
		var beginNameStart = beginTagStart + sectionBeginString.length;
		var beginNameEnd = content.indexOf('"', beginNameStart); // TODO: quotes in the title?
		var beginTagEnd = content.indexOf('>', beginNameEnd) + 1;
		var sectionName = content.substring(beginNameStart, beginNameEnd);

		PageValidator.newSectionName(pageId, sectionName);

		var endTagStart = content.indexOf(sectionEndString, beginTagEnd);
		if (endTagStart === -1) {
			PageValidator.sectionNoEnd(pageId, sectionName);
			return beginTagEnd;
		}
		var endNameStart = endTagStart + sectionEndString.length;
		var endNameEnd = content.indexOf('"', endNameStart); // TODO: quotes in the title?
		var endTagEnd = content.indexOf('>', endNameEnd) + 1;
		var sectionNameEnd = content.substring(endNameStart, endNameEnd);
		PageValidator.sectionNameConflict(pageId, sectionName, sectionNameEnd);

		return endTagEnd;
	};
	var getPageContentsRecursive = function (url, queryContinue) {
		var deferred = $.Deferred();
		var getObject = {
			"action": "query",
			"generator": "allpages",
			"gaplimit": "50",
			"gapprefix": url,
			"gapnamespace": proofreadNamespaces.page.id,
			"prop": "revisions",
			"rvprop": "content",
			"format": "json"
		};
		getObject = $.extend(getObject, queryContinue || {});
		$.get('/w/api.php', getObject).success(function (d) {
			if (d["query-continue"]) {
				// not all results have been received
				// add the values of
				// .query-continue.allpages and .query-continue.revisions
				// to the query next time [we're using generators!]
				getPageContentsRecursive(url, $.extend(d["query-continue"].allpages, d["query-continue"].revisions)).then(function (pages) {
					deferred.resolve($.extend(pages, d.query.pages));
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