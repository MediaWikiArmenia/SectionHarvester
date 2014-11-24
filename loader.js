(function loadSectionHarvester() {
	if (mw.config.get('wgNamespace') !== -1) {
		// SpecialPage namespace, language independent
		return;
	}
	var pageName = mw.config.get('wgPageName').split(':');
	if (pageName.length < 1) {
		// No page specified
		return;
	}
	if (pageName[1] !== 'BlankPage/SectionHarvester') {
		// Different Special Page
		return;
	}

	// TODO: where we should put this JS so it is accessible from all language editions
	importScript('User:HrantKhachatrian/SectionHarvester.js');

})();