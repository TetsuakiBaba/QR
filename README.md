# QR Palette Studio

URLを入力すると、色やドット形状を調整したQRコードを生成し、そのままPNGでダウンロードできるGitHub Pages向けのシンプルなサービスです。

## 使い方

1. URLを入力します（`example.com` のようにプロトコル無しでも利用できます）。
2. カラープリセット、ドット形状、QRカラー、背景色を選びます。
3. **QRコードを生成** を押してプレビューを確認します。
4. **PNGをダウンロード** で保存します。

## GitHub Pagesで公開する

このリポジトリは静的ファイルのみで構成されているため、GitHub Pages の **Deploy from a branch** でルートディレクトリを公開対象にするだけで利用できます。

- Branch: `main`（または公開対象ブランチ）
- Folder: `/ (root)`

公開後は `https://<account>.github.io/QR/` のようなURLでアクセスできます。
