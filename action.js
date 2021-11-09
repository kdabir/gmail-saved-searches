$(function () {
    // this executes whenever the extension is clicked
    const {all, find, update, remove, replace, onChange} = savedSearchesStore()
    const {firstActiveTab} = queryBrowser()

    onChange(async function (changes, namespace) {
        await render()
    })

    $("#add").click(async function () {
        const tab = await firstActiveTab()
        const filter = tab.url.split("#")[1];
        const name = prompt("Please enter a name", "Untitled");

        await update(name, filter)

        alert("successfully saved");
    });


    async function render() {
        $('ul').empty()

        Object.entries(await all()).forEach(([name, filter]) => {
            $("ul").append(`<li data-filter="${filter}"><a href="#">${name}</a></li>`);
        });

        $("li").click(async function () {
            const filter = $(this).data("filter");
            if (filter) {
                const tab = await firstActiveTab()
                const url = tab.url.split("#")[0];

                chrome.tabs.update({url: `${url}#${filter}`});
            }
        });

        chrome.storage.sync.getBytesInUse(bytesInUse => $("#space").text(bytesInUse));
    }

    $("#export").click(function () {
        chrome.storage.sync.get("savedFilters", function ({savedFilters}) {
            const blob = new Blob([JSON.stringify(savedFilters, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob)

            chrome.downloads.download({
                url: url,
                filename: "gmail-saved-searches-export.json",
                //saveAs: true, // todo doesn't work and only temp file is created in downloads dir
            })
        });
    });


    $("#import").click(async function () {
        const {get} = storage()
        alert("not implemented yet")
    })

    render();
});


function savedSearchesStore() {
    const {get, set, onChange} = storage()
    const STORAGE_KEY = "savedFilters"

    const all = () => get(STORAGE_KEY).then(obj => obj[STORAGE_KEY] || {})
    const replace = (obj) => set({[STORAGE_KEY]: sortObjectByKeys(obj)})

    const find = (name) => {
        all().then(all => all[name])
    }

    const update = async (name, filter) => {
        const vals = await all()
        vals[name] = filter; // mutation
        await replace(vals)
    }

    const merge = async (object) => {
        const vals = await all()

        await replace({...vals, ...object})
    }

    const remove = async (...names) => {
        const vals = await all()
        if (names.some(name => delete vals[name])) { // mutation
            await replace(vals)
        }
    }

    return {all, find, update, remove, merge, replace, onChange}
}


function queryBrowser() {
    const queryTabs = promisify2(chrome.tabs, 'query')

    async function firstActiveTab() {
        const foundTabs = await queryTabs({currentWindow: true, active: true})

        if (foundTabs.length === 0) {
            throw new Error("No active tab");
        }

        return foundTabs[0]
    }

    return {firstActiveTab};
}

function storage(sync = true) {
    const storage = sync ? chrome.storage.sync : chrome.storage.local

    const get = promisify2(storage, 'get')
    const set = promisify2(storage, 'set')
    const onChange = (fn) => storage.onChanged.addListener(fn)

    return {get, set, onChange}
}

// the get/set on chrome store cannot be passed without explicitly binding the context
// chrome.storage.sync.get.bind(chrome.storage.sync)


/**
 *
 * @param fn the API function to be promisified
 * @param context Optional (the context in which function should be called)
 * @return {function(...[*]): Promise<unknown>}
 */
function promisify(fn, context) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            try {
                (context) ? fn.call(context, ...args, resolve) : fn(...args, resolve)
            } catch (e) {
                reject(e)
            }
        });
    };
}

/**
 * Use this function when the context contains the function itself
 *
 * @param context the parent object
 * @param functionName :string key name of the function to be invoked
 * @return {function(...[*]): Promise<*>}
 */
function promisify2(context, functionName) {
    return promisify(context[functionName], context)
}

/**
 *
 * @param object:{}
 * @return {{}}
 */
function sortObjectByKeys(object) {
    return Object.keys(object)
        .sort()
        .reduce((acc, key) => ({...acc, [key]: object[key]}), {})
}
