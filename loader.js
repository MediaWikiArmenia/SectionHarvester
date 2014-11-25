(function loadSectionHarvester() {
	if (mw.config.get('wgNamespace') !== null) {
		// SpecialPage namespace is -1, but blank page seems to have NULL namespace...
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

	// TODO: we should put this JS on Meta so it is easily accessible from all language editions
	importScript('User:HrantKhachatrian/SectionHarvester.js');

})();
