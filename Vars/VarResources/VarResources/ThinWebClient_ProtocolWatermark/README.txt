シン・テレワークシステム 中継ゲートウェイおよび Win32 版アプリクライアントのソースコード「IPA-DN-ThinApps-Private」において、「src/Vars/VarsActivePatch.h」で「AlternativeWaterMark」属性を設定することにより、プロトコル透かしバイナリデータを変更している場合は、同じ変更をこのディレクトリにある「ThinWebClient_ProtocolWatermark.txt」ファイルにも適用すること。

「ThinWebClient_ProtocolWatermark.txt」ファイルの書式は、サンプルとして格納されているファイルのとおり、C 言語の 16 進数 unsigned char 配列形式で書けば良い。

すなわち、具体的には、

「IPA-DN-ThinApps-Private/submodules/IPA-DN-Ultra/src/Cedar/WaterMark.c」

ファイルにあるような "static BYTE WaterMark[] =" 相当部分をすべてコピーして、この txt ファイルに貼り付けすればよい。


