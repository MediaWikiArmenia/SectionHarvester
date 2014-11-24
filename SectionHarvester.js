$(function () {
	"use strict";
	var $body = $('#mw-content-text');
	var $input = $('<input type="text">');
	var $button = $('<button disabled="disabled">');
	var initUI = function () {
		// TODO: i18n
		$('#firstHeading span').text('SectionHarvester');
		$body.text('');

		$input.appendTo($body);
		$input.attr('placeholder', 'URL of the book');
		$input.on('change', validateInput);
		$input.on('keyup', validateInput);

		$button.appendTo($body);
		$button.text('Harvest!');

		$button.click();
	};
	var validateURL = function (url) {
		// TODO: validate!
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


	initUI();
});