import {
    getDebugMode,
    setDebugMode
} from './global-switches.js'


/**
 * Creates a string of a specified length filled with a given character.
 * @param {number} length - Desired length (non-negative integer)
 * @param {string} char   - Character to repeat
 * @returns {string}
 */
export function repeatChar(length, char) {
  if (typeof length !== 'number' || !Number.isInteger(length) || length < 0) {
    throw new RangeError('length must be a non-negative integer');
  }
  return String(char).repeat(length);
}


export function debugLog(msg, timerName = "")
{
    if (getDebugMode())
    {
        if (timerName != "")
        {
            const msgLen = msg.length;
            const middle = repeatChar(msgLen + 8, '>');
            console.log(middle);
            console.log(`>>> ${msg} >>>`);
            console.time(`=== ${timerName} ===`);
        }
        else
        {
            console.log(msg);
        }
    }
}

export function debugLogEnd(msg, timerName = "")
{
    if (getDebugMode())
    {
        if (timerName != "")
        {
            console.timeEnd(`=== ${timerName} ===`);
            console.log(`<<< ${msg} <<<`);
            const msgLen = msg.length;
            const middle = repeatChar(msgLen + 8, '<');
            console.log(middle);        }
        else
        {
            console.log(msg);
        }
    }
}

export function debugWarn(msg, timerName = "")
{
    if (getDebugMode())
    {
        console.warn(msg);
        if (timerName != "")
        {
            console.time(timerName);
        }
    }
}

export function debugWarnEnd(msg, timerName = "")
{
    if (getDebugMode())
    {
        if (timerName != "")
        {
            console.timeEnd(timerName);
        }
        console.warn(msg);
    }
}

export function debugError(msg, timerName = "")
{
    if (getDebugMode())
    {
        console.error(msg);
        if (timerName != "")
        {
            console.time(timerName);
        }
    }
}

export function debugErrorEnd(msg, timerName = "")
{
    if (getDebugMode())
    {
        if (timerName != "")
        {
            console.timeEnd(timerName);
        }
        console.error(msg);
    }
}
