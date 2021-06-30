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
import { GuaComfortableKeyboard, GuaConnectedKeyboard, GuaKeyCodes, GuaUtil, GuaStates, GuaConsts, GuaResizeManager } from "./submodules/IPA-DN-WebNeko/Scripts/Misc/GuaUtil/GuaUtil";
import { Html } from "./submodules/IPA-DN-WebNeko/Scripts/Common/Base/Html";
import { Secure } from "./submodules/IPA-DN-WebNeko/Scripts/Common/Base/Secure";
import { Task } from "./submodules/IPA-DN-WebNeko/Scripts/Common/Base/Task";
import { Axios, Vue, Buefy } from "./submodules/IPA-DN-WebNeko/Scripts/Imports";

// --- Common Init ---
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

    const screenWidth = page.getElementById("CurrentProfile_Preference_ScreenWidth") as HTMLInputElement;
    const screenHeight = page.getElementById("CurrentProfile_Preference_ScreenHeight") as HTMLInputElement;
    const screenAutoCheckBox = page.getElementById("ScreenGetAutoSize") as HTMLInputElement;

    const currentScreenSize = Html.GetFullScreenSize();

    if (screenAutoCheckBox.checked)
    {
        screenWidth.value = currentScreenSize[0].toString();
        screenHeight.value = currentScreenSize[1].toString();

        screenWidth.readOnly = true;
        screenHeight.readOnly = true;

        screenWidth.style.backgroundColor = "whitesmoke";
        screenHeight.style.backgroundColor = "whitesmoke";
    }
    else
    {
        screenWidth.readOnly = false;
        screenHeight.readOnly = false;

        screenWidth.style.backgroundColor = "white";
        screenHeight.style.backgroundColor = "white";
    }
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
    pcid.style.backgroundColor = "whitesmoke";

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

            if (!Str.ToBool(str))
            {
                // セッション消滅のエラー等が発生した模様である
                await Remote_ShowDisconnectErrorAsync(pcid);

                // もうループは抜けます！ ずるっこ！！
                break;
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

let Remote_ErrorShowOnceFlag = false;

// セッションが終了した旨のエラーメッセージを表示する (1 回しか表示されない)
async function Remote_ShowDisconnectErrorAsync(pcid?: string): Promise<void>
{
    // 1 回しかエラーが表示されないようにする
    if (Remote_ErrorShowOnceFlag)
    {
        return;
    }

    Remote_ErrorShowOnceFlag = true;

    await Html.DialogAlertAsync("リモート セッションが終了しました。再接続を試行するには、トップページから再接続を行なってください。", "お疲れ様でした", true, "is-success", "fas fa-info-circle");

    let gotoUrl = "/";
    if (Str.IsFilled(pcid))
    {
        gotoUrl += "?id=" + Str.EncodeUrl(pcid?.trim());
    }
    Html.NativateTo(gotoUrl);
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
    // 1 回しかエラーが表示されないようにする
    if (Remote_ErrorShowOnceFlag)
    {
        return;
    }

    Remote_ErrorShowOnceFlag = true;

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

let Remote_ShowImeWarningFlag = false;

export async function Remote_ShowImeWarningAsync(): Promise<void>
{
    if (Remote_ErrorShowOnceFlag)
    {
        // 何かエラーが発生しておる
        return;
    }

    if (Remote_ShowImeWarningFlag)
    {
        return;
    }

    Remote_ShowImeWarningFlag = true;

    try
    {
        await Html.DialogAlertAsync("<b>ローカル コンピュータ側の IME 日本語入力が ON になっています。</b><br>ローカル コンピュータ側の IME を OFF にしてください。<BR><BR>リモート コンピュータ側で IME を ON にするキー操作については、<a href=\"/keyboard/\" target=\"_blank\"><b>「キーボード操作の解説」</b></a>を参照してください。", "IME 日本語入力について", true, "is-info", "far fa-keyboard");
    }
    finally
    {
        Remote_ShowImeWarningFlag = false;
    }
}


export function ThinWebClient_Remote_PageLoad(window: Window, page: Document, webSocketUrl: string, sessionId: string, pcid: string, svcType: string, jsonEncrypted: string, connectPacketData: string): void
{
    const profile = Util.JsonToObject(Secure.JavaScriptEasyStrDecrypt(jsonEncrypted, "easyJsonEncode"));
    const pref = profile.Preference;
    const isDebug = pref.EnableDebug as boolean;
    const display = page.getElementById("display")!;

    if (pref.ScreenAutoResize)
    {
        // 自動リサイズが有効の場合、初期ウインドウサイズを現在のウインドウサイズで上書きする
        let width = Math.min(Math.max(window.innerWidth, GuaConsts.MinWidth), GuaConsts.MaxWidth);
        let height = Math.min(Math.max(window.innerHeight, GuaConsts.MinHeight), GuaConsts.MaxHeight);

        // ただし自動フルスクリーンが ON の場合は、フルスクリーンサイズで上書きする
        if (pref.ScreenAutoFullScreen)
        {
            const fullScreenSize = Html.GetFullScreenSize();
            width = fullScreenSize[0];
            height = fullScreenSize[1];
        }

        pref.ScreenWidth = width;
        pref.ScreenHeight = height;
    }

    if (!pref.ShowLocalMouseCursor)
    {
        display.style.cursor = "none";
    }

    display.style.width = pref.ScreenWidth + "px";
    display.style.height = pref.ScreenHeight + "px";

    pcid = Str.JavaScriptSafeStrDecode(pcid);
    connectPacketData = Str.JavaScriptSafeStrDecode(connectPacketData);

    if (isDebug)
    {
        Util.Debug(`ThinWebClient_Remote_PageLoad: webSocketUrl = ${webSocketUrl}`);
        Util.Debug(`ThinWebClient_Remote_PageLoad: sessionId = ${sessionId}`);
        Util.Debug(`ThinWebClient_Remote_PageLoad: pcid = ${pcid}`);
        Util.Debug(`ThinWebClient_Remote_PageLoad: svcType = ${svcType}`);
        Util.Debug(`ThinWebClient_Remote_PageLoad: connectPacketData = ${connectPacketData}`);
        Util.Debug(`ThinWebClient_Remote_PageLoad: profile = ${Util.ObjectToJson(profile)}`);
    }
    
    if (Str.IsEmpty(connectPacketData))
    {
        // セッションヘルスチェックは WebSocket で ThinGate と直接対話するモードの場合は行なわない (ThinWebClient 的にはすでに何も状態を持っていないため)
        Remote_StartSessionHealthCheck(sessionId, pcid);
    }

    window.onerror = function (msg: any, url?: string, fileno?: number, linenumber?: number): any
    {
        const str = `Error message: ${msg}\nURL: ${url}\nLine Number: ${linenumber}`;

        if (isDebug) Util.Debug(str);
        Common_ErrorAlert(page, str, pcid);
        return true;
    }

    const tunnel = new Guacamole.WebSocketTunnel(webSocketUrl);

    // @ts-ignore
    tunnel.firstPacketData = connectPacketData;

    // @ts-ignore
    tunnel.onerror = function (status: Guacamole.Status): void
    {
        const str = `Tunnel Error Code: ${status.code}, Message: "${status.message}"`;

        if (isDebug) Util.Debug(str);
        Common_ErrorAlert(page, str, pcid);
    };

    // Instantiate client, using a WebSocket tunnel for communications.
    const guac = new Guacamole.Client(tunnel);

    const guacDisplay = guac.getDisplay();

    // Add client to display div
    display.appendChild(guacDisplay.getElement());

    // Error handler
    // @ts-ignore
    guac.onerror = function (status: Guacamole.Status): void
    {
        const code = status.code;
        let msg = status.message;

        if (Str.InStr(msg, "See logs.", false))
        {
            msg = "Remote desktop connection aborted. This error can be caused by frequent screen resizing or by a large number of screen drawing instructions. Please kindly reconnect to the server."
        }

        const str = `Remote Desktop Error Code: ${code}, Message: "${msg}"`;

        if (isDebug) Util.Debug(str);
        Common_ErrorAlert(page, str, pcid);
    };

    // @ts-ignore
    guac.onstatechange = function (state: GuaStates): void
    {
        if (isDebug)
        {
            Util.Debug(`guac.onstatechange: ${state}`);
        }

        if (state === GuaStates.STATE_DISCONNECTED || state === GuaStates.STATE_DISCONNECTING)
        {
            // 切断メッセージを表示
            Remote_ShowDisconnectErrorAsync(pcid);
        }
    };

    // Connect
    guac.connect(`id=${sessionId}&width=${pref.ScreenWidth}&height=${pref.ScreenHeight}`);

    // Disconnect on close
    window.onunload = function (): void
    {
        guac.disconnect();
    }

    // Mouse
    const mouse = new Guacamole.Mouse(guacDisplay.getElement());

    // @ts-ignore
    mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = function (mouseState: Guacamole.Mouse.State): void
    {
        //Util.Debug(mouseState);
        const scale = guacDisplay.getScale();

        // Scale event by current scale
        const scaledState = new Guacamole.Mouse.State(
            mouseState.x / scale,
            mouseState.y / scale,
            mouseState.left,
            mouseState.middle,
            mouseState.right,
            mouseState.up,
            mouseState.down,
            // @ts-ignore
            mouseState.forward,
            // @ts-ignore
            mouseState.back);

        guac.sendMouseState(scaledState);
    };

    // Keyboard
    const keyboard = new Guacamole.Keyboard(page);

    const virtualKeyboard1 = new GuaConnectedKeyboard(guac, profile, svcType);
    const virtualKeyboard2 = new GuaComfortableKeyboard(virtualKeyboard1, profile, svcType);

    // @ts-ignore
    keyboard.onkeydown = function (keysym: number): void
    {
        virtualKeyboard2.PhysicalKeyPressedAsync(keysym, true);
    };

    // @ts-ignore
    keyboard.onkeyup = function (keysym: number): void
    {
        virtualKeyboard2.PhysicalKeyPressedAsync(keysym, false);
    };

    if (pref.ScreenAutoResize)
    {
        // 自動リサイズが有効の場合、スクロールバーは表示しない
        page.documentElement.style.overflowX = "hidden";
        page.documentElement.style.overflowY = "hidden";

        // @ts-ignore
        guacDisplay.onresize = function (): void
        {
            // サーバーに接続した時点と、ユーザー側またはサーバー側が原因で画面サイズが変化した時点で呼ばれる
            const serverWidth = guacDisplay.getWidth();
            const serverHeight = guacDisplay.getHeight();

            // ユーザー指定のウインドウサイズを確認する
            const clientWidth = Math.min(Math.max(window.innerWidth, GuaConsts.MinWidth), GuaConsts.MaxWidth);
            const clientHeight = Math.min(Math.max(window.innerHeight, GuaConsts.MinHeight), GuaConsts.MaxHeight);

            // 適切な拡大縮小倍率を計算する
            const scale = Math.min(clientWidth / Math.max(serverWidth, 1), clientHeight / Math.max(serverHeight, 1));

            guacDisplay.scale(scale);

            // 中央配置する
            const childDiv = display.getElementsByTagName("div")[0];

            const divWidth = childDiv.clientWidth;
            const divHeight = childDiv.clientHeight;

            const divLeft = Math.max((clientWidth - divWidth) / 2, 0);
            const divTop = Math.max((clientHeight - divHeight) / 2, 0);

            childDiv.style.left = divLeft + "px";
            childDiv.style.top = divTop + "px";

            if (isDebug)
            {
                //                Util.Debug(`guacDisplay.onresize ${serverWidth} ${serverHeight}`);
                //                Util.Debug(`New scale = ${minScale}`);
            }

            // スクロールバー表示判断ルーチン
            scrollBarUpdateProc();
        };

        const resizeManager = new GuaResizeManager(guac, window.innerWidth, window.innerHeight);

        // ユーザーがウインドウサイズを変更した
        window.onresize = function (ev: UIEvent): any
        {
            const clientWidth = Math.min(Math.max(window.innerWidth, GuaConsts.MinWidth), GuaConsts.MaxWidth);
            const clientHeight = Math.min(Math.max(window.innerHeight, GuaConsts.MinHeight), GuaConsts.MaxHeight);

            display.style.width = clientWidth + "px";
            display.style.height = clientHeight + "px";

            // サーバーにサイズ変更を依頼する
            resizeManager.Resize(clientWidth, clientHeight);

            // @ts-ignore
            guacDisplay.onresize(); // 倍率の自動適用

            // スクロールバー表示判断ルーチン
            scrollBarUpdateProc();
        }
    }
    else
    {
        // 自動リサイズが無効の場合

        // @ts-ignore
        guacDisplay.onresize = function (): void
        {
            // サーバーに接続した時点と、サーバー側が原因で画面サイズが変化した時点で呼ばれる
            const serverWidth = guacDisplay.getWidth();
            const serverHeight = guacDisplay.getHeight();

            // 自動リサイズが無効の場合、初期ウインドウサイズを現在のリモートサイズで上書きする
            const width = Math.min(Math.max(serverWidth, GuaConsts.MinWidth), GuaConsts.MaxWidth);
            const height = Math.min(Math.max(serverHeight, GuaConsts.MinHeight), GuaConsts.MaxHeight);

            display.style.width = width + "px";
            display.style.height = height + "px";

            scrollBarUpdateProc();
        };

        // ユーザーがウインドウサイズを変更した
        window.onresize = function (ev: UIEvent): any
        {
            // スクロールバー表示判断ルーチン
            scrollBarUpdateProc();
        }
    }

    if (!pref.ShowRemoteMouseCursor)
    {
        guacDisplay.showCursor(false);
    }

    // オートリサイズ無効化時におけるスクロールバー表示判断ルーチン
    const scrollBarUpdateProc = (): void =>
    {
        const childDiv = display.getElementsByTagName("div")[0];

        const divWidth = childDiv.clientWidth;
        const divHeight = childDiv.clientHeight;

        const clientWidth = window.innerWidth;
        const clientHeight = window.innerHeight;

        page.documentElement.style.overflowX = divWidth > clientWidth ? "auto" : "hidden";
        page.documentElement.style.overflowY = divHeight > clientHeight ? "auto" : "hidden";
    };

    const fullScreenChangeProc = (): void =>
    {
        const isFullScreen = document.fullscreenElement ? true : false;

        // スクロールバーを表示するかどうかの判断ルーチン
        scrollBarUpdateProc();
    };

    // フルスクリーン設定 / 解除が発生したときのイベント
    document.addEventListener("fullscreenchange", event =>
    {
        fullScreenChangeProc();
    });

    let autoFullScreenInitiated = false;

    document.addEventListener("keydown", event =>
    {
        let showError = false;
        if (event.key.length >= 1)
        {
            const char = event.key[0];
            if (char >= 'ｱ' && char <= 'ﾝ')
            {
                // Chrome で、ローカルの IME が有効にされておるぞ
                Remote_ShowImeWarningAsync();
                showError = true;
            }
        }

        if (!showError)
        {
            if (pref.ScreenAutoFullScreen)  // 自動フルスクリーン
            {
                if (!autoFullScreenInitiated)
                {
                    autoFullScreenInitiated = true;

                    // フルスクリーンになっていなければ、フルスクリーンにする
                    Task.StartAsyncTaskAsync(async () =>
                    {
                        if (Html.IsFullScreenSupported())
                        {
                            if (page.fullscreenElement === null)
                            {
                                await page.body.requestFullscreen();
                            }
                        }
                    });
                }
            }
        }
    });

    fullScreenChangeProc();
}




