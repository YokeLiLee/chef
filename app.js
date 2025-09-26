App({
    onLaunch() {
        if (!wx.cloud) {
            console.error('请使用 2.2.3 或以上的基础库以使用云能力');
        } else {
            wx.cloud.init({
                env: 'cloudbase-5gkhtbhua49b94c2',  // 替换为你的环境ID
                traceUser: true,
            });
        }
        this.globalData = {};
    }
});