using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

using IPA.Cores.Basic;
using IPA.Cores.Helper.Basic;
using static IPA.Cores.Globals.Basic;

using IPA.Cores.Web;
using IPA.Cores.Helper.Web;
using static IPA.Cores.Globals.Web;

using IPA.Cores.Codes;
using IPA.Cores.Helper.Codes;
using static IPA.Cores.Globals.Codes;

using static IPA.App.ThinControllerApp.AppGlobal;
using System.Threading;
using System.Net;
using System.Net.Sockets;

#pragma warning disable CS1998 // 非同期メソッドは、'await' 演算子がないため、同期的に実行されます

namespace IPA.App.ThinControllerApp
{
    public class MyThinControllerHook : ThinControllerHookBase
    {
        public override async Task<bool> SendOtpEmailAsync(ThinController controller, string otp, string emailTo, string emailFrom, string clientIp, string clientFqdn, string pcidMasked, string pcid,
            string smtpServerHostname, int smtpServerPort, string smtpUsername, string smtpPassword, CancellationToken cancel = default)
        {
            if (emailFrom._IsSamei("sms") == false)
            {
                string subject = string.Format("ワンタイムパスワード (OTP): {0}  (サーバー: '{1}')", otp, pcidMasked);

                string body = string.Format("OTP: {0}\r\n\r\n「シン・テレワークシステム サーバー」にログイン要求が\r\nありましたので、予め設定されている本メールアドレスに上記の OTP\r\n(ワンタイムパスワード) をご通知いたします。\r\n\r\n[参考情報]\r\nアクセス日時: {1}\r\nアクセス先コンピュータ ID: '{2}'  (一部を伏せ字としている場合があります)\r\nアクセス元 IP アドレス: {3}\r\nアクセス元ホスト名: {4}\r\n\r\n\r\nこのメールには返信できません。\r\n\r\nメールアドレスを登録した覚えがない場合は、あなたのメールアドレスを\r\n第三者が誤って「シン・テレワークシステム サーバー」の OTP 送付先\r\nとして登録している可能性があります。その場合、本メールに応答する\r\n必要はありません。\r\n\r\n",
                    otp, DateTime.Now.ToString(), pcidMasked, clientIp, clientFqdn);

                return await SmtpUtil.SendAsync(new SmtpConfig(smtpServerHostname, smtpServerPort, false, smtpUsername, smtpPassword),
                    emailFrom, emailTo, subject, body, true, cancel);
            }
            else
            {
                // SMS
                await using AwsSns sns = new AwsSns(new AwsSnsSettings(smtpServerHostname, smtpUsername, smtpPassword));

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

    public class MyThinControllerFactory : SharedObjectFactory<ThinController>
    {
        public static readonly MyThinControllerFactory Factory = new MyThinControllerFactory();

        protected override ThinController CreateNewImpl()
        {
            ThinControllerSettings settings = new ThinControllerSettings
            {
            };

            MyThinControllerHook hook = new MyThinControllerHook();

            return new ThinController(settings, hook);
        }
    }

    public class Startup
    {
        readonly HttpServerStartupHelper StartupHelper;
        readonly AspNetLib AspNetLib;
        readonly SharedObjectHolder<ThinController> ThinControllerHolder;

        public ThinControllerServiceType ServiceType { get; } = ThinControllerServiceType.ApiServiceForUsers;

        public ThinController ThinController => ThinControllerHolder.Object;

        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;

            // HttpServer ヘルパーの初期化
            StartupHelper = new HttpServerStartupHelper(configuration);

            // AspNetLib の初期化: 必要な機能のみ ON にすること
            AspNetLib = new AspNetLib(configuration, AspNetLibFeatures.EasyCookieAuth | AspNetLibFeatures.LogBrowser);

            // ThinController インスタンスを作成 (Http サーバーのインスタンスが複数存在することを想定しているため、共有させる)
            this.ThinControllerHolder = MyThinControllerFactory.Factory.CreateOrGet();

            // サービスタイプの識別
            if (StartupHelper.ServerOptions.StringOptions.Contains(ThinControllerServiceType.ApiServiceForGateway.ToString()))
            {
                this.ServiceType = ThinControllerServiceType.ApiServiceForGateway;
            }
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // AspNetLib による設定を追加
            AspNetLib.ConfigureServices(StartupHelper, services);

            // 基本的な設定を追加
            StartupHelper.ConfigureServices(services);

            ////// Cookie 認証機能を追加
            EasyCookieAuth.LoginFormMessage.TrySet("ログインが必要です。");
            EasyCookieAuth.AuthenticationPasswordValidator = StartupHelper.SimpleBasicAuthenticationPasswordValidator;
            EasyCookieAuth.ConfigureServices(services, true);

            if (ServiceType == ThinControllerServiceType.ApiServiceForGateway)
            {
                // LogBrowesr 機能を設定
                AspNetLib.SetupLogBrowser(services, new LogBrowserOptions(PP.Combine(Env.AppRootDir), "システム管理者用 仮想ファイルブラウザ"));
            }

            // Razor ページを追加
            services.AddRazorPages();

            // MVC 機能を追加
            services.AddControllersWithViews()
                .ConfigureMvcWithAspNetLib(AspNetLib);

            // シングルトンサービスの注入
            services.AddSingleton(ThinController);

            // 全ページ共通コンテキストの注入
            services.AddScoped<PageContext>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, IHostApplicationLifetime lifetime)
        {
            // wwwroot ディレクトリを static ファイルのルートとして追加
            StartupHelper.AddStaticFileProvider(Env.AppRootDir._CombinePath("wwwroot"));

            // AspNetLib による設定を追加
            AspNetLib.Configure(StartupHelper, app, env);

            // 基本的な設定を追加
            StartupHelper.Configure(app, env);

            // エラーページを追加
            if (StartupHelper.IsDevelopmentMode)
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
            }

            // エラーログを追加
            app.UseHttpExceptionLogger();

            // ThinController の WPC ハンドラを追加
            ThinController.Configure(app, env, this.ServiceType);

            // Static ファイルを追加
            app.UseStaticFiles();

            if (ServiceType == ThinControllerServiceType.ApiServiceForGateway)
            {
                // ルーティングを有効可 (認証を利用する場合は認証前に呼び出す必要がある)
                app.UseRouting();

                // 認証・認可を実施
                app.UseAuthentication();
                app.UseAuthorization();

                // ルートマップを定義
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapControllerRoute(
                        name: "default",
                        pattern: "{controller=Home}/{action=Index}/{id?}");
                });
            }

            // クリーンアップ動作を定義
            lifetime.ApplicationStopping.Register(() =>
            {
                AspNetLib._DisposeSafe();
                StartupHelper._DisposeSafe();

                ThinControllerHolder._DisposeSafe();
            });
        }
    }
}
