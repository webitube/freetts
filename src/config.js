export const debug = false;


export function debugLog(msg, from)
{
    if (!debug)
    {
        return;
    }    

    console.log(`%c[${from}]%c: ${msg}`, "color: #0e0d4b; font-weight: bold; background-color: #ebdf43", "color: #ebdf43; font-weight: normal; background-color: #0e0d4b");
}

export function debugShowArrayBuffer(buffer, dataName) {
    const fnName = "debugShowArrayBuffer";

    if (!debug)
    {
        return;
    }    

    // 1. Wrap it in a Uint8Array view to read individual bytes
    const view = new Uint8Array(buffer);

    // 2. Extract the required data
    const length = buffer.byteLength;
    const first16 = view.slice(0, 16);
    const last16 = view.slice(-16);

    // 3. Output to console
    debugLog(`${dataName}: Buffer Length: ${length} bytes`, fnName);
    debugLog(`${dataName}: First 16 Bytes: ${first16}`, fnName);
    debugLog(`${dataName}: Last 16 Bytes: ${last16}`, fnName);
}