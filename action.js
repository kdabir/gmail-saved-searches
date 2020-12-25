$(function () {
    $("#add").click(function () {
        const name = prompt("Please enter a name", "Untitled");

        chrome.tabs.query({currentWindow: true, active: true}, function (foundTabs) {
            if (foundTabs.length > 0) {
                const section = foundTabs[0].url.split("#")[1];

                chrome.storage.sync.get("savedFilters", function ({savedFilters}) {
                    if (!savedFilters) savedFilters = {};

                    savedFilters[name] = section; // update

                    chrome.storage.sync.set({savedFilters}, function () {
                        alert("successfully saved");
                    });
                });
            }
        });
    });


    chrome.storage.sync.get("savedFilters", function ({savedFilters}) {
        if (savedFilters) {
            Object.entries(savedFilters).forEach(([name, section]) => {
                $("ul").append(`<li data-filter="${section}"><a href="#">${name}</a></li>`);
            });

            $("li").click(function () {
                const filter = $(this).data("filter");
                if (filter) {
                    chrome.tabs.query({currentWindow: true, active: true}, function (foundTabs) {
                            if (foundTabs.length > 0) {
                                const url = foundTabs[0].url.split("#")[0];
                                chrome.tabs.update({
                                    url: `${url}#${filter}`,
                                });
                            }
                        }
                    );
                }
            });
        }
    });
});
