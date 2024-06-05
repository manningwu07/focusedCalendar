/**
 * @typedef {{
 *    blacklist: [],
 *    currentBlocks: [],
 *    aiOn: false,
 *    timeTrack: {
 *        websiteName: [],
 *        websiteTime: [],
 *        categoryName: [],
 *        categoryTime: []
 *    }
 * }} Options
 */

/** @type {Options} */
const defaultOptions = {
    blacklist: [],
    currentBlocks: [],
    aiOn: false,
    timeTrack: {
        websiteName: [],
        websiteTime: [],
        categoryName: [],
        categoryTime: [],
        lastSwitchTime: 0
    }
}


/**
 * @returns {Promise<Options>}
 */
const loadOptions = async () => {
    const options = await new Promise((resolve) => {
        chrome.storage.sync.get(defaultOptions, resolve);
    });
    return options;
}


/**
 * @param {Options} options
 * @returns {Promise<void>}
 */
const saveOptions = async (options) => new Promise((resolve) => {
    chrome.storage.sync.set(options, resolve);
})
