Page({
    data: {
        eatList: [],
        cookList: [],
        goList: [],
        orderedList: [],  // 新增：初始为空数组（防 undefined）
        showInput: false,
        inputType: '',
        inputText: '',
        panelLabel: ''
    },
    onLoad() {
        // 修改：加载所有列表从 storage
        const eatList = wx.getStorageSync('eatList') || [];
        const cookList = wx.getStorageSync('cookList') || [];
        const goList = wx.getStorageSync('goList') || [];
        const orderedDishes = wx.getStorageSync('orderedDishes') || [];
        this.setData({
            eatList,
            cookList,
            goList,
            orderedList: orderedDishes
        });
    },
    onTapAdd(e) {
        const inputType = e.currentTarget.dataset.type;
        const map = { eat: '想吃', cook: '想做', go: '想去' };
        this.setData({ showInput: true, inputType, panelLabel: map[inputType] || '' , inputText: ''});
    },
    onInputChange(e) {
        this.setData({ inputText: e.detail.value });
    },
    onCancelInput() {
        this.setData({ showInput: false, inputText: '' });
    },
    onConfirmInput() {
        const text = (this.data.inputText || '').trim();
        if (!text) { this.onCancelInput(); return; }
        const id = Date.now();
        const key = this.data.inputType + 'List';
        const list = (this.data[key] || []).slice();
        list.push({ id, text, done: false });
        this.setData({ [key]: list, showInput: false, inputText: '' });
        // 新增：保存到 storage（只针对 eat/cook/go，不针对 ordered）
        if (this.data.inputType !== 'ordered') {
            wx.setStorageSync(this.data.inputType + 'List', list);
        }
    },
    onRemoveItem(e) {
        const type = e.currentTarget.dataset.type;
        const id = e.currentTarget.dataset.id;
        let key;
        if (type === 'ordered') {
            key = 'orderedList';
        } else {
            key = type + 'List';
        }
        const list = (this.data[key] || []).filter(item => item.id !== id);
        this.setData({ [key]: list });
        // 修改：为 eat/cook/go 也同步更新 storage
        if (type === 'ordered') {
            wx.setStorageSync('orderedDishes', list);
        } else {
            wx.setStorageSync(type + 'List', list);
        }
    },
    // 修改点：扩展支持 type: 'ordered'
    onToggleDone(e) {
        const type = e.currentTarget.dataset.type;
        const id = e.currentTarget.dataset.id;
        let key;
        if (type === 'ordered') {
            key = 'orderedList';
        } else {
            key = type + 'List';
        }
        const list = (this.data[key] || []).map(item => item.id === id ? { ...item, done: !item.done } : item);
        this.setData({ [key]: list });
        // 修改：为 eat/cook/go 也同步更新 storage
        if (type === 'ordered') {
            wx.setStorageSync('orderedDishes', list);
        } else {
            wx.setStorageSync(type + 'List', list);
        }
    },
    goIndex() { wx.reLaunch({ url: '/pages/index/index' }); },
    goWheel() { wx.reLaunch({ url: '/pages/wheel/index' }); },
    goTodo() { /* current */ }
});