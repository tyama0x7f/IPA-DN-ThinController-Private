// --- CSS ---
require("./Main.scss");

// --- Polyfill ---
require("./submodules/IPA-DN-WebNeko/Scripts/Polyfill/polyfill.ts");

// --- HTML parts ---
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
import { Html } from "./submodules/IPA-DN-WebNeko/Scripts/Common/Base/Html";
import { C1 } from "./submodules/IPA-DN-WebNeko/Scripts/Imports";


// メイン画面の接続履歴候補の選択が変更された
export function Index_OnSelectedHistoryChange(page: Document): void
{
    const dropdown = page.getElementById("SelectedHistory") as HTMLSelectElement;
    const pcid = page.getElementById("CurrentProfile_Pcid") as HTMLInputElement;

    if (Str.IsFilled(dropdown.value))
    {
        // 何か選択されている状態に変化した。
        Html.NativateTo(dropdown.value);
    }
    else
    {
        // 何も選択されてていない状態になった。コンピュータ ID 入力 BOX をクリアしてフォーカスを移動する。
        pcid.value = "";
        pcid.focus();
    }
}

// メイン画面がロードされた
export function Index_Load(page: Document, focusPcid: boolean): void
{
    const pcid = page.getElementById("CurrentProfile_Pcid") as HTMLInputElement;

    if (focusPcid)
    {
        Html.FocusEx(pcid);
    }

    const res = C1.SHA1("hello");
    
    Util.Debug(res.toString());
}

// 接続履歴の消去が選択された
export function Index_DeleteAllHistory(page: Document): void
{
    Html.NativateTo("/?deleteall=1");
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
    const display = page.getElementById("display")!;

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
    const keyboard = new Guacamole.Keyboard(page);

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




