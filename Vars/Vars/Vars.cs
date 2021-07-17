// Thin Telework System Source Code
// 
// License: The Apache License, Version 2.0
// https://www.apache.org/licenses/LICENSE-2.0
// 
// Copyright (c) IPA CyberLab of Industrial Cyber Security Center.
// Copyright (c) Daiyuu Nobori.
// Copyright (c) SoftEther VPN Project, University of Tsukuba, Japan.
// Copyright (c) SoftEther Corporation.
// Copyright (c) all contributors on IPA-DN-Ultra Library and SoftEther VPN Project in GitHub.
// 
// All Rights Reserved.

// この Vars.cs ファイルは、シン・テレワークシステムを設置するユーザー側で書き換えて動作をカスタマイズするためのファイルです。

#pragma warning disable CA2235 // Mark all non-serializable fields

using System;
using System.Buffers;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Collections.Immutable;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using System.Runtime.CompilerServices;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;
using System.Security.Authentication;
using Microsoft.AspNetCore.Server.Kestrel.Https;

using IPA.Cores.Basic;
using IPA.Cores.Helper.Basic;
using static IPA.Cores.Globals.Basic;

using IPA.Cores.Web;
using IPA.Cores.Helper.Web;
using static IPA.Cores.Globals.Web;

using IPA.Cores.Codes;
using IPA.Cores.Helper.Codes;
using static IPA.Cores.Globals.Codes;

namespace IPA.App.ThinVars
{
    public static partial class ThinVarsGlobal
    {
        // 初期化
        public static void InitMain()
        {
            // 許容する TLS のバージョンを設定するには、以下の行をコメントアウトして設定を変更すること。
            //CoresConfig.SslSettings.DefaultSslProtocolVersionsAsClient.TrySet(SslProtocols.Tls | SslProtocols.Tls11 | SslProtocols.Tls12 | SslProtocols.Tls13);
            //CoresConfig.SslSettings.DefaultSslProtocolVersionsAsServer.TrySet(SslProtocols.Tls | SslProtocols.Tls11 | SslProtocols.Tls12 | SslProtocols.Tls13);
        }

        // 証明書データを保持するクラス
        public static partial class Certs
        {
            // マスター証明書 (X.509 PEM 形式)
            // このサンプルコードでは、ソースコードツリー中の
            // Vars/VarResources/VarResources/ThinControllerCerts/00_Master.cer
            // ファイルをマスター証明書として取り扱っています。
            // マスター証明書の置換は、以下のファイル名を変更するか、または、上記のファイルに使用したい証明書データファイルを上書きすることで可能です。
            static readonly Singleton<PalX509Certificate> MasterCert_Singleton = new Singleton<PalX509Certificate>(() => new PalX509Certificate(new FilePath(AppGlobal.AppRes, "ThinControllerCerts/00_Master.cer")));
            public static PalX509Certificate MasterCert => MasterCert_Singleton;

            // コントローラの HTTPS サーバー証明書と秘密鍵 (PKCS#12 形式)
            // このサンプルコードでは、ソースコードツリー中の
            // Vars/VarResources/VarResources/ThinControllerCerts/02_Controller.pfx
            // ファイルをコントローラの HTTPS サーバー証明書と秘密鍵として取り扱っています。
            // コントローラの HTTPS サーバー証明書と秘密鍵の置換は、以下のファイル名を変更するか、または、上記のファイルに使用したい証明書データファイルを上書きすることで可能です。
            static readonly Singleton<PalX509Certificate> ControllerCert_Singleton = new Singleton<PalX509Certificate>(() => new PalX509Certificate(new FilePath(AppGlobal.AppRes, "ThinControllerCerts/02_Controller.pfx")));
            public static PalX509Certificate ControllerCert => ControllerCert_Singleton;

            // HTML5 クライアント証明書認証 ルート CA 証明書 (X.509 PEM 形式)
            // このサンプルコードでは、ソースコードツリー中の
            // Vars/VarResources/VarResources/ThinWebClient_ClientCertAuth_SampleCerts/01_thin_html5_cert_auth_sample_root_ca.cer
            // ファイルを HTML5 クライアント証明書認証 ルート CA 証明書として取り扱っています。
            // HTML5 クライアント証明書認証 ルート CA 証明書の置換は、以下のファイル名を変更するか、または、上記のファイルに使用したい証明書データファイルを上書きすることで可能です。
            static readonly Singleton<PalX509Certificate> Html5ClientCertAuth_RootCaCert_Singleton = new Singleton<PalX509Certificate>(() => new PalX509Certificate(new FilePath(AppGlobal.AppRes, "ThinWebClient_ClientCertAuth_SampleCerts/01_thin_html5_cert_auth_sample_root_ca.cer")));
            public static PalX509Certificate Html5ClientCertAuth_RootCaCert => Html5ClientCertAuth_RootCaCert_Singleton;
        }

        // コントローラ固有の設定クラス
        public static partial class ThinControllerVarsConfig
        {
            public static void InitMain()
            {
            }
        }

        // HTML5 版 Web クライアントアプリ固有の設定クラス
        public static partial class ThinWebClientVarsConfig
        {
            // 全体的な動作設定
            public static void InitMain()
            {
                // 中継ゲートウェイと同一のプロトコル透かし (バイナリデータ) を変更したい場合は、
                // 「ThinWebClient_ProtocolWatermark/ThinWebClient_ProtocolWatermark.txt」 ファイルの内容を変更するか、または、別のファイルを以下の行で参照すること。
                // 詳しくは、「Vars/VarResources/VarResources/ThinWebClient_ProtocolWatermark/README.txt」ファイルの説明を参照すること。
                CoresConfig.WtcConfig.DefaultWaterMark.TrySet(Str.CHexArrayToBinary(AppGlobal.AppRes["ThinWebClient_ProtocolWatermark/ThinWebClient_ProtocolWatermark.txt"].String));
            }

            // Web サーバーの設定
            public static void InitalizeWebServerConfig(HttpServerOptions opt)
            {
                // false にすると robots.txt ファイルを設置しなくなります。
                opt.DenyRobots = true;

                // true にすると HTTP ポートへのアクセス時に自動的に HTTPS ポートにリダイレクトするようになります。
                // 適切な SSL サーバー証明書が利用されていない場合、Web ブラウザで証明書エラーが発生します。
                opt.AutomaticRedirectToHttpsIfPossible = false;

                // 「NoCertificate」を「RequireCertificate」に変更することにより、クライアント証明書認証を強制します。
                opt.ClientCertficateMode = ClientCertificateMode.RequireCertificate;

                // クライアント証明書認証を行なう場合は、クライアントが提示した証明書が受け入れ可能かどうかを検証する任意の判定式を以下に記述します。
                if (opt.ClientCertficateMode == ClientCertificateMode.RequireCertificate)
                {
                    // 以下のサンプルコードでは、
                    opt.ClientCertificateValidator = (cert, chain, err) =>
                    {
                        var clientCertObject = cert.AsPkiCertificate();

                        if (clientCertObject.CheckIfSignedByAnyOfParentCertificatesListOrExactlyMatch(
                            new Certificate[] {
                                Certs.Html5ClientCertAuth_RootCaCert,
                            },
                            out bool exactlyMatchToRootCa) == false)
                        {
                            throw new CoresLibException($"The client SSL certificate '{clientCertObject}' is not trusted by any of root CA certificates.");
                        }
                        else if (exactlyMatchToRootCa == false)
                        {
                            if (cert.AsPkiCertificate().IsExpired())
                            {
                                throw new CoresLibException($"The client SSL certificate '{clientCertObject}' is expired or not valid. NotBefore = '{clientCertObject.NotBefore._ToDtStr()}', NotAfter = '{clientCertObject.NotAfter._ToDtStr()}'");
                            }
                        }

                        return true;
                    };
                }
            }
        }
    }

#if CORES_CODES_THINCONTROLLER
    // シンテレワークシステム コントローラの動作をカスタマイズするためのクラスです。
    public class MyThinControllerHook : ThinControllerHookBase
    {
        // OTP メールを送信する処理をカスタマイズするには、以下のメソッドの内容を書き換えてください。
        public override async Task<bool> SendOtpEmailAsync(ThinController controller, string otp, string emailTo, string emailFrom, string clientIp, string clientFqdn, string pcidMasked, string pcid,
            ThinControllerOtpServerSettings serverSettings, CancellationToken cancel = default)
        {
            if (serverSettings.AwsSnsRegionEndPointName._IsEmpty() || Str.IsPhoneNumber(emailTo) == false) // 宛先が電話番号以外 または AWS SNS アカウント情報未設定の場合
            {
                // 通常メール
                string subject = string.Format("ワンタイムパスワード (OTP): {0}  (サーバー: '{1}')", otp, pcidMasked);

                string body = string.Format("OTP: {0}\r\n\r\n「シン・テレワークシステム サーバー」にログイン要求が\r\nありましたので、予め設定されている本メールアドレスに上記の OTP\r\n(ワンタイムパスワード) をご通知いたします。\r\n\r\n[参考情報]\r\nアクセス日時: {1}\r\nアクセス先コンピュータ ID: '{2}'  (一部を伏せ字としている場合があります)\r\nアクセス元 IP アドレス: {3}\r\nアクセス元ホスト名: {4}\r\n\r\n\r\nこのメールには返信できません。\r\n\r\nメールアドレスを登録した覚えがない場合は、あなたのメールアドレスを\r\n第三者が誤って「シン・テレワークシステム サーバー」の OTP 送付先\r\nとして登録している可能性があります。その場合、本メールに応答する\r\n必要はありません。\r\n\r\n",
                    otp, DateTime.Now.ToString(), pcidMasked, clientIp, clientFqdn);

                return await SmtpUtil.SendAsync(new SmtpConfig(serverSettings.SmtpServerHostname, serverSettings.SmtpServerPort, false, serverSettings.SmtpServerUsername, serverSettings.SmtpServerPassword),
                    emailFrom, emailTo, subject, body, true, cancel);
            }
            else
            {
                // SMS (AWS を利用)
                await using AwsSns sns = new AwsSns(new AwsSnsSettings(serverSettings.AwsSnsRegionEndPointName, serverSettings.AwsSnsAccessKeyId, serverSettings.AwsSnsSecretAccessKey));

                string body = string.Format("OTP: {0}\r\n\r\nシンテレ SMS\r\n日時: {1}\r\nID: '{2}' (一部伏字)\r\nアクセス元: {3} ({4})\r\n",
                    otp, DateTime.Now.ToString(), pcidMasked, clientIp, clientFqdn);

                try
                {
                    await sns.SendAsync(body, emailTo, cancel);

                    return true;
                }
                catch (Exception ex)
                {
                    ex._Error();

                    return false;
                }
            }
        }
    }
#endif // CORES_CODES_THINCONTROLLER

#if CORES_CODES_THINWEBCLIENT
    // シンテレワークシステム HTML5 Web クライアントの動作をカスタマイズするためのクラスです。
    public class MyThinWebClientHook : ThinWebClientHookBase
    {
        // 接続要求に対する Rate Limiter の設定
        public override RateLimiter<string> GetRateLimiterForNewSession()
        {
            // デフォルト設定: 30 秒間で 10 回までバースト接続可能。それを超えた場合は、10 秒間に 1 回の割合まで接続可能。
            return new RateLimiter<string>(
                new RateLimiterOptions(
                    burst: 10.0,
                    limitPerSecond: 0.1,
                    expiresMsec: 30 * 1000,
                    mode: RateLimiterMode.NoPenalty
                    )
                );;
        }
    }
#endif // CORES_CODES_THINWEBCLIENT

    /// --- 以下のコードは変更しないでください ---
    /// 
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
}

