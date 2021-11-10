$(function () {
    // this executes whenever the extension is clicked
    const {all, merge, update, remove, onChange, rename, clear} = savedSearchesStore()
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
            $("ul").append(`<li class="item" data-filter="${filter}" data-name="${name}"><a class="name" href="#">${name}</a>  <span class="edit">&#9998;</span> <span class="delete">&cross;</span></li>`);
        });

        $("li .name").click(async function () {
            const filter = $(this).parent(".item").data("filter");
            if (filter) {
                const tab = await firstActiveTab()
                const url = tab.url.split("#")[0];

                chrome.tabs.update({url: `${url}#${filter}`});
            }
        });
        $("li .edit").click(async function () {
            const name = $(this).parent(".item").data("name")
            const newName = prompt("Please enter a name", name);
            if (name && newName) {
                await rename(name, newName)

                alert("successfully updated");
            }
        });
        $("li .delete").click(async function () {
            const name = $(this).parent(".item").data("name")
            if (name && confirm(`Confirm delete saved search "${name}"?`)) {
                await remove(name)
            }
        });

        chrome.storage.sync.getBytesInUse(bytesInUse => $("#space").text(bytesInUse));
    }

    $("#export").click(function () {
        chrome.storage.sync.get("savedFilters", function ({savedFilters}) {
            const obj = {
                type: "gmail-saved-search",
                version: 2,
                data: savedFilters
            }


            const blob = new Blob([JSON.stringify(obj, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob)

            chrome.downloads.download({
                url: url,
                filename: "gmail-saved-searches-export.json",
                //saveAs: true, // todo doesn't work and only temp file is created in downloads dir
            })
        });
    });


    $("#import").change(async function () {
        const fr = new FileReader();
        fr.onload = function () {
            let object = JSON.parse(fr.result);
            if (object.type === "gmail-saved-search" && object.version >= 2 && object.data) {
                merge(object.data)
                alert("imported all")
            } else {
                alert ("doesn't seem to be valid file")
            }
        }
        fr.readAsText(this.files[0]);
    })

    $("#clear").click(async function () {
        if (confirm("This will delete all items, are you sure?")) {
            await clear()
            alert("deleted all items")
        }
    })

    render();
});


function savedSearchesStore() {
    const {get, set, clear, onChange} = storage()
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

    const rename = async (oldName, newName) => {
        const vals = await all()
        const filter = vals[oldName]
        delete vals[oldName]
        vals[newName] = filter
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

    return {all, find, update, remove, merge, replace, rename, clear, onChange}
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
    const clear = promisify2(storage, 'clear')
    const onChange = (fn) => storage.onChanged.addListener(fn)

    return {get, set, clear, onChange}
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
