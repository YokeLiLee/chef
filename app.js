App({
    onLaunch() {
        if (!wx.cloud) {
            console.error('基础库版本过低，无法使用云能力。请更新到 2.2.3 或更高版本');
            wx.showToast({ title: '云功能不可用', icon: 'none' });
            return;
        }
        console.log('开始初始化云环境...');
        wx.cloud.init({
            env: 'cloudbase-5gkhtbhua49b94c2', // 双确认你的环境ID
            traceUser: true,
        }).then(res => {
            console.log('云环境初始化成功', res);
            this.globalData.cloudReady = true;
        }).catch(err => {
            console.error('云环境初始化失败', err);
            wx.showToast({ title: '云初始化失败: ' + (err.errMsg || '未知错误'), icon: 'none' });
            // 常见原因：env ID 错、网络问题、云开发未开通
        });
        this.globalData = {
            cloudReady: false
        };
    }
});