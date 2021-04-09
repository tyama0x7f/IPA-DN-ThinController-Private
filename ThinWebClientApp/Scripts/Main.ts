require("./Main.scss");

// HTML Basics
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

// WebNeko
import { TestClass } from "./submodules/IPA-DN-WebNeko/Scripts/WebNeko";

// Guacamole Library
import { default as Guacamole } from "guacamole-common-js";


export function TestFunc(): void
{
    console.log("TestFunc");
}

export function ThinWebClient_Remote_PageLoad(window: Window, page: Document, webSocketUrl: string, sessionId: string): void
{
    window.onerror = function (msg, url, linenumber): boolean
    {
        const str = `Error message: ${msg}\nURL: ${url}\nLine Number: ${linenumber}`;

        console.log(str);
        alert(str);
        return true;
    }

    // Get display div from document
    const display = document.getElementById("display")!;

    const tunnel = new Guacamole.WebSocketTunnel(webSocketUrl);

    tunnel.onerror = function (status: any): void
    {
        const str = `Tunnel Error Code: ${status.code}`;

        console.log(str);
        alert(str);
    };

    // Instantiate client, using a WebSocket tunnel for communications.
    const guac = new Guacamole.Client(tunnel);

    // Add client to display div
    display.appendChild(guac.getDisplay().getElement());

    // Error handler
    guac.onerror = function (status: any): void
    {
        const str = `Remote Desktop Error Code: ${status.code}`;

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

    mouse.onmousedown =
        mouse.onmouseup =
        mouse.onmousemove = function (mouseState: any): void
        {
            guac.sendMouseState(mouseState);
        };

    // Keyboard
    const keyboard = new Guacamole.Keyboard(document);

    keyboard.onkeydown = function (keysym: any): void
    {
        //console.log("Down: " + DN.toHex(keysym));
        if (keysym === 65511) keysym = 65515;
        guac.sendKeyEvent(1, keysym);
    };

    keyboard.onkeyup = function (keysym: any): void
    {
        //console.log("Up: " + DN.toHex(keysym));
        if (keysym === 65511) keysym = 65515;
        guac.sendKeyEvent(0, keysym);
    };
}




