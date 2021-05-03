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
import { Secure } from "./submodules/IPA-DN-WebNeko/Scripts/Common/Base/Secure";
import { Task } from "./submodules/IPA-DN-WebNeko/Scripts/Common/Base/Task";
import { Axios, Vue, Buefy, Dialog } from "./submodules/IPA-DN-WebNeko/Scripts/Imports";

// --- Init ---
Vue.use(Buefy);


// メイン画面の PCID のテキストが更新されるなど、状態がアップデートされた
export function Index_UpdateControl(page: Document): void
{
    let ok = false;

    const pcid = page.getElementById("CurrentProfile_Pcid") as HTMLInputElement;
    const button1 = page.getElementById("ok1") as HTMLInputElement;
    const button2 = page.getElementById("ok2") as HTMLInputElement;

    if (Str.IsFilled(pcid.value))
    {
        ok = true;
    }

    button1.disabled = !ok;
    button2.disabled = !ok;
}

// メイン画面の接続履歴候補の選択が変更された
export function Index_OnSelectedHistoryChange(page: Document): void
{
    const dropdown = page.getElementById("SelectedHistory") as HTMLSelectElement;
    const pcid = page.getElementById("CurrentProfile_Pcid") as HTMLInputElement;
    const username = page.getElementById("CurrentProfile_Preference_Username") as HTMLInputElement;
    const password = page.getElementById("CurrentProfile_Preference_Password") as HTMLInputElement;
    const domain = page.getElementById("CurrentProfile_Preference_Domain") as HTMLInputElement;

    if (Str.IsFilled(dropdown.value))
    {
        // 何か選択されている状態に変化した。
        Html.NativateTo(dropdown.value);
    }
    else
    {
        // 何も選択されてていない状態になった。コンピュータ ID 入力 BOX をクリアしてフォーカスを移動する。
        username.value = "";
        password.value = "";
        domain.value = "";
        pcid.value = "";
        pcid.focus();
    }

    Index_UpdateControl(page);
}

// メイン画面がロードされた
export function Index_Load(page: Document, focusPcid: boolean, passwordEasyStrEncrypted: string): void
{
    const password = page.getElementById("CurrentProfile_Preference_Password") as HTMLInputElement;
    const pcid = page.getElementById("CurrentProfile_Pcid") as HTMLInputElement;

    if (focusPcid)
    {
        Html.FocusEx(pcid);
    }

    // 画面のパスワード入力テキストボックスのパスワードを入力する
    const passwordStr = Secure.JavaScriptEasyStrDecrypt(passwordEasyStrEncrypted, "easyEncryptStaticKey");

    password.value = passwordStr;

    Index_UpdateControl(page);
}

// パスワード認証画面がロードされた
export function SessionAuthPassword_Load(page: Document): void
{
    const pcid = page.getElementById("Profile_Pcid") as HTMLInputElement;
    const password = page.getElementById("password") as HTMLInputElement;

    // PCID 入力欄を読み取り専用にする
    pcid.readOnly = true;

    // パスワード入力欄をフォーカスする
    password.focus();
}

// 接続履歴の消去ボタンがクリックされた
export function Index_DeleteAllHistory(page: Document): void
{
    Task.StartAsyncTaskAsync(async function () 
    {
        if (await Html.DialogConfirmAsync("接続履歴をすべて消去しますか?", "接続履歴の消去", false, "is-primary", undefined, false, "はい", "いいえ"))
        {
            Html.NativateTo("/?deleteall=1");
        }
    }, false);
}

// 1 秒に 1 回 KeepAlive URL を呼び出す
async function SendHeartBeatAsync(url: string): Promise<void>
{
    while (true)
    {
        try
        {
            const response = await Axios.get(url, { timeout: 1000 });
        }
        catch (ex)
        {
            Util.Debug("Error get " + ex);
        }

        await Task.Delay(1000);
    }
}

// 1 秒に 1 回 KeepAlive URL を呼び出す処理を開始する
export function Common_StartSendHeartBeat(sessionId: string, requestId: string): void
{
    sessionId = Str.NonNullTrim(sessionId);
    requestId = Str.NonNullTrim(requestId);

    const url = `/ThinWebClient/SendHeartBeat/?sessionId=${sessionId}&requestId=${requestId}`;
    Task.StartAsyncTaskAsync(SendHeartBeatAsync(url));
}

// 1 秒に 1 回 HealthCheck URL を呼び出し、セッションが終了していることを検出したらメッセージを出して終了する
async function SessionHealthCheckAsync(url: string, pcid?: string): Promise<void>
{
    while (true)
    {
        try
        {
            const response = await Axios.get(url, { timeout: 1000 });
            const str = response.data as string;
            Util.Debug(str);
            if (!Str.ToBool(str))
            {
                // セッション消滅のエラー等が発生した模様である
                await Html.DialogAlertAsync("リモート セッションが終了しました。再接続を試行するには、トップページから再接続を行なってください。", "セッションが終了しました", true, "is-success", "fas fa-info-circle");

                let gotoUrl = "/";
                if (Str.IsFilled(pcid))
                {
                    gotoUrl += "?id=" + Str.EncodeUrl(pcid?.trim());
                }
                Html.NativateTo(gotoUrl);
            }
        }
        catch (ex)
        {
            // 通信エラーは無視する
            Util.Debug("Error get " + ex);
        }

        await Task.Delay(1000);
    }
}

// 1 秒に 1 回 HealthCheck URL を呼び出す処理を開始する
export function Remote_StartSessionHealthCheck(sessionId: string, pcid?: string): void
{
    sessionId = Str.NonNullTrim(sessionId);

    const url = `/ThinWebClient/SessionHealthCheck/?sessionId=${sessionId}`;
    Task.StartAsyncTaskAsync(SessionHealthCheckAsync(url, pcid));
}

export function Common_ErrorAlert(page: Document, errorMessage: string, pcid?: string): void
{
    if (Str.IsEmpty(errorMessage))
    {
        errorMessage = "不明なエラーが発生しました。";
    }

    Task.StartAsyncTaskAsync(async function () 
    {
        await Html.DialogAlertAsync(errorMessage, "エラーが発生しました", true, "is-danger", "fas fa-exclamation-triangle");

        let url = "/";
        if (Str.IsFilled(pcid))
        {
            url += "?id=" + Str.EncodeUrl(pcid?.trim());
        }
        Html.NativateTo(url);
    }, false);
}

export function ThinWebClient_Remote_PageLoad(window: Window, page: Document, webSocketUrl: string, sessionId: string, pcid: string): void
{
    pcid = Str.JavaScriptSafeStrDecode(pcid);

    Remote_StartSessionHealthCheck(sessionId, pcid);

    window.onerror = function (msg: any, url?: string, fileno?: number, linenumber?: number): any
    {
        const str = `Error message: ${msg}\nURL: ${url}\nLine Number: ${linenumber}`;

        console.log(str);
        Common_ErrorAlert(page, str, pcid);
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
        Common_ErrorAlert(page, str, pcid);
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
        Common_ErrorAlert(page, str, pcid);
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




