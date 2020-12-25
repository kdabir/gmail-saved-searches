chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
        conditions: [new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'mail.google.com' },
        })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
});
