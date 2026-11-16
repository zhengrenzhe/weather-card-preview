# 天气卡片效果样稿

天气小组件的动态效果样稿，只用于预览，不是正式代码。云用真实照片加工成的贴图，按时段和天气重新打光；下雨时雨滴会砸在卡片的面板上。

## 怎么看

- 顶部按钮切换天气、时间、尺寸和帧率，下方是全部天气的小卡片。
- 网址参数，可以组合使用：
  - `cond`：天气。`clear` 晴、`partly` 少云、`cloudy` 多云、`overcast` 阴、`fog` 雾、`drizzle` 小雨、`rain` 大雨、`storm` 雷阵雨、`snow` 小雪
  - `time`：时刻，0 到 24，例如 `6.7` 日出、`17.7` 黄昏、`22.5` 夜里
  - `size`：`s` 小、`m` 中、`l` 大
  - `gallery=0`：不显示下方的小卡片
  - `slowmo=8&droptest=0.8`：雨滴慢放 8 倍，并定时在面板中央砸一颗大雨点
- 例如 `?cond=rain&size=l&gallery=0&slowmo=8&droptest=0.8` 是大雨大卡片的雨滴慢放。

## 云贴图来源

贴图由下列照片裁切、抠掉蓝天、只留亮度与透明度、横向接缝平铺后得到。照片来自 Unsplash 和 Pexels，两者的授权都允许修改后用在网站和应用里、不要求署名，这里仍注明出处。

| 贴图 | 用到的照片 | 来源 | 作者 |
| --- | --- | --- | --- |
| field.webp | 满天小积云 | Unsplash dovgTnlZXYc | Anna Spencer |
| cumulus.webp | 积云 | Unsplash F2HTC_CF4Jo | Dallas Reedy |
| cumulus.webp | 积云 | Pexels 2061990 | Matheus Rocha |
| bank.webp | 塔状积云 | Pexels 8726316 | Nothing Ahead |
| bank.webp | 夕照积云（只取下半部分） | Unsplash GhrBhL9kXf4 | Iván Levyv |
| overcast.webp | 阴天整幅 | Pexels 4533919 | Engin Akyurt |
| dark.webp | 雨天乌云整幅 | Unsplash AtxeOe04PQ8 | Paul Zoetemeijer |
