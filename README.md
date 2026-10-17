# 情侣大转盘：GitHub Pages 修改与重新发布指南

更新日期：2026-10-17。适用于已经发布成功的便携版。

**给女朋友打开的网页：<https://bbtnoctrl.github.io/love-wheel/dist/>**

**你管理文件的仓库：<https://github.com/bbtnoctrl/love-wheel>**

当前游戏有 **48 种真实奖励，合计概率 70%；“谢谢惠顾”概率 30%**。抽奖次数不限，先刮开当前结果，再抽下一次。

## 一、现在直接打开 /dist/ 地址即可

已核对：上面的 **`/love-wheel/dist/` 页面及其 CSS、JavaScript、图标和二维码库请求均返回 HTTP 200，文件内容与交付的便携版源码一致**。这项检查确认文件已经可从公开网址取得，不等于已经完成手机交互或中国大陆各运营商网络实测。

你提供的截图显示 GitHub Pages 已启用，但截图列出的 `https://bbtnoctrl.github.io/love-wheel/` 目前返回 404。原因是仓库根目录只有 `dist` 文件夹，首页放在 `dist/index.html`。**游戏已经可以从 `/love-wheel/dist/` 打开，不需要为了开始玩而重新上传。**

目前配置是：

| 设置 | 当前值 |
|---|---|
| 发布方式 | Deploy from a branch |
| 发布分支 | `main` |
| 发布目录 | `/(root)`，即仓库最外层 |
| HTTPS | 已启用 |
| Custom domain | 留空，继续使用当前 `github.io` 地址 |

**第一次的 Pages 配置已经完成，之后改内容不用重新建仓库，也不用重新配置 Pages。** 当前游戏文件位于发布目录下的 `dist` 子目录，所以访问地址也带 `/dist/`。向 `main` 提交新版文件后，GitHub 会自动重新发布，见[官方发布源说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

网页和仓库是两回事：

- **网页地址**给她玩转盘，手机浏览器打开即可。
- **仓库地址**给你上传、替换和管理代码；它显示文件列表，不是游戏首页。

GitHub Pages 支持在 GitHub Free 的公开仓库中使用。这是一条免费发布路径；是否能在她所在地的普通网络顺利打开，仍需要她用手机流量或常用 Wi-Fi 实际确认。截图显示发布成功，不等于已经实测所有地区网络或完整游戏操作。见[GitHub Pages 官方建站说明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。

## 二、先分清两个叫 index.html 的文件

| 文件 | 它是什么 | 怎样上传 |
|---|---|---|
| 独立下载的 `index.html` | 已合并好的完整游戏，包含样式、脚本、图标和二维码库 | 适合单文件发布；用它替换当前首页就会切换为单文件维护方式 |
| 压缩包中的 `love-lucky-wheel-single.html` | 与上述独立下载文件内容相同，只是名字不同 | 复制一份改名为 `index.html` 后可发布 |
| 压缩包中的 `dist/index.html` | 多文件源码中的页面入口，需要其他 JS、CSS 等文件配合 | **当前线上正在使用这一种**，仓库 `dist` 内已包含配套文件 |

**当前最简单的更新方法是继续修改仓库 `dist` 里的对应文件。** 例如只改奖品，就更新 `dist/core.js`，无需重新合并。第七节按这种现有结构操作，第八节再说明可选的单文件方式。

不要只上传 `dist/index.html`，否则会缺少样式和脚本。也不要在 GitHub 上传整个源码 ZIP 后等待它自动变成网站：应上传解压后的实际网页文件。

## 三、压缩包里的 12 个文件分别做什么

解压 `love-lucky-wheel-portable.zip` 后，会看到 `love-lucky-wheel-portable` 文件夹。下表路径都从这个文件夹开始。

| 文件 | 用途 | 一般是否需要改 |
|---|---|---|
| `dist/core.js` | 奖品名称、兑现内容、概率权重、奖券状态 | **改奖品主要改这里** |
| `dist/index.html` | 页面标题、按钮、固定说明和规则 | 改页面文字时 |
| `dist/styles.css` | 颜色、字体、间距、手机布局及动画样式 | 改外观时 |
| `dist/app.js` | 转盘、刮卡、兑奖、页面切换、保存图片等操作 | 一般不需要 |
| `dist/share.js` | 读取当前网页地址，生成分享链接和二维码 | 一般不需要 |
| `dist/assets/icon.svg` | 浏览器标签页的小图标 | 想换图标时 |
| `dist/vendor/qrcodegen.js` | 随包的二维码生成库 | 保留即可 |
| `dist/vendor/LICENSE-qrcodegen.txt` | 二维码库的开源许可证 | 保留即可 |
| `love-lucky-wheel-single.html` | 已合并的完整游戏 | 由脚本重新生成 |
| `build-singlefile.py` | 把 `dist` 合并成上述单文件 | 运行即可，通常不用改 |
| `EDIT_AND_PUBLISH.md` | 随包的通用修改与发布说明 | 当前 GitHub 操作以本指南为准 |
| `THIRD_PARTY_NOTICES.txt` | 第三方代码来源和版权说明 | 保留即可 |

修改前先备份一份源码。使用 VS Code 或其他纯文本编辑器，保存编码选择 **UTF-8**。

## 四、修改奖品内容

打开 `dist/core.js`，搜索 **奶茶我请**，可以找到这一条：

```js
{
  id: 'sweet-tea',
  title: '奶茶我请',
  detail: '你喜欢的奶茶任选一杯，30 元以内。',
  note: '今天的甜度，你说了算。',
  weight: 4200,
  budget: 30
},
```

| 字段 | 含义 |
|---|---|
| `id` | 程序识别奖品的标识，已有奖品不要改 |
| `title` | 显示的奖品名称 |
| `detail` | 具体怎样兑现：金额、数量或时长 |
| `note` | 中奖后显示的小句子 |
| `weight` | 抽奖权重，决定概率的相对大小 |
| `budget` | 以元计的成本估算，不决定概率，也不会自动付款 |

例如想把奶茶限额改为 40 元，就把 `detail` 中的“30 元以内”改为“40 元以内”，同时把 `budget: 30` 改为 `budget: 40`。**只改这些文案和预算，概率不会变。** 只改 `budget` 则不会改变页面上的兑奖约定。

### 编辑时注意语法

中文正文可以使用中文标点，但代码里的引号、逗号、冒号和括号要用英文半角。保留条目之间的逗号，不要把 `'文字'` 改成中文弯引号。如果正文包含英文单引号，可以用英文双引号包住整段文字。

### 保留旧奖券的兼容性

已有类别和奖品的 **`id`、排列顺序都保留**，不要删除或重排。历史记录还保存了它们的位置，改动可能导致旧券读不出来。新增奖品放在所属 `prizes` 数组末尾，使用唯一的新 `id`，并重新检查数量、权重和页面说明。

旧奖券保存了中奖当时的文案快照。修改奖品文案影响之后抽到的券；她已经抽到的券仍保留原来的约定。

## 五、怎样保持“谢谢惠顾 30%”

**某项概率 = 该项权重 ÷ 所有结果的权重总和。** 当前配置是：

| 项目 | 权重 | 概率 |
|---|---:|---:|
| 48 种真实奖励合计 | 70000 | 70% |
| 谢谢惠顾 | 30000 | 30% |
| 奶茶我请，已包含在真实奖励中 | 4200 | 4.2% |

总权重为 `100000`。**只改名称、兑现内容和备注时，保持所有 `weight` 不动最省事。**

如果要调整奖励之间的概率，同时保持空奖为 30%，可以保持谢谢惠顾为 `30000`，并确保其他 48 项加起来仍然是 `70000`。例如给一项增加 `800`，就从另一项或几项合计减少 `800`；每项权重仍应是正整数。

只增大一个奖励的权重，会改变分母，空奖概率也会跟着变。`weight: 30` 并不代表 30%。如果真实奖励总权重已经改为 `R`，保持 30% 空奖所需的权重是：

```text
谢谢惠顾权重 = R × 0.3 ÷ 0.7
```

计算结果需为整数；必要时同比放大整组权重后再复核。转盘面积和多数标签会自动计算，但 `dist/index.html` 中的“30%”、奖品数量和规则等固定文字也要保持一致。

## 六、在 Ubuntu 或 Windows 上预览

进入**同时包含 `dist` 和 `build-singlefile.py` 的解压目录**，打开终端。电脑需已安装 Python 3；本项目不需要 `npm install`，也没有必须执行的前端构建流程。

### Ubuntu

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

### Windows PowerShell

```powershell
py -3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

打开 <http://localhost:8000>，修改并保存后刷新页面。按 `Ctrl+C` 停止预览服务。

这里的 `localhost` 只指当前设备，不能把这个地址或它生成的二维码发给她远程访问。也不要直接双击源码中的 `dist/index.html` 来判断游戏是否正常，模块脚本可能受到浏览器限制。合并后的单文件可用于本地查看，但对外分享请使用正式 HTTPS 网页。

## 七、推荐的更新方法：继续维护仓库里的 dist

**你当前已经使用多文件版本，可以直接改对应文件。** Pages 保持 `main` + `/(root)`，文件继续放在仓库的 `dist` 里面。

### 方法 A：在 GitHub 网页上直接修改

只改几个奖品时，这种方式步骤最少：

1. 登录 GitHub，打开 <https://github.com/bbtnoctrl/love-wheel>。
2. 在 **Code** 文件列表确认分支是 **`main`**，点击进入 **`dist`** 文件夹。
3. 点击 `core.js`，再点编辑按钮，按第四、五节修改奖品内容。
4. 点击 **Commit changes**，填写说明，例如“调整奶茶奖励文案”，并直接提交到 `main`。
5. 等待自动发布后，打开 <https://bbtnoctrl.github.io/love-wheel/dist/>，刷新确认修改出现。

若通过其他分支修改，需要合并进 `main` 才会更新当前 Pages。修改标题、规则或颜色时，按第三节的文件用途选择对应文件。

### 方法 B：电脑改好，再上传替换

1. 修改本地 `dist` 中的源码，按第六节预览。
2. 打开仓库 **Code → dist**，确认当前位置是现有的 `dist` 文件夹。
3. 选择 **Add file → Upload files**，上传改好的对应文件。例如只改奖品，就上传新的 `core.js`；也修改了页面规则，就一起上传 `index.html`。
4. 保持文件名和相对位置不变。已进入仓库 `dist` 后，不要再上传一个包着 `dist` 的父文件夹，避免形成 `dist/dist/`。
5. 点击 **Commit changes**，提交到 `main`，等待自动发布。

`assets` 和 `vendor` 里的文件不改时无需重新上传；改过时放回原来的子目录。GitHub 接收的是实际文件，不会把源码 ZIP 自动解压为网站。

如果先在 GitHub 网页上修改过，后来又想从电脑上传整份文件，先把仓库的最新改动同步到本地，避免用旧下载包覆盖已经改好的内容。

### 怎样知道更新完成

官方说明更新可能需要约 **10 分钟**。可在 **Actions** 查看此次发布是否完成，也可在 **Settings → Pages** 查看发布状态。[官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

**当前应直接打开带 `/dist/` 的地址检查。** Settings 中的 **Visit site** 可能仍指向没有首页的 `/love-wheel/`；这个根地址返回 404，不代表 `/love-wheel/dist/` 的发布失败。

她继续使用 <https://bbtnoctrl.github.io/love-wheel/dist/> 即可。若暂时显示旧内容，先等待发布结束，再刷新或关闭页面重新打开，不要急着清除网站数据。也不要为每次修改新建仓库。

## 八、可选：重新合并为单文件再发布

这一步用于你决定改用单文件维护的时候，**当前多文件网站正常更新不需要它**。

### 1．重新合并

先修改、保存本地 `dist` 源码，然后在同时包含 `dist` 和 `build-singlefile.py` 的解压目录运行：

Ubuntu：

```bash
python3 build-singlefile.py
cp love-lucky-wheel-single.html index.html
```

Windows PowerShell：

```powershell
py -3 .\build-singlefile.py
Copy-Item .\love-lucky-wheel-single.html .\index.html -Force
```

第一条命令重新生成 `love-lucky-wheel-single.html`；第二条复制出**解压目录最外层的 `index.html`** 供上传，不会覆盖本地 `dist/index.html` 源码入口。

以前下载的独立 `index.html` 不会自动更新，改过源码后应上传这次新生成的文件。

### 2．保留当前 /dist/ 地址

在 GitHub 仓库进入 **Code → dist**，上传刚生成的完整 `index.html`，替换该目录原来的首页，提交到 `main`。这样正式网址仍然是：

**<https://bbtnoctrl.github.io/love-wheel/dist/>**

替换后，网页使用的是合并在 HTML 内部的代码，不再依赖同目录的拆分脚本、样式和图标文件。旁边保留这些文件不等于网页会读取它们。

**之后每次修改，须继续编辑本地 `dist`、重新合并，再替换仓库的 `dist/index.html`。** 只上传新版 `core.js` 不会改变已经合并进首页的旧奖品。要切回多文件方式，应完整恢复源码版 `dist/index.html` 及其配套文件，避免混用。

### 3．如果以后想使用较短的根地址

这是可选调整：把完整单文件以 `index.html` 放到仓库根目录并提交，才会为 `https://bbtnoctrl.github.io/love-wheel/` 提供首页。也可以把完整多文件站点内容放到根目录，但要一并保持文件相对位置。入口文件与发布目录的关系见[官方建站说明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。

**当前不必做这个调整。** 从 `/love-wheel/dist/` 改到 `/love-wheel/` 会改变路径，本游戏会读取另一份本地记录；如果以后换地址，应同步告知她并重新分享二维码。

## 九、奖券记录和二维码会怎样变化

### 奖券保存在她自己的浏览器

游戏没有登录账号或云端奖券同步。记录保存在浏览器本地，不在源码 ZIP 或 GitHub 仓库里。

同一浏览器、同一正式地址，且保留存储逻辑和奖品兼容性时，重新发布及普通刷新通常会继续使用原有奖券。本便携版除了浏览器按网站来源隔离存储，还会按**网址路径和查询参数**区分记录，因此要固定使用：

**`https://bbtnoctrl.github.io/love-wheel/dist/`**

- 换域名、协议、端口、设备或浏览器，记录不会自动同步。
- `/love-wheel/dist/` 和 `/love-wheel/dist/index.html` 是不同路径；即使内容相同，这一版也会读取不同记录。以后改用 `/love-wheel/` 根地址时也不会自动沿用当前路径的记录。
- 在地址后增加或更改 `?from=...` 等参数，也会切换记录范围。
- 页面切换产生的 `#...` 标签不会另建一份奖券记录。
- 清除网站数据可能删掉本地奖券，重新上传代码不能把它们找回来。重要奖券建议先保存为图片。

### 分享二维码跟随当前网页

页面里的分享链接和二维码依据**当前打开的真实网址**生成，保留路径和查询参数，移除页面切换用的 `#...`。因此，请从上面固定的正式地址打开后再分享。

在同一网址更新内容，之前发出的二维码仍然指向这个网址，可以继续使用。如果换了网址，应在新网页重新保存、分享二维码。**已经下载到相册或发给别人的二维码图片不会自动改变。**

## 十、最容易出错的地方

| 现象 | 优先检查 |
|---|---|
| 截图中的根地址显示 404 | 当前首页在 `dist` 子目录，直接用 `/love-wheel/dist/`；无需为此重建网站 |
| 网页有文字，但没有样式或转盘不运行 | 是否只上传了源码版 `dist/index.html`，缺少配套文件 |
| 修改奖品后线上仍是旧内容 | 当前多文件方案检查是否更新了仓库 `dist/core.js`；若已改成单文件方案，检查是否重新合并并替换首页 |
| 上传完一直没更新 | 是否提交到 `main`、发布是否完成、文件是否放回原来的 `dist` 位置 |
| 新建了 `core.js`，奖品却没变 | 首页是否仍为合并单文件；需重新合并替换首页，或完整切换到多文件方案 |
| 同一手机忽然看不到旧券 | 是否换了浏览器、路径、查询参数，或清除了网站数据 |
| 她打开二维码不是当前网页 | 是否仍在使用旧网址二维码，或误发了本地预览二维码 |

如果不方便自己修改或重新合并，可以把希望调整的内容及最新源码发回本对话，并说明要继续更新这个 GitHub Pages 网站；后续应以实际生成、上传和发布结果为准。

## 官方参考

- [GitHub Pages：创建网站](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)：免费公开仓库、入口文件、访问网站及发布时间。
- [GitHub Pages：配置发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)：分支与目录、提交后自动发布。

文件用途、奖品示例、合并命令和本地记录范围依据当前便携版源码核对。本指南说明操作方法，不代表已经代你提交新代码或完成大陆网络及交互实测。
