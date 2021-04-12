require("./Main.scss");

// --- HTML Basics ---
// isInteger polyfill for Internet Explorer
if (!Object.entries)
{
    Object.entries = function (obj: any): any
    {
        const ownProps = Object.keys(obj);
        let i = ownProps.length;
        const resArray = new Array(i); // preallocate the Array
        while (i--)
            resArray[i] = [ownProps[i], obj[ownProps[i]]];

        return resArray;
    };
}
Number.isInteger = Number.isInteger || function (value: any): boolean
{
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
};
if (!Array.prototype.fill)
{
    Object.defineProperty(Array.prototype, 'fill', {
        value: function (value: any)
        {
            // Steps 1-2.
            if (this === null)
            {
                throw new TypeError('this is null or not defined');
            }

            const O = Object(this);

            // Steps 3-5.
            const len = O.length >>> 0;

            // Steps 6-7.
            const start = arguments[1];
            const relativeStart = start >> 0;

            // Step 8.
            let k = relativeStart < 0 ?
                Math.max(len + relativeStart, 0) :
                Math.min(relativeStart, len);

            // Steps 9-10.
            const end = arguments[2];
            const relativeEnd = end === undefined ?
                len : end >> 0;

            // Step 11.
            const finalValue = relativeEnd < 0 ?
                Math.max(len + relativeEnd, 0) :
                Math.min(relativeEnd, len);

            // Step 12.
            while (k < finalValue)
            {
                O[k] = value;
                k++;
            }

            // Step 13.
            return O;
        }
    });
}
import "core-js/es/promise";
import "@fortawesome/fontawesome-free/js/all";
import "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/plugins/line-numbers/prism-line-numbers";
import "prismjs/plugins/autolinker/prism-autolinker";
import "prismjs/plugins/command-line/prism-command-line";
import "prismjs/plugins/normalize-whitespace/prism-normalize-whitespace";
import "buefy";

// --- Imports ---
import { default as Guacamole } from "./submodules/IPA-DN-WebNeko/Libraries/guacamole-common-js-1.3.0/guacamole-common";
import { Util } from "./submodules/IPA-DN-WebNeko/Scripts/Common/Base/Util";
import { Str } from "./submodules/IPA-DN-WebNeko/Scripts/Common/Base/Str";
import { GuaComfortableKeyboard, GuaConnectedKeyboard, GuaKeyCodes, GuaUtil } from "./submodules/IPA-DN-WebNeko/Scripts/Misc/GuaUtil/GuaUtil";

export function TestFunc(): void
{
}

export function ThinWebClient_Remote_PageLoad(window: Window, page: Document, webSocketUrl: string, sessionId: string): void
{
    window.onerror = function (msg: any, url?: string, fileno?: number, linenumber?: number): any
    {
        const str = `Error message: ${msg}\nURL: ${url}\nLine Number: ${linenumber}`;

        console.log(str);
        alert(str);
        return true;
    }

    // Get display div from document
    const display = document.getElementById("display")!;

    const tunnel = new Guacamole.WebSocketTunnel(webSocketUrl);

    // @ts-ignore
    tunnel.onerror = function (status: Guacamole.Status): void
    {
        const str = `Tunnel Error Code: ${status.code}, Message: "${status.message}"`;

        console.log(str);
        alert(str);
    };

    // Instantiate client, using a WebSocket tunnel for communications.
    const guac = new Guacamole.Client(tunnel);

    // Add client to display div
    display.appendChild(guac.getDisplay().getElement());

    // Error handler
    // @ts-ignore
    guac.onerror = function (status: Guacamole.Status): void
    {
        const str = `Remote Desktop Error Code: ${status.code}, Message: "${status.message}"`;

        console.log(str);
        alert(str);
    };

    // Connect
    guac.connect(`id=${sessionId}`);

    // Disconnect on close
    window.onunload = function (): void
    {
        guac.disconnect();
    }

    // Mouse
    const mouse = new Guacamole.Mouse(guac.getDisplay().getElement());

    // @ts-ignore
    mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = function (mouseState: Guacamole.Mouse.State): void
    {
        guac.sendMouseState(mouseState);
    };

    // Keyboard
    const keyboard = new Guacamole.Keyboard(document);

    const virtualKeyboard1 = new GuaConnectedKeyboard(guac);
    const virtualKeyboard2 = new GuaComfortableKeyboard(virtualKeyboard1);

    // @ts-ignore
    keyboard.onkeydown = function (keysym: number): void
    {
        //        console.log("Down: " + GuaUtil.KeyCodeToStr(keysym));
        //        if (GuaUtil.KeyCodeToStr(keysym) === "Meta") keysym = GuaKeyCodes.Win[0];
        //        guac.sendKeyEvent(true, keysym);
        virtualKeyboard2.PhysicalKeyPressedAsync(keysym, true);
    };

    // @ts-ignore
    keyboard.onkeyup = function (keysym: number): void
    {
        //console.log("Up: " + GuaUtil.KeyCodeToStr(keysym));
        //if (GuaUtil.KeyCodeToStr(keysym) === "Meta") keysym = GuaKeyCodes.Win[0];
        //guac.sendKeyEvent(false, keysym);
        virtualKeyboard2.PhysicalKeyPressedAsync(keysym, false);

    };
}




