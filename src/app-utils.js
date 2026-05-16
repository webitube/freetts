import {
    getDebugMode,
    setDebugMode
} from './global-switches.js'

import {
    debugLog,
    debugLogEnd,
    debugWarn,
    debugWarnEnd,
    debugError,
    debugErrorEnd,
    debugLogArray
} from './debug-log.js'


export function updateStatusMsg(status, msg, device) {
    if (status != undefined)
    {
        status.textContent = `${msg} (${device.toUpperCase()})`;
    }
}

export function resetStatusAfterDelay(statusCallback, delay = 2000, readyMessage = 'Ready.') {
    if (typeof statusCallback === 'function') {
        setTimeout(() => statusCallback(readyMessage), delay);
    }
}

export function toggleHidden(element, hidden) {
    if (element) {
        element.classList.toggle('hidden', hidden);
    }
}

export function capitalizeMsg(original) {
    return original.charAt(0).toUpperCase() + original.slice(1);
}

export function getSelectedEngine()
{
    const engineSelect = document.getElementById('engine-select');
    return [engineSelect.options[engineSelect.selectedIndex].text, engineSelect.value];
}

export function updateSelectedEngine(activeDevice = ``)
{
    const [selectedEngineText, selectedEngine] = getSelectedEngine();
    if (selectedEngine == "webspeech" || activeDevice == "")
    {
        document.getElementById('active-device-msg').textContent = `${selectedEngineText}`;
    }
    else
    {
        document.getElementById('active-device-msg').textContent = `${selectedEngineText}: ${activeDevice.toLocaleUpperCase()}`;
    }
}