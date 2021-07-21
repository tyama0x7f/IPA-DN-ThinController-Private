using System;
using System.Buffers;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;
using System.Net;
using System.Net.Sockets;

using System.Security.Cryptography.X509Certificates;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;


using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using IPA.Cores.Basic;
using IPA.Cores.Helper.Basic;
using static IPA.Cores.Globals.Basic;

using IPA.Cores.Codes;
using IPA.Cores.Helper.Codes;
using static IPA.Cores.Globals.Codes;

using IPA.Cores.Web;
using IPA.Cores.Helper.Web;
using static IPA.Cores.Globals.Web;

using IPA.App.ThinVars;

// 日本語

namespace IPA.App.ThinWebClientApp
{
    public class Program
    {
        public static int Main(string[] args)
        {
            // ログファイルが何 GB を超えたら自動的に古いものを削除するかの設定
            CoresConfig.Logger.DefaultAutoDeleteTotalMinSize.Value = 1_000_000_000; // 1GB

            // Vars の InitMain を呼び出す
            ThinVarsGlobal.InitMain();
            ThinVarsGlobal.ThinWebClientVarsConfig.InitMain();

            const string appName = "IPA.App.ThinWebClientApp";

            return StandardMainFunctions.DaemonMain.DoMain(
                new CoresLibOptions(CoresMode.Application,
                    appName: appName,
                    defaultDebugMode: DebugMode.Debug,
                    defaultPrintStatToConsole: false,
                    defaultRecordLeakFullStack: false),
                args: args,
                getDaemonProc: () =>
                {
                    HttpServerOptions webServerOptions = new HttpServerOptions
                    {
                        HttpPortsList = 80._SingleList(),
                        HttpsPortsList = 443._SingleList(),
                        UseKestrelWithIPACoreStack = false,
                        DebugKestrelToConsole = false,
                        UseSimpleBasicAuthentication = false,
                        HoldSimpleBasicAuthenticationDatabase = false,
                        AutomaticRedirectToHttpsIfPossible = false,
                        HiveName = "ThinWebClientWebServer",
                        DenyRobots = true,
                        UseGlobalCertVault = true,
                        StartGlobalCertVaultOnHttpServerStartup = true,
                        MaxRequestBodySize = ThinWebClientConsts.ControllerMaxBodySizeForUsers,
                        KestrelMaxConcurrentConnections = ThinWebClientConsts.ControllerMaxConcurrentKestrelConnectionsForUsers,
                        KestrelMaxUpgradedConnections = ThinWebClientConsts.ControllerMaxConcurrentKestrelConnectionsForUsers,
                        IPv4Only = false,
                    };

                    // Vars.cs ファイルで Web サーバーオプションを変更可能とする
                    ThinVarsGlobal.ThinWebClientVarsConfig.InitalizeWebServerConfig(webServerOptions);

                    return new HttpServerDaemon<Startup>(appName, appName, webServerOptions);
                });
        }
    }
}
