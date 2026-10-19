# 情侣大转盘：一键发布编辑器使用说明

## 这次升级了什么

新版 `love-wheel-editor.html` 增加了「一键发布到 GitHub」面板。你修改奖品和参数后，可以在编辑器内生成完整的单文件游戏，并通过 GitHub Contents API 更新仓库文件，不必再手动下载 `index.html`、打开仓库上传和提交。

默认发布目标：

- 仓库：`bbtnoctrl/love-wheel`
- 分支：`main`
- 文件：`dist/index.html`
- 玩家网址：<https://bbtnoctrl.github.io/love-wheel/dist/>

## 第一次启用：只需手动更新一次编辑器

1. 下载本包中的 `love-wheel-editor.html`。
2. 打开 GitHub 仓库的 `dist` 目录：<https://github.com/bbtnoctrl/love-wheel/tree/main/dist>
3. 点击 **Add file → Upload files**，上传新版 `love-wheel-editor.html`，覆盖同名文件。
4. 点击 **Commit changes**，等待 GitHub Pages 发布。
5. 打开编辑器：<https://bbtnoctrl.github.io/love-wheel/dist/love-wheel-editor.html>

这一步仍然需要手动上传一次，因为旧编辑器本身没有一键发布功能。之后发布游戏首页就可以从编辑器里完成。

## 创建最小权限的 GitHub Token

1. 登录 GitHub，打开 **Settings → Developer settings → Personal access tokens → Fine-grained tokens**。
2. 点击生成新 Token。
3. Resource owner 选择 `bbtnoctrl`。
4. Repository access 选择 **Only select repositories**，只选 `love-wheel`。
5. Repository permissions 中把 **Contents** 设为 **Read and write**。Metadata 通常会自动要求只读权限。不要给其他仓库或不需要的权限。
6. 建议设置较短有效期，并妥善保管 Token。
7. 创建后复制 Token。离开创建页面后，GitHub 通常不会再次显示完整 Token。

不要使用权限过大的经典 Token，也不要把 Token 发给别人、写进源码、截图、README 或配置 JSON。

## 每次修改并自动发布

1. 打开上面的在线编辑器。
2. 如果换了浏览器或编辑器刚更新过，先导入你最近保存的 `love-wheel-config.json` 备份；编辑器不会自动从线上游戏读取配置。
3. 修改称呼、奖品、盲盒提示、权重等内容，先确认校验通过。
4. 在页面下方「一键发布到 GitHub」面板中，确认目标为 `bbtnoctrl / love-wheel / main / dist/index.html`。
5. 在 Token 输入框粘贴 Fine-grained Token。
6. 点击「发布当前配置」，仔细确认覆盖目标后确认。
7. 等待状态显示提交成功。然后等待 GitHub Pages 部署完成，再打开玩家网址检查。
8. 点击「清除 Token」，或直接关闭/刷新编辑器页面。

发布功能会先读取目标文件的 SHA，再提交更新；如果目标文件不存在、权限不够或发生冲突，会显示错误并停止，不会悄悄创建其他路径。

## Token 安全说明

- Token 只保存在当前页面的 JavaScript 内存变量中，不写入 `localStorage`、草稿、JSON 备份或导出游戏文件。
- 刷新/关闭页面后需要重新输入。
- 浏览器会将 Token 发送给 `api.github.com` 用于验证权限；本工具没有自己的后端。
- 这是一个公开网页工具，只应在你确认地址正确、信任其代码的情况下输入 Token。Token 泄露可能让别人修改所授权仓库；如有怀疑，立即在 GitHub 撤销它并重新创建。
- 最小权限、只授权单个仓库、设置过期时间，降低风险。

## 自动发布与 Pages 部署的区别

「提交成功」表示 GitHub 已接受文件更新，并不等于 Pages 已完成构建。请稍等片刻，再打开玩家网址检查。如果 Actions 中部署失败，按 GitHub 提示修复。

自动发布只更新 `dist/index.html`。它不会修改编辑器自身、README、JSON 配置备份或拆分源码。以后编辑器功能升级时，仍需手动上传新版 `love-wheel-editor.html` 一次。

## 如果不想用 Token

仍可继续使用原流程：点击「导出网页 index.html」，然后手动上传并提交到 `dist/index.html`。自动发布不是强制的。
