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

using static IPA.App.ThinControllerApp.AppGlobal;

// 日本語

namespace IPA.App.ThinControllerApp
{
    // 内部ヘルパー
    public static class _AppLibHelper
    {
        public static readonly string AppThisSourceCodeFileName = Dbg.GetCallerSourceCodeFilePath();
    }

    // 内部ヘルパー
    public static partial class AppGlobal
    {
        public static ResourceFileSystem AppRes => Res.Codes;

        public static partial class Res
        {
            public static readonly ResourceFileSystem Codes = ResourceFileSystem.CreateOrGet(
                new AssemblyWithSourceInfo(typeof(Res), new SourceCodePathAndMarkerFileName(_AppLibHelper.AppThisSourceCodeFileName, "app_resource_root")));
        }
    }

    // 証明書データを保持するクラス
    public static partial class AppCerts
    {
        // マスター証明書
        static readonly Singleton<PalX509Certificate> MasterCert_Singleton = new Singleton<PalX509Certificate>(() => new PalX509Certificate(new FilePath(AppRes, "Settings/00_Master.cer")));
        public static PalX509Certificate MasterCert => MasterCert_Singleton;

        // コントローラ証明書
        static readonly Singleton<PalX509Certificate> ControllerCert_Singleton = new Singleton<PalX509Certificate>(() => new PalX509Certificate(new FilePath(AppRes, "Settings/02_Controller.pfx")));
        public static PalX509Certificate ControllerCert => ControllerCert_Singleton;
    }

    public class Program
    {
        public static int Main(string[] args)
        {
            // ログファイルが何 GB を超えたら自動的に古いものを削除するかの設定
            CoresConfig.Logger.DefaultAutoDeleteTotalMinSize.Value = 4_000_000_000; // 4GB

            CoresConfig.HttpServerSimpleBasicAuthDatabaseConfig.InitAuthDatabaseUsernameAndPasswordCallback.Set(db =>
            {
                db.UsernameAndPassword.Add(ThinControllerConsts.ControllerDefaultAdminUsername, ThinControllerConsts.ControllerDefaultAdminPassword);
            });

            const string appName = "IPA.App.ThinControllerApp";

            return StandardMainFunctions.DaemonMain.DoMain(
                new CoresLibOptions(CoresMode.Application,
                    appName: appName,
                    defaultDebugMode: DebugMode.Debug,
                    defaultPrintStatToConsole: false,
                    defaultRecordLeakFullStack: false),
                args: args,
                getDaemonProc: () => new HttpServerDualDaemon<Startup>(appName, appName, new HttpServerOptions
                {
                    HttpPortsList = 80._SingleList(),
                    HttpsPortsList = 443._SingleList(),
                    UseKestrelWithIPACoreStack = false,
                    DebugKestrelToConsole = false,
                    UseSimpleBasicAuthentication = false,
                    HoldSimpleBasicAuthenticationDatabase = true,
                    AutomaticRedirectToHttpsIfPossible = false,
                    HiveName = "ThinControllerApiServerForUsers",
                    DenyRobots = true,
                    UseGlobalCertVault = false,
                    ServerCertSelector = (cert, sni) => (X509Certificate2)AppCerts.ControllerCert.NativeCertificate,
                    StringOptions = new string[] { ThinControllerServiceType.ApiServiceForUsers.ToString() }.ToList(),
                    MaxRequestBodySize = ThinControllerConsts.ControllerMaxBodySizeForUsers,
                    KestrelMaxConcurrentConnections = ThinControllerConsts.ControllerMaxConcurrentKestrelConnectionsForUsers,
                    KestrelMaxUpgradedConnections = ThinControllerConsts.ControllerMaxConcurrentKestrelConnectionsForUsers,
                    IPv4Only = true,
                },
                new HttpServerOptions
                {
                    HttpPortsList = 88._SingleList(),
                    HttpsPortsList = 8443._SingleList(),
                    UseKestrelWithIPACoreStack = false,
                    DebugKestrelToConsole = false,
                    UseSimpleBasicAuthentication = false,
                    HoldSimpleBasicAuthenticationDatabase = true,
                    AutomaticRedirectToHttpsIfPossible = false,
                    HiveName = "ThinControllerApiServerForGateway",
                    DenyRobots = true,
                    UseGlobalCertVault = false,
                    ServerCertSelector = (cert, sni) => (X509Certificate2)AppCerts.ControllerCert.NativeCertificate,
                    StringOptions = new string[] { ThinControllerServiceType.ApiServiceForGateway.ToString() }.ToList(),
                    MaxRequestBodySize = ThinControllerConsts.ControllerMaxBodySizeForGateway,
                    IPv4Only = true,
                }
                ));
        }
    }
}
